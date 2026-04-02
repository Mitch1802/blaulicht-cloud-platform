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
            "stand_x_override": True,
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
        self.assertTrue(create_response.data.get("stand_x_override"))
        self.assertEqual(len(create_response.data.get("teilnehmer", [])), 1)
        self.assertEqual(create_response.data["teilnehmer"][0].get("dienstgrad"), "JFM")
        self.assertEqual(create_response.data["teilnehmer"][0].get("level"), 3)

        ausbildung = JugendAusbildung.objects.get(mitglied=self.jugend_mitglied)
        self.assertFalse(ausbildung.wissentest_lv1)
        self.assertFalse(ausbildung.wissentest_lv2)
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

    def test_event_delete_rolls_back_wissentest_level(self):
        self.client.force_authenticate(user=self.user_jugend)
        payload = {
            "titel": "Wissentest April",
            "datum": "03.04.2026",
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

        event_id = create_response.data.get("id")
        delete_response = self.request_method("delete", f"jugend/events/{event_id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        ausbildung = JugendAusbildung.objects.get(mitglied=self.jugend_mitglied)
        self.assertFalse(ausbildung.wissentest_lv1)
        self.assertFalse(ausbildung.wissentest_lv2)
        self.assertFalse(ausbildung.wissentest_lv3)
        self.assertIsNone(ausbildung.wissentest_lv1_datum)
        self.assertIsNone(ausbildung.wissentest_lv2_datum)
        self.assertIsNone(ausbildung.wissentest_lv3_datum)

    def test_event_delete_rebuilds_from_remaining_events(self):
        self.client.force_authenticate(user=self.user_jugend)

        erstes_payload = {
            "titel": "Wissentest Mai",
            "datum": "01.05.2026",
            "ort": "Feuerwehrhaus",
            "kategorie": "WISSENSTEST",
            "teilnehmer_ids": [self.jugend_mitglied.pkid],
            "teilnehmer_levels": [
                {
                    "pkid": self.jugend_mitglied.pkid,
                    "level": 2,
                }
            ],
        }
        zweites_payload = {
            "titel": "Wissentest Juni",
            "datum": "01.06.2026",
            "ort": "Feuerwehrhaus",
            "kategorie": "WISSENSTEST",
            "teilnehmer_ids": [self.jugend_mitglied.pkid],
            "teilnehmer_levels": [
                {
                    "pkid": self.jugend_mitglied.pkid,
                    "level": 4,
                }
            ],
        }

        first_create = self.request_method("post", "jugend/events/", data=erstes_payload)
        self.assertEqual(first_create.status_code, status.HTTP_201_CREATED)

        second_create = self.request_method("post", "jugend/events/", data=zweites_payload)
        self.assertEqual(second_create.status_code, status.HTTP_201_CREATED)

        first_event_id = first_create.data.get("id")
        delete_response = self.request_method("delete", f"jugend/events/{first_event_id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        ausbildung = JugendAusbildung.objects.get(mitglied=self.jugend_mitglied)
        self.assertFalse(ausbildung.wissentest_lv1)
        self.assertFalse(ausbildung.wissentest_lv2)
        self.assertFalse(ausbildung.wissentest_lv3)
        self.assertTrue(ausbildung.wissentest_lv4)
        self.assertFalse(ausbildung.wissentest_lv5)
        self.assertIsNone(ausbildung.wissentest_lv1_datum)
        self.assertEqual(str(ausbildung.wissentest_lv4_datum), "2026-06-01")

    def test_event_rejects_already_reached_level(self):
        self.client.force_authenticate(user=self.user_jugend)
        JugendAusbildung.objects.create(
            mitglied=self.jugend_mitglied,
            wissentest_lv1=True,
            wissentest_lv2=True,
            wissentest_lv3=True,
            wissentest_lv4=True,
        )

        payload = {
            "titel": "Wissentest Juli",
            "datum": "01.07.2026",
            "ort": "Feuerwehrhaus",
            "kategorie": "WISSENSTEST",
            "teilnehmer_ids": [self.jugend_mitglied.pkid],
            "teilnehmer_levels": [
                {
                    "pkid": self.jugend_mitglied.pkid,
                    "level": 4,
                }
            ],
        }

        response = self.request_method("post", "jugend/events/", data=payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("teilnehmer_levels", response.data)

    def test_event_update_removing_member_rebuilds_ausbildung(self):
        self.client.force_authenticate(user=self.user_jugend)
        weiteres_jugend_mitglied = Mitglied.objects.create(
            stbnr=3003,
            vorname="Z",
            nachname="Mitglied",
            dienstgrad="JFM",
            svnr="9012",
            geburtsdatum=date(2011, 5, 1),
            dienststatus=Mitglied.Dienststatus.JUGEND,
        )

        create_payload = {
            "titel": "Wissentest August",
            "datum": "01.08.2026",
            "ort": "Feuerwehrhaus",
            "kategorie": "WISSENSTEST",
            "teilnehmer_ids": [self.jugend_mitglied.pkid, weiteres_jugend_mitglied.pkid],
            "teilnehmer_levels": [
                {"pkid": self.jugend_mitglied.pkid, "level": 3},
                {"pkid": weiteres_jugend_mitglied.pkid, "level": 2},
            ],
        }

        create_response = self.request_method("post", "jugend/events/", data=create_payload)
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        event_id = create_response.data.get("id")

        update_payload = {
            "teilnehmer_ids": [self.jugend_mitglied.pkid],
            "teilnehmer_levels": [{"pkid": self.jugend_mitglied.pkid, "level": 4}],
        }
        update_response = self.request_method("patch", f"jugend/events/{event_id}/", data=update_payload)
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        ausbildung_verbleibend = JugendAusbildung.objects.get(mitglied=self.jugend_mitglied)
        self.assertTrue(ausbildung_verbleibend.wissentest_lv4)

        ausbildung_entfernt = JugendAusbildung.objects.get(mitglied=weiteres_jugend_mitglied)
        self.assertFalse(ausbildung_entfernt.wissentest_lv1)
        self.assertFalse(ausbildung_entfernt.wissentest_lv2)
        self.assertIsNone(ausbildung_entfernt.wissentest_lv1_datum)
        self.assertIsNone(ausbildung_entfernt.wissentest_lv2_datum)

    def test_event_update_adding_member_sets_ausbildung(self):
        self.client.force_authenticate(user=self.user_jugend)
        weiteres_jugend_mitglied = Mitglied.objects.create(
            stbnr=3004,
            vorname="N",
            nachname="Mitglied",
            dienstgrad="JFM",
            svnr="3456",
            geburtsdatum=date(2011, 6, 1),
            dienststatus=Mitglied.Dienststatus.JUGEND,
        )

        create_payload = {
            "titel": "Wissentest September",
            "datum": "01.09.2026",
            "ort": "Feuerwehrhaus",
            "kategorie": "WISSENSTEST",
            "teilnehmer_ids": [self.jugend_mitglied.pkid],
            "teilnehmer_levels": [{"pkid": self.jugend_mitglied.pkid, "level": 2}],
        }
        create_response = self.request_method("post", "jugend/events/", data=create_payload)
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        event_id = create_response.data.get("id")

        update_payload = {
            "teilnehmer_ids": [self.jugend_mitglied.pkid, weiteres_jugend_mitglied.pkid],
            "teilnehmer_levels": [{"pkid": weiteres_jugend_mitglied.pkid, "level": 3}],
        }
        update_response = self.request_method("patch", f"jugend/events/{event_id}/", data=update_payload)
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        ausbildung_neu = JugendAusbildung.objects.get(mitglied=weiteres_jugend_mitglied)
        self.assertFalse(ausbildung_neu.wissentest_lv1)
        self.assertFalse(ausbildung_neu.wissentest_lv2)
        self.assertTrue(ausbildung_neu.wissentest_lv3)
        self.assertFalse(ausbildung_neu.wissentest_lv4)

    def test_model_str(self):
        event = JugendEvent.objects.create(titel="Probe", datum=date(2026, 3, 1), ort="Haus")
        ausbildung = JugendAusbildung.objects.create(mitglied=self.jugend_mitglied)

        self.assertIn("Probe", str(event))
        self.assertIn(str(self.jugend_mitglied.stbnr), str(ausbildung))

    def test_mitglied_role_is_forbidden_for_jugend_endpoints(self):
        self.client.force_authenticate(user=self.user_mitglied)

        response = self.request_method("get", "jugend/mitglieder/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
