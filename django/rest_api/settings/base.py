from datetime import timedelta
from pathlib import Path

import environ, os
env = environ.Env()

# Build paths inside the project like this: BASE_DIR / 'subdir'.
ROOT_DIR = Path(__file__).resolve().parent.parent.parent

APP_DIR = ROOT_DIR / "core_apps"

DEBUG = env.bool("DJANGO_DEBUG", False)
# Application definition

DJANGO_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "corsheaders",
    "rest_framework.authtoken",
    "rest_framework_simplejwt.token_blacklist",
    "dj_rest_auth",
]

LOCAL_APPS = [
    "core_apps.common",
    "core_apps.users",
    "core_apps.konfiguration",
    "core_apps.backup",
    "core_apps.mitglieder",
    "core_apps.modul_konfiguration",
    "core_apps.fmd",
    "core_apps.news",
    "core_apps.inventar",
    "core_apps.atemschutz_masken",
    "core_apps.atemschutz_geraete",
    "core_apps.messgeraete",
    "core_apps.pdf",
    "core_apps.fahrzeuge",
    "core_apps.verwaltung",
    "core_apps.einsatzberichte",
    "core_apps.anwesenheitsliste",
    "core_apps.jugend",
    "core_apps.wartung_service",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

MIDDLEWARE = [
    "rest_api.settings.middleware.APICacheControlMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "rest_api.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "rest_api.wsgi.application"


# Database
# https://docs.djangoproject.com/en/4.1/ref/settings/#databases

DATABASES = {"default": env.db("DATABASE_URL")}

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.BCryptSHA256PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
]

# Password validation
# https://docs.djangoproject.com/en/4.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]


# Internationalization
# https://docs.djangoproject.com/en/4.1/topics/i18n/

LANGUAGE_CODE = "de-AT"

TIME_ZONE = "Europe/Vienna"

USE_I18N = True

USE_TZ = True

API_URL = env("DJANGO_API_URL")
API_URL_PREFIX = f"/{str(API_URL).strip('/')}/"
JWT_REFRESH_COOKIE_PATH = f"{API_URL_PREFIX}auth/token/refresh/"


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/4.1/howto/static-files/

MEDIA_URL = "/" + API_URL + "files/"
MEDIA_ROOT = os.path.join(ROOT_DIR, "mediafiles")

DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'

# Default primary key field type
# https://docs.djangoproject.com/en/4.1/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_URLS_REGEX = r"^api/.*$"

AUTH_USER_MODEL = "users.User"
ACCOUNT_ADAPTER = "core_apps.users.adapter.UserAdapter"

REST_FRAMEWORK = {
    'DATE_FORMAT': '%d.%m.%Y',
    'DATE_INPUT_FORMATS': ['%d.%m.%Y', 'iso-8601'],
    'DATETIME_FORMAT': '%d.%m.%YT%H:%M:%S',
    'DATETIME_INPUT_FORMATS': ['%d.%m.%YT%H:%M:%S', 'iso-8601'],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "dj_rest_auth.jwt_auth.JWTCookieAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.ScopedRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "dj_rest_auth": "10/min",          # Login / auth endpoints
        "public_pin_verify": "5/min",  # z.B. 5 pro Minute pro IP
    },
}

REST_AUTH = {
    "USE_JWT": True,
    "SESSION_LOGIN": False,
    "JWT_AUTH_COOKIE": "app-access-token",
    "JWT_AUTH_REFRESH_COOKIE": "app-refresh-token",
    "JWT_AUTH_REFRESH_COOKIE_PATH": JWT_REFRESH_COOKIE_PATH,
    "JWT_AUTH_SECURE": not DEBUG,
    "JWT_AUTH_HTTPONLY": True,
    "JWT_AUTH_SAMESITE": "Lax",
    "JWT_AUTH_RETURN_EXPIRATION": True,
    "JWT_AUTH_COOKIE_USE_CSRF": True,
    "JWT_AUTH_COOKIE_ENFORCE_CSRF_ON_UNAUTHENTICATED": True,
    "USER_DETAILS_SERIALIZER": "core_apps.users.serializers.UserDetailSerializer",
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
]

ACCOUNT_EMAIL_VERIFICATION = "none"
ACCOUNT_AUTHENTICATION_METHOD = "username"

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "%(levelname)s %(name)-12s %(asctime)s %(module)s "
            "%(process)d %(thread)d %(message)s"
        }
    },
    "handlers": {
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        }
    },
    "root": {"level": "INFO", "handlers": ["console"]},
}

PUBLIC_FAHRZEUG_PIN = env("PUBLIC_FAHRZEUG_PIN")
PUBLIC_PIN_ENABLED = bool(PUBLIC_FAHRZEUG_PIN)

BLAULICHTSMS_API_URL = env.str("BLAULICHTSMS_API_URL", default="")

# Email configuration
# Use "django.core.mail.backends.smtp.EmailBackend" in production
# Use "django.core.mail.backends.console.EmailBackend" for local development
EMAIL_BACKEND = env("DJANGO_EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
EMAIL_HOST = env("DJANGO_EMAIL_HOST", default="")
EMAIL_PORT = env.int("DJANGO_EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("DJANGO_EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("DJANGO_EMAIL_HOST_USER", default="")
EMAIL_HOST_PASSWORD = env("DJANGO_EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DJANGO_DEFAULT_FROM_EMAIL", default="noreply@blaulichtcloud.at")
EMAIL_TIMEOUT = env.int("DJANGO_EMAIL_TIMEOUT", default=10)
BLAULICHTSMS_DASHBOARD_SESSION_ID = env.str(
    "BLAULICHTSMS_DASHBOARD_SESSION_ID",
    default=env.str("BLAULICHTSMS_DASHBOARD_SESSIONID", default=""),
)
BLAULICHTSMS_TIMEOUT = env.int("BLAULICHTSMS_TIMEOUT", default=10)
