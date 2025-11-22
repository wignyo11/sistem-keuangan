# File: config/urls.py
# (VERSI FINAL - Dengan Gerbang Login & Registrasi)

from django.contrib import admin
from django.urls import path, include
from accounting.views import index # Import view tadi
from django.urls import re_path

# --- Import "Gerbang" Login Kustom & Refresh JWT ---
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import MyTokenObtainPairView # <-- Import "Gerbang" Kustom kita
# --- BATAS IMPORT ---

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # --- URL "BENTENG" ---
    
    # 1. URL untuk Login (Dapetin Token)
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    
    # 2. URL untuk Refresh Token
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # 3. URL untuk Registrasi (dari app 'users' kita)
    path('api/users/', include('users.urls')),
    
    # --- URL AKUNTANSI ---
    # Ini "nangkep" SEMUA URL lain (Laporan, Inventori, dll)
    # dari file accounting/urls.py
    path('api/', include('accounting.urls')),
    re_path(r'^.*$', index),
]