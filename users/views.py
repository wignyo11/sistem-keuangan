# File: users/views.py
# (Ganti isinya)

from django.contrib.auth.models import User
from .serializers import RegisterSerializer,  MyTokenObtainPairSerializer
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, IsAdminUser 
from rest_framework_simplejwt.views import TokenObtainPairView 

class RegisterView(generics.CreateAPIView):
    """
    API endpoint untuk mendaftarkan user baru.
    (Hanya bisa diakses oleh Admin)
    """
    queryset = User.objects.all()
    
    # --- INI "BENTENG" YANG LO MINTA ---
    # Dia ngecek 2 hal: 
    # 1. Lo udah login (IsAuthenticated)?
    # 2. Lo Admin (IsAdminUser)?
    permission_classes = (IsAuthenticated, IsAdminUser,) 
    # --- BATAS "BENTENG" ---
    
    serializer_class = RegisterSerializer

class MyTokenObtainPairView(TokenObtainPairView):
    """
    View "Gerbang" Login kustom,
    yang nyuruh Django pake "Kunci" kustom kita.
    """
    serializer_class = MyTokenObtainPairSerializer