from rest_framework import permissions, filters, status
from rest_framework.parsers import JSONParser
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Mitglied, JugendEvent
from .serializers import MitgliedSerializer, JugendEventSerializer
from core_apps.common.permissions import HasAnyRolePermission


class MitgliedViewSet(ModelViewSet):
    queryset = Mitglied.objects.all().order_by("stbnr")
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
        """
        Erwartet eine Liste von Mitglied-Objekten.
        Importiert nur neue (stbnr unique),
        überspringt vorhandene und liefert eine Zusammenfassung zurück.
        """

        if not isinstance(request.data, list):
            return Response(
                {"detail": "Request body muss eine Liste sein"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existing_stbnr = set(
            Mitglied.objects.values_list("stbnr", flat=True)
        )

        to_create = []
        skipped = []

        for index, item in enumerate(request.data, start=1):
            stbnr = item.get("stbnr")

            if stbnr is None:
                return Response(
                    {
                        "detail": f"stbnr fehlt in Zeile {index}",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if stbnr in existing_stbnr:
                skipped.append({
                    "row": index,
                    "stbnr": stbnr,
                    "reason": "bereits vorhanden",
                })
                continue

            serializer = self.get_serializer(data=item)
            serializer.is_valid(raise_exception=True)

            to_create.append(
                Mitglied(**serializer.validated_data)
            )
            existing_stbnr.add(stbnr)

        Mitglied.objects.bulk_create(to_create)

        return Response(
            {
                "created": len(to_create),
                "skipped": skipped,
            },
            status=status.HTTP_201_CREATED,
        )


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
