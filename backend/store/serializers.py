import re
from urllib.parse import quote
from django.contrib.auth.models import User
from django.conf import settings
from django.db.models import Avg, Q
from django.utils import timezone
from urllib.parse import quote
from rest_framework import serializers

from .early_access import get_cached_early_access_status
from .models import AdminActivityLog, Asset, AssetImage, Category, DownloadLog, EmailOTP, NotifyRequest, Order, Payment, Review, SiteSetting, UpdateLog, UserSpecialAccess, Wishlist
from .models import (
    AdminActivityLog,
    Asset,
    AssetImage,
    BoardTemplate,
    Category,
    DownloadLog,
    EmailOTP,
    NotifyRequest,
    Order,
    Payment,
    Review,
    SiteSetting,
    SpecialAccessClaimRequest,
    SpecialAccessInviteLink,
    UpdateLog,
    UserBoardUnlock,
    UserCustomBoard,
    UserProfile,
    UserSpecialAccess,
    Wishlist,
)
from .special_access import user_has_special_access


class UserSpecialAccessSerializer(serializers.ModelSerializer):
    granted_asset_titles = serializers.SerializerMethodField()

    class Meta:
        model = UserSpecialAccess
        fields = [
            "id",
            "is_all_access_free",
            "admin_note",
            "expires_at",
            "granted_assets",
            "granted_asset_titles",
            "created_at",
            "updated_at",
        ]

    def get_granted_asset_titles(self, obj):
        try:
            return list(obj.granted_assets.values_list("title", flat=True))
        except Exception:
            return []


class UserSerializer(serializers.ModelSerializer):
    date_joined = serializers.DateTimeField(read_only=True)
    paid_orders_count = serializers.IntegerField(read_only=True, default=0)
    special_access = serializers.SerializerMethodField()
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)
    new_password = serializers.CharField(required=False, allow_blank=True, write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "is_staff",
            "is_active",
            "date_joined",
            "paid_orders_count",
            "special_access",
            "new_password",
        ]

    def validate_email(self, value):
        if value:
            norm_email = value.strip().lower()
            qs = User.objects.filter(email__iexact=norm_email)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError("An account with this email address already exists.")
            return norm_email
        return value

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        phone = ""
        try:
            profile = getattr(instance, "profile", None) or UserProfile.objects.filter(user=instance).first()
            if profile and profile.phone_number:
                phone = profile.phone_number
        except Exception:
            pass
        if not phone:
            try:
                prev = instance.orders.exclude(customer_phone="").order_by("-id").first()
                if prev and prev.customer_phone:
                    phone = prev.customer_phone
            except Exception:
                pass
        ret["phone_number"] = phone
        return ret

    def update(self, instance, validated_data):
        phone_number = validated_data.pop("phone_number", None)
        new_password = validated_data.pop("new_password", None)

        user = super().update(instance, validated_data)

        if new_password:
            user.set_password(new_password)
            user.save(update_fields=["password"])

        if phone_number is not None:
            clean_digits = re.sub(r"\D", "", str(phone_number))
            clean_phone = clean_digits[-10:] if len(clean_digits) >= 10 else clean_digits
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.phone_number = clean_phone
            profile.save(update_fields=["phone_number"])

        return user

    def get_special_access(self, obj):
        # Only staff administrators or the user themselves gets special_access in serialized output
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            return None
        if not user.is_staff and user.id != obj.id:
            return None
        try:
            access = getattr(obj, "special_access", None)
            if access:
                return UserSpecialAccessSerializer(access, context=self.context).data
        except Exception:
            pass
        return None


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    phone_number = serializers.CharField(required=False, allow_blank=True, max_length=20)

    class Meta:
        model = User
        fields = ["id", "username", "email", "password", "phone_number", "first_name", "last_name"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        phone_number = validated_data.pop("phone_number", "")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        if phone_number:
            clean_digits = re.sub(r"\D", "", str(phone_number))
            clean_phone = clean_digits[-10:] if len(clean_digits) >= 10 else clean_digits
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.phone_number = clean_phone
            profile.save(update_fields=["phone_number"])
        return user


class SendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    purpose = serializers.CharField(max_length=32, required=False, default="login")


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)
    purpose = serializers.CharField(max_length=32, required=False, default="login")
    username = serializers.CharField(max_length=150, required=False, allow_blank=True)
    password = serializers.CharField(min_length=8, required=False, allow_blank=True, write_only=True)
    phone_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
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
    asset_title = serializers.CharField(source="asset.title", read_only=True)
    asset_slug = serializers.CharField(source="asset.slug", read_only=True)

    class Meta:
        model = Review
        fields = ["id", "asset", "asset_title", "asset_slug", "user", "user_id", "rating", "comment", "is_approved", "created_at"]
        read_only_fields = ["user", "is_approved", "created_at"]


class AssetListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    average_rating = serializers.SerializerMethodField()
    discount_percent = serializers.SerializerMethodField()
    has_file = serializers.SerializerMethodField()
    savings_amount = serializers.SerializerMethodField()
    thumbnail = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    early_access_required_assets = serializers.SerializerMethodField()
    early_access_required_asset_titles = serializers.SerializerMethodField()
    user_is_eligible = serializers.SerializerMethodField()
    user_can_access_early = serializers.SerializerMethodField()
    user_has_early_discount = serializers.SerializerMethodField()
    user_effective_price = serializers.SerializerMethodField()
    user_discount_percent = serializers.SerializerMethodField()
    is_early_access_active = serializers.SerializerMethodField()
    user_early_access_pending = serializers.SerializerMethodField()
    prebooking_count = serializers.SerializerMethodField()
    user_has_prebooked = serializers.SerializerMethodField()
    prebooking_downloads_ready = serializers.SerializerMethodField()
    board_template = serializers.SerializerMethodField()

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
            "deal_starts_at",
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
            "release_date",
            "early_access_enabled",
            "early_access_starts_at",
            "early_access_ends_at",
            "is_early_access_active",
            "early_access_has_access",
            "early_access_has_discount",
            "early_access_discount_percent",
            "early_access_price",
            "early_access_badge",
            "early_access_message",
            "early_access_required_assets",
            "early_access_required_asset_titles",
            "prebooking_enabled",
            "prebooking_price",
            "prebooking_badge",
            "prebooking_message",
            "prebooking_starts_at",
            "prebooking_ends_at",
            "prebooking_download_unlock_at",
            "prebooking_downloads_unlocked",
            "prebooking_slots",
            "prebooking_count",
            "user_has_prebooked",
            "prebooking_downloads_ready",
            "user_is_eligible",
            "user_can_access_early",
            "user_early_access_pending",
            "user_has_early_discount",
            "user_effective_price",
            "user_discount_percent",
            "thumbnail",
            "thumbnail_url",
            "gallery_image_urls",
            "media_gallery_urls",
            "has_file",
            "board_template",
            "board_template_id",
            "bundle_board_template_free",
            "download_count",
            "average_rating",
            "review_count",
            "created_at",
        ]

    def get_average_rating(self, obj):
        if hasattr(obj, "avg_rating") and obj.avg_rating is not None:
            return round(float(obj.avg_rating), 1)
        rating = obj.reviews.filter(is_approved=True).aggregate(avg=Avg("rating"))["avg"]
        return round(float(rating), 1) if rating is not None else 0.0

    def get_review_count(self, obj):
        if hasattr(obj, "review_count") and obj.review_count is not None:
            return int(obj.review_count)
        return obj.reviews.filter(is_approved=True).count()

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

    def get_early_access_required_assets(self, obj):
        try:
            return list(obj.early_access_required_assets.values_list("id", flat=True))
        except Exception:
            return []

    def get_early_access_required_asset_titles(self, obj):
        try:
            return list(obj.early_access_required_assets.values_list("title", flat=True))
        except Exception:
            return []

    def get_user_is_eligible(self, obj):
        ea = get_cached_early_access_status(obj, self.context.get("request"))
        return ea["is_eligible"]

    def get_user_can_access_early(self, obj):
        ea = get_cached_early_access_status(obj, self.context.get("request"))
        return ea["can_access_early"]

    def get_user_has_early_discount(self, obj):
        ea = get_cached_early_access_status(obj, self.context.get("request"))
        return ea["has_early_discount"]

    def get_user_effective_price(self, obj):
        ea = get_cached_early_access_status(obj, self.context.get("request"))
        return f"{ea['effective_price']:.2f}"

    def get_user_discount_percent(self, obj):
        ea = get_cached_early_access_status(obj, self.context.get("request"))
        return ea["discount_percent"]

    def get_is_early_access_active(self, obj):
        ea = get_cached_early_access_status(obj, self.context.get("request"))
        return ea["is_early_access_active"]

    def get_user_early_access_pending(self, obj):
        ea = get_cached_early_access_status(obj, self.context.get("request"))
        return ea["is_early_access_pending"]

    def get_prebooking_count(self, obj):
        if not getattr(obj, "prebooking_enabled", False):
            return 0
        return Order.objects.filter(
            asset=obj,
            status__in=[Order.Status.PAID, Order.Status.APPROVED],
        ).count()

    def get_user_has_prebooked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            return False
        return Order.objects.filter(
            user=user,
            asset=obj,
            status__in=[Order.Status.PAID, Order.Status.APPROVED],
            download_enabled=True,
        ).exists()

    def get_prebooking_downloads_ready(self, obj):
        if not getattr(obj, "is_upcoming", False):
            return True
        if getattr(obj, "prebooking_downloads_unlocked", False):
            return True
        now = timezone.now()
        unlock_at = getattr(obj, "prebooking_download_unlock_at", None)
        if unlock_at and now >= unlock_at:
            return True
        rel_date = getattr(obj, "release_date", None)
        if rel_date and now >= rel_date:
            return True
        return False

    def get_board_template(self, obj):
        if not getattr(obj, "board_template_id", None):
            return None
        bt = obj.board_template
        return {
            "id": bt.id,
            "name": bt.name,
            "category": bt.category,
            "price": str(bt.price),
            "is_paid": bt.is_paid,
            "target_texture_name": getattr(bt, "target_texture_name", "") or "",
            "is_bundled_free": getattr(obj, "bundle_board_template_free", False),
        }


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
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated:
            return False
        # If user has an explicit BLOCKED order for this asset, immediately revoke access
        if Order.objects.filter(user=user, asset=obj, status=Order.Status.BLOCKED).exists():
            return False
        if obj.is_free:
            return True
        if user_has_special_access(user, obj):
            return True

        has_paid_order = Order.objects.filter(
            user=user,
            asset=obj,
            status__in=[Order.Status.PAID, Order.Status.APPROVED],
            download_enabled=True,
        ).exists()

        if not has_paid_order:
            return False

        if obj.is_upcoming:
            now = timezone.now()
            downloads_ready = (
                obj.prebooking_downloads_unlocked
                or (obj.prebooking_download_unlock_at and now >= obj.prebooking_download_unlock_at)
                or (obj.release_date and now >= obj.release_date)
            )
            ea_status = get_cached_early_access_status(obj, request)
            if ea_status["can_access_early"]:
                downloads_ready = True
            return downloads_ready

        return True


