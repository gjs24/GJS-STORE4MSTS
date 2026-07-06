import base64
import json
import logging
import re
from pathlib import PurePath
from rest_framework.pagination import PageNumberPagination

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.http import FileResponse, HttpResponse
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import AdminActivityLog, Asset, Category, DownloadLog, NotifyRequest, Order, Payment, Review, SiteSetting, Wishlist
from .permissions import IsAdminOrReadOnly
from .serializers import (
    AssetDetailSerializer,
    AssetListSerializer,
    AssetWriteSerializer,
    AdminActivityLogSerializer,
    CategorySerializer,
    DownloadLogSerializer,
    NotifyRequestSerializer,
    OrderSerializer,
    PaymentVerifySerializer,
    RegisterSerializer,
    ReviewSerializer,
    SiteSettingSerializer,
    UserSerializer,
    WishlistSerializer,
)

logger = logging.getLogger(__name__)
DOWNLOAD_READY_STATUSES = [Order.Status.PAID]
CASHFREE_TERMINAL_STATUSES = ["FAILED", "EXPIRED", "TERMINATED", "CANCELLED"]
CASHFREE_ORDER_MISSING_MARKERS = [
    "order reference id does not exist",
    "order id does not exist",
    "order does not exist",
]


def cashfree_base_url():
    if settings.CASHFREE_ENVIRONMENT == "production":
        return "https://api.cashfree.com/pg"
    return "https://sandbox.cashfree.com/pg"


def cashfree_headers():
    return {
        "Content-Type": "application/json",
        "x-client-id": settings.CASHFREE_CLIENT_ID,
        "x-client-secret": settings.CASHFREE_CLIENT_SECRET,
        "x-api-version": settings.CASHFREE_API_VERSION,
    }


def cashfree_is_configured():
    return bool(settings.CASHFREE_CLIENT_ID and settings.CASHFREE_CLIENT_SECRET)


def cashfree_order_missing_error(error):
    message = str(error or "").lower()
    return any(marker in message for marker in CASHFREE_ORDER_MISSING_MARKERS)


def cashfree_return_url(order):
    separator = "&" if "?" in settings.CASHFREE_RETURN_URL else "?"
    return f"{settings.CASHFREE_RETURN_URL}{separator}order_id={order.id}"


def create_cashfree_order(order, request):
    if not cashfree_is_configured():
        return None, "Cashfree is not configured."

    user = order.user
    customer_name = user.get_full_name() or user.username or f"Customer {user.id}"
    payload = {
        "order_id": order.provider_order_id,
        "order_amount": float(order.amount),
        "order_currency": order.currency,
        "customer_details": {
            "customer_id": str(user.id),
            "customer_name": customer_name[:100],
            "customer_email": user.email or f"user-{user.id}@example.com",
            "customer_phone": settings.CASHFREE_CUSTOMER_PHONE_FALLBACK,
        },
        "order_meta": {
            "return_url": cashfree_return_url(order),
        },
        "order_note": f"{order.asset.title} digital download",
    }
    response = requests.post(
        f"{cashfree_base_url()}/orders",
        headers=cashfree_headers(),
        json=payload,
        timeout=20,
    )
    try:
        data = response.json()
    except ValueError:
        data = {"message": response.text}
    if response.status_code >= 400:
        logger.warning("Cashfree order create failed: %s", data)
        return None, data.get("message") or data.get("detail") or "Cashfree order creation failed."
    return data, ""


def fetch_cashfree_order(provider_order_id):
    if not cashfree_is_configured():
        return None, "Cashfree is not configured."
    response = requests.get(
        f"{cashfree_base_url()}/orders/{provider_order_id}",
        headers=cashfree_headers(),
        timeout=20,
    )
    try:
        data = response.json()
    except ValueError:
        data = {"message": response.text}
    if response.status_code >= 400:
        logger.warning("Cashfree order fetch failed: %s", data)
        return None, data.get("message") or data.get("detail") or "Cashfree payment verification failed."
    return data, ""


