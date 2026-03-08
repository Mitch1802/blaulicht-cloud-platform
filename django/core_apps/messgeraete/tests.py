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

    def test_messgeraete_list_contains_last_and_next_pruefung_per_type(self):
        MessgeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 3, 15),
            name_pruefer="Planer",
            wartung_jaehrlich=True,
        )
        MessgeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 4, 20),
            name_pruefer="Planer",
            kontrolle_woechentlich=True,
        )
        MessgeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 5, 10),
            name_pruefer="Planer",
            kalibrierung=True,
        )

        self.client.force_authenticate(user=self.atemschutz_user)
        response = self.request_method("get", "atemschutz/messgeraete/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = next((entry for entry in response.data if entry.get("pkid") == self.geraet.pkid), None)
        self.assertIsNotNone(item)
        self.assertEqual(item.get("letzte_pruefung"), "10.05.2024")
        self.assertEqual(item.get("naechste_pruefung"), "10.05.2025")
        self.assertEqual(item.get("letzte_kalibrierung"), "10.05.2024")
        self.assertEqual(item.get("naechste_kalibrierung"), "10.05.2025")
        self.assertEqual(item.get("letzte_kontrolle_woechentlich"), "20.04.2024")
        self.assertEqual(item.get("naechste_kontrolle_woechentlich"), "27.04.2024")
        self.assertEqual(item.get("letzte_wartung_jaehrlich"), "15.03.2024")
        self.assertEqual(item.get("naechste_wartung_jaehrlich"), "15.03.2025")

    def test_messgeraete_summary_ignores_entries_without_type_flags(self):
        MessgeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 1, 10),
            name_pruefer="Planer",
            wartung_jaehrlich=True,
        )
        MessgeraetProtokoll.objects.create(
            geraet_id=self.geraet,
            datum=date(2024, 2, 10),
            name_pruefer="Planer",
        )

        self.client.force_authenticate(user=self.atemschutz_user)
        response = self.request_method("get", "atemschutz/messgeraete/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = next((entry for entry in response.data if entry.get("pkid") == self.geraet.pkid), None)
        self.assertIsNotNone(item)
        self.assertEqual(item.get("letzte_pruefung"), "10.01.2024")
        self.assertEqual(item.get("naechste_pruefung"), "10.01.2025")
