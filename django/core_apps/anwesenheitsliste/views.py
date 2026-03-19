import logging

from rest_framework import permissions
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from core_apps.common.permissions import HasAnyRolePermission
from core_apps.mitglieder.models import Mitglied
from core_apps.mitglieder.serializers import MitgliedSerializer

from .models import Anwesenheitsliste
from .serializers import AnwesenheitslisteSerializer


logger = logging.getLogger(__name__)


class AnwesenheitslisteViewSet(ModelViewSet):
    queryset = Anwesenheitsliste.objects.prefetch_related("mitglieder", "fotos").all()
    serializer_class = AnwesenheitslisteSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "ANWESENHEIT"),
    ]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    lookup_field = "id"
    pagination_class = None

    def destroy(self, request, *args, **kwargs):
        eintrag = self.get_object()
        foto_files = [
            (f.foto.storage, f.foto.name)
            for f in eintrag.fotos.all()
            if getattr(f, "foto", None) and getattr(f.foto, "name", "")
        ]

        response = super().destroy(request, *args, **kwargs)

        for storage, name in foto_files:
            try:
                storage.delete(name)
            except Exception:
                logger.exception("Anwesenheitsliste-Foto '%s' konnte nicht gelöscht werden.", name)

        return response

    @action(detail=True, methods=["delete"], url_path=r"fotos/(?P<foto_id>[^/.]+)")
    def foto_loeschen(self, request, id=None, foto_id=None):
        eintrag = self.get_object()
        foto = eintrag.fotos.filter(id=foto_id).first()

        if foto is None:
            return Response({"detail": "Foto nicht gefunden."}, status=status.HTTP_404_NOT_FOUND)

        storage = foto.foto.storage if foto.foto else None
        name = foto.foto.name if foto.foto else ""

        foto.delete()

        if storage and name:
            try:
                storage.delete(name)
            except Exception:
                logger.exception("Einzelfoto '%s' konnte nicht gelöscht werden.", name)

        return Response(status=status.HTTP_204_NO_CONTENT)


class AnwesenheitslisteContextView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "ANWESENHEIT"),
    ]

    def get(self, request):
        mitglieder = MitgliedSerializer(
            Mitglied.objects.exclude(
                dienststatus__in=[Mitglied.Dienststatus.ABGEMELDET, Mitglied.Dienststatus.RESERVE]
            ),
            many=True,
        ).data
        return Response({"mitglieder": mitglieder})
