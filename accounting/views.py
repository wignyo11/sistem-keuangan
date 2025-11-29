# accounting/views.py

from rest_framework import viewsets
from .models import Account, JournalEntry, JournalItem, InventoryItem, InventoryLog, Contact, FixedAsset
from .serializers import AccountSerializer, JournalEntrySerializer, JournalItemSerializer, SalesShortcutSerializer, PurchaseShortcutSerializer, InventoryItemSerializer, InventoryPurchaseSerializer, ContactSerializer,FixedAssetSerializer, SalesInvoiceSerializer, ReceivePaymentSerializer, MakePaymentSerializer
from django_filters.rest_framework import FilterSet
import django_filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from decimal import Decimal
from django.db.models import Sum, Q 
from datetime import date
from dateutil.relativedelta import relativedelta
from rest_framework.permissions import IsAuthenticated
from users.permissions import IsOwner, IsAccountant, IsSales, IsPurchasing
from django.shortcuts import render
from .serializers import SalesReturnSerializer
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_exempt 
from django.utils.decorators import method_decorator



class AccountViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsSales | IsPurchasing]
    queryset = Account.objects.all().order_by('number')
    serializer_class = AccountSerializer

class JournalEntryViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsSales]
    queryset = JournalEntry.objects.all().order_by('-date')
    serializer_class = JournalEntrySerializer

class JournalItemFilter(FilterSet):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant]
    start_date = django_filters.DateFilter(field_name="journal_entry__date", lookup_expr='gte')
    end_date = django_filters.DateFilter(field_name="journal_entry__date", lookup_expr='lte')

    class Meta:
        model = JournalItem
        fields = ['account', 'start_date', 'end_date']

class JournalItemViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant]
    queryset = JournalItem.objects.all().select_related('account', 'journal_entry').order_by('journal_entry__date')
    serializer_class = JournalItemSerializer
    filterset_class = JournalItemFilter

class InventoryItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsSales | IsPurchasing]
    """
    API endpoint untuk CRUD (buat, baca, update, hapus)
    daftar barang inventori (SKU).
    """
    queryset = InventoryItem.objects.all().order_by('name')
    serializer_class = InventoryItemSerializer

class ContactViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsSales | IsPurchasing]
    """
    API endpoint untuk CRUD (buat, baca, update, hapus)
    daftar Kontak (Customer/Vendor).
    """
    queryset = Contact.objects.all().order_by('name')
    serializer_class = ContactSerializer

class FixedAssetViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant]
    """
    API endpoint untuk CRUD (buat, baca, update, hapus)
    daftar Aset Tetap.
    """
    queryset = FixedAsset.objects.all().order_by('name')
    serializer_class = FixedAssetSerializer

class CreateSalesShortcutView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsSales]
    """
    Endpoint 'pintasan' kustom untuk membuat Jurnal Penjualan.
    (Versi UPGRADE - Sekarang mendukung Akrual (Tunai / Kredit))
    """
    
    def post(self, request, *args, **kwargs):
        serializer = SalesShortcutSerializer(data=request.data)
        
        # 1. Validasi input (sekarang termasuk 'tipe_pembayaran')
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        data = serializer.validated_data
        total = data['total']
        tipe_pembayaran = data['tipe_pembayaran'] # <-- Ambil data baru
        
        try:
            # 2. Ambil TIGA akun hard-code (WAJIB ADA)
            #    GANTI NOMOR AKUN JIKA BEDA
            akun_penjualan = Account.objects.get(number='4-1000') # Kredit
            akun_kas = Account.objects.get(number='1-1000')       # Debit jika Tunai
            akun_piutang = Account.objects.get(number='1-1100')    # Debit jika Kredit

        except Account.DoesNotExist as e:
            # Error jika salah satu akun di atas gak ada
            return Response(
                {"error": f"Akun default tidak ditemukan ({str(e)}). Harap buat Akun '1-1000' (Kas), '1-1100' (Piutang), dan '4-1000' (Penjualan) di Bagan Akun."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 3. LOGIKA AKRUAL (BARU)
        # Tentukan akun mana yang akan di-DEBIT berdasarkan tipe pembayaran
        if tipe_pembayaran == 'TUNAI':
            akun_debit = akun_kas
        else: # 'KREDIT'
            akun_debit = akun_piutang
        
        # 4. Buat Jurnal dalam satu transaksi
        try:
            with transaction.atomic():
                # Buat Jurnal Induk
                entry = JournalEntry.objects.create(
                    date=data['date'],
                    description=data['description']
                )
                
                # Buat Jurnal Item - DEBIT (Bisa Kas atau Piutang)
                JournalItem.objects.create(
                    journal_entry=entry,
                    account=akun_debit, # <-- Pakai variabel dinamis
                    debit=total,
                    credit=Decimal('0.0')
                )
                
                # Buat Jurnal Item - KREDIT (Selalu Pendapatan)
                JournalItem.objects.create(
                    journal_entry=entry,
                    account=akun_penjualan,
                    debit=Decimal('0.0'),
                    credit=total
                )
            
            # 5. Kirim balik data jurnal lengkap yang baru dibuat
            full_entry_data = JournalEntrySerializer(entry).data
            return Response(full_entry_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Gagal membuat jurnal: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CreatePurchaseShortcutView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsPurchasing]
    """
    Endpoint 'pintasan' kustom untuk membuat Jurnal Pembelian/Beban (Non-Inventori).
    (Versi UPGRADE - Vendor opsional, Keterangan manual)
    """
    
    def post(self, request, *args, **kwargs):
        serializer = PurchaseShortcutSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        data = serializer.validated_data
        total = data['total']
        tipe_pembayaran = data['tipe_pembayaran']
        contact_id = data.get('contact_id') # Bisa jadi None
        
        try:
            # 1. Ambil Akun-akun
            akun_beban = Account.objects.get(id=data['account_debit_id'])
            akun_kas = Account.objects.get(number='1-1000')
            akun_utang = Account.objects.get(number='2-1000')

        except Account.DoesNotExist as e:
            return Response(
                {"error": f"Akun default tidak ditemukan ({str(e)})."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # ... (Validasi akun beban, dll - biarkan saja)
        if akun_beban.type not in ['BEBAN', 'BEBAN_OPERASIONAL', 'BEBAN_LAIN']:
             return Response(
                {"error": "Akun yang dipilih bukan tipe akun Beban."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if tipe_pembayaran == 'TUNAI':
            akun_kredit = akun_kas
        else: # 'KREDIT'
            akun_kredit = akun_utang
        
        # --- LOGIKA KETERANGAN BARU ---
        if contact_id:
            # Kalo Vendor dipilih, kita cari namanya
            try:
                kontak = Contact.objects.get(id=contact_id)
                description = f"Beban {akun_beban.name} dari: {kontak.name}"
            except Contact.DoesNotExist:
                return Response(
                    {"error": f"Kontak (Vendor) dengan id={contact_id} tidak ditemukan."},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Kalo Vendor kosong, kita PASTIIN 'description' manual ada (udah divalidasi serializer)
            description = data.get('description')
        # --- BATAS LOGIKA BARU ---
            
        try:
            with transaction.atomic():
                entry = JournalEntry.objects.create(
                    date=data['date'],
                    description=description, # <-- Pakai deskripsi baru kita
                    contact_id=contact_id,   # <-- Bisa None atau ID Vendor
                )
                
                JournalItem.objects.create(
                    journal_entry=entry,
                    account=akun_beban,
                    debit=total,
                    credit=Decimal('0.0')
                )
                
                JournalItem.objects.create(
                    journal_entry=entry,
                    account=akun_kredit,
                    debit=Decimal('0.0'),
                    credit=total
                )
            
            full_entry_data = JournalEntrySerializer(entry).data
            return Response(full_entry_data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": f"Gagal membuat jurnal: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class IncomeStatementView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant]
    """
    API endpoint untuk Laporan Laba Rugi.
    Menerima 'start_date' dan 'end_date' via query params.
    Contoh: /api/reports/income-statement/?start_date=2025-11-01&end_date=2025-11-30
    """

    def get(self, request, *args, **kwargs):
        # 1. Ambil filter tanggal dari query params
        #    Jika tidak ada, set default (misal: tanggal 1 bulan ini s/d hari ini)
        today = date.today()
        start_date_str = request.query_params.get('start_date', today.replace(day=1).strftime('%Y-%m-%d'))
        end_date_str = request.query_params.get('end_date', today.strftime('%Y-%m-%d'))

        # 2. Ambil semua item jurnal dalam rentang tanggal
        items_in_range = JournalItem.objects.filter(
            journal_entry__date__range=[start_date_str, end_date_str]
        )

        # 3. Hitung Total Pendapatan
        #    Kita cari semua item yang akunnya bertipe 'PENDAPATAN'
        #    Total Pendapatan = total Kredit - total Debit
        pendapatan_data = items_in_range.filter(
            account__type='PENDAPATAN'
        ).aggregate(
            total_kredit=Sum('credit', default=Decimal('0.0')),
            total_debit=Sum('debit', default=Decimal('0.0'))
        )
        total_pendapatan = pendapatan_data['total_kredit'] - pendapatan_data['total_debit']

        # 4. Hitung Total Beban
        #    Kita cari semua item yang akunnya bertipe 'BEBAN' ATAU 'BEBAN_LAIN'
        #    Total Beban = total Debit - total Kredit
        beban_data = items_in_range.filter(
            Q(account__type='BEBAN') | Q(account__type='BEBAN_OPERASIONAL') | Q(account__type='BEBAN_LAIN')
        ).aggregate(
            total_kredit=Sum('credit', default=Decimal('0.0')),
            total_debit=Sum('debit', default=Decimal('0.0'))
        )
        total_beban = beban_data['total_debit'] - beban_data['total_kredit']

        # 5. Hitung Laba Bersih
        laba_bersih = total_pendapatan - total_beban

        # 6. Susun JSON response-nya
        response_data = {
            "laporan": "Laporan Laba Rugi",
            "periode": f"{start_date_str} s/d {end_date_str}",
            "pendapatan": {
                "total": total_pendapatan,
                "detail_akun": self.get_account_details(items_in_range, ['PENDAPATAN'])
            },
            "beban": {
                "total": total_beban,
                "detail_akun": self.get_account_details(items_in_range, ['BEBAN', 'BEBAN_OPERASIONAL', 'BEBAN_LAIN'])
            },
            "laba_bersih": laba_bersih
        }

        return Response(response_data, status=status.HTTP_200_OK)

    def get_account_details(self, queryset, account_types):
        """
        Fungsi helper untuk merinci total per akun.
        """
        # Ambil semua akun yang relevan
        accounts = Account.objects.filter(type__in=account_types)
        report_details = []

        for account in accounts:
            # Hitung total untuk akun ini
            account_items = queryset.filter(account=account)
            account_balance_data = account_items.aggregate(
                total_kredit=Sum('credit', default=Decimal('0.0')),
                total_debit=Sum('debit', default=Decimal('0.0'))
            )

            # Hitung saldo (sesuai saldo normal)
            if account.normal_balance == 'KREDIT': # (Pendapatan)
                balance = account_balance_data['total_kredit'] - account_balance_data['total_debit']
            else: # 'DEBIT' (Beban)
                balance = account_balance_data['total_debit'] - account_balance_data['total_kredit']

            # Hanya tampilkan jika ada saldo
            if balance != 0:
                report_details.append({
                    "nama_akun": account.name,
                    "nomor_akun": account.number,
                    "total": balance
                })
        return report_details

class BalanceSheetView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant]
    """
    API endpoint untuk Laporan Neraca (Balance Sheet).
    Menerima 'end_date' (atau 'as_of_date') via query params.
    Menghitung saldo akhir semua akun per tanggal tersebut.
    Contoh: /api/reports/balance-sheet/?end_date=2025-11-30
    """

    def get(self, request, *args, **kwargs):
        # 1. Ambil filter tanggal. Neraca hanya butuh 1 tanggal: "Per tanggal..."
        today = date.today()
        end_date_str = request.query_params.get('end_date', today.strftime('%Y-%m-%d'))

        try:
            # 2. Ambil SEMUA item jurnal DARI AWAL s/d tanggal akhir
            items_up_to_date = JournalItem.objects.filter(
                journal_entry__date__lte=end_date_str
            )

            # --- KALKULASI ASET ---
            aset_data = items_up_to_date.filter(
                account__type='ASET'
            ).aggregate(
                total_debit=Sum('debit', default=Decimal('0.0')),
                total_kredit=Sum('credit', default=Decimal('0.0'))
            )
            total_aset = aset_data['total_debit'] - aset_data['total_kredit']

            # --- KALKULASI LIABILITAS ---
            liabilitas_data = items_up_to_date.filter(
                account__type='LIABILITAS'
            ).aggregate(
                total_debit=Sum('debit', default=Decimal('0.0')),
                total_kredit=Sum('credit', default=Decimal('0.0'))
            )
            total_liabilitas = liabilitas_data['total_kredit'] - liabilitas_data['total_debit']

            # --- KALKULASI EKUITAS (BAGIAN 1: Akun Modal, Prive, dll) ---
            ekuitas_dasar_data = items_up_to_date.filter(
                account__type='EKUITAS'
            ).aggregate(
                total_debit=Sum('debit', default=Decimal('0.0')),
                total_kredit=Sum('credit', default=Decimal('0.0'))
            )
            total_ekuitas_dasar = ekuitas_dasar_data['total_kredit'] - ekuitas_dasar_data['total_debit']

            # --- KALKULASI EKUITAS (BAGIAN 2: Laba Ditahan) ---
            # (Total semua pendapatan - Total semua beban)

            # Total Pendapatan (Retained)
            pendapatan_retained_data = items_up_to_date.filter(
                account__type='PENDAPATAN'
            ).aggregate(
                total_kredit=Sum('credit', default=Decimal('0.0')),
                total_debit=Sum('debit', default=Decimal('0.0'))
            )
            total_pendapatan_retained = pendapatan_retained_data['total_kredit'] - pendapatan_retained_data['total_debit']

            # Total Beban (Retained)
            beban_retained_data = items_up_to_date.filter(
                Q(account__type='BEBAN') | Q(account__type='BEBAN_OPERASIONAL') | Q(account__type='BEBAN_LAIN')
            ).aggregate(
                total_kredit=Sum('credit', default=Decimal('0.0')),
                total_debit=Sum('debit', default=Decimal('0.0'))
            )
            total_beban_retained = beban_retained_data['total_debit'] - beban_retained_data['total_kredit']

            # Laba Ditahan (Profit/Loss dari dulu s/d end_date)
            laba_ditahan = total_pendapatan_retained - total_beban_retained

            # --- FINAL ---
            total_ekuitas = total_ekuitas_dasar + laba_ditahan
            total_liabilitas_plus_ekuitas = total_liabilitas + total_ekuitas

            # 6. Susun JSON response-nya
            response_data = {
                "laporan": "Laporan Neraca",
                "periode_per_tanggal": end_date_str,
                "aset": {
                    "total": total_aset,
                    "detail_akun": self.get_account_balance(items_up_to_date, ['ASET'])
                },
                "liabilitas": {
                    "total": total_liabilitas,
                    "detail_akun": self.get_account_balance(items_up_to_date, ['LIABILITAS'])
                },
                "ekuitas": {
                    "total": total_ekuitas,
                    "detail_akun": self.get_account_balance(items_up_to_date, ['EKUITAS']),
                    "laba_ditahan_semua_periode": laba_ditahan
                },
                "total_liabilitas_plus_ekuitas": total_liabilitas_plus_ekuitas,
                # Cek Keseimbangan
                "is_balanced": total_aset == total_liabilitas_plus_ekuitas
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Gagal memproses laporan: {str(e)}. Pastikan format tanggal YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )

    def get_account_balance(self, queryset, account_types):
        """
        Fungsi helper untuk merinci SALDO AKHIR per akun.
        Beda dari Laba Rugi (yg hitung 'total' periode), ini hitung 'saldo akhir'.
        """
        accounts = Account.objects.filter(type__in=account_types)
        report_details = []

        for account in accounts:
            account_items = queryset.filter(account=account)
            account_balance_data = account_items.aggregate(
                total_kredit=Sum('credit', default=Decimal('0.0')),
                total_debit=Sum('debit', default=Decimal('0.0'))
            )

            # Hitung saldo akhir (sesuai saldo normal)
            if account.normal_balance == 'KREDIT': # (Liabilitas, Ekuitas, Pendapatan)
                balance = account_balance_data['total_kredit'] - account_balance_data['total_debit']
            else: # 'DEBIT' (Aset, Beban)
                balance = account_balance_data['total_debit'] - account_balance_data['total_kredit']

            # Tampilkan, walaupun saldonya 0 (penting untuk Neraca)
            if balance != 0: # <-- Opsional: bisa dihapus jika ingin tampilkan akun saldo 0
                report_details.append({
                    "nama_akun": account.name,
                    "nomor_akun": account.number,
                    "saldo_akhir": balance
                })
        return report_details
    
class GeneralLedgerView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant]
    """
    API endpoint untuk Laporan Buku Besar (General Ledger).
    WAJIB menerima 'account_id', 'start_date', dan 'end_date' via query params.
    Contoh: /api/reports/general-ledger/?account_id=1&start_date=2025-11-01&end_date=2025-11-30
    """

    def get(self, request, *args, **kwargs):
        # 1. Ambil query params
        account_id = request.query_params.get('account_id')
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        # 2. Validasi Input (WAJIB ADA SEMUA)
        if not all([account_id, start_date_str, end_date_str]):
            return Response(
                {"error": "Parameter 'account_id', 'start_date', dan 'end_date' wajib diisi."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Ambil akun yang mau dicek
            account = Account.objects.get(id=account_id)
        except Account.DoesNotExist:
            return Response(
                {"error": f"Akun dengan id={account_id} tidak ditemukan."},
                status=status.HTTP_404_NOT_FOUND
            )

        # --- KALKULASI INTI ---
        try:
            # 3. Hitung Saldo Awal (Semua transaksi SEBELUM start_date)
            items_before_date = JournalItem.objects.filter(
                account=account,
                journal_entry__date__lt=start_date_str
            )
            saldo_awal_data = items_before_date.aggregate(
                total_debit=Sum('debit', default=Decimal('0.0')),
                total_kredit=Sum('credit', default=Decimal('0.0'))
            )

            # Hitung saldo awal berdasarkan Saldo Normal
            if account.normal_balance == 'KREDIT':
                saldo_awal = saldo_awal_data['total_kredit'] - saldo_awal_data['total_debit']
            else: # DEBIT
                saldo_awal = saldo_awal_data['total_debit'] - saldo_awal_data['total_kredit']

            # 4. Ambil Mutasi (Semua transaksi SELAMA periode)
            items_in_range = JournalItem.objects.filter(
                account=account,
                journal_entry__date__range=[start_date_str, end_date_str]
            ).order_by('journal_entry__date', 'id') # Urutkan berdasarkan tanggal

            # Kita pakai serializer simpel, ambil data yg perlu aja
            mutasi = list(items_in_range.values(
                'id', 
                'journal_entry__date', 
                'journal_entry__description', 
                'debit', 
                'credit'
            ))

            # 5. Hitung Total Mutasi & Saldo Akhir
            total_debit_mutasi = sum(item['debit'] for item in mutasi)
            total_kredit_mutasi = sum(item['credit'] for item in mutasi)

            saldo_akhir = saldo_awal # Mulai dari saldo awal
            if account.normal_balance == 'KREDIT':
                saldo_akhir += (total_kredit_mutasi - total_debit_mutasi)
            else: # DEBIT
                saldo_akhir += (total_debit_mutasi - total_kredit_mutasi)

            # 6. Susun JSON response-nya
            response_data = {
                "laporan": "Buku Besar",
                "akun": f"{account.number} - {account.name}",
                "periode": f"{start_date_str} s/d {end_date_str}",
                "saldo_normal": account.normal_balance,
                "saldo_awal": saldo_awal,
                "mutasi": mutasi, # Daftar semua transaksi
                "total_debit_mutasi": total_debit_mutasi,
                "total_kredit_mutasi": total_kredit_mutasi,
                "saldo_akhir": saldo_akhir
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Gagal memproses laporan: {str(e)}."},
                status=status.HTTP_400_BAD_REQUEST
            )

class TrialBalanceView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant]
    """
    API endpoint untuk Laporan Neraca Saldo (Trial Balance).
    Menghitung saldo akhir semua akun per 'end_date'
    dan membuktikan Total Debit == Total Kredit.
    Contoh: /api/reports/trial-balance/?end_date=2025-11-30
    """

    def get(self, request, *args, **kwargs):
        today = date.today()
        end_date_str = request.query_params.get('end_date', today.strftime('%Y-%m-%d'))

        try:
            # 1. Ambil SEMUA item jurnal DARI AWAL s/d tanggal akhir
            items_up_to_date = JournalItem.objects.filter(
                journal_entry__date__lte=end_date_str
            )

            # 2. Ambil SEMUA akun
            all_accounts = Account.objects.all().order_by('number')

            report_lines = []
            grand_total_debit = Decimal('0.0')
            grand_total_kredit = Decimal('0.0')

            # 3. Loop setiap akun dan hitung saldonya
            for account in all_accounts:
                account_items = items_up_to_date.filter(account=account)

                account_balance_data = account_items.aggregate(
                    total_kredit=Sum('credit', default=Decimal('0.0')),
                    total_debit=Sum('debit', default=Decimal('0.0'))
                )

                saldo_debit = Decimal('0.0')
                saldo_kredit = Decimal('0.0')

                # Hitung saldo akhir (sesuai saldo normal)
                if account.normal_balance == 'KREDIT': # (Liabilitas, Ekuitas, Pendapatan)
                    balance = account_balance_data['total_kredit'] - account_balance_data['total_debit']
                    if balance > 0:
                        saldo_kredit = balance
                    elif balance < 0:
                        saldo_debit = -balance # Saldo kontra

                else: # 'DEBIT' (Aset, Beban)
                    balance = account_balance_data['total_debit'] - account_balance_data['total_kredit']
                    if balance > 0:
                        saldo_debit = balance
                    elif balance < 0:
                        saldo_kredit = -balance # Saldo kontra

                # Hanya tambahkan ke laporan jika ada saldo
                if saldo_debit != 0 or saldo_kredit != 0:
                    report_lines.append({
                        "nomor_akun": account.number,
                        "nama_akun": account.name,
                        "debit": saldo_debit,
                        "kredit": saldo_kredit
                    })
                    grand_total_debit += saldo_debit
                    grand_total_kredit += saldo_kredit

            # 4. Susun JSON response-nya
            response_data = {
                "laporan": "Laporan Neraca Saldo",
                "periode_per_tanggal": end_date_str,
                "detail_akun": report_lines,
                "total_debit": grand_total_debit,
                "total_kredit": grand_total_kredit,
                "is_balanced": grand_total_debit == grand_total_kredit
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Gagal memproses laporan: {str(e)}."},
                status=status.HTTP_400_BAD_REQUEST
            )

@method_decorator(csrf_exempt, name='dispatch')
class CreateSalesReturnView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsSales]
    
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = SalesReturnSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        data = serializer.validated_data
        tipe_pengembalian = data['tipe_pengembalian']
        return_items = data['items']
        
        try:
            # Ambil Akun Default (Pastikan akun 4-2000 dibuat di COA nanti)
            akun_kas = Account.objects.get(number='1-1000')
            akun_piutang = Account.objects.get(number='1-1100')
            akun_retur_penjualan = Account.objects.get(number='4-2000') 
            akun_ppn_keluaran = Account.objects.get(number='2-1200') 

        except Account.DoesNotExist as e:
            return Response(
                {"error": f"Akun tidak ditemukan: {str(e)}. Pastikan Akun 4-2000 (Retur Penjualan) sudah dibuat."},
                status=status.HTTP_404_NOT_FOUND
            )

        if tipe_pengembalian == 'TUNAI':
            akun_kredit_pengembalian = akun_kas
        else: 
            akun_kredit_pengembalian = akun_piutang
        
        total_pengembalian_dana = Decimal('0.0')
        total_nilai_retur = Decimal('0.0')
        total_ppn_balik = Decimal('0.0')
        
        description = data.get('description') or "Retur Penjualan Barang"
        
        # 1. Jurnal Finansial
        entry_financial = JournalEntry.objects.create(
            date=data['date'], description=description, contact_id=data.get('contact_id')
        )
        
        # 2. Jurnal Stok (Balikin HPP)
        entry_inventory = JournalEntry.objects.create(
            date=data['date'], description=f"Pengembalian Stok (HPP): {description}", contact_id=data.get('contact_id')
        )
        
        for item_data in return_items:
            try:
                item = InventoryItem.objects.get(id=item_data['item_id'])
            except InventoryItem.DoesNotExist:
                continue

            qty = Decimal(str(item_data['quantity']))
            price = Decimal(str(item_data['unit_price']))
            tax_rate = Decimal(str(item_data.get('tax_rate', 0)))

            nilai_retur = qty * price
            ppn = nilai_retur * (tax_rate / Decimal('100.0'))
            
            total_nilai_retur += nilai_retur
            total_ppn_balik += ppn
            
            # Balikin Stok (Debit Persediaan, Kredit HPP)
            cost_amount = qty * item.average_cost
            JournalItem.objects.create(journal_entry=entry_inventory, account=item.asset_account, debit=cost_amount, credit=Decimal('0.0'))
            JournalItem.objects.create(journal_entry=entry_inventory, account=item.hpp_account, debit=Decimal('0.0'), credit=cost_amount)
            
            InventoryLog.objects.create(
                item=item, date=data['date'], transaction_type='RETUR_JUAL',
                quantity=qty, total_cost=cost_amount, journal_entry=entry_inventory
            )
            item.recalculate_inventory()

        # Selesaikan Jurnal Finansial
        total_pengembalian_dana = total_nilai_retur + total_ppn_balik
        
        # Debit Retur Penjualan
        JournalItem.objects.create(journal_entry=entry_financial, account=akun_retur_penjualan, debit=total_nilai_retur, credit=Decimal('0.0'))
        
        # Debit PPN Keluaran (Kurangi Utang Pajak)
        if total_ppn_balik > 0:
            JournalItem.objects.create(journal_entry=entry_financial, account=akun_ppn_keluaran, debit=total_ppn_balik, credit=Decimal('0.0'))
            
        # Kredit Kas/Piutang
        JournalItem.objects.create(journal_entry=entry_financial, account=akun_kredit_pengembalian, debit=Decimal('0.0'), credit=total_pengembalian_dana)
        
        return Response({"status": "Retur Penjualan berhasil dicatat."}, status=status.HTTP_201_CREATED)
    
# accounting/views.py (UPDATE BAGIAN INI SAJA)

class DashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant]

    def get(self, request, *args, **kwargs):
        today = date.today()
        start_of_month = today.replace(day=1)
        
        # --- 1. KPI & LABA RUGI ---
        items_up_to_today = JournalItem.objects.filter(journal_entry__date__lte=today)
        items_this_month = JournalItem.objects.filter(journal_entry__date__gte=start_of_month)

        try:
            # Kas
            akun_kas_list = Account.objects.filter(number__startswith='1-10')
            total_kas = sum(self.get_single_balance(items_up_to_today, acc) for acc in akun_kas_list)

            # Piutang
            akun_piutang = Account.objects.filter(number__startswith='1-11').first()
            total_piutang = self.get_single_balance(items_up_to_today, akun_piutang) if akun_piutang else 0

            # Utang
            akun_utang = Account.objects.filter(number__startswith='2-10').first()
            total_utang = self.get_single_balance(items_up_to_today, akun_utang) if akun_utang else 0

            # Laba Rugi Bulan Ini
            rev_data = items_this_month.filter(account__type='PENDAPATAN').aggregate(c=Sum('credit'), d=Sum('debit'))
            rev_month = (rev_data['c'] or 0) - (rev_data['d'] or 0)
            
            # PERBAIKAN 1: Pake account__type
            exp_data = items_this_month.filter(Q(account__type='BEBAN') | Q(account__type='BEBAN_LAIN')).aggregate(d=Sum('debit'), c=Sum('credit'))
            exp_month = (exp_data['d'] or 0) - (exp_data['c'] or 0)
            
            laba_bersih = rev_month - exp_month

        except Exception as e:
            # Print error ke terminal biar ketahuan kalo ada masalah lain
            print(f"Error KPI: {e}")
            total_kas = 0; total_piutang = 0; total_utang = 0; rev_month = 0; laba_bersih = 0

        # --- 2. TREN 6 BULAN ---
        trend_data = []
        start_trend = today - relativedelta(months=5)
        for i in range(6):
            curr = start_trend + relativedelta(months=i)
            ms = curr.replace(day=1)
            me = ms + relativedelta(months=1) - relativedelta(days=1)
            
            items_m = JournalItem.objects.filter(journal_entry__date__range=[ms, me])
            
            # Pendapatan
            r = items_m.filter(account__type='PENDAPATAN').aggregate(c=Sum('credit'), d=Sum('debit'))
            val_rev = (r['c'] or 0) - (r['d'] or 0)
            
            # Beban (INI BAGIAN YANG TADI EROR)
            # PERBAIKAN 2: Ditambah 'account__' di depan 'type__in'
            e = items_m.filter(account__type__in=['BEBAN', 'BEBAN_OPERASIONAL', 'BEBAN_LAIN']).aggregate(d=Sum('debit'), c=Sum('credit'))
            val_exp = (e['d'] or 0) - (e['c'] or 0)
            
            trend_data.append({
                "name": ms.strftime('%b'),
                "pendapatan": val_rev,
                "beban": val_exp,
                "laba": val_rev - val_exp
            })

        # --- 3. RANKING PRODUK ---
        top_products = InventoryLog.objects.filter(transaction_type='JUAL')\
            .values('item__name')\
            .annotate(total_qty=Sum('quantity'), total_hpp=Sum('total_cost'))\
            .order_by('-total_qty')[:5]

        ranking_list = []
        for p in top_products:
            ranking_list.append({
                "name": p['item__name'],
                "quantity_sold": p['total_qty'],
                "estimasi_nilai": p['total_hpp']
            })

        # --- 4. PIE CHART ---
        expense_comp = []
        # PERBAIKAN 3: Pake account__type__in biar aman
        beban_accs = Account.objects.filter(type__in=['BEBAN', 'BEBAN_OPERASIONAL', 'BEBAN_LAIN'])
        for acc in beban_accs:
            bal = self.get_single_balance(items_this_month, acc)
            if bal > 0: expense_comp.append({"name": acc.name, "value": bal})
        
        expense_comp.sort(key=lambda x: x['value'], reverse=True)
        final_pie = expense_comp[:5]

        # --- 5. RECENT TRANSACTIONS ---
        recent_entries = JournalEntry.objects.all().order_by('-created_at')[:5]
        recent_list = []
        for entry in recent_entries:
            total_val = entry.items.filter(debit__gt=0).aggregate(Sum('debit'))['debit__sum'] or 0
            recent_list.append({
                "id": entry.id,
                "date": entry.date,
                "description": entry.description,
                "total": total_val,
                "contact": entry.contact.name if entry.contact else "-"
            })

        return Response({
            "kpi": {
                "kas": total_kas, "piutang": total_piutang, 
                "utang": total_utang, "laba_bersih": laba_bersih,
                "pendapatan": rev_month
            },
            "trend_chart": trend_data,
            "ranking": ranking_list, 
            "pie_chart": final_pie,
            "recent_activity": recent_list
        })

    def get_single_balance(self, queryset, account):
        res = queryset.filter(account=account).aggregate(c=Sum('credit'), d=Sum('debit'))
        return (res['c'] or 0) - (res['d'] or 0) if account.normal_balance == 'KREDIT' else (res['d'] or 0) - (res['c'] or 0)
    
class CashFlowStatementView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant]
    """
    API endpoint untuk Laporan Arus Kas (Metode Tidak Langsung).
    (Versi FINAL - Sudah termasuk PPN, Inventori, dan Penyusutan)
    """
    
    def get(self, request, *args, **kwargs):
        today = date.today()
        start_date_str = request.query_params.get('start_date', today.replace(day=1).strftime('%Y-%m-%d'))
        end_date_str = request.query_params.get('end_date', today.strftime('%Y-%m-%d'))
        
        try:
            # --- AMBIL DATA ---
            items_in_range = JournalItem.objects.filter(
                journal_entry__date__range=[start_date_str, end_date_str]
            )
            items_before_date = JournalItem.objects.filter(
                journal_entry__date__lt=start_date_str
            )
            items_up_to_date = JournalItem.objects.filter(
                journal_entry__date__lte=end_date_str
            )

            # --- 1. ARUS KAS DARI OPERASI (INDIRECT) ---
            
            # A. Mulai dari Laba Bersih (Periode Ini)
            pendapatan_data = items_in_range.filter(account__type='PENDAPATAN').aggregate(
                kredit=Sum('credit', default=Decimal('0.0')), debit=Sum('debit', default=Decimal('0.0'))
            )
            total_pendapatan = pendapatan_data['kredit'] - pendapatan_data['debit']
            
            beban_data = items_in_range.filter(Q(account__type='BEBAN') | Q(account__type='BEBAN_OPERASIONAL') | Q(account__type='BEBAN_LAIN')).aggregate(
                kredit=Sum('credit', default=Decimal('0.0')), debit=Sum('debit', default=Decimal('0.0'))
            )
            total_beban = beban_data['debit'] - beban_data['kredit']
            laba_bersih = total_pendapatan - total_beban
            
            # B. Penyesuaian Akun Akrual
            # GANTI NOMOR AKUN JIKA BEDA
            akun_piutang = Account.objects.get(number='1-1100')
            akun_utang = Account.objects.get(number='2-1000')
            akun_persediaan = Account.objects.get(number='1-1200')
            akun_ppn_masukan = Account.objects.get(number='1-1300')
            akun_ppn_keluaran = Account.objects.get(number='2-1200')

            # --- INI DIA PERBAIKANNYA (BAGIAN 1) ---
            # Hitung Beban Penyusutan (Beban Non-Tunai)
            # Kita cari semua akun 'Beban Penyusutan' yang terdaftar di Aset Tetap
            depreciation_expense_accounts = FixedAsset.objects.values_list(
                'depreciation_expense_account_id', flat=True
            ).distinct()
            
            beban_penyusutan_data = items_in_range.filter(
                account_id__in=depreciation_expense_accounts
            ).aggregate(
                total_debit=Sum('debit', default=Decimal('0.0'))
            )
            # Beban penyusutan (non-tunai) harus "Ditambahkan Kembali" (Add Back)
            penyesuaian_penyusutan = beban_penyusutan_data['total_debit']
            # --- BATAS PERBAIKAN 1 ---

            # Hitung Perubahan Piutang
            saldo_awal_piutang = self.get_account_balance(items_before_date, akun_piutang)
            saldo_akhir_piutang = self.get_account_balance(items_up_to_date, akun_piutang)
            kenaikan_piutang = saldo_akhir_piutang - saldo_awal_piutang 
            penyesuaian_piutang = -kenaikan_piutang # (Aset NAIK, Kas TURUN)

            # Hitung Perubahan Utang
            saldo_awal_utang = self.get_account_balance(items_before_date, akun_utang)
            saldo_akhir_utang = self.get_account_balance(items_up_to_date, akun_utang)
            kenaikan_utang = saldo_akhir_utang - saldo_awal_utang
            penyesuaian_utang = kenaikan_utang # (Liabilitas NAIK, Kas NAIK)
            
            # Hitung Perubahan Persediaan
            saldo_awal_persediaan = self.get_account_balance(items_before_date, akun_persediaan)
            saldo_akhir_persediaan = self.get_account_balance(items_up_to_date, akun_persediaan)
            kenaikan_persediaan = saldo_akhir_persediaan - saldo_awal_persediaan
            penyesuaian_persediaan = -kenaikan_persediaan # (Aset NAIK, Kas TURUN)

            # Hitung Perubahan PPN Masukan (Aset)
            saldo_awal_ppn_masukan = self.get_account_balance(items_before_date, akun_ppn_masukan)
            saldo_akhir_ppn_masukan = self.get_account_balance(items_up_to_date, akun_ppn_masukan)
            kenaikan_ppn_masukan = saldo_akhir_ppn_masukan - saldo_awal_ppn_masukan
            penyesuaian_ppn_masukan = -kenaikan_ppn_masukan # (Aset NAIK, Kas TURUN)
            
            # Hitung Perubahan PPN Keluaran (Liabilitas)
            saldo_awal_ppn_keluaran = self.get_account_balance(items_before_date, akun_ppn_keluaran)
            saldo_akhir_ppn_keluaran = self.get_account_balance(items_up_to_date, akun_ppn_keluaran)
            kenaikan_ppn_keluaran = saldo_akhir_ppn_keluaran - saldo_awal_ppn_keluaran
            penyesuaian_ppn_keluaran = kenaikan_ppn_keluaran # (Liabilitas NAIK, Kas NAIK)
            
            # --- INI DIA PERBAIKANNYA (BAGIAN 2) ---
            # TOTAL ARUS KAS OPERASI
            total_penyesuaian = (
                penyesuaian_penyusutan + # <-- DITAMBAH
                penyesuaian_piutang + penyesuaian_utang + 
                penyesuaian_persediaan + penyesuaian_ppn_masukan + penyesuaian_ppn_keluaran
            )
            # --- BATAS PERBAIKAN 2 ---
            
            arus_kas_operasi = laba_bersih + total_penyesuaian

            # --- 2. ARUS KAS DARI INVESTASI ---
            # (Kita perlu ngurangin Duit Keluar dari Jurnal Pembelian Aset Tetap)
            aset_tetap_accounts = FixedAsset.objects.values_list('asset_account_id', flat=True).distinct()
            mutasi_investasi_data = items_in_range.filter(
                account_id__in=aset_tetap_accounts
            ).aggregate(
                 kredit=Sum('credit', default=Decimal('0.0')), debit=Sum('debit', default=Decimal('0.0'))
            )
            # Saldo normal Aset = Debit. Kalo Debit nambah, artinya kas keluar (negatif)
            arus_kas_investasi = mutasi_investasi_data['kredit'] - mutasi_investasi_data['debit']


            # --- 3. ARUS KAS DARI PENDANAAN ---
            mutasi_pendanaan_data = items_in_range.filter(
                account__type='EKUITAS'
            ).aggregate(
                kredit=Sum('credit', default=Decimal('0.0')), debit=Sum('debit', default=Decimal('0.0'))
            )
            arus_kas_pendanaan = mutasi_pendanaan_data['kredit'] - mutasi_pendanaan_data['debit']

            # --- 4. KALKULASI TOTAL PERUBAHAN KAS ---
            perubahan_kas_neto = arus_kas_operasi + arus_kas_investasi + arus_kas_pendanaan

            # --- 5. VERIFIKASI (BUKTI) ---
            akun_kas = Account.objects.get(number='1-1000')
            saldo_awal_kas = self.get_account_balance(items_before_date, akun_kas)
            saldo_akhir_kas = self.get_account_balance(items_up_to_date, akun_kas)
            perubahan_kas_aktual = saldo_akhir_kas - saldo_awal_kas
            
            # --- 6. Susun JSON response-nya ---
            response_data = {
                "laporan": "Laporan Arus Kas (Metode Tidak Langsung)",
                "periode": f"{start_date_str} s/d {end_date_str}",
                "operasi": {
                    "laba_bersih": laba_bersih,
                    "penyesuaian": [
                        {"item": "Beban Penyusutan (Non-Tunai)", "jumlah": penyesuaian_penyusutan}, # <-- TAMBAHAN BARU
                        {"item": "Kenaikan Piutang Dagang", "jumlah": kenaikan_piutang},
                        {"item": "Kenaikan Utang Usaha", "jumlah": kenaikan_utang},
                        {"item": "Kenaikan Persediaan Barang", "jumlah": kenaikan_persediaan},
                        {"item": "Kenaikan PPN Masukan", "jumlah": kenaikan_ppn_masukan}, 
                        {"item": "Kenaikan PPN Keluaran", "jumlah": kenaikan_ppn_keluaran},
                    ],
                    "total_penyesuaian": total_penyesuaian,
                    "arus_kas_neto_operasi": arus_kas_operasi,
                },
                "investasi": {
                    "detail": [
                         {"item": "Pembelian Aset Tetap", "jumlah": arus_kas_investasi} # <-- TAMBAHAN BARU
                    ],
                    "arus_kas_neto_investasi": arus_kas_investasi,
                },
                "pendanaan": {
                    "detail": [
                        {"item": "Mutasi Modal (Setoran/Prive)", "jumlah": arus_kas_pendanaan}
                    ],
                    "arus_kas_neto_pendanaan": arus_kas_pendanaan,
                },
                "perubahan_kas_neto": perubahan_kas_neto,
                "verifikasi": {
                    "saldo_awal_kas": saldo_awal_kas,
                    "saldo_akhir_kas": saldo_akhir_kas,
                    "perubahan_kas_aktual_di_buku_besar": perubahan_kas_aktual,
                    "is_balanced": perubahan_kas_neto == perubahan_kas_aktual
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)

        except Account.DoesNotExist as e:
            return Response(
                {"error": f"Akun default (Kas/Piutang/Utang/Persediaan/PPN) tidak ditemukan: {str(e)}."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Gagal memproses laporan: {str(e)}."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def get_account_balance(self, queryset, account):
        """
        Fungsi helper (copy-paste dari Neraca) untuk hitung saldo 1 akun.
        """
        account_items = queryset.filter(account=account)
        account_balance_data = account_items.aggregate(
            total_kredit=Sum('credit', default=Decimal('0.0')),
            total_debit=Sum('debit', default=Decimal('0.0'))
        )
        
        if account.normal_balance == 'KREDIT':
            balance = account_balance_data['total_kredit'] - account_balance_data['total_debit']
        else: # DEBIT
            balance = account_balance_data['total_debit'] - account_balance_data['total_kredit']
        
        return balance

class SubsidiaryLedgerView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsSales]
    """
    API endpoint untuk Laporan Buku Besar Pembantu (Subsidiary Ledger).
    WAJIB menerima 'account_id' (Akun Kontrol), 'contact_id', 'start_date', 'end_date'.
    Contoh: /api/reports/subsidiary-ledger/?account_id=4&contact_id=2&start_date=...
    """

    def get(self, request, *args, **kwargs):
        # 1. Ambil query params
        account_id = request.query_params.get('account_id')
        contact_id = request.query_params.get('contact_id') # <-- FILTER BARU
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')

        # 2. Validasi Input (WAJIB ADA SEMUA)
        if not all([account_id, contact_id, start_date_str, end_date_str]):
            return Response(
                {"error": "Parameter 'account_id', 'contact_id', 'start_date', dan 'end_date' wajib diisi."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Ambil akun & kontak yang mau dicek
            account = Account.objects.get(id=account_id)
            contact = Contact.objects.get(id=contact_id) # <-- AMBIL KONTAK
        except (Account.DoesNotExist, Contact.DoesNotExist) as e:
            return Response(
                {"error": f"Akun atau Kontak tidak ditemukan: {str(e)}"},
                status=status.HTTP_404_NOT_FOUND
            )

        # --- KALKULASI INTI ---
        try:
            # 3. Hitung Saldo Awal (transaksi SEBELUM start_date UNTUK KONTAK INI)
            items_before_date = JournalItem.objects.filter(
                account=account,
                journal_entry__date__lt=start_date_str,
                journal_entry__contact=contact # <-- FILTER KONTAK
            )
            saldo_awal_data = items_before_date.aggregate(
                total_debit=Sum('debit', default=Decimal('0.0')),
                total_kredit=Sum('credit', default=Decimal('0.0'))
            )

            if account.normal_balance == 'KREDIT':
                saldo_awal = saldo_awal_data['total_kredit'] - saldo_awal_data['total_debit']
            else: # DEBIT
                saldo_awal = saldo_awal_data['total_debit'] - saldo_awal_data['total_kredit']

            # 4. Ambil Mutasi (transaksi SELAMA periode UNTUK KONTAK INI)
            items_in_range = JournalItem.objects.filter(
                account=account,
                journal_entry__date__range=[start_date_str, end_date_str],
                journal_entry__contact=contact # <-- FILTER KONTAK
            ).order_by('journal_entry__date', 'id')

            mutasi = list(items_in_range.values(
                'id', 
                'journal_entry__date', 
                'journal_entry__description', 
                'debit', 
                'credit'
            ))

            # 5. Hitung Total Mutasi & Saldo Akhir
            total_debit_mutasi = sum(item['debit'] for item in mutasi)
            total_kredit_mutasi = sum(item['credit'] for item in mutasi)

            saldo_akhir = saldo_awal
            if account.normal_balance == 'KREDIT':
                saldo_akhir += (total_kredit_mutasi - total_debit_mutasi)
            else: # DEBIT
                saldo_akhir += (total_debit_mutasi - total_kredit_mutasi)

            # 6. Susun JSON response-nya
            response_data = {
                "laporan": "Buku Besar Pembantu",
                "kontak": f"{contact.name} ({contact.type})",
                "akun_kontrol": f"{account.number} - {account.name}",
                "periode": f"{start_date_str} s/d {end_date_str}",
                "saldo_awal": saldo_awal,
                "mutasi": mutasi,
                "total_debit_mutasi": total_debit_mutasi,
                "total_kredit_mutasi": total_kredit_mutasi,
                "saldo_akhir": saldo_akhir
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Gagal memproses laporan: {str(e)}."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
class RunDepreciationView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant]
    """
    API endpoint 'sihir' untuk MENJALANKAN PENYUSUTAN OTOMATIS.

    API ini akan:
    1. Menerima 'run_up_to_date' (misal: "2025-11-30").
    2. Mencari semua Aset Tetap yang belum disusutkan s/d tanggal itu.
    3. Membuat Jurnal Penyesuaian (AJE) untuk setiap bulan yang terlewat.
    4. Meng-update 'last_depreciation_date' di Aset Tetap.
    """

    @transaction.atomic # WAJIB, biar semua jurnal dibuat atau tidak sama sekali
    def post(self, request, *args, **kwargs):
        run_up_to_date_str = request.data.get('run_up_to_date')

        if not run_up_to_date_str:
            return Response(
                {"error": "Parameter 'run_up_to_date' (YYYY-MM-DD) wajib diisi."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            run_up_to_date = date.fromisoformat(run_up_to_date_str)
        except ValueError:
             return Response(
                {"error": "Format tanggal salah. Harap gunakan YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 1. Ambil semua aset yang masih aktif (belum lunas disusutkan)
        active_assets = FixedAsset.objects.filter(is_fully_depreciated=False)

        journals_created_count = 0
        assets_updated_count = 0

        # 2. Loop setiap aset aktif
        for asset in active_assets:

            # Tentukan tanggal mulai penyusutan
            # Kalo belum pernah disusutin, mulai dari Tgl Beli.
            # Kalo udah, mulai dari 1 bulan setelah penyusutan terakhir.
            if asset.last_depreciation_date:
                start_depreciation_month = asset.last_depreciation_date + relativedelta(months=1)
            else:
                start_depreciation_month = asset.purchase_date

            # 3. Loop setiap BULAN yang terlewat
            current_month_to_post = start_depreciation_month

            while current_month_to_post <= run_up_to_date:
                # Tanggal AJE: Selalu di akhir bulan
                depreciation_date = current_month_to_post.replace(day=1) + relativedelta(months=1) - relativedelta(days=1)

                # Jangan posting AJE untuk masa depan
                if depreciation_date > run_up_to_date:
                    break

                # Cek total bulan yg sudah disusutkan
                months_depreciated = (
                    (asset.last_depreciation_date.year - asset.purchase_date.year) * 12 + 
                    (asset.last_depreciation_date.month - asset.purchase_date.month)
                ) if asset.last_depreciation_date else 0

                if months_depreciated >= asset.useful_life_months:
                    asset.is_fully_depreciated = True
                    asset.save()
                    break # Stop, aset ini udah lunas

                # --- INTI SIHIR: BIKIN JURNAL ---
                description = f"Penyusutan {asset.name} - {current_month_to_post.strftime('%B %Y')}"
                monthly_amount = asset.monthly_depreciation

                entry = JournalEntry.objects.create(
                    date=depreciation_date,
                    description=description,
                    contact=None # Jurnal internal, nggak perlu kontak
                )

                # (Debit) Beban Penyusutan
                JournalItem.objects.create(
                    journal_entry=entry,
                    account=asset.depreciation_expense_account,
                    debit=monthly_amount,
                    credit=Decimal('0.0')
                )

                # (Kredit) Akumulasi Penyusutan
                JournalItem.objects.create(
                    journal_entry=entry,
                    account=asset.accumulated_depreciation_account,
                    debit=Decimal('0.0'),
                    credit=monthly_amount
                )

                # Update aset-nya
                asset.last_depreciation_date = depreciation_date
                asset.save()

                journals_created_count += 1
                assets_updated_count += 1 # (dihitung per jurnal yg dibuat)

                # Lanjut ke bulan berikutnya
                current_month_to_post += relativedelta(months=1)

        return Response(
            {"status": f"Proses penyusutan selesai. {journals_created_count} Jurnal AJE telah dibuat."},
            status=status.HTTP_200_OK
        )
    
class PurchaseInventoryView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsPurchasing | IsSales]
    """
    API endpoint 'pintasan' kustom untuk MENCATAT PEMBELIAN BARANG INVENTORI.
    (Versi UPGRADE - Sudah mendukung PPN Masukan)
    """
    
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = InventoryPurchaseSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        data = serializer.validated_data
        tipe_pembayaran = data['tipe_pembayaran']
        
        # --- LOGIKA PAJAK BARU ---
        harga_barang = data['quantity'] * data['unit_cost']
        ppn_masukan = harga_barang * (data['tax_rate'] / Decimal('100.0'))
        total_pembayaran = harga_barang + ppn_masukan # Ini yg masuk ke Kas/Utang
        # --- BATAS LOGIKA PAJAK ---
        
        try:
            # Akun-akun yang kita butuhkan
            item = InventoryItem.objects.get(id=data['item_id'])
            akun_kas = Account.objects.get(number='1-1000')
            akun_utang = Account.objects.get(number='2-1000')
            akun_ppn_masukan = Account.objects.get(number='1-1300') # <-- AKUN PAJAK LO
            akun_persediaan = item.asset_account 

        except (Account.DoesNotExist, InventoryItem.DoesNotExist) as e:
            return Response(
                {"error": f"Data Akun (Kas/Utang/PPN Masukan/Persediaan) atau Barang tidak ditemukan: {str(e)}."},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if tipe_pembayaran == 'TUNAI':
            akun_kredit = akun_kas
        else: # 'KREDIT'
            akun_kredit = akun_utang
        
        # Buat Jurnal Akuntansi (Sekarang 3 baris!)
        description = data.get('description') or f"Pembelian {item.name}"
        
        entry = JournalEntry.objects.create(
            date=data['date'],
            description=description,
            contact_id=data.get('contact_id'),
        )
        
        # (Debit) Persediaan Barang -> Seharga barangnya
        JournalItem.objects.create(
            journal_entry=entry,
            account=akun_persediaan,
            debit=harga_barang,
            credit=Decimal('0.0')
        )
        
        # (Debit) PPN Masukan -> Seharga pajaknya
        if ppn_masukan > 0:
            JournalItem.objects.create(
                journal_entry=entry,
                account=akun_ppn_masukan,
                debit=ppn_masukan,
                credit=Decimal('0.0')
            )
        
        # (Kredit) Kas / Utang Usaha -> Seharga TOTAL-nya
        JournalItem.objects.create(
            journal_entry=entry,
            account=akun_kredit,
            debit=Decimal('0.0'),
            credit=total_pembayaran
        )
        
        # Buat Log Inventori (Stok Masuk)
        # PENTING: Nilai stok HANYA seharga barangnya, JANGAN termasuk pajak
        log = InventoryLog.objects.create(
            item=item,
            date=data['date'],
            transaction_type='BELI',
            quantity=data['quantity'],
            total_cost=harga_barang, # <-- HANYA harga barang
            journal_entry=entry
        )
        
        item.recalculate_inventory()
        
        return Response(
            {"status": "Pembelian barang (termasuk PPN) berhasil dicatat"},
            status=status.HTTP_201_CREATED
        )

@method_decorator(csrf_exempt, name='dispatch')    
class CreateSalesInvoiceView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsSales]
    """
    API endpoint 'pintasan' kustom untuk MENCATAT PENJUALAN BARANG INVENTORI.
    (Versi UPGRADE - Sudah mendukung PPN Keluaran)
    """
    
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = SalesInvoiceSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        data = serializer.validated_data
        tipe_pembayaran = data['tipe_pembayaran']
        invoice_items = data['items']
        
        try:
            # Akun-akun default
            akun_kas = Account.objects.get(number='1-1000')
            akun_piutang = Account.objects.get(number='1-1100')
            akun_pendapatan = Account.objects.get(number='4-1000')
            akun_ppn_keluaran = Account.objects.get(number='2-1200') # <-- AKUN PAJAK LO

        except Account.DoesNotExist as e:
            return Response(
                {"error": f"Akun default (Kas/Piutang/Pendapatan/PPN Keluaran) tidak ditemukan: {str(e)}."},
                status=status.HTTP_404_NOT_FOUND
            )

        if tipe_pembayaran == 'TUNAI':
            akun_debit_penjualan = akun_kas
        else: # 'KREDIT'
            akun_debit_penjualan = akun_piutang
        
        # --- MULAI SIHIR PAJAK ---
        total_tagihan = Decimal('0.0') # Ini yg masuk ke Kas/Piutang
        total_pendapatan_bersih = Decimal('0.0') # Ini yg masuk ke Laba Rugi
        total_ppn_keluaran = Decimal('0.0') # Ini yg masuk ke Utang Pajak
        total_hpp = Decimal('0.0')
        
        description = data.get('description') or "Penjualan Barang"
        
        # Buat Jurnal Induk PENJUALAN
        entry_penjualan = JournalEntry.objects.create(
            date=data['date'],
            description=description,
            contact_id=data.get('contact_id'),
        )
        
        # Buat Jurnal Induk HPP
        entry_hpp = JournalEntry.objects.create(
            date=data['date'],
            description=f"HPP atas: {description}",
            contact_id=data.get('contact_id'),
        )
        
        # Loop SETIAP barang yang dijual
        for item_data in invoice_items:
            try:
                item = InventoryItem.objects.get(id=item_data['item_id'])
            except InventoryItem.DoesNotExist:
                raise serializers.ValidationError(f"Barang dengan ID {item_data['item_id']} tidak ditemukan.")

            if item_data['quantity'] > item.quantity_on_hand:
                raise serializers.ValidationError(f"Stok '{item.name}' tidak cukup. Sisa stok: {item.quantity_on_hand}")
            
            # --- A. Hitung Angka Penjualan (BARU) ---
            harga_jual_barang = item_data['quantity'] * item_data['unit_price']
            ppn_keluaran = harga_jual_barang * (item_data['tax_rate'] / Decimal('100.0'))
            
            total_pendapatan_bersih += harga_jual_barang
            total_ppn_keluaran += ppn_keluaran
            
            # --- B. Hitung Angka HPP (SAMA) ---
            item_total_hpp = item_data['quantity'] * item.average_cost
            total_hpp += item_total_hpp
            
            # --- C. Buat Jurnal Item HPP (SAMA) ---
            JournalItem.objects.create(
                journal_entry=entry_hpp, account=item.hpp_account, debit=item_total_hpp, credit=Decimal('0.0')
            )
            JournalItem.objects.create(
                journal_entry=entry_hpp, account=item.asset_account, debit=Decimal('0.0'), credit=item_total_hpp
            )
            
            # --- D. Buat Log Inventori (SAMA) ---
            InventoryLog.objects.create(
                item=item, date=data['date'], transaction_type='JUAL',
                quantity=item_data['quantity'], total_cost=item_total_hpp, journal_entry=entry_hpp
            )
            
            # --- E. Hitung Ulang Stok Barang (SAMA) ---
            item.recalculate_inventory()

        # 7. Selesaikan Jurnal Penjualan (setelah totalnya dapet)
        
        # (Kredit) Pendapatan -> Seharga barangnya
        JournalItem.objects.create(
            journal_entry=entry_penjualan,
            account=akun_pendapatan,
            debit=Decimal('0.0'),
            credit=total_pendapatan_bersih
        )
        
        # (Kredit) PPN Keluaran -> Seharga pajaknya
        if total_ppn_keluaran > 0:
            JournalItem.objects.create(
                journal_entry=entry_penjualan,
                account=akun_ppn_keluaran,
                debit=Decimal('0.0'),
                credit=total_ppn_keluaran
            )
        
        # (Debit) Kas / Piutang -> Seharga TOTAL TAGIHAN
        total_tagihan = total_pendapatan_bersih + total_ppn_keluaran
        JournalItem.objects.create(
            journal_entry=entry_penjualan,
            account=akun_debit_penjualan,
            debit=total_tagihan,
            credit=Decimal('0.0')
        )
        
        return Response(
            {"status": "Penjualan (termasuk PPN) berhasil dicatat. 2 Jurnal (Penjualan & HPP) telah dibuat.",
             "id": entry_penjualan.id
            },
            status=status.HTTP_201_CREATED
            
        )
    
class ReceivePaymentView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsSales]
    """
    API endpoint 'pintasan' kustom untuk Jurnal Penerimaan Kas
    (Pelunasan Piutang dari Customer).
    """
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = ReceivePaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        amount = data['amount']

        try:
            # 1. Ambil Akun & Kontak
            # GANTI NOMOR AKUN JIKA BEDA
            contact = Contact.objects.get(id=data['contact_id'])
            akun_kas_bank = Account.objects.get(id=data['account_debit_id']) # Duit Masuk ke Sini
            akun_piutang = Account.objects.get(number='1-1100') # Piutang Berkurang

            # 2. Validasi
            if contact.type != 'CUSTOMER':
                raise serializers.ValidationError("Kontak yang dipilih bukan Customer.")
            if akun_kas_bank.type != 'ASET':
                raise serializers.ValidationError("Akun Debit harus berupa Akun Aset (Kas/Bank).")

        except (Account.DoesNotExist, Contact.DoesNotExist) as e:
            return Response({"error": f"Data Akun atau Kontak tidak ditemukan: {str(e)}."}, status=status.HTTP_404_NOT_FOUND)

        # 3. Buat Jurnal Akuntansi
        entry = JournalEntry.objects.create(
            date=data['date'],
            description=f"Penerimaan pelunasan piutang dari: {contact.name}",
            contact=contact
        )

        # (Debit) Kas / Bank
        JournalItem.objects.create(
            journal_entry=entry,
            account=akun_kas_bank,
            debit=amount,
            credit=Decimal('0.0')
        )

        # (Kredit) Piutang Dagang
        JournalItem.objects.create(
            journal_entry=entry,
            account=akun_piutang,
            debit=Decimal('0.0'),
            credit=amount
        )

        return Response({"status": "Penerimaan kas berhasil dicatat"}, status=status.HTTP_201_CREATED)


# --- TAMBAHKAN CLASS "SIHIR" 2: BAYAR UTANG ---

class MakePaymentView(APIView):
    permission_classes = [IsAuthenticated, IsOwner | IsAccountant | IsPurchasing]
    """
    API endpoint 'pintasan' kustom untuk Jurnal Pengeluaran Kas
    (Pembayaran Utang ke Vendor).
    """
    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = MakePaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        amount = data['amount']

        try:
            # 1. Ambil Akun & Kontak
            # GANTI NOMOR AKUN JIKA BEDA
            contact = Contact.objects.get(id=data['contact_id'])
            akun_kas_bank = Account.objects.get(id=data['account_credit_id']) # Duit Keluar dari Sini
            akun_utang = Account.objects.get(number='2-1000') # Utang Berkurang

            # 2. Validasi
            if contact.type != 'VENDOR':
                raise serializers.ValidationError("Kontak yang dipilih bukan Vendor.")
            if akun_kas_bank.type != 'ASET':
                raise serializers.ValidationError("Akun Kredit harus berupa Akun Aset (Kas/Bank).")

        except (Account.DoesNotExist, Contact.DoesNotExist) as e:
            return Response({"error": f"Data Akun atau Kontak tidak ditemukan: {str(e)}."}, status=status.HTTP_404_NOT_FOUND)

        # 3. Buat Jurnal Akuntansi
        entry = JournalEntry.objects.create(
            date=data['date'],
            description=f"Pembayaran utang ke: {contact.name}",
            contact=contact
        )

        # (Debit) Utang Usaha
        JournalItem.objects.create(
            journal_entry=entry,
            account=akun_utang,
            debit=amount,
            credit=Decimal('0.0')
        )

        # (Kredit) Kas / Bank
        JournalItem.objects.create(
            journal_entry=entry,
            account=akun_kas_bank,
            debit=Decimal('0.0'),
            credit=amount
        )

        return Response({"status": "Pembayaran kas berhasil dicatat"}, status=status.HTTP_201_CREATED)

@never_cache   
def index(request):
    return render(request, 'index.html')