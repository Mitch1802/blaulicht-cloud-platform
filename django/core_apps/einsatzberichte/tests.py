from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.einsatzberichte.models import Einsatzbericht
from core_apps.mitglieder.models import Mitglied


class EinsatzberichteEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.user_bericht = self.create_user_with_roles("BERICHT")
        self.user_verwaltung = self.create_user_with_roles("VERWALTUNG")
        self.user_mitglied = self.create_user_with_roles("MITGLIED")

        self.bericht = Einsatzbericht.objects.create(
            einsatzleiter="Max Mustermann",
            einsatzart="Brandeinsatz",
            alarmstichwort="B2",
            einsatzadresse="Musterweg 1",
            alarmierende_stelle="AAZ",
            status=Einsatzbericht.Status.ENTWURF,
        )

    def test_context_payload_contains_expected_keys(self):
        self.client.force_authenticate(user=self.user_bericht)
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

        self.client.force_authenticate(user=self.user_bericht)
        response = self.request_method("get", "einsatzberichte/context/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stbnr_list = [item.get("stbnr") for item in response.data.get("mitglieder", [])]
        self.assertIn(2001, stbnr_list)
        self.assertNotIn(2002, stbnr_list)

    def test_mitglied_role_is_forbidden(self):
        self.client.force_authenticate(user=self.user_mitglied)
        response = self.request_method("get", "einsatzberichte/context/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_verwaltung_role_can_read_context(self):
        self.client.force_authenticate(user=self.user_verwaltung)
        response = self.request_method("get", "einsatzberichte/context/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_bericht_can_update_content(self):
        self.client.force_authenticate(user=self.user_bericht)
        response = self.request_method(
            "patch",
            f"einsatzberichte/{self.bericht.id}/",
            data={
                "status": self.bericht.status,
                "alarmstichwort": "B3",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.bericht.refresh_from_db()
        self.assertEqual(self.bericht.alarmstichwort, "B3")

    def test_verwaltung_cannot_update_content(self):
        self.client.force_authenticate(user=self.user_verwaltung)
        response = self.request_method(
            "patch",
            f"einsatzberichte/{self.bericht.id}/",
            data={"alarmstichwort": "B4"},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_status_change_only_admin_or_verwaltung(self):
        self.client.force_authenticate(user=self.user_bericht)
        forbidden_response = self.request_method(
            "patch",
            f"einsatzberichte/{self.bericht.id}/",
            data={"status": Einsatzbericht.Status.ABGESCHLOSSEN},
        )
        self.assertEqual(forbidden_response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.user_verwaltung)
        allowed_response = self.request_method(
            "patch",
            f"einsatzberichte/{self.bericht.id}/",
            data={"status": Einsatzbericht.Status.ABGESCHLOSSEN},
        )
        self.assertEqual(allowed_response.status_code, status.HTTP_200_OK)

        self.bericht.refresh_from_db()
        self.assertEqual(self.bericht.status, Einsatzbericht.Status.ABGESCHLOSSEN)

    def test_verwaltung_cannot_create_report(self):
        self.client.force_authenticate(user=self.user_verwaltung)
        payload = {
            "status": Einsatzbericht.Status.ENTWURF,
            "einsatzleiter": "Test",
            "einsatzart": "Brandeinsatz",
            "alarmstichwort": "B1",
            "einsatzadresse": "Adresse 1",
            "alarmierende_stelle": "AAZ",
        }
        response = self.request_method("post", "einsatzberichte/", data=payload)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bericht_can_create_report(self):
        self.client.force_authenticate(user=self.user_bericht)
        payload = {
            "status": Einsatzbericht.Status.ENTWURF,
            "einsatzleiter": "Test",
            "einsatzart": "Brandeinsatz",
            "alarmstichwort": "B1",
            "einsatzadresse": "Adresse 1",
            "alarmierende_stelle": "AAZ",
        }
        response = self.request_method("post", "einsatzberichte/", data=payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
