from rest_framework import serializers

from core_apps.fahrzeuge.models import Fahrzeug
from core_apps.mitglieder.models import Mitglied

from .models import Einsatzbericht, EinsatzberichtFoto


class EinsatzberichtFotoSerializer(serializers.ModelSerializer):
    foto_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = EinsatzberichtFoto
        fields = ["id", "foto", "foto_url", "dokument_typ", "created_at"]
        read_only_fields = ["id", "foto_url", "created_at"]

    def get_foto_url(self, obj):
        f = getattr(obj, "foto", None)
        try:
            return f.url if f and getattr(f, "name", "") else None
        except Exception:
            return None


class EinsatzberichtSerializer(serializers.ModelSerializer):
    fahrzeuge = serializers.PrimaryKeyRelatedField(queryset=Fahrzeug.objects.all(), many=True, required=False)
    mitglieder = serializers.PrimaryKeyRelatedField(queryset=Mitglied.objects.all(), many=True, required=False)
    fotos = EinsatzberichtFotoSerializer(many=True, read_only=True)

    class Meta:
        model = Einsatzbericht
        fields = [
            "id",
            "status",
            "einsatzleiter",
            "einsatzart",
            "alarmstichwort",
            "einsatzadresse",
            "alarmierende_stelle",
            "einsatz_datum",
            "ausgerueckt",
            "eingerueckt",
            "lage_beim_eintreffen",
            "gesetzte_massnahmen",
            "brand_kategorie",
            "technisch_kategorie",
            "mitalarmiert",
            "blaulichtsms_einsatz_id",
            "blaulichtsms_payload",
            "fahrzeuge",
            "mitglieder",
            "fotos",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        instance = getattr(self, "instance", None)
        einsatzart = attrs.get("einsatzart", getattr(instance, "einsatzart", ""))

        is_brandeinsatz = str(einsatzart).strip() in {"Brandeinsatz", "Brand"}
        is_technisch = str(einsatzart).strip() in {"Technischer Einsatz", "Technisch"}

        if not is_brandeinsatz:
            attrs["brand_kategorie"] = ""

        if not is_technisch:
            attrs["technisch_kategorie"] = ""

        return attrs

    def _create_uploaded_fotos(self, request, instance):
        if not request:
            return

        upload_map = [
            ("fotos", EinsatzberichtFoto.DokumentTyp.ALLGEMEIN),
            ("fotos_doku", EinsatzberichtFoto.DokumentTyp.DOKU),
            ("fotos_zulassung", EinsatzberichtFoto.DokumentTyp.ZULASSUNG),
            ("fotos_versicherung", EinsatzberichtFoto.DokumentTyp.VERSICHERUNG),
        ]

        for key, dokument_typ in upload_map:
            for f in request.FILES.getlist(key):
                EinsatzberichtFoto.objects.create(
                    einsatzbericht=instance,
                    foto=f,
                    dokument_typ=dokument_typ,
                )

    def create(self, validated_data):
        request = self.context.get("request")
        fahrzeuge = validated_data.pop("fahrzeuge", [])
        mitglieder = validated_data.pop("mitglieder", [])

        instance = Einsatzbericht.objects.create(**validated_data)
        instance.fahrzeuge.set(fahrzeuge)
        instance.mitglieder.set(mitglieder)

        if request and request.user and request.user.is_authenticated:
            instance.created_by = request.user
            instance.save(update_fields=["created_by"])

        self._create_uploaded_fotos(request, instance)

        return instance

    def update(self, instance, validated_data):
        request = self.context.get("request")
        fahrzeuge = validated_data.pop("fahrzeuge", None)
        mitglieder = validated_data.pop("mitglieder", None)

        for key, value in validated_data.items():
            setattr(instance, key, value)
        instance.save()

        if fahrzeuge is not None:
            instance.fahrzeuge.set(fahrzeuge)
        if mitglieder is not None:
            instance.mitglieder.set(mitglieder)

        self._create_uploaded_fotos(request, instance)

        return instance


class EinsatzberichtContextSerializer(serializers.Serializer):
    fahrzeuge = serializers.ListField()
    mitglieder = serializers.ListField()