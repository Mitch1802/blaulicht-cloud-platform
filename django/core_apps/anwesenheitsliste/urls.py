from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AnwesenheitslisteContextView, AnwesenheitslisteViewSet

router = DefaultRouter()
router.register(r"", AnwesenheitslisteViewSet, basename="anwesenheitsliste")

urlpatterns = [
    path("context/", AnwesenheitslisteContextView.as_view(), name="anwesenheitsliste-context"),
    path("", include(router.urls)),
]
