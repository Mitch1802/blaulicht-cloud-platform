from uuid import uuid4
from unittest.mock import patch, Mock
from types import SimpleNamespace

from dj_rest_auth.app_settings import api_settings as rest_auth_settings
from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.fahrzeuge.models import Fahrzeug, FahrzeugRaum, RaumItem
from core_apps.fahrzeuge.views import make_public_token
from core_apps.fahrzeuge.views import PublicFahrzeugDetailView
from core_apps.fahrzeuge.views import (
    read_public_token,
    PublicPinVerifyView,
    PublicFahrzeugListView,
    FahrzeugViewSet,
    FahrzeugRaumViewSet,
    RaumItemViewSet,
)
from core_apps.fahrzeuge.serializers import (
    FahrzeugListSerializer,
    FahrzeugDetailSerializer,
    FahrzeugCrudSerializer,
    FahrzeugRaumSerializer,
    FahrzeugRaumCrudSerializer,
    RaumItemSerializer,
    RaumItemCrudSerializer,
)


class FahrzeugeEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.admin = self.create_user_with_roles("ADMIN")
        self.member = self.create_user_with_roles("MITGLIED")
        self.fahrzeug_role_user = self.create_user_with_roles("FAHRZEUG")

        self.fahrzeug = Fahrzeug.objects.create(name="TLF")
        self.raum = FahrzeugRaum.objects.create(fahrzeug=self.fahrzeug, name="R1", reihenfolge=1)
        self.item = RaumItem.objects.create(raum=self.raum, name="Helm", menge=1)

    def test_all_fahrzeuge_endpoints_resolve(self):
        fahrzeug_id = uuid4()
        raum_id = uuid4()
        item_id = uuid4()
        endpoints = [
            "public/pin/verify/",
            "public/fahrzeuge/",
            "public/fahrzeuge/public-test-id/",
            "fahrzeuge/",
            f"fahrzeuge/{fahrzeug_id}/",
            f"fahrzeuge/{fahrzeug_id}/checks/",
            f"fahrzeuge/{fahrzeug_id}/raeume/",
            f"fahrzeuge/{fahrzeug_id}/raeume/{raum_id}/",
            f"raeume/{raum_id}/items/",
            f"raeume/{raum_id}/items/{item_id}/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_fahrzeuge_public_pin_verify_is_public(self):
        response = self.request_method("post", "public/pin/verify/", data={"pin": "falsch"})
        self.assertIn(response.status_code, [403, 429])

    def test_fahrzeuge_public_pin_verify_rejects_missing_pin(self):
        response = self.request_method("post", "public/pin/verify/", data={})
        self.assertIn(response.status_code, [400, 429])

    def test_fahrzeuge_public_pin_verify_accepts_valid_pin(self):
        with patch("core_apps.fahrzeuge.views.settings.PUBLIC_PIN_ENABLED", True), patch(
            "core_apps.fahrzeuge.views.settings.PUBLIC_FAHRZEUG_PIN", "1234"
        ), patch("core_apps.fahrzeuge.views.PublicPinVerifyView.check_throttles", return_value=None):
            response = self.request_method("post", "public/pin/verify/", data={"pin": "1234"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)

    def test_fahrzeuge_public_pin_verify_ignores_invalid_auth_cookie(self):
        if rest_auth_settings.JWT_AUTH_COOKIE:
            self.client.cookies[rest_auth_settings.JWT_AUTH_COOKIE] = "invalid.jwt.token"

        with patch("core_apps.fahrzeuge.views.settings.PUBLIC_PIN_ENABLED", True), patch(
            "core_apps.fahrzeuge.views.settings.PUBLIC_FAHRZEUG_PIN", "1234"
        ), patch("core_apps.fahrzeuge.views.PublicPinVerifyView.check_throttles", return_value=None):
            response = self.request_method("post", "public/pin/verify/", data={"pin": "1234"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access_token", response.data)

    def test_fahrzeuge_public_detail_requires_token_but_not_user_auth(self):
        self.assertEqual(
            self.request_method("get", "public/fahrzeuge/public-test-id/").status_code,
            401,
        )

    def test_fahrzeuge_public_list_requires_token_but_not_user_auth(self):
        self.assertEqual(
            self.request_method("get", "public/fahrzeuge/").status_code,
            401,
        )

    def test_fahrzeuge_public_detail_accepts_valid_token(self):
        request = SimpleNamespace(headers={"Authorization": "Bearer token"})
        with patch("core_apps.fahrzeuge.views.read_public_token", return_value={"scope": "public_readonly"}):
            response = PublicFahrzeugDetailView().get(request, public_id=self.fahrzeug.public_id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["public_id"], self.fahrzeug.public_id)

    def test_fahrzeuge_public_list_accepts_valid_token(self):
        request = SimpleNamespace(headers={"Authorization": "Bearer token"})
        with patch("core_apps.fahrzeuge.views.read_public_token", return_value={"scope": "public_readonly"}):
            response = PublicFahrzeugListView().get(request)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["public_id"], self.fahrzeug.public_id)

    def test_fahrzeuge_public_endpoints_ignore_invalid_auth_cookie_and_accept_public_token(self):
        if rest_auth_settings.JWT_AUTH_COOKIE:
            self.client.cookies[rest_auth_settings.JWT_AUTH_COOKIE] = "invalid.jwt.token"

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {make_public_token()}")

        list_response = self.request_method("get", "public/fahrzeuge/")
        detail_response = self.request_method("get", f"public/fahrzeuge/{self.fahrzeug.public_id}/")

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(list_response.data), 1)
        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["public_id"], self.fahrzeug.public_id)

    def test_fahrzeuge_auth_endpoints_require_auth_and_role(self):
        self.assert_endpoint_contract("fahrzeuge/")
        self.assert_endpoint_contract(f"fahrzeuge/{uuid4()}/checks/", method="post", data={})

    def test_fahrzeug_role_user_can_list_fahrzeuge(self):
        self.client.force_authenticate(user=self.fahrzeug_role_user)

        response = self.request_method("get", "fahrzeuge/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_fahrzeuge_checks_reject_empty_results(self):
        self.client.force_authenticate(user=self.fahrzeug_role_user)

        response = self.request_method(
            "post",
            f"fahrzeuge/{self.fahrzeug.id}/checks/",
            data={"title": "Check", "results": []},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_fahrzeuge_checks_reject_item_of_other_vehicle(self):
        self.client.force_authenticate(user=self.fahrzeug_role_user)

        other_vehicle = Fahrzeug.objects.create(name="LF")
        other_room = FahrzeugRaum.objects.create(fahrzeug=other_vehicle, name="R2", reihenfolge=1)
        foreign_item = RaumItem.objects.create(raum=other_room, name="Fremd", menge=1)

        response = self.request_method(
            "post",
            f"fahrzeuge/{self.fahrzeug.id}/checks/",
            data={
                "title": "Check",
                "results": [{"item_id": foreign_item.pkid, "status": "ok"}],
            },
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_fahrzeuge_checks_create_success(self):
        self.client.force_authenticate(user=self.fahrzeug_role_user)

        response = self.request_method(
            "post",
            f"fahrzeuge/{self.fahrzeug.id}/checks/",
            data={
                "title": "Check",
                "results": [{"item_id": self.item.pkid, "status": "ok", "notiz": "passt"}],
            },
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data)

    def test_fahrzeuge_method_matrix_no_server_error(self):
        fahrzeug_id = uuid4()
        raum_id = uuid4()
        item_id = uuid4()
        for endpoint in [
            "public/pin/verify/",
            "public/fahrzeuge/",
            "public/fahrzeuge/public-test-id/",
            "fahrzeuge/",
            f"fahrzeuge/{fahrzeug_id}/",
            f"fahrzeuge/{fahrzeug_id}/checks/",
            f"fahrzeuge/{fahrzeug_id}/raeume/",
            f"fahrzeuge/{fahrzeug_id}/raeume/{raum_id}/",
            f"raeume/{raum_id}/items/",
            f"raeume/{raum_id}/items/{item_id}/",
        ]:
            self.assert_method_matrix_no_server_error(endpoint)


class FahrzeugeBranchCoverageTests(APITestCase):
    def setUp(self):
        self.fahrzeug = Fahrzeug.objects.create(name="TLF-B")
        self.raum = FahrzeugRaum.objects.create(fahrzeug=self.fahrzeug, name="R1", reihenfolge=1)
        self.item = RaumItem.objects.create(raum=self.raum, name="Schlauch", menge=2)

    def test_public_detail_invalid_scope_and_token_reader(self):
        request = SimpleNamespace(headers={"Authorization": "Bearer token"})
        with patch("core_apps.fahrzeuge.views.read_public_token", return_value={"scope": "other"}):
            response = PublicFahrzeugDetailView().get(request, public_id=self.fahrzeug.public_id)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        self.assertIsNone(read_public_token("defekt"))

    def test_public_pin_verify_missing_and_disabled(self):
        view = PublicPinVerifyView()

        missing_pin = view.post(SimpleNamespace(data={}))
        self.assertEqual(missing_pin.status_code, status.HTTP_400_BAD_REQUEST)

        with patch("core_apps.fahrzeuge.views.settings.PUBLIC_PIN_ENABLED", False):
            disabled = view.post(SimpleNamespace(data={"pin": "1234"}))
        self.assertEqual(disabled.status_code, status.HTTP_403_FORBIDDEN)

        with patch("core_apps.fahrzeuge.views.settings.PUBLIC_PIN_ENABLED", True), patch(
            "core_apps.fahrzeuge.views.settings.PUBLIC_FAHRZEUG_PIN", "1234"
        ):
            wrong_pin = view.post(SimpleNamespace(data={"pin": "9999"}))
        self.assertEqual(wrong_pin.status_code, status.HTTP_403_FORBIDDEN)

    def test_fahrzeug_viewset_serializer_selection(self):
        view = FahrzeugViewSet()
        view.action = "list"
        self.assertEqual(view.get_serializer_class(), FahrzeugListSerializer)
        view.action = "retrieve"
        self.assertEqual(view.get_serializer_class(), FahrzeugDetailSerializer)
        view.action = "create"
        self.assertEqual(view.get_serializer_class(), FahrzeugCrudSerializer)

    def test_fahrzeug_raum_viewset_paths(self):
        view = FahrzeugRaumViewSet()
        view.kwargs = {"fahrzeug_id": self.fahrzeug.id}
        ids = list(view.get_queryset().values_list("id", flat=True))
        self.assertIn(self.raum.id, ids)

        view.action = "list"
        self.assertEqual(view.get_serializer_class(), FahrzeugRaumSerializer)
        view.action = "create"
        self.assertEqual(view.get_serializer_class(), FahrzeugRaumCrudSerializer)

        serializer = SimpleNamespace(save=Mock())
        view.perform_create(serializer)
        serializer.save.assert_called_once()

    def test_raum_item_viewset_paths(self):
        view = RaumItemViewSet()
        view.kwargs = {"raum_id": self.raum.id}
        ids = list(view.get_queryset().values_list("id", flat=True))
        self.assertIn(self.item.id, ids)

        view.action = "retrieve"
        self.assertEqual(view.get_serializer_class(), RaumItemSerializer)
        view.action = "create"
        self.assertEqual(view.get_serializer_class(), RaumItemCrudSerializer)

        serializer = SimpleNamespace(save=Mock())
        view.perform_create(serializer)
        serializer.save.assert_called_once()

    def test_fahrzeug_crud_serializer_validates_service_window(self):
        serializer = FahrzeugCrudSerializer(
            data={
                "name": "HLF 20",
                "service_zuletzt_am": "2026-03-10",
                "service_naechstes_am": "2026-03-01",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("service_naechstes_am", serializer.errors)

    def test_raum_item_crud_serializer_validates_wartung_window(self):
        serializer = RaumItemCrudSerializer(
            data={
                "name": "Prueflampe",
                "menge": "1",
                "einheit": "Stk",
                "notiz": "",
                "reihenfolge": 0,
                "wartung_zuletzt_am": "2026-03-10",
                "wartung_naechstes_am": "2026-03-01",
            }
        )

        self.assertFalse(serializer.is_valid())
        self.assertIn("wartung_naechstes_am", serializer.errors)
