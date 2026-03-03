from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("mitglieder", "0005_mitglied_import_fields_and_unique_pair"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="mitglied",
            name="abgemeldet",
        ),
        migrations.RemoveField(
            model_name="mitglied",
            name="aktiv_ueberstellt_am",
        ),
        migrations.AlterField(
            model_name="mitglied",
            name="jugend_wissentest",
            field=models.CharField(blank=True, max_length=255, verbose_name="Wissentest"),
        ),
    ]
