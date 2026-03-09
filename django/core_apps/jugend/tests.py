from datetime import date
from uuid import uuid4

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.jugend.models import JugendAusbildung, JugendEvent
from core_apps.mitglieder.models import Mitglied


class JugendApiTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.admin_user = self.create_user_with_roles("ADMIN")
        self.user_mitglied = self.create_user_with_roles("MITGLIED")
        self.user_jugend = self.create_user_with_roles("JUGEND")
        self.jugend_mitglied = Mitglied.objects.create(
            stbnr=3001,
            vorname="J",
            nachname="Mitglied",
            dienstgrad="JFM",
            svnr="1234",
            geburtsdatum=date(2011, 1, 1),
            dienststatus=Mitglied.Dienststatus.JUGEND,
        )
        self.aktiv_mitglied = Mitglied.objects.create(
            stbnr=3002,
            vorname="A",
            nachname="Mitglied",
            svnr="5678",
            geburtsdatum=date(1995, 1, 1),
            dienststatus=Mitglied.Dienststatus.AKTIV,
        )

    def test_jugend_endpoints_resolve(self):
        endpoints = [
            "jugend/mitglieder/",
            "jugend/ausbildung/",
            "jugend/events/",
            f"jugend/mitglieder/{uuid4()}/",
            f"jugend/ausbildung/{uuid4()}/",
            f"jugend/events/{uuid4()}/",
        ]
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_jugend_role_can_use_jugend_endpoints(self):
        self.client.force_authenticate(user=self.user_jugend)

        mitglieder_response = self.request_method("get", "jugend/mitglieder/")
        self.assertEqual(mitglieder_response.status_code, status.HTTP_200_OK)
        mitglied_ids = [item.get("pkid") for item in mitglieder_response.data]
        self.assertIn(self.jugend_mitglied.pkid, mitglied_ids)
        self.assertNotIn(self.aktiv_mitglied.pkid, mitglied_ids)

        ausbildung_response = self.request_method("get", "jugend/ausbildung/")
        self.assertEqual(ausbildung_response.status_code, status.HTTP_200_OK)

        events_response = self.request_method("get", "jugend/events/")
        self.assertEqual(events_response.status_code, status.HTTP_200_OK)

    def test_jugend_member_patch_allows_only_dienststatus(self):
        self.client.force_authenticate(user=self.user_jugend)
        endpoint = f"jugend/mitglieder/{self.jugend_mitglied.id}/"

        bad_response = self.request_method(
            "patch",
            endpoint,
            data={"dienststatus": Mitglied.Dienststatus.JUGEND, "vorname": "X"},
        )
        self.assertEqual(bad_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", bad_response.data)

        ok_response = self.request_method(
            "patch",
            endpoint,
            data={"dienststatus": Mitglied.Dienststatus.AKTIV},
        )
        self.assertEqual(ok_response.status_code, status.HTTP_200_OK)

        self.jugend_mitglied.refresh_from_db()
        self.assertEqual(self.jugend_mitglied.dienststatus, Mitglied.Dienststatus.AKTIV)

    def test_ausbildung_list_includes_only_jugend_members(self):
        JugendAusbildung.objects.create(mitglied=self.jugend_mitglied, erprobung_lv1=True)
        JugendAusbildung.objects.create(mitglied=self.aktiv_mitglied, erprobung_lv1=True)

        self.client.force_authenticate(user=self.user_jugend)
        response = self.request_method("get", "jugend/ausbildung/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mitglied_ids = [item.get("mitglied") for item in response.data]
        self.assertIn(self.jugend_mitglied.pkid, mitglied_ids)
        self.assertNotIn(self.aktiv_mitglied.pkid, mitglied_ids)

    def test_event_create_and_list(self):
        self.client.force_authenticate(user=self.user_jugend)
        payload = {
            "titel": "Wissentest März",
            "datum": "01.03.2026",
            "ort": "Feuerwehrhaus",
            "kategorie": "WISSENSTEST",
            "teilnehmer_ids": [self.jugend_mitglied.pkid],
            "teilnehmer_levels": [
                {
                    "pkid": self.jugend_mitglied.pkid,
                    "level": 3,
                }
            ],
        }

        create_response = self.request_method("post", "jugend/events/", data=payload)
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data.get("titel"), "Wissentest März")
        self.assertEqual(create_response.data.get("ort"), "Feuerwehrhaus")
        self.assertEqual(create_response.data.get("kategorie"), "WISSENSTEST")
        self.assertEqual(len(create_response.data.get("teilnehmer", [])), 1)
        self.assertEqual(create_response.data["teilnehmer"][0].get("dienstgrad"), "JFM")
        self.assertEqual(create_response.data["teilnehmer"][0].get("level"), 3)

        ausbildung = JugendAusbildung.objects.get(mitglied=self.jugend_mitglied)
        self.assertTrue(ausbildung.wissentest_lv1)
        self.assertTrue(ausbildung.wissentest_lv2)
        self.assertTrue(ausbildung.wissentest_lv3)
        self.assertFalse(ausbildung.wissentest_lv4)

        list_response = self.request_method("get", "jugend/events/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

    def test_event_fertigkeitsabzeichen_updates_fields(self):
        self.client.force_authenticate(user=self.user_jugend)
        payload = {
            "titel": "Melder-Abzeichen",
            "datum": "02.03.2026",
            "ort": "Feuerwehrhaus",
            "kategorie": "FERTIGKEITSABZEICHEN_MELDER",
            "teilnehmer_ids": [self.jugend_mitglied.pkid],
            "teilnehmer_levels": [
                {
                    "pkid": self.jugend_mitglied.pkid,
                    "level": 2,
                }
            ],
        }

        create_response = self.request_method("post", "jugend/events/", data=payload)
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        ausbildung = JugendAusbildung.objects.get(mitglied=self.jugend_mitglied)
        self.assertIsNotNone(ausbildung.melder_spiel_datum)
        self.assertIsNotNone(ausbildung.melder_datum)

    def test_event_fertigkeitsabzeichen_rejects_level_above_2(self):
        self.client.force_authenticate(user=self.user_jugend)
        payload = {
            "titel": "FW-Technik",
            "datum": "02.03.2026",
            "ort": "Feuerwehrhaus",
            "kategorie": "FERTIGKEITSABZEICHEN_FWTECHNIK",
            "teilnehmer_ids": [self.jugend_mitglied.pkid],
            "teilnehmer_levels": [
                {
                    "pkid": self.jugend_mitglied.pkid,
                    "level": 3,
                }
            ],
        }

        response = self.request_method("post", "jugend/events/", data=payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("teilnehmer_levels", response.data)

    def test_model_str(self):
        event = JugendEvent.objects.create(titel="Probe", datum=date(2026, 3, 1), ort="Haus")
        ausbildung = JugendAusbildung.objects.create(mitglied=self.jugend_mitglied)

        self.assertIn("Probe", str(event))
        self.assertIn(str(self.jugend_mitglied.stbnr), str(ausbildung))

    def test_mitglied_role_is_forbidden_for_jugend_endpoints(self):
        self.client.force_authenticate(user=self.user_mitglied)

        response = self.request_method("get", "jugend/mitglieder/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
