from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0004_raw_asset_storage"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="external_download_url",
            field=models.URLField(blank=True),
        ),
    ]
