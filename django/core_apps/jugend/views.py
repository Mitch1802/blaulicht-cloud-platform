from rest_framework import filters, permissions, status
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from core_apps.common.permissions import HasAnyRolePermission
from core_apps.mitglieder.models import Mitglied

from .models import JugendAusbildung, JugendEvent
from .serializers import JugendAusbildungSerializer, JugendEventSerializer, JugendMitgliedSerializer
from .services import rebuild_ausbildung_for_mitglieder


class JugendMitgliedViewSet(ModelViewSet):
    queryset = (
        Mitglied.objects.filter(dienststatus=Mitglied.Dienststatus.JUGEND)
        .all()
        .order_by("stbnr")
    )
    serializer_class = JugendMitgliedSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "JUGEND"),
    ]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["stbnr", "nachname", "vorname", "updated_at"]
    ordering = ["stbnr", "nachname", "vorname"]
    http_method_names = ["get", "patch", "head", "options"]

    def partial_update(self, request, *args, **kwargs):
        unerlaubte_felder = set(request.data.keys()) - {"dienststatus"}
        if unerlaubte_felder:
            return Response(
                {"detail": "Es darf nur der Dienststatus geaendert werden."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().partial_update(request, *args, **kwargs)


class JugendAusbildungViewSet(ModelViewSet):
    queryset = JugendAusbildung.objects.select_related("mitglied").all().order_by("mitglied__stbnr")
    serializer_class = JugendAusbildungSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "JUGEND"),
    ]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["mitglied__stbnr", "created_at", "updated_at"]
    ordering = ["mitglied__stbnr"]

    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(mitglied__dienststatus=Mitglied.Dienststatus.JUGEND)
        )


class JugendEventViewSet(ModelViewSet):
    queryset = JugendEvent.objects.prefetch_related(
        "mitglieder_teilgenommen",
        "teilnahmen__mitglied",
    ).all().order_by("-datum", "titel")
    serializer_class = JugendEventSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "JUGEND"),
    ]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["datum", "titel", "created_at"]
    ordering = ["-datum", "titel"]

    def perform_destroy(self, instance):
        betroffene_mitglied_pkids = list(instance.teilnahmen.values_list("mitglied__pkid", flat=True))
        super().perform_destroy(instance)
        rebuild_ausbildung_for_mitglieder(betroffene_mitglied_pkids)
