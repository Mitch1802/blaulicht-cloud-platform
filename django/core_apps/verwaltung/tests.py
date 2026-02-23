from types import SimpleNamespace
from unittest.mock import patch

import requests
from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.konfiguration.models import Konfiguration
from core_apps.modul_konfiguration.models import ModulKonfiguration


class VerwaltungEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.admin = self.create_user_with_roles("ADMIN")
        ModulKonfiguration.objects.create(modul="news", konfiguration={"enabled": True})
        Konfiguration.objects.create(fw_nummer="123", fw_name="FF Test")

    def test_all_verwaltung_endpoints_resolve(self):
        endpoints = [
            "verwaltung/",
            "verwaltung/kontakte/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_verwaltung_requires_auth_and_role(self):
        self.assert_requires_authentication("verwaltung/")
        self.assert_forbidden_without_role("verwaltung/")
        self.assert_requires_authentication("verwaltung/kontakte/")
        self.assert_forbidden_without_role("verwaltung/kontakte/")

    def test_verwaltung_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("verwaltung/")
        self.assert_method_matrix_no_server_error("verwaltung/kontakte/")

    def test_verwaltung_get_returns_config_payload(self):
        self.client.force_authenticate(user=self.admin)

        response = self.request_method("get", "verwaltung/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data.get("modul_konfig"), list)
        self.assertIsInstance(response.data.get("konfig"), list)
        self.assertIsNone(response.data.get("sevdesk"))

    def test_verwaltung_include_sevdesk_success(self):
        self.client.force_authenticate(user=self.admin)

        with patch("core_apps.verwaltung.views.requests.get") as mocked_get:
            mocked_get.return_value = SimpleNamespace(status_code=200, json=lambda: {"objects": [{"id": 1}]})
            response = self.request_method("get", "verwaltung/?includeSevdesk=1&sevdeskModul=basics")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["sevdesk"]["objects"], [{"id": 1}])

    def test_verwaltung_include_sevdesk_handles_non_200(self):
        self.client.force_authenticate(user=self.admin)

        with patch("core_apps.verwaltung.views.requests.get") as mocked_get:
            mocked_get.return_value = SimpleNamespace(status_code=500, json=lambda: {})
            response = self.request_method("get", "verwaltung/?includeSevdesk=1&sevdeskModul=Contact")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("failed", response.data["sevdesk"]["error"])

    def test_verwaltung_include_sevdesk_handles_request_exception(self):
        self.client.force_authenticate(user=self.admin)

        with patch("core_apps.verwaltung.views.requests.get", side_effect=requests.RequestException("boom")):
            response = self.request_method("get", "verwaltung/?includeSevdesk=1&sevdeskModul=Contact")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("exception", str(response.data["sevdesk"]["error"]).lower())

    def test_verwaltung_include_sevdesk_missing_token(self):
        self.client.force_authenticate(user=self.admin)

        with patch.dict("os.environ", {"SEVDESK_API_TOKEN": ""}):
            response = self.request_method("get", "verwaltung/?includeSevdesk=1&sevdeskModul=Contact")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("missing", str(response.data["sevdesk"]["error"]).lower())

    def test_verwaltung_kontakte_success(self):
        self.client.force_authenticate(user=self.admin)

        with patch("core_apps.verwaltung.views.requests.get") as mocked_get:
            mocked_get.side_effect = [
                SimpleNamespace(status_code=200, json=lambda: {"objects": [{"id": "c1"}]}),
                SimpleNamespace(status_code=200, json=lambda: {"objects": [{"id": "a1"}]}),
            ]
            response = self.request_method("get", "verwaltung/kontakte/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["Contact"], [{"id": "c1"}])
        self.assertEqual(response.data["ContactAddress"], [{"id": "a1"}])

    def test_verwaltung_kontakte_handles_request_exception(self):
        self.client.force_authenticate(user=self.admin)

        with patch("core_apps.verwaltung.views.requests.get", side_effect=requests.RequestException("boom")):
            response = self.request_method("get", "verwaltung/kontakte/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("exception", str(response.data.get("error2", "")).lower())

    def test_verwaltung_kontakte_handles_second_non_200(self):
        self.client.force_authenticate(user=self.admin)

        with patch("core_apps.verwaltung.views.requests.get") as mocked_get:
            mocked_get.side_effect = [
                SimpleNamespace(status_code=200, json=lambda: {"objects": [{"id": "c1"}]}),
                SimpleNamespace(status_code=500, json=lambda: {}),
            ]
            response = self.request_method("get", "verwaltung/kontakte/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("failed", str(response.data.get("error2", "")).lower())

    def test_verwaltung_kontakte_handles_first_non_200(self):
        self.client.force_authenticate(user=self.admin)

        with patch("core_apps.verwaltung.views.requests.get") as mocked_get:
            mocked_get.side_effect = [
                SimpleNamespace(status_code=500, json=lambda: {}),
                SimpleNamespace(status_code=200, json=lambda: {"objects": [{"id": "a1"}]}),
            ]
            response = self.request_method("get", "verwaltung/kontakte/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("failed", str(response.data.get("error", "")).lower())

    def test_verwaltung_kontakte_missing_token(self):
        self.client.force_authenticate(user=self.admin)

        with patch.dict("os.environ", {"SEVDESK_API_TOKEN": ""}):
            response = self.request_method("get", "verwaltung/kontakte/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("missing", str(response.data.get("error", "")).lower())