class AssetWriteSerializer(serializers.ModelSerializer):
    early_access_required_assets = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Asset.objects.all(),
        required=False,
    )

    class Meta:
        model = Asset
        fields = "__all__"

    def to_internal_value(self, data):
        if hasattr(data, "getlist"):
            raw_list = data.getlist("early_access_required_assets")
            cleaned = []
            for item in raw_list:
                if isinstance(item, str):
                    val_str = item.strip()
                    if val_str.startswith("[") and val_str.endswith("]"):
                        import json
                        try:
                            parsed = json.loads(val_str)
                            if isinstance(parsed, list):
                                for x in parsed:
                                    if isinstance(x, (int, str)) and str(x).strip().isdigit():
                                        cleaned.append(str(x).strip())
                                continue
                        except Exception:
                            pass
                    if "," in val_str:
                        cleaned.extend([p.strip().strip("[]'\"") for p in val_str.split(",") if p.strip().strip("[]'\"").isdigit()])
                    elif val_str.strip("[]'\"").isdigit():
                        cleaned.append(val_str.strip("[]'\""))
                elif isinstance(item, int):
                    cleaned.append(str(item))
            if cleaned or "early_access_required_assets" in data:
                data = data.copy()
                data.setlist("early_access_required_assets", cleaned)
        elif isinstance(data, dict) and "early_access_required_assets" in data:
            val = data["early_access_required_assets"]
            if isinstance(val, str):
                data = data.copy()
                val_str = val.strip()
                if val_str.startswith("[") and val_str.endswith("]"):
                    import json
                    try:
                        parsed = json.loads(val_str)
                        if isinstance(parsed, list):
                            data["early_access_required_assets"] = [int(p) for p in parsed if str(p).strip().isdigit()]
                        else:
                            data["early_access_required_assets"] = []
                    except Exception:
                        data["early_access_required_assets"] = []
                else:
                    data["early_access_required_assets"] = [int(p.strip()) for p in val_str.split(",") if p.strip().isdigit()]

        # Convert empty strings for datetime fields to None
        for dt_field in (
            "release_date",
            "early_access_starts_at",
            "early_access_ends_at",
            "deal_starts_at",
            "deal_ends_at",
            "prebooking_starts_at",
            "prebooking_ends_at",
            "prebooking_download_unlock_at",
        ):
            if dt_field in data:
                val = data.get(dt_field) if hasattr(data, "get") else data[dt_field]
                if not val or val == "" or str(val).lower() == "null":
                    if hasattr(data, "copy"):
                        data = data.copy()
                    data[dt_field] = None

        # Convert empty strings for optional decimal/numeric fields to None or 0
        for num_field in ("prebooking_price", "early_access_price"):
            if num_field in data:
                val = data.get(num_field) if hasattr(data, "get") else data[num_field]
                if val == "" or val is None or str(val).lower() == "null":
                    if hasattr(data, "copy"):
                        data = data.copy()
                    data[num_field] = None

        if "prebooking_slots" in data:
            val = data.get("prebooking_slots") if hasattr(data, "get") else data["prebooking_slots"]
            if val == "" or val is None:
                if hasattr(data, "copy"):
                    data = data.copy()
                data["prebooking_slots"] = 0


        return super().to_internal_value(data)


