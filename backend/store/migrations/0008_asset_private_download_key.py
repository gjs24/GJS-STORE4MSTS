from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0007_asset_thumbnail_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="private_download_key",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
