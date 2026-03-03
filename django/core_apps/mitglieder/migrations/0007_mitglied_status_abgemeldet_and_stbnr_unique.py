from django.db import migrations, models


def deduplicate_stbnr(apps, schema_editor):
    Mitglied = apps.get_model("mitglieder", "Mitglied")
    duplicates = (
        Mitglied.objects.values("stbnr")
        .annotate(cnt=models.Count("id"))
        .filter(cnt__gt=1)
    )

    for duplicate in duplicates:
        stbnr = duplicate["stbnr"]
        records = Mitglied.objects.filter(stbnr=stbnr).order_by("-updated_at", "-created_at", "-pkid")
        keep = records.first()
        if keep is None:
            continue
        records.exclude(pkid=keep.pkid).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("mitglieder", "0006_remove_abgemeldet_and_ueberstellt_and_alter_wissentest"),
    ]

    operations = [
        migrations.RunPython(deduplicate_stbnr, migrations.RunPython.noop),
        migrations.RemoveConstraint(
            model_name="mitglied",
            name="uniq_mitglied_stbnr_geburtsdatum",
        ),
        migrations.AlterField(
            model_name="mitglied",
            name="stbnr",
            field=models.IntegerField(unique=True, verbose_name="Standesbuchnummer"),
        ),
        migrations.AlterField(
            model_name="mitglied",
            name="dienststatus",
            field=models.CharField(
                choices=[
                    ("JUGEND", "Jugend"),
                    ("AKTIV", "Aktiv"),
                    ("RESERVE", "Reserve"),
                    ("ABGEMELDET", "Abgemeldet"),
                ],
                default="AKTIV",
                max_length=20,
                verbose_name="Dienststatus",
            ),
        ),
    ]
