from types import SimpleNamespace

from django.test import TestCase
from rest_framework.permissions import BasePermission

from core_apps.common.permissions import any_of, HasAnyRolePermission, HasReadOnlyRolePermission


class CommonPermissionsTests(TestCase):
    def test_role_permissions_has_permission_paths(self):
        user_ok = SimpleNamespace(is_authenticated=True, has_any_role=lambda *roles: "ADMIN" in roles)
        user_no_attr = SimpleNamespace(is_authenticated=True)
        user_not_auth = SimpleNamespace(is_authenticated=False, has_any_role=lambda *roles: True)

        request_get = SimpleNamespace(method="GET", user=user_ok)
        request_post = SimpleNamespace(method="POST", user=user_ok)

        any_admin = HasAnyRolePermission.with_roles("ADMIN")()
        self.assertTrue(any_admin.has_permission(request_get, view=None))
        self.assertFalse(any_admin.has_permission(SimpleNamespace(method="GET", user=user_no_attr), view=None))
        self.assertFalse(any_admin.has_permission(SimpleNamespace(method="GET", user=user_not_auth), view=None))

        read_only = HasReadOnlyRolePermission.with_roles("ADMIN")()
        self.assertTrue(read_only.has_permission(request_get, view=None))
        self.assertFalse(read_only.has_permission(request_post, view=None))
        self.assertFalse(read_only.has_permission(SimpleNamespace(method="GET", user=user_no_attr), view=None))

    def test_any_of_object_permission_paths(self):
        class AlwaysFalse(BasePermission):
            def has_permission(self, request, view):
                return False

            def has_object_permission(self, request, view, obj):
                return False

        class AlwaysTrueNoObject(BasePermission):
            def has_permission(self, request, view):
                return True

        Combined = any_of(AlwaysFalse, AlwaysTrueNoObject)
        perm = Combined()

        request = SimpleNamespace()
        self.assertTrue(perm.has_permission(request, view=None))
        self.assertTrue(perm.has_object_permission(request, view=None, obj=object()))

        class PlainPerm:
            def has_permission(self, request, view):
                return True

        CombinedPlain = any_of(AlwaysFalse, PlainPerm)
        perm_plain = CombinedPlain()
        self.assertTrue(perm_plain.has_permission(request, view=None))
        self.assertTrue(perm_plain.has_object_permission(request, view=None, obj=object()))

    def test_any_of_with_explicit_object_permission(self):
        class FalsePerm(BasePermission):
            def has_permission(self, request, view):
                return False

            def has_object_permission(self, request, view, obj):
                return False

        class TruePerm(BasePermission):
            def has_permission(self, request, view):
                return True

            def has_object_permission(self, request, view, obj):
                return True

        Combined = any_of(FalsePerm, TruePerm)
        perm = Combined()

        self.assertTrue(perm.has_permission(SimpleNamespace(), view=None))
        self.assertTrue(perm.has_object_permission(SimpleNamespace(), view=None, obj=object()))
        self.assertTrue(Combined.__name__.startswith("AnyOf_"))

    def test_any_of_all_false_object_permission(self):
        class FalseA(BasePermission):
            def has_permission(self, request, view):
                return False

            def has_object_permission(self, request, view, obj):
                return False

        class FalseB(BasePermission):
            def has_permission(self, request, view):
                return False

            def has_object_permission(self, request, view, obj):
                return False

        Combined = any_of(FalseA, FalseB)
        perm = Combined()
        self.assertFalse(perm.has_permission(SimpleNamespace(), view=None))
        self.assertFalse(perm.has_object_permission(SimpleNamespace(), view=None, obj=object()))
