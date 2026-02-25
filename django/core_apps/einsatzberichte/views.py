import logging

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

    @action(detail=False, methods=["get"], url_path="blaulichtsms/prefill")
    def blaulichtsms_prefill(self, request):
        einsatz_id = request.query_params.get("einsatz_id", "").strip()
        if not einsatz_id:
            return Response({"detail": "einsatz_id fehlt."}, status=status.HTTP_400_BAD_REQUEST)

        base_url = getattr(settings, "BLAULICHTSMS_API_URL", "").strip()
        token = getattr(settings, "BLAULICHTSMS_API_TOKEN", "").strip()
        timeout = getattr(settings, "BLAULICHTSMS_TIMEOUT", 10)

        if not base_url or not token:
            return Response(
                {
                    "detail": "BlaulichtSMS ist nicht konfiguriert.",
                    "configured": False,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        url = f"{base_url.rstrip('/')}/einsaetze/{einsatz_id}"
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

        try:
            response = requests.get(url, headers=headers, timeout=timeout)
            response.raise_for_status()
            payload = response.json() if response.content else {}
        except requests.RequestException as exc:
            logger.exception("BlaulichtSMS prefill failed for einsatz_id=%s", einsatz_id)
            return Response(
                {"detail": "BlaulichtSMS konnte nicht abgefragt werden.", "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        mapped = {
            "einsatzleiter": payload.get("einsatzleiter", ""),
            "einsatzart": payload.get("einsatzart", ""),
            "alarmstichwort": payload.get("alarmstichwort", ""),
            "einsatzadresse": payload.get("einsatzadresse", ""),
            "alarmierende_stelle": payload.get("alarmierende_stelle", ""),
            "einsatz_datum": payload.get("einsatz_datum", None),
            "ausgerueckt": payload.get("ausgerueckt", None),
            "eingerueckt": payload.get("eingerueckt", None),
            "blaulichtsms_einsatz_id": einsatz_id,
            "blaulichtsms_payload": payload,
        }

        return Response({"configured": True, "mapped": mapped, "raw": payload})