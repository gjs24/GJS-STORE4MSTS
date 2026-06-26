from django.db import migrations


def sync_asset_free_flag(apps, schema_editor):
    Asset = apps.get_model("store", "Asset")
    Order = apps.get_model("store", "Order")
    Asset.objects.filter(price__gt=0, is_free=True).update(is_free=False)
    Asset.objects.filter(price=0, is_free=False).update(is_free=True)
    Order.objects.filter(asset__price__gt=0, status="APPROVED").update(status="PENDING", download_enabled=False)


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0018_cashfree_payment_provider"),
    ]

    operations = [
        migrations.RunPython(sync_asset_free_flag, migrations.RunPython.noop),
    ]
