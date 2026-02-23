from django.conf import settings
from django.contrib.auth import get_user_model

from core_apps.users.models import Role


User = get_user_model()


class EndpointSmokeMixin:
    def build_api_url(self, relative_path: str) -> str:
        prefix = settings.API_URL.strip("/")
        path = relative_path.lstrip("/")
        return f"/{prefix}/{path}"

    def assert_options_works(self, relative_path: str) -> None:
        response = self.client.options(self.build_api_url(relative_path), format="json")
        self.assertNotEqual(
            response.status_code,
            404,
            msg=f"Endpoint not found: {self.build_api_url(relative_path)}",
        )
        self.assertLess(
            response.status_code,
            500,
            msg=f"Server error for endpoint: {self.build_api_url(relative_path)}",
        )

    def create_user_without_roles(self):
        return User.objects.create_user(
            username=f"test_{User.objects.count() + 1}",
            first_name="Test",
            last_name="User",
            password="T3st!PasswortSehrSicher",
            email=f"test{User.objects.count() + 1}@example.com",
        )

    def create_user_with_roles(self, *role_keys):
        user = self.create_user_without_roles()
        for role_key in role_keys:
            role, _ = Role.objects.get_or_create(
                key=role_key,
                defaults={"verbose_name": role_key.title()},
            )
            user.roles.add(role)
        return user

    def request_method(self, method: str, relative_path: str, data=None):
        method_func = getattr(self.client, method.lower())
        return method_func(self.build_api_url(relative_path), data=data or {}, format="json")

    def assert_requires_authentication(self, relative_path: str, method: str = "get", data=None):
        response = self.request_method(method, relative_path, data=data)
        self.assertIn(
            response.status_code,
            [401, 403],
            msg=f"Expected auth to be required for {self.build_api_url(relative_path)}, got {response.status_code}",
        )

    def assert_forbidden_without_role(self, relative_path: str, method: str = "get", data=None):
        user = self.create_user_without_roles()
        self.client.force_authenticate(user=user)
        response = self.request_method(method, relative_path, data=data)
        self.client.force_authenticate(user=None)
        self.assertEqual(
            response.status_code,
            403,
            msg=f"Expected role-based 403 for {self.build_api_url(relative_path)}, got {response.status_code}",
        )

    def assert_not_auth_error(self, relative_path: str, method: str = "get", data=None):
        response = self.request_method(method, relative_path, data=data)
        self.assertNotIn(
            response.status_code,
            [401, 403],
            msg=f"Expected public access for {self.build_api_url(relative_path)}, got {response.status_code}",
        )

    def assert_status_in(self, response, allowed_statuses, endpoint: str, method: str):
        self.assertIn(
            response.status_code,
            allowed_statuses,
            msg=(
                f"Unexpected status for {method.upper()} {self.build_api_url(endpoint)}: "
                f"{response.status_code} not in {allowed_statuses}"
            ),
        )

    def assert_endpoint_contract(
        self,
        endpoint: str,
        method: str = "get",
        unauth_allowed=(401, 403),
        no_role_allowed=(403,),
        data=None,
    ):
        unauth = self.request_method(method, endpoint, data=data)
        self.assert_status_in(unauth, unauth_allowed, endpoint, method)

        user = self.create_user_without_roles()
        self.client.force_authenticate(user=user)
        no_role = self.request_method(method, endpoint, data=data)
        self.client.force_authenticate(user=None)
        self.assert_status_in(no_role, no_role_allowed, endpoint, method)

    def assert_method_matrix_no_server_error(self, relative_path: str, data=None):
        methods = ["get", "post", "put", "patch", "delete"]
        for method in methods:
            with self.subTest(endpoint=relative_path, method=method):
                response = self.request_method(method, relative_path, data=data)
                self.assertLess(
                    response.status_code,
                    500,
                    msg=(
                        f"Expected no server error for {method.upper()} "
                        f"{self.build_api_url(relative_path)}, got {response.status_code}"
                    ),
                )
