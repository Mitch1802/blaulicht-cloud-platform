import json
from datetime import date

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

    def _parse_bis_value(self, value, field_name: str) -> str | None:
        if value in (None, ""):
            return None

        if isinstance(value, date):
            return value.isoformat()

        if isinstance(value, str):
            clean = value.strip()
            if clean == "":
                return None
            try:
                date.fromisoformat(clean)
            except ValueError:
                raise serializers.ValidationError({
                    field_name: "Datum muss im Format JJJJ-MM-TT angegeben werden."
                })
            return clean

        raise serializers.ValidationError({
            field_name: "Ungueltiges Datumsformat."
        })

    def _normalize_verleihungen(self, raw) -> list[dict]:
        if raw in (None, ""):
            return []

        if isinstance(raw, str):
            text = raw.strip()
            if text == "":
                return []
            try:
                raw = json.loads(text)
            except json.JSONDecodeError:
                raise serializers.ValidationError({
                    "verleihungen": "Verleihungen muss eine gueltige JSON-Liste sein."
                })

        if not isinstance(raw, list):
            raise serializers.ValidationError({
                "verleihungen": "Verleihungen muss eine Liste sein."
            })

        normalized: list[dict] = []
        for index, item in enumerate(raw):
            if not isinstance(item, dict):
                raise serializers.ValidationError({
                    "verleihungen": f"Eintrag {index + 1} ist ungueltig."
                })

            an = str(item.get("an", "")).strip()
            anzahl_raw = item.get("anzahl", 0)
            bis_iso = self._parse_bis_value(item.get("bis"), f"verleihungen[{index}].bis")

            has_content = an != "" or anzahl_raw not in (None, "", 0, "0") or bis_iso is not None
            if not has_content:
                continue

            try:
                anzahl = int(anzahl_raw)
            except (TypeError, ValueError):
                raise serializers.ValidationError({
                    "verleihungen": f"Eintrag {index + 1}: Anzahl muss eine ganze Zahl sein."
                })

            if anzahl <= 0:
                raise serializers.ValidationError({
                    "verleihungen": f"Eintrag {index + 1}: Anzahl muss groesser 0 sein."
                })

            if not an:
                raise serializers.ValidationError({
                    "verleihungen": f"Eintrag {index + 1}: Bitte Empfaenger angeben."
                })

            normalized.append({
                "an": an,
                "anzahl": anzahl,
                "bis": bis_iso,
            })

        return normalized

    def _build_legacy_verleihungen(self, attrs) -> list[dict]:
        ist_verliehen = attrs.get("ist_verliehen", getattr(self.instance, "ist_verliehen", False))

        if "ist_verliehen" in attrs and ist_verliehen is False:
            return []

        verliehen_anzahl_raw = attrs.get("verliehen_anzahl", getattr(self.instance, "verliehen_anzahl", 0))
        verliehen_an_raw = attrs.get("verliehen_an", getattr(self.instance, "verliehen_an", None))
        verliehen_bis_raw = attrs.get("verliehen_bis", getattr(self.instance, "verliehen_bis", None))

        try:
            verliehen_anzahl = int(verliehen_anzahl_raw or 0)
        except (TypeError, ValueError):
            raise serializers.ValidationError({
                "verliehen_anzahl": "Verliehene Anzahl muss eine ganze Zahl sein."
            })

        if verliehen_anzahl < 0:
            raise serializers.ValidationError({
                "verliehen_anzahl": "Verliehene Anzahl darf nicht negativ sein."
            })

        verliehen_an = str(verliehen_an_raw or "").strip()
        bis_iso = self._parse_bis_value(verliehen_bis_raw, "verliehen_bis")

        has_any_legacy_data = bool(ist_verliehen) or verliehen_anzahl > 0 or verliehen_an != "" or bis_iso is not None
        if not has_any_legacy_data:
            return []

        if verliehen_anzahl <= 0:
            verliehen_anzahl = 1

        if not verliehen_an:
            raise serializers.ValidationError({
                "verliehen_an": "Bitte angeben, an wen der Gegenstand verliehen wurde."
            })

        return [{
            "an": verliehen_an,
            "anzahl": verliehen_anzahl,
            "bis": bis_iso,
        }]

    def _summary_verliehen_bis(self, verleihungen: list[dict]):
        bis_dates: list[date] = []
        for eintrag in verleihungen:
            bis_iso = eintrag.get("bis")
            if bis_iso:
                bis_dates.append(date.fromisoformat(str(bis_iso)))
        return min(bis_dates) if bis_dates else None

    def validate(self, attrs):
        anzahl = attrs.get("anzahl", getattr(self.instance, "anzahl", None))
        wartung_zuletzt_am = attrs.get("wartung_zuletzt_am", getattr(self.instance, "wartung_zuletzt_am", None))
        wartung_naechstes_am = attrs.get("wartung_naechstes_am", getattr(self.instance, "wartung_naechstes_am", None))

        if wartung_zuletzt_am and wartung_naechstes_am and wartung_naechstes_am < wartung_zuletzt_am:
            raise serializers.ValidationError({
                "wartung_naechstes_am": "Das naechste Datum darf nicht vor dem zuletzt erledigten Datum liegen."
            })

        if anzahl is not None:
            try:
                anzahl = int(anzahl)
            except (TypeError, ValueError):
                raise serializers.ValidationError({
                    "anzahl": "Anzahl muss eine ganze Zahl sein."
                })
            if anzahl < 0:
                raise serializers.ValidationError({
                    "anzahl": "Anzahl darf nicht negativ sein."
                })

        verleihungen_present = "verleihungen" in attrs
        legacy_keys = {"ist_verliehen", "verliehen_anzahl", "verliehen_an", "verliehen_bis"}
        legacy_payload_present = any(key in attrs for key in legacy_keys)

        if "ist_verliehen" in attrs and attrs.get("ist_verliehen") is False and not verleihungen_present:
            verleihungen = []
        elif verleihungen_present:
            verleihungen = self._normalize_verleihungen(attrs.get("verleihungen"))
        elif legacy_payload_present:
            verleihungen = self._build_legacy_verleihungen(attrs)
        else:
            verleihungen = self._normalize_verleihungen(getattr(self.instance, "verleihungen", []))
            if not verleihungen:
                verleihungen = self._build_legacy_verleihungen(attrs)

        total_verliehen = sum(int(eintrag.get("anzahl", 0)) for eintrag in verleihungen)

        if anzahl is not None and total_verliehen > anzahl:
            raise serializers.ValidationError({
                "verleihungen": "Verliehene Anzahl darf die Gesamtanzahl nicht überschreiten."
            })

        if not verleihungen:
            attrs["verleihungen"] = []
            attrs["ist_verliehen"] = False
            attrs["verliehen_anzahl"] = 0
            attrs["verliehen_an"] = None
            attrs["verliehen_bis"] = None
        else:
            attrs["verleihungen"] = verleihungen
            attrs["ist_verliehen"] = True
            attrs["verliehen_anzahl"] = total_verliehen
            attrs["verliehen_an"] = verleihungen[0]["an"] if len(verleihungen) == 1 else "Mehrere Entlehner"
            attrs["verliehen_bis"] = self._summary_verliehen_bis(verleihungen)

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
