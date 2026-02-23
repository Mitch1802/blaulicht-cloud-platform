from uuid import uuid4

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.modul_konfiguration.models import ModulKonfiguration
from core_apps.users.models import Role


class ModulKonfigurationEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.admin = self.create_user_with_roles("ADMIN")
        self.member = self.create_user_with_roles("MITGLIED")
        ModulKonfiguration.objects.create(modul="fmd", konfiguration={"enabled": True})
        Role.objects.get_or_create(key="EXTRA", defaults={"verbose_name": "Extra"})

    def test_all_modul_konfiguration_endpoints_resolve(self):
        endpoints = [
            "modul_konfiguration/",
            f"modul_konfiguration/{uuid4()}/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_modul_konfiguration_requires_auth(self):
        self.assert_requires_authentication("modul_konfiguration/")

    def test_modul_konfiguration_write_forbidden_without_role(self):
        self.assert_forbidden_without_role("modul_konfiguration/", method="post", data={})

    def test_modul_konfiguration_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("modul_konfiguration/")

    def test_modul_konfiguration_list_payload_and_model_str(self):
        self.client.force_authenticate(user=self.admin)
        response = self.request_method("get", "modul_konfiguration/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("main", response.data)
        self.assertIn("rollen", response.data)
        self.assertIn("pdf", response.data)
        self.assertIn("user", response.data)

        item = ModulKonfiguration.objects.first()
        self.assertEqual(str(item), item.modul)
