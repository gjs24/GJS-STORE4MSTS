import hmac

from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Asset, Category, DownloadLog, Order, Payment, Review, Wishlist
from .permissions import IsAdminOrReadOnly
from .serializers import (
    AssetDetailSerializer,
    AssetListSerializer,
    AssetWriteSerializer,
    CategorySerializer,
    DownloadLogSerializer,
    OrderSerializer,
    PaymentVerifySerializer,
    RegisterSerializer,
    ReviewSerializer,
    UserSerializer,
    WishlistSerializer,
)


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(TokenObtainPairView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        username = request.data.get("username")
        user = User.objects.filter(username=username).first()
        if user and response.status_code == status.HTTP_200_OK:
            response.data["user"] = UserSerializer(user).data
        return response


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    return Response(UserSerializer(request.user).data)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.annotate(asset_count=Count("assets")).filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "slug"


class AssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.select_related("category").prefetch_related("images", "reviews", "updates")
    permission_classes = [IsAdminOrReadOnly]
    lookup_field = "slug"

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return AssetWriteSerializer
        if self.action == "retrieve":
            return AssetDetailSerializer
        return AssetListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        if not self.request.user.is_staff:
            qs = qs.filter(is_published=True)
        search = self.request.query_params.get("search")
        category = self.request.query_params.get("category")
        simulator = self.request.query_params.get("simulator_type")
        price = self.request.query_params.get("price")
        version = self.request.query_params.get("version")
        featured = self.request.query_params.get("featured")

        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))
        if category:
            qs = qs.filter(category__slug=category)
        if simulator:
            qs = qs.filter(simulator_type__in=[simulator, "BOTH"])
        if price == "free":
            qs = qs.filter(is_free=True)
        if price == "premium":
            qs = qs.filter(is_free=False)
        if version:
            qs = qs.filter(version__icontains=version)
        if featured == "true":
            qs = qs.filter(is_featured=True)
        return qs.annotate(review_count=Count("reviews", filter=Q(reviews__is_approved=True)))

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated], throttle_classes=[UserRateThrottle])
    def download(self, request, slug=None):
        asset = self.get_object()
        return create_download_response(request, asset)


class OrderCreateView(generics.CreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        asset = get_object_or_404(Asset, id=request.data.get("asset_id"), is_published=True)
        existing_paid_order = Order.objects.filter(user=request.user, asset=asset, status=Order.Status.PAID).first()
        if existing_paid_order:
            return Response(OrderSerializer(existing_paid_order, context={"request": request}).data, status=status.HTTP_200_OK)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        asset = serializer.validated_data["asset"]
        status_value = Order.Status.PAID if asset.is_free else Order.Status.PENDING
        order = serializer.save(user=self.request.user, amount=asset.price, currency="INR", status=status_value)
        Payment.objects.get_or_create(order=order, defaults={"provider": Payment.Provider.MANUAL, "status": status_value.lower()})


class PaymentVerifyView(generics.GenericAPIView):
    serializer_class = PaymentVerifySerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = get_object_or_404(Order, id=serializer.validated_data["order_id"], user=request.user)

        signature = serializer.validated_data.get("provider_signature", "")
        payment_id = serializer.validated_data.get("provider_payment_id", "")
        provider = serializer.validated_data["provider"]
        verified = False

        if provider == Payment.Provider.RAZORPAY and settings.RAZORPAY_KEY_SECRET and order.provider_order_id:
            message = f"{order.provider_order_id}|{payment_id}".encode()
            expected = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), message, "sha256").hexdigest()
            verified = hmac.compare_digest(expected, signature)
        elif settings.DEBUG:
            verified = True

        if not verified:
            order.status = Order.Status.FAILED
            order.save(update_fields=["status"])
            return Response({"detail": "Payment verification failed."}, status=status.HTTP_400_BAD_REQUEST)

        order.status = Order.Status.PAID
        order.save(update_fields=["status"])
        Payment.objects.update_or_create(
            order=order,
            defaults={
                "provider": provider,
                "provider_payment_id": payment_id,
                "provider_signature": signature,
                "status": "paid",
                "raw_response": request.data,
            },
        )
        return Response(OrderSerializer(order).data)


class PurchaseListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user, status=Order.Status.PAID).select_related("asset", "asset__category")


class DownloadListView(generics.ListAPIView):
    serializer_class = DownloadLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DownloadLog.objects.filter(user=self.request.user).select_related("asset", "asset__category")


class ReviewCreateView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WishlistView(generics.ListCreateAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related("asset", "asset__category")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AdminAssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.select_related("category").prefetch_related("reviews")
    serializer_class = AssetWriteSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def list(self, request, *args, **kwargs):
        assets = self.get_queryset().annotate(review_count=Count("reviews", filter=Q(reviews__is_approved=True)))
        return Response(AssetListSerializer(assets, many=True, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def feature(self, request, pk=None):
        asset = self.get_object()
        asset.is_featured = not asset.is_featured
        asset.save(update_fields=["is_featured"])
        return Response({"id": asset.id, "is_featured": asset.is_featured})


class AdminCategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.annotate(asset_count=Count("assets"))
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAdminUser]


class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related("user", "asset", "asset__category")
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ["get", "patch", "head", "options"]


class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ["get", "patch", "head", "options"]


class AdminReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related("user", "asset")
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        review = self.get_object()
        review.is_approved = True
        review.save(update_fields=["is_approved"])
        return Response(ReviewSerializer(review).data)


def create_download_response(request, asset):
    allowed = asset.is_free or Order.objects.filter(user=request.user, asset=asset, status=Order.Status.PAID).exists()
    if not allowed:
        return Response({"detail": "Purchase required before downloading this asset."}, status=status.HTTP_403_FORBIDDEN)
    if not asset.download_file:
        return Response({"detail": "Download file is not available yet."}, status=status.HTTP_404_NOT_FOUND)

    DownloadLog.objects.create(
        user=request.user,
        asset=asset,
        ip_address=request.META.get("REMOTE_ADDR"),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
    )
    asset.download_count += 1
    asset.save(update_fields=["download_count"])
    return Response({"download_url": request.build_absolute_uri(asset.download_file.url)})


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([UserRateThrottle])
def asset_download_by_id(request, pk):
    asset = get_object_or_404(Asset, pk=pk)
    return create_download_response(request, asset)


@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])
def admin_stats(request):
    paid_orders = Order.objects.filter(status=Order.Status.PAID)
    pending_orders = Order.objects.filter(status=Order.Status.PENDING)
    return Response(
        {
            "total_users": User.objects.count(),
            "total_downloads": DownloadLog.objects.count(),
            "total_sales": paid_orders.aggregate(total=Sum("amount"))["total"] or 0,
            "latest_orders": OrderSerializer(Order.objects.select_related("asset", "user")[:8], many=True).data,
            "asset_count": Asset.objects.count(),
            "review_count": Review.objects.count(),
            "pending_orders": pending_orders.count(),
            "featured_assets": Asset.objects.filter(is_featured=True).count(),
            "free_assets": Asset.objects.filter(is_free=True).count(),
            "premium_assets": Asset.objects.filter(is_free=False).count(),
        }
    )


@api_view(["GET"])
@permission_classes([permissions.IsAdminUser])
def admin_settings(request):
    return Response(
        {
            "api_status": "online",
            "payments": {
                "razorpay_configured": bool(settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET),
                "stripe_configured": bool(settings.STRIPE_SECRET_KEY),
            },
            "storage": {
                "cloudinary_configured": bool(getattr(settings, "CLOUDINARY_URL", "")),
                "media_url": settings.MEDIA_URL,
            },
            "security": {
                "debug": settings.DEBUG,
                "allowed_hosts": settings.ALLOWED_HOSTS,
                "download_rate_limit": settings.REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"]["downloads"],
            },
        }
    )
