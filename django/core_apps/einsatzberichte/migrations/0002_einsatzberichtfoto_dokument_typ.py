from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("einsatzberichte", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="einsatzberichtfoto",
            name="dokument_typ",
            field=models.CharField(
                choices=[
                    ("ALLGEMEIN", "Allgemein"),
                    ("DOKU", "Foto Doku"),
                    ("ZULASSUNG", "Zulassungsschein"),
                    ("VERSICHERUNG", "Versicherungsschein"),
                ],
                default="ALLGEMEIN",
                max_length=20,
                verbose_name="Dokumenttyp",
            ),
        ),
    ]
