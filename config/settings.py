# File: config/settings.py
# (VERSI FINAL DEPLOYMENT - Sudah Support Railway & React)

from pathlib import Path
import os
import dj_database_url # <--- Tambahan buat Database Railway

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
# (Nanti di Railway bisa diganti via Environment Variables, tapi ini aman buat sekarang)
SECRET_KEY = 'django-insecure-dhkm86@$xf4$v2kdt)os+ttll_zt2d(p4!tni5$l$&q&586qha'

# SECURITY WARNING: don't run with debug turned on in production!
# Set ke True untuk memudahkan debugging awal, nanti ganti False kalau sudah stabil
DEBUG = True

# Izinkan akses dari mana saja (Railway butuh ini)
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
    # --- PENTING: WhiteNoise harus tepat di bawah SecurityMiddleware ---
    'whitenoise.middleware.WhiteNoiseMiddleware', 
    # -----------------------------------------------------------------
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
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases

# KONFIGURASI DATABASE CERDAS:
# Kalau di Laptop -> Pake SQLite
# Kalau di Railway -> Pake PostgreSQL (Otomatis dideteksi)
DATABASES = {
    'default': dj_database_url.config(
        default=f'sqlite:///{BASE_DIR / "db.sqlite3"}',
        conn_max_age=600
    )
}


# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i1n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# --- INTEGRASI REACT (PENTING) ---
# Django akan mencari file hasil build React di folder ini
STATICFILES_DIRS = [
    BASE_DIR / 'frontend-keuangan/dist', 
]

# Aktifkan kompresi agar website ngebut
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'


# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ===================================================
# KONFIGURASI API & CORS
# ===================================================

# Izinkan frontend (React di localhost:5173) untuk development lokal
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # Nanti kalau sudah deploy, tambahkan domain Railway di sini jika perlu
    # Tapi karena kita serve satu domain (monolith), biasanya aman.
]

# Kalau masih error CORS di production, uncomment baris ini (opsional berbahaya):
# CORS_ALLOW_ALL_ORIGINS = True 

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
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60), # Diperpanjang jadi 60 menit biar ga sering logout pas demo
    "REFRESH_TOKEN_LIFETIME": timedelta(days=1),
    
    "AUTH_HEADER_TYPES": ("Bearer",),
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",
    "USER_ID_FIELD": "id",
    "USER_ID_CLAIM": "user_id",
}