from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from core_apps.mitglieder.models import Mitglied
from .models import Anwesenheitsliste, AnwesenheitslisteFoto


class AnwesenheitslisteFotoSerializer(serializers.ModelSerializer):
    foto_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = AnwesenheitslisteFoto
        fields = ["id", "foto", "foto_url", "created_at"]
        read_only_fields = ["id", "foto_url", "created_at"]

    def get_foto_url(self, obj):
        f = getattr(obj, "foto", None)
        try:
            return f.url if f and getattr(f, "name", "") else None
        except Exception:
            return None


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
    fotos = AnwesenheitslisteFotoSerializer(many=True, read_only=True)

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
            "fotos",
        ]

    def _create_uploaded_fotos(self, request, instance):
        if not request:
            return

        for f in request.FILES.getlist("fotos_doku"):
            AnwesenheitslisteFoto.objects.create(
                anwesenheitsliste=instance,
                foto=f,
            )

    def create(self, validated_data):
        request = self.context.get("request")
        mitglieder = validated_data.pop("mitglieder", [])

        instance = Anwesenheitsliste.objects.create(**validated_data)
        instance.mitglieder.set(mitglieder)

        self._create_uploaded_fotos(request, instance)

        return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        mitglieder = validated_data.pop("mitglieder", None)

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if mitglieder is not None:
            instance.mitglieder.set(mitglieder)

        self._create_uploaded_fotos(request, instance)

        return instance
