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
    deal_is_open = models.BooleanField(default=False)
    deal_title = models.CharField(max_length=120, default="Launch Offer")
    deal_badge = models.CharField(max_length=60, default="Limited Time")
    deal_status_text = models.CharField(max_length=160, blank=True)
    deal_ends_at = models.DateTimeField(blank=True, null=True)
    is_free = models.BooleanField(default=True)
    is_published = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_upcoming = models.BooleanField(default=False)
    coming_soon_banner_title = models.CharField(max_length=180, blank=True)
    coming_soon_message = models.TextField(blank=True)
    coming_soon_button_text = models.CharField(max_length=60, default="Notify Me")
    coming_soon_badge = models.CharField(max_length=40, default="COMING SOON")
    coming_soon_status_text = models.CharField(max_length=120, default="Release Date: To Be Announced")
    thumbnail = models.ImageField(upload_to="assets/thumbnails/", blank=True, null=True)
    thumbnail_url = models.URLField(blank=True)
    gallery_image_urls = models.TextField(blank=True)
    preview_video_url = models.URLField(blank=True)
    media_gallery_urls = models.TextField(blank=True)
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
    private_download_key = models.CharField(max_length=500, blank=True)
    google_drive_file_id = models.CharField(max_length=200, blank=True)
    download_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_featured", "-created_at"]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        self.is_free = self.price <= Decimal("0.00")
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
        VERIFICATION_PENDING = "VERIFICATION_PENDING", "Verification Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
        EXPIRED = "EXPIRED", "Expired"
        REFUNDED = "REFUNDED", "Refunded"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="orders", on_delete=models.CASCADE)
    asset = models.ForeignKey(Asset, related_name="orders", on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=8, default="INR")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    provider_order_id = models.CharField(max_length=160, blank=True)
    utr = models.CharField(max_length=80, blank=True, null=True, unique=True)
    payer_name = models.CharField(max_length=160, blank=True)
    payment_submitted_at = models.DateTimeField(blank=True, null=True)
    download_enabled = models.BooleanField(default=False)
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
        MANUAL = "MANUAL", "Manual"
        CASHFREE = "CASHFREE", "Cashfree"

    order = models.OneToOneField(Order, related_name="payment", on_delete=models.CASCADE)
    provider = models.CharField(max_length=20, choices=Provider.choices, default=Provider.MANUAL)
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


class NotifyRequest(models.Model):
    asset = models.ForeignKey(Asset, related_name="notify_requests", on_delete=models.CASCADE)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="notify_requests", on_delete=models.CASCADE)
    email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ["asset", "user"]
        ordering = ["-created_at"]


class AdminActivityLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, blank=True, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=120)
    target_type = models.CharField(max_length=80, blank=True)
    target_id = models.CharField(max_length=80, blank=True)
    message = models.CharField(max_length=260)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
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


class SiteSetting(models.Model):
    hero_image_url = models.URLField(blank=True)
    hero_slideshow_urls = models.TextField(blank=True)
    hero_image_alt = models.CharField(max_length=180, default="MSTS-GJS Production Store railway asset preview")
    popup_enabled = models.BooleanField(default=False)
    popup_title = models.CharField(max_length=120, default="Welcome to MSTS-GJS Production Store")
    popup_message = models.TextField(blank=True)
    popup_button_text = models.CharField(max_length=60, default="Browse assets")
    popup_button_url = models.CharField(max_length=200, default="/assets")
    scroller_enabled = models.BooleanField(default=False)
    scroller_message = models.CharField(max_length=500, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Site setting"
        verbose_name_plural = "Site settings"

    def __str__(self):
        return "Site settings"

    @classmethod
    def load(cls):
        setting, _ = cls.objects.get_or_create(pk=1)
        return setting


class EmailOTP(models.Model):
    class Purpose(models.TextChoices):
        SIGNUP = "signup", "Signup"
        LOGIN = "login", "Login"
        RESET = "reset", "Password Reset"
        PROFILE_EDIT = "profile_edit", "Profile Edit"

    email = models.EmailField(db_index=True)
    otp_code = models.CharField(max_length=6)
    purpose = models.CharField(max_length=20, choices=Purpose.choices, default=Purpose.LOGIN)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)
    attempts = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email", "purpose", "is_used"]),
        ]

    def __str__(self):
        return f"OTP for {self.email} ({self.purpose}) - Used: {self.is_used}"

    def is_valid(self):
        from django.utils import timezone
        return not self.is_used and self.attempts < 5 and timezone.now() <= self.expires_at

