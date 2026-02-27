from rest_framework import permissions
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from core_apps.common.permissions import HasAnyRolePermission
from core_apps.mitglieder.models import Mitglied
from core_apps.mitglieder.serializers import MitgliedSerializer

from .models import Anwesenheitsliste
from .serializers import AnwesenheitslisteSerializer


class AnwesenheitslisteViewSet(ModelViewSet):
    queryset = Anwesenheitsliste.objects.select_related("mitglied_id").all()
    serializer_class = AnwesenheitslisteSerializer
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "VERWALTUNG", "MITGLIED"),
    ]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None


class AnwesenheitslisteContextView(APIView):
    permission_classes = [
        permissions.IsAuthenticated,
        HasAnyRolePermission.with_roles("ADMIN", "VERWALTUNG", "MITGLIED"),
    ]

    def get(self, request):
        mitglieder = MitgliedSerializer(Mitglied.objects.all(), many=True).data
        return Response({"mitglieder": mitglieder})
