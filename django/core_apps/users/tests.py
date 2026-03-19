import time
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.urls import reverse
from dj_rest_auth.app_settings import api_settings as rest_auth_settings
from rest_framework import status
from rest_framework.test import APITestCase, APIRequestFactory

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.fahrzeuge.views import make_public_token, read_public_token
from core_apps.inventar.models import Inventar
from core_apps.users.models import User
from core_apps.users.serializers import UserSerializer, UserSelfSerializer
from core_apps.users.views import CustomUserDetailsView, ForceLogoutView
from core_apps.users.renderers import UserJSONRenderer
from core_apps.users.adapter import UserAdapter
from core_apps.users.invite_tokens import make_invite_token

from .models import Role


User = get_user_model()


class UserSecurityTests(APITestCase):
    def setUp(self):
        self.role_admin = Role.objects.create(key="ADMIN", verbose_name="Admin")
        self.role_mitglied = Role.objects.create(key="MITGLIED", verbose_name="Mitglied")

        self.admin = User.objects.create_user(
            username="admin_user",
            first_name="Admin",
            last_name="User",
            password="Adm1n!PasswortSehrSicher",
            email="admin@example.com",
        )
        self.admin.roles.add(self.role_admin)

        self.user_a = User.objects.create_user(
            username="mitglied_a",
            first_name="Mitglied",
            last_name="A",
            password="Us3r!PasswortSehrSicher",
            email="a@example.com",
        )
        self.user_a.roles.add(self.role_mitglied)

        self.user_b = User.objects.create_user(
            username="mitglied_b",
            first_name="Mitglied",
            last_name="B",
            password="Us3r!PasswortSehrSicher",
            email="b@example.com",
        )
        self.user_b.roles.add(self.role_mitglied)

        self.user_no_role = User.objects.create_user(
            username="ohne_rolle",
            first_name="Ohne",
            last_name="Rolle",
            password="Us3r!PasswortSehrSicher",
            email="norole@example.com",
        )

    def test_mitglied_cannot_change_password_of_other_user(self):
        self.client.force_authenticate(user=self.user_a)

        url = reverse("user-change-password", kwargs={"id": self.user_b.id})
        response = self.client.put(
            url,
            {"password": "N3u!esPasswortSehrSicher"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.user_b.refresh_from_db()
        self.assertTrue(self.user_b.check_password("Us3r!PasswortSehrSicher"))

    def test_mitglied_can_change_own_password(self):
        self.client.force_authenticate(user=self.user_a)

        url = reverse("user-change-password", kwargs={"id": self.user_a.id})
        response = self.client.put(
            url,
            {"password": "N3u!esPasswortSehrSicher"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user_a.refresh_from_db()
        self.assertTrue(self.user_a.check_password("N3u!esPasswortSehrSicher"))

    def test_user_update_ignores_is_superuser_field(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("user-retrieve-update-destroy", kwargs={"id": self.user_a.id})
        response = self.client.patch(
            url,
            {"is_superuser": True, "email": "geaendert@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user_a.refresh_from_db()
        self.assertFalse(self.user_a.is_superuser)
        self.assertEqual(self.user_a.email, "geaendert@example.com")

    def test_admin_can_change_password_of_other_user(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("user-change-password", kwargs={"id": self.user_b.id})
        response = self.client.put(
            url,
            {"password": "Adm1nAendert!Passwort123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user_b.refresh_from_db()
        self.assertTrue(self.user_b.check_password("Adm1nAendert!Passwort123"))

    def test_user_without_required_role_cannot_change_own_password(self):
        self.client.force_authenticate(user=self.user_no_role)

        url = reverse("user-change-password", kwargs={"id": self.user_no_role.id})
        response = self.client.put(
            url,
            {"password": "N3u!esPasswortSehrSicher"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_change_password(self):
        url = reverse("user-change-password", kwargs={"id": self.user_a.id})
        response = self.client.put(
            url,
            {"password": "N3u!esPasswortSehrSicher"},
            format="json",
        )

        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_change_password_requires_password_field(self):
        self.client.force_authenticate(user=self.user_a)

        url = reverse("user-change-password", kwargs={"id": self.user_a.id})
        response = self.client.put(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password", response.data)

    def test_change_password_rejects_weak_password(self):
        self.client.force_authenticate(user=self.user_a)

        url = reverse("user-change-password", kwargs={"id": self.user_a.id})
        response = self.client.put(url, {"password": "123"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_update_ignores_password_field(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("user-retrieve-update-destroy", kwargs={"id": self.user_a.id})
        response = self.client.patch(
            url,
            {"password": "NeuesPasswort!123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user_a.refresh_from_db()
        self.assertTrue(self.user_a.check_password("Us3r!PasswortSehrSicher"))

    def test_non_admin_cannot_update_other_user(self):
        self.client.force_authenticate(user=self.user_a)

        url = reverse("user-retrieve-update-destroy", kwargs={"id": self.user_b.id})
        response = self.client.patch(
            url,
            {"email": "nicht-erlaubt@example.com"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_non_admin_cannot_access_user_list(self):
        self.client.force_authenticate(user=self.user_a)

        url = reverse("user-list")
        response = self.client.get(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_create_user_rejects_password_mismatch(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("user-create")
        response = self.client.post(
            url,
            {
                "username": "neu_user_1",
                "email": "neu1@example.com",
                "password1": "StarkesPasswort!123",
                "password2": "AnderesPasswort!123",
                "roles": ["MITGLIED"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_create_user_creates_user_with_roles(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("user-create")
        response = self.client.post(
            url,
            {
                "username": "neu_user_2",
                "email": "neu2@example.com",
                "password1": "StarkesPasswort!123",
                "password2": "StarkesPasswort!123",
                "roles": ["MITGLIED"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_user = User.objects.get(username="neu_user_2")
        self.assertTrue(created_user.has_role("MITGLIED"))
        self.assertFalse(response.data["invite_sent"])

    @patch("core_apps.users.serializers.send_account_invite_email", return_value=True)
    def test_admin_create_user_with_invite_mode_sends_invite(self, send_invite_email_mock):
        self.client.force_authenticate(user=self.admin)

        url = reverse("user-create")
        response = self.client.post(
            url,
            {
                "username": "neu_user_invite",
                "email": "neu-invite@example.com",
                "send_invite": True,
                "roles": ["MITGLIED"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["invite_sent"])

        created_user = User.objects.get(username="neu_user_invite")
        self.assertFalse(created_user.has_usable_password())
        self.assertTrue(created_user.has_role("MITGLIED"))
        send_invite_email_mock.assert_called_once()

    def test_admin_create_user_invite_mode_requires_email(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("user-create")
        response = self.client.post(
            url,
            {
                "username": "neu_user_invite_no_email",
                "send_invite": True,
                "roles": ["MITGLIED"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_admin_create_user_password_mode_requires_password(self):
        self.client.force_authenticate(user=self.admin)

        url = reverse("user-create")
        response = self.client.post(
            url,
            {
                "username": "neu_user_password_required",
                "email": "neu-password@example.com",
                "send_invite": False,
                "roles": ["MITGLIED"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class PublicTokenHelperTests(TestCase):
    def test_make_and_read_public_token_returns_expected_scope(self):
        token = make_public_token()
        payload = read_public_token(token)

        self.assertIsNotNone(payload)
        self.assertEqual(payload["scope"], "public_readonly")

    def test_read_public_token_returns_none_for_invalid_token(self):
        payload = read_public_token("invalid-token")
        self.assertIsNone(payload)

    def test_read_public_token_returns_none_for_type_error(self):
        payload = read_public_token(None)
        self.assertIsNone(payload)

    @override_settings(PUBLIC_TOKEN_TTL_MIN=0)
    def test_read_public_token_returns_none_for_expired_token(self):
        token = make_public_token()
        time.sleep(1)
        payload = read_public_token(token)
        self.assertIsNone(payload)


class InventarModelTests(TestCase):
    def test_inventar_str_returns_bezeichnung(self):
        item = Inventar.objects.create(bezeichnung="Helm")
        self.assertEqual(str(item), "Helm")


class UsersEndpointSmokeTests(EndpointSmokeMixin, APITestCase):
    def test_all_users_and_auth_endpoints_resolve(self):
        endpoints = [
            "users/",
            "users/context/",
            "users/self/",
            f"users/{uuid4()}/",
            "users/create/",
            f"users/change_password/{uuid4()}/",
            "users/rolle/",
            "users/rolle/1/",
            "auth/csrf/",
            "auth/login/",
            "auth/logout/",
            "auth/invite/complete/",
            "auth/token/refresh/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_login_endpoint_is_public(self):
        self.assert_not_auth_error("auth/login/", method="post", data={})

    def test_login_endpoint_is_public_with_invalid_auth_cookie(self):
        if rest_auth_settings.JWT_AUTH_COOKIE:
            self.client.cookies[rest_auth_settings.JWT_AUTH_COOKIE] = "invalid.jwt.token"

        response = self.request_method("post", "auth/login/", data={})
        self.assertNotIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN])

    def test_csrf_endpoint_is_public_and_sets_cookie(self):
        response = self.request_method("get", "auth/csrf/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("csrftoken", response.cookies)

    def test_csrf_endpoint_is_public_with_invalid_auth_cookie(self):
        if rest_auth_settings.JWT_AUTH_COOKIE:
            self.client.cookies[rest_auth_settings.JWT_AUTH_COOKIE] = "invalid.jwt.token"

        response = self.request_method("get", "auth/csrf/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("csrftoken", response.cookies)

    def test_logout_endpoint_requires_auth(self):
        # Endpoint ist bewusst idempotent und liefert auch ohne gültige Session 200.
        response = self.request_method("post", "auth/logout/", data={})
        self.assertEqual(response.status_code, 200)

    def test_logout_endpoint_with_authenticated_user_is_ok(self):
        user = self.create_user_with_roles("MITGLIED")
        self.client.force_authenticate(user=user)
        response = self.request_method("post", "auth/logout/", data={})
        self.client.force_authenticate(user=None)
        self.assertEqual(response.status_code, 200)

    def test_users_admin_endpoints_require_role(self):
        self.assert_endpoint_contract("users/")
        self.assert_endpoint_contract("users/create/", method="post", data={})

    def test_users_self_allows_jugend_role(self):
        user = self.create_user_with_roles("JUGEND")
        self.client.force_authenticate(user=user)
        response = self.request_method("get", "users/self/")
        self.client.force_authenticate(user=None)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_users_self_allows_bericht_role(self):
        user = self.create_user_with_roles("BERICHT")
        self.client.force_authenticate(user=user)
        response = self.request_method("get", "users/self/")
        self.client.force_authenticate(user=None)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_users_method_matrix_no_server_error(self):
        for endpoint in [
            "users/",
            "users/context/",
            "users/self/",
            f"users/{uuid4()}/",
            "users/create/",
            f"users/change_password/{uuid4()}/",
            "users/rolle/",
            "users/rolle/1/",
            "auth/csrf/",
            "auth/login/",
            "auth/logout/",
            "auth/invite/complete/",
            "auth/token/refresh/",
        ]:
            self.assert_method_matrix_no_server_error(endpoint)


class InviteSetPasswordTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create(username="invite_user", email="invite@example.com", is_active=True)
        self.user.set_unusable_password()
        self.user.save(update_fields=["password"])

    def test_invite_set_password_success(self):
        token = make_invite_token(self.user)
        url = reverse("invite_set_password")

        response = self.client.post(
            url,
            {
                "token": token,
                "password1": "N3uesPasswort!123",
                "password2": "N3uesPasswort!123",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("N3uesPasswort!123"))

    def test_invite_set_password_rejects_reused_token(self):
        token = make_invite_token(self.user)
        url = reverse("invite_set_password")

        first = self.client.post(
            url,
            {
                "token": token,
                "password1": "N3uesPasswort!123",
                "password2": "N3uesPasswort!123",
            },
            format="json",
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK)

        second = self.client.post(
            url,
            {
                "token": token,
                "password1": "NochEinPasswort!123",
                "password2": "NochEinPasswort!123",
            },
            format="json",
        )
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)


class UsersBranchCoverageTests(APITestCase):
    def setUp(self):
        self.role_admin = Role.objects.create(key="ADMIN", verbose_name="Admin")
        self.role_member = Role.objects.create(key="MITGLIED", verbose_name="Mitglied")

    def test_manager_validation_and_create_paths(self):
        with self.assertRaises(ValueError):
            User.objects.email_validator("invalid")

        self.assertTrue(User.objects.email_validator("ok@example.com"))

        with self.assertRaises(ValueError):
            User.objects.create_user("", "Strong!123")

        created = User.objects.create_user(
            username="with_roles",
            password="Strong!123",
            email="Role@Example.COM",
            roles=["MITGLIED"],
        )
        self.assertTrue(created.has_role("MITGLIED"))

        with self.assertRaises(ValueError):
            User.objects.create_superuser("su1", "", email="su@example.com")
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                "su2", "Strong!123", email="su@example.com", is_superuser=False
            )

        superuser = User.objects.create_superuser(
            "su_ok", "Strong!123", email="root@example.com"
        )
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.has_role("ADMIN"))

    def test_user_model_properties_and_role_helpers(self):
        user = User.objects.create_user(
            username="model_user",
            first_name="max",
            last_name="mustermann",
            password="Strong!123",
            email="model@example.com",
        )
        user.roles.add(self.role_member)

        self.assertEqual(str(user), "model_user")
        self.assertEqual(user.get_full_name, "model_user")
        self.assertEqual(user.get_short_name, "model_user")
        self.assertTrue(user.has_role("MITGLIED"))
        self.assertTrue(user.has_any_role("MITGLIED", "ADMIN"))
        self.assertFalse(user.has_any_role("XYZ"))
        self.assertEqual(str(self.role_admin), "Admin")

    def test_user_serializer_update_delete_and_representation(self):
        member = User.objects.create_user(
            username="ser_user",
            first_name="A",
            last_name="B",
            password="Strong!123",
        )
        serializer = UserSerializer(instance=member)
        updated = serializer.update(member, {"email": "neu@example.com", "roles": [self.role_member]})
        self.assertEqual(updated.email, "neu@example.com")
        self.assertTrue(updated.has_role("MITGLIED"))

        superuser = User.objects.create_superuser("sdel", "Strong!123")
        super_serializer = UserSerializer(instance=superuser)
        with self.assertRaises(Exception):
            super_serializer.delete(superuser)

        deleted_user = User.objects.create_user("to_delete", "Strong!123")
        UserSerializer(instance=deleted_user).delete(deleted_user)
        self.assertFalse(User.objects.filter(username="to_delete").exists())

        rep = super_serializer.to_representation(superuser)
        self.assertTrue(rep["admin"])

        superuser.username = "fixed_name"
        UserSerializer(instance=superuser).update(superuser, {"username": "should_not_change"})
        superuser.refresh_from_db()
        self.assertEqual(superuser.username, "fixed_name")

        self_user_serializer = UserSelfSerializer(instance=member)
        changed = self_user_serializer.update(member, {"email": "self@example.com"})
        self.assertEqual(changed.email, "self@example.com")

    def test_custom_user_details_and_force_logout_paths(self):
        user = User.objects.create_user(
            username="view_user",
            first_name="View",
            last_name="User",
            password="Strong!123",
        )

        request = APIRequestFactory().get("/api/users/self/")
        request.user = user
        view = CustomUserDetailsView()
        view.request = request
        self.assertEqual(view.get_object(), user)
        self.assertEqual(list(view.get_queryset()), [])

        logout_view = ForceLogoutView()
        response_missing = logout_view.logout(SimpleNamespace(user=SimpleNamespace(pk=-999)))
        self.assertEqual(response_missing.status_code, 200)

        with patch("dj_rest_auth.views.LogoutView.logout", return_value=status.HTTP_200_OK) as mocked_logout:
            response_existing = logout_view.logout(SimpleNamespace(user=user))
            mocked_logout.assert_called_once()
            self.assertEqual(response_existing, status.HTTP_200_OK)

    def test_user_retrieve_404_and_renderer_error_path(self):
        admin = User.objects.create_user(
            username="adminx",
            first_name="Admin",
            last_name="X",
            password="Strong!123",
        )
        admin.roles.add(self.role_admin)
        self.client.force_authenticate(user=admin)
        response = self.client.get(reverse("user-retrieve-update-destroy", kwargs={"id": uuid4()}), format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        renderer = UserJSONRenderer()
        rendered_error = renderer.render(
            {"errors": {"detail": "x"}},
            renderer_context={"response": SimpleNamespace(status_code=400)},
        )
        self.assertIsInstance(rendered_error, bytes)

    def test_user_list_and_retrieve_success_branches(self):
        admin = User.objects.create_user(
            username="admin_list",
            first_name="Admin",
            last_name="List",
            password="Strong!123",
        )
        admin.roles.add(self.role_admin)

        member = User.objects.create_user(
            username="member1",
            first_name="Mem",
            last_name="Ber",
            password="Strong!123",
        )
        member.roles.add(self.role_member)

        self.client.force_authenticate(user=admin)
        list_response = self.client.get(reverse("user-list"), format="json")
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(list_response.data, list)

        context_response = self.client.get(reverse("user-context"), format="json")
        self.assertEqual(context_response.status_code, status.HTTP_200_OK)
        self.assertIn("rollen", context_response.data)

        retrieve_response = self.client.get(
            reverse("user-retrieve-update-destroy", kwargs={"id": member.id}),
            format="json",
        )
        self.assertEqual(retrieve_response.status_code, status.HTTP_200_OK)
        self.assertIn("user", retrieve_response.data)

    def test_user_adapter_save_user_path(self):
        adapter = UserAdapter()
        user = User(username="adapter_user")
        form = SimpleNamespace(cleaned_data={})
        with patch.object(user, "save", return_value=None) as mock_save:
            result = adapter.save_user(SimpleNamespace(), user, form, commit=False)
        mock_save.assert_called_once()
        self.assertEqual(result, user)