class BoardTemplateSerializer(serializers.ModelSerializer):
    background_image_url = serializers.CharField(required=False, allow_blank=True)
    can_customize = serializers.SerializerMethodField()
    is_unlocked = serializers.SerializerMethodField()
    unlocked_via_asset = serializers.SerializerMethodField()
    bundled_with_assets = serializers.SerializerMethodField()

    class Meta:
        model = BoardTemplate
        fields = [
            "id",
            "name",
            "category",
            "description",
            "base_width",
            "base_height",
            "background_image",
            "background_image_url",
            "target_texture_name",
            "allow_user_edit_texture_name",
            "is_paid",
            "price",
            "published",
            "fields",
            "fixed_graphics",
            "variations",
            "quick_presets",
            "can_customize",
            "is_unlocked",
            "unlocked_via_asset",
            "bundled_with_assets",
            "created_at",
            "updated_at",
        ]

    def get_can_customize(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        return obj.can_user_customize(user)

    def get_is_unlocked(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        return obj.can_user_customize(user)

    def get_unlocked_via_asset(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if not user or not user.is_authenticated or not obj.is_paid:
            return None
        from .models import Order
        order = Order.objects.filter(
            user=user,
            asset__board_template=obj,
            asset__bundle_board_template_free=True,
            status__in=[Order.Status.APPROVED, Order.Status.PAID],
            download_enabled=True,
        ).select_related("asset").first()
        if order and order.asset:
            return {
                "id": order.asset.id,
                "title": order.asset.title,
                "slug": order.asset.slug,
            }
        return None

    def get_bundled_with_assets(self, obj):
        assets = obj.assets.filter(is_published=True, bundle_board_template_free=True)
        return [{"id": a.id, "title": a.title, "slug": a.slug, "price": str(a.price)} for a in assets]


class UserCustomBoardSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    template_details = BoardTemplateSerializer(source="template", read_only=True)
    template = serializers.PrimaryKeyRelatedField(queryset=BoardTemplate.objects.all())

    class Meta:
        model = UserCustomBoard
        fields = [
            "id",
            "user",
            "template",
            "template_details",
            "title",
            "custom_field_values",
            "preview_image_url",
            "saved_at",
            "created_at",
        ]
        read_only_fields = ["id", "user", "saved_at", "created_at"]


class OrderSerializer(serializers.ModelSerializer):
    asset = AssetListSerializer(read_only=True)
    asset_id = serializers.PrimaryKeyRelatedField(source="asset", queryset=Asset.objects.all(), write_only=True, required=False, allow_null=True)
    board_template = BoardTemplateSerializer(read_only=True)
    board_template_id = serializers.PrimaryKeyRelatedField(source="board_template", queryset=BoardTemplate.objects.all(), write_only=True, required=False, allow_null=True)
    user = UserSerializer(read_only=True)
    order_id = serializers.CharField(source="provider_order_id", read_only=True)
    download_enabled = serializers.SerializerMethodField()
    manual_payment = serializers.SerializerMethodField()
    payment_session_id = serializers.SerializerMethodField()
    payment_provider = serializers.SerializerMethodField()
    cashfree_mode = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_id",
            "user",
            "asset",
            "asset_id",
            "board_template",
            "board_template_id",
            "amount",
            "currency",
            "status",
            "provider_order_id",
            "utr",
            "payer_name",
            "customer_phone",
            "payment_submitted_at",
            "download_enabled",
            "manual_payment",
            "payment_session_id",
            "payment_provider",
            "cashfree_mode",
            "created_at",
        ]
        read_only_fields = ["amount", "status", "provider_order_id", "utr", "payer_name", "payment_submitted_at", "download_enabled", "manual_payment", "payment_session_id", "payment_provider", "cashfree_mode", "created_at"]

    def get_download_enabled(self, obj):
        if obj.status == Order.Status.BLOCKED or not obj.download_enabled:
            return False
        if obj.board_template:
            return obj.status in [Order.Status.PAID, Order.Status.APPROVED]
        return (obj.asset.is_free if obj.asset else False) or obj.status in [Order.Status.PAID, Order.Status.APPROVED]

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
            "payee_vpa": upi_id,
            "payee_name": payee_name,
            "transaction_note": note,
            "amount": str(obj.amount),
            "currency": obj.currency,
            "qr_data": f"upi://pay?pa={quote(upi_id)}&pn={quote(payee_name)}&am={obj.amount}&cu={quote(obj.currency)}&tn={quote(note)}",
            "upi_uri": f"upi://pay?pa={quote(upi_id)}&pn={quote(payee_name)}&am={obj.amount}&cu={quote(obj.currency)}&tn={quote(note)}",
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

    def get_cashfree_mode(self, obj):
        return getattr(settings, "CASHFREE_ENVIRONMENT", "sandbox").lower()


class AdminOrderSerializer(serializers.ModelSerializer):
    asset = AssetListSerializer(read_only=True)
    board_template = BoardTemplateSerializer(read_only=True)
    user = UserSerializer(read_only=True)
    order_id = serializers.CharField(source="provider_order_id", read_only=True)
    download_enabled = serializers.BooleanField(required=False)
    status = serializers.ChoiceField(choices=Order.Status.choices, required=False)
    block_reason = serializers.CharField(max_length=255, required=False, allow_blank=True)
    admin_notes = serializers.CharField(required=False, allow_blank=True)
    blocked_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = Order
        fields = [
            "id",
            "order_id",
            "user",
            "asset",
            "board_template",
            "amount",
            "currency",
            "status",
            "provider_order_id",
            "utr",
            "payer_name",
            "customer_phone",
            "payment_submitted_at",
            "download_enabled",
            "block_reason",
            "admin_notes",
            "blocked_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "order_id",
            "user",
            "asset",
            "amount",
            "currency",
            "provider_order_id",
            "utr",
            "payer_name",
            "payment_submitted_at",
            "blocked_at",
            "created_at",
            "updated_at",
        ]


class PaymentVerifySerializer(serializers.Serializer):
    order_id = serializers.CharField(max_length=64)
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
            "maintenance_mode",
            "maintenance_title",
            "maintenance_message",
            "maintenance_estimated_end",
            "maintenance_bypass_token",
            "desktop_app_download_url",
            "desktop_app_version",
            "desktop_app_enabled",
            "board_studio_enabled",
            "festival_theme_enabled",
            "festival_theme_type",
            "festival_title",
            "festival_subtitle",
            "festival_badge",
            "festival_button_text",
            "festival_button_url",
            "festival_effect",
            "festival_banner_image",
            "festival_discount_percent",
            "festival_announcement_bar",
            "festival_popup_card",
            "special_access_email_subject",
            "special_access_email_heading",
            "special_access_email_body",
            "special_access_email_footer",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class SpecialAccessInviteLinkSerializer(serializers.ModelSerializer):
    granted_asset_titles = serializers.SerializerMethodField()
    granted_asset_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
    )
    is_valid = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    is_exhausted = serializers.SerializerMethodField()
    pending_requests_count = serializers.SerializerMethodField()
    approved_requests_count = serializers.SerializerMethodField()

    class Meta:
        model = SpecialAccessInviteLink
        fields = [
            "id",
            "token",
            "title",
            "mode",
            "is_all_access_free",
            "granted_assets",
            "granted_asset_ids",
            "granted_asset_titles",
            "max_uses",
            "uses_count",
            "access_expires_at",
            "link_expires_at",
            "admin_note",
            "is_active",
            "is_valid",
            "is_expired",
            "is_exhausted",
            "pending_requests_count",
            "approved_requests_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["token", "uses_count", "created_at", "updated_at"]

    def get_granted_asset_titles(self, obj):
        try:
            return list(obj.granted_assets.values_list("title", flat=True))
        except Exception:
            return []

    def get_is_valid(self, obj):
        return obj.is_valid()

    def get_is_expired(self, obj):
        return obj.is_expired()

    def get_is_exhausted(self, obj):
        return obj.is_exhausted()

    def get_pending_requests_count(self, obj):
        try:
            return obj.requests.filter(status="PENDING").count()
        except Exception:
            return 0

    def get_approved_requests_count(self, obj):
        try:
            return obj.requests.filter(status="APPROVED").count()
        except Exception:
            return 0

    def create(self, validated_data):
        asset_ids = validated_data.pop("granted_asset_ids", None)
        validated_data.pop("granted_assets", None)
        link = SpecialAccessInviteLink.objects.create(**validated_data)
        if asset_ids is not None:
            link.granted_assets.set(Asset.objects.filter(id__in=asset_ids))
        return link

    def update(self, instance, validated_data):
        asset_ids = validated_data.pop("granted_asset_ids", None)
        validated_data.pop("granted_assets", None)
        instance = super().update(instance, validated_data)
        if asset_ids is not None:
            instance.granted_assets.set(Asset.objects.filter(id__in=asset_ids))
        return instance


class SpecialAccessClaimRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    invite_link_title = serializers.CharField(source="invite_link.title", read_only=True)
    invite_link_token = serializers.CharField(source="invite_link.token", read_only=True)
    invite_link_mode = serializers.CharField(source="invite_link.mode", read_only=True)
    invite_is_all_access = serializers.BooleanField(source="invite_link.is_all_access_free", read_only=True)
    invite_granted_asset_ids = serializers.SerializerMethodField()
    invite_granted_asset_titles = serializers.SerializerMethodField()
    invite_access_expires_at = serializers.DateTimeField(source="invite_link.access_expires_at", read_only=True)

    class Meta:
        model = SpecialAccessClaimRequest
        fields = [
            "id",
            "invite_link",
            "invite_link_title",
            "invite_link_token",
            "invite_link_mode",
            "invite_is_all_access",
            "invite_granted_asset_ids",
            "invite_granted_asset_titles",
            "invite_access_expires_at",
            "user",
            "user_note",
            "status",
            "admin_note",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["invite_link", "user", "status", "reviewed_at", "created_at", "updated_at"]

    def get_invite_granted_asset_ids(self, obj):
        try:
            return list(obj.invite_link.granted_assets.values_list("id", flat=True))
        except Exception:
            return []

    def get_invite_granted_asset_titles(self, obj):
        try:
            return list(obj.invite_link.granted_assets.values_list("title", flat=True))
        except Exception:
            return []

