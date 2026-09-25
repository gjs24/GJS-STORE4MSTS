import base64
from datetime import timedelta
from decimal import Decimal
import json
import logging
import os
import random
import re
from pathlib import PurePath
from rest_framework.pagination import PageNumberPagination

import requests
from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import EmailMultiAlternatives
from django.http import FileResponse, HttpResponse
from django.db import transaction
from django.db.models import Avg, Count, Q, Sum
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, serializers, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from rest_framework.exceptions import PermissionDenied

from .throttles import DownloadRateThrottle

from .early_access import get_cached_early_access_status
from .models import AdminActivityLog, Asset, Category, DownloadLog, EmailOTP, NotifyRequest, Order, Payment, Review, SiteSetting, UserSpecialAccess, Wishlist
from .models import (
    AdminActivityLog,
    Asset,
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
    UserBoardUnlock,
    UserCustomBoard,
    UserProfile,
    UserSpecialAccess,
    Wishlist,
)
from .permissions import IsAdminOrReadOnly
from .serializers import (
    AssetDetailSerializer,
    AssetListSerializer,
    AssetWriteSerializer,
    AdminActivityLogSerializer,
    BoardTemplateSerializer,
    CategorySerializer,
    DownloadLogSerializer,
    NotifyRequestSerializer,
    OrderSerializer,
    AdminOrderSerializer,
    PaymentVerifySerializer,
    RegisterSerializer,
    ReviewSerializer,
    SendOTPSerializer,
    SiteSettingSerializer,
    SpecialAccessClaimRequestSerializer,
    SpecialAccessInviteLinkSerializer,
    UserCustomBoardSerializer,
    UserSerializer,
    UserSpecialAccessSerializer,
    VerifyOTPSerializer,
    WishlistSerializer,
)
from .special_access import user_has_special_access

logger = logging.getLogger(__name__)
DOWNLOAD_READY_STATUSES = [Order.Status.PAID]
DOWNLOAD_READY_STATUSES = [Order.Status.PAID, Order.Status.APPROVED]
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


def cashfree_return_url(order, request=None):
    if request and getattr(request, "data", None):
        custom_return = request.data.get("return_url")
        if custom_return and isinstance(custom_return, str) and custom_return.startswith(("http://", "https://", "/")):
            separator = "&" if "?" in custom_return else "?"
            return f"{custom_return}{separator}order_id={order.id}"

    base_return = getattr(settings, "CASHFREE_RETURN_URL", "http://localhost:3000/dashboard/purchases")
    if order.board_template and "/dashboard/purchases" in base_return:
        board_url = base_return.replace("/dashboard/purchases", "/board-studio")
        separator = "&" if "?" in board_url else "?"
        return f"{board_url}{separator}order_id={order.id}&template={order.board_template.id}"

    separator = "&" if "?" in base_return else "?"
    return f"{base_return}{separator}order_id={order.id}"


