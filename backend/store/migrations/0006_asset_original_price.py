from decimal import Decimal

from django.db import migrations, models


def copy_price_to_original_price(apps, schema_editor):
    Asset = apps.get_model("store", "Asset")
    for asset in Asset.objects.all():
        asset.original_price = asset.price if asset.price and asset.price > Decimal("0.00") else Decimal("0.00")
        asset.save(update_fields=["original_price"])


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0005_asset_external_download_url"),
    ]

    operations = [
        migrations.AddField(
            model_name="asset",
            name="original_price",
            field=models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=10),
        ),
        migrations.RunPython(copy_price_to_original_price, migrations.RunPython.noop),
    ]
