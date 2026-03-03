from datetime import date
from uuid import uuid4

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.jugend.models import JugendAusbildung, JugendEvent
from core_apps.mitglieder.models import Mitglied


class JugendApiTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.user = self.create_user_with_roles("MITGLIED")
        self.jugend_mitglied = Mitglied.objects.create(
            stbnr=3001,
            vorname="J",
            nachname="Mitglied",
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
            "jugend/ausbildung/",
            "jugend/events/",
            f"jugend/ausbildung/{uuid4()}/",
            f"jugend/events/{uuid4()}/",
        ]
        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_ausbildung_list_includes_only_jugend_members(self):
        JugendAusbildung.objects.create(mitglied=self.jugend_mitglied, erprobung_lv1=True)
        JugendAusbildung.objects.create(mitglied=self.aktiv_mitglied, erprobung_lv1=True)

        self.client.force_authenticate(user=self.user)
        response = self.request_method("get", "jugend/ausbildung/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mitglied_ids = [item.get("mitglied") for item in response.data]
        self.assertIn(self.jugend_mitglied.pkid, mitglied_ids)
        self.assertNotIn(self.aktiv_mitglied.pkid, mitglied_ids)

    def test_event_create_and_list(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "titel": "Wissentest März",
            "datum": "01.03.2026",
            "ort": "Feuerwehrhaus",
            "teilnehmer_ids": [self.jugend_mitglied.pkid],
        }

        create_response = self.request_method("post", "jugend/events/", data=payload)
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create_response.data.get("titel"), "Wissentest März")
        self.assertEqual(create_response.data.get("ort"), "Feuerwehrhaus")
        self.assertEqual(len(create_response.data.get("teilnehmer", [])), 1)

        list_response = self.request_method("get", "jugend/events/")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)

    def test_model_str(self):
        event = JugendEvent.objects.create(titel="Probe", datum=date(2026, 3, 1), ort="Haus")
        ausbildung = JugendAusbildung.objects.create(mitglied=self.jugend_mitglied)

        self.assertIn("Probe", str(event))
        self.assertIn(str(self.jugend_mitglied.stbnr), str(ausbildung))
