from rest_framework import permissions
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from .models import FMD
from .serializers import FMDSerializer
from core_apps.common.permissions import HasAnyRolePermission
from core_apps.mitglieder.models import Mitglied
from core_apps.mitglieder.serializers import MitgliedSerializer
from core_apps.modul_konfiguration.models import ModulKonfiguration
from core_apps.modul_konfiguration.serializers import ModulKonfigurationSerializer
from core_apps.konfiguration.models import Konfiguration
from core_apps.konfiguration.serializers import KonfigurationSerializer


class FMDViewSet(ModelViewSet):
    queryset = FMD.objects.all()
    serializer_class = FMDSerializer    
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN","FMD")]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None 


class FMDContextView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN", "FMD")]

    def get(self, request):
        mitglieder = MitgliedSerializer(Mitglied.objects.all(), many=True).data
        modul_konfig = ModulKonfigurationSerializer(ModulKonfiguration.objects.all(), many=True).data
        konfig = KonfigurationSerializer(Konfiguration.objects.all(), many=True).data
        return Response({"mitglieder": mitglieder, "modul_konfig": modul_konfig, "konfig": konfig})
