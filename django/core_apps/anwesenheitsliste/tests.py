from datetime import date
from uuid import uuid4

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.anwesenheitsliste.models import Anwesenheitsliste, AnwesenheitslisteFoto
from core_apps.anwesenheitsliste.serializers import AnwesenheitslisteSerializer, NullableDateField
from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.mitglieder.models import Mitglied


class AnwesenheitslisteEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.user = self.create_user_with_roles("MITGLIED")
        self.mitglied = Mitglied.objects.create(
            stbnr=77,
            vorname="Anna",
            nachname="Muster",
            svnr="9876",
            geburtsdatum=date(1995, 5, 5),
        )
        eintrag = Anwesenheitsliste.objects.create(
            titel="Monatsübung",
            datum=date(2026, 2, 20),
            ort="Feuerwehrhaus",
            notiz="Vollzählig",
        )
        eintrag.mitglieder.add(self.mitglied)

    def test_all_endpoints_resolve(self):
        endpoints = [
            "anwesenheitsliste/",
            "anwesenheitsliste/context/",
            f"anwesenheitsliste/{uuid4()}/",
        ]
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_requires_auth_and_role(self):
        self.assert_requires_authentication("anwesenheitsliste/")
        self.assert_forbidden_without_role("anwesenheitsliste/")

    def test_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("anwesenheitsliste/")

    def test_list_payload(self):
        self.client.force_authenticate(user=self.user)
        response = self.request_method("get", "anwesenheitsliste/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_context_payload_contains_mitglieder(self):
        self.client.force_authenticate(user=self.user)
        response = self.request_method("get", "anwesenheitsliste/context/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("mitglieder", response.data)

    def test_context_excludes_reserve_members(self):
        Mitglied.objects.create(
            stbnr=78,
            vorname="Reserve",
            nachname="Mitglied",
            svnr="1111",
            geburtsdatum=date(1994, 4, 4),
            dienststatus="RESERVE",
        )

        self.client.force_authenticate(user=self.user)
        response = self.request_method("get", "anwesenheitsliste/context/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        stbnr_list = [item.get("stbnr") for item in response.data.get("mitglieder", [])]
        self.assertIn(77, stbnr_list)
        self.assertNotIn(78, stbnr_list)

    def test_serializer_meta_and_nullable_date(self):
        date_field = NullableDateField()
        self.assertIsNone(date_field.to_internal_value(""))
        self.assertIsNone(date_field.to_internal_value(None))

        serializer = AnwesenheitslisteSerializer()
        self.assertEqual(serializer.Meta.model, Anwesenheitsliste)
        self.assertIn("mitglied_ids", serializer.Meta.fields)

    def test_create_with_fotodoku_upload(self):
        self.client.force_authenticate(user=self.user)
        upload = SimpleUploadedFile(
            "fotodoku.png",
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\nIDATx\xdac\xf8\x0f\x00\x01\x01\x01\x00\x18\xdd\x8d\xb1\x00\x00\x00\x00IEND\xaeB`\x82",
            content_type="image/png",
        )

        payload = {
            "titel": "Monatsübung mit Fotodoku",
            "datum": "20.02.2026",
            "ort": "Feuerwehrhaus",
            "notiz": "Fotos vorhanden",
            "mitglied_ids": [self.mitglied.pkid],
            "fotos_doku": [upload],
        }

        response = self.client.post(self.build_api_url("anwesenheitsliste/"), data=payload, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data.get("fotos", [])), 1)

    def test_foto_delete_endpoint(self):
        eintrag = Anwesenheitsliste.objects.first()
        self.assertIsNotNone(eintrag)
        foto = AnwesenheitslisteFoto.objects.create(
            anwesenheitsliste=eintrag,
            foto=SimpleUploadedFile(
                "delete-me.png",
                b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\nIDATx\xdac\xf8\x0f\x00\x01\x01\x01\x00\x18\xdd\x8d\xb1\x00\x00\x00\x00IEND\xaeB`\x82",
                content_type="image/png",
            ),
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(self.build_api_url(f"anwesenheitsliste/{eintrag.id}/fotos/{foto.id}/"))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(AnwesenheitslisteFoto.objects.filter(id=foto.id).exists())

    def test_foto_delete_endpoint_returns_404_for_missing_photo(self):
        eintrag = Anwesenheitsliste.objects.first()
        self.assertIsNotNone(eintrag)

        self.client.force_authenticate(user=self.user)
        response = self.client.delete(self.build_api_url(f"anwesenheitsliste/{eintrag.id}/fotos/{uuid4()}/"))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
