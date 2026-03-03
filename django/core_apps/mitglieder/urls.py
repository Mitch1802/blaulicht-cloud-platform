from django.urls import path, include
from .views import MitgliedViewSet

mitglied_list = MitgliedViewSet.as_view({"get": "list", "post": "create"})
mitglied_detail = MitgliedViewSet.as_view({
    "get": "retrieve",
    "put": "update",
    "patch": "partial_update",
    "delete": "destroy",
})
mitglied_import = MitgliedViewSet.as_view({"post": "import_list"})

urlpatterns = [
    path("", mitglied_list, name="mitglied-list"),
    path("import/", mitglied_import, name="mitglied-import"),
    path("<uuid:id>/", mitglied_detail, name="mitglied-detail"),
]