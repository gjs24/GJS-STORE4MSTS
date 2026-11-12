from rest_framework.throttling import SimpleRateThrottle, UserRateThrottle


class _ClientIdentRateThrottle(SimpleRateThrottle):
    """Per-user (when authenticated) or per-IP rate limiter for sensitive endpoints."""

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f"user:{request.user.pk}"
        else:
            ident = f"ip:{self.get_ident(request)}"
        return self.cache_format % {"scope": self.scope, "ident": ident}


class DownloadRateThrottle(UserRateThrottle):
    scope = "downloads"


class AuthRateThrottle(_ClientIdentRateThrottle):
    scope = "auth"


class OTPRateThrottle(_ClientIdentRateThrottle):
    scope = "otp"


class StrictSecurityThrottle(_ClientIdentRateThrottle):
    scope = "security"


class PaymentRateThrottle(_ClientIdentRateThrottle):
    scope = "payment"
