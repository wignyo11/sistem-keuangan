# File: config/middleware.py

from django.utils.deprecation import MiddlewareMixin

class DisableCSRFOnAPI(MiddlewareMixin):
    """
    Middleware sakti untuk mematikan pemeriksaan CSRF
    KHUSUS untuk semua alamat yang depannya '/api/'.
    Ini solusi ampuh buat konflik cookie admin vs JWT.
    """
    def process_request(self, request):
        if request.path.startswith('/api/'):
            # Tandai request ini biar gak diperiksa CSRF-nya
            setattr(request, '_dont_enforce_csrf_checks', True)