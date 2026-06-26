from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("store", "0016_asset_deal_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("VERIFICATION_PENDING", "Verification Pending"),
                    ("APPROVED", "Approved"),
                    ("REJECTED", "Rejected"),
                    ("PAID", "Paid"),
                    ("FAILED", "Failed"),
                    ("REFUNDED", "Refunded"),
                ],
                default="PENDING",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="download_enabled",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="order",
            name="payer_name",
            field=models.CharField(blank=True, max_length=160),
        ),
        migrations.AddField(
            model_name="order",
            name="payment_submitted_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="order",
            name="utr",
            field=models.CharField(blank=True, max_length=80, null=True, unique=True),
        ),
        migrations.AlterField(
            model_name="payment",
            name="provider",
            field=models.CharField(
                choices=[
                    ("MANUAL", "Manual"),
                ],
                default="MANUAL",
                max_length=20,
            ),
        ),
    ]
