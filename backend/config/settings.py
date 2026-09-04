from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent
env = environ.Env(DEBUG=(bool, False))
environ.Env.read_env(BASE_DIR.parent / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-only-change-me")
DEBUG = env.bool("DJANGO_DEBUG", default=True)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=[])

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "cloudinary",
    "cloudinary_storage",
    "store",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": [
            "django.template.context_processors.debug",
            "django.template.context_processors.request",
            "django.contrib.auth.context_processors.auth",
            "django.contrib.messages.context_processors.messages",
        ]},
    }
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {"default": env.db("DATABASE_URL", default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}")}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=not DEBUG)
SESSION_COOKIE_SECURE = env.bool("SESSION_COOKIE_SECURE", default=not DEBUG)
CSRF_COOKIE_SECURE = env.bool("CSRF_COOKIE_SECURE", default=not DEBUG)
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=31536000 if not DEBUG else 0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", default=not DEBUG)
SECURE_HSTS_PRELOAD = env.bool("SECURE_HSTS_PRELOAD", default=False)
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8081"],
)
CORS_EXPOSE_HEADERS = ["Content-Disposition"]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("rest_framework_simplejwt.authentication.JWTAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticatedOrReadOnly",),
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.UserRateThrottle",
        "rest_framework.throttling.AnonRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "user": env("DRF_USER_THROTTLE_RATE", default="5000/day"),
        "anon": env("DRF_ANON_THROTTLE_RATE", default="1000/hour"),
        "downloads": env("DRF_DOWNLOAD_THROTTLE_RATE", default="20/hour"),
    },
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "SIGNING_KEY": env("JWT_SECRET_KEY", default=SECRET_KEY),
}

GOOGLE_OAUTH_CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID", default="")
CASHFREE_CLIENT_ID = env("CASHFREE_CLIENT_ID", default="")
CASHFREE_CLIENT_SECRET = env("CASHFREE_CLIENT_SECRET", default="")
CASHFREE_ENVIRONMENT = env("CASHFREE_ENVIRONMENT", default="sandbox").lower()
CASHFREE_API_VERSION = env("CASHFREE_API_VERSION", default="2023-08-01")
CASHFREE_RETURN_URL = env("CASHFREE_RETURN_URL", default="http://localhost:3000/dashboard/purchases")
CASHFREE_CUSTOMER_PHONE_FALLBACK = env("CASHFREE_CUSTOMER_PHONE_FALLBACK", default="9999999999")
STRIPE_SECRET_KEY = env("STRIPE_SECRET_KEY", default="")
MANUAL_UPI_ID = env("MANUAL_UPI_ID", default="")
MANUAL_UPI_PAYEE_NAME = env("MANUAL_UPI_PAYEE_NAME", default="MSTS-GJS Production Store")
CLOUDINARY_URL = env("CLOUDINARY_URL", default="")
CLOUDINARY_CONFIGURED = bool(CLOUDINARY_URL)
PRIVATE_DOWNLOAD_BUCKET = env("PRIVATE_DOWNLOAD_BUCKET", default=env("AWS_STORAGE_BUCKET_NAME", default=""))
PRIVATE_DOWNLOAD_REGION = env("PRIVATE_DOWNLOAD_REGION", default=env("AWS_S3_REGION_NAME", default="auto"))
PRIVATE_DOWNLOAD_ENDPOINT_URL = env("PRIVATE_DOWNLOAD_ENDPOINT_URL", default=env("AWS_S3_ENDPOINT_URL", default=""))
PRIVATE_DOWNLOAD_ACCESS_KEY_ID = env("PRIVATE_DOWNLOAD_ACCESS_KEY_ID", default=env("AWS_ACCESS_KEY_ID", default=""))
PRIVATE_DOWNLOAD_SECRET_ACCESS_KEY = env("PRIVATE_DOWNLOAD_SECRET_ACCESS_KEY", default=env("AWS_SECRET_ACCESS_KEY", default=""))
PRIVATE_DOWNLOAD_URL_EXPIRE_SECONDS = env.int("PRIVATE_DOWNLOAD_URL_EXPIRE_SECONDS", default=300)
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON = env("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON", default="")
GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_BASE64 = env("GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON_BASE64", default="")

if CLOUDINARY_CONFIGURED:
    DEFAULT_FILE_STORAGE = "cloudinary_storage.storage.MediaCloudinaryStorage"
    STORAGES = {
        "default": {
            "BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

# Email Configuration (Free SMTP - Gmail, Brevo, Resend, or Console for local development)
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.smtp.EmailBackend"
    if env("EMAIL_HOST_USER", default="")
    else "django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="MSTS-GJS Store <noreply@msts-gjs.com>")

