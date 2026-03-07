from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    FahrzeugViewSet,
    FahrzeugRaumViewSet,
    RaumItemViewSet,
    FahrzeugCheckCreateView,
    PublicPinVerifyView,
    PublicFahrzeugListView,
    PublicFahrzeugDetailView,
)

router = DefaultRouter()
router.register(r"fahrzeuge", FahrzeugViewSet, basename="fahrzeuge")

urlpatterns = [
    # -------------------------
    # PUBLIC (globaler PIN)
    # -------------------------
    path("public/pin/verify/", PublicPinVerifyView.as_view()),
    path("public/fahrzeuge/", PublicFahrzeugListView.as_view()),
    path("public/fahrzeuge/<str:public_id>/", PublicFahrzeugDetailView.as_view()),

    # -------------------------
    # AUTH: CHECK speichern
    # -------------------------
    path("fahrzeuge/<uuid:fahrzeug_id>/checks/", FahrzeugCheckCreateView.as_view()),

    # -------------------------
    # NESTED: RÄUME
    # -------------------------
    path(
        "fahrzeuge/<uuid:fahrzeug_id>/raeume/",
        FahrzeugRaumViewSet.as_view({"get": "list", "post": "create"}),
    ),
    path(
        "fahrzeuge/<uuid:fahrzeug_id>/raeume/<uuid:id>/",
        FahrzeugRaumViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
    ),

    # -------------------------
    # NESTED: ITEMS
    # -------------------------
    path(
        "raeume/<uuid:raum_id>/items/",
        RaumItemViewSet.as_view({"get": "list", "post": "create"}),
    ),
    path(
        "raeume/<uuid:raum_id>/items/<uuid:id>/",
        RaumItemViewSet.as_view({"get": "retrieve", "patch": "partial_update", "delete": "destroy"}),
    ),
]

urlpatterns += router.urls
