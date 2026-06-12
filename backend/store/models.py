from decimal import Decimal

from django.conf import settings
from django.core.validators import FileExtensionValidator, MinValueValidator, MaxValueValidator
from django.db import models
from django.utils.text import slugify

from .storage import RawAssetStorage


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=80, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["name"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Asset(models.Model):
    class SimulatorType(models.TextChoices):
        MSTS = "MSTS", "MSTS"
        OPEN_RAILS = "OPEN_RAILS", "Open Rails"
        BOTH = "BOTH", "MSTS + Open Rails"

    title = models.CharField(max_length=180)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    category = models.ForeignKey(Category, related_name="assets", on_delete=models.PROTECT)
    description = models.TextField()
    short_description = models.CharField(max_length=260)
    simulator_type = models.CharField(max_length=20, choices=SimulatorType.choices, default=SimulatorType.BOTH)
    version = models.CharField(max_length=40, default="1.0.0")
    file_size = models.CharField(max_length=40)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0.00"))
    is_free = models.BooleanField(default=True)
    is_published = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_upcoming = models.BooleanField(default=False)
    thumbnail = models.ImageField(upload_to="assets/thumbnails/", blank=True, null=True)
    preview_video_url = models.URLField(blank=True)
    requirements = models.TextField(blank=True)
    installation_steps = models.TextField(blank=True)
    changelog = models.TextField(blank=True)
    download_file = models.FileField(
        upload_to="assets/files/",
        blank=True,
        null=True,
        storage=RawAssetStorage(),
        validators=[FileExtensionValidator(["zip", "rar", "7z"])],
    )
    external_download_url = models.URLField(blank=True)
    download_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_featured", "-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        if self.price == 0:
            self.is_free = True
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class AssetImage(models.Model):
    asset = models.ForeignKey(Asset, related_name="images", on_delete=models.CASCADE)
    image = models.ImageField(upload_to="assets/screenshots/")
    alt_text = models.CharField(max_length=180, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]


class AssetFile(models.Model):
    asset = models.ForeignKey(Asset, related_name="files", on_delete=models.CASCADE)
    file = models.FileField(upload_to="assets/files/", storage=RawAssetStorage(), validators=[FileExtensionValidator(["zip", "rar", "7z"])])
    version = models.CharField(max_length=40)
    file_size = models.CharField(max_length=40)
    is_active = models.BooleanField(default=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.asset.title} v{self.version}"


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        REFUNDED = "REFUNDED", "Refunded"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="orders", on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, related_name="orders", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default="INR")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    provider_order_id = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "asset"],
                condition=models.Q(status="PAID"),
                name="one_paid_order_per_user_asset",
            )
        ]


class Payment(models.Model):
    class Provider(models.TextChoices):
        RAZORPAY = "RAZORPAY", "Razorpay"
        STRIPE = "STRIPE", "Stripe"
        MANUAL = "MANUAL", "Manual"

    order = models.OneToOneField(Order, related_name="payment", on_delete=models.CASCADE)
    provider = models.CharField(max_length=20, choices=Provider.choices, default=Provider.RAZORPAY)
    provider_payment_id = models.CharField(max_length=180, blank=True)
    provider_signature = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=40, default="created")
    raw_response = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class DownloadLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="download_logs", on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, related_name="download_logs", on_delete=models.CASCADE)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.CharField(max_length=255, blank=True)
    downloaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-downloaded_at"]


class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="reviews", on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, related_name="reviews", on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    is_approved = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        unique_together = ["user", "asset"]


class Wishlist(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="wishlist_items", on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, related_name="wishlisted_by", on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["user", "asset"]
        ordering = ["-created_at"]


class UpdateLog(models.Model):
    asset = models.ForeignKey(Asset, related_name="updates", on_delete=models.CASCADE)
    version = models.CharField(max_length=40)
    changelog = models.TextField()
    file = models.FileField(
        upload_to="assets/updates/",
        blank=True,
        null=True,
        storage=RawAssetStorage(),
        validators=[FileExtensionValidator(["zip", "rar", "7z"])],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
