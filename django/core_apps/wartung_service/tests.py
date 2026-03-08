from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.atemschutz_geraete.models import AtemschutzGeraet, AtemschutzGeraetProtokoll
from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.fahrzeuge.models import Fahrzeug, FahrzeugRaum, RaumItem
from core_apps.inventar.models import Inventar
from core_apps.messgeraete.models import Messgeraet, MessgeraetProtokoll


class WartungServiceEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.admin_user = self.create_user_with_roles("ADMIN")
        self.inventar_user = self.create_user_with_roles("INVENTAR")
        self.current_year = date.today().year

    def test_wartung_service_endpoint_resolves(self):
        self.assert_options_works("wartung_service/")

    def test_wartung_service_requires_auth_and_role(self):
        self.assert_requires_authentication("wartung_service/")
        self.assert_forbidden_without_role("wartung_service/")

    def test_wartung_service_collects_due_entries_for_current_year(self):
        Inventar.objects.create(
            bezeichnung="Hydraulikheber",
            wartung_naechstes_am=date(self.current_year, 7, 1),
        )

        fahrzeug = Fahrzeug.objects.create(
            name="HLF 1",
            service_naechstes_am=date(self.current_year, 9, 1),
        )
        raum = FahrzeugRaum.objects.create(fahrzeug=fahrzeug, name="Geräteraum 1", reihenfolge=1)
        RaumItem.objects.create(
            raum=raum,
            name="Hohlstrahlrohr",
            wartung_naechstes_am=date(self.current_year, 11, 15),
        )

        as_geraet = AtemschutzGeraet.objects.create(
            inv_nr="AS-101",
            typ="PA",
            naechste_gue=str(self.current_year),
        )
        AtemschutzGeraetProtokoll.objects.create(
            geraet_id=as_geraet,
            datum=date(self.current_year, 1, 10),
            name_pruefer="Planer",
            preufung_monatlich=True,
        )
        AtemschutzGeraetProtokoll.objects.create(
            geraet_id=as_geraet,
            datum=date(self.current_year - 1, 3, 15),
            name_pruefer="Planer",
            pruefung_jaehrlich=True,
        )

        mg = Messgeraet.objects.create(inv_nr="MG-1", bezeichnung="Dräger X")
        MessgeraetProtokoll.objects.create(
            geraet_id=mg,
            datum=date(self.current_year - 1, 5, 1),
            name_pruefer="Planer",
            kalibrierung=True,
        )
        MessgeraetProtokoll.objects.create(
            geraet_id=mg,
            datum=date(self.current_year, 2, 1),
            name_pruefer="Planer",
            kontrolle_woechentlich=True,
        )

        self.client.force_authenticate(user=self.admin_user)
        response = self.request_method("get", "wartung_service/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("main", response.data)
        self.assertIn("summary", response.data)

        entries = response.data.get("main", [])
        self.assertGreaterEqual(len(entries), 6)

        self.assertTrue(any(e.get("modul") == "Inventar" for e in entries))
        self.assertTrue(any(e.get("modul") == "Fahrzeuge" for e in entries))
        self.assertTrue(any(e.get("intervall") == "Generalüberholung" for e in entries))
        self.assertTrue(any(e.get("modul") == "Messgeräte" and e.get("intervall") == "Kalibrierung" for e in entries))

    def test_wartung_service_role_scope_filters_modules(self):
        Inventar.objects.create(
            bezeichnung="Hydraulikheber",
            wartung_naechstes_am=date(self.current_year, 7, 1),
        )
        Fahrzeug.objects.create(
            name="HLF 1",
            service_naechstes_am=date(self.current_year, 9, 1),
        )

        self.client.force_authenticate(user=self.inventar_user)
        response = self.request_method("get", "wartung_service/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        entries = response.data.get("main", [])
        self.assertTrue(entries)
        self.assertTrue(all(e.get("modul") == "Inventar" for e in entries))
