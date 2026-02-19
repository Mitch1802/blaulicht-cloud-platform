from rest_framework import permissions
from rest_framework.parsers import JSONParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from .models import ModulKonfiguration
from .serializers import ModulKonfigurationSerializer
from core_apps.common.permissions import HasAnyRolePermission, HasReadOnlyRolePermission, any_of
from core_apps.users.models import Role
from core_apps.users.serializers import RoleSerializer
from core_apps.pdf.models import PdfTemplate
from core_apps.pdf.serializers import PdfTemplateSerializer


class ModulKonfigurationViewSet(ModelViewSet):
    queryset = ModulKonfiguration.objects.all().order_by("modul")
    serializer_class = ModulKonfigurationSerializer
    permission_classes = [permissions.IsAuthenticated, any_of(HasAnyRolePermission.with_roles("ADMIN"), HasReadOnlyRolePermission.with_roles("MITGLIED"))]
    parser_classes = [JSONParser]
    lookup_field = "id"
    pagination_class = None 

    def list(self, request, *args, **kwargs):
        resp = super().list(request, *args, **kwargs)
        rollen = RoleSerializer(Role.objects.all(), many=True).data
        pdf = PdfTemplateSerializer(PdfTemplate.objects.all(), many=True).data
        return Response({"main": resp.data, "rollen": rollen, "pdf": pdf, "request": request})
