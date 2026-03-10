from datetime import date
from unittest.mock import Mock, patch

import requests
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

    def test_bericht_cannot_delete_report(self):
        self.client.force_authenticate(user=self.user_bericht)
        response = self.request_method("delete", f"einsatzberichte/{self.bericht.id}/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Einsatzbericht.objects.filter(id=self.bericht.id).exists())

    def test_verwaltung_can_delete_report(self):
        self.client.force_authenticate(user=self.user_verwaltung)
        response = self.request_method("delete", f"einsatzberichte/{self.bericht.id}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Einsatzbericht.objects.filter(id=self.bericht.id).exists())

    def test_blaulichtsms_letzter_uses_dashboard_session_id(self):
        self.client.force_authenticate(user=self.user_bericht)

        response_payload = {
            "customerId": "123456",
            "customerName": "FF Test",
            "username": "dashboard",
            "integrations": [],
            "infos": [],
            "alarms": [
                {
                    "alarmId": "older",
                    "alarmDate": "2026-03-10T16:00:00.000Z",
                    "endDate": "2026-03-10T16:30:00.000Z",
                    "authorName": "Alt",
                    "alarmText": "Alter Alarm",
                    "type": "Technik",
                    "alarmGroups": [{"groupName": "AAZ"}],
                    "geolocation": {"address": "Altgasse 1"},
                },
                {
                    "alarmId": "latest",
                    "alarmDate": "2026-03-10T17:30:21.345Z",
                    "endDate": "2026-03-10T18:05:00.000Z",
                    "authorName": "Neu",
                    "alarmText": "Neuester Alarm",
                    "type": "Brand",
                    "alarmGroups": [{"groupName": "BLS"}],
                    "geolocation": {"address": "Hauptplatz 1"},
                },
            ],
        }

        mock_response = Mock()
        mock_response.content = b'{"ok": true}'
        mock_response.json.return_value = response_payload
        mock_response.raise_for_status.return_value = None

        with patch("core_apps.einsatzberichte.views.requests.get", return_value=mock_response) as mock_get, patch(
            "core_apps.einsatzberichte.views.settings.BLAULICHTSMS_API_URL",
            "https://api.blaulichtsms.net/blaulicht",
        ), patch(
            "core_apps.einsatzberichte.views.settings.BLAULICHTSMS_DASHBOARD_SESSION_ID",
            "session-123",
        ), patch("core_apps.einsatzberichte.views.settings.BLAULICHTSMS_TIMEOUT", 12):
            response = self.request_method("get", "einsatzberichte/blaulichtsms/letzter/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["mapped"]["blaulichtsms_einsatz_id"], "latest")
        self.assertEqual(response.data["mapped"]["alarmstichwort"], "Neuester Alarm")
        self.assertEqual(response.data["mapped"]["alarmierende_stelle"], "BLS")
        self.assertEqual(response.data["mapped"]["einsatzadresse"], "Hauptplatz 1")
        mock_get.assert_called_once_with(
            "https://api.blaulichtsms.net/blaulicht/api/alarm/v1/dashboard/session-123",
            headers={"Accept": "application/json"},
            timeout=12,
        )

    def test_blaulichtsms_letzter_requires_dashboard_session_id(self):
        self.client.force_authenticate(user=self.user_bericht)

        with patch("core_apps.einsatzberichte.views.settings.BLAULICHTSMS_API_URL", "https://api.blaulichtsms.net/blaulicht"), patch(
            "core_apps.einsatzberichte.views.settings.BLAULICHTSMS_DASHBOARD_SESSION_ID",
            "",
        ):
            response = self.request_method("get", "einsatzberichte/blaulichtsms/letzter/")

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["configured"], False)

    def test_blaulichtsms_letzter_returns_gateway_error_for_expired_dashboard_session(self):
        self.client.force_authenticate(user=self.user_bericht)

        mock_response = Mock(status_code=status.HTTP_401_UNAUTHORIZED)
        http_error = requests.HTTPError(response=mock_response)

        with patch("core_apps.einsatzberichte.views.requests.get", side_effect=http_error), patch(
            "core_apps.einsatzberichte.views.settings.BLAULICHTSMS_API_URL",
            "https://api.blaulichtsms.net/blaulicht",
        ), patch(
            "core_apps.einsatzberichte.views.settings.BLAULICHTSMS_DASHBOARD_SESSION_ID",
            "expired-session",
        ):
            response = self.request_method("get", "einsatzberichte/blaulichtsms/letzter/")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
