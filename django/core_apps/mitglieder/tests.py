from uuid import uuid4
from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.mitglieder.models import Mitglied


class MitgliederEndpointTests(EndpointSmokeMixin, APITestCase):
    def test_all_mitglieder_endpoints_resolve(self):
        endpoints = [
            "mitglieder/",
            "mitglieder/import/",
            f"mitglieder/{uuid4()}/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_mitglieder_requires_auth_and_role(self):
        self.assert_endpoint_contract("mitglieder/")

    def test_mitglieder_import_requires_auth_and_role(self):
        self.assert_endpoint_contract("mitglieder/import/", method="post", data=[])

    def test_mitglieder_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("mitglieder/")
        self.assert_method_matrix_no_server_error("mitglieder/import/", data=[])

    def test_mitglieder_import_rejects_non_list_payload(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        response = self.request_method("post", "mitglieder/import/", data={"stbnr": 1})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mitglieder_import_rejects_missing_stbnr(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        payload = [
            {
                "vorname": "Max",
                "nachname": "Mustermann",
                "geburtsdatum": "01.01.2000",
            }
        ]
        response = self.request_method("post", "mitglieder/import/", data=payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mitglieder_import_creates_new_member(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        payload = [
            {
                "stbnr": 12345,
                "vorname": "Erika",
                "nachname": "Musterfrau",
                "geburtsdatum": "01.01.2000",
                "svnr": "1234",
                "hauptberuflich": False,
            }
        ]
        response = self.request_method("post", "mitglieder/import/", data=payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get("created"), 1)
        self.assertTrue(Mitglied.objects.filter(stbnr=12345).exists())

    def test_mitglieder_import_skips_existing_member(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)
        Mitglied.objects.create(
            stbnr=777,
            vorname="Vor",
            nachname="Nach",
            geburtsdatum=date(1990, 1, 1),
        )

        payload = [{"stbnr": 777, "vorname": "Neu", "nachname": "N", "geburtsdatum": "01.01.2000"}]
        response = self.request_method("post", "mitglieder/import/", data=payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get("created"), 0)
        self.assertEqual(len(response.data.get("skipped", [])), 1)

    def test_mitglied_model_str(self):
        member = Mitglied.objects.create(
            stbnr=888,
            vorname="Max",
            nachname="Muster",
            geburtsdatum=date(1991, 2, 2),
        )
        self.assertEqual(str(member), "Max Muster")
