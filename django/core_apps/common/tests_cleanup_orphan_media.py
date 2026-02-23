from io import StringIO
from pathlib import Path
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.utils import OperationalError
from django.test import TestCase, override_settings

from core_apps.common.management.commands.cleanup_orphan_media import Command


class CleanupOrphanMediaCommandTests(TestCase):
    def test_command_raises_when_media_root_missing(self):
        with self.assertRaises(CommandError):
            with override_settings(MEDIA_ROOT=str(Path("C:/definitely-missing-media-root"))):
                call_command("cleanup_orphan_media", target="all")

    def test_dry_run_prints_summary_and_keeps_files(self):
        with override_settings(MEDIA_ROOT=self._prepare_media(news_files=["orphan.png"])):
            out = StringIO()
            call_command("cleanup_orphan_media", target="news", stdout=out)
            text = out.getvalue()

        self.assertIn("Dry-Run", text)
        self.assertIn("Summary: files=1, refs=0, orphan=1", text)

    def test_delete_with_yes_removes_orphans(self):
        media_root = self._prepare_media(news_files=["delete-me.png"])

        with override_settings(MEDIA_ROOT=media_root):
            out = StringIO()
            call_command("cleanup_orphan_media", target="news", delete=True, yes=True, stdout=out)
            text = out.getvalue()

        self.assertIn("Gelöscht: 1 Dateien", text)
        self.assertFalse((Path(media_root) / "news" / "delete-me.png").exists())

    def test_delete_aborts_when_user_declines(self):
        media_root = self._prepare_media(news_files=["keep.png"])

        with override_settings(MEDIA_ROOT=media_root):
            out = StringIO()
            with patch("builtins.input", return_value="n"):
                call_command("cleanup_orphan_media", target="news", delete=True, stdout=out)
            text = out.getvalue()

        self.assertIn("Abgebrochen", text)
        self.assertTrue((Path(media_root) / "news" / "keep.png").exists())

    def test_delete_reports_when_no_orphans_exist(self):
        media_root = self._prepare_media(news_files=[])

        with override_settings(MEDIA_ROOT=media_root):
            out = StringIO()
            call_command("cleanup_orphan_media", target="news", delete=True, yes=True, stdout=out)
            text = out.getvalue()

        self.assertIn("Keine verwaisten Dateien", text)

    def test_delete_blocked_on_missing_db_without_override(self):
        media_root = self._prepare_media(news_files=["orphan.png"])

        with override_settings(MEDIA_ROOT=media_root):
            with patch.object(Command, "_news_refs", return_value=(set(), True)):
                with self.assertRaises(CommandError):
                    call_command("cleanup_orphan_media", target="news", delete=True, yes=True)

    def test_delete_allowed_on_missing_db_with_override(self):
        media_root = self._prepare_media(news_files=["orphan.png"])

        with override_settings(MEDIA_ROOT=media_root):
            out = StringIO()
            with patch.object(Command, "_news_refs", return_value=(set(), True)):
                call_command(
                    "cleanup_orphan_media",
                    target="news",
                    delete=True,
                    yes=True,
                    allow_missing_db=True,
                    stdout=out,
                )
            text = out.getvalue()

        self.assertIn("Gelöscht: 1 Dateien", text)

    def test_delete_with_prompt_yes_removes_orphan(self):
        media_root = self._prepare_media(news_files=["confirm-yes.png"])

        with override_settings(MEDIA_ROOT=media_root):
            out = StringIO()
            with patch("builtins.input", return_value="j"):
                call_command("cleanup_orphan_media", target="news", delete=True, stdout=out)
            text = out.getvalue()

        self.assertIn("Gelöscht: 1 Dateien", text)

    def test_dry_run_handles_missing_folder_and_many_orphans(self):
        many = [f"f{i}.png" for i in range(25)]
        media_root = self._prepare_media(news_files=many)
        inventar_dir = Path(media_root) / "inventar"
        if inventar_dir.exists():
            inventar_dir.rmdir()

        with override_settings(MEDIA_ROOT=media_root):
            out = StringIO()
            call_command("cleanup_orphan_media", target="all", stdout=out)
            text = out.getvalue()

        self.assertIn("Übersprungen (Ordner fehlt)", text)
        self.assertIn("... +5 weitere", text)

    def test_target_inventar_runs_ref_collection(self):
        media_root = self._prepare_media(inventar_files=["inv.png"])

        with override_settings(MEDIA_ROOT=media_root):
            out = StringIO()
            call_command("cleanup_orphan_media", target="inventar", stdout=out)
            text = out.getvalue()

        self.assertIn("[inventar]", text)
        self.assertIn("orphan=1", text)

    def test_safe_refset_handles_operational_error(self):
        command = Command()

        class FakeManager:
            def exclude(self, **kwargs):
                return self

            def values_list(self, *args, **kwargs):
                raise OperationalError("db down")

        class FakeModel:
            __name__ = "FakeModel"
            objects = FakeManager()

        refs, missing = command._safe_refset(FakeModel, "foto")

        self.assertEqual(refs, set())
        self.assertTrue(missing)

    def test_safe_refset_returns_filenames(self):
        command = Command()

        class FakeQuerySet:
            def exclude(self, **kwargs):
                return self

            def values_list(self, *args, **kwargs):
                return ["news/a.png", "b.jpg", "", None]

        class FakeModel:
            objects = FakeQuerySet()

        refs, missing = command._safe_refset(FakeModel, "foto")

        self.assertFalse(missing)
        self.assertEqual(refs, {"a.png", "b.jpg"})

    def _prepare_media(self, news_files=None, inventar_files=None):
        import tempfile

        root = tempfile.mkdtemp()
        news_dir = Path(root) / "news"
        inventar_dir = Path(root) / "inventar"
        news_dir.mkdir(parents=True, exist_ok=True)
        inventar_dir.mkdir(parents=True, exist_ok=True)

        for name in news_files or []:
            (news_dir / name).write_bytes(b"x")
        for name in inventar_files or []:
            (inventar_dir / name).write_bytes(b"x")

        return root
