import uuid

from django.db import migrations, models


DEFAULT_STELLEN = [
    "Rettungsdienst",
    "Polizei",
    "Gemeinde",
    "EVN / Wiener Netze",
    "Flughafen Wien (FBL)",
    "ÖBB Einsatzleiter",
    "Andere",
]


def _normalize_legacy_values(raw):
    if isinstance(raw, list):
        values = [str(item).strip() for item in raw if str(item).strip()]
    else:
        values = [part.strip() for part in str(raw or '').split(',') if part.strip()]
    return list(dict.fromkeys(values))


def forwards_migrate_mitalarmiert_to_m2m(apps, schema_editor):
    Einsatzbericht = apps.get_model('einsatzberichte', 'Einsatzbericht')
    MitalarmierteStelle = apps.get_model('einsatzberichte', 'MitalarmierteStelle')

    stelle_by_name = {}
    for name in DEFAULT_STELLEN:
        stelle, _ = MitalarmierteStelle.objects.get_or_create(name=name)
        stelle_by_name[name] = stelle

    for bericht in Einsatzbericht.objects.all():
        values = _normalize_legacy_values(getattr(bericht, 'mitalarmiert', []))
        stellen = []

        for value in values:
            stelle = stelle_by_name.get(value)
            if stelle is None:
                stelle, _ = MitalarmierteStelle.objects.get_or_create(name=value)
                stelle_by_name[value] = stelle
            stellen.append(stelle)

        if stellen:
            bericht.mitalarmierte_stellen.set(stellen)


def backwards_migrate_m2m_to_mitalarmiert(apps, schema_editor):
    Einsatzbericht = apps.get_model('einsatzberichte', 'Einsatzbericht')

    for bericht in Einsatzbericht.objects.all():
        names = list(bericht.mitalarmierte_stellen.order_by('name').values_list('name', flat=True))
        bericht.mitalarmiert = names
        bericht.save(update_fields=['mitalarmiert'])


class Migration(migrations.Migration):

    dependencies = [
        ('einsatzberichte', '0005_mitalarmiert_jsonfield'),
    ]

    operations = [
        migrations.CreateModel(
            name='MitalarmierteStelle',
            fields=[
                ('pkid', models.BigAutoField(editable=False, primary_key=True, serialize=False, unique=True)),
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=120, unique=True, verbose_name='Name')),
            ],
            options={
                'ordering': ['name', 'pkid'],
            },
        ),
        migrations.AddField(
            model_name='einsatzbericht',
            name='mitalarmierte_stellen',
            field=models.ManyToManyField(blank=True, related_name='einsatzberichte', to='einsatzberichte.mitalarmiertestelle'),
        ),
        migrations.RunPython(forwards_migrate_mitalarmiert_to_m2m, backwards_migrate_m2m_to_mitalarmiert),
        migrations.RemoveField(
            model_name='einsatzbericht',
            name='mitalarmiert',
        ),
    ]
