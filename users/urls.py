# File: users/urls.py
# (VERSI FINAL)

from django.urls import path
from .views import RegisterView

urlpatterns = [
    # Cuma nanganin registrasi (yang udah dikunci buat Admin)
    path('register/', RegisterView.as_view(), name='auth_register'),
]