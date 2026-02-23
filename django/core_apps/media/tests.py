import tempfile
from pathlib import Path
from unittest.mock import patch
from django.db.utils import OperationalError

from django.test import override_settings
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.media.apps import MediaConfig
from core_apps.media.views import _as_bool, _safe_refset


class MediaEndpointTests(EndpointSmokeMixin, APITestCase):
    def test_all_media_endpoints_resolve(self):
        endpoints = [
            "files/news/example.png",
            "files/inventar/example.png",
            "files/cleanup-orphans/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_media_news_file_endpoint_is_reachable_without_auth(self):
        response = self.request_method("get", "files/news/example.png")
        self.assertIn(response.status_code, [200, 404])

    def test_media_inventar_file_requires_authentication(self):
        self.assert_requires_authentication("files/inventar/example.png")

    def test_media_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("files/news/example.png")
        self.assert_method_matrix_no_server_error("files/inventar/example.png")
        self.assert_method_matrix_no_server_error("files/cleanup-orphans/")

    def test_media_news_returns_404_for_missing_file(self):
        response = self.request_method("get", "files/news/not-found.png")
        self.assertEqual(response.status_code, 404)

    def test_media_news_returns_file_when_present(self):
        with tempfile.TemporaryDirectory() as tmp:
            news_dir = Path(tmp) / "news"
            news_dir.mkdir(parents=True, exist_ok=True)
            file_path = news_dir / "ok.txt"
            file_path.write_bytes(b"ok")

            with override_settings(MEDIA_ROOT=tmp):
                response = self.request_method("get", "files/news/ok.txt")
                response.close()

        self.assertEqual(response.status_code, 200)

    def test_media_app_config_values(self):
        self.assertEqual(MediaConfig.name, "core_apps.media")
        self.assertEqual(MediaConfig.default_auto_field, "django.db.models.BigAutoField")

    def test_media_cleanup_requires_admin(self):
        self.assert_requires_authentication("files/cleanup-orphans/", method="post", data={})
        self.assert_forbidden_without_role("files/cleanup-orphans/", method="post", data={})

    def test_media_cleanup_dry_run_and_delete(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        with tempfile.TemporaryDirectory() as tmp:
            news_dir = Path(tmp) / "news"
            inventar_dir = Path(tmp) / "inventar"
            news_dir.mkdir(parents=True, exist_ok=True)
            inventar_dir.mkdir(parents=True, exist_ok=True)
            (news_dir / "old.png").write_bytes(b"x")
            (inventar_dir / "old2.png").write_bytes(b"x")

            with override_settings(MEDIA_ROOT=tmp):
                dry = self.request_method("post", "files/cleanup-orphans/", data={"target": "all"})
                self.assertEqual(dry.status_code, 200)
                self.assertTrue(dry.data["dry_run"])
                self.assertEqual(dry.data["summary"]["orphan"], 2)

                deleted = self.request_method(
                    "post",
                    "files/cleanup-orphans/",
                    data={"target": "all", "delete": True},
                )
                self.assertEqual(deleted.status_code, 200)
                self.assertEqual(deleted.data["deleted"], 2)
                self.assertFalse((news_dir / "old.png").exists())
                self.assertFalse((inventar_dir / "old2.png").exists())

    def test_media_cleanup_invalid_target(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        response = self.request_method(
            "post",
            "files/cleanup-orphans/",
            data={"target": "invalid"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("target", str(response.data.get("detail", "")))

    def test_media_cleanup_missing_media_root(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        with tempfile.TemporaryDirectory() as tmp:
            missing = str(Path(tmp) / "does-not-exist")
            with override_settings(MEDIA_ROOT=missing):
                response = self.request_method(
                    "post",
                    "files/cleanup-orphans/",
                    data={"target": "all"},
                )

        self.assertEqual(response.status_code, 400)
        self.assertIn("MEDIA_ROOT", str(response.data.get("detail", "")))

    def test_media_cleanup_blocks_delete_on_missing_db_without_override(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        with tempfile.TemporaryDirectory() as tmp:
            news_dir = Path(tmp) / "news"
            news_dir.mkdir(parents=True, exist_ok=True)
            (news_dir / "old.png").write_bytes(b"x")

            with override_settings(MEDIA_ROOT=tmp):
                with patch("core_apps.media.views._safe_refset", return_value=(set(), True)):
                    blocked = self.request_method(
                        "post",
                        "files/cleanup-orphans/",
                        data={"target": "news", "delete": "ja"},
                    )
                    allowed = self.request_method(
                        "post",
                        "files/cleanup-orphans/",
                        data={"target": "news", "delete": "ja", "allow_missing_db": "ja"},
                    )

        self.assertEqual(blocked.status_code, 400)
        self.assertIn("Löschung blockiert", str(blocked.data.get("detail", "")))
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(allowed.data["deleted"], 1)

    def test_media_cleanup_marks_missing_folder_as_skipped(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        with tempfile.TemporaryDirectory() as tmp:
            news_dir = Path(tmp) / "news"
            news_dir.mkdir(parents=True, exist_ok=True)
            (news_dir / "one.png").write_bytes(b"x")

            with override_settings(MEDIA_ROOT=tmp):
                response = self.request_method(
                    "post",
                    "files/cleanup-orphans/",
                    data={"target": "all"},
                )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(item.get("skipped") for item in response.data.get("items", [])))


class MediaCleanupHelpersTests(APITestCase):
    def test_as_bool_variants(self):
        self.assertTrue(_as_bool(True))
        self.assertTrue(_as_bool("ja"))
        self.assertFalse(_as_bool("nein"))
        self.assertFalse(_as_bool(0))

    def test_safe_refset_returns_filenames(self):
        class FakeQuerySet:
            def exclude(self, **kwargs):
                return self

            def values_list(self, *args, **kwargs):
                return ["news/a.png", "b.jpg", "", None]

        class FakeModel:
            objects = FakeQuerySet()

        refs, missing = _safe_refset(FakeModel, "foto")

        self.assertFalse(missing)
        self.assertEqual(refs, {"a.png", "b.jpg"})

    def test_safe_refset_handles_db_errors(self):
        class FakeQuerySet:
            def exclude(self, **kwargs):
                return self

            def values_list(self, *args, **kwargs):
                raise OperationalError("db")

        class FakeModel:
            objects = FakeQuerySet()

        refs, missing = _safe_refset(FakeModel, "foto")

        self.assertEqual(refs, set())
        self.assertTrue(missing)
