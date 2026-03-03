from rest_framework import permissions, filters, status
from rest_framework.parsers import JSONParser
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response
from datetime import datetime

from .models import Mitglied, JugendEvent
from .serializers import MitgliedSerializer, JugendEventSerializer
from core_apps.common.permissions import HasAnyRolePermission


class MitgliedViewSet(ModelViewSet):
    queryset = Mitglied.objects.exclude(
        dienststatus__in=[Mitglied.Dienststatus.ABGEMELDET, Mitglied.Dienststatus.RESERVE]
    ).order_by("stbnr")
    serializer_class = MitgliedSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN"),
    ]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None

    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["stbnr", "nachname", "vorname"]
    ordering = ["stbnr", "nachname", "vorname"]

    @action(detail=False, methods=["post"], url_path="import")
    def import_list(self, request):
        payload = request.data
        mode = "apply"
        rows = payload

        if isinstance(payload, dict):
            mode = str(payload.get("mode") or "preview").lower()
            rows = payload.get("rows", [])

        if not isinstance(rows, list):
            return Response(
                {"detail": "Request body muss eine Liste sein oder {'mode','rows'} enthalten."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if mode not in {"preview", "apply"}:
            return Response(
                {"detail": "mode muss 'preview' oder 'apply' sein."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        changes = []
        created_count = 0
        updated_count = 0
        unchanged_count = 0

        for index, raw_item in enumerate(rows, start=1):
            item = self._normalize_import_item(raw_item)
            stbnr = item.get("stbnr")
            geburtsdatum = item.get("geburtsdatum")

            if stbnr is None:
                return Response(
                    {"detail": f"stbnr fehlt in Zeile {index}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not geburtsdatum:
                return Response(
                    {"detail": f"geburtsdatum fehlt in Zeile {index}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            parsed_date = self._parse_date(geburtsdatum)
            if parsed_date is None:
                return Response(
                    {"detail": f"geburtsdatum ungültig in Zeile {index}: {geburtsdatum}"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            existing = Mitglied.objects.filter(stbnr=stbnr).first()

            mapped_status = self._map_status(item.get("dienststatus"))
            new_values = {
                "stbnr": stbnr,
                "vorname": item.get("vorname") or "",
                "nachname": item.get("nachname") or "",
                "dienstgrad": item.get("dienstgrad") or "",
                "dienststatus": mapped_status,
                "geburtsdatum": parsed_date,
            }

            if existing is None:
                changes.append(
                    {
                        "action": "CREATE",
                        "row": index,
                        "stbnr": stbnr,
                        "geburtsdatum": str(parsed_date),
                        "name": f"{new_values['vorname']} {new_values['nachname']}".strip(),
                        "changed_fields": ["vorname", "nachname", "dienstgrad", "dienststatus"],
                        "old": None,
                        "new": {
                            "vorname": new_values["vorname"],
                            "nachname": new_values["nachname"],
                            "dienstgrad": new_values["dienstgrad"],
                            "dienststatus": new_values["dienststatus"],
                        },
                    }
                )

                if mode == "apply":
                    Mitglied.objects.create(
                        stbnr=new_values["stbnr"],
                        vorname=new_values["vorname"],
                        nachname=new_values["nachname"],
                        dienstgrad=new_values["dienstgrad"],
                        dienststatus=new_values["dienststatus"],
                        geburtsdatum=new_values["geburtsdatum"],
                    )
                    created_count += 1
                continue

            changed_fields = []
            if existing.vorname != new_values["vorname"]:
                changed_fields.append("vorname")
            if existing.nachname != new_values["nachname"]:
                changed_fields.append("nachname")
            if (existing.dienstgrad or "") != new_values["dienstgrad"]:
                changed_fields.append("dienstgrad")
            if existing.dienststatus != new_values["dienststatus"]:
                changed_fields.append("dienststatus")
            if existing.geburtsdatum != new_values["geburtsdatum"]:
                changed_fields.append("geburtsdatum")

            if not changed_fields:
                unchanged_count += 1
                continue

            changes.append(
                {
                    "action": "UPDATE",
                    "row": index,
                    "stbnr": stbnr,
                    "geburtsdatum": str(parsed_date),
                    "name": f"{new_values['vorname']} {new_values['nachname']}".strip(),
                    "changed_fields": changed_fields,
                    "old": {
                        "vorname": existing.vorname,
                        "nachname": existing.nachname,
                        "dienstgrad": existing.dienstgrad,
                        "dienststatus": existing.dienststatus,
                        "geburtsdatum": str(existing.geburtsdatum),
                    },
                    "new": {
                        "vorname": new_values["vorname"],
                        "nachname": new_values["nachname"],
                        "dienstgrad": new_values["dienstgrad"],
                        "dienststatus": new_values["dienststatus"],
                        "geburtsdatum": str(new_values["geburtsdatum"]),
                    },
                }
            )

            if mode == "apply":
                existing.vorname = new_values["vorname"]
                existing.nachname = new_values["nachname"]
                existing.dienstgrad = new_values["dienstgrad"]
                existing.dienststatus = new_values["dienststatus"]
                existing.geburtsdatum = new_values["geburtsdatum"]
                existing.save(update_fields=["vorname", "nachname", "dienstgrad", "dienststatus", "geburtsdatum", "updated_at"])
                updated_count += 1

        return Response(
            {
                "mode": mode,
                "changes": changes,
                "summary": {
                    "created": created_count,
                    "updated": updated_count,
                    "unchanged": unchanged_count,
                    "total_changes": len(changes),
                    "total_rows": len(rows),
                },
            },
            status=status.HTTP_200_OK,
        )

    def _normalize_import_item(self, raw_item):
        data = {}
        for key, value in (raw_item or {}).items():
            data[str(key).strip().lower()] = value

        stbnr = data.get("stbnr")
        try:
            stbnr = int(str(stbnr).strip()) if stbnr not in (None, "") else None
        except ValueError:
            stbnr = None

        return {
            "stbnr": stbnr,
            "vorname": str(data.get("vorname") or "").strip(),
            "nachname": str(data.get("zuname") or data.get("nachname") or "").strip(),
            "dienstgrad": str(data.get("dienstgrad") or "").strip(),
            "dienststatus": str(data.get("status") or data.get("dienststatus") or "").strip(),
            "geburtsdatum": str(data.get("geburtsdatum") or "").strip(),
        }

    def _parse_date(self, value):
        if not value:
            return None
        value = str(value).strip()

        for fmt in ("%d.%m.%Y", "%Y-%m-%d"):
            try:
                return datetime.strptime(value, fmt).date()
            except ValueError:
                continue
        return None

    def _map_status(self, value):
        incoming = str(value or "").strip().upper()
        if incoming in {
            Mitglied.Dienststatus.JUGEND,
            Mitglied.Dienststatus.AKTIV,
            Mitglied.Dienststatus.RESERVE,
            Mitglied.Dienststatus.ABGEMELDET,
        }:
            return incoming
        if incoming == "RESERVIST":
            return Mitglied.Dienststatus.RESERVE
        return Mitglied.Dienststatus.AKTIV


class JugendEventViewSet(ModelViewSet):
    queryset = JugendEvent.objects.all().order_by("-datum", "titel")
    serializer_class = JugendEventSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN"),
    ]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None
