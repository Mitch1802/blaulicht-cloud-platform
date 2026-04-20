import os
import re

from rest_framework import serializers

from .models import Fahrzeug, FahrzeugRaum, RaumItem, FahrzeugCheckItem


def _foto_url(obj) -> str | None:
    foto = getattr(obj, "foto", None)
    try:
        return foto.url if foto and getattr(foto, "name", "") else None
    except Exception:
        return None


def _sanitize_upload_filename(file):
    if not file:
        return file

    name = getattr(file, "name", "") or "upload"
    name = name.strip()
    if "." not in name or name.lower().endswith((".blob", ".octet-stream")):
        content_type = (getattr(file, "content_type", "") or "image/png").lower()
        ext = content_type.split("/")[-1]
        if ext not in {"jpg", "jpeg", "png"}:
            ext = "png"
        file.name = f"upload.{ext}"
    else:
        base = os.path.basename(name)
        file.name = re.sub(r"[^\w.\-]+", "_", base)

    return file


def _validate_date_window(attrs, instance, from_key: str, to_key: str):
    from_value = attrs.get(from_key, getattr(instance, from_key, None) if instance else None)
    to_value = attrs.get(to_key, getattr(instance, to_key, None) if instance else None)

    if from_value and to_value and to_value < from_value:
        raise serializers.ValidationError({
            to_key: "Das naechste Datum darf nicht vor dem zuletzt erledigten Datum liegen."
        })


# =========================
# LIST
# =========================
class FahrzeugListSerializer(serializers.ModelSerializer):
    foto_url = serializers.SerializerMethodField(read_only=True)

    def get_foto_url(self, obj):
        return _foto_url(obj)

    class Meta:
        model = Fahrzeug
        fields = [
            "id",
            "name",
            "bezeichnung",
            "public_id",
            "service_zuletzt_am",
            "service_naechstes_am",
            "foto_url",
        ]


# =========================
# PUBLIC (PIN) -> ohne IDs von Items/Rooms? (du wolltest public ohne IDs – ok)
# =========================
class RaumItemPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = RaumItem
        fields = [
            "name",
            "menge",
            "einheit",
            "notiz",
            "reihenfolge",
            "wartung_zuletzt_am",
            "wartung_naechstes_am",
        ]


class FahrzeugRaumPublicSerializer(serializers.ModelSerializer):
    items = RaumItemPublicSerializer(many=True, read_only=True)
    foto_url = serializers.SerializerMethodField(read_only=True)

    def get_foto_url(self, obj):
        return _foto_url(obj)

    class Meta:
        model = FahrzeugRaum
        fields = ["name", "reihenfolge", "foto_url", "items"]


class FahrzeugPublicDetailSerializer(serializers.ModelSerializer):
    raeume = FahrzeugRaumPublicSerializer(many=True, read_only=True)
    foto_url = serializers.SerializerMethodField(read_only=True)

    def get_foto_url(self, obj):
        return _foto_url(obj)

    class Meta:
        model = Fahrzeug
        fields = [
            "name",
            "bezeichnung",
            "beschreibung",
            "public_id",
            "service_zuletzt_am",
            "service_naechstes_am",
            "foto_url",
            "raeume",
        ]


class FahrzeugPublicListSerializer(serializers.ModelSerializer):
    foto_url = serializers.SerializerMethodField(read_only=True)

    def get_foto_url(self, obj):
        return _foto_url(obj)

    class Meta:
        model = Fahrzeug
        fields = [
            "name",
            "bezeichnung",
            "public_id",
            "foto_url",
        ]


# =========================
# AUTH DETAIL (MIT IDs, damit Checks möglich sind)
# =========================
class RaumItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RaumItem
        fields = [
            "id",
            "name",
            "menge",
            "einheit",
            "notiz",
            "reihenfolge",
            "wartung_zuletzt_am",
            "wartung_naechstes_am",
        ]


class FahrzeugRaumSerializer(serializers.ModelSerializer):
    items = RaumItemSerializer(many=True, read_only=True)
    foto_url = serializers.SerializerMethodField(read_only=True)

    def get_foto_url(self, obj):
        return _foto_url(obj)

    class Meta:
        model = FahrzeugRaum
        fields = ["id", "name", "reihenfolge", "foto_url", "items"]