def sync_cashfree_order(order):
    payment = getattr(order, "payment", None)
    if not payment or payment.provider != Payment.Provider.CASHFREE or not order.provider_order_id:
        return True, ""

    data, error = fetch_cashfree_order(order.provider_order_id)
    if not data:
        return False, error

    order_status = str(data.get("order_status", "")).upper()
    payment.provider_payment_id = str(data.get("cf_order_id", payment.provider_payment_id or ""))
    payment.status = order_status.lower() or payment.status
    payment.raw_response = {**payment.raw_response, **data}
    payment.save(update_fields=["provider_payment_id", "status", "raw_response"])

    if order_status == "PAID":
        order.status = Order.Status.PAID
        order.download_enabled = True
        order.save(update_fields=["status", "download_enabled"])
    elif order_status in CASHFREE_TERMINAL_STATUSES:
        order.status = Order.Status.FAILED
        order.download_enabled = False
        order.save(update_fields=["status", "download_enabled"])

    order._state.fields_cache.pop("payment", None)
    return True, ""


def ensure_cashfree_payment(order, request):
    sync_order_download_access(order)
    if order_has_download_access(order) or not cashfree_is_configured():
        return cashfree_is_configured(), "" if cashfree_is_configured() else "Cashfree payment is not configured. Add Cashfree client ID and secret before selling paid products."
    payment = getattr(order, "payment", None)
    if (
        payment
        and payment.provider == Payment.Provider.CASHFREE
        and payment.raw_response.get("payment_session_id")
    ):
        synced, error = sync_cashfree_order(order)
        if not synced:
            if not cashfree_order_missing_error(error):
                return False, error
            payment.raw_response = {}
            payment.status = "missing"
            payment.save(update_fields=["raw_response", "status"])
            order._state.fields_cache.pop("payment", None)
        else:
            if order.status in [Order.Status.FAILED, Order.Status.REFUNDED, Order.Status.REJECTED]:
                return False, "Cashfree reports this payment as failed or expired."
            return True, ""
    data, error = create_cashfree_order(order, request)
    if not data:
        logger.warning("Cashfree checkout unavailable for order %s: %s", order.id, error)
        return False, error
    Payment.objects.update_or_create(
        order=order,
        defaults={
            "provider": Payment.Provider.CASHFREE,
            "provider_payment_id": str(data.get("cf_order_id", "")),
            "provider_signature": "",
            "status": str(data.get("order_status", "created")).lower(),
            "raw_response": data,
        },
    )
    order._state.fields_cache.pop("payment", None)
    return True, ""


def log_admin_activity(request, action, target_type="", target_id="", message=""):
    try:
        AdminActivityLog.objects.create(
            actor=request.user if request.user.is_authenticated else None,
            action=action,
            target_type=target_type,
            target_id=str(target_id or ""),
            message=message[:260],
        )
    except Exception:
        logger.exception("Admin activity logging failed")


def order_has_download_access(order):
    return order.asset.is_free or order.status in DOWNLOAD_READY_STATUSES


def sync_order_download_access(order):
    should_enable = order.asset.is_free or order.status in DOWNLOAD_READY_STATUSES
    should_disable = not should_enable or order.status in [Order.Status.REJECTED, Order.Status.FAILED, Order.Status.REFUNDED]
    if should_enable and not order.download_enabled:
        order.download_enabled = True
        order.save(update_fields=["download_enabled"])
    elif should_disable and order.download_enabled:
        order.download_enabled = False
        order.save(update_fields=["download_enabled"])
    return order


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
        deal = self.request.query_params.get("deal")

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
        if deal == "true":
            qs = qs.filter(deal_is_open=True)
        return qs.annotate(review_count=Count("reviews", filter=Q(reviews__is_approved=True)))

    @action(detail=True, methods=["get", "post"], permission_classes=[permissions.IsAuthenticated], throttle_classes=[UserRateThrottle])
    def download(self, request, slug=None):
        asset = self.get_object()
        return create_download_response(request, asset)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def notify(self, request, slug=None):
        asset = self.get_object()
        if not asset.is_upcoming:
            return Response({"detail": "Notify Me is only available for upcoming products."}, status=status.HTTP_400_BAD_REQUEST)
        email = (request.user.email or request.data.get("email") or "").strip()
        if not email:
            return Response({"detail": "Add an email to your account before using Notify Me."}, status=status.HTTP_400_BAD_REQUEST)
        notify, created = NotifyRequest.objects.get_or_create(asset=asset, user=request.user, defaults={"email": email})
        if not created and notify.email != email:
            notify.email = email
            notify.save(update_fields=["email"])
        return Response({"detail": "You will be notified when this product is released.", "created": created})


