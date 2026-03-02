import json

from django.db import migrations, models


def _split_legacy_value(value):
    return [part.strip() for part in str(value or '').split(',') if part.strip()]


def forwards_convert_mitalarmiert_to_json(apps, schema_editor):
    Einsatzbericht = apps.get_model('einsatzberichte', 'Einsatzbericht')

    for bericht in Einsatzbericht.objects.all().only('pkid', 'mitalarmiert'):
        raw = bericht.mitalarmiert
        if raw in (None, ''):
            values = []
        else:
            values = _split_legacy_value(raw)

        bericht.mitalarmiert = json.dumps(values, ensure_ascii=False)
        bericht.save(update_fields=['mitalarmiert'])


def backwards_convert_mitalarmiert_to_text(apps, schema_editor):
    Einsatzbericht = apps.get_model('einsatzberichte', 'Einsatzbericht')

    for bericht in Einsatzbericht.objects.all().only('pkid', 'mitalarmiert'):
        raw = bericht.mitalarmiert

        if isinstance(raw, list):
            values = [str(item).strip() for item in raw if str(item).strip()]
        else:
            text = str(raw or '').strip()
            if not text:
                values = []
            else:
                try:
                    parsed = json.loads(text)
                except Exception:
                    parsed = text

                if isinstance(parsed, list):
                    values = [str(item).strip() for item in parsed if str(item).strip()]
                else:
                    values = _split_legacy_value(parsed)

        bericht.mitalarmiert = ', '.join(values)
        bericht.save(update_fields=['mitalarmiert'])


class Migration(migrations.Migration):

    dependencies = [
        ('einsatzberichte', '0004_einsatzbericht_mitalarmiert'),
    ]

    operations = [
        migrations.RunPython(
            forwards_convert_mitalarmiert_to_json,
            backwards_convert_mitalarmiert_to_text,
        ),
        migrations.AlterField(
            model_name='einsatzbericht',
            name='mitalarmiert',
            field=models.JSONField(blank=True, default=list, verbose_name='Mitalarmiert'),
        ),
    ]
