from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('einsatzberichte', '0007_einsatzbericht_brand_aus'),
    ]

    operations = [
        migrations.AddField(
            model_name='einsatzbericht',
            name='bma_meldergruppe',
            field=models.CharField(blank=True, default='', max_length=120, verbose_name='BMA Meldergruppe'),
        ),
        migrations.AddField(
            model_name='einsatzbericht',
            name='bma_melder',
            field=models.CharField(blank=True, default='', max_length=120, verbose_name='BMA Melder'),
        ),
        migrations.AddField(
            model_name='einsatzbericht',
            name='bma_fehl_tauschungsalarm',
            field=models.CharField(
                blank=True,
                choices=[
                    ('', 'Kein Fehl-/Täuschungsalarm'),
                    ('Fehlalarm', 'Fehlalarm'),
                    ('Täuschungsalarm', 'Täuschungsalarm'),
                ],
                default='',
                max_length=20,
                verbose_name='Fehl- oder Täuschungsalarm',
            ),
        ),
    ]
