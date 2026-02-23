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
        self.mitglied = Mitglied.objects.create(
            stbnr=9001,
            vorname="A",
            nachname="B",
            geburtsdatum=date(1990, 1, 1),
        )
        FMD.objects.create(mitglied_id=self.mitglied)
        self.geraet = AtemschutzGeraet.objects.create(inv_nr="AG-1")
        AtemschutzGeraetProtokoll.objects.create(
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
