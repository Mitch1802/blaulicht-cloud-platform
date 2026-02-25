import logging
from rest_framework import permissions, filters
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser
from rest_framework.viewsets import ModelViewSet

from core_apps.common.logging_utils import log_event, log_exception
from .models import Inventar
from .serializers import InventarSerializer
from core_apps.common.permissions import HasAnyRolePermission

logger = logging.getLogger(__name__)
LOG_SOURCE = "inventar"


def _is_default(name: str) -> bool:
    return not name

class InventarViewSet(ModelViewSet):
    queryset = Inventar.objects.all().order_by("bezeichnung")
    serializer_class = InventarSerializer
    permission_classes = [permissions.IsAuthenticated, HasAnyRolePermission.with_roles("ADMIN","INVENTAR")]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    lookup_field = "id"
    pagination_class = None 
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["bezeichnung"]
    ordering = ["bezeichnung"]

    def create(self, request, *args, **kwargs):
        log_event(
            logger,
            LOG_SOURCE,
            "create_request_received",
            files=list(request.FILES.keys()),
            data=list(request.data.keys()),
        )
        return super().create(request, *args, **kwargs)

    # --- Bildwechsel: altes Bild nur löschen, wenn wirklich ersetzt ---
    def perform_update(self, serializer):
        instance = self.get_object()
        old_name = instance.foto.name if getattr(instance, "foto", None) else None
        saved = serializer.save()
        new_name = saved.foto.name if getattr(saved, "foto", None) else None

        if old_name and new_name and old_name != new_name and not _is_default(old_name):
            try:
                log_event(logger, LOG_SOURCE, "old_image_delete", old_name=old_name)
                saved.foto.storage.delete(old_name)
            except Exception:
                log_exception(logger, LOG_SOURCE, "old_image_delete_failed", old_name=old_name)

    # --- Löschen: Datei aus Storage entfernen (sofern nicht Default) ---
    def perform_destroy(self, instance):
        name = instance.foto.name if getattr(instance, "foto", None) else None
        super().perform_destroy(instance)
        if name and not _is_default(name):
            try:
                log_event(logger, LOG_SOURCE, "destroy_image_delete", image_name=name)
                instance.foto.storage.delete(name)
            except Exception:
                log_exception(logger, LOG_SOURCE, "destroy_image_delete_failed", image_name=name)