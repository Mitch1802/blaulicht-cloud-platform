from uuid import uuid4
import io
import os
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.inventar.models import _clean_filename, _coerce_ext, inventar_filename, Inventar
from core_apps.inventar.serializers import InventarSerializer
from core_apps.inventar.views import InventarViewSet


class InventarEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.admin = self.create_user_with_roles("ADMIN")
        self.inventar_role_user = self.create_user_with_roles("INVENTAR")

    def _png_file(self, name="upload.blob"):
        buffer = io.BytesIO()
        Image.new("RGB", (1, 1), color=(255, 0, 0)).save(buffer, format="PNG")
        return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")

    def test_all_inventar_endpoints_resolve(self):
        endpoints = [
            "inventar/",
            f"inventar/{uuid4()}/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_inventar_requires_auth_and_role(self):
        self.assert_requires_authentication("inventar/")
        self.assert_forbidden_without_role("inventar/")

    def test_inventar_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("inventar/")

    def test_inventar_role_user_can_create_item(self):
        self.client.force_authenticate(user=self.inventar_role_user)

        response = self.request_method("post", "inventar/", data={"bezeichnung": "Helm"})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Inventar.objects.filter(bezeichnung="Helm").exists())

    def test_inventar_validate_foto_renames_blob_to_png(self):
        serializer = InventarSerializer()
        file = SimpleNamespace(name="upload.blob", content_type="image/png")

        validated = serializer.validate_foto(file)

        self.assertTrue(validated.name.endswith(".png"))

    def test_inventar_can_store_lending_data(self):
        self.client.force_authenticate(user=self.inventar_role_user)

        response = self.request_method(
            "post",
            "inventar/",
            data={
                "bezeichnung": "Leitkegel",
                "anzahl": 3,
                "ist_verliehen": True,
                "verliehen_anzahl": 1,
                "verliehen_an": "FF Musterdorf",
                "verliehen_bis": "2026-12-31",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["ist_verliehen"])
        self.assertEqual(response.data["verliehen_anzahl"], 1)
        self.assertEqual(response.data["verliehen_an"], "FF Musterdorf")

    def test_inventar_lending_requires_borrower_name(self):
        self.client.force_authenticate(user=self.inventar_role_user)

        response = self.request_method(
            "post",
            "inventar/",
            data={
                "bezeichnung": "Absperrband",
                "ist_verliehen": True,
                "verliehen_anzahl": 1,
                "verliehen_bis": "2026-12-31",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("verliehen_an", response.data)

    def test_inventar_patch_to_available_clears_lending_fields(self):
        self.client.force_authenticate(user=self.inventar_role_user)

        created = self.request_method(
            "post",
            "inventar/",
            data={
                "bezeichnung": "Handlampe",
                "anzahl": 3,
                "ist_verliehen": True,
                "verliehen_anzahl": 2,
                "verliehen_an": "FF Nachbarort",
                "verliehen_bis": "2026-12-31",
            },
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        item_id = created.data["id"]
        response = self.request_method(
            "patch",
            f"inventar/{item_id}/",
            data={"ist_verliehen": False},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["ist_verliehen"])
        self.assertEqual(response.data["verliehen_anzahl"], 0)
        self.assertIsNone(response.data["verliehen_an"])
        self.assertIsNone(response.data["verliehen_bis"])

    def test_inventar_lending_quantity_cannot_exceed_total_quantity(self):
        self.client.force_authenticate(user=self.inventar_role_user)

        response = self.request_method(
            "post",
            "inventar/",
            data={
                "bezeichnung": "Warnleuchte",
                "anzahl": 3,
                "ist_verliehen": True,
                "verliehen_anzahl": 4,
                "verliehen_an": "FF Test",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("verleihungen", response.data)

    def test_inventar_can_store_multiple_lending_entries(self):
        self.client.force_authenticate(user=self.inventar_role_user)

        response = self.request_method(
            "post",
            "inventar/",
            data={
                "bezeichnung": "Scheinwerfer",
                "anzahl": 3,
                "verleihungen": [
                    {"an": "FF Dorf A", "anzahl": 1, "bis": "2026-12-31"},
                    {"an": "FF Dorf B", "anzahl": 2, "bis": "2027-01-10"},
                ],
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["ist_verliehen"])
        self.assertEqual(response.data["verliehen_anzahl"], 3)
        self.assertEqual(response.data["verliehen_an"], "Mehrere Entlehner")
        self.assertEqual(len(response.data["verleihungen"]), 2)

    def test_inventar_multi_lending_sum_cannot_exceed_total(self):
        self.client.force_authenticate(user=self.inventar_role_user)

        response = self.request_method(
            "post",
            "inventar/",
            data={
                "bezeichnung": "Scheinwerfer",
                "anzahl": 3,
                "verleihungen": [
                    {"an": "FF Dorf A", "anzahl": 2, "bis": "2026-12-31"},
                    {"an": "FF Dorf B", "anzahl": 2, "bis": "2027-01-10"},
                ],
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("verleihungen", response.data)

    def test_inventar_update_can_remove_photo(self):
        self.client.force_authenticate(user=self.inventar_role_user)
        create_file = self._png_file("img.png")
        created = self.client.post(
            self.build_api_url("inventar/"),
            data={"bezeichnung": "MitBild", "foto": create_file},
            format="multipart",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)

        item_id = created.data["id"]
        response = self.request_method("patch", f"inventar/{item_id}/", data={"foto": None})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = Inventar.objects.get(id=item_id)
        self.assertFalse(bool(item.foto))

    def test_inventar_filename_helpers(self):
        self.assertEqual(_clean_filename(" ../x y.png "), "x_y.png")
        self.assertEqual(_coerce_ext("name.jpeg"), "jpeg")
        name = inventar_filename(SimpleNamespace(id="abc"), "foo.png")
        self.assertEqual(name, os.path.join("inventar", "abc.png"))


class InventarBranchCoverageTests(APITestCase):
    def test_model_helpers_cover_additional_paths(self):
        self.assertIsNone(_coerce_ext("noext", fallback=None))

        with patch("core_apps.inventar.models.mimetypes.guess_type", return_value=("image/jpeg", None)):
            self.assertEqual(_coerce_ext("blob.bin"), "jpeg")

        with patch("core_apps.inventar.models.mimetypes.guess_type", return_value=("image/svg+xml", None)):
            self.assertEqual(_coerce_ext("blob.svg"), "png")

        with patch("core_apps.inventar.models._coerce_ext", return_value="gif"):
            with self.assertRaises(ValidationError):
                inventar_filename(SimpleNamespace(id="abc"), "file.unknown")

        path_without_id = inventar_filename(SimpleNamespace(id=None), "titel.jpeg")
        self.assertEqual(path_without_id, os.path.join("inventar", "titel.jpeg"))

    def test_model_str(self):
        item = Inventar(bezeichnung="Titel")
        self.assertEqual(str(item), "Titel")

    def test_serializer_get_foto_url_and_validation_paths(self):
        serializer = InventarSerializer()

        obj_no_file = SimpleNamespace(foto=None)
        self.assertIsNone(serializer.get_foto_url(obj_no_file))

        file_with_url = SimpleNamespace(name="n.png", url="/media/n.png")
        obj_with_file = SimpleNamespace(foto=file_with_url)
        self.assertEqual(serializer.get_foto_url(obj_with_file), "/media/n.png")

        class BrokenFile:
            name = "n.png"

            @property
            def url(self):
                raise RuntimeError("boom")

        broken_file = BrokenFile()
        obj_broken = SimpleNamespace(foto=broken_file)
        self.assertIsNone(serializer.get_foto_url(obj_broken))

        named_file = SimpleNamespace(name=" ../my unsafe name.JPG ", content_type="image/jpeg")
        validated = serializer.validate_foto(named_file)
        self.assertEqual(validated.name, "my_unsafe_name.JPG")

        self.assertIsNone(serializer.validate_foto(None))

        unknown_type = SimpleNamespace(name="upload.blob", content_type="application/octet-stream")
        validated_unknown = serializer.validate_foto(unknown_type)
        self.assertEqual(validated_unknown.name, "upload.png")

    def test_serializer_validate_lending_paths(self):
        serializer_ok = InventarSerializer(
            data={
                "bezeichnung": "Helm",
                "anzahl": 3,
                "ist_verliehen": True,
                "verliehen_anzahl": 1,
                "verliehen_an": "  FF Test  ",
                "verliehen_bis": "2026-10-20",
            }
        )
        self.assertTrue(serializer_ok.is_valid(), serializer_ok.errors)
        self.assertEqual(serializer_ok.validated_data["verliehen_an"], "FF Test")
        self.assertEqual(serializer_ok.validated_data["verliehen_anzahl"], 1)

        serializer_missing = InventarSerializer(
            data={
                "bezeichnung": "Helm",
                "ist_verliehen": True,
                "verliehen_anzahl": 1,
                "verliehen_an": "   ",
            }
        )
        self.assertFalse(serializer_missing.is_valid())
        self.assertIn("verliehen_an", serializer_missing.errors)

        serializer_too_many = InventarSerializer(
            data={
                "bezeichnung": "Helm",
                "anzahl": 3,
                "ist_verliehen": True,
                "verliehen_anzahl": 4,
                "verliehen_an": "FF Test",
            }
        )
        self.assertFalse(serializer_too_many.is_valid())
        self.assertIn("verleihungen", serializer_too_many.errors)

        serializer_clear = InventarSerializer(
            data={
                "bezeichnung": "Helm",
                "ist_verliehen": False,
                "verliehen_anzahl": 2,
                "verliehen_an": "FF Test",
                "verliehen_bis": "2026-10-20",
            }
        )
        self.assertTrue(serializer_clear.is_valid(), serializer_clear.errors)
        self.assertEqual(serializer_clear.validated_data["verliehen_anzahl"], 0)
        self.assertIsNone(serializer_clear.validated_data["verliehen_an"])
        self.assertIsNone(serializer_clear.validated_data["verliehen_bis"])

        serializer_multi = InventarSerializer(
            data={
                "bezeichnung": "Helm",
                "anzahl": 3,
                "verleihungen": [
                    {"an": "FF Test A", "anzahl": 1, "bis": "2026-10-20"},
                    {"an": "FF Test B", "anzahl": 2, "bis": "2026-10-25"},
                ],
            }
        )
        self.assertTrue(serializer_multi.is_valid(), serializer_multi.errors)
        self.assertEqual(serializer_multi.validated_data["verliehen_anzahl"], 3)
        self.assertEqual(serializer_multi.validated_data["verliehen_an"], "Mehrere Entlehner")
        self.assertEqual(len(serializer_multi.validated_data["verleihungen"]), 2)

        serializer_multi_too_many = InventarSerializer(
            data={
                "bezeichnung": "Helm",
                "anzahl": 3,
                "verleihungen": [
                    {"an": "FF Test A", "anzahl": 2, "bis": "2026-10-20"},
                    {"an": "FF Test B", "anzahl": 2, "bis": "2026-10-25"},
                ],
            }
        )
        self.assertFalse(serializer_multi_too_many.is_valid())
        self.assertIn("verleihungen", serializer_multi_too_many.errors)

    def test_serializer_create_and_update_image_branches(self):
        serializer = InventarSerializer()

        created = serializer.create({"bezeichnung": "A"})
        self.assertIsNotNone(created.id)

        upload_1 = SimpleUploadedFile("first.png", b"abc", content_type="image/png")
        created_with_file = serializer.create({"bezeichnung": "C", "foto": upload_1})
        self.assertTrue(bool(created_with_file.foto.name))

        created_with_file.bezeichnung = "Neu"
        updated_without_foto_change = serializer.update(created_with_file, {"bezeichnung": "Neu"})
        self.assertEqual(updated_without_foto_change.bezeichnung, "Neu")

        created_with_file.foto.save("old.png", ContentFile(b"old"), save=True)
        self.assertTrue(bool(created_with_file.foto.name))
        cleared = serializer.update(created_with_file, {"foto": None})
        self.assertFalse(bool(cleared.foto.name))

        new_upload = SimpleUploadedFile("new.png", b"xyz", content_type="image/png")
        replaced = serializer.update(cleared, {"foto": new_upload})
        self.assertTrue(bool(replaced.foto.name))

    def test_view_perform_update_destroy_branches(self):
        view = InventarViewSet()

        storage = Mock()
        saved = SimpleNamespace(foto=SimpleNamespace(name="news/new.png", storage=storage))
        instance = SimpleNamespace(foto=SimpleNamespace(name="news/old.png"))
        serializer = Mock()
        serializer.save.return_value = saved
        view.get_object = Mock(return_value=instance)
        view.perform_update(serializer)
        storage.delete.assert_called_once_with("news/old.png")

        storage_exc = Mock()
        storage_exc.delete.side_effect = RuntimeError("boom")
        saved_exc = SimpleNamespace(foto=SimpleNamespace(name="news/new2.png", storage=storage_exc))
        serializer_exc = Mock()
        serializer_exc.save.return_value = saved_exc
        view.get_object = Mock(return_value=SimpleNamespace(foto=SimpleNamespace(name="news/old2.png")))
        view.perform_update(serializer_exc)

        storage_same = Mock()
        same = SimpleNamespace(foto=SimpleNamespace(name="news/same.png", storage=storage_same))
        serializer_same = Mock()
        serializer_same.save.return_value = same
        view.get_object = Mock(return_value=SimpleNamespace(foto=SimpleNamespace(name="news/same.png")))
        view.perform_update(serializer_same)
        storage_same.delete.assert_not_called()

        storage_default = Mock()
        default_saved = SimpleNamespace(foto=SimpleNamespace(name="news/default.png", storage=storage_default))
        serializer_default = Mock()
        serializer_default.save.return_value = default_saved
        view.get_object = Mock(return_value=SimpleNamespace(foto=SimpleNamespace(name="")))
        view.perform_update(serializer_default)
        storage_default.delete.assert_not_called()

        destroy_view = InventarViewSet()
        with patch("rest_framework.viewsets.ModelViewSet.perform_destroy", return_value=None):
            inst = SimpleNamespace(foto=SimpleNamespace(name="news/delete.png", storage=Mock()))
            destroy_view.perform_destroy(inst)
            inst.foto.storage.delete.assert_called_once_with("news/delete.png")

        with patch("rest_framework.viewsets.ModelViewSet.perform_destroy", return_value=None):
            inst_exc = SimpleNamespace(foto=SimpleNamespace(name="news/delete2.png", storage=Mock()))
            inst_exc.foto.storage.delete.side_effect = RuntimeError("boom")
            destroy_view.perform_destroy(inst_exc)

        with patch("rest_framework.viewsets.ModelViewSet.perform_destroy", return_value=None):
            inst_default = SimpleNamespace(foto=SimpleNamespace(name="", storage=Mock()))
            destroy_view.perform_destroy(inst_default)
            inst_default.foto.storage.delete.assert_not_called()
