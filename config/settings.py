# File: config/settings.py
# (VERSI FINAL DEPLOYMENT - WAJIB PAKE INI DI RAILWAY)

from pathlib import Path
import os
import dj_database_url  # <--- WAJIB: Buat konek ke Postgres Railway

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-dhkm86@$xf4$v2kdt)os+ttll_zt2d(p4!tni5$l$&q&586qha'

# Ubah ke False kalau mau beneran aman, tapi True dulu gpp buat debugging
DEBUG = True

# WAJIB: Biar bisa dibuka dari domain Railway
ALLOWED_HOSTS = ['*']

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Library pihak ketiga
    'rest_framework',
    'corsheaders',
    'django_filters',
    'rest_framework_simplejwt',

    # Aplikasi kita
    'accounting',
    'users'
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # WAJIB: WhiteNoise harus di sini buat nampilin React
    'whitenoise.middleware.WhiteNoiseMiddleware', 
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        # WAJIB: Kasih tau Django posisi file index.html React
        'DIRS': [
            BASE_DIR / 'frontend-keuangan/dist', 
        ],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


# Database
# KONFIGURASI DATABASE CERDAS:
# Kalau di Railway -> Pake Postgres (Baca variabel DATABASE_URL)
# Kalau di Laptop -> Pake SQLite
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600
    )
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    { 'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator', },
    { 'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator', },
]


# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# WAJIB: Django nyari file statis React di sini
STATICFILES_DIRS = [
    BASE_DIR / 'frontend-keuangan/dist', 
]

# WAJIB: Kompresi biar ngebut
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ===================================================
# KONFIGURASI API & SECURITY
# ===================================================

CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Tambahkan Domain Railway lo di sini biar login aman (Ganti link-nya sesuai punya lo)
CSRF_TRUSTED_ORIGINS = [
    'https://equilib-system-atma.up.railway.app',
]

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated', 
    ),
}

from datetime import timedelta

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60), 
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}