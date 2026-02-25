from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import EinsatzberichtViewSet

router = DefaultRouter()
router.register(r"", EinsatzberichtViewSet, basename="einsatzberichte")

urlpatterns = [
    path("", include(router.urls)),
]