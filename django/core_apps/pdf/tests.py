from uuid import uuid4
from types import SimpleNamespace
from unittest.mock import patch, Mock
import tempfile
from pathlib import Path

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core_apps.common.test_helpers import EndpointSmokeMixin
from core_apps.pdf.models import PdfTemplate
from core_apps.pdf.serializers import PdfTemplateSerializer
from core_apps.pdf.services import PdfTemplateService


class PdfEndpointTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.admin = self.create_user_with_roles("ADMIN")
        self.member = self.create_user_with_roles("MITGLIED")
        self.draft = PdfTemplate.objects.create(
            typ="invoice",
            bezeichnung="rechnung",
            version=1,
            status=PdfTemplate.Status.DRAFT,
            source="<!--PDF:BODY--><div>{{ payload.name }}</div>",
        )
        self.published = PdfTemplate.objects.create(
            typ="invoice",
            bezeichnung="rechnung",
            version=2,
            status=PdfTemplate.Status.PUBLISHED,
            source="<!--PDF:BODY--><div>published</div>",
        )

    def test_all_pdf_endpoints_resolve(self):
        template_id = uuid4()
        endpoints = [
            "pdf/templates/",
            f"pdf/templates/{template_id}/",
            f"pdf/templates/{template_id}/publish/",
            f"pdf/templates/{template_id}/new-version/",
            f"pdf/templates/{template_id}/preview/",
            f"pdf/templates/{template_id}/render/",
            f"pdf/templates/{template_id}/test/",
        ]

        for endpoint in endpoints:
            with self.subTest(endpoint=endpoint):
                self.assert_options_works(endpoint)

    def test_pdf_requires_auth_and_role(self):
        self.assert_requires_authentication("pdf/templates/")
        self.assert_forbidden_without_role("pdf/templates/")

    def test_pdf_custom_actions_require_auth_and_role(self):
        template_id = uuid4()
        self.assert_requires_authentication(f"pdf/templates/{template_id}/publish/", method="post", data={})
        self.assert_forbidden_without_role(f"pdf/templates/{template_id}/publish/", method="post", data={})

    def test_pdf_method_matrix_no_server_error(self):
        template_id = uuid4()
        for endpoint in [
            "pdf/templates/",
            f"pdf/templates/{template_id}/",
            f"pdf/templates/{template_id}/publish/",
            f"pdf/templates/{template_id}/new-version/",
            f"pdf/templates/{template_id}/preview/",
            f"pdf/templates/{template_id}/render/",
            f"pdf/templates/{template_id}/test/",
        ]:
            self.assert_method_matrix_no_server_error(endpoint)

    def test_pdf_list_filters_to_published_for_mitglied(self):
        self.client.force_authenticate(user=self.member)

        response = self.request_method("get", "pdf/templates/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = {entry["id"] for entry in response.data}
        self.assertIn(str(self.published.id), ids)
        self.assertNotIn(str(self.draft.id), ids)

    def test_pdf_publish_sets_status_and_archives_previous(self):
        old_published = self.published
        self.client.force_authenticate(user=self.admin)

        response = self.request_method("post", f"pdf/templates/{self.draft.id}/publish/", data={})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.draft.refresh_from_db()
        old_published.refresh_from_db()
        self.assertEqual(self.draft.status, PdfTemplate.Status.PUBLISHED)
        self.assertEqual(old_published.status, PdfTemplate.Status.ARCHIVED)

    def test_pdf_new_version_creates_next_draft(self):
        self.client.force_authenticate(user=self.admin)

        response = self.request_method("post", f"pdf/templates/{self.published.id}/new-version/", data={})

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_id = response.data["id"]
        new_template = PdfTemplate.objects.get(id=created_id)
        self.assertEqual(new_template.version, 3)
        self.assertEqual(new_template.status, PdfTemplate.Status.DRAFT)

    def test_pdf_preview_rejects_unpublished_for_member(self):
        self.client.force_authenticate(user=self.member)

        response = self.request_method("post", f"pdf/templates/{self.draft.id}/preview/", data={})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pdf_preview_returns_html_for_member_published(self):
        self.client.force_authenticate(user=self.member)

        with patch("core_apps.pdf.views.PdfTemplateService.render_html", return_value=("<html>x</html>", "", "")):
            response = self.request_method("post", f"pdf/templates/{self.published.id}/preview/", data={})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/html", response["Content-Type"])

    def test_pdf_render_returns_pdf_bytes(self):
        self.client.force_authenticate(user=self.admin)

        with patch("core_apps.pdf.views.PdfTemplateService.render_html", return_value=("<html>x</html>", "h", "f")), patch(
            "core_apps.pdf.views.PdfTemplateService.render_pdf_bytes", return_value=b"%PDF"
        ):
            response = self.request_method("post", f"pdf/templates/{self.draft.id}/render/", data={})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("application/pdf", response["Content-Type"])

    def test_pdf_test_endpoint_uses_sample_payload(self):
        self.client.force_authenticate(user=self.admin)

        with patch("core_apps.pdf.views.PdfTemplateService.render_html", return_value=("<html>x</html>", "h", "f")), patch(
            "core_apps.pdf.views.PdfTemplateService.render_pdf_bytes", return_value=b"%PDF"
        ):
            response = self.request_method("post", f"pdf/templates/{self.draft.id}/test/", data={})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("application/pdf", response["Content-Type"])


class PdfServiceTests(APITestCase):
    def test_split_source_requires_body(self):
        with self.assertRaises(ValueError):
            PdfTemplateService.split_source("<!--PDF:CSS--><style></style>")

    def test_split_source_parses_all_sections(self):
        source = (
            "<!--PDF:CSS--><style>body{}</style>"
            "<!--PDF:HEADER--><div>h</div>"
            "<!--PDF:FOOTER--><div>f</div>"
            "<!--PDF:BODY--><main>b</main>"
        )
        css, header, footer, body = PdfTemplateService.split_source(source)
        self.assertIn("style", css)
        self.assertIn("h", header)
        self.assertIn("f", footer)
        self.assertIn("main", body)

    def test_qr_base64_png_returns_content(self):
        qr_b64 = PdfTemplateService.qr_base64_png("https://example.com")
        self.assertTrue(len(qr_b64) > 10)

    def test_render_html_works_without_logo_file(self):
        tmpl = PdfTemplate(
            typ="x",
            bezeichnung="x",
            version=1,
            source="<!--PDF:BODY--><div>{{ payload.name }}</div>",
        )
        with patch("core_apps.pdf.services.PdfTemplateService.file_to_base64", side_effect=FileNotFoundError):
            html, header, footer = PdfTemplateService.render_html(tmpl, {"name": "Max"})

        self.assertIn("Max", html)
        self.assertEqual(header, "")
        self.assertEqual(footer, "")


class PdfBranchCoverageTests(EndpointSmokeMixin, APITestCase):
    def setUp(self):
        self.admin = self.create_user_with_roles("ADMIN")
        self.member = self.create_user_with_roles("MITGLIED")
        self.draft = PdfTemplate.objects.create(
            typ="bericht",
            bezeichnung="einsatz",
            version=1,
            status=PdfTemplate.Status.DRAFT,
            source="<!--PDF:BODY--><div>x</div>",
        )
        self.published = PdfTemplate.objects.create(
            typ="bericht",
            bezeichnung="einsatz",
            version=2,
            status=PdfTemplate.Status.PUBLISHED,
            source="<!--PDF:BODY--><div>y</div>",
        )

    def test_pdf_model_str(self):
        self.assertIn("bericht", str(self.draft))

    def test_pdf_serializer_validate_paths(self):
        serializer_update = PdfTemplateSerializer(instance=self.published, data={"source": "x"}, partial=True)
        self.assertFalse(serializer_update.is_valid())

        serializer_status = PdfTemplateSerializer(
            instance=self.draft,
            data={"status": PdfTemplate.Status.PUBLISHED},
            partial=True,
        )
        self.assertFalse(serializer_status.is_valid())

        serializer_ok = PdfTemplateSerializer(instance=self.draft, data={"source": "<!--PDF:BODY-->ok"}, partial=True)
        self.assertTrue(serializer_ok.is_valid())

    def test_pdf_service_file_and_context_paths(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "a.bin"
            p.write_bytes(b"abc")
            b64 = PdfTemplateService.file_to_base64(p)
        self.assertTrue(len(b64) > 0)

        with patch("core_apps.pdf.services.PdfTemplateService.file_to_base64", return_value="logo"):
            ctx = PdfTemplateService.build_context({"qr_text": "x"})
        self.assertEqual(ctx["logo_base64"], "logo")

    def test_pdf_service_render_pdf_bytes_with_and_without_header_footer(self):
        browser = Mock()
        page = Mock()
        page.pdf.return_value = b"%PDF"
        browser.new_page.return_value = page

        chromium = Mock()
        chromium.launch.return_value = browser

        p = SimpleNamespace(chromium=chromium)
        cm = Mock()
        cm.__enter__ = Mock(return_value=p)
        cm.__exit__ = Mock(return_value=False)

        with patch("core_apps.pdf.services.sync_playwright", return_value=cm):
            result = PdfTemplateService.render_pdf_bytes("<html>x</html>", "<div>h</div>", "<div>f</div>")
        self.assertEqual(result, b"%PDF")
        self.assertTrue(page.pdf.called)

        with patch("core_apps.pdf.services.sync_playwright", return_value=cm):
            PdfTemplateService.render_pdf_bytes("<html>x</html>")

    def test_pdf_view_error_branches(self):
        self.client.force_authenticate(user=self.admin)

        response_publish = self.client.post(
            reverse("pdf-template-publish", kwargs={"id": self.published.id}),
            data={},
            format="json",
        )
        self.assertEqual(response_publish.status_code, status.HTTP_400_BAD_REQUEST)

        response_update = self.client.patch(
            reverse("pdf-templates-detail", kwargs={"id": self.published.id}),
            data={"source": "<!--PDF:BODY-->z"},
            format="json",
        )
        self.assertEqual(response_update.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.force_authenticate(user=self.member)
        with patch("core_apps.pdf.views.PdfTemplateService.render_html", side_effect=ValueError("kaputt")):
            response_preview = self.client.post(
                reverse("pdf-template-preview", kwargs={"id": self.published.id}),
                data={},
                format="json",
            )
        self.assertEqual(response_preview.status_code, status.HTTP_400_BAD_REQUEST)

        with patch("core_apps.pdf.views.PdfTemplateService.render_html", side_effect=ValueError("kaputt")):
            response_render = self.client.post(
                reverse("pdf-template-render", kwargs={"id": self.published.id}),
                data={},
                format="json",
            )
        self.assertEqual(response_render.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.force_authenticate(user=self.admin)
        with patch("core_apps.pdf.views.PdfTemplateService.render_html", side_effect=ValueError("kaputt")):
            response_test = self.client.post(
                reverse("pdf-template-test", kwargs={"id": self.published.id}),
                data={},
                format="json",
            )
        self.assertEqual(response_test.status_code, status.HTTP_400_BAD_REQUEST)

    def test_pdf_view_update_partial_destroy_and_member_render_block(self):
        self.client.force_authenticate(user=self.admin)

        update_response = self.client.put(
            reverse("pdf-templates-detail", kwargs={"id": self.draft.id}),
            data={
                "typ": self.draft.typ,
                "version": self.draft.version,
                "bezeichnung": self.draft.bezeichnung,
                "status": self.draft.status,
                "source": "<!--PDF:BODY--><div>updated</div>",
            },
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        patch_response = self.client.patch(
            reverse("pdf-templates-detail", kwargs={"id": self.draft.id}),
            data={"source": "<!--PDF:BODY--><div>patched</div>"},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)

        draft_to_delete = PdfTemplate.objects.create(
            typ="bericht",
            bezeichnung="einsatz",
            version=99,
            status=PdfTemplate.Status.DRAFT,
            source="<!--PDF:BODY--><div>del</div>",
        )
        delete_response = self.client.delete(
            reverse("pdf-templates-detail", kwargs={"id": draft_to_delete.id}),
            format="json",
        )
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        self.client.force_authenticate(user=self.member)
        blocked_render = self.client.post(
            reverse("pdf-template-render", kwargs={"id": self.draft.id}),
            data={},
            format="json",
        )
        self.assertEqual(blocked_render.status_code, status.HTTP_400_BAD_REQUEST)
