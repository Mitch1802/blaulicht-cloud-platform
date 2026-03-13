from collections import OrderedDict
from typing import Any, cast

from django.conf import settings
from django.db import transaction
from rest_framework import filters, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from core_apps.common.permissions import HasAnyRolePermission
from core_apps.mitglieder.models import Mitglied
from core_apps.mitglieder.serializers import MitgliedSerializer

from .models import HomepageDienstposten
from .serializers import HomepageDienstpostenSerializer, dienstgrad_to_image_filename


def _build_member_photo_path(stbnr: Any) -> str:
    media_prefix = str(getattr(settings, "MEDIA_URL", "/")).rstrip("/") + "/"
    return f"{media_prefix}homepage/mitglieder/{stbnr}.jpg"


def _resolve_photo_value(row: HomepageDienstposten) -> str:
    photo_field = getattr(row, "photo", None)
    if photo_field and getattr(photo_field, "name", ""):
        try:
            return photo_field.url
        except Exception:
            pass

    if row.mitglied and row.mitglied.stbnr not in (None, ""):
        return _build_member_photo_path(row.mitglied.stbnr)

    fallback_photo = (row.fallback_photo or "").strip()
    if fallback_photo and fallback_photo.upper() != "X":
        if fallback_photo.isdigit():
            return _build_member_photo_path(fallback_photo)
        return fallback_photo

    return "X"


def _delete_row_photo_file(row: HomepageDienstposten) -> None:
    photo_field = getattr(row, "photo", None)
    if not photo_field or not getattr(photo_field, "name", ""):
        return

    storage = photo_field.storage
    name = photo_field.name
    try:
        storage.delete(name)
    except Exception:
        pass


def _build_public_member_payload(row: HomepageDienstposten) -> dict[str, str]:
    mitglied = row.mitglied

    if mitglied is not None:
        name = f"{mitglied.vorname} {mitglied.nachname}".strip() or row.fallback_name or "Nicht definiert"
        dienstgrad = (mitglied.dienstgrad or row.fallback_dienstgrad or "").strip()
        photo = _resolve_photo_value(row)
    else:
        name = (row.fallback_name or "Nicht definiert").strip()
        dienstgrad = (row.fallback_dienstgrad or "").strip()
        photo = _resolve_photo_value(row)

    dienstgrad_img = (row.fallback_dienstgrad_img or dienstgrad_to_image_filename(dienstgrad)).strip()

    return {
        "photo": photo,
        "name": name,
        "dienstgrad": dienstgrad,
        "dienstgrad_img": dienstgrad_img,
        "position": row.position,
    }


def _build_public_sections(rows) -> dict[str, list[dict]]:
    grouped: OrderedDict[str, dict[str, Any]] = OrderedDict()

    for row in rows:
        section_id = (row.section_id or "sektion").strip() or "sektion"
        section_title = (row.section_title or section_id).strip() or section_id

        section = grouped.setdefault(
            section_id,
            {
                "id": section_id,
                "title": section_title,
                "members": [],
            },
        )
        members = cast(list[dict[str, str]], section["members"])
        members.append(_build_public_member_payload(row))

    return {"sections": list(grouped.values())}


class HomepageDienstpostenViewSet(ModelViewSet):
    queryset = HomepageDienstposten.objects.select_related("mitglied").all()
    serializer_class = HomepageDienstpostenSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "VERWALTUNG"),
    ]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    lookup_field = "id"
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["section_order", "position_order", "section_title", "position", "created_at"]
    ordering = ["section_order", "position_order", "position", "pkid"]

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk_upsert(self, request):
        rows = request.data.get("rows")
        replace = bool(request.data.get("replace", True))

        if not isinstance(rows, list):
            return Response({"detail": "'rows' muss eine Liste sein."}, status=status.HTTP_400_BAD_REQUEST)

        existing_entries = list(self.get_queryset())
        existing_by_id = {str(entry.id): entry for entry in existing_entries}
        saved_ids = []

        with transaction.atomic():
            for index, row_data in enumerate(rows, start=1):
                if not isinstance(row_data, dict):
                    return Response(
                        {"detail": f"Eintrag {index} ist kein Objekt."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                row_id = str(row_data.get("id") or "").strip()
                if row_id:
                    instance = existing_by_id.get(row_id)
                    if instance is None:
                        return Response(
                            {"detail": f"Unbekannte ID in Eintrag {index}: {row_id}"},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    serializer = self.get_serializer(instance, data=row_data)
                else:
                    serializer = self.get_serializer(data=row_data)

                serializer.is_valid(raise_exception=True)
                saved = serializer.save()
                saved_ids.append(saved.id)

            if replace:
                if saved_ids:
                    rows_to_delete = list(self.get_queryset().exclude(id__in=saved_ids))
                    for row in rows_to_delete:
                        _delete_row_photo_file(row)
                    self.get_queryset().exclude(id__in=saved_ids).delete()
                else:
                    rows_to_delete = list(self.get_queryset())
                    for row in rows_to_delete:
                        _delete_row_photo_file(row)
                    self.get_queryset().delete()

        if not saved_ids:
            return Response([], status=status.HTTP_200_OK)

        saved_rows = self.get_queryset().filter(id__in=saved_ids)
        return Response(self.get_serializer(saved_rows, many=True).data, status=status.HTTP_200_OK)

    def perform_destroy(self, instance):
        _delete_row_photo_file(instance)
        super().perform_destroy(instance)


class PublicHomepageViewSet(ReadOnlyModelViewSet):
    queryset = HomepageDienstposten.objects.select_related("mitglied").all()
    serializer_class = HomepageDienstpostenSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "id"
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["section_order", "position_order", "section_title", "position"]
    ordering = ["section_order", "position_order", "position", "pkid"]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        return Response(_build_public_sections(queryset), status=status.HTTP_200_OK)


class HomepageContextView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "VERWALTUNG"),
    ]

    def get(self, request):
        mitglieder = MitgliedSerializer(
            Mitglied.objects.exclude(
                dienststatus__in=[Mitglied.Dienststatus.ABGEMELDET, Mitglied.Dienststatus.RESERVE]
            ),
            many=True,
        ).data
        return Response({"mitglieder": mitglieder}, status=status.HTTP_200_OK)
