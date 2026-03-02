from rest_framework import serializers

from .models import Mitglied, JugendEvent


class MitgliedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mitglied
        fields = '__all__'


class JugendEventSerializer(serializers.ModelSerializer):
    teilnehmer_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )
    teilnehmer = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = JugendEvent
        fields = [
            "id",
            "pkid",
            "titel",
            "datum",
            "notiz",
            "teilnehmer_ids",
            "teilnehmer",
            "created_at",
            "updated_at",
        ]

    def get_teilnehmer(self, obj):
        return [
            {
                "id": str(m.id),
                "pkid": m.pkid,
                "stbnr": m.stbnr,
                "vorname": m.vorname,
                "nachname": m.nachname,
            }
            for m in obj.teilnehmer.all().order_by("stbnr")
        ]

    def create(self, validated_data):
        teilnehmer_ids = validated_data.pop("teilnehmer_ids", [])
        event = JugendEvent.objects.create(**validated_data)
        if teilnehmer_ids:
            members = Mitglied.objects.filter(pkid__in=teilnehmer_ids)
            event.teilnehmer.set(members)
        return event

    def update(self, instance, validated_data):
        teilnehmer_ids = validated_data.pop("teilnehmer_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if teilnehmer_ids is not None:
            members = Mitglied.objects.filter(pkid__in=teilnehmer_ids)
            instance.teilnehmer.set(members)
        return instance
