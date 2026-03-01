from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from core_apps.mitglieder.models import Mitglied
from .models import Anwesenheitsliste


class NullableDateField(serializers.DateField):
    def to_internal_value(self, value):
        if value in (None, ""):
            return None
        return super().to_internal_value(value)


class AnwesenheitslisteSerializer(serializers.ModelSerializer):
    datum = NullableDateField(
        format="%d.%m.%Y",
        input_formats=["%d.%m.%Y", "iso-8601"],
        required=False,
        allow_null=True,
    )
    mitglied_ids = serializers.PrimaryKeyRelatedField(
        source="mitglieder",
        queryset=Mitglied.objects.all(),
        many=True,
        required=True,
    )

    def validate_mitglied_ids(self, value):
        if not value:
            raise ValidationError("Mindestens ein Mitglied ist erforderlich.")
        return value

    class Meta:
        model = Anwesenheitsliste
        fields = [
            "pkid",
            "id",
            "titel",
            "datum",
            "ort",
            "notiz",
            "created_at",
            "updated_at",
            "mitglied_ids",
        ]
