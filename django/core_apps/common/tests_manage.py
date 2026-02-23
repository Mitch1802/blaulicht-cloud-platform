import builtins
import importlib.util
from pathlib import Path
from unittest.mock import patch

from django.test import SimpleTestCase


MANAGE_PATH = Path(__file__).resolve().parents[2] / "manage.py"
SPEC = importlib.util.spec_from_file_location("project_manage", MANAGE_PATH)
manage_module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(manage_module)


class ManagePyTests(SimpleTestCase):
    def test_main_executes_command_line(self):
        with patch("django.core.management.execute_from_command_line") as mocked_exec:
            manage_module.main()
        mocked_exec.assert_called_once()

    def test_main_raises_helpful_import_error(self):
        original_import = builtins.__import__

        def fake_import(name, globals=None, locals=None, fromlist=(), level=0):
            if name == "django.core.management":
                raise ImportError("boom")
            return original_import(name, globals, locals, fromlist, level)

        with patch("builtins.__import__", side_effect=fake_import):
            __import__("math")
            with self.assertRaises(ImportError) as ctx:
                manage_module.main()

        self.assertIn("Couldn't import Django", str(ctx.exception))
