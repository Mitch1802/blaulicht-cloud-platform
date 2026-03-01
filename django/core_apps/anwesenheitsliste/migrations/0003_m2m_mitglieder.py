from django.db import migrations, models


def copy_fk_to_m2m(apps, schema_editor):
    Anwesenheitsliste = apps.get_model("anwesenheitsliste", "Anwesenheitsliste")
    for eintrag in Anwesenheitsliste.objects.exclude(mitglied_id__isnull=True):
        eintrag.mitglieder.add(eintrag.mitglied_id_id)


class Migration(migrations.Migration):

    dependencies = [
        ("anwesenheitsliste", "0002_anwesenheitsliste_mitglied_id"),
    ]

    operations = [
        migrations.AddField(
            model_name="anwesenheitsliste",
            name="mitglieder",
            field=models.ManyToManyField(blank=True, related_name="anwesenheitslisten", to="mitglieder.mitglied"),
        ),
        migrations.RunPython(copy_fk_to_m2m, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="anwesenheitsliste",
            name="mitglied_id",
        ),
    ]
