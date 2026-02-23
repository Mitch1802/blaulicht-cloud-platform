from uuid import uuid4
from datetime import date

from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.atemschutz_masken.models import AtemschutzMaske, AtemschutzMaskeProtokoll


class AtemschutzMaskenEndpointTests(EndpointSmokeMixin, APITestCase):
    def test_all_atemschutz_masken_endpoints_resolve(self):
        endpoints = [
            "atemschutz/masken/",
            f"atemschutz/masken/{uuid4()}/",
            "atemschutz/masken/protokoll/",
            f"atemschutz/masken/protokoll/{uuid4()}/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_atemschutz_masken_requires_auth_and_role(self):
        self.assert_requires_authentication("atemschutz/masken/")
        self.assert_forbidden_without_role("atemschutz/masken/")

    def test_atemschutz_masken_protokoll_requires_auth_and_role(self):
        self.assert_requires_authentication("atemschutz/masken/protokoll/")
        self.assert_forbidden_without_role("atemschutz/masken/protokoll/")

    def test_atemschutz_masken_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("atemschutz/masken/")
        self.assert_method_matrix_no_server_error("atemschutz/masken/protokoll/")

    def test_atemschutz_masken_model_str(self):
        maske = AtemschutzMaske.objects.create(inv_nr="M-1")
        protokoll = AtemschutzMaskeProtokoll.objects.create(
            maske_id=maske,
            datum=date(2024, 1, 1),
            name_pruefer="P",
        )
        self.assertEqual(str(maske), "M-1")
        self.assertEqual(str(protokoll), "2024-01-01")
