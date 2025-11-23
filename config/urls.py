# File: config/urls.py
# (VERSI FINAL & CORRECTED)

from django.contrib import admin
from django.urls import path, include, re_path # <-- WAJIB ADA re_path
from accounting.views import index # <-- WAJIB ADA (Pastikan view ini ada di accounting/views.py)

# --- Import "Gerbang" Login Kustom & Refresh JWT ---
from rest_framework_simplejwt.views import TokenRefreshView
from users.views import MyTokenObtainPairView 
# --- BATAS IMPORT ---

urlpatterns = [
    # 1. Admin
    path('admin/', admin.site.urls),
    
    # 2. Auth (Login & Refresh)
    path('api/token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # 3. Registrasi User
    path('api/users/', include('users.urls')),
    
    # 4. API Akuntansi Utama
    path('api/', include('accounting.urls')),

    # ============================================================
    # INI YANG HILANG KEMAREN (WAJIB PALING BAWAH):
    # ============================================================
    # Tangkap semua URL sisa dan lempar ke Frontend React (index.html)
    re_path(r'^.*$', index), 
]