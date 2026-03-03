from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import JugendAusbildungViewSet, JugendEventViewSet

router = DefaultRouter()
router.register(r"ausbildung", JugendAusbildungViewSet, basename="jugend-ausbildung")
router.register(r"events", JugendEventViewSet, basename="jugend-events")

urlpatterns = [
    path("", include(router.urls)),
]
