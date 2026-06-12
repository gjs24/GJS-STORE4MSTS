from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0006_asset_original_price"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="thumbnail_url",
            field=models.URLField(blank=True),
        ),
    ]
