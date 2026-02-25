import logging
from datetime import datetime

import requests
from django.conf import settings
from rest_framework import filters, permissions, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core_apps.common.permissions import HasAnyRolePermission
from core_apps.fahrzeuge.models import Fahrzeug
from core_apps.mitglieder.models import Mitglied

from .models import Einsatzbericht
from .serializers import EinsatzberichtSerializer

logger = logging.getLogger(__name__)


class EinsatzberichtViewSet(ModelViewSet):
    queryset = Einsatzbericht.objects.prefetch_related("fahrzeuge", "mitglieder", "fotos").all()
    serializer_class = EinsatzberichtSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "BERICHT", "MITGLIED"),
    ]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    lookup_field = "id"
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "einsatz_datum", "status", "alarmstichwort"]
    ordering = ["-created_at"]

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
            for m in Mitglied.objects.all().order_by("stbnr")
        ]

        return Response({"fahrzeuge": fahrzeuge, "mitglieder": mitglieder})

    @action(detail=False, methods=["get"], url_path="blaulichtsms/letzter")
    def blaulichtsms_letzter(self, request):
        base_url = getattr(settings, "BLAULICHTSMS_API_URL", "").strip()
        username = getattr(settings, "BLAULICHTSMS_API_USERNAME", "").strip()
        password = getattr(settings, "BLAULICHTSMS_API_PASSWORD", "").strip()
        customer_ids = [
            str(customer_id).strip()
            for customer_id in getattr(settings, "BLAULICHTSMS_API_CUSTOMER_IDS", [])
            if str(customer_id).strip()
        ]
        timeout = getattr(settings, "BLAULICHTSMS_TIMEOUT", 10)

        if not base_url or not username or not password or not customer_ids:
            return Response(
                {
                    "detail": "BlaulichtSMS ist nicht konfiguriert.",
                    "configured": False,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        payload = self._fetch_blaulichtsms_payload(
            base_url=base_url,
            username=username,
            password=password,
            customer_ids=customer_ids,
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
        username: str,
        password: str,
        customer_ids: list[str],
        timeout: int,
    ):
        url = f"{base_url.rstrip('/')}/api/alarm/v1/list"
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        body = {
            "username": username,
            "password": password,
            "customerIds": customer_ids,
        }

        try:
            response = requests.post(url, headers=headers, json=body, timeout=timeout)
            response.raise_for_status()
            payload = response.json() if response.content else {}
        except requests.RequestException:
            logger.exception("BlaulichtSMS request failed (list) url=%s", url)
            return None

        if not isinstance(payload, dict):
            logger.error("BlaulichtSMS response has invalid format: %s", type(payload).__name__)
            return None

        if payload.get("result") != "OK":
            logger.error(
                "BlaulichtSMS list returned non-OK result=%s description=%s",
                payload.get("result"),
                payload.get("description"),
            )
            return None

        alarms = payload.get("alarms")
        if not isinstance(alarms, list) or not alarms:
            return None

        return alarms[0]

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
        end_date = self._parse_iso_datetime(payload.get("endDate"))

        geolocation = payload.get("geolocation") if isinstance(payload.get("geolocation"), dict) else {}
        alarm_groups = payload.get("alarmGroups") if isinstance(payload.get("alarmGroups"), list) else []
        first_group = alarm_groups[0] if alarm_groups and isinstance(alarm_groups[0], dict) else {}

        return {
            "einsatzleiter": payload.get("authorName", ""),
            "einsatzart": payload.get("type", ""),
            "alarmstichwort": payload.get("alarmText", ""),
            "einsatzadresse": geolocation.get("address", ""),
            "alarmierende_stelle": first_group.get("groupName", ""),
            "einsatz_datum": alarm_date.date().isoformat() if alarm_date else None,
            "ausgerueckt": alarm_date.strftime("%H:%M") if alarm_date else None,
            "eingerueckt": end_date.strftime("%H:%M") if end_date else None,
            "blaulichtsms_einsatz_id": einsatz_id,
            "blaulichtsms_payload": payload,
        }