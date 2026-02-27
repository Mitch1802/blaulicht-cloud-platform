from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AnwesenheitslisteViewSet

router = DefaultRouter()
router.register(r"", AnwesenheitslisteViewSet, basename="anwesenheitsliste")

urlpatterns = [
    path("", include(router.urls)),
]
