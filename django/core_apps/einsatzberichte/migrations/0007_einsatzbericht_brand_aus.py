from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('einsatzberichte', '0006_mitalarmierte_stellen_m2m'),
    ]

    operations = [
        migrations.AddField(
            model_name='einsatzbericht',
            name='brand_aus',
            field=models.TimeField(blank=True, null=True, verbose_name='Brand aus'),
        ),
    ]
