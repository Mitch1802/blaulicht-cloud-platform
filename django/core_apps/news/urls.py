from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import NewsViewSet, PublicNewsViewSet, NewsTemplateViewSet

router = DefaultRouter()
router.register(r"intern", NewsViewSet, basename="news")
router.register(r'public', PublicNewsViewSet, basename='public-news')
router.register(r"templates", NewsTemplateViewSet, basename="news-template")

urlpatterns = [
    path("", include(router.urls)),
]
