import hmac
import base64
import json
import logging
import re
from pathlib import PurePath

from django.conf import settings
from django.contrib.auth.models import User
from django.http import FileResponse
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.exceptions import APIException
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
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

logger = logging.getLogger(__name__)


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


def unique_google_username(email):
    base = re.sub(r"[^a-zA-Z0-9_]", "_", email.split("@")[0]).strip("_") or "google_user"
    username = base[:140]
    suffix = 1
    while User.objects.filter(username=username).exists():
        suffix_text = f"_{suffix}"
        username = f"{base[:150 - len(suffix_text)]}{suffix_text}"
        suffix += 1
    return username


class GoogleLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        if not settings.GOOGLE_OAUTH_CLIENT_ID:
            return Response({"detail": "Google login is not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        credential = request.data.get("credential")
        if not credential:
            return Response({"detail": "Google credential is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from google.auth.transport import requests as google_requests
            from google.oauth2 import id_token

            profile = id_token.verify_oauth2_token(
                credential,
                google_requests.Request(),
                settings.GOOGLE_OAUTH_CLIENT_ID,
            )
        except Exception:
            return Response({"detail": "Invalid Google credential."}, status=status.HTTP_400_BAD_REQUEST)

        email = (profile.get("email") or "").lower()
        if not email:
            return Response({"detail": "Google account email is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not profile.get("email_verified"):
            return Response({"detail": "Google email is not verified."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            user = User(
                username=unique_google_username(email),
                email=email,
                first_name=profile.get("given_name", ""),
                last_name=profile.get("family_name", ""),
            )
            user.set_unusable_password()
            user.save()

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            }
        )


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    if request.method == "PATCH":
        allowed_fields = ["first_name", "last_name", "email"]
        for field in allowed_fields:
            if field in request.data:
                setattr(request.user, field, str(request.data.get(field, "")).strip())
        request.user.save(update_fields=allowed_fields)
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
        upcoming = self.request.query_params.get("upcoming")

        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(short_description__icontains=search)
                | Q(description__icontains=search)
                | Q(category__name__icontains=search)
                | Q(category__slug__icontains=search)
                | Q(simulator_type__icontains=search)
            )
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
        if upcoming == "true":
            qs = qs.filter(is_upcoming=True)
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
        if asset.is_upcoming:
            return Response({"detail": "This asset is marked as upcoming and is not available for purchase yet."}, status=status.HTTP_400_BAD_REQUEST)
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
        payment_defaults = {"provider": Payment.Provider.MANUAL, "status": status_value.lower()}
        if not asset.is_free and settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
            try:
                import razorpay

                client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
                provider_order = client.order.create(
                    {
                        "amount": int(asset.price * 100),
                        "currency": "INR",
                        "receipt": f"order_{order.id}",
                        "notes": {
                            "order_id": str(order.id),
                            "asset_id": str(asset.id),
                            "user_id": str(self.request.user.id),
                        },
                    }
                )
            except Exception as exc:
                order.status = Order.Status.FAILED
                order.save(update_fields=["status"])
                raise APIException("Could not create Razorpay order. Please try again.") from exc

            order.provider_order_id = provider_order["id"]
            order.save(update_fields=["provider_order_id"])
            payment_defaults = {
                "provider": Payment.Provider.RAZORPAY,
                "status": provider_order.get("status", "created"),
                "raw_response": provider_order,
            }
        Payment.objects.get_or_create(order=order, defaults=payment_defaults)


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

    def clean_cloudinary_file_payload(self, request):
        if not settings.CLOUDINARY_CONFIGURED:
            return None
        if "thumbnail" in request.FILES:
            return Response(
                {
                    "detail": (
                        "Image upload through the website is blocked by Cloudinary on this deployment. "
                        "Upload the image in Cloudinary Media Library, paste its secure URL in Manual Cloudinary image URL, "
                        "and leave Product card / home image empty."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        if "download_file" in request.FILES:
            return Response(
                {
                    "detail": (
                        "ZIP/RAR/7Z upload through the website is blocked by Cloudinary on this deployment. "
                        "Upload the package in Cloudinary Media Library as a raw file, paste its secure URL in "
                        "Manual Cloudinary download URL, and leave Replace ZIP file empty."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return None

    def create(self, request, *args, **kwargs):
        blocked_response = self.clean_cloudinary_file_payload(request)
        if blocked_response:
            return blocked_response
        try:
            return super().create(request, *args, **kwargs)
        except Exception as exc:
            logger.exception("Admin asset upload failed")
            return Response(
                {"detail": f"Asset upload failed while saving files: {type(exc).__name__}. Check Cloudinary storage settings, file size, and file type."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def update(self, request, *args, **kwargs):
        blocked_response = self.clean_cloudinary_file_payload(request)
        if blocked_response:
            return blocked_response
        try:
            return super().update(request, *args, **kwargs)
        except Exception as exc:
            logger.exception("Admin asset update failed")
            return Response(
                {"detail": f"Asset update failed while saving files: {type(exc).__name__}. Check Cloudinary storage settings, file size, and file type."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def partial_update(self, request, *args, **kwargs):
        blocked_response = self.clean_cloudinary_file_payload(request)
        if blocked_response:
            return blocked_response
        try:
            return super().partial_update(request, *args, **kwargs)
        except Exception as exc:
            logger.exception("Admin asset update failed")
            return Response(
                {"detail": f"Asset update failed while saving files: {type(exc).__name__}. Check Cloudinary storage settings, file size, and file type."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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
    if asset.is_upcoming:
        return Response({"detail": "This asset is marked as upcoming and is not available for download yet."}, status=status.HTTP_403_FORBIDDEN)
    allowed = asset.is_free or Order.objects.filter(user=request.user, asset=asset, status=Order.Status.PAID).exists()
    if not allowed:
        return Response({"detail": "Purchase required before downloading this asset."}, status=status.HTTP_403_FORBIDDEN)
    if asset.private_download_key:
        signed_url = create_private_download_url(asset.private_download_key)
        if not signed_url:
            return Response({"detail": "Private download storage is not configured. Please contact the admin."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        DownloadLog.objects.create(
            user=request.user,
            asset=asset,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
        )
        asset.download_count += 1
        asset.save(update_fields=["download_count"])
        return Response({"download_url": signed_url})
    if asset.google_drive_file_id:
        if not request.user.email:
            return Response({"detail": "Your account needs an email address before Drive access can be granted."}, status=status.HTTP_400_BAD_REQUEST)
        drive_url, drive_error = grant_google_drive_access(asset.google_drive_file_id, request.user.email)
        if not drive_url:
            return Response({"detail": drive_error}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        DownloadLog.objects.create(
            user=request.user,
            asset=asset,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
        )
        asset.download_count += 1
        asset.save(update_fields=["download_count"])
        return Response({"download_url": drive_url})
    if asset.external_download_url:
        DownloadLog.objects.create(
            user=request.user,
            asset=asset,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
        )
        asset.download_count += 1
        asset.save(update_fields=["download_count"])
        return Response({"download_url": asset.external_download_url})
    if not asset.download_file:
        return Response({"detail": "Download file is not available yet. Add a restricted Google Drive file ID or another download source in admin."}, status=status.HTTP_404_NOT_FOUND)
    try:
        file_exists = asset.download_file.storage.exists(asset.download_file.name)
    except Exception:
        logger.exception("Download file storage check failed")
        return Response(
            {"detail": "Uploaded file storage is not accessible. Add a restricted Google Drive file ID or another download source in admin."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    if not file_exists:
        return Response(
            {"detail": "Download file is missing from storage. Please contact the admin."},
            status=status.HTTP_404_NOT_FOUND,
        )

    DownloadLog.objects.create(
        user=request.user,
        asset=asset,
        ip_address=request.META.get("REMOTE_ADDR"),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
    )
    asset.download_count += 1
    asset.save(update_fields=["download_count"])
    filename = PurePath(asset.download_file.name).name
    try:
        return FileResponse(asset.download_file.open("rb"), as_attachment=True, filename=filename)
    except Exception:
        logger.exception("Download file open failed")
        return Response(
            {"detail": "Uploaded file could not be opened. Add a restricted Google Drive file ID or another download source in admin."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


def create_private_download_url(object_key):
    required = [
        settings.PRIVATE_DOWNLOAD_BUCKET,
        settings.PRIVATE_DOWNLOAD_ACCESS_KEY_ID,
        settings.PRIVATE_DOWNLOAD_SECRET_ACCESS_KEY,
    ]
    if not all(required):
        return ""
    try:
        import boto3

        client_kwargs = {
            "service_name": "s3",
            "aws_access_key_id": settings.PRIVATE_DOWNLOAD_ACCESS_KEY_ID,
            "aws_secret_access_key": settings.PRIVATE_DOWNLOAD_SECRET_ACCESS_KEY,
            "region_name": settings.PRIVATE_DOWNLOAD_REGION,
        }
        if settings.PRIVATE_DOWNLOAD_ENDPOINT_URL:
            client_kwargs["endpoint_url"] = settings.PRIVATE_DOWNLOAD_ENDPOINT_URL
        client = boto3.client(**client_kwargs)
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.PRIVATE_DOWNLOAD_BUCKET, "Key": object_key},
            ExpiresIn=settings.PRIVATE_DOWNLOAD_URL_EXPIRE_SECONDS,
        )
    except Exception:
        logger.exception("Private download URL signing failed")
        return ""


def google_drive_service_account_info():
    raw_json = settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON.strip()
    raw_base64 = settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_BASE64.strip()
    if raw_base64:
        raw_json = base64.b64decode(raw_base64).decode("utf-8")
    if not raw_json:
        return None
    return json.loads(raw_json)


def grant_google_drive_access(file_id, email):
    if not (settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON or settings.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_BASE64):
        return "", "Google Drive service account is not configured in Render."
    HttpError = None
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError

        service_account_info = google_drive_service_account_info()
        if not service_account_info:
            return "", "Google Drive service account JSON is empty."
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=["https://www.googleapis.com/auth/drive"],
        )
        service = build("drive", "v3", credentials=credentials, cache_discovery=False)
        permission = {
            "type": "user",
            "role": "reader",
            "emailAddress": email,
        }
        try:
            service.permissions().create(
                fileId=file_id,
                body=permission,
                sendNotificationEmail=False,
                fields="id",
            ).execute()
        except HttpError as exc:
            drive_status = str(getattr(exc, "status_code", "") or getattr(exc.resp, "status", ""))
            if drive_status != "409":
                raise
        return f"https://drive.google.com/file/d/{file_id}/view"
    except json.JSONDecodeError:
        logger.exception("Google Drive service account JSON is invalid")
        return "", "Google Drive service account JSON is invalid. Use the Base64 env option or one-line JSON."
    except Exception as exc:
        if HttpError and isinstance(exc, HttpError):
            logger.exception("Google Drive API access grant failed")
            status_code = str(getattr(exc, "status_code", "") or getattr(exc.resp, "status", ""))
            if status_code == "404":
                return "", "Google Drive file was not found. Check the file ID and share the file with the service account email."
            if status_code == "403":
                return "", "Google Drive permission denied. Enable Drive API and share the restricted file with the service account email as Editor."
            return "", "Google Drive access could not be granted. Check Drive API, service account, and file sharing."
        logger.exception("Google Drive API access grant failed")
        return "", "Google Drive access is not configured correctly. Check Render env and service account key."


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([UserRateThrottle])
def asset_download_by_id(request, pk):
    asset = get_object_or_404(Asset, pk=pk)
    try:
        return create_download_response(request, asset)
    except Exception:
        logger.exception("Asset download failed")
        return Response(
            {"detail": "Download setup failed on the server. Check the asset download source and Google Drive/Cloud storage settings."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


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
