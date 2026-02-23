from uuid import uuid4
from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.fmd.models import FMD
from core_apps.fmd.serializers import NullableDateField, NullableIntegerField, FMDSerializer
from core_apps.mitglieder.models import Mitglied
from core_apps.modul_konfiguration.models import ModulKonfiguration
from core_apps.konfiguration.models import Konfiguration


class FMDEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.fmd_user = self.create_user_with_roles("FMD")
        self.mitglied = Mitglied.objects.create(
            stbnr=1,
            vorname="Max",
            nachname="Mustermann",
            svnr="1234",
            geburtsdatum=date(1990, 1, 1),
        )
        ModulKonfiguration.objects.create(modul="fmd", konfiguration={"a": 1})
        Konfiguration.objects.create(fw_nummer="100")
        FMD.objects.create(mitglied_id=self.mitglied, arzt="Doc", naechste_untersuchung=2027)

    def test_all_fmd_endpoints_resolve(self):
        endpoints = [
            "fmd/",
            f"fmd/{uuid4()}/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_fmd_requires_auth_and_role(self):
        self.assert_requires_authentication("fmd/")
        self.assert_forbidden_without_role("fmd/")

    def test_fmd_method_matrix_no_server_error(self):
        self.assert_method_matrix_no_server_error("fmd/")

    def test_fmd_list_returns_aggregated_payload(self):
        self.client.force_authenticate(user=self.fmd_user)
        response = self.request_method("get", "fmd/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("main", response.data)
        self.assertIn("mitglieder", response.data)
        self.assertIn("modul_konfig", response.data)
        self.assertIn("konfig", response.data)

    def test_nullable_fields_and_serializer_meta(self):
        date_field = NullableDateField()
        int_field = NullableIntegerField()
        self.assertIsNone(date_field.to_internal_value(""))
        self.assertIsNone(date_field.to_internal_value(None))
        self.assertEqual(date_field.to_internal_value("01.01.2024"), date(2024, 1, 1))
        self.assertIsNone(int_field.to_internal_value(""))
        self.assertIsNone(int_field.to_internal_value(None))
        self.assertEqual(int_field.to_internal_value("5"), 5)

        serializer = FMDSerializer()
        self.assertEqual(serializer.Meta.model, FMD)
        self.assertEqual(serializer.Meta.fields, "__all__")

    def test_fmd_model_str(self):
        obj = FMD(mitglied_id=self.mitglied)
        self.assertIsInstance(str(obj), str)

