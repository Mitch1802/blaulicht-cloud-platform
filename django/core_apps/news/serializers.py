from rest_framework import serializers
from .models import News, NewsTemplate

class NewsSerializer(serializers.ModelSerializer):
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

    def create(self, validated_data):
        foto = validated_data.pop("foto", None)
        instance = News.objects.create(**validated_data)
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
        model = News
        fields = "__all__"
        extra_kwargs = {"foto": {"required": False, "allow_null": True}}


class NewsTemplateSerializer(serializers.ModelSerializer):
    def validate_name(self, value: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise serializers.ValidationError("Vorlagenname ist erforderlich.")
        return cleaned

    class Meta:
        model = NewsTemplate
        fields = "__all__"
