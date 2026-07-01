from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0019_sync_asset_free_flag_from_price"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="media_gallery_urls",
            field=models.TextField(blank=True),
        ),
    ]
