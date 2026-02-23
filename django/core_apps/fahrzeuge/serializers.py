from rest_framework import serializers
from .models import Fahrzeug, FahrzeugRaum, RaumItem, FahrzeugCheckItem


# =========================
# LIST
# =========================
class FahrzeugListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fahrzeug
        fields = ["id", "name", "bezeichnung", "public_id"]


# =========================
# PUBLIC (PIN) -> ohne IDs von Items/Rooms? (du wolltest public ohne IDs – ok)
# =========================
class RaumItemPublicSerializer(serializers.ModelSerializer):
    class Meta:
        model = RaumItem
        fields = ["name", "menge", "einheit", "notiz", "reihenfolge"]


class FahrzeugRaumPublicSerializer(serializers.ModelSerializer):
    items = RaumItemPublicSerializer(many=True, read_only=True)

    class Meta:
        model = FahrzeugRaum
        fields = ["name", "reihenfolge", "items"]


class FahrzeugPublicDetailSerializer(serializers.ModelSerializer):
    raeume = FahrzeugRaumPublicSerializer(many=True, read_only=True)

    class Meta:
        model = Fahrzeug
        fields = ["name", "bezeichnung", "beschreibung", "public_id", "raeume"]


# =========================
# AUTH DETAIL (MIT IDs, damit Checks möglich sind)
# =========================
class RaumItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = RaumItem
        fields = ["id", "name", "menge", "einheit", "notiz", "reihenfolge"]


class FahrzeugRaumSerializer(serializers.ModelSerializer):
    items = RaumItemSerializer(many=True, read_only=True)

    class Meta:
        model = FahrzeugRaum
        fields = ["id", "name", "reihenfolge", "items"]


class FahrzeugDetailSerializer(serializers.ModelSerializer):
    raeume = FahrzeugRaumSerializer(many=True, read_only=True)

    class Meta:
        model = Fahrzeug
        fields = ["id", "name", "bezeichnung", "beschreibung", "public_id", "raeume"]


# =========================
# CRUD (Fahrzeug / Raum / Item)
# =========================
class FahrzeugCrudSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fahrzeug
        fields = ["id", "name", "bezeichnung", "beschreibung"]


class FahrzeugRaumCrudSerializer(serializers.ModelSerializer):
    class Meta:
        model = FahrzeugRaum
        fields = ["id", "name", "reihenfolge"]


class RaumItemCrudSerializer(serializers.ModelSerializer):
    class Meta:
        model = RaumItem
        fields = ["id", "name", "menge", "einheit", "notiz", "reihenfolge"]


# =========================
# CHECK CREATE
# =========================
class FahrzeugCheckItemCreateSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
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
