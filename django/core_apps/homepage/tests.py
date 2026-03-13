from datetime import date
from typing import Any, cast
from uuid import uuid4

from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.mitglieder.models import Mitglied
from core_apps.users.models import Role, User

from .models import HomepageDienstposten


class HomepageEndpointTests(EndpointSmokeMixin, APITestCase):
    def create_user(self, username: str, roles: tuple[str, ...] = ()) -> User:
        user = User.objects.create(
            username=username,
            email=f"{username}@example.com",
            is_active=True,
        )
        user.set_password("T3st!PasswortSehrSicher")
        user.save(update_fields=["password"])

        for role_key in roles:
            role, _ = Role.objects.get_or_create(
                key=role_key,
                defaults={"verbose_name": role_key.title()},
            )
            user.roles.add(role)

        return user

    def setUp(self):
        self.verwaltung_user = self.create_user("verwaltung_test", ("VERWALTUNG",))
        self.user_without_role = self.create_user("no_role_test")

        self.mitglied = Mitglied.objects.create(
            stbnr=114,
            vorname="Wolfgang",
            nachname="Niederauer",
            dienstgrad="HBI",
            geburtsdatum=date(1980, 1, 1),
            dienststatus=Mitglied.Dienststatus.AKTIV,
        )

        HomepageDienstposten.objects.create(
            section_id="kommando",
            section_title="Kommando",
            section_order=1,
            position="Kommandant",
            position_order=1,
            mitglied=self.mitglied,
        )
        HomepageDienstposten.objects.create(
            section_id="sachbearbeiter",
            section_title="Sachbearbeiter",
            section_order=2,
            position="Ausbilder",
            position_order=1,
            fallback_name="Nicht definiert",
            fallback_dienstgrad="BM",
            fallback_photo="X",
            fallback_dienstgrad_img="Dgrd_bm.noe.svg",
        )

    def test_homepage_endpoints_resolve(self):
        endpoints = [
            "homepage/intern/",
            f"homepage/intern/{uuid4()}/",
            "homepage/intern/bulk/",
            "homepage/public/",
            f"homepage/public/{uuid4()}/",
            "homepage/context/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_intern_and_context_require_auth_and_roles(self):
        intern_url = self.build_api_url("homepage/intern/")
        context_url = self.build_api_url("homepage/context/")

        unauth_intern = self.client.get(intern_url, format="json")
        self.assertIn(unauth_intern.status_code, [401, 403])

        unauth_context = self.client.get(context_url, format="json")
        self.assertIn(unauth_context.status_code, [401, 403])

        cast(Any, self.client).force_authenticate(user=self.user_without_role)
        no_role_intern = self.client.get(intern_url, format="json")
        no_role_context = self.client.get(context_url, format="json")
        cast(Any, self.client).force_authenticate(user=None)

        self.assertEqual(no_role_intern.status_code, 403)
        self.assertEqual(no_role_context.status_code, 403)

    def test_public_endpoint_is_accessible_without_auth(self):
        response = self.client.get(self.build_api_url("homepage/public/"), format="json")
        self.assertNotIn(response.status_code, [401, 403])

    def test_verwaltung_user_can_bulk_upsert(self):
        cast(Any, self.client).force_authenticate(user=self.verwaltung_user)

        response = self.request_method(
            "post",
            "homepage/intern/bulk/",
            data={
                "replace": True,
                "rows": [
                    {
                        "section_id": "kommando",
                        "section_title": "Kommando",
                        "section_order": 1,
                        "position": "Kommandant",
                        "position_order": 1,
                        "mitglied_id": self.mitglied.pkid,
                    },
                    {
                        "section_id": "sachbearbeiter",
                        "section_title": "Sachbearbeiter",
                        "section_order": 2,
                        "position": "Zeugmeister",
                        "position_order": 1,
                        "fallback_name": "Nicht definiert",
                        "fallback_dienstgrad": "BM",
                        "fallback_photo": "X",
                        "fallback_dienstgrad_img": "Dgrd_bm.noe.svg",
                    },
                ],
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(HomepageDienstposten.objects.count(), 2)

    def test_public_response_matches_expected_shape(self):
        response = self.request_method("get", "homepage/public/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        sections = response.data.get("sections", [])
        self.assertTrue(isinstance(sections, list))
        self.assertGreaterEqual(len(sections), 1)

        kommando = next((section for section in sections if section.get("id") == "kommando"), None)
        if kommando is None:
            self.fail("Kommando-Sektion fehlt in der Public-Response.")
        self.assertEqual(kommando.get("title"), "Kommando")
        self.assertTrue(len(kommando.get("members", [])) >= 1)

        fallback_present = any(
            member.get("name") == "Nicht definiert"
            for section in sections
            for member in section.get("members", [])
        )
        self.assertTrue(fallback_present)