def create_cashfree_order(order, request):
    if not cashfree_is_configured():
        return None, "Cashfree is not configured."

    if float(order.amount) <= 0:
        order.status = Order.Status.APPROVED
        order.download_enabled = True
        order.save(update_fields=["status", "download_enabled"])
        grant_board_unlock_if_applicable(order)
        return {"order_status": "PAID"}, ""

    user = order.user
    customer_name = (user.get_full_name() or user.username or f"Customer {user.id}").strip()
    if len(customer_name) < 3:
        customer_name = f"Customer {user.id}"
    customer_name = customer_name[:100]

    # Determine customer's actual phone number
    raw_phone = getattr(order, "customer_phone", "") or ""
    if not raw_phone and request and getattr(request, "data", None):
        raw_phone = request.data.get("customer_phone") or request.data.get("phone") or ""
    if not raw_phone and hasattr(user, "profile") and user.profile.phone_number:
        raw_phone = user.profile.phone_number
    if not raw_phone:
        prev = Order.objects.filter(user=user).exclude(customer_phone="").order_by("-id").first()
        if prev:
            raw_phone = prev.customer_phone

    import re
    digits = re.sub(r"\D", "", str(raw_phone or ""))
    fallback_phone = str(getattr(settings, "CASHFREE_CUSTOMER_PHONE_FALLBACK", "9999999999") or "9999999999")
    if len(digits) >= 10 and digits[-10] in "6789":
        customer_phone = digits[-10:]
    else:
        customer_phone = fallback_phone if len(fallback_phone) == 10 and fallback_phone[0] in "6789" else "9999999999"

    if customer_phone != fallback_phone and not getattr(order, "customer_phone", ""):
        order.customer_phone = customer_phone
        order.save(update_fields=["customer_phone"])
    if customer_phone != fallback_phone:
        if hasattr(user, "profile") and not user.profile.phone_number:
            user.profile.phone_number = customer_phone
            user.profile.save(update_fields=["phone_number"])

    order_meta = {
        "return_url": cashfree_return_url(order, request),
    }
    if request:
        try:
            webhook_url = request.build_absolute_uri(reverse("cashfree-webhook"))
            if webhook_url.startswith("https://"):
                order_meta["notify_url"] = webhook_url
        except Exception:
            pass

    note = f"{(order.asset.title if order.asset else order.board_template.name if order.board_template else 'Store Item')} digital download"

    payload = {
        "order_id": order.provider_order_id,
        "order_amount": float(order.amount),
        "order_currency": order.currency,
        "customer_details": {
            "customer_id": str(user.id),
            "customer_name": customer_name,
            "customer_email": user.email or f"user-{user.id}@example.com",
            "customer_phone": customer_phone,
        },
        "order_meta": order_meta,
        "order_note": note[:100],
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


def grant_board_unlock_if_applicable(order):
    if not order or not order.user:
        return
    if order.board_template:
        UserBoardUnlock.objects.get_or_create(user=order.user, template=order.board_template, defaults={"order": order})
    if order.asset and order.asset.board_template and getattr(order.asset, "bundle_board_template_free", False):
        UserBoardUnlock.objects.get_or_create(user=order.user, template=order.asset.board_template, defaults={"order": order})


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
        grant_board_unlock_if_applicable(order)
    elif order_status in CASHFREE_TERMINAL_STATUSES:
        order.status = Order.Status.FAILED
        order.download_enabled = False
        order.save(update_fields=["status", "download_enabled"])

    order._state.fields_cache.pop("payment", None)
    return True, ""


def ensure_cashfree_payment(order, request):
    sync_order_download_access(order)
    if order_has_download_access(order):
        return True, ""
    if not cashfree_is_configured():
        if getattr(settings, "MANUAL_UPI_ID", ""):
            return True, ""
        return False, "Neither Cashfree payment nor Manual UPI is configured. Please contact the administrator."
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
            if order.status == Order.Status.PENDING and order.created_at and order.created_at < timezone.now() - timedelta(minutes=25):
                order.status = Order.Status.EXPIRED
                order.download_enabled = False
                order.save(update_fields=["status", "download_enabled"])
                payment.status = "expired"
                payment.save(update_fields=["status"])
                # Order expired, create a fresh Cashfree session below
            else:
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
    if order.status == Order.Status.BLOCKED or not order.download_enabled:
        return False
    if order.board_template:
        return order.status in DOWNLOAD_READY_STATUSES
    return (order.asset.is_free if order.asset else False) or order.status in DOWNLOAD_READY_STATUSES


def sync_order_download_access(order):
    if order.status == Order.Status.BLOCKED:
        if order.download_enabled:
            order.download_enabled = False
            order.save(update_fields=["download_enabled"])
        return order

    is_free = False
    if order.asset:
        is_free = order.asset.is_free
    elif order.board_template:
        is_free = not order.board_template.is_paid

    should_enable = (is_free or order.status in DOWNLOAD_READY_STATUSES) and order.download_enabled
    should_disable = (
        not should_enable
        or order.status in [Order.Status.REJECTED, Order.Status.FAILED, Order.Status.REFUNDED, Order.Status.BLOCKED]
    )
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


def send_otp_email(email, otp_code, purpose):
    subject_map = {
        "signup": "Your Verification Code - MSTS-GJS Production Store",
        "login": "Your Login Code - MSTS-GJS Production Store",
        "reset": "Your Password Reset Code - MSTS-GJS Production Store",
        "profile_edit": "Profile Update Verification Code - MSTS-GJS Production Store",
    }
    subject = subject_map.get(purpose, "Your Verification Code - MSTS-GJS Production Store")

    action_text = (
        "complete your registration"
        if purpose == "signup"
        else "sign in to your account"
        if purpose == "login"
        else "verify and save your profile changes"
        if purpose == "profile_edit"
        else "reset your password"
    )

    text_content = f"""Hello,

Your verification code for MSTS-GJS Production Store is: {otp_code}

Please use this code to {action_text}.
This code is valid for 10 minutes. For security, please do not share this code with anyone.

Regards,
MSTS-GJS Production Team
https://msts-gjs.com
"""

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 20px; }}
    .container {{ max-width: 520px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; }}
    .logo {{ color: #e11d48; font-size: 20px; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 20px; text-align: center; }}
    .code-box {{ background: #1f2937; border: 1px solid #374151; border-radius: 8px; text-align: center; padding: 20px; margin: 24px 0; }}
    .code {{ font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f43f5e; margin: 0; font-family: monospace; }}
    .validity {{ color: #94a3b8; font-size: 13px; margin-top: 8px; }}
    .footer {{ color: #64748b; font-size: 12px; text-align: center; margin-top: 24px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">MSTS-GJS Production Store</div>
    <h2 style="margin-top:0; color:#fff; font-size:18px;">Email Verification</h2>
    <p style="color:#cbd5e1; font-size:14px; line-height:1.5;">
      Use the 6-digit verification code below to {action_text}:
    </p>
    <div class="code-box">
      <div class="code">{otp_code}</div>
      <div class="validity">Valid for 10 minutes</div>
    </div>
    <p style="color:#94a3b8; font-size:13px; line-height:1.4;">
      If you did not request this verification code, you can safely ignore this email.
    </p>
    <div class="footer">
      &copy; {timezone.now().year} MSTS-GJS Production Store. All rights reserved.
    </div>
  </div>
</body>
</html>
"""
    # 1. Try Brevo HTTPS API if key present (bypasses Render SMTP port 587 block)
    brevo_key = getattr(settings, "BREVO_API_KEY", "") or os.environ.get("BREVO_API_KEY", "")
    if brevo_key:
        ok, err = send_otp_via_brevo(email, subject, html_content, text_content, brevo_key)
        if ok:
            return True, ""
        logger.warning("Brevo API failed: %s. Trying fallback...", err)

    # 2. Try Resend HTTPS API if key present
    resend_key = getattr(settings, "RESEND_API_KEY", "") or os.environ.get("RESEND_API_KEY", "")
    if resend_key:
        ok, err = send_otp_via_resend(email, subject, html_content, text_content, resend_key)
        if ok:
            return True, ""
        logger.warning("Resend API failed: %s. Trying fallback...", err)

    # 3. Standard SMTP fallback
    try:
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@msts-gjs.com")
        msg = EmailMultiAlternatives(subject, text_content, from_email, [email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        return True, ""
    except Exception as exc:
        logger.warning("RENDER SMTP BLOCKED: Verification code for %s is [%s]", email, otp_code)
        err_str = str(exc)
        if "Network is unreachable" in err_str or "101" in err_str:
            err_str = (
                "Render free tier blocks SMTP port 587. "
                "Please add a free BREVO_API_KEY or RESEND_API_KEY in Render Environment Variables to send emails via HTTPS port 443."
            )
        return False, err_str


def send_otp_via_brevo(email, subject, html_content, text_content, api_key):
    sender_raw = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@msts-gjs.com")
    sender_name = "MSTS-GJS Production Store"
    sender_email = sender_raw
    if "<" in sender_raw and ">" in sender_raw:
        sender_name = sender_raw.split("<")[0].strip() or sender_name
        sender_email = sender_raw.split("<")[1].replace(">", "").strip()

    try:
        response = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "accept": "application/json",
                "api-key": api_key,
                "content-type": "application/json",
            },
            json={
                "sender": {"name": sender_name, "email": sender_email},
                "to": [{"email": email}],
                "subject": subject,
                "htmlContent": html_content,
                "textContent": text_content,
            },
            timeout=15,
        )
        if response.status_code in [200, 201, 202]:
            return True, ""
        data = response.json()
        return False, data.get("message", response.text)
    except Exception as exc:
        return False, str(exc)


def send_otp_via_resend(email, subject, html_content, text_content, api_key):
    sender = getattr(settings, "DEFAULT_FROM_EMAIL", "MSTS-GJS Store <onboarding@resend.dev>")
    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "from": sender,
                "to": [email],
                "subject": subject,
                "html": html_content,
                "text": text_content,
            },
            timeout=15,
        )
        if response.status_code in [200, 201, 202]:
            return True, ""
        data = response.json()
        return False, data.get("message", response.text)
    except Exception as exc:
        return False, str(exc)


def send_email_message(email, subject, html_content, text_content):
    """
    Unified email dispatcher:
    1. Brevo HTTPS API (bypasses Render SMTP port 587 block)
    2. Resend HTTPS API
    3. Django EmailMultiAlternatives SMTP fallback
    Returns (success: bool, error_message: str).
    """
    if not email:
        return False, "Recipient email address is missing."

    # 1. Try Brevo HTTPS API if key present
    brevo_key = getattr(settings, "BREVO_API_KEY", "") or os.environ.get("BREVO_API_KEY", "")
    if brevo_key:
        ok, err = send_otp_via_brevo(email, subject, html_content, text_content, brevo_key)
        if ok:
            return True, ""
        logger.warning("Brevo API delivery failed: %s. Trying fallback...", err)

    # 2. Try Resend HTTPS API if key present
    resend_key = getattr(settings, "RESEND_API_KEY", "") or os.environ.get("RESEND_API_KEY", "")
    if resend_key:
        ok, err = send_otp_via_resend(email, subject, html_content, text_content, resend_key)
        if ok:
            return True, ""
        logger.warning("Resend API delivery failed: %s. Trying fallback...", err)

    # 3. Standard SMTP fallback
    try:
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", "noreply@msts-gjs.com")
        msg = EmailMultiAlternatives(subject, text_content, from_email, [email])
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        return True, ""
    except Exception as exc:
        err_str = str(exc)
        if "Network is unreachable" in err_str or "101" in err_str:
            err_str = (
                "Render free tier blocks SMTP port 587. "
                "Please add a free BREVO_API_KEY or RESEND_API_KEY in Render Environment Variables to send emails via HTTPS port 443."
            )
        return False, err_str


def send_special_access_email(user, special_access, custom_subject=None, custom_body=None):
    """
    Sends an announcement email to a special access recipient using the common SiteSetting template,
    with dynamic variable replacement and custom overrides if provided.
    Returns (success: bool, error_message: str).
    """
    if not user or not user.email:
        return False, "User does not have an email address configured."

    setting = SiteSetting.load()
    raw_subject = (
        custom_subject.strip()
        if custom_subject and str(custom_subject).strip()
        else (setting.special_access_email_subject or "🎉 You've Received VIP Special Access - MSTS-GJS Production Store")
    )
    raw_heading = setting.special_access_email_heading or "VIP Special Access Granted"
    raw_body = (
        custom_body.strip()
        if custom_body and str(custom_body).strip()
        else (setting.special_access_email_body or "Great news! You have been granted exclusive Special Access on MSTS-GJS Production Store.")
    )
    raw_footer = setting.special_access_email_footer or "Happy Simulating! — MSTS-GJS Production Team"

    # Determine access type and items
    if special_access.is_all_access_free:
        access_type_label = "Storewide All-Access Pass (Everything Free)"
        granted_items_label = "All Store Products, Train Packs, Routes & DDS Nameboards"
    else:
        access_type_label = "Specific VIP Products Pass"
        asset_titles = list(special_access.granted_assets.values_list("title", flat=True))
        granted_items_label = ", ".join(asset_titles) if asset_titles else "Selected VIP items"

    # Expiry string
    if special_access.expires_at:
        expiry_info = special_access.expires_at.strftime("%d %b %Y, %I:%M %p UTC")
    else:
        expiry_info = "Permanent Access (Never Expires)"

    store_url = getattr(settings, "FRONTEND_URL", "https://gjs-store-4-msts.vercel.app").rstrip("/")

    # Replacements
    placeholders = {
        "{username}": user.username or "Railway Enthusiast",
        "{access_type}": access_type_label,
        "{granted_items}": granted_items_label,
        "{expiry_info}": expiry_info,
        "{store_url}": store_url,
    }

    subject = raw_subject
    for k, v in placeholders.items():
        subject = subject.replace(k, str(v))

    heading = raw_heading
    for k, v in placeholders.items():
        heading = heading.replace(k, str(v))

    body_text = raw_body
    for k, v in placeholders.items():
        body_text = body_text.replace(k, str(v))

    footer_text = raw_footer
    for k, v in placeholders.items():
        footer_text = footer_text.replace(k, str(v))

    import html as html_escape
    escaped_body = html_escape.escape(body_text).replace("\n", "<br/>")

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>{html_escape.escape(subject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050608; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #050608; padding: 36px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #0f1015; border: 1px solid rgba(124,58,237,0.35); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.8);">
          <!-- Brand Header -->
          <tr>
            <td style="padding: 28px 32px 20px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(124,58,237,0.15) 0%, rgba(15,16,21,0) 100%);">
              <span style="display: inline-block; padding: 4px 14px; border-radius: 9999px; background: rgba(217,119,6,0.15); border: 1px solid rgba(245,158,11,0.4); color: #f59e0b; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase;">
                MSTS-GJS Production Store
              </span>
              <h1 style="margin: 14px 0 6px; font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">
                {html_escape.escape(heading)}
              </h1>
              <p style="margin: 0; font-size: 12px; color: #a78bfa; font-weight: 600;">
                Exclusive VIP Member Announcement
              </p>
            </td>
          </tr>

          <!-- Main Content Area -->
          <tr>
            <td style="padding: 28px 32px 20px;">
              <div style="font-size: 14px; line-height: 1.7; color: #cbd5e1; margin-bottom: 24px;">
                {escaped_body}
              </div>

              <!-- Pass Summary Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #171821; border: 1px solid rgba(124,58,237,0.25); border-radius: 12px; margin-bottom: 26px;">
                <tr>
                  <td style="padding: 18px 20px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: #a78bfa; margin-bottom: 12px;">
                      ✦ VIP Access Summary
                    </div>
                    <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 12px; color: #e2e8f0;">
                      <tr>
                        <td width="36%" style="color: #94a3b8; font-weight: 600;">Recipient:</td>
                        <td style="font-weight: 700; color: #ffffff;">{html_escape.escape(user.username)}</td>
                      </tr>
                      <tr>
                        <td style="color: #94a3b8; font-weight: 600;">Access Tier:</td>
                        <td style="font-weight: 700; color: #f59e0b;">{html_escape.escape(access_type_label)}</td>
                      </tr>
                      <tr>
                        <td style="color: #94a3b8; font-weight: 600;">Validity:</td>
                        <td style="font-weight: 700; color: #10b981;">{html_escape.escape(expiry_info)}</td>
                      </tr>
                      <tr>
                        <td style="color: #94a3b8; font-weight: 600; vertical-align: top;">Included Items:</td>
                        <td style="font-weight: 600; color: #cbd5e1;">{html_escape.escape(granted_items_label)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin-bottom: 16px;">
                <a href="{store_url}/assets" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 30px; border-radius: 8px; box-shadow: 0 4px 14px rgba(124,58,237,0.4);">
                  Explore Depot & Download Now &rarr;
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer Sign-off -->
          <tr>
            <td style="padding: 16px 32px 24px; text-align: center; border-top: 1px solid rgba(255,255,255,0.06); font-size: 11px; color: #64748b;">
              <p style="margin: 0 0 6px; color: #94a3b8; font-weight: 600;">
                {html_escape.escape(footer_text)}
              </p>
              <p style="margin: 0; font-size: 10px; color: #475569;">
                MSTS-GJS Production Store &bull; Official Depot for Indian Railways Simulator Content
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

    text_content = f"{heading}\n\n{body_text}\n\nAccess Tier: {access_type_label}\nValidity: {expiry_info}\nItems: {granted_items_label}\n\nExplore at: {store_url}/assets\n\n{footer_text}"

    return send_email_message(user.email, subject, html_content, text_content)


class SendOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SendOTPSerializer(data=request.data)
        if not serializer.is_valid():
            first_err = "Invalid input."
            for field, errs in serializer.errors.items():
                if isinstance(errs, list) and len(errs) > 0:
                    first_err = f"{errs[0]}"
                    break
                elif isinstance(errs, str):
                    first_err = errs
                    break
            return Response({"detail": first_err, "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].lower().strip()
        purpose = serializer.validated_data.get("purpose", "login")

        try:
            if purpose == "login":
                if not User.objects.filter(email__iexact=email).exists():
                    return Response(
                        {"detail": "No account found with this email address. Please sign up first."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
            elif purpose == "signup":
                if User.objects.filter(email__iexact=email).exists():
                    return Response(
                        {"detail": "An account with this email address already exists. Please login instead."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            elif purpose == "reset":
                if not User.objects.filter(email__iexact=email).exists():
                    return Response(
                        {"detail": "No account found with this email address."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
            elif purpose == "profile_edit":
                existing = User.objects.filter(email__iexact=email).first()
                if request.user.is_authenticated:
                    if existing and existing.id != request.user.id:
                        return Response(
                            {"detail": "This email address is already in use by another account."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )

            recent_otp = EmailOTP.objects.filter(
                email__iexact=email,
                created_at__gte=timezone.now() - timedelta(seconds=60),
            ).first()
            if recent_otp:
                return Response(
                    {"detail": "Please wait a minute before requesting another verification code."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )

            EmailOTP.objects.filter(email__iexact=email, purpose=purpose, is_used=False).update(is_used=True)

            otp_code = f"{random.SystemRandom().randint(100000, 999999)}"
            expires_at = timezone.now() + timedelta(minutes=10)

            EmailOTP.objects.create(
                email=email,
                otp_code=otp_code,
                purpose=purpose,
                expires_at=expires_at,
            )
        except Exception as db_exc:
            logger.exception("Database error while processing OTP for %s: %s", email, db_exc)
            return Response(
                {
                    "detail": f"Database error: {db_exc}. Ensure database migrations are run on the server ('python manage.py migrate')."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        sent, err = send_otp_email(email, otp_code, purpose)
        if not sent:
            logger.error("Email sending failed for %s: %s", email, err)
            return Response(
                {
                    "detail": f"Failed to send email: {err}. Please check your EMAIL_HOST_USER and EMAIL_HOST_PASSWORD in Render environment variables."
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "success": True,
                "message": f"A 6-digit verification code has been sent to {email}.",
            },
            status=status.HTTP_200_OK,
        )


class VerifyOTPView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        email = serializer.validated_data["email"].lower().strip()
        otp_code = serializer.validated_data["otp"].strip()
        purpose = serializer.validated_data.get("purpose", "login")

        try:
            otp_record = EmailOTP.objects.filter(
                email__iexact=email,
                purpose=purpose,
                is_used=False,
            ).order_by("-created_at").first()
        except Exception as db_exc:
            logger.exception("Database error in VerifyOTPView for %s: %s", email, db_exc)
            return Response(
                {
                    "detail": f"Database error: {db_exc}. Ensure database migrations are run on the server ('python manage.py migrate')."
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if not otp_record:
            return Response(
                {"detail": "No active verification code found. Please request a new code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not otp_record.is_valid():
            if otp_record.attempts >= 5:
                return Response(
                    {"detail": "Too many failed attempts. Please request a new verification code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            return Response(
                {"detail": "Verification code has expired. Please request a new code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_record.otp_code != otp_code:
            otp_record.attempts += 1
            otp_record.save(update_fields=["attempts"])
            remaining = max(0, 5 - otp_record.attempts)
            return Response(
                {"detail": f"Incorrect verification code. {remaining} attempt(s) remaining."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record.is_used = True
        otp_record.save(update_fields=["is_used"])

        if purpose == "login":
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                return Response(
                    {"detail": "Account not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif purpose == "signup":
            username = serializer.validated_data.get("username", "").strip()
            password = serializer.validated_data.get("password", "").strip()
            first_name = serializer.validated_data.get("first_name", "").strip()
            last_name = serializer.validated_data.get("last_name", "").strip()

            if not username:
                base = re.sub(r"[^a-zA-Z0-9_]", "_", email.split("@")[0]).strip("_") or "user"
                username = base[:140]
                suffix = 1
                while User.objects.filter(username=username).exists():
                    suffix_text = f"_{suffix}"
                    username = f"{base[:150 - len(suffix_text)]}{suffix_text}"
                    suffix += 1

            if User.objects.filter(username=username).exists():
                return Response(
                    {"detail": "This username is already taken. Please choose a different username."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User(
                username=username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                is_active=True,
            )
            phone_number = serializer.validated_data.get("phone_number", "").strip()

            if password:
                user.set_password(password)
            else:
                user.set_unusable_password()
            user.save()

            if phone_number:
                digits = re.sub(r"\D", "", phone_number)
                clean_phone = digits[-10:] if len(digits) >= 10 else digits
                profile, _ = UserProfile.objects.get_or_create(user=user)
                profile.phone_number = clean_phone
                profile.save(update_fields=["phone_number"])
        elif purpose == "reset":
            password = serializer.validated_data.get("password", "").strip()
            if not password:
                return Response(
                    {"detail": "A new password is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if len(password) < 8:
                return Response(
                    {"detail": "Password must be at least 8 characters long."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                return Response(
                    {"detail": "No account found with this email address."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            user.set_password(password)
            user.save()
        else:
            return Response({"success": True, "message": "Verification successful."})

        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
                "message": "Password reset successful." if purpose == "reset" else "Login successful.",
            },
            status=status.HTTP_200_OK,
        )


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    if request.method == "PATCH":
        otp_code = str(request.data.get("otp", "")).strip()
        new_email = str(request.data.get("email", request.user.email or "")).strip().lower()
        new_first_name = str(request.data.get("first_name", request.user.first_name or "")).strip()
        new_last_name = str(request.data.get("last_name", request.user.last_name or "")).strip()

        # Check if email is already taken by another user
        if new_email and new_email != (request.user.email or "").lower():
            if User.objects.filter(email__iexact=new_email).exclude(id=request.user.id).exists():
                return Response(
                    {"detail": "This email address is already registered by another account."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Require OTP authentication
        if not otp_code or len(otp_code) != 6:
            return Response(
                {"detail": "Please enter the 6-digit email verification code to save profile changes."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        possible_emails = [e for e in [new_email, (request.user.email or "").lower()] if e]
        otp_record = EmailOTP.objects.filter(
            email__in=possible_emails,
            purpose="profile_edit",
            is_used=False,
        ).order_by("-created_at").first()

        if not otp_record or not otp_record.is_valid():
            return Response(
                {"detail": "Verification code has expired or was not found. Please request a new code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if otp_record.otp_code != otp_code:
            otp_record.attempts += 1
            otp_record.save(update_fields=["attempts"])
            remaining = max(0, 5 - otp_record.attempts)
            return Response(
                {"detail": f"Incorrect verification code. {remaining} attempt(s) remaining."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record.is_used = True
        otp_record.save(update_fields=["is_used"])

        request.user.first_name = new_first_name
        request.user.last_name = new_last_name
        if new_email:
            request.user.email = new_email
        request.user.save(update_fields=["first_name", "last_name", "email"])
    if "phone_number" in request.data:
        new_phone = str(request.data.get("phone_number", "")).strip()
        digits = re.sub(r"\D", "", new_phone)
        clean_phone = digits[-10:] if len(digits) >= 10 else digits
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        profile.phone_number = clean_phone
        profile.save(update_fields=["phone_number"])
        request.user.profile = profile

    return Response(UserSerializer(request.user, context={"request": request}).data)


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

        ordering = self.request.query_params.get("ordering")
        if ordering in ["-download_count", "downloads", "trending"]:
            qs = qs.order_by("-download_count", "-created_at")
        elif ordering == "-created_at":
            qs = qs.order_by("-created_at")
        elif ordering == "price_asc":
            qs = qs.order_by("price")
        elif ordering == "price_desc":
            qs = qs.order_by("-price")

        return qs.annotate(
            review_count=Count("reviews", filter=Q(reviews__is_approved=True)),
            avg_rating=Avg("reviews__rating", filter=Q(reviews__is_approved=True)),
        )

    @action(detail=True, methods=["get", "post"], permission_classes=[permissions.IsAuthenticated], throttle_classes=[DownloadRateThrottle])
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
        board_template_id = request.data.get("board_template_id")
        if board_template_id:
            if request.user.is_staff:
                template = get_object_or_404(BoardTemplate, id=board_template_id)
            else:
                template = get_object_or_404(BoardTemplate, id=board_template_id, published=True)
            already_unlocked = template.can_user_customize(request.user)
            if already_unlocked:
                existing_order = Order.objects.filter(user=request.user, board_template=template, status__in=[Order.Status.APPROVED, Order.Status.PAID]).order_by("-id").first()
                if existing_order:
                    return Response(OrderSerializer(existing_order, context={"request": request}).data, status=status.HTTP_200_OK)
                order = Order.objects.create(
                    user=request.user,
                    board_template=template,
                    amount=Decimal("0.00"),
                    currency="INR",
                    status=Order.Status.APPROVED,
                    download_enabled=True,
                )
                order.provider_order_id = f"GJS-B{order.id:05d}"
                order.save(update_fields=["provider_order_id"])
                grant_board_unlock_if_applicable(order)
                return Response(OrderSerializer(order, context={"request": request}).data, status=status.HTTP_201_CREATED)

            target_amount = template.price
            existing_order = Order.objects.filter(
                user=request.user,
                board_template=template,
                status__in=[Order.Status.PENDING, Order.Status.VERIFICATION_PENDING, Order.Status.APPROVED, Order.Status.PAID],
            ).order_by("-id").first()

            if existing_order and existing_order.status == Order.Status.PENDING and (
                existing_order.amount != target_amount
                or (existing_order.created_at and existing_order.created_at < timezone.now() - timedelta(minutes=25))
            ):
                existing_order.status = Order.Status.EXPIRED
                existing_order.download_enabled = False
                existing_order.save(update_fields=["status", "download_enabled"])
                Payment.objects.filter(order=existing_order).update(status="expired")
                existing_order = None

            if existing_order:
                sync_order_download_access(existing_order)
                if not order_has_download_access(existing_order):
                    synced, sync_error = sync_cashfree_order(existing_order)
                    if not synced and not cashfree_order_missing_error(sync_error):
                        return Response({"detail": sync_error or "Cashfree payment status could not be checked."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                    if existing_order.status == Order.Status.FAILED:
                        existing_order = None
            if existing_order:
                req_phone = request.data.get("customer_phone") or request.data.get("phone")
                if req_phone:
                    import re
                    digits = re.sub(r"\D", "", str(req_phone))[-10:]
                    if len(digits) == 10 and existing_order.customer_phone != digits:
                        existing_order.customer_phone = digits
                        existing_order.save(update_fields=["customer_phone"])
                if not order_has_download_access(existing_order):
                    cashfree_ready, cashfree_error = ensure_cashfree_payment(existing_order, request)
                    if not cashfree_ready:
                        return Response({"detail": cashfree_error or "Cashfree checkout is not available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
                return Response(OrderSerializer(existing_order, context={"request": request}).data, status=status.HTTP_200_OK)

            phone_input = request.data.get("customer_phone") or request.data.get("phone") or ""
            if not phone_input and hasattr(request.user, "profile") and request.user.profile.phone_number:
                phone_input = request.user.profile.phone_number
            if not phone_input:
                prev = Order.objects.filter(user=request.user).exclude(customer_phone="").order_by("-id").first()
                if prev:
                    phone_input = prev.customer_phone
            import re
            cleaned_phone = re.sub(r"\D", "", str(phone_input))[-10:] if len(re.sub(r"\D", "", str(phone_input))) >= 10 else ""

            order = Order.objects.create(
                user=request.user,
                board_template=template,
                customer_phone=cleaned_phone,
                amount=target_amount,
                currency="INR",
                status=Order.Status.PENDING,
                download_enabled=False,
            )
            order.provider_order_id = f"GJS-B{order.id:05d}"
            order.save(update_fields=["provider_order_id"])
            cashfree_ready, cashfree_error = ensure_cashfree_payment(order, request)
            if not cashfree_ready:
                return Response({"detail": cashfree_error or "Cashfree checkout is not available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            data = OrderSerializer(order, context={"request": request}).data
            return Response(data, status=status.HTTP_201_CREATED)

        asset = get_object_or_404(Asset, id=request.data.get("asset_id"), is_published=True)
        ea_status = get_cached_early_access_status(asset, request)
        now = timezone.now()
        is_released_by_schedule = bool(asset.release_date and now >= asset.release_date)
        is_upcoming_effective = bool(asset.is_upcoming and not is_released_by_schedule)

        existing_order = Order.objects.filter(
            user=request.user,
            asset=asset,
            status__in=[Order.Status.PENDING, Order.Status.VERIFICATION_PENDING, Order.Status.APPROVED, Order.Status.PAID],
        ).order_by("-id").first()

        has_paid_existing = bool(
            existing_order and existing_order.status in [Order.Status.APPROVED, Order.Status.PAID]
        )

        if is_upcoming_effective and not ea_status["can_access_early"] and not has_paid_existing:
            if not getattr(asset, "prebooking_enabled", False):
                return Response(
                    {"detail": "This asset is marked as upcoming and is not available for purchase or pre-booking yet."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if asset.prebooking_starts_at and now < asset.prebooking_starts_at:
                return Response(
                    {"detail": "Pre-booking has not started yet for this product."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if asset.prebooking_ends_at and now >= asset.prebooking_ends_at:
                return Response(
                    {"detail": "Pre-booking has closed for this product."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        target_amount = ea_status["effective_price"]

        # A pending order is an unpaid checkout quote, not a price lock.  Do
        # not reuse it after an administrator changes the product price or discount.
        if (
            existing_order
            and existing_order.status == Order.Status.PENDING
            and (
                existing_order.amount != target_amount
                or (existing_order.created_at and existing_order.created_at < timezone.now() - timedelta(minutes=25))
            )
        ):
            existing_order.status = Order.Status.EXPIRED
            existing_order.download_enabled = False
            existing_order.save(update_fields=["status", "download_enabled"])
            Payment.objects.filter(order=existing_order).update(status="expired")
            existing_order = None

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
            req_phone = request.data.get("customer_phone") or request.data.get("phone")
            if req_phone:
                import re
                digits = re.sub(r"\D", "", str(req_phone))[-10:]
                if len(digits) == 10 and existing_order.customer_phone != digits:
                    existing_order.customer_phone = digits
                    existing_order.save(update_fields=["customer_phone"])
            if not order_has_download_access(existing_order) and not user_has_special_access(request.user, asset):
                cashfree_ready, cashfree_error = ensure_cashfree_payment(existing_order, request)
                if not cashfree_ready:
                    return Response({"detail": cashfree_error or "Cashfree checkout is not available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            return Response(OrderSerializer(existing_order, context={"request": request}).data, status=status.HTTP_200_OK)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        order = serializer.instance
        ea_status = get_cached_early_access_status(asset, request)
        is_free_purchase = asset.is_free or ea_status["effective_price"] <= Decimal("0.00") or user_has_special_access(request.user, asset)
        if not is_free_purchase:
            cashfree_ready, cashfree_error = ensure_cashfree_payment(order, request)
            if not cashfree_ready:
                return Response({"detail": cashfree_error or "Cashfree checkout is not available."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        data = OrderSerializer(order, context={"request": request}).data
        headers = self.get_success_headers(data)
        return Response(data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        asset = serializer.validated_data.get("asset")
        if not asset:
            order = serializer.save(user=self.request.user)
            order.provider_order_id = f"GJS-{order.id:06d}"
            order.save(update_fields=["provider_order_id"])
            return

        ea_status = get_cached_early_access_status(asset, self.request)
        final_amount = ea_status["effective_price"]
        has_special = user_has_special_access(self.request.user, asset)
        if has_special:
            final_amount = Decimal("0.00")
        is_free_purchase = asset.is_free or final_amount <= Decimal("0.00") or has_special
        status_value = Order.Status.APPROVED if is_free_purchase else Order.Status.PENDING

        phone_input = self.request.data.get("customer_phone") or self.request.data.get("phone") or ""
        if not phone_input and hasattr(self.request.user, "profile") and self.request.user.profile.phone_number:
            phone_input = self.request.user.profile.phone_number
        if not phone_input:
            prev = Order.objects.filter(user=self.request.user).exclude(customer_phone="").order_by("-id").first()
            if prev:
                phone_input = prev.customer_phone
        import re
        cleaned_phone = re.sub(r"\D", "", str(phone_input))[-10:] if len(re.sub(r"\D", "", str(phone_input))) >= 10 else ""

        order = serializer.save(
            user=self.request.user,
            amount=final_amount,
            currency="INR",
            customer_phone=cleaned_phone,
            status=status_value,
            download_enabled=is_free_purchase,
        )
        order.provider_order_id = f"GJS-{order.id:06d}"
        order.save(update_fields=["provider_order_id"])
        Payment.objects.get_or_create(
            order=order,
            defaults={"provider": Payment.Provider.MANUAL, "status": status_value.lower()},
        )
        if is_free_purchase:
            grant_board_unlock_if_applicable(order)


class BoardTemplateViewSet(viewsets.ModelViewSet):
    queryset = BoardTemplate.objects.all()
    serializer_class = BoardTemplateSerializer
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        if self.request.user and self.request.user.is_authenticated and self.request.user.is_staff:
            return BoardTemplate.objects.all()
        return BoardTemplate.objects.filter(published=True)

    def perform_create(self, serializer):
        instance = serializer.save()
        log_admin_activity(self.request, "Created board template", "BoardTemplate", instance.id, f"Created {instance.name}")

    def perform_update(self, serializer):
        instance = serializer.save()
        log_admin_activity(self.request, "Updated board template", "BoardTemplate", instance.id, f"Updated {instance.name}")

    def perform_destroy(self, instance):
        template_id = instance.id
        template_name = instance.name
        instance.delete()
        log_admin_activity(self.request, "Deleted board template", "BoardTemplate", template_id, f"Deleted {template_name}")

    @action(detail=False, methods=["post"], url_path="upload-image", permission_classes=[permissions.IsAdminUser])
    def upload_image(self, request):
        image = request.FILES.get("image") or request.FILES.get("file")
        if not image:
            return Response({"detail": "No image file provided."}, status=status.HTTP_400_BAD_REQUEST)
        from django.core.files.storage import default_storage
        import uuid
        ext = image.name.split(".")[-1] if "." in image.name else "png"
        filename = f"board_bg_{uuid.uuid4().hex[:10]}.{ext}"
        saved_path = default_storage.save(f"assets/board_templates/{filename}", image)
        url = default_storage.url(saved_path)
        if not url.startswith("http"):
            url = request.build_absolute_uri(url)
        return Response({"url": url, "path": saved_path}, status=status.HTTP_201_CREATED)


class UserCustomBoardViewSet(viewsets.ModelViewSet):
    serializer_class = UserCustomBoardSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserCustomBoard.objects.filter(user=self.request.user).select_related("template")

    def perform_create(self, serializer):
        template = serializer.validated_data["template"]
        if not template.can_user_customize(self.request.user):
            raise PermissionDenied("You must unlock this board template before saving custom configurations.")
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        template = serializer.instance.template
        if not template.can_user_customize(self.request.user):
            raise PermissionDenied("You must unlock this board template before saving custom configurations.")
        serializer.save()


class PaymentVerifyView(generics.GenericAPIView):
    serializer_class = PaymentVerifySerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        raw_order_id = str(serializer.validated_data["order_id"]).strip()
        order = None
        if raw_order_id.isdigit():
            order = Order.objects.filter(id=int(raw_order_id), user=request.user).first()
        if not order:
            order = Order.objects.filter(provider_order_id__iexact=raw_order_id, user=request.user).first()
        if not order:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

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
            return Response(OrderSerializer(order, context={"request": request}).data, status=status.HTTP_200_OK)
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
        return Order.objects.filter(user=self.request.user).select_related("asset", "asset__category", "board_template")


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def order_invoice(request, pk):
    if request.user.is_staff:
        order = get_object_or_404(Order.objects.select_related("asset", "asset__category", "user"), pk=pk)
    else:
        order = get_object_or_404(Order.objects.select_related("asset", "asset__category", "user"), pk=pk, user=request.user)

    sync_order_download_access(order)
    if not request.user.is_staff and not order_has_download_access(order):
        return Response({"detail": "Purchase approval is required before downloading this invoice."}, status=status.HTTP_403_FORBIDDEN)

    req_format = request.GET.get("format", "").lower()
    if req_format == "html":
        from .invoice import generate_invoice_html
        return HttpResponse(generate_invoice_html(order), content_type="text/html; charset=utf-8")

    try:
        from .invoice import generate_invoice_pdf
        pdf = generate_invoice_pdf(order)
        response = HttpResponse(pdf, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="GJS-{order.id:06d}-invoice.pdf"'
        return response
    except Exception as exc:
        logger.exception("Failed to generate PDF invoice for order %s: %s", order.id, exc)
        from .invoice import generate_invoice_html
        return HttpResponse(generate_invoice_html(order), content_type="text/html; charset=utf-8")


class DownloadListView(generics.ListAPIView):
    serializer_class = DownloadLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DownloadLog.objects.filter(user=self.request.user).select_related("asset", "asset__category")


class ReviewCreateView(generics.CreateAPIView):
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        asset_id = request.data.get("asset") or request.data.get("asset_id")
        if not asset_id:
            return Response({"detail": "asset is required."}, status=status.HTTP_400_BAD_REQUEST)
        asset = get_object_or_404(Asset, pk=asset_id)
        rating = request.data.get("rating")
        if not rating or not str(rating).isdigit() or not (1 <= int(rating) <= 5):
            return Response({"detail": "rating must be an integer between 1 and 5."}, status=status.HTTP_400_BAD_REQUEST)
        comment = str(request.data.get("comment", "")).strip()
        review, created = Review.objects.update_or_create(
            user=request.user,
            asset=asset,
            defaults={
                "rating": int(rating),
                "comment": comment,
                "is_approved": True,
            },
        )
        return Response(ReviewSerializer(review, context={"request": request}).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class WishlistView(generics.ListCreateAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related("asset", "asset__category")

    def create(self, request, *args, **kwargs):
        asset_id = request.data.get("asset_id")
        if not asset_id:
            return Response({"detail": "asset_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        asset = get_object_or_404(Asset, pk=asset_id)
        wishlist_item, created = Wishlist.objects.get_or_create(user=request.user, asset=asset)
        return Response(WishlistSerializer(wishlist_item, context={"request": request}).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request, *args, **kwargs):
        asset_id = request.query_params.get("asset_id") or request.data.get("asset_id")
        if asset_id:
            Wishlist.objects.filter(user=request.user, asset_id=asset_id).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response({"detail": "asset_id is required to delete wishlist item."}, status=status.HTTP_400_BAD_REQUEST)


class WishlistDetailView(generics.DestroyAPIView):
    serializer_class = WishlistSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user)


class AdminAssetViewSet(viewsets.ModelViewSet):
    queryset = Asset.objects.select_related("category").prefetch_related("reviews")
    serializer_class = AssetWriteSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [JSONParser, FormParser, MultiPartParser]

    def list(self, request, *args, **kwargs):
        assets = self.get_queryset().annotate(
            review_count=Count("reviews", filter=Q(reviews__is_approved=True)),
            avg_rating=Avg("reviews__rating", filter=Q(reviews__is_approved=True)),
        )
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

    def destroy(self, request, *args, **kwargs):
        asset = self.get_object()
        try:
            response = super().destroy(request, *args, **kwargs)
            log_admin_activity(request, "Product deleted", "Asset", asset.id, f"Deleted product {asset.title}")
            return response
        except ProtectedError:
            return Response(
                {
                    "detail": f'Cannot delete "{asset.title}" because customers have already purchased or ordered it. You can toggle "Visible" off instead to hide it from the store.'
                },
                status=status.HTTP_400_BAD_REQUEST,
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
        "asset__category",
        "board_template",
    ).order_by("-id")

    serializer_class = AdminOrderSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ["get", "patch", "post", "delete", "head", "options"]

    # Pagination
    pagination_class = AdminOrderPagination

    def get_queryset(self):
        qs = Order.objects.select_related(
            "user",
            "asset",
            "asset__category",
            "board_template",
        ).order_by("-id")

        status_param = self.request.query_params.get("status")
        if status_param and status_param != "all":
            qs = qs.filter(status=status_param.upper())

        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            id_filter = Q(id=int(search)) if search.isdigit() else Q()
            qs = qs.filter(
                id_filter
                | Q(utr__icontains=search)
                | Q(payer_name__icontains=search)
                | Q(provider_order_id__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__email__icontains=search)
                | Q(asset__title__icontains=search)
                | Q(board_template__name__icontains=search)
                | Q(board_template__id__icontains=search)
            )

        ordering = self.request.query_params.get("ordering") or self.request.query_params.get("sort")
        if ordering in ["oldest", "id", "created_at"]:
            qs = qs.order_by("id")
        elif ordering in ["amount_high", "-total_amount"]:
            qs = qs.order_by("-total_amount", "-id")
        elif ordering in ["amount_low", "total_amount"]:
            qs = qs.order_by("total_amount", "-id")
        else:
            qs = qs.order_by("-id")
        return qs

    def perform_update(self, serializer):
        previous_status = self.get_object().status
        previous_download = self.get_object().download_enabled
        order = serializer.save()

        if order.status == Order.Status.BLOCKED:
            order.download_enabled = False
            if not order.blocked_at:
                order.blocked_at = timezone.now()
            order.save(update_fields=["download_enabled", "blocked_at"])
            Payment.objects.filter(order=order).update(status="blocked")
            UserBoardUnlock.objects.filter(order=order).delete()

        elif order.status in [Order.Status.PAID, Order.Status.APPROVED]:
            if "download_enabled" not in serializer.validated_data:
                order.download_enabled = True
            order.blocked_at = None
            order.save(update_fields=["download_enabled", "blocked_at"])
            Payment.objects.filter(order=order).update(status="approved")
            grant_board_unlock_if_applicable(order)

        elif order.status in [
            Order.Status.REJECTED,
            Order.Status.FAILED,
            Order.Status.REFUNDED,
        ]:
            order.download_enabled = False
            order.blocked_at = None
            order.save(update_fields=["download_enabled", "blocked_at"])
            Payment.objects.filter(order=order).update(status=order.status.lower())
            UserBoardUnlock.objects.filter(order=order).delete()

        user_label = order.user.username if order.user else "User"
        asset_title = order.asset.title if order.asset else (order.board_template.name if order.board_template else "Item")

        status_changed = previous_status != order.status
        download_changed = previous_download != order.download_enabled

        if status_changed or download_changed:
            action_verb = f"Order {order.status.lower()}"
            detail_msg = f"Order #{order.id} for {user_label} ({asset_title}): status={order.status}, downloads={'ENABLED' if order.download_enabled else 'BLOCKED'}"
            if order.block_reason:
                detail_msg += f" (Reason: {order.block_reason})"
            log_admin_activity(
                self.request,
                action_verb,
                "Order",
                order.id,
                detail_msg,
            )

    def destroy(self, request, *args, **kwargs):
        order = self.get_object()
        deletable_statuses = [
            Order.Status.PENDING,
            Order.Status.VERIFICATION_PENDING,
            Order.Status.FAILED,
            Order.Status.EXPIRED,
            Order.Status.REJECTED,
        ]
        if order.status not in deletable_statuses:
            return Response(
                {
                    "detail": f"Cannot delete order #{order.id} with status '{order.status}'. Only PENDING or unverified orders can be deleted."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        order_id = order.id
        user_label = order.user.username if order.user else "User"
        asset_title = (
            order.asset.title
            if order.asset
            else (order.board_template.name if order.board_template else "Item")
        )
        order_status = order.status

        order.delete()

        log_admin_activity(
            request,
            "Deleted pending order",
            "Order",
            order_id,
            f"Deleted {order_status} order #{order_id} for {user_label} ({asset_title})",
        )
        return Response(
            {"message": f"Order #{order_id} ({order_status}) deleted successfully."},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="set-access")
    def set_access(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get("status")
        download_enabled = request.data.get("download_enabled")
        block_reason = request.data.get("block_reason")
        admin_notes = request.data.get("admin_notes")

        previous_status = order.status
        previous_download = order.download_enabled

        if new_status and new_status in Order.Status.values:
            order.status = new_status

        if download_enabled is not None:
            order.download_enabled = bool(download_enabled)
        else:
            if order.status in [Order.Status.PAID, Order.Status.APPROVED]:
                order.download_enabled = True
            elif order.status in [Order.Status.BLOCKED, Order.Status.REJECTED, Order.Status.FAILED, Order.Status.REFUNDED]:
                order.download_enabled = False

        if order.status == Order.Status.BLOCKED or not order.download_enabled:
            if not order.blocked_at:
                order.blocked_at = timezone.now()
        else:
            order.blocked_at = None

        if block_reason is not None:
            order.block_reason = str(block_reason).strip()
        if admin_notes is not None:
            order.admin_notes = str(admin_notes).strip()

        order.save()

        # Update payment record status
        if order.status in [Order.Status.PAID, Order.Status.APPROVED]:
            Payment.objects.filter(order=order).update(status="approved")
            grant_board_unlock_if_applicable(order)
        elif order.status == Order.Status.BLOCKED:
            Payment.objects.filter(order=order).update(status="blocked")
        elif order.status in [Order.Status.REJECTED, Order.Status.FAILED, Order.Status.REFUNDED]:
            Payment.objects.filter(order=order).update(status=order.status.lower())

        user_label = order.user.username if order.user else "User"
        asset_title = order.asset.title if order.asset else (order.board_template.name if order.board_template else "Item")

        action_name = "Order access blocked" if (order.status == Order.Status.BLOCKED or not order.download_enabled) else f"Order {order.status.lower()}"
        msg = f"Order #{order.id} for {user_label} ({asset_title}): status changed from {previous_status} to {order.status}, downloads={'ENABLED' if order.download_enabled else 'BLOCKED'}"
        if order.block_reason:
            msg += f" | Reason: {order.block_reason}"

        log_admin_activity(
            request,
            action_name,
            "Order",
            order.id,
            msg,
        )

        return Response(AdminOrderSerializer(order).data, status=status.HTTP_200_OK)



class AdminUserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ["get", "patch", "post", "head", "options"]

    def create(self, request, *args, **kwargs):
        return Response({"detail": "Method not allowed."}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def get_queryset(self):
        qs = User.objects.annotate(
            paid_orders_count=Count("orders", filter=Q(orders__status="PAID"))
        ).order_by("-date_joined")

        role = self.request.query_params.get("role")
        if role == "staff":
            qs = qs.filter(is_staff=True)
        elif role == "user":
            qs = qs.filter(is_staff=False)

        status_filter = self.request.query_params.get("status")
        if status_filter == "active":
            qs = qs.filter(is_active=True)
        elif status_filter == "disabled":
            qs = qs.filter(is_active=False)

        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        ordering = self.request.query_params.get("ordering") or self.request.query_params.get("sort")
        if ordering in ["oldest", "date_joined"]:
            qs = qs.order_by("date_joined")
        elif ordering in ["purchases_desc", "-paid_orders_count"]:
            qs = qs.order_by("-paid_orders_count", "-date_joined")
        elif ordering in ["username_asc", "username"]:
            qs = qs.order_by("username")
        else:
            qs = qs.order_by("-date_joined")
        return qs

    def perform_update(self, serializer):
        user = self.get_object()
        # Security: prevent admin from deactivating or removing staff privileges from themselves
        if user == self.request.user:
            if "is_active" in serializer.validated_data and not serializer.validated_data["is_active"]:
                raise serializers.ValidationError({"detail": "You cannot deactivate your own admin account."})
            if "is_staff" in serializer.validated_data and not serializer.validated_data["is_staff"]:
                raise serializers.ValidationError({"detail": "You cannot remove staff privileges from your own account."})

        previous_active = user.is_active
        previous_staff = user.is_staff
        previous_username = user.username
        previous_email = user.email
        updated_user = serializer.save()

        changes = []
        if previous_active != updated_user.is_active:
            log_admin_activity(
                self.request,
                "User activated" if updated_user.is_active else "User deactivated",
                "User",
                updated_user.id,
                f"{'Activated' if updated_user.is_active else 'Deactivated'} user {updated_user.username}"
            )
            changes.append("Activated" if updated_user.is_active else "Deactivated")
        if previous_staff != updated_user.is_staff:
            log_admin_activity(
                self.request,
                "Staff granted" if updated_user.is_staff else "Staff revoked",
                "User",
                updated_user.id,
                f"{'Granted' if updated_user.is_staff else 'Revoked'} staff status for {updated_user.username}"
            )
            changes.append("Granted staff" if updated_user.is_staff else "Revoked staff")
        if previous_username != updated_user.username:
            changes.append(f"Username changed to '{updated_user.username}'")
        if previous_email != updated_user.email:
            changes.append(f"Email changed to '{updated_user.email}'")
        if "phone_number" in serializer.validated_data:
            changes.append("Phone number updated")
        if "new_password" in serializer.validated_data and serializer.validated_data["new_password"]:
            changes.append("Password reset by admin")

        log_admin_activity(
            self.request,
            "User profile edited",
            "User",
            updated_user.id,
            f"Admin edited user {updated_user.username}: {', '.join(changes) if changes else 'Details updated'}",
        )

    @action(detail=True, methods=["get", "patch"], url_path="special-access")
    def special_access(self, request, pk=None):
        user = self.get_object()
        special_access, _ = UserSpecialAccess.objects.get_or_create(user=user)
        email_status = None

        if request.method == "PATCH":
            is_all_access_free = request.data.get("is_all_access_free")
            admin_note = request.data.get("admin_note")
            expires_at = request.data.get("expires_at")
            granted_asset_ids = request.data.get("granted_asset_ids")
            send_email_notification = request.data.get("send_email_notification", False)
            custom_email_subject = request.data.get("custom_email_subject")
            custom_email_body = request.data.get("custom_email_body")

            if is_all_access_free is not None:
                special_access.is_all_access_free = bool(is_all_access_free)
            if admin_note is not None:
                special_access.admin_note = str(admin_note).strip()
            if "expires_at" in request.data:
                special_access.expires_at = expires_at or None
            if granted_asset_ids is not None and isinstance(granted_asset_ids, list):
                special_access.granted_assets.set(Asset.objects.filter(id__in=granted_asset_ids))

            special_access.save()

            log_admin_activity(
                request,
                "Special access updated",
                "User",
                user.id,
                f"Updated special access for user {user.username} (All-Access: {special_access.is_all_access_free})"
            )

            # Send announcement email if requested
            if send_email_notification:
                if user.email:
                    sent, err = send_special_access_email(
                        user,
                        special_access,
                        custom_subject=custom_email_subject,
                        custom_body=custom_email_body,
                    )
                    if sent:
                        email_status = {
                            "sent": True,
                            "recipient": user.email,
                            "message": f"Special access announcement email sent to {user.email}.",
                        }
                        log_admin_activity(
                            request,
                            "Special access email sent",
                            "User",
                            user.id,
                            f"Sent VIP announcement email to {user.email}"
                        )
                    else:
                        email_status = {
                            "sent": False,
                            "recipient": user.email,
                            "error": f"Failed to deliver email: {err}",
                        }
                else:
                    email_status = {
                        "sent": False,
                        "recipient": None,
                        "error": "User does not have an email address configured on their account.",
                    }

        serializer = UserSpecialAccessSerializer(special_access, context={"request": request})
        res_data = dict(serializer.data)
        if email_status:
            res_data["email_status"] = email_status
        return Response(res_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="send-special-access-email")
    def send_special_access_email_action(self, request, pk=None):
        user = self.get_object()
        special_access = getattr(user, "special_access", None)
        if not special_access or not special_access.is_active():
            return Response(
                {"detail": "User does not have active special access. Please configure and enable special access first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.email:
            return Response(
                {"detail": f"User '{user.username}' does not have an email address on file."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        custom_subject = request.data.get("custom_subject")
        custom_body = request.data.get("custom_body")

        sent, err = send_special_access_email(
            user,
            special_access,
            custom_subject=custom_subject,
            custom_body=custom_body,
        )

        if not sent:
            return Response(
                {"detail": f"Failed to deliver email: {err}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        log_admin_activity(
            request,
            "Special access email sent",
            "User",
            user.id,
            f"Manually sent VIP announcement email to {user.email}"
        )

        return Response(
            {"success": True, "message": f"Special access announcement email successfully delivered to {user.email}!"},
            status=status.HTTP_200_OK,
        )


class AdminReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.select_related("user", "asset")
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAdminUser]
    http_method_names = ["get", "patch", "delete", "post", "head", "options"]

    def get_queryset(self):
        qs = Review.objects.select_related("user", "asset")
        status_param = self.request.query_params.get("status")
        if status_param == "approved":
            qs = qs.filter(is_approved=True)
        elif status_param == "pending":
            qs = qs.filter(is_approved=False)

        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(comment__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__email__icontains=search)
                | Q(asset__title__icontains=search)
            )

        ordering = self.request.query_params.get("ordering") or self.request.query_params.get("sort")
        if ordering in ["oldest", "created_at"]:
            qs = qs.order_by("created_at")
        elif ordering in ["rating_desc", "-rating"]:
            qs = qs.order_by("-rating", "-created_at")
        elif ordering in ["rating_asc", "rating"]:
            qs = qs.order_by("rating", "-created_at")
        else:
            qs = qs.order_by("-created_at")
        return qs

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        review = self.get_object()
        review.is_approved = True
        review.save(update_fields=["is_approved"])
        user_label = review.user.username if review.user else "User"
        asset_title = review.asset.title if review.asset else "Asset"
        log_admin_activity(request, "Review approved", "Review", review.id, f"Approved review by {user_label} on {asset_title}")
        return Response(ReviewSerializer(review, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        review = self.get_object()
        review.is_approved = False
        review.save(update_fields=["is_approved"])
        user_label = review.user.username if review.user else "User"
        asset_title = review.asset.title if review.asset else "Asset"
        log_admin_activity(request, "Review unapproved", "Review", review.id, f"Unapproved review by {user_label} on {asset_title}")
        return Response(ReviewSerializer(review, context={"request": request}).data)

    def perform_destroy(self, instance):
        review_id = instance.id
        user_label = instance.user.username if instance.user else "User"
        asset_title = instance.asset.title if instance.asset else "Asset"
        instance.delete()
        log_admin_activity(self.request, "Review deleted", "Review", review_id, f"Deleted review by {user_label} on {asset_title}")


class AdminNotifyRequestView(generics.ListAPIView):
    serializer_class = NotifyRequestSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = NotifyRequest.objects.select_related("asset", "asset__category", "user").order_by("-created_at")
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
        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(asset__title__icontains=search)
                | Q(user__username__icontains=search)
                | Q(user__email__icontains=search)
                | Q(ip_address__icontains=search)
            )

        ordering = self.request.query_params.get("ordering") or self.request.query_params.get("sort")
        if ordering in ["oldest", "downloaded_at"]:
            qs = qs.order_by("downloaded_at")
        else:
            qs = qs.order_by("-downloaded_at")
        return qs


class AdminActivityLogView(generics.ListAPIView):
    serializer_class = AdminActivityLogSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = AdminActivityLog.objects.select_related("actor")

    def get_queryset(self):
        qs = AdminActivityLog.objects.select_related("actor")

        # Default to 30 days of data to save bandwidth and memory unless overridden
        days = self.request.query_params.get("days", "30")
        if days and str(days).strip().lower() != "all":
            try:
                days_int = int(days)
                cutoff = timezone.now() - timedelta(days=days_int)
                qs = qs.filter(created_at__gte=cutoff)
            except (ValueError, TypeError):
                pass

        action = self.request.query_params.get("action")
        if action:
            qs = qs.filter(action__icontains=action)
        search = self.request.query_params.get("search")
        if search:
            search = search.strip()
            qs = qs.filter(
                Q(action__icontains=search)
                | Q(message__icontains=search)
                | Q(actor__username__icontains=search)
                | Q(target_type__icontains=search)
            )

        ordering = self.request.query_params.get("ordering") or self.request.query_params.get("sort")
        if ordering in ["oldest", "created_at"]:
            qs = qs.order_by("created_at")
        else:
            qs = qs.order_by("-created_at")
        return qs

    def delete(self, request, *args, **kwargs):
        older_than_days = request.query_params.get("older_than_days") or (request.data.get("older_than_days") if isinstance(request.data, dict) else None)
        purge_all = request.query_params.get("all") == "true" or (isinstance(request.data, dict) and request.data.get("all") is True)
        ids = None
        if isinstance(request.data, dict) and "ids" in request.data:
            ids = request.data.get("ids")
        elif "ids" in request.query_params:
            ids = request.query_params.getlist("ids")

        if older_than_days:
            try:
                cutoff_days = int(older_than_days)
                cutoff = timezone.now() - timedelta(days=cutoff_days)
                deleted_count, _ = AdminActivityLog.objects.filter(created_at__lt=cutoff).delete()
                return Response(
                    {
                        "detail": f"Purged {deleted_count} activity log(s) older than {cutoff_days} days.",
                        "deleted_count": deleted_count,
                    },
                    status=status.HTTP_200_OK,
                )
            except (ValueError, TypeError):
                return Response({"detail": "Invalid older_than_days parameter."}, status=status.HTTP_400_BAD_REQUEST)

        if ids is not None:
            if not isinstance(ids, list) or len(ids) == 0:
                return Response({"detail": "No log IDs provided for deletion."}, status=status.HTTP_400_BAD_REQUEST)
            deleted_count, _ = AdminActivityLog.objects.filter(id__in=ids).delete()
            return Response(
                {
                    "detail": f"Successfully deleted {deleted_count} activity log(s).",
                    "deleted_count": deleted_count,
                },
                status=status.HTTP_200_OK,
            )

        if purge_all:
            deleted_count, _ = AdminActivityLog.objects.all().delete()
            return Response(
                {
                    "detail": f"Successfully purged all {deleted_count} activity log(s).",
                    "deleted_count": deleted_count,
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "Please specify 'older_than_days', 'ids', or 'all=true' to delete activity logs."},
            status=status.HTTP_400_BAD_REQUEST,
        )


def create_download_response(request, asset):
    if asset.is_upcoming:
        ea_status = get_cached_early_access_status(asset, request)
        now = timezone.now()
        downloads_ready = (
            getattr(asset, "prebooking_downloads_unlocked", False)
            or (getattr(asset, "prebooking_download_unlock_at", None) and now >= asset.prebooking_download_unlock_at)
            or (asset.release_date and now >= asset.release_date)
            or ea_status["can_access_early"]
        )
        if not downloads_ready:
            unlock_time_str = ""
            if getattr(asset, "prebooking_download_unlock_at", None):
                unlock_time_str = f" on {asset.prebooking_download_unlock_at.strftime('%b %d, %Y at %I:%M %p')}"
            elif asset.release_date:
                unlock_time_str = f" on {asset.release_date.strftime('%b %d, %Y at %I:%M %p')}"

            return Response(
                {
                    "detail": f"This asset is currently in pre-release/pre-booking. Package download will unlock automatically{unlock_time_str}."
                },
                status=status.HTTP_403_FORBIDDEN,
            )

    # Check if user has an explicit BLOCKED order for this asset
    blocked_order = Order.objects.filter(user=request.user, asset=asset, status=Order.Status.BLOCKED).first()
    if blocked_order:
        reason_msg = f": {blocked_order.block_reason}" if blocked_order.block_reason else ""
        return Response(
            {
                "detail": f"Your download access to '{asset.title}' has been revoked/blocked by the store administrator{reason_msg}. Please contact support if you believe this is an error."
            },
            status=status.HTTP_403_FORBIDDEN,
        )

    allowed = (
        asset.is_free
        or user_has_special_access(request.user, asset)
        or Order.objects.filter(
            user=request.user,
            asset=asset,
            status__in=DOWNLOAD_READY_STATUSES,
            download_enabled=True,
        ).exists()
    )
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
@throttle_classes([DownloadRateThrottle])
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
    paid_orders = Order.objects.filter(Q(status=Order.Status.PAID) | Q(status=Order.Status.APPROVED))
    pending_orders = Order.objects.filter(status=Order.Status.PENDING)
    verification_orders = Order.objects.filter(status=Order.Status.VERIFICATION_PENDING)

    from django.db.models.functions import ExtractMonth
    current_year = timezone.now().year
    month_aggregates = (
        paid_orders.filter(created_at__year=current_year)
        .annotate(month=ExtractMonth("created_at"))
        .values("month")
        .annotate(revenue=Sum("amount"), count=Count("id"))
    )
    month_map = {m["month"]: {"revenue": float(m["revenue"] or 0), "sales": m["count"]} for m in month_aggregates}
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_sales = [
        {
            "month": months[i],
            "sales": month_map.get(i + 1, {}).get("sales", 0),
            "revenue": month_map.get(i + 1, {}).get("revenue", 0),
        }
        for i in range(12)
    ]

    return Response(
        {
            "total_users": User.objects.count(),
            "total_downloads": DownloadLog.objects.count(),
            "total_sales": paid_orders.aggregate(total=Sum("amount"))["total"] or 0,
            "latest_orders": OrderSerializer(Order.objects.select_related("asset", "user")[:8], many=True).data,
            "asset_count": Asset.objects.count(),
            "review_count": Review.objects.count(),
            "pending_orders": pending_orders.count(),
            "verification_pending_orders": verification_orders.count(),
            "featured_assets": Asset.objects.filter(is_featured=True).count(),
            "free_assets": Asset.objects.filter(is_free=True).count(),
            "premium_assets": Asset.objects.filter(is_free=False).count(),
            "monthly_sales": monthly_sales,
        }
    )


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def site_settings(request):
    data = SiteSettingSerializer(SiteSetting.load()).data
    if not (request.user and request.user.is_authenticated and request.user.is_staff):
        data.pop("maintenance_bypass_token", None)
    return Response(data)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def community_stats(request):
    total_users = User.objects.count()
    thirty_days_ago = timezone.now() - timedelta(days=30)
    monthly_new_users = User.objects.filter(date_joined__gte=thirty_days_ago).count()

    logged_downloads = DownloadLog.objects.count()
    asset_downloads = Asset.objects.aggregate(total=Sum("download_count"))["total"] or 0
    total_downloads = logged_downloads + asset_downloads
    monthly_downloads = DownloadLog.objects.filter(downloaded_at__gte=thirty_days_ago).count()

    total_addons = Asset.objects.filter(is_published=True).count()
    review_qs = Review.objects.filter(is_approved=True)
    review_count = review_qs.count()
    avg_rating_val = review_qs.aggregate(avg=Avg("rating"))["avg"]
    avg_rating = round(float(avg_rating_val), 1) if avg_rating_val is not None else 5.0

    return Response({
        "total_simmers": total_users,
        "monthly_new_simmers": monthly_new_users,
        "total_downloads": total_downloads,
        "monthly_downloads": monthly_downloads,
        "total_addons": total_addons,
        "review_count": review_count,
        "community_rating": avg_rating,
        "satisfaction_rate": 100,
    })


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def verify_maintenance_bypass(request):
    token = str(request.data.get("token") or "").strip()
    setting = SiteSetting.load()
    expected = (setting.maintenance_bypass_token or "").strip()
    if expected and token == expected:
        return Response({"valid": True})
    return Response({"valid": False, "detail": "Invalid or expired bypass key."}, status=status.HTTP_403_FORBIDDEN)


@api_view(["GET", "PATCH"])
@permission_classes([permissions.IsAdminUser])
def admin_settings(request):
    site_setting = SiteSetting.load()
    if request.method == "PATCH":
        before_popup = site_setting.popup_enabled
        before_maintenance = site_setting.maintenance_mode
        serializer = SiteSettingSerializer(site_setting, data=request.data.get("site", request.data), partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        site_setting = serializer.instance
        log_admin_activity(request, "Store settings edited", "SiteSetting", site_setting.id, "Updated store or maintenance settings")
        if before_popup != site_setting.popup_enabled:
            log_admin_activity(request, "Popup enabled" if site_setting.popup_enabled else "Popup disabled", "SiteSetting", site_setting.id, "Changed entrance popup status")
        if before_maintenance != site_setting.maintenance_mode:
            log_admin_activity(request, "Maintenance mode enabled" if site_setting.maintenance_mode else "Maintenance mode disabled", "SiteSetting", site_setting.id, "Changed maintenance mode status")
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


@csrf_exempt
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def cashfree_webhook(request):
    try:
        data = request.data
        cf_order_id = ""
        if isinstance(data, dict):
            cf_order_id = (
                data.get("data", {}).get("order", {}).get("order_id")
                or data.get("order_id")
                or data.get("orderId")
                or ""
            )
        if not cf_order_id:
            return Response({"status": "ignored", "detail": "No order_id in webhook payload"}, status=status.HTTP_200_OK)

        order = Order.objects.filter(provider_order_id=cf_order_id).first()
        if not order:
            return Response({"status": "ignored", "detail": f"Order {cf_order_id} not found"}, status=status.HTTP_200_OK)

        synced, error = sync_cashfree_order(order)
        return Response({"status": "processed", "order_id": order.id, "synced": synced, "order_status": order.status}, status=status.HTTP_200_OK)
    except Exception as exc:
        logger.exception("Cashfree webhook processing failed")
        return Response({"status": "error", "detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class AdminSpecialAccessLinkViewSet(viewsets.ModelViewSet):
    serializer_class = SpecialAccessInviteLinkSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = SpecialAccessInviteLink.objects.prefetch_related("granted_assets", "requests").order_by("-created_at")

    def perform_create(self, serializer):
        link = serializer.save(created_by=self.request.user)
        log_admin_activity(
            self.request,
            "Special access link created",
            "SpecialAccessInviteLink",
            link.id,
            f"Created special access invite link '{link.title}' ({link.mode})",
        )

    def perform_update(self, serializer):
        link = serializer.save()
        log_admin_activity(
            self.request,
            "Special access link updated",
            "SpecialAccessInviteLink",
            link.id,
            f"Updated special access invite link '{link.title}' (Active: {link.is_active})",
        )

    def perform_destroy(self, instance):
        link_id = instance.id
        title = instance.title
        instance.delete()
        log_admin_activity(
            self.request,
            "Special access link deleted",
            "SpecialAccessInviteLink",
            link_id,
            f"Deleted special access invite link '{title}'",
        )


class AdminSpecialAccessRequestViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SpecialAccessClaimRequestSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        qs = SpecialAccessClaimRequest.objects.select_related(
            "invite_link", "user", "user__special_access", "user__profile"
        ).prefetch_related("invite_link__granted_assets").order_by("-created_at")
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param.upper())
        link_id = self.request.query_params.get("invite_link")
        if link_id:
            qs = qs.filter(invite_link_id=link_id)
        return qs

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        claim_req = self.get_object()
        link = claim_req.invite_link
        target_user = claim_req.user

        is_all_access = request.data.get("is_all_access_free", link.is_all_access_free)
        granted_asset_ids = request.data.get("granted_asset_ids")
        expires_at = request.data.get("expires_at", link.access_expires_at)
        admin_note = request.data.get("admin_note")
        send_email = request.data.get("send_email_notification", True)

        special_access, _ = UserSpecialAccess.objects.get_or_create(user=target_user)
        special_access.is_all_access_free = bool(is_all_access)
        if expires_at is not None:
            special_access.expires_at = expires_at or None
        if admin_note is not None:
            special_access.admin_note = str(admin_note).strip()
        elif not special_access.admin_note:
            special_access.admin_note = f"Approved via invite link: {link.title}"
        special_access.save()

        if granted_asset_ids is not None and isinstance(granted_asset_ids, list):
            special_access.granted_assets.set(Asset.objects.filter(id__in=granted_asset_ids))
        else:
            for asset_item in link.granted_assets.all():
                special_access.granted_assets.add(asset_item)

        was_already_approved = claim_req.status == SpecialAccessClaimRequest.Status.APPROVED
        claim_req.status = SpecialAccessClaimRequest.Status.APPROVED
        if admin_note is not None:
            claim_req.admin_note = str(admin_note).strip()
        claim_req.reviewed_by = request.user
        claim_req.reviewed_at = timezone.now()
        claim_req.save()

        if not was_already_approved:
            link.uses_count = (link.uses_count or 0) + 1
            link.save(update_fields=["uses_count"])

        email_status = None
        if send_email and target_user.email:
            sent, err = send_special_access_email(target_user, special_access)
            email_status = {
                "sent": sent,
                "recipient": target_user.email,
                "message": f"Special access email sent to {target_user.email}." if sent else None,
                "error": err if not sent else None,
            }

        log_admin_activity(
            request,
            "Special access request approved",
            "SpecialAccessClaimRequest",
            claim_req.id,
            f"Approved special access request for {target_user.username} via link '{link.title}'",
        )

        data = SpecialAccessClaimRequestSerializer(claim_req, context={"request": request}).data
        if email_status:
            data["email_status"] = email_status
        return Response(data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        claim_req = self.get_object()
        admin_note = request.data.get("admin_note", "")
        claim_req.status = SpecialAccessClaimRequest.Status.REJECTED
        if admin_note:
            claim_req.admin_note = str(admin_note).strip()
        claim_req.reviewed_by = request.user
        claim_req.reviewed_at = timezone.now()
        claim_req.save()

        log_admin_activity(
            request,
            "Special access request rejected",
            "SpecialAccessClaimRequest",
            claim_req.id,
            f"Rejected special access request for {claim_req.user.username}",
        )
        return Response(
            SpecialAccessClaimRequestSerializer(claim_req, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def special_access_link_detail(request, token):
    link = SpecialAccessInviteLink.objects.prefetch_related("granted_assets").filter(token=token).first()
    if not link:
        return Response(
            {"detail": "This Special Access invite link was not found or has been removed."},
            status=status.HTTP_404_NOT_FOUND,
        )

    invalid_reason = None
    if not link.is_active:
        invalid_reason = "This Special Access link has been deactivated by the administrator."
    elif link.is_expired():
        invalid_reason = "This Special Access link has expired."
    elif link.is_exhausted():
        invalid_reason = "This Special Access link has reached its maximum number of uses."

    my_request_data = None
    has_active_access = False
    if request.user and request.user.is_authenticated:
        existing = SpecialAccessClaimRequest.objects.filter(invite_link=link, user=request.user).first()
        if existing:
            my_request_data = {
                "id": existing.id,
                "status": existing.status,
                "user_note": existing.user_note,
                "created_at": existing.created_at,
                "reviewed_at": existing.reviewed_at,
            }
        sa = getattr(request.user, "special_access", None)
        if sa and sa.is_active():
            has_active_access = True

    return Response(
        {
            "id": link.id,
            "token": link.token,
            "title": link.title,
            "mode": link.mode,
            "is_all_access_free": link.is_all_access_free,
            "granted_asset_titles": list(link.granted_assets.values_list("title", flat=True)),
            "access_expires_at": link.access_expires_at,
            "link_expires_at": link.link_expires_at,
            "max_uses": link.max_uses,
            "uses_count": link.uses_count,
            "is_valid": link.is_valid(),
            "invalid_reason": invalid_reason,
            "my_request": my_request_data,
            "user_has_active_special_access": has_active_access,
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def special_access_link_claim(request, token):
    link = SpecialAccessInviteLink.objects.prefetch_related("granted_assets").filter(token=token).first()
    if not link:
        return Response(
            {"detail": "This Special Access invite link was not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    existing = SpecialAccessClaimRequest.objects.filter(invite_link=link, user=request.user).first()
    if existing and existing.status == SpecialAccessClaimRequest.Status.APPROVED:
        return Response(
            {
                "status": "APPROVED",
                "detail": "🎉 You have already claimed and unlocked VIP Special Access from this link!",
                "my_request": {
                    "id": existing.id,
                    "status": existing.status,
                    "user_note": existing.user_note,
                    "created_at": existing.created_at,
                    "reviewed_at": existing.reviewed_at,
                },
            },
            status=status.HTTP_200_OK,
        )

    if not link.is_active:
        return Response(
            {"detail": "This Special Access link has been deactivated by the administrator."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if link.is_expired():
        return Response(
            {"detail": "This Special Access link has expired."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if link.is_exhausted():
        return Response(
            {"detail": "This Special Access link has reached its maximum number of claims."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user_note = str(request.data.get("user_note") or "").strip()[:300]

    if link.mode == SpecialAccessInviteLink.Mode.AUTO_GRANT:
        special_access, _ = UserSpecialAccess.objects.get_or_create(user=request.user)
        if link.is_all_access_free:
            special_access.is_all_access_free = True
        if link.access_expires_at:
            special_access.expires_at = link.access_expires_at
        if not special_access.admin_note:
            special_access.admin_note = f"Auto-claimed via invite link: {link.title}"
        special_access.save()

        for asset_item in link.granted_assets.all():
            special_access.granted_assets.add(asset_item)

        claim_req, _ = SpecialAccessClaimRequest.objects.update_or_create(
            invite_link=link,
            user=request.user,
            defaults={
                "user_note": user_note,
                "status": SpecialAccessClaimRequest.Status.APPROVED,
                "reviewed_at": timezone.now(),
            },
        )
        link.uses_count = (link.uses_count or 0) + 1
        link.save(update_fields=["uses_count"])

        if request.user.email:
            send_special_access_email(request.user, special_access)

        log_admin_activity(
            request,
            "Special access claimed via link",
            "User",
            request.user.id,
            f"User {request.user.username} auto-claimed special access via link '{link.title}'",
        )

        return Response(
            {
                "status": "APPROVED",
                "detail": "🎉 VIP Special Access has been activated on your account! You can now download your unlocked train packs for free.",
                "my_request": {
                    "id": claim_req.id,
                    "status": claim_req.status,
                    "user_note": claim_req.user_note,
                    "created_at": claim_req.created_at,
                    "reviewed_at": claim_req.reviewed_at,
                },
            },
            status=status.HTTP_200_OK,
        )

    claim_req, _ = SpecialAccessClaimRequest.objects.update_or_create(
        invite_link=link,
        user=request.user,
        defaults={
            "user_note": user_note,
            "status": SpecialAccessClaimRequest.Status.PENDING,
        },
    )

    log_admin_activity(
        request,
        "Special access requested via link",
        "User",
        request.user.id,
        f"User {request.user.username} requested special access via link '{link.title}'",
    )

    return Response(
        {
            "status": "PENDING",
            "detail": "✅ Your Special Access request has been submitted! Once the admin approves your request, your VIP access will be unlocked and you will receive an email confirmation.",
            "my_request": {
                "id": claim_req.id,
                "status": claim_req.status,
                "user_note": claim_req.user_note,
                "created_at": claim_req.created_at,
                "reviewed_at": claim_req.reviewed_at,
            },
        },
        status=status.HTTP_200_OK,
    )


