from decimal import Decimal
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("store", "0035_asset_prebooking_badge_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="BoardTemplate",
            fields=[
                ("id", models.CharField(help_text="Unique slug ID e.g. amrit-bharat-led-1024", max_length=100, primary_key=True, serialize=False)),
                ("name", models.CharField(max_length=180)),
                ("category", models.CharField(default="LED_MATRIX", max_length=80)),
                ("description", models.TextField(blank=True)),
                ("base_width", models.PositiveIntegerField(default=1024)),
                ("base_height", models.PositiveIntegerField(default=1024)),
                ("background_image", models.ImageField(blank=True, null=True, upload_to="assets/board_templates/")),
                ("background_image_url", models.URLField(blank=True, default="")),
                ("is_paid", models.BooleanField(default=False)),
                ("price", models.DecimalField(decimal_places=2, default=Decimal("0.00"), max_digits=10)),
                ("published", models.BooleanField(default=True)),
                ("fields", models.JSONField(blank=True, default=list, help_text="LED text slot definitions")),
                ("fixed_graphics", models.JSONField(blank=True, default=list, help_text="Fixed graphics, borders, bolts, IR crests")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["is_paid", "name"],
            },
        ),
        migrations.AlterField(
            model_name="order",
            name="asset",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="orders", to="store.asset"),
        ),
        migrations.AddField(
            model_name="order",
            name="board_template",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="orders", to="store.boardtemplate"),
        ),
        migrations.RemoveConstraint(
            model_name="order",
            name="one_paid_order_per_user_asset",
        ),
        migrations.AddConstraint(
            model_name="order",
            constraint=models.UniqueConstraint(condition=models.Q(("asset__isnull", False), ("status", "PAID")), fields=("user", "asset"), name="one_paid_order_per_user_asset"),
        ),
        migrations.AddConstraint(
            model_name="order",
            constraint=models.UniqueConstraint(condition=models.Q(("board_template__isnull", False), ("status", "PAID")), fields=("user", "board_template"), name="one_paid_order_per_user_board_template"),
        ),
        migrations.CreateModel(
            name="UserCustomBoard",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(default="My Custom Board", max_length=180)),
                ("custom_field_values", models.JSONField(blank=True, default=dict)),
                ("preview_image_url", models.TextField(blank=True, default="")),
                ("saved_at", models.DateTimeField(auto_now=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("template", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="custom_boards", to="store.boardtemplate")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="custom_boards", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-saved_at"],
            },
        ),
        migrations.CreateModel(
            name="UserBoardUnlock",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("unlocked_at", models.DateTimeField(auto_now_add=True)),
                ("order", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="board_unlocks", to="store.order")),
                ("template", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="unlocks", to="store.boardtemplate")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="board_unlocks", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-unlocked_at"],
                "unique_together": {("user", "template")},
            },
        ),
    ]

