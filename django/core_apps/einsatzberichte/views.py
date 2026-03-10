import logging
from datetime import datetime
from urllib.parse import quote

import requests
from django.conf import settings
from rest_framework import filters, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core_apps.common.logging_utils import log_event, log_exception
from core_apps.common.permissions import HasAnyRolePermission
from core_apps.fahrzeuge.models import Fahrzeug
from core_apps.mitglieder.models import Mitglied

from .models import Einsatzbericht, EinsatzberichtFoto, MitalarmierteStelle
from .serializers import EinsatzberichtSerializer

logger = logging.getLogger(__name__)
LOG_SOURCE = "einsatzberichte"


class EinsatzberichtViewSet(ModelViewSet):
    queryset = Einsatzbericht.objects.prefetch_related("fahrzeuge", "mitglieder", "mitalarmierte_stellen", "fotos").all()
    serializer_class = EinsatzberichtSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "BERICHT", "VERWALTUNG"),
    ]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    lookup_field = "id"
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "einsatz_datum", "status", "alarmstichwort"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if getattr(self, "action", None) == "destroy":
            permission_classes = [
                permissions.IsAuthenticated,
                HasAnyRolePermission.with_roles("ADMIN", "VERWALTUNG"),
            ]
            return [permission() for permission in permission_classes]
        return super().get_permissions()

    def _can_manage_status(self, user) -> bool:
        return bool(
            getattr(user, "is_authenticated", False)
            and hasattr(user, "has_any_role")
            and user.has_any_role("ADMIN", "VERWALTUNG")
        )

    def _can_edit_report_content(self, user) -> bool:
        return bool(
            getattr(user, "is_authenticated", False)
            and hasattr(user, "has_any_role")
            and user.has_any_role("ADMIN", "BERICHT")
        )

    def _status_will_change(self, incoming_status, instance=None) -> bool:
        if incoming_status is None:
            return False

        normalized_status = str(incoming_status).strip()
        if not normalized_status:
            return False

        if instance is None:
            return normalized_status != Einsatzbericht.Status.ENTWURF

        return normalized_status != instance.status

    def _validate_edit_permissions(self, request, instance=None):
        payload_keys = {str(key) for key in request.data.keys()}
        has_content_changes = bool(payload_keys - {"status"})
        status_will_change = self._status_will_change(request.data.get("status"), instance=instance)

        if has_content_changes and not self._can_edit_report_content(request.user):
            self.permission_denied(
                request,
                message="Nur Bericht oder Admin duerfen Einsatzbericht-Inhalte bearbeiten.",
            )

        if status_will_change and not self._can_manage_status(request.user):
            self.permission_denied(
                request,
                message="Nur Verwaltung oder Admin duerfen den Status aendern.",
            )

    def create(self, request, *args, **kwargs):
        self._validate_edit_permissions(request, instance=None)
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        self._validate_edit_permissions(request, instance=instance)
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        self._validate_edit_permissions(request, instance=instance)
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        bericht = self.get_object()
        foto_files = [
            (f.foto.storage, f.foto.name)
            for f in bericht.fotos.all()
            if getattr(f, "foto", None) and getattr(f.foto, "name", "")
        ]

        response = super().destroy(request, *args, **kwargs)

        for storage, name in foto_files:
            try:
                storage.delete(name)
            except Exception:
                log_exception(logger, LOG_SOURCE, "report_file_delete_failed", bericht_id=bericht.id, file=name)

        return response

    @action(detail=False, methods=["get"], url_path="context")
    def context(self, request):
        fahrzeuge = [
            {
                "pkid": f.pkid,
                "id": str(f.id),
                "name": f.name,
                "bezeichnung": f.bezeichnung,
            }
            for f in Fahrzeug.objects.all().order_by("name")
        ]

        mitglieder = [
            {
                "pkid": m.pkid,
                "id": str(m.id),
                "stbnr": m.stbnr,
                "vorname": m.vorname,
                "nachname": m.nachname,
            }
            for m in Mitglied.objects.exclude(dienststatus=Mitglied.Dienststatus.RESERVE).order_by("stbnr")
        ]

        mitalarmiert_stellen = [
            {
                "pkid": stelle.pkid,
                "id": str(stelle.id),
                "name": stelle.name,
            }
            for stelle in MitalarmierteStelle.objects.all().order_by("name")
        ]

        return Response({
            "fahrzeuge": fahrzeuge,
            "mitglieder": mitglieder,
            "mitalarmiert_stellen": mitalarmiert_stellen,
        })

    @action(detail=False, methods=["get"], url_path="blaulichtsms/letzter")
    def blaulichtsms_letzter(self, request):
        base_url = getattr(settings, "BLAULICHTSMS_API_URL", "").strip()
        session_id = getattr(settings, "BLAULICHTSMS_DASHBOARD_SESSION_ID", "").strip()
        timeout = getattr(settings, "BLAULICHTSMS_TIMEOUT", 10)

        if not base_url or not session_id:
            return Response(
                {
                    "detail": "BlaulichtSMS ist nicht konfiguriert.",
                    "configured": False,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        payload = self._fetch_blaulichtsms_payload(
            base_url=base_url,
            session_id=session_id,
            timeout=timeout,
        )

        if payload is None:
            return Response(
                {"detail": "Letzter BlaulichtSMS Alarm konnte nicht geladen werden."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        mapped = self._map_blaulichtsms_payload(payload)
        return Response({"configured": True, "mapped": mapped, "raw": payload})

    def _fetch_blaulichtsms_payload(
        self,
        base_url: str,
        session_id: str,
        timeout: int,
    ):
        url = f"{base_url.rstrip('/')}/api/alarm/v1/dashboard/{quote(session_id, safe='')}"
        headers = {"Accept": "application/json"}

        try:
            response = requests.get(url, headers=headers, timeout=timeout)
            response.raise_for_status()
            payload = response.json() if response.content else {}
        except requests.HTTPError as exc:
            response = exc.response
            if response is not None and response.status_code == status.HTTP_401_UNAUTHORIZED:
                log_event(logger, LOG_SOURCE, "blaulichtsms_dashboard_session_invalid", level="error", endpoint="dashboard", url=url)
            else:
                log_exception(logger, LOG_SOURCE, "blaulichtsms_request_failed", endpoint="dashboard", url=url)
            return None
        except requests.RequestException:
            log_exception(logger, LOG_SOURCE, "blaulichtsms_request_failed", endpoint="dashboard", url=url)
            return None

        if not isinstance(payload, dict):
            log_event(logger, LOG_SOURCE, "blaulichtsms_invalid_payload", level="error", payload_type=type(payload).__name__)
            return None

        alarms = payload.get("alarms")
        if not isinstance(alarms, list) or not alarms:
            return None

        valid_alarms = [alarm for alarm in alarms if isinstance(alarm, dict)]
        if not valid_alarms:
            return None

        return max(valid_alarms, key=self._alarm_sort_key)

    def _alarm_sort_key(self, payload: dict) -> float:
        alarm_date = self._parse_iso_datetime(payload.get("alarmDate"))
        return alarm_date.timestamp() if alarm_date else float("-inf")

    def _parse_iso_datetime(self, value):
        if not value or not isinstance(value, str):
            return None

        normalized = value.strip()
        if not normalized:
            return None

        if normalized.endswith("Z"):
            normalized = f"{normalized[:-1]}+00:00"

        try:
            return datetime.fromisoformat(normalized)
        except ValueError:
            return None


    def _map_blaulichtsms_payload(self, payload: dict) -> dict:
        einsatz_id = (
            str(payload.get("alarmId") or payload.get("einsatz_id") or payload.get("id") or "").strip()
        )
        alarm_date = self._parse_iso_datetime(payload.get("alarmDate"))
        alarm_groups = payload.get("alarmGroups") if isinstance(payload.get("alarmGroups"), list) else []
        first_group = alarm_groups[0] if alarm_groups and isinstance(alarm_groups[0], dict) else {}

        return {
            "einsatzart": payload.get("type", ""),
            "alarmstichwort": payload.get("alarmText", ""),
            "alarmierende_stelle": first_group.get("authorName", ""),
            "einsatz_datum": alarm_date.date().isoformat() if alarm_date else None,
            "ausgerueckt": alarm_date.strftime("%H:%M") if alarm_date else None,
            "blaulichtsms_einsatz_id": einsatz_id,
            "blaulichtsms_payload": payload,
        }

    @action(detail=True, methods=["delete"], url_path=r"fotos/(?P<foto_id>[^/.]+)")
    def foto_loeschen(self, request, id=None, foto_id=None):
        bericht = self.get_object()
        foto = bericht.fotos.filter(id=foto_id).first()

        if foto is None:
            log_event(logger, LOG_SOURCE, "photo_not_found", level="warning", bericht_id=bericht.id, foto_id=foto_id)
            return Response({"detail": "Foto nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        storage = foto.foto.storage if foto.foto else None
        name = foto.foto.name if foto.foto else ""

        foto.delete()

        if storage and name:
            try:
                storage.delete(name)
            except Exception:
                log_exception(logger, LOG_SOURCE, "photo_file_delete_failed", bericht_id=bericht.id, foto_id=foto_id, file=name)

        return Response(status=status.HTTP_204_NO_CONTENT)