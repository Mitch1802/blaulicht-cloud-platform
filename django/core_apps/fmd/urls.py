from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FMDViewSet, FMDContextView


router = DefaultRouter()
router.register(r"", FMDViewSet, basename="fmd")

urlpatterns = [
    path("context/", FMDContextView.as_view(), name="fmd-context"),
    path("", include(router.urls)),
]