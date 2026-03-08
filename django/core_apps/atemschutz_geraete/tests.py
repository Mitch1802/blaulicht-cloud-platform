from uuid import uuid4
from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.atemschutz_geraete.models import AtemschutzGeraet, AtemschutzGeraetProtokoll
from core_apps.fmd.models import FMD
from core_apps.mitglieder.models import Mitglied


class AtemschutzGeraeteEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.user = self.create_user_with_roles("ATEMSCHUTZ")
        self.protokoll_user = self.create_user_with_roles("PROTOKOLL")
        self.mitglied = Mitglied.objects.create(
            stbnr=9001,
            vorname="A",
            nachname="B",
            geburtsdatum=date(1990, 1, 1),
        )
        FMD.objects.create(mitglied_id=self.mitglied)
        self.geraet = AtemschutzGeraet.objects.create(inv_nr="AG-1")
        self.protokoll = AtemschutzGeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 1, 1),
            name_pruefer="P",
        )
    def test_all_atemschutz_geraete_endpoints_resolve(self):
        endpoints = [
            "atemschutz/geraete/",
            f"atemschutz/geraete/{uuid4()}/",
            "atemschutz/geraete/protokoll/",
            f"atemschutz/geraete/protokoll/{uuid4()}/",
            "atemschutz/geraete/dienstbuch/",
            f"atemschutz/geraete/dienstbuch/{uuid4()}/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_atemschutz_geraete_requires_auth_and_role(self):
        self.assert_requires_authentication("atemschutz/geraete/")
        self.assert_forbidden_without_role("atemschutz/geraete/")

    def test_atemschutz_geraete_subroutes_require_auth_and_role(self):
        self.assert_requires_authentication("atemschutz/geraete/protokoll/")
        self.assert_forbidden_without_role("atemschutz/geraete/protokoll/")
        self.assert_requires_authentication("atemschutz/geraete/dienstbuch/")
        self.assert_forbidden_without_role("atemschutz/geraete/dienstbuch/")

    def test_atemschutz_geraete_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("atemschutz/geraete/")
        self.assert_method_matrix_no_server_error("atemschutz/geraete/protokoll/")
        self.assert_method_matrix_no_server_error("atemschutz/geraete/dienstbuch/")

    def test_atemschutz_list_branches_and_model_str(self):
        self.client.force_authenticate(user=self.user)

        list_resp = self.request_method("get", "atemschutz/geraete/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        self.assertIn("main", list_resp.data)
        self.assertIn("fmd", list_resp.data)
        self.assertIn("mitglieder", list_resp.data)

        dienstbuch_resp = self.request_method("get", "atemschutz/geraete/dienstbuch/")
        self.assertEqual(dienstbuch_resp.status_code, status.HTTP_200_OK)
        self.assertIn("protokoll", dienstbuch_resp.data)
        self.assertIn("mitglieder", dienstbuch_resp.data)

        self.assertEqual(str(self.geraet), "AG-1")
        protokoll = AtemschutzGeraetProtokoll.objects.first()
        self.assertEqual(str(protokoll), "2024-01-01")

    def test_atemschutz_list_excludes_reserve_members(self):
        Mitglied.objects.create(
            stbnr=9002,
            vorname="Reserve",
            nachname="Excluded",
            svnr="2222",
            geburtsdatum=date(1991, 1, 1),
            dienststatus="RESERVE",
        )

        self.client.force_authenticate(user=self.user)

        list_resp = self.request_method("get", "atemschutz/geraete/")
        self.assertEqual(list_resp.status_code, status.HTTP_200_OK)
        stbnr_main = [item.get("stbnr") for item in list_resp.data.get("mitglieder", [])]
        self.assertIn(9001, stbnr_main)
        self.assertNotIn(9002, stbnr_main)

        dienstbuch_resp = self.request_method("get", "atemschutz/geraete/dienstbuch/")
        self.assertEqual(dienstbuch_resp.status_code, status.HTTP_200_OK)
        stbnr_dienstbuch = [item.get("stbnr") for item in dienstbuch_resp.data.get("mitglieder", [])]
        self.assertIn(9001, stbnr_dienstbuch)
        self.assertNotIn(9002, stbnr_dienstbuch)

    def test_atemschutz_list_contains_last_and_next_pruefung(self):
        AtemschutzGeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 3, 15),
            name_pruefer="Planer",
            pruefung_jaehrlich=True,
        )
        AtemschutzGeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 4, 20),
            name_pruefer="Planer",
            preufung_monatlich=True,
        )
        AtemschutzGeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 5, 10),
            name_pruefer="Planer",
            pruefung_10jahre=True,
        )

        self.client.force_authenticate(user=self.user)
        response = self.request_method("get", "atemschutz/geraete/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = next((entry for entry in response.data.get("main", []) if entry.get("pkid") == self.geraet.pkid), None)
        self.assertIsNotNone(item)
        self.assertEqual(item.get("letzte_pruefung"), "10.05.2024")
        self.assertEqual(item.get("naechste_pruefung"), "10.05.2034")
        self.assertEqual(item.get("letzte_pruefung_monatlich"), "20.04.2024")
        self.assertEqual(item.get("naechste_pruefung_monatlich"), "20.05.2024")
        self.assertEqual(item.get("letzte_pruefung_jaehrlich"), "15.03.2024")
        self.assertEqual(item.get("naechste_pruefung_jaehrlich"), "15.03.2025")
        self.assertEqual(item.get("letzte_pruefung_10jahre"), "10.05.2024")
        self.assertEqual(item.get("naechste_pruefung_10jahre"), "10.05.2034")

    def test_atemschutz_list_summary_ignores_non_pruefung_entries(self):
        AtemschutzGeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 1, 10),
            name_pruefer="Planer",
            pruefung_jaehrlich=True,
        )
        AtemschutzGeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 2, 10),
            name_pruefer="Planer",
            taetigkeit="Wartung",
        )

        self.client.force_authenticate(user=self.user)
        response = self.request_method("get", "atemschutz/geraete/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = next((entry for entry in response.data.get("main", []) if entry.get("pkid") == self.geraet.pkid), None)
        self.assertIsNotNone(item)
        self.assertEqual(item.get("letzte_pruefung"), "10.01.2024")
        self.assertEqual(item.get("naechste_pruefung"), "10.01.2025")

    def test_protokoll_create_requires_admin_or_protokoll_role(self):
        payload = {
            "geraet_id": self.geraet.pkid,
            "datum": "2024-02-01",
            "name_pruefer": "Tester",
        }

        self.client.force_authenticate(user=self.user)
        forbidden = self.request_method("post", "atemschutz/geraete/protokoll/", data=payload)
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.protokoll_user)
        allowed = self.request_method("post", "atemschutz/geraete/protokoll/", data=payload)
        self.assertEqual(allowed.status_code, status.HTTP_201_CREATED)

    def test_protokoll_create_sets_naechste_gue_for_10_jahre_pruefung(self):
        payload = {
            "geraet_id": self.geraet.pkid,
            "datum": "2024-02-01",
            "name_pruefer": "Tester",
            "pruefung_10jahre": True,
        }

        self.client.force_authenticate(user=self.protokoll_user)
        response = self.request_method("post", "atemschutz/geraete/protokoll/", data=payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.geraet.refresh_from_db()
        self.assertEqual(self.geraet.naechste_gue, "2034")

    def test_protokoll_patch_sets_naechste_gue_for_10_jahre_pruefung(self):
        self.client.force_authenticate(user=self.protokoll_user)
        response = self.request_method(
            "patch",
            f"atemschutz/geraete/protokoll/{self.protokoll.id}/",
            data={"pruefung_10jahre": True, "datum": "2026-03-08"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.geraet.refresh_from_db()
        self.assertEqual(self.geraet.naechste_gue, "2036")

    def test_protokoll_notiz_patch_allowed_for_non_editor_roles(self):
        self.client.force_authenticate(user=self.user)
        response = self.request_method(
            "patch",
            f"atemschutz/geraete/protokoll/{self.protokoll.id}/",
            data={"notiz": "Hinweis vom Trupp"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.protokoll.refresh_from_db()
        self.assertEqual(self.protokoll.notiz, "Hinweis vom Trupp")

    def test_protokoll_non_editor_cannot_patch_other_fields(self):
        self.client.force_authenticate(user=self.user)
        response = self.request_method(
            "patch",
            f"atemschutz/geraete/protokoll/{self.protokoll.id}/",
            data={"name_pruefer": "Unzulässig"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
