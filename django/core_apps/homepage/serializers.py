import re

from rest_framework import serializers

from core_apps.mitglieder.models import Mitglied
from .models import HomepageDienstposten


DIENSTGRAD_IMAGE_MAP = {
    "fm": "Dgrd_fm.noe.svg",
    "ofm": "Dgrd_ofm.noe.svg",
    "lm": "Dgrd_lm.noe.svg",
    "hlm": "Dgrd_hlm.noe.svg",
    "bm": "Dgrd_bm.noe.svg",
    "hbm": "Dgrd_hbm.noe.svg",
    "obi": "Dgrd_obi.noe.svg",
    "hbi": "Dgrd_hbi.noe.svg",
    "ov": "Dgrd_ov.noe.svg",
    "v": "Dgrd_v.noe.svg",
    "fkur": "Dgrd_fkur.noe.svg",
    "sb": "Dgrd_sbea.noe.svg",
    "sbea": "Dgrd_sbea.noe.svg",
}


def dienstgrad_to_image_filename(dienstgrad: str | None) -> str:
    normalized = re.sub(r"[^a-z0-9]", "", (dienstgrad or "").strip().lower())

    if normalized in DIENSTGRAD_IMAGE_MAP:
        return DIENSTGRAD_IMAGE_MAP[normalized]

    if normalized.startswith("e") and normalized[1:] in DIENSTGRAD_IMAGE_MAP:
        return DIENSTGRAD_IMAGE_MAP[normalized[1:]]

    if normalized:
        return f"Dgrd_{normalized}.noe.svg"

    return ""


class HomepageDienstpostenSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(required=False, allow_null=True, write_only=True)
    photo_url = serializers.SerializerMethodField(read_only=True)
    remove_photo = serializers.BooleanField(required=False, default=False, write_only=True)
    mitglied_id = serializers.PrimaryKeyRelatedField(
        source="mitglied",
        queryset=Mitglied.objects.all(),
        allow_null=True,
        required=False,
    )
    mitglied_name = serializers.SerializerMethodField(read_only=True)
    photo_preview = serializers.SerializerMethodField(read_only=True)
    dienstgrad_preview = serializers.SerializerMethodField(read_only=True)
    dienstgrad_img_preview = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = HomepageDienstposten
        fields = [
            "pkid",
            "id",
            "created_at",
            "updated_at",
            "section_id",
            "section_title",
            "section_order",
            "position",
            "position_order",
            "mitglied_id",
            "mitglied_name",
            "photo",
            "photo_url",
            "remove_photo",
            "fallback_name",
            "fallback_dienstgrad",
            "fallback_photo",
            "fallback_dienstgrad_img",
            "photo_preview",
            "dienstgrad_preview",
            "dienstgrad_img_preview",
        ]

    def get_mitglied_name(self, obj: HomepageDienstposten) -> str | None:
        if not obj.mitglied:
            return None
        return f"{obj.mitglied.vorname} {obj.mitglied.nachname}".strip()

    def get_photo_url(self, obj: HomepageDienstposten) -> str | None:
        f = getattr(obj, "photo", None)
        try:
            return f.url if f and getattr(f, "name", "") else None
        except Exception:
            return None

    def get_photo_preview(self, obj: HomepageDienstposten) -> str:
        photo_url = self.get_photo_url(obj)
        if photo_url:
            return photo_url

        if obj.mitglied and obj.mitglied.stbnr not in (None, ""):
            return str(obj.mitglied.stbnr)
        return obj.fallback_photo or "X"

    def create(self, validated_data):
        validated_data.pop("remove_photo", False)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        remove_photo = bool(validated_data.pop("remove_photo", False))
        new_photo = validated_data.pop("photo", serializers.empty)

        old_photo_storage = instance.photo.storage if getattr(instance, "photo", None) else None
        old_photo_name = instance.photo.name if getattr(instance, "photo", None) else ""

        instance = super().update(instance, validated_data)

        if new_photo is not serializers.empty:
            instance.photo = new_photo
            instance.save(update_fields=["photo", "updated_at"])

            if old_photo_storage and old_photo_name and old_photo_name != instance.photo.name:
                try:
                    old_photo_storage.delete(old_photo_name)
                except Exception:
                    pass

            return instance

        if remove_photo and instance.photo and instance.photo.name:
            storage, name = instance.photo.storage, instance.photo.name
            instance.photo.delete(save=False)
            try:
                storage.delete(name)
            except Exception:
                pass
            instance.photo = None
            instance.save(update_fields=["photo", "updated_at"])

        return instance

    def get_dienstgrad_preview(self, obj: HomepageDienstposten) -> str:
        if obj.mitglied:
            return (obj.mitglied.dienstgrad or "").strip()
        return (obj.fallback_dienstgrad or "").strip()

    def get_dienstgrad_img_preview(self, obj: HomepageDienstposten) -> str:
        if obj.fallback_dienstgrad_img:
            return obj.fallback_dienstgrad_img
        return dienstgrad_to_image_filename(self.get_dienstgrad_preview(obj))

    def validate_section_id(self, value: str) -> str:
        normalized = self._normalize_section_id(value)
        if not normalized:
            raise serializers.ValidationError("Sektions-ID ist erforderlich.")
        return normalized

    def validate(self, attrs):
        attrs = super().validate(attrs)

        section_id = attrs.get("section_id")
        if not section_id:
            section_id = attrs.get("section_title") or getattr(self.instance, "section_title", "")
            attrs["section_id"] = self._normalize_section_id(section_id)

        mitglied = attrs.get("mitglied")
        if mitglied is None and self.instance is not None:
            mitglied = self.instance.mitglied

        if mitglied is not None:
            default_name = f"{mitglied.vorname} {mitglied.nachname}".strip() or "Nicht definiert"
            attrs["fallback_name"] = attrs.get("fallback_name") or default_name
            attrs["fallback_dienstgrad"] = attrs.get("fallback_dienstgrad") or (mitglied.dienstgrad or "")
            attrs["fallback_photo"] = attrs.get("fallback_photo") or str(mitglied.stbnr or "X")
            attrs["fallback_dienstgrad_img"] = attrs.get("fallback_dienstgrad_img") or dienstgrad_to_image_filename(
                mitglied.dienstgrad
            )
        else:
            attrs["fallback_name"] = attrs.get("fallback_name") or getattr(self.instance, "fallback_name", "Nicht definiert")
            attrs["fallback_dienstgrad"] = attrs.get("fallback_dienstgrad") or getattr(self.instance, "fallback_dienstgrad", "")
            attrs["fallback_photo"] = attrs.get("fallback_photo") or getattr(self.instance, "fallback_photo", "X")
            attrs["fallback_dienstgrad_img"] = attrs.get("fallback_dienstgrad_img") or getattr(
                self.instance,
                "fallback_dienstgrad_img",
                dienstgrad_to_image_filename(attrs.get("fallback_dienstgrad") or ""),
            )

        return attrs

    @staticmethod
    def _normalize_section_id(value: str) -> str:
        value = (value or "").strip().lower()
        value = re.sub(r"[^a-z0-9]+", "-", value)
        return value.strip("-")
