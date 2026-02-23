import os
import subprocess
import tempfile
import zipfile
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin


class BackupEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.admin = self.create_user_with_roles("ADMIN")
        self.tmp_backups = tempfile.TemporaryDirectory()
        self.tmp_uploads = tempfile.TemporaryDirectory()

        self.backup_patch = patch("core_apps.backup.views.backup_path", self.tmp_backups.name)
        self.upload_patch = patch("core_apps.backup.views.uploaded_files_dir", self.tmp_uploads.name)
        self.env_patch = patch.dict(
            os.environ,
            {
                "POSTGRES_HOST": "localhost",
                "POSTGRES_USER": "postgres",
                "POSTGRES_DB": "postgres",
                "POSTGRES_PASSWORD": "postgres",
                "VERSION": "test",
            },
        )
        self.backup_patch.start()
        self.upload_patch.start()
        self.env_patch.start()

    def tearDown(self):
        self.backup_patch.stop()
        self.upload_patch.stop()
        self.env_patch.stop()
        self.tmp_backups.cleanup()
        self.tmp_uploads.cleanup()

    def test_all_backup_endpoints_resolve(self):
        endpoints = [
            "backup/",
            "backup/restore/",
            "backup/file/",
            "backup/delete/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_backup_requires_auth_and_role(self):
        self.assert_requires_authentication("backup/")
        self.assert_forbidden_without_role("backup/")
        self.assert_requires_authentication("backup/restore/", method="post", data={})
        self.assert_forbidden_without_role("backup/restore/", method="post", data={})

    def test_backup_method_matrix_no_server_error(self):
        for endpoint in ["backup/", "backup/restore/", "backup/file/", "backup/delete/"]:
            self.assert_method_matrix_no_server_error(endpoint)

    def test_backup_get_lists_existing_backups(self):
        self.client.force_authenticate(user=self.admin)
        Path(self.tmp_backups.name, "a.zip").write_bytes(b"x")

        response = self.request_method("get", "backup/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("a.zip", response.data["backups"])

    def test_backup_post_creates_zip_backup(self):
        self.client.force_authenticate(user=self.admin)
        Path(self.tmp_uploads.name, "bild.png").write_bytes(b"img")

        def _run_side_effect(cmd, **kwargs):
            if "--file" in cmd:
                sql_path = cmd[cmd.index("--file") + 1]
                Path(sql_path).write_text("-- sql dump", encoding="utf-8")
            return SimpleNamespace(stdout="")

        with patch("core_apps.backup.views.subprocess.run", side_effect=_run_side_effect):
            response = self.request_method("post", "backup/", data={})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("erfolgreich erstellt", response.data["msg"])
        self.assertTrue(any(name.endswith(".zip") for name in response.data["backups"]))

    def test_backup_post_handles_pg_dump_error(self):
        self.client.force_authenticate(user=self.admin)

        with patch("core_apps.backup.views.subprocess.run", side_effect=subprocess.CalledProcessError(1, "pg_dump")):
            response = self.request_method("post", "backup/", data={})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Fehler beim Erstellen des Backups", response.data["msg"])

    def test_restore_rejects_unknown_backup(self):
        self.client.force_authenticate(user=self.admin)

        response = self.request_method("post", "backup/restore/", data={"backup": "backup_unknown.zip"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_restore_success_extracts_files_and_returns_message(self):
        self.client.force_authenticate(user=self.admin)
        Path(self.tmp_uploads.name, "old.txt").write_text("old", encoding="utf-8")

        backup_name = "backup_test_20260101.zip"
        backup_zip = Path(self.tmp_backups.name, backup_name)
        with zipfile.ZipFile(backup_zip, "w") as zipf:
            zipf.writestr("dump.sql", "-- sql")
            zipf.writestr("uploaded_files/new.txt", "new-content")

        def _run_side_effect(cmd, **kwargs):
            if "SELECT tablename FROM pg_tables" in " ".join(cmd):
                return SimpleNamespace(stdout="test_table\nauth_group\n")
            return SimpleNamespace(stdout="")

        with patch("core_apps.backup.views.subprocess.run", side_effect=_run_side_effect):
            response = self.request_method("post", "backup/restore/", data={"backup": backup_name})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("erfolgreich wiederhergestellt", response.data["msg"])
        self.assertTrue(Path(self.tmp_uploads.name, "new.txt").exists())

    def test_restore_handles_sql_error_and_directory_entries(self):
        self.client.force_authenticate(user=self.admin)
        backup_name = "backup_test_20260102.zip"
        backup_zip = Path(self.tmp_backups.name, backup_name)
        with zipfile.ZipFile(backup_zip, "w") as zipf:
            zipf.writestr("dump.sql", "-- sql")
            zipf.writestr("uploaded_files/", "")
            zipf.writestr("uploaded_files/subdir/", "")
            zipf.writestr("uploaded_files/subdir/new.txt", "new-content")

        with patch("core_apps.backup.views.subprocess.run", side_effect=subprocess.CalledProcessError(1, "psql")):
            response = self.request_method("post", "backup/restore/", data={"backup": backup_name})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Fehler beim Wiederherstellen", response.data["msg"])

    def test_restore_success_handles_empty_and_directory_entries(self):
        self.client.force_authenticate(user=self.admin)
        backup_name = "backup_test_20260103.zip"
        backup_zip = Path(self.tmp_backups.name, backup_name)
        with zipfile.ZipFile(backup_zip, "w") as zipf:
            zipf.writestr("dump.sql", "-- sql")
            zipf.writestr("uploaded_files/", "")
            zipf.writestr("uploaded_files/sub/", "")
            zipf.writestr("uploaded_files/sub/file.txt", "x")

        def _run_side_effect(cmd, **kwargs):
            if "SELECT tablename FROM pg_tables" in " ".join(cmd):
                return SimpleNamespace(stdout="test_table\n")
            return SimpleNamespace(stdout="")

        with patch("core_apps.backup.views.subprocess.run", side_effect=_run_side_effect):
            response = self.request_method("post", "backup/restore/", data={"backup": backup_name})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("erfolgreich wiederhergestellt", response.data["msg"])
        self.assertTrue(Path(self.tmp_uploads.name, "sub", "file.txt").exists())

    def test_backup_get_file_rejects_non_zip(self):
        self.client.force_authenticate(user=self.admin)

        response = self.request_method("post", "backup/file/", data={"backup": "abc.txt"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_backup_get_file_returns_file_response_for_existing_zip(self):
        self.client.force_authenticate(user=self.admin)
        file_name = "archive.zip"
        Path(self.tmp_backups.name, file_name).write_bytes(b"zip")

        response = self.request_method("post", "backup/file/", data={"backup": file_name})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "application/octet-stream")
        response.close()

    def test_backup_get_file_rejects_missing_zip_path(self):
        self.client.force_authenticate(user=self.admin)

        response = self.request_method("post", "backup/file/", data={"backup": "missing.zip"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_backup_delete_removes_file(self):
        self.client.force_authenticate(user=self.admin)
        file_name = "delete_me.zip"
        Path(self.tmp_backups.name, file_name).write_bytes(b"zip")

        response = self.request_method("post", "backup/delete/", data={"backup": file_name})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Path(self.tmp_backups.name, file_name).exists())

    def test_backup_delete_rejects_unknown_file(self):
        self.client.force_authenticate(user=self.admin)

        response = self.request_method("post", "backup/delete/", data={"backup": "x.zip"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_backup_delete_handles_os_error(self):
        self.client.force_authenticate(user=self.admin)
        file_name = "cant_delete.zip"
        Path(self.tmp_backups.name, file_name).write_bytes(b"zip")

        with patch("core_apps.backup.views.os.remove", side_effect=OSError("locked")):
            response = self.request_method("post", "backup/delete/", data={"backup": file_name})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("Fehler beim Löschen", response.data["msg"])
