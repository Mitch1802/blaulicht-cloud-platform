from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("einsatzberichte", "0002_einsatzberichtfoto_dokument_typ"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="einsatzbericht",
            name="geschaedigter_pkw",
        ),
        migrations.RemoveField(
            model_name="einsatzbericht",
            name="foto_doku",
        ),
        migrations.RemoveField(
            model_name="einsatzbericht",
            name="zulassungsschein",
        ),
        migrations.RemoveField(
            model_name="einsatzbericht",
            name="versicherungsschein",
        ),
    ]
