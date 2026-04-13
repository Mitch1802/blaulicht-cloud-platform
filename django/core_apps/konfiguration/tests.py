from uuid import uuid4
from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.konfiguration.models import Konfiguration
from core_apps.konfiguration.views import KonfigurationViewSet
from core_apps.users.models import Role


class KonfigurationEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.admin = self.create_user_with_roles("ADMIN")
        self.member = self.create_user_with_roles("MITGLIED")
        Konfiguration.objects.create(fw_nummer="200", fw_name="FF Test")
        Role.objects.get_or_create(key="FMD", defaults={"verbose_name": "FMD"})

    def test_all_konfiguration_endpoints_resolve(self):
        endpoints = [
            "konfiguration/",
            "konfiguration/test-emails/",
            f"konfiguration/{uuid4()}/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_konfiguration_requires_auth(self):
        self.assert_requires_authentication("konfiguration/")

    def test_konfiguration_write_forbidden_without_role(self):
        self.assert_forbidden_without_role("konfiguration/", method="post", data={})

    def test_konfiguration_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("konfiguration/")

    def test_konfiguration_list_admin_returns_backups_and_roles(self):
        self.client.force_authenticate(user=self.admin)
        with patch("core_apps.konfiguration.views.os.listdir", return_value=["backup-a.sql"]):
            response = self.request_method("get", "konfiguration/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("main", response.data)
        self.assertIn("backups", response.data)
        self.assertIn("rollen", response.data)

    def test_konfiguration_list_member_returns_plain_list(self):
        self.client.force_authenticate(user=self.member)
        response = self.request_method("get", "konfiguration/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_konfiguration_private_has_role_helper(self):
        view = KonfigurationViewSet()
        self.assertFalse(view._has_role(self.member, "ADMIN"))

        role = Role.objects.create(key="TARGET", verbose_name="Target")
        self.member.roles.add(role)
        self.assertTrue(view._has_role(self.member, "TARGET"))

    def test_konfiguration_model_str(self):
        obj = Konfiguration(fw_nummer="201", fw_name="FF Demo")
        self.assertEqual(str(obj), "FF Demo")

    @patch("core_apps.konfiguration.views.send_service_reminder_email", return_value=True)
    @patch("core_apps.konfiguration.views.send_account_invite_email", return_value=True)
    def test_konfiguration_test_emails_admin_success(self, invite_mock, reminder_mock):
        self.client.force_authenticate(user=self.admin)

        response = self.request_method(
            "post",
            "konfiguration/test-emails/",
            data={"email": "test@example.com", "email_type": "account_invite"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "test@example.com")
        self.assertEqual(response.data["result"]["key"], "account_invite")
        self.assertTrue(response.data["result"]["sent"])
        invite_mock.assert_called_once()
        reminder_mock.assert_not_called()

    @patch("core_apps.konfiguration.views.send_service_reminder_email", return_value=True)
    @patch("core_apps.konfiguration.views.send_account_invite_email", return_value=True)
    def test_konfiguration_test_emails_service_type_calls_only_service_mail(self, invite_mock, reminder_mock):
        self.client.force_authenticate(user=self.admin)

        response = self.request_method(
            "post",
            "konfiguration/test-emails/",
            data={"email": "test@example.com", "email_type": "service_reminder"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["key"], "service_reminder")
        self.assertTrue(response.data["result"]["sent"])
        invite_mock.assert_not_called()
        reminder_mock.assert_called_once()

    def test_konfiguration_test_emails_member_forbidden(self):
        self.client.force_authenticate(user=self.member)

        response = self.request_method(
            "post",
            "konfiguration/test-emails/",
            data={"email": "test@example.com", "email_type": "account_invite"},
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_konfiguration_test_emails_rejects_invalid_email(self):
        self.client.force_authenticate(user=self.admin)

        response = self.request_method(
            "post",
            "konfiguration/test-emails/",
            data={"email": "ungueltig", "email_type": "account_invite"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_konfiguration_test_emails_rejects_invalid_type(self):
        self.client.force_authenticate(user=self.admin)

        response = self.request_method(
            "post",
            "konfiguration/test-emails/",
            data={"email": "test@example.com", "email_type": "invalid_type"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
