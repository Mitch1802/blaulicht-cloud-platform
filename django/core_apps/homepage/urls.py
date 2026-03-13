from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import HomepageContextView, HomepageDienstpostenViewSet, PublicHomepageViewSet

router = DefaultRouter()
router.register(r"intern", HomepageDienstpostenViewSet, basename="homepage")
router.register(r"public", PublicHomepageViewSet, basename="public-homepage")

urlpatterns = [
    path("context/", HomepageContextView.as_view(), name="homepage-context"),
    path("", include(router.urls)),
]
