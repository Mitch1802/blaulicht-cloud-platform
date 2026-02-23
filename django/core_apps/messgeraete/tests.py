from uuid import uuid4
from datetime import date

from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.messgeraete.models import Messgeraet, MessgeraetProtokoll


class MessgeraeteEndpointTests(EndpointSmokeMixin, APITestCase):
    def test_all_messgeraete_endpoints_resolve(self):
        endpoints = [
            "atemschutz/messgeraete/",
            f"atemschutz/messgeraete/{uuid4()}/",
            "atemschutz/messgeraete/protokoll/",
            f"atemschutz/messgeraete/protokoll/{uuid4()}/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_messgeraete_requires_auth_and_role(self):
        self.assert_requires_authentication("atemschutz/messgeraete/")
        self.assert_forbidden_without_role("atemschutz/messgeraete/")

    def test_messgeraete_protokoll_requires_auth_and_role(self):
        self.assert_requires_authentication("atemschutz/messgeraete/protokoll/")
        self.assert_forbidden_without_role("atemschutz/messgeraete/protokoll/")

    def test_messgeraete_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("atemschutz/messgeraete/")
        self.assert_method_matrix_no_server_error("atemschutz/messgeraete/protokoll/")

    def test_messgeraete_model_str(self):
        geraet = Messgeraet.objects.create(inv_nr="MG-1", bezeichnung="X")
        protokoll = MessgeraetProtokoll.objects.create(
            geraet_id=geraet,
            datum=date(2024, 1, 1),
            name_pruefer="P",
        )
        self.assertEqual(str(geraet), "X")
        self.assertEqual(str(protokoll), "2024-01-01")
