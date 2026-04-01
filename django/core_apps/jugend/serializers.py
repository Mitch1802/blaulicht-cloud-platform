from django.db import transaction
from rest_framework import serializers

from core_apps.mitglieder.models import Mitglied

from .models import JugendAusbildung, JugendEvent, JugendEventTeilnahme
from .services import rebuild_ausbildung_for_mitglieder


class JugendAusbildungSerializer(serializers.ModelSerializer):
    class Meta:
        model = JugendAusbildung
        fields = "__all__"


class JugendMitgliedSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mitglied
        fields = [
            "id",
            "pkid",
            "stbnr",
            "vorname",
            "nachname",
            "dienstgrad",
            "geburtsdatum",
            "dienststatus",
        ]
        read_only_fields = [
            "id",
            "pkid",
            "stbnr",
            "vorname",
            "nachname",
            "dienstgrad",
            "geburtsdatum",
        ]

    def validate_dienststatus(self, value):
        if value not in (Mitglied.Dienststatus.JUGEND, Mitglied.Dienststatus.AKTIV):
            raise serializers.ValidationError("Dienststatus darf nur JUGEND oder AKTIV sein.")
        return value


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
            "stand_x_override",
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
        kategorie = attrs.get("kategorie")
        if self.instance is not None and kategorie is None:
            kategorie = self.instance.kategorie

        teilnehmer_ids = attrs.get("teilnehmer_ids")
        teilnehmer_levels = attrs.get("teilnehmer_levels")

        if teilnehmer_ids is not None and teilnehmer_levels is not None:
            teilnehmer_set = {int(pkid) for pkid in teilnehmer_ids}
            invalid = [item["pkid"] for item in teilnehmer_levels if int(item["pkid"]) not in teilnehmer_set]
            if invalid:
                raise serializers.ValidationError(
                    {"teilnehmer_levels": "Levels dürfen nur für ausgewählte Teilnehmer gesetzt werden."}
                )

        if kategorie is not None and teilnehmer_levels is not None:
            max_level = self._get_max_level_for_category(kategorie)
            invalid_levels = [
                item["level"]
                for item in teilnehmer_levels
                if item.get("level") is not None and int(item["level"]) > max_level
            ]
            if invalid_levels:
                raise serializers.ValidationError(
                    {
                        "teilnehmer_levels": (
                            f"Für die gewählte Kategorie ist maximal Level {max_level} erlaubt."
                        )
                    }
                )

        if kategorie is not None and teilnehmer_levels is not None:
            ausbildung_by_pkid = {
                ausbildung.mitglied.pkid: ausbildung
                for ausbildung in JugendAusbildung.objects.select_related("mitglied").filter(
                    mitglied__pkid__in=[int(item["pkid"]) for item in teilnehmer_levels]
                )
            }

            invalid_already_reached = []
            for item in teilnehmer_levels:
                level = item.get("level")
                if level is None:
                    continue

                pkid = int(item["pkid"])
                ausbildung = ausbildung_by_pkid.get(pkid)
                current_level = self._get_current_level_for_category(ausbildung, kategorie)
                if int(level) <= current_level:
                    invalid_already_reached.append(pkid)

            if invalid_already_reached:
                raise serializers.ValidationError(
                    {
                        "teilnehmer_levels": (
                            "Bereits erreichte Level dürfen nicht erneut gesetzt werden. "
                            "Bitte nur ein höheres, noch nicht erreichtes Level auswählen."
                        )
                    }
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
        rebuild_ausbildung_for_mitglieder(teilnehmer_ids)

        return event

    @transaction.atomic
    def update(self, instance, validated_data):
        previous_teilnehmer_ids = list(instance.teilnahmen.values_list("mitglied__pkid", flat=True))
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

        betroffene_teilnehmer_ids = set(previous_teilnehmer_ids) | set(current_teilnehmer_ids)
        rebuild_ausbildung_for_mitglieder(betroffene_teilnehmer_ids)

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

        prefix = category_to_prefix.get(event.kategorie)
        fertigkeit_fields = self._get_fertigkeitsabzeichen_fields(event.kategorie)

        for mitglied in mitglieder:
            ausbildung, _ = JugendAusbildung.objects.get_or_create(mitglied=mitglied)
            level = level_by_pkid[mitglied.pkid]

            changed = False
            if prefix is not None:
                changed = self._set_level_for_prefix(
                    ausbildung=ausbildung,
                    prefix=prefix,
                    level=level,
                    datum=event.datum,
                )

            if fertigkeit_fields is not None:
                changed = self._set_fertigkeitsabzeichen_level(
                    ausbildung=ausbildung,
                    spiel_field=fertigkeit_fields[0],
                    abzeichen_field=fertigkeit_fields[1],
                    level=level,
                    datum=event.datum,
                ) or changed

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

    def _set_fertigkeitsabzeichen_level(self, ausbildung, spiel_field, abzeichen_field, level, datum):
        changed = False
        bounded_level = max(1, min(int(level), 2))

        if getattr(ausbildung, spiel_field) is None:
            setattr(ausbildung, spiel_field, datum)
            changed = True

        if bounded_level >= 2 and getattr(ausbildung, abzeichen_field) is None:
            setattr(ausbildung, abzeichen_field, datum)
            changed = True

        return changed

    def _get_max_level_for_category(self, kategorie):
        if kategorie in (JugendEvent.Kategorie.WISSENSTEST, JugendEvent.Kategorie.ERPROBUNG):
            return 5
        return 2

    def _get_fertigkeitsabzeichen_fields(self, kategorie):
        mapping = {
            JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_MELDER: ("melder_spiel_datum", "melder_datum"),
            JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_FWTECHNIK: ("fwtechnik_spiel_datum", "fwtechnik_datum"),
            JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER: (
                "sicher_zu_wasser_spiel_datum",
                "sicher_zu_wasser_datum",
            ),
        }
        return mapping.get(kategorie)

    def _get_current_level_for_category(self, ausbildung, kategorie):
        if ausbildung is None:
            return 0

        if kategorie == JugendEvent.Kategorie.ERPROBUNG:
            for level in range(5, 0, -1):
                if bool(getattr(ausbildung, f"erprobung_lv{level}")):
                    return level
            return 0

        if kategorie == JugendEvent.Kategorie.WISSENSTEST:
            for level in range(5, 0, -1):
                if bool(getattr(ausbildung, f"wissentest_lv{level}")):
                    return level
            return 0

        if kategorie == JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_MELDER:
            if ausbildung.melder_datum:
                return 2
            if ausbildung.melder_spiel_datum:
                return 1
            return 0

        if kategorie == JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_FWTECHNIK:
            if ausbildung.fwtechnik_datum:
                return 2
            if ausbildung.fwtechnik_spiel_datum:
                return 1
            return 0

        if kategorie == JugendEvent.Kategorie.FERTIGKEITSABZEICHEN_SICHER_ZU_WASSER:
            if ausbildung.sicher_zu_wasser_datum:
                return 2
            if ausbildung.sicher_zu_wasser_spiel_datum:
                return 1
            return 0

        return 0
