from django.contrib.auth.models import User
from django.db.models import Avg
from rest_framework import serializers

from .models import Asset, AssetImage, Category, DownloadLog, Order, Payment, Review, UpdateLog, Wishlist


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


class CategorySerializer(serializers.ModelSerializer):
    asset_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "icon", "is_active", "asset_count"]


class AssetImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssetImage
        fields = ["id", "image", "alt_text", "sort_order"]


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
    has_file = serializers.SerializerMethodField()
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
            "price",
            "is_free",
            "is_published",
            "is_featured",
            "is_upcoming",
            "thumbnail",
            "has_file",
            "download_count",
            "average_rating",
            "review_count",
            "created_at",
        ]

    def get_average_rating(self, obj):
        rating = obj.reviews.filter(is_approved=True).aggregate(avg=Avg("rating"))["avg"]
        return round(rating or 0, 1)

    def get_has_file(self, obj):
        return bool(obj.download_file)

    def get_thumbnail(self, obj):
        if not obj.thumbnail:
            return None
        try:
            if not obj.thumbnail.storage.exists(obj.thumbnail.name):
                return None
        except Exception:
            return None
        url = obj.thumbnail.url
        if url.startswith("http://") or url.startswith("https://"):
            return url
        request = self.context.get("request")
        return request.build_absolute_uri(url) if request else url


class AssetDetailSerializer(AssetListSerializer):
    images = AssetImageSerializer(many=True, read_only=True)
    reviews = ReviewSerializer(many=True, read_only=True)
    updates = UpdateLogSerializer(many=True, read_only=True)
    can_download = serializers.SerializerMethodField()

    class Meta(AssetListSerializer.Meta):
        fields = AssetListSerializer.Meta.fields + [
            "description",
            "preview_video_url",
            "requirements",
            "installation_steps",
            "changelog",
            "images",
            "reviews",
            "updates",
            "can_download",
            "updated_at",
        ]

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

    class Meta:
        model = Order
        fields = ["id", "user", "asset", "asset_id", "amount", "currency", "status", "provider_order_id", "created_at"]
        read_only_fields = ["amount", "status", "provider_order_id", "created_at"]


class PaymentVerifySerializer(serializers.Serializer):
    order_id = serializers.IntegerField()
    provider_payment_id = serializers.CharField(required=False, allow_blank=True)
    provider_signature = serializers.CharField(required=False, allow_blank=True)
    provider = serializers.ChoiceField(choices=Payment.Provider.choices, default=Payment.Provider.RAZORPAY)


class DownloadLogSerializer(serializers.ModelSerializer):
    asset = AssetListSerializer(read_only=True)

    class Meta:
        model = DownloadLog
        fields = ["id", "asset", "ip_address", "downloaded_at"]


class WishlistSerializer(serializers.ModelSerializer):
    asset = AssetListSerializer(read_only=True)
    asset_id = serializers.PrimaryKeyRelatedField(source="asset", queryset=Asset.objects.all(), write_only=True)

    class Meta:
        model = Wishlist
        fields = ["id", "asset", "asset_id", "created_at"]
        read_only_fields = ["created_at"]
