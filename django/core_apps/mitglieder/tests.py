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
            "mitglieder/jugend-events/",
            f"mitglieder/{uuid4()}/",
            f"mitglieder/jugend-events/{uuid4()}/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_mitglieder_requires_auth_and_role(self):
        self.assert_endpoint_contract("mitglieder/")

    def test_mitglieder_import_requires_auth_and_role(self):
        self.assert_endpoint_contract("mitglieder/import/", method="post", data={"mode": "preview", "rows": []})

    def test_mitglieder_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("mitglieder/")
        self.assert_method_matrix_no_server_error("mitglieder/import/", data={"mode": "preview", "rows": []})
        self.assert_method_matrix_no_server_error("mitglieder/jugend-events/")

    def test_jugend_events_requires_auth_and_role(self):
        self.assert_endpoint_contract("mitglieder/jugend-events/")

    def test_jugend_event_can_be_created_with_participants(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        member = Mitglied.objects.create(
            stbnr=9100,
            vorname="Jugend",
            nachname="Test",
            geburtsdatum=date(2011, 6, 1),
        )

        payload = {
            "titel": "Wissentest März",
            "datum": "01.03.2026",
            "notiz": "Basisstufe",
            "teilnehmer_ids": [member.pkid],
        }
        response = self.request_method("post", "mitglieder/jugend-events/", data=payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data.get("titel"), "Wissentest März")
        self.assertEqual(len(response.data.get("teilnehmer", [])), 1)

    def test_mitglieder_import_rejects_invalid_payload(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        response = self.request_method("post", "mitglieder/import/", data={"mode": "preview", "rows": {"stbnr": 1}})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mitglieder_import_rejects_missing_stbnr(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        payload = {
            "mode": "preview",
            "rows": [
                {
                    "vorname": "Max",
                    "nachname": "Mustermann",
                    "geburtsdatum": "01.01.2000",
                }
            ],
        }
        response = self.request_method("post", "mitglieder/import/", data=payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mitglieder_import_preview_and_apply_creates_member(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        rows = [
            {
                "STBNR": 12345,
                "VORNAME": "Erika",
                "ZUNAME": "Musterfrau",
                "GEBURTSDATUM": "01.01.2000",
                "STATUS": "AKTIV",
                "DIENSTGRAD": "FM",
            }
        ]
        preview = self.request_method("post", "mitglieder/import/", data={"mode": "preview", "rows": rows})
        self.assertEqual(preview.status_code, status.HTTP_200_OK)
        self.assertEqual(preview.data.get("summary", {}).get("total_changes"), 1)

        response = self.request_method("post", "mitglieder/import/", data={"mode": "apply", "rows": rows})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("summary", {}).get("created"), 1)
        self.assertTrue(Mitglied.objects.filter(stbnr=12345, geburtsdatum=date(2000, 1, 1)).exists())

    def test_mitglieder_import_updates_existing_member(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        existing = Mitglied.objects.create(
            stbnr=777,
            vorname="Vor",
            nachname="Nach",
            dienstgrad="FM",
            dienststatus="AKTIV",
            geburtsdatum=date(1990, 1, 1),
        )

        rows = [
            {
                "STBNR": 777,
                "VORNAME": "Neu",
                "ZUNAME": "Name",
                "GEBURTSDATUM": "01.01.1990",
                "STATUS": "RESERVE",
                "DIENSTGRAD": "OFM",
            }
        ]
        response = self.request_method("post", "mitglieder/import/", data={"mode": "apply", "rows": rows})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data.get("summary", {}).get("updated"), 1)

        existing.refresh_from_db()
        self.assertEqual(existing.vorname, "Neu")
        self.assertEqual(existing.nachname, "Name")
        self.assertEqual(existing.dienstgrad, "OFM")
        self.assertEqual(existing.dienststatus, "RESERVE")

    def test_mitglieder_import_maps_abgemeldet_status(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        rows = [
            {
                "STBNR": 901,
                "VORNAME": "Ab",
                "ZUNAME": "Gemeldet",
                "GEBURTSDATUM": "01.01.2001",
                "STATUS": "ABGEMELDET",
                "DIENSTGRAD": "FM",
            }
        ]
        apply_resp = self.request_method("post", "mitglieder/import/", data={"mode": "apply", "rows": rows})
        self.assertEqual(apply_resp.status_code, status.HTTP_200_OK)

        stored = Mitglied.objects.get(stbnr=901)
        self.assertEqual(stored.dienststatus, "ABGEMELDET")

    def test_mitglieder_list_filters_abgemeldet_and_reserve_status(self):
        admin = self.create_user_with_roles("ADMIN")
        self.client.force_authenticate(user=admin)

        Mitglied.objects.create(
            stbnr=1001,
            vorname="Aktiv",
            nachname="Mitglied",
            geburtsdatum=date(1990, 1, 1),
            dienststatus="AKTIV",
        )
        Mitglied.objects.create(
            stbnr=1002,
            vorname="Ab",
            nachname="Gemeldet",
            geburtsdatum=date(1991, 1, 1),
            dienststatus="ABGEMELDET",
        )
        Mitglied.objects.create(
            stbnr=1003,
            vorname="Reserve",
            nachname="Mitglied",
            geburtsdatum=date(1992, 1, 1),
            dienststatus="RESERVE",
        )

        list_resp = self.request_method("get", "mitglieder/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)

        stbnr_list = [item.get("stbnr") for item in list_resp.data]
        self.assertIn(1001, stbnr_list)
        self.assertNotIn(1002, stbnr_list)
        self.assertNotIn(1003, stbnr_list)

    def test_mitglied_model_str(self):
        member = Mitglied.objects.create(
            stbnr=888,
            vorname="Max",
            nachname="Muster",
            geburtsdatum=date(1991, 2, 2),
        )
        self.assertEqual(str(member), "Max Muster")
