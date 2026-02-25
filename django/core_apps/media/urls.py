from django.urls import path
from .views import MediaNewsGetFileView, MediaInventarGetFileView, MediaCleanupOrphansView


urlpatterns = [
    path("news/<str:filename>", MediaNewsGetFileView.as_view(), name="news-file-get"),
    path("inventar/<str:filename>", MediaInventarGetFileView.as_view(), name="inventar-file-get"),
    path("cleanup-orphans/", MediaCleanupOrphansView.as_view(), name="media-cleanup-orphans"),
]
