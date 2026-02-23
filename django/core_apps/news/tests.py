from uuid import uuid4
from types import SimpleNamespace
import os
from unittest.mock import Mock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.files.base import ContentFile
from django.core.exceptions import ValidationError
from rest_framework import status

from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.news.models import _clean_filename, _coerce_ext, news_filename, News
from core_apps.news.serializers import NewsSerializer
from core_apps.news.views import NewsViewSet


class NewsEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.news_role_user = self.create_user_with_roles("NEWS")
        self.admin = self.create_user_with_roles("ADMIN")
        News.objects.create(title="Intern", text="i", typ="intern")
        News.objects.create(title="Extern", text="e", typ="extern")

    def test_all_news_endpoints_resolve(self):
        endpoints = [
            "news/intern/",
            f"news/intern/{uuid4()}/",
            "news/public/",
            f"news/public/{uuid4()}/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_news_intern_requires_auth_and_role(self):
        self.assert_requires_authentication("news/intern/")
        self.assert_forbidden_without_role("news/intern/")

    def test_news_public_accessible_without_auth(self):
        self.assert_not_auth_error("news/public/")

    def test_news_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("news/intern/")
        self.assert_method_matrix_no_server_error("news/public/")

    def test_news_role_user_can_create_news(self):
        self.client.force_authenticate(user=self.news_role_user)

        response = self.request_method("post", "news/intern/", data={"title": "Neu", "text": "Text"})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_news_public_can_filter_by_typ(self):
        response = self.request_method("get", "news/public/?typ=extern")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(all(item.get("typ") == "extern" for item in response.data))

    def test_news_validate_foto_renames_blob_to_png(self):
        serializer = NewsSerializer()
        file = SimpleNamespace(name="upload.blob", content_type="image/png")

        validated = serializer.validate_foto(file)

        self.assertTrue(validated.name.endswith(".png"))

    def test_news_filename_helpers(self):
        self.assertEqual(_clean_filename(" ../x y.png "), "x_y.png")
        self.assertEqual(_coerce_ext("name.jpeg"), "jpeg")
        name = news_filename(SimpleNamespace(id="abc"), "foo.png")
        self.assertEqual(name, os.path.join("news", "abc.png"))


class NewsBranchCoverageTests(APITestCase):
    def test_model_helpers_cover_additional_paths(self):
        self.assertIsNone(_coerce_ext("noext", fallback=None))

        with patch("core_apps.news.models.mimetypes.guess_type", return_value=("image/jpeg", None)):
            self.assertEqual(_coerce_ext("blob.bin"), "jpeg")

        with patch("core_apps.news.models.mimetypes.guess_type", return_value=("image/svg+xml", None)):
            self.assertEqual(_coerce_ext("blob.svg"), "png")

        with patch("core_apps.news.models._coerce_ext", return_value="gif"):
            with self.assertRaises(ValidationError):
                news_filename(SimpleNamespace(id="abc"), "file.unknown")

        path_without_id = news_filename(SimpleNamespace(id=None), "titel.jpeg")
        self.assertEqual(path_without_id, os.path.join("news", "titel.jpeg"))

    def test_model_str(self):
        item = News(title="Titel", text="Text")
        self.assertEqual(str(item), "Titel")

    def test_serializer_get_foto_url_and_validation_paths(self):
        serializer = NewsSerializer()

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

    def test_serializer_create_and_update_image_branches(self):
        serializer = NewsSerializer()

        created = serializer.create({"title": "A", "text": "B", "typ": "intern"})
        self.assertIsNotNone(created.id)

        upload_1 = SimpleUploadedFile("first.png", b"abc", content_type="image/png")
        created_with_file = serializer.create({"title": "C", "text": "D", "typ": "intern", "foto": upload_1})
        self.assertTrue(bool(created_with_file.foto.name))

        created_with_file.title = "Neu"
        updated_without_foto_change = serializer.update(created_with_file, {"title": "Neu"})
        self.assertEqual(updated_without_foto_change.title, "Neu")

        created_with_file.foto.save("old.png", ContentFile(b"old"), save=True)
        self.assertTrue(bool(created_with_file.foto.name))
        cleared = serializer.update(created_with_file, {"foto": None})
        self.assertFalse(bool(cleared.foto.name))

        new_upload = SimpleUploadedFile("new.png", b"xyz", content_type="image/png")
        replaced = serializer.update(cleared, {"foto": new_upload})
        self.assertTrue(bool(replaced.foto.name))

    def test_view_perform_update_destroy_branches(self):
        view = NewsViewSet()

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

        destroy_view = NewsViewSet()
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