class OrderCreateView(generics.CreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        asset = get_object_or_404(Asset, id=request.data.get("asset_id"), is_published=True)
        if asset.is_upcoming:
            return Response({"detail": "This asset is marked as upcoming and is not available for purchase yet."}, status=status.HTTP_400_BAD_REQUEST)
        existing_order = Order.objects.filter(
            user=request.user,
            asset=asset,
            status__in=[Order.Status.PENDING, Order.Status.VERIFICATION_PENDING, Order.Status.APPROVED, Order.Status.PAID],
        ).first()
        if existing_order:
            sync_order_download_access(existing_order)
            if not asset.is_free and not order_has_download_access(existing_order):
                synced, sync_error = sync_cashfree_order(existing_order)
                if not synced:
                    if not cashfree_order_missing_error(sync_error):
                        return Response({"detail": sync_error or "Cashfree payment status could not be checked."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                if existing_order.status == Order.Status.FAILED:
                    existing_order = None
        if existing_order:
            cashfree_ready, cashfree_error = ensure_cashfree_payment(existing_order, request)
            if not asset.is_free and not order_has_download_access(existing_order) and not cashfree_ready:
                return Response({"detail": cashfree_error or "Cashfree checkout is not available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            return Response(OrderSerializer(existing_order, context={"request": request}).data, status=status.HTTP_200_OK)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        order = serializer.instance
        cashfree_ready, cashfree_error = ensure_cashfree_payment(order, request)
        if not asset.is_free and not cashfree_ready:
            return Response({"detail": cashfree_error or "Cashfree checkout is not available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        data = OrderSerializer(order, context={"request": request}).data
        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        asset = serializer.validated_data["asset"]
        status_value = Order.Status.APPROVED if asset.is_free else Order.Status.PENDING
        order = serializer.save(
            user=self.request.user,
            amount=asset.price,
            currency="INR",
            status=status_value,
            download_enabled=asset.is_free,
        )
        order.provider_order_id = f"GJS-{order.id:06d}"
        order.save(update_fields=["provider_order_id"])
        Payment.objects.get_or_create(
            order=order,
            defaults={"provider": Payment.Provider.MANUAL, "status": status_value.lower()},
        )


class PaymentVerifyView(generics.GenericAPIView):
    serializer_class = PaymentVerifySerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = get_object_or_404(Order, id=serializer.validated_data["order_id"], user=request.user)
        if order.status == Order.Status.PAID:
            sync_order_download_access(order)
            return Response(OrderSerializer(order, context={"request": request}).data)
        if order.status == Order.Status.REJECTED:
            return Response({"detail": "This order was rejected. Please create a new order if you paid again."}, status=status.HTTP_400_BAD_REQUEST)
        payment = getattr(order, "payment", None)
        if payment and payment.provider == Payment.Provider.CASHFREE:
            synced, error = sync_cashfree_order(order)
            if not synced:
                return Response({"detail": error}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            order.refresh_from_db()
            if order.status == Order.Status.PAID:
                return Response(OrderSerializer(order, context={"request": request}).data)
            if order.status == Order.Status.FAILED:
                return Response({"detail": "Cashfree reports this payment as failed or expired."}, status=status.HTTP_400_BAD_REQUEST)
            return Response({"detail": "Cashfree payment is not complete yet."}, status=status.HTTP_400_BAD_REQUEST)
        if order.utr:
            return Response({"detail": "A UTR was already submitted for this order."}, status=status.HTTP_400_BAD_REQUEST)

        utr = serializer.validated_data.get("utr", "").strip().upper()
        if not utr:
            return Response({"detail": "UTR / transaction ID is required for manual payment verification."}, status=status.HTTP_400_BAD_REQUEST)
        if Order.objects.filter(utr__iexact=utr).exclude(id=order.id).exists():
            return Response({"detail": "This UTR has already been submitted."}, status=status.HTTP_400_BAD_REQUEST)

        order.utr = utr
        order.payer_name = serializer.validated_data.get("payer_name", "").strip()
        order.payment_submitted_at = timezone.now()
        order.status = Order.Status.VERIFICATION_PENDING
        order.download_enabled = False
        order.save(update_fields=["utr", "payer_name", "payment_submitted_at", "status", "download_enabled"])
        Payment.objects.update_or_create(
            order=order,
            defaults={
                "provider": Payment.Provider.MANUAL,
                "provider_payment_id": utr,
                "provider_signature": "",
                "status": "verification_pending",
                "raw_response": {"utr": utr, "payer_name": order.payer_name},
            },
        )
        return Response(OrderSerializer(order).data)


class PurchaseListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).select_related("asset", "asset__category")


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def order_invoice(request, pk):
    order = get_object_or_404(Order.objects.select_related("asset", "user"), pk=pk, user=request.user)
    sync_order_download_access(order)
    if not order_has_download_access(order):
        return Response({"detail": "Purchase approval is required before downloading this invoice."}, status=status.HTTP_403_FORBIDDEN)
    lines = [
        "MSTS-GJS Production Store",
        "Digital Product Invoice",
        "",
        f"Invoice No: GJS-{order.id:06d}",
        f"Date: {order.created_at:%d %b %Y}",
        f"Customer: {order.user.get_full_name() or order.user.username}",
        f"Email: {order.user.email}",
        "",
        f"Product: {order.asset.title}",
        f"Version: {order.asset.version}",
        f"Amount: {order.currency} {order.amount}",
        f"Status: {order.status}",
        "",
        "Delivery: Instant digital download/account access after successful payment.",
        "No physical shipping.",
    ]
    stream = "BT /F1 12 Tf 50 740 Td 16 TL " + " T* ".join(f"({line.replace('(', '').replace(')', '')})" for line in lines) + " ET"
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Count 1 /Kids [3 0 R] >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        f"<< /Length {len(stream)} >>\nstream\n{stream}\nendstream".encode(),
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    ]
    pdf = b"%PDF-1.4\n"
    offsets = [0]
    for index, obj in enumerate(objects, start=1):
        offsets.append(len(pdf))
        pdf += f"{index} 0 obj\n".encode() + obj + b"\nendobj\n"
    xref_at = len(pdf)
    pdf += f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n".encode()
    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n".encode()
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_at}\n%%EOF".encode()
    response = HttpResponse(pdf, content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="GJS-{order.id:06d}-invoice.pdf"'
    return response


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
            response = super().create(request, *args, **kwargs)
            log_admin_activity(request, "Product created", "Asset", response.data.get("id"), f"Created product {response.data.get('title', '')}")
            return response
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
            previous = self.get_object()
            previous_price = previous.price
            previous_file = previous.download_file.name if previous.download_file else ""
            previous_deal = previous.deal_is_open
            response = super().update(request, *args, **kwargs)
            asset = self.get_object()
            log_admin_activity(request, "Product edited", "Asset", asset.id, f"Edited product {asset.title}")
            if previous_price != asset.price:
                log_admin_activity(request, "Price changed", "Asset", asset.id, f"{asset.title} price changed from {previous_price} to {asset.price}")
            next_file = asset.download_file.name if asset.download_file else ""
            if previous_file != next_file:
                log_admin_activity(request, "File changed", "Asset", asset.id, f"{asset.title} file source changed")
            if previous_deal != asset.deal_is_open:
                log_admin_activity(request, "Deal opened" if asset.deal_is_open else "Deal closed", "Asset", asset.id, f"{asset.title} deal is now {'open' if asset.deal_is_open else 'closed'}")
            return response
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
            previous = self.get_object()
            previous_price = previous.price
            previous_deal = previous.deal_is_open
            response = super().partial_update(request, *args, **kwargs)
            asset = self.get_object()
            log_admin_activity(request, "Product edited", "Asset", asset.id, f"Edited product {asset.title}")
            if previous_price != asset.price:
                log_admin_activity(request, "Price changed", "Asset", asset.id, f"{asset.title} price changed from {previous_price} to {asset.price}")
            if previous_deal != asset.deal_is_open:
                log_admin_activity(request, "Deal opened" if asset.deal_is_open else "Deal closed", "Asset", asset.id, f"{asset.title} deal is now {'open' if asset.deal_is_open else 'closed'}")
            return response
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

class AdminOrderPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminOrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.select_related(
        "user",
        "asset",
        "asset__category"
    ).order_by("-id")

    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ["get", "patch", "head", "options"]

    # Pagination
    pagination_class = AdminOrderPagination

    def perform_update(self, serializer):
        order = serializer.save()

        if order.status == Order.Status.PAID:
            order.download_enabled = True
            order.save(update_fields=["download_enabled"])

            Payment.objects.filter(order=order).update(
                status="approved"
            )

        elif order.status in [
            Order.Status.REJECTED,
            Order.Status.FAILED,
            Order.Status.REFUNDED,
        ]:
            order.download_enabled = False
            order.save(update_fields=["download_enabled"])

            Payment.objects.filter(order=order).update(
                status=order.status.lower()
            )


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


class AdminNotifyRequestView(generics.ListAPIView):
    serializer_class = NotifyRequestSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = NotifyRequest.objects.select_related("asset", "asset__category", "user")
        asset_id = self.request.query_params.get("asset")
        if asset_id:
            qs = qs.filter(asset_id=asset_id)
        return qs


class AdminDownloadHistoryView(generics.ListAPIView):
    serializer_class = DownloadLogSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = DownloadLog.objects.select_related("asset", "asset__category", "user")
        asset_id = self.request.query_params.get("asset")
        if asset_id:
            qs = qs.filter(asset_id=asset_id)
        return qs


class AdminActivityLogView(generics.ListAPIView):
    serializer_class = AdminActivityLogSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = AdminActivityLog.objects.select_related("actor")


def create_download_response(request, asset):
    if asset.is_upcoming:
        return Response({"detail": "This asset is marked as upcoming and is not available for download yet."}, status=status.HTTP_403_FORBIDDEN)
    allowed = asset.is_free or Order.objects.filter(user=request.user, asset=asset, status__in=DOWNLOAD_READY_STATUSES).exists()
    if not allowed:
        return Response({"detail": "Purchase required before downloading this asset."}, status=status.HTTP_403_FORBIDDEN)
    if asset.private_download_key:
        signed_url = create_private_download_url(asset.private_download_key)
        if not signed_url:
            return Response({"detail": "Private download storage is not configured. Please contact the admin."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        record_download(request, asset)
        return Response({"download_url": signed_url})
    if asset.google_drive_file_id:
        if not request.user.email:
            return Response({"detail": "Your account needs an email address before Drive access can be granted."}, status=status.HTTP_400_BAD_REQUEST)
        drive_url, drive_error = grant_google_drive_access(asset.google_drive_file_id, request.user.email)
        if not drive_url:
            return Response({"detail": drive_error}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        record_download(request, asset)
        return Response({"download_url": drive_url})
    if asset.external_download_url:
        record_download(request, asset)
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

    record_download(request, asset)
    filename = PurePath(asset.download_file.name).name
    try:
        return FileResponse(asset.download_file.open("rb"), as_attachment=True, filename=filename)
    except Exception:
        logger.exception("Download file open failed")
        return Response(
            {"detail": "Uploaded file could not be opened. Add a restricted Google Drive file ID or another download source in admin."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )


def record_download(request, asset):
    try:
        DownloadLog.objects.create(
            user=request.user,
            asset=asset,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
        )
        asset.download_count += 1
        asset.save(update_fields=["download_count"])
    except Exception:
        logger.exception("Download logging failed")


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
        raw_json = base64.b64decode(raw_base64, validate=True).decode("utf-8")
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
        return f"https://drive.google.com/file/d/{file_id}/view", ""
    except json.JSONDecodeError:
        logger.exception("Google Drive service account JSON is invalid")
        return "", "Google Drive service account JSON is invalid. Use the Base64 env option or one-line JSON."
    except (UnicodeDecodeError, ValueError):
        logger.exception("Google Drive service account credentials are invalid")
        return "", "Google Drive service account credentials are invalid. Recreate the Render GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_BASE64 value from the downloaded JSON key file."
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


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
@throttle_classes([UserRateThrottle])
def asset_download_by_id(request, pk):
    asset = get_object_or_404(Asset, pk=pk)
    try:
        return create_download_response(request, asset)
    except Exception as exc:
        logger.exception("Asset download failed")
        return Response(
            {"detail": f"Download setup failed on the server: {type(exc).__name__}. Check the asset download source and Google Drive/Cloud storage settings."},
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
@permission_classes([permissions.AllowAny])
def site_settings(request):
    return Response(SiteSettingSerializer(SiteSetting.load()).data)


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAdminUser])
def admin_settings(request):
    site_setting = SiteSetting.load()
    if request.method == "PATCH":
        before_popup = site_setting.popup_enabled
        serializer = SiteSettingSerializer(site_setting, data=request.data.get("site", request.data), partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        site_setting = serializer.instance
        log_admin_activity(request, "Store settings edited", "SiteSetting", site_setting.id, "Updated homepage, popup, or notification settings")
        if before_popup != site_setting.popup_enabled:
            log_admin_activity(request, "Popup enabled" if site_setting.popup_enabled else "Popup disabled", "SiteSetting", site_setting.id, "Changed entrance popup status")
    return Response(
        {
            "api_status": "online",
            "payments": {
                "cashfree_configured": cashfree_is_configured(),
                "cashfree_environment": settings.CASHFREE_ENVIRONMENT,
                "manual_upi_configured": bool(settings.MANUAL_UPI_ID),
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
            "site": SiteSettingSerializer(site_setting).data,
        }
    )
