"""
Settings for Rajat Shetty's portfolio: a single page, no database, no admin.

Environment variables (locally from .env, on Vercel from Project Settings >
Environment Variables): DJANGO_SECRET_KEY, DJANGO_DEBUG, DJANGO_ALLOWED_HOSTS,
CONTACT_EMAIL, GITHUB_URL.
"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

if not os.environ.get("VERCEL"):
    try:
        from dotenv import load_dotenv

        load_dotenv(BASE_DIR / ".env")
    except ImportError:
        pass


def env_bool(name, default=False):
    return os.environ.get(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name, default=""):
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


ON_VERCEL = bool(os.environ.get("VERCEL"))
DEBUG = env_bool("DJANGO_DEBUG", default=not ON_VERCEL)

# Nothing is signed or stored, but Django still requires a key.
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY") or "portfolio-static-site-no-secrets-stored"

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]")
if ON_VERCEL:
    ALLOWED_HOSTS.append(".vercel.app")

INSTALLED_APPS = [
    "whitenoise.runserver_nostatic",
    "django.contrib.staticfiles",
    "core",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "portfolio.urls"
WSGI_APPLICATION = "portfolio.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
    },
]

DATABASES = {}  # no database

LANGUAGE_CODE = "en-gb"
TIME_ZONE = "Asia/Kolkata"
USE_I18N = False
USE_TZ = True

# Static files: hashed names so browsers and the Vercel CDN cache them for a year.
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STORAGES = {
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"
        if DEBUG
        else "whitenoise.storage.CompressedManifestStaticFilesStorage"
    },
}
WHITENOISE_MAX_AGE = 31536000

CONTACT_EMAIL = os.environ.get("CONTACT_EMAIL", "rajat.b.shetty@gmail.com")
GITHUB_URL = os.environ.get("GITHUB_URL", "https://github.com/RajatBS")

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SECURE_SSL_REDIRECT = env_bool("DJANGO_SSL_REDIRECT", True)
    SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_HSTS_SECONDS", "31536000"))
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
    X_FRAME_OPTIONS = "DENY"