class FahrzeugDetailSerializer(serializers.ModelSerializer):
    raeume = FahrzeugRaumSerializer(many=True, read_only=True)
    foto_url = serializers.SerializerMethodField(read_only=True)

    def get_foto_url(self, obj):
        return _foto_url(obj)

    class Meta:
        model = Fahrzeug
        fields = [
            "id",
            "name",
            "bezeichnung",
            "beschreibung",
            "public_id",
            "service_zuletzt_am",
            "service_naechstes_am",
            "foto_url",
            "raeume",
        ]


# =========================
# CRUD (Fahrzeug / Raum / Item)
# =========================
class FahrzeugCrudSerializer(serializers.ModelSerializer):
    foto = serializers.ImageField(required=False, allow_null=True)
    foto_url = serializers.SerializerMethodField(read_only=True)
    remove_foto = serializers.BooleanField(required=False, write_only=True, default=False)

    def get_foto_url(self, obj):
        return _foto_url(obj)

    def validate_foto(self, file):
        return _sanitize_upload_filename(file)

    def validate(self, attrs):
        _validate_date_window(attrs, self.instance, "service_zuletzt_am", "service_naechstes_am")
        return attrs

    def create(self, validated_data):
        foto = validated_data.pop("foto", None)
        validated_data.pop("remove_foto", None)
        instance = Fahrzeug.objects.create(**validated_data)
        if foto:
            instance.foto = foto
            instance.save(update_fields=["foto"])
        return instance

    def update(self, instance, validated_data):
        foto = validated_data.pop("foto", serializers.empty)
        remove_foto = validated_data.pop("remove_foto", False)
        instance = super().update(instance, validated_data)

        if remove_foto:
            if instance.foto and instance.foto.name:
                instance.foto.delete(save=False)
            instance.foto = None
            instance.save(update_fields=["foto"])
        elif foto is not serializers.empty:
            instance.foto = foto
            instance.save(update_fields=["foto"])

        return instance

    class Meta:
        model = Fahrzeug
        fields = [
            "id",
            "name",
            "bezeichnung",
            "beschreibung",
            "service_zuletzt_am",
            "service_naechstes_am",
            "foto",
            "foto_url",
            "remove_foto",
        ]


class FahrzeugRaumCrudSerializer(serializers.ModelSerializer):
    foto = serializers.ImageField(required=False, allow_null=True)
    foto_url = serializers.SerializerMethodField(read_only=True)
    remove_foto = serializers.BooleanField(required=False, write_only=True, default=False)

    def get_foto_url(self, obj):
        return _foto_url(obj)

    def validate_foto(self, file):
        return _sanitize_upload_filename(file)

    def create(self, validated_data):
        foto = validated_data.pop("foto", None)
        validated_data.pop("remove_foto", None)
        instance = FahrzeugRaum.objects.create(**validated_data)
        if foto:
            instance.foto = foto
            instance.save(update_fields=["foto"])
        return instance

    def update(self, instance, validated_data):
        foto = validated_data.pop("foto", serializers.empty)
        remove_foto = validated_data.pop("remove_foto", False)
        instance = super().update(instance, validated_data)

        if remove_foto:
            if instance.foto and instance.foto.name:
                instance.foto.delete(save=False)
            instance.foto = None
            instance.save(update_fields=["foto"])
        elif foto is not serializers.empty:
            instance.foto = foto
            instance.save(update_fields=["foto"])

        return instance

    class Meta:
        model = FahrzeugRaum
        fields = ["id", "name", "reihenfolge", "foto", "foto_url", "remove_foto"]


class RaumItemCrudSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        _validate_date_window(attrs, self.instance, "wartung_zuletzt_am", "wartung_naechstes_am")
        return attrs

    class Meta:
        model = RaumItem
        fields = [
            "id",
            "name",
            "menge",
            "einheit",
            "notiz",
            "reihenfolge",
            "wartung_zuletzt_am",
            "wartung_naechstes_am",
        ]


# =========================
# CHECK CREATE
# =========================
class FahrzeugCheckItemCreateSerializer(serializers.Serializer):
    item_id = serializers.UUIDField()
    status = serializers.ChoiceField(choices=FahrzeugCheckItem.Status.choices)
    menge_aktuel = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    notiz = serializers.CharField(required=False, allow_blank=True)


class FahrzeugCheckCreateSerializer(serializers.Serializer):
    title = serializers.CharField(required=False, allow_blank=True)
    notiz = serializers.CharField(required=False, allow_blank=True)
    results = FahrzeugCheckItemCreateSerializer(many=True)

    def validate(self, data):
        if not data.get("results"):
            raise serializers.ValidationError("results darf nicht leer sein.")
        return data
