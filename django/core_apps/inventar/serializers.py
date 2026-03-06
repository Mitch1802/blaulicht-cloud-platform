from rest_framework import serializers
from .models import Inventar

class InventarSerializer(serializers.ModelSerializer):
    foto = serializers.ImageField(required=False, allow_null=True)
    foto_url = serializers.SerializerMethodField(read_only=True)

    def get_foto_url(self, obj):
        f = getattr(obj, "foto", None)
        try:
            return f.url if f and getattr(f, "name", "") else None
        except Exception:
            return None

    def validate_foto(self, file):
        if not file:
            return file
        name = getattr(file, "name", "") or "upload"
        name = name.strip()
        if "." not in name or name.lower().endswith((".blob", ".octet-stream")):
            ct = (getattr(file, "content_type", "") or "image/png").lower()
            ext = ct.split("/")[-1]
            if ext not in {"jpg", "jpeg", "png", "webp"}:
                ext = "png"
            file.name = f"upload.{ext}"
        else:
            import re, os
            base = os.path.basename(name)
            base = re.sub(r"[^\w.\-]+", "_", base)
            file.name = base
        return file

    def validate(self, attrs):
        ist_verliehen = attrs.get("ist_verliehen", getattr(self.instance, "ist_verliehen", False))
        verliehen_an = attrs.get("verliehen_an", getattr(self.instance, "verliehen_an", None))

        if isinstance(verliehen_an, str):
            verliehen_an = verliehen_an.strip()
            attrs["verliehen_an"] = verliehen_an or None

        if ist_verliehen and not verliehen_an:
            raise serializers.ValidationError({
                "verliehen_an": "Bitte angeben, an wen der Gegenstand verliehen wurde."
            })

        if not ist_verliehen:
            attrs["verliehen_an"] = None
            attrs["verliehen_bis"] = None

        return attrs

    def create(self, validated_data):
        foto = validated_data.pop("foto", None)
        instance = Inventar.objects.create(**validated_data)
        if foto:
            instance.foto = foto
            instance.save(update_fields=["foto"])
        return instance

    def update(self, instance, validated_data):
        foto = validated_data.pop("foto", serializers.empty)
        instance = super().update(instance, validated_data)

        if foto is None:
            # -> Bild entfernen
            if instance.foto and instance.foto.name:
                storage, name = instance.foto.storage, instance.foto.name
                instance.foto.delete(save=False)
                storage.delete(name)
            instance.foto = None
            instance.save(update_fields=["foto"])

        elif foto is not serializers.empty:
            # -> Neues Bild wurde hochgeladen
            instance.foto = foto
            instance.save(update_fields=["foto"])

        return instance

    class Meta:
        model = Inventar
        fields = "__all__"
        extra_kwargs = {"foto": {"required": False, "allow_null": True}}
