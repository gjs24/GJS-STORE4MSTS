from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0008_asset_private_download_key"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="google_drive_file_id",
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
