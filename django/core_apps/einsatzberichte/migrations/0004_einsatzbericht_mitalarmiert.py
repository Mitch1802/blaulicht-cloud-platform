from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("einsatzberichte", "0003_remove_einsatzbericht_doku_checkboxes"),
    ]

    operations = [
        migrations.AddField(
            model_name="einsatzbericht",
            name="mitalarmiert",
            field=models.CharField(blank=True, default="", max_length=120, verbose_name="Mitalarmiert"),
        ),
    ]
