from django.db import transaction
from rest_framework import serializers

from core_apps.mitglieder.models import Mitglied

from .models import JugendAusbildung, JugendEvent, JugendEventTeilnahme


class JugendAusbildungSerializer(serializers.ModelSerializer):
    class Meta:
        model = JugendAusbildung
        fields = "__all__"


class JugendEventTeilnehmerLevelInputSerializer(serializers.Serializer):
    pkid = serializers.IntegerField(min_value=1)
    level = serializers.IntegerField(min_value=1, max_value=5, required=False, allow_null=True)


class JugendEventSerializer(serializers.ModelSerializer):
    teilnehmer_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )
    teilnehmer_levels = JugendEventTeilnehmerLevelInputSerializer(
        many=True,
        write_only=True,
        required=False,
    )
    teilnehmer = serializers.SerializerMethodField(read_only=True)
    kategorie_label = serializers.CharField(source="get_kategorie_display", read_only=True)

    class Meta:
        model = JugendEvent
        fields = [
            "id",
            "pkid",
            "titel",
            "datum",
            "ort",
            "kategorie",
            "kategorie_label",
            "teilnehmer_ids",
            "teilnehmer_levels",
            "teilnehmer",
            "created_at",
            "updated_at",
        ]

    def validate_teilnehmer_levels(self, value):
        seen: set[int] = set()
        for item in value:
            pkid = item["pkid"]
            if pkid in seen:
                raise serializers.ValidationError("Mitglied darf nur einmal in teilnehmer_levels vorkommen.")
            seen.add(pkid)
        return value

    def validate(self, attrs):
        teilnehmer_ids = attrs.get("teilnehmer_ids")
        teilnehmer_levels = attrs.get("teilnehmer_levels")

        if teilnehmer_ids is not None and teilnehmer_levels is not None:
            teilnehmer_set = {int(pkid) for pkid in teilnehmer_ids}
            invalid = [item["pkid"] for item in teilnehmer_levels if int(item["pkid"]) not in teilnehmer_set]
            if invalid:
                raise serializers.ValidationError(
                    {"teilnehmer_levels": "Levels dürfen nur für ausgewählte Teilnehmer gesetzt werden."}
                )

        return attrs

    def get_teilnehmer(self, obj):
        level_by_pkid = {
            teilnahme.mitglied.pkid: teilnahme.level
            for teilnahme in obj.teilnahmen.select_related("mitglied").all()
        }

        return [
            {
                "id": str(m.id),
                "pkid": m.pkid,
                "stbnr": m.stbnr,
                "vorname": m.vorname,
                "nachname": m.nachname,
                "dienstgrad": m.dienstgrad,
                "level": level_by_pkid.get(m.pkid),
            }
            for m in obj.mitglieder_teilgenommen.all().order_by("stbnr")
        ]

    @transaction.atomic
    def create(self, validated_data):
        teilnehmer_ids = validated_data.pop("teilnehmer_ids", [])
        teilnehmer_levels = validated_data.pop("teilnehmer_levels", [])

        event = JugendEvent.objects.create(**validated_data)

        if teilnehmer_ids:
            members = Mitglied.objects.filter(pkid__in=teilnehmer_ids)
            event.mitglieder_teilgenommen.set(members)

        self._sync_teilnahmen(
            event=event,
            teilnehmer_ids=teilnehmer_ids,
            teilnehmer_levels=teilnehmer_levels,
            reset_missing_levels=True,
        )
        self._apply_ausbildungs_level_update(event, teilnehmer_levels)

        return event

    @transaction.atomic
    def update(self, instance, validated_data):
        teilnehmer_ids = validated_data.pop("teilnehmer_ids", None)
        teilnehmer_levels = validated_data.pop("teilnehmer_levels", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if teilnehmer_ids is not None:
            members = Mitglied.objects.filter(pkid__in=teilnehmer_ids)
            instance.mitglieder_teilgenommen.set(members)

        current_teilnehmer_ids = (
            list(teilnehmer_ids)
            if teilnehmer_ids is not None
            else list(instance.mitglieder_teilgenommen.values_list("pkid", flat=True))
        )

        self._sync_teilnahmen(
            event=instance,
            teilnehmer_ids=current_teilnehmer_ids,
            teilnehmer_levels=teilnehmer_levels or [],
            reset_missing_levels=teilnehmer_levels is not None,
        )

        if teilnehmer_levels:
            self._apply_ausbildungs_level_update(instance, teilnehmer_levels)

        return instance

    def _sync_teilnahmen(self, event, teilnehmer_ids, teilnehmer_levels, reset_missing_levels):
        teilnehmer_set = {int(pkid) for pkid in teilnehmer_ids}

        JugendEventTeilnahme.objects.filter(event=event).exclude(
            mitglied__pkid__in=teilnehmer_set
        ).delete()

        if not teilnehmer_set:
            return

        members_by_pkid = {
            member.pkid: member
            for member in Mitglied.objects.filter(pkid__in=teilnehmer_set)
        }
        existing_by_pkid = {
            item.mitglied.pkid: item
            for item in JugendEventTeilnahme.objects.filter(
                event=event,
                mitglied__pkid__in=teilnehmer_set,
            ).select_related("mitglied")
        }
        level_by_pkid = {
            int(item["pkid"]): item.get("level")
            for item in teilnehmer_levels
        }

        for pkid in teilnehmer_set:
            member = members_by_pkid.get(pkid)
            if member is None:
                continue

            teilnahme = existing_by_pkid.get(pkid)
            if teilnahme is None:
                teilnahme = JugendEventTeilnahme(event=event, mitglied=member)

            if pkid in level_by_pkid:
                teilnahme.level = level_by_pkid[pkid]
            elif reset_missing_levels:
                teilnahme.level = None

            teilnahme.save()

    def _apply_ausbildungs_level_update(self, event, teilnehmer_levels):
        category_to_prefix = {
            JugendEvent.Kategorie.WISSENSTEST: "wissentest",
            JugendEvent.Kategorie.ERPROBUNG: "erprobung",
        }
        prefix = category_to_prefix.get(event.kategorie)
        if prefix is None:
            return

        level_by_pkid = {
            int(item["pkid"]): int(item["level"])
            for item in teilnehmer_levels
            if item.get("level") is not None
        }
        if not level_by_pkid:
            return

        mitglieder = Mitglied.objects.filter(
            pkid__in=level_by_pkid.keys(),
            dienststatus=Mitglied.Dienststatus.JUGEND,
        )

        for mitglied in mitglieder:
            ausbildung, _ = JugendAusbildung.objects.get_or_create(mitglied=mitglied)
            changed = self._set_level_for_prefix(
                ausbildung=ausbildung,
                prefix=prefix,
                level=level_by_pkid[mitglied.pkid],
                datum=event.datum,
            )
            if changed:
                ausbildung.save()

    def _set_level_for_prefix(self, ausbildung, prefix, level, datum):
        changed = False
        bounded_level = max(1, min(int(level), 5))

        for current_level in range(1, bounded_level + 1):
            level_field = f"{prefix}_lv{current_level}"
            date_field = f"{prefix}_lv{current_level}_datum"

            if not bool(getattr(ausbildung, level_field)):
                setattr(ausbildung, level_field, True)
                changed = True

            if getattr(ausbildung, date_field) is None:
                setattr(ausbildung, date_field, datum)
                changed = True

        return changed
