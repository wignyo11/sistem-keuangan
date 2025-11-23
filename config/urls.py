# File: config/urls.py
# (VERSI FINAL - Dengan Gerbang Login & Registrasi)

from django.contrib import admin
from django.urls import path, include
from accounting.views import index # Import view tadi
from django.urls import re_path
from accounting.views import index
# --- Import "Gerbang" Login Kustom & Refresh JWT ---
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import MyTokenObtainPairView # <-- Import "Gerbang" Kustom kita
# --- BATAS IMPORT ---

urlpatterns = [
    # --- 1. JALUR ADMIN (PRIORITAS UTAMA) ---
    path('admin/', admin.site.urls),

    # --- 2. JALUR API (PRIORITAS KEDUA) ---
    path('api/', include('accounting.urls')),
    # path('api/users/', include('users.urls')), # Kalau ada app users

    # --- 3. JALUR REACT (PENAMPUNG TERAKHIR / CATCH-ALL) ---
    # Taruh ini PALING BAWAH. Jangan ada path lain di bawah baris ini.
    re_path(r'^.*$', index), 
]