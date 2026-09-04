from django.contrib.auth.models import User
from django.conf import settings
from django.db.models import Avg, Q
from urllib.parse import quote
from rest_framework import serializers

from .models import AdminActivityLog, Asset, AssetImage, Category, DownloadLog, EmailOTP, NotifyRequest, Order, Payment, Review, SiteSetting, UpdateLog, Wishlist


class UserSerializer(serializers.ModelSerializer):
    date_joined = serializers.DateTimeField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "is_staff", "is_active", "date_joined"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "first_name", "last_name"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.ChoiceField(choices=["login", "signup", "reset", "profile_edit"], default="login")


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    purpose = serializers.ChoiceField(choices=["login", "signup", "reset", "profile_edit"], default="login")
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password = serializers.CharField(min_length=8, required=False, allow_blank=True, write_only=True)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)


class CategorySerializer(serializers.ModelSerializer):
    asset_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "icon", "is_active", "asset_count"]


class AssetImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = AssetImage
        fields = ["id", "image", "alt_text", "sort_order"]

    def get_image(self, obj):
        if not obj.image:
            return None
        try:
            url = obj.image.url
        except Exception:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request and not url.startswith(("http://", "https://")) else url


class UpdateLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = UpdateLog
        fields = ["id", "version", "changelog", "created_at"]


class ReviewSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    user_id = serializers.IntegerField(source="user.id", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "asset", "user", "user_id", "rating", "comment", "is_approved", "created_at"]
        read_only_fields = ["user", "is_approved", "created_at"]


class AssetListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    average_rating = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()
    has_file = serializers.SerializerMethodField()
    savings_amount = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    review_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Asset
        fields = [
            "id",
            "title",
            "slug",
            "category",
            "short_description",
            "simulator_type",
            "version",
            "file_size",
            "original_price",
            "price",
            "deal_is_open",
            "deal_title",
            "deal_badge",
            "deal_status_text",
            "deal_ends_at",
            "discount_percent",
            "savings_amount",
            "is_free",
            "is_published",
            "is_featured",
            "is_upcoming",
            "coming_soon_banner_title",
            "coming_soon_message",
            "coming_soon_button_text",
            "coming_soon_badge",
            "coming_soon_status_text",
            "thumbnail",
            "thumbnail_url",
            "gallery_image_urls",
            "media_gallery_urls",
            "has_file",
            "download_count",
            "average_rating",
            "review_count",
            "created_at",
        ]

    def get_average_rating(self, obj):
        if hasattr(obj, "avg_rating") and obj.avg_rating is not None:
            return round(float(obj.avg_rating), 1)
        rating = obj.reviews.filter(is_approved=True).aggregate(avg=Avg("rating"))["avg"]
        return round(rating or 0, 1)

    def get_discount_percent(self, obj):
        if obj.is_free or not obj.original_price or obj.original_price <= obj.price:
            return 0
        return round(((obj.original_price - obj.price) / obj.original_price) * 100)

    def get_savings_amount(self, obj):
        if obj.is_free or not obj.original_price or obj.original_price <= obj.price:
            return "0.00"
        return f"{obj.original_price - obj.price:.2f}"

    def get_has_file(self, obj):
        return bool(obj.download_file or obj.external_download_url or obj.private_download_key or obj.google_drive_file_id)

    def get_thumbnail(self, obj):
        if obj.thumbnail_url:
            return obj.thumbnail_url
        if not obj.thumbnail:
            return None
        try:
            url = obj.thumbnail.url
        except Exception:
            return None
        if url.startswith("http://") or url.startswith("https://"):
            return url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class AssetDetailSerializer(AssetListSerializer):
    images = AssetImageSerializer(many=True, read_only=True)
    reviews = serializers.SerializerMethodField()
    updates = UpdateLogSerializer(many=True, read_only=True)
    can_download = serializers.SerializerMethodField()

    class Meta(AssetListSerializer.Meta):
        fields = AssetListSerializer.Meta.fields + [
            "description",
            "preview_video_url",
            "requirements",
            "installation_steps",
            "changelog",
            "external_download_url",
            "private_download_key",
            "google_drive_file_id",
            "images",
            "reviews",
            "updates",
            "can_download",
            "updated_at",
        ]

    def get_reviews(self, obj):
        approved = obj.reviews.filter(is_approved=True).select_related("user")
        return ReviewSerializer(approved, many=True, context=self.context).data

    def get_can_download(self, obj):
        user = self.context["request"].user
        if not user.is_authenticated:
            return False
        if obj.is_free:
            return True
        return Order.objects.filter(user=user, asset=obj, status=Order.Status.PAID).exists()


class AssetWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Asset
        fields = "__all__"


class OrderSerializer(serializers.ModelSerializer):
    asset = AssetListSerializer(read_only=True)
    asset_id = serializers.PrimaryKeyRelatedField(source="asset", queryset=Asset.objects.all(), write_only=True)
    user = UserSerializer(read_only=True)
    order_id = serializers.CharField(source="provider_order_id", read_only=True)
    download_enabled = serializers.SerializerMethodField()
    manual_payment = serializers.SerializerMethodField()
    payment_session_id = serializers.SerializerMethodField()
    payment_provider = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_id",
            "user",
            "asset",
            "asset_id",
            "amount",
            "currency",
            "status",
            "provider_order_id",
            "utr",
            "payer_name",
            "payment_submitted_at",
            "download_enabled",
            "manual_payment",
            "payment_session_id",
            "payment_provider",
            "created_at",
        ]
        read_only_fields = ["amount", "status", "provider_order_id", "utr", "payer_name", "payment_submitted_at", "download_enabled", "manual_payment", "payment_session_id", "payment_provider", "created_at"]

    def get_download_enabled(self, obj):
        return obj.asset.is_free or obj.status == Order.Status.PAID

    def get_manual_payment(self, obj):
        payment = getattr(obj, "payment", None)
        if payment and payment.provider == Payment.Provider.CASHFREE:
            return None
        if self.get_download_enabled(obj):
            return None
        upi_id = getattr(settings, "MANUAL_UPI_ID", "")
        if not upi_id:
            return None
        payee_name = getattr(settings, "MANUAL_UPI_PAYEE_NAME", "MSTS-GJS Production Store")
        note = f"Order {obj.provider_order_id or obj.id}"
        return {
            "upi_id": upi_id,
            "payee_name": payee_name,
            "amount": str(obj.amount),
            "currency": obj.currency,
            "upi_uri": (
                f"upi://pay?pa={quote(upi_id)}&pn={quote(payee_name)}&am={obj.amount}"
                f"&cu={quote(obj.currency)}&tn={quote(note)}"
            ),
            "instructions": "Pay the exact amount by UPI, then submit the UTR / transaction ID for admin verification.",
        }

    def get_payment_session_id(self, obj):
        payment = getattr(obj, "payment", None)
        if not payment or payment.provider != Payment.Provider.CASHFREE:
            return ""
        return payment.raw_response.get("payment_session_id", "")

    def get_payment_provider(self, obj):
        payment = getattr(obj, "payment", None)
        return payment.provider if payment else ""


class PaymentVerifySerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    utr = serializers.CharField(required=False, allow_blank=True, min_length=6, max_length=80)
    payer_name = serializers.CharField(required=False, allow_blank=True, max_length=160)


class DownloadLogSerializer(serializers.ModelSerializer):
    asset = AssetListSerializer(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = DownloadLog
        fields = ["id", "asset", "user", "ip_address", "downloaded_at"]


class WishlistSerializer(serializers.ModelSerializer):
    asset = AssetListSerializer(read_only=True)
    asset_id = serializers.PrimaryKeyRelatedField(source="asset", queryset=Asset.objects.all(), write_only=True)
    download_enabled = serializers.SerializerMethodField()

    class Meta:
        model = Wishlist
        fields = ["id", "asset", "asset_id", "download_enabled", "created_at"]
        read_only_fields = ["created_at"]

    def get_download_enabled(self, obj):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        if not user:
            return False
        if obj.asset.is_free:
            return True
        return Order.objects.filter(user=user, asset=obj.asset, status=Order.Status.PAID).exists()


class NotifyRequestSerializer(serializers.ModelSerializer):
    asset = AssetListSerializer(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = NotifyRequest
        fields = ["id", "asset", "user", "email", "created_at"]
        read_only_fields = ["asset", "user", "email", "created_at"]


class AdminActivityLogSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = AdminActivityLog
        fields = ["id", "actor", "action", "target_type", "target_id", "message", "created_at"]


class SiteSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteSetting
        fields = [
            "hero_image_url",
            "hero_slideshow_urls",
            "hero_image_alt",
            "popup_enabled",
            "popup_title",
            "popup_message",
            "popup_button_text",
            "popup_button_url",
            "scroller_enabled",
            "scroller_message",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]
