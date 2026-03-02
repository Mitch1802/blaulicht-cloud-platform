from uuid import uuid4
from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.atemschutz_masken.models import AtemschutzMaske, AtemschutzMaskeProtokoll


class AtemschutzMaskenEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.atemschutz_user = self.create_user_with_roles("ATEMSCHUTZ")
        self.protokoll_user = self.create_user_with_roles("PROTOKOLL")
        self.maske = AtemschutzMaske.objects.create(inv_nr="M-1")
        self.protokoll = AtemschutzMaskeProtokoll.objects.create(
            maske_id=self.maske,
            datum=date(2024, 1, 1),
            name_pruefer="P",
        )

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
        self.assertEqual(str(self.maske), "M-1")
        self.assertEqual(str(self.protokoll), "2024-01-01")

    def test_masken_protokoll_create_requires_admin_or_protokoll_role(self):
        payload = {
            "maske_id": self.maske.pkid,
            "datum": "2024-02-01",
            "name_pruefer": "Tester",
        }

        self.client.force_authenticate(user=self.atemschutz_user)
        forbidden = self.request_method("post", "atemschutz/masken/protokoll/", data=payload)
        self.assertEqual(forbidden.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.protokoll_user)
        allowed = self.request_method("post", "atemschutz/masken/protokoll/", data=payload)
        self.assertEqual(allowed.status_code, status.HTTP_201_CREATED)

    def test_masken_protokoll_notiz_patch_allowed_for_non_editor_roles(self):
        self.client.force_authenticate(user=self.atemschutz_user)
        response = self.request_method(
            "patch",
            f"atemschutz/masken/protokoll/{self.protokoll.id}/",
            data={"notiz": "Notiz erlaubt"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.protokoll.refresh_from_db()
        self.assertEqual(self.protokoll.notiz, "Notiz erlaubt")

    def test_masken_protokoll_non_editor_cannot_patch_other_fields(self):
        self.client.force_authenticate(user=self.atemschutz_user)
        response = self.request_method(
            "patch",
            f"atemschutz/masken/protokoll/{self.protokoll.id}/",
            data={"name_pruefer": "Unzulässig"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
