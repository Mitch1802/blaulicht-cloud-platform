from datetime import date
from uuid import uuid4

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.anwesenheitsliste.models import Anwesenheitsliste
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
        Anwesenheitsliste.objects.create(
            mitglied_id=self.mitglied,
            titel="Monatsübung",
            datum=date(2026, 2, 20),
            ort="Feuerwehrhaus",
            notiz="Vollzählig",
        )

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

    def test_serializer_meta_and_nullable_date(self):
        date_field = NullableDateField()
        self.assertIsNone(date_field.to_internal_value(""))
        self.assertIsNone(date_field.to_internal_value(None))

        serializer = AnwesenheitslisteSerializer()
        self.assertEqual(serializer.Meta.model, Anwesenheitsliste)
        self.assertEqual(serializer.Meta.fields, "__all__")
