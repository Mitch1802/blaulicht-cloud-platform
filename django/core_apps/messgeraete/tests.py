from uuid import uuid4
from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.messgeraete.models import Messgeraet, MessgeraetProtokoll


class MessgeraeteEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.atemschutz_user = self.create_user_with_roles("ATEMSCHUTZ")
        self.protokoll_user = self.create_user_with_roles("PROTOKOLL")
        self.geraet = Messgeraet.objects.create(inv_nr="MG-1", bezeichnung="X")
        self.protokoll = MessgeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 1, 1),
            name_pruefer="P",
        )

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
        self.assertEqual(str(self.geraet), "X")
        self.assertEqual(str(self.protokoll), "2024-01-01")

    def test_messgeraete_protokoll_writes_require_admin_or_protokoll(self):
        payload = {
            "geraet_id": self.geraet.pkid,
            "datum": "2024-02-01",
            "name_pruefer": "Tester",
        }

        self.client.force_authenticate(user=self.atemschutz_user)
        forbidden_create = self.request_method("post", "atemschutz/messgeraete/protokoll/", data=payload)
        self.assertEqual(forbidden_create.status_code, status.HTTP_403_FORBIDDEN)

        forbidden_patch = self.request_method(
            "patch",
            f"atemschutz/messgeraete/protokoll/{self.protokoll.id}/",
            data={"name_pruefer": "Unzulässig"},
        )
        self.assertEqual(forbidden_patch.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.protokoll_user)
        allowed_create = self.request_method("post", "atemschutz/messgeraete/protokoll/", data=payload)
        self.assertEqual(allowed_create.status_code, status.HTTP_201_CREATED)
