from django.db import migrations, models
import django.core.validators
import store.storage


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0003_asset_is_upcoming"),
    ]

    operations = [
        migrations.AlterField(
            model_name="asset",
            name="download_file",
            field=models.FileField(
                blank=True,
                null=True,
                storage=store.storage.RawAssetStorage(),
                upload_to="assets/files/",
                validators=[django.core.validators.FileExtensionValidator(["zip", "rar", "7z"])],
            ),
        ),
        migrations.AlterField(
            model_name="assetfile",
            name="file",
            field=models.FileField(
                storage=store.storage.RawAssetStorage(),
                upload_to="assets/files/",
                validators=[django.core.validators.FileExtensionValidator(["zip", "rar", "7z"])],
            ),
        ),
        migrations.AlterField(
            model_name="updatelog",
            name="file",
            field=models.FileField(
                blank=True,
                null=True,
                storage=store.storage.RawAssetStorage(),
                upload_to="assets/updates/",
                validators=[django.core.validators.FileExtensionValidator(["zip", "rar", "7z"])],
            ),
        ),
    ]
