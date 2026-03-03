from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.mitglieder.models import Mitglied


class EinsatzberichteEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.user = self.create_user_with_roles("MITGLIED")

    def test_context_payload_contains_expected_keys(self):
        self.client.force_authenticate(user=self.user)
        response = self.request_method("get", "einsatzberichte/context/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("fahrzeuge", response.data)
        self.assertIn("mitglieder", response.data)
        self.assertIn("mitalarmiert_stellen", response.data)

    def test_context_excludes_reserve_members(self):
        Mitglied.objects.create(
            stbnr=2001,
            vorname="Aktiv",
            nachname="Mitglied",
            svnr="1234",
            geburtsdatum=date(1990, 1, 1),
            dienststatus="AKTIV",
        )
        Mitglied.objects.create(
            stbnr=2002,
            vorname="Reserve",
            nachname="Mitglied",
            svnr="5678",
            geburtsdatum=date(1991, 1, 1),
            dienststatus="RESERVE",
        )

        self.client.force_authenticate(user=self.user)
        response = self.request_method("get", "einsatzberichte/context/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stbnr_list = [item.get("stbnr") for item in response.data.get("mitglieder", [])]
        self.assertIn(2001, stbnr_list)
        self.assertNotIn(2002, stbnr_list)
