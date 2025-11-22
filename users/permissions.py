# File: users/permissions.py
# (File BARU - "Satpam" Departemen kita)

from rest_framework.permissions import BasePermission

# Cek: "Apa user ini Pemilik?"
class IsOwner(BasePermission):
    def has_permission(self, request, view):
        # 'is_superuser' (admin) OTOMATIS dapet akses
        return request.user.groups.filter(name='Owner').exists() or request.user.is_superuser

# Cek: "Apa user ini Akuntan?"
class IsAccountant(BasePermission):
    def has_permission(self, request, view):
        return request.user.groups.filter(name='Akuntan').exists() or request.user.is_superuser

# Cek: "Apa user ini Staf Penjualan?"
class IsSales(BasePermission):
    def has_permission(self, request, view):
        return request.user.groups.filter(name='Staf Penjualan').exists() or request.user.is_superuser

# Cek: "Apa user ini Staf Pembelian?"
class IsPurchasing(BasePermission):
    def has_permission(self, request, view):
        return request.user.groups.filter(name='Staf Pembelian').exists() or request.user.is_superuser