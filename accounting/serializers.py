# accounting/serializers.py
from decimal import Decimal
from rest_framework import serializers
from .models import Account, JournalEntry, JournalItem, InventoryItem, InventoryLog, Contact, FixedAsset
from django.db import transaction

class JournalItemSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_name = serializers.ReadOnlyField(source='account.name')
    account_number = serializers.ReadOnlyField(source='account.number')

    class Meta:
        model = JournalItem
        fields = ['id', 'account', 'account_name', 'account_number', 'debit', 'credit']
        read_only_fields = ['account_name']

class JournalEntrySerializer(serializers.ModelSerializer):
    items = JournalItemSerializer(many=True)
    contact_name = serializers.ReadOnlyField(source='contact.name')
    contact_phone = serializers.ReadOnlyField(source='contact.phone')

    class Meta:
        model = JournalEntry
        fields = ['id', 'date', 'description', 'contact', 'contact_name', 'contact phone', 'created_at', 'items']

    def validate(self, attrs):
        items_data = attrs.get('items', [])
        if not items_data:
            raise serializers.ValidationError("Jurnal harus memiliki minimal satu item.")

        total_debit = sum(item.get('debit', 0) for item in items_data)
        total_credit = sum(item.get('credit', 0) for item in items_data)

        if total_debit == 0 and total_credit == 0:
            raise serializers.ValidationError("Total Jurnal tidak boleh nol.")
        
        if total_debit != total_credit:
            raise serializers.ValidationError(
                f"Jurnal tidak seimbang: Debit (Rp {total_debit}) != Kredit (Rp {total_credit})"
            )
            
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        journal_entry = JournalEntry.objects.create(**validated_data)
        for item_data in items_data:
            JournalItem.objects.create(journal_entry=journal_entry, **item_data)
        return journal_entry

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ['id', 'number', 'name', 'type', 'normal_balance']

class SalesShortcutSerializer(serializers.Serializer):
    """
    Serializer sederhana HANYA untuk validasi input shortcut penjualan.
    (Versi UPGRADE dengan Tipe Pembayaran)
    """
    PAYMENT_TYPES = [
        ('TUNAI', 'Tunai'),
        ('KREDIT', 'Kredit'),
    ]

class PurchaseShortcutSerializer(serializers.Serializer):
    """
    Serializer untuk validasi input shortcut pembelian/beban.
    (Versi UPGRADE - Vendor opsional, Keterangan manual)
    """
    PAYMENT_TYPES = [
        ('TUNAI', 'Tunai'),
        ('KREDIT', 'Kredit'),
    ]

    date = serializers.DateField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    
    # Akun mana yang mau di-DEBIT
    account_debit_id = serializers.IntegerField() 
    
    # Bayarnya pakai apa
    tipe_pembayaran = serializers.ChoiceField(choices=PAYMENT_TYPES)

    # --- PERUBAHAN LOGIKA DI SINI ---
    # Vendor (Opsional)
    contact_id = serializers.IntegerField(required=False, allow_null=True) 
    # Keterangan (Opsional, tapi jadi wajib kalo contact_id kosong)
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    # --- BATAS PERUBAHAN ---

    def validate(self, data):
        """
        Validasi kustom:
        Jika 'contact_id' (Vendor) TIDAK diisi, maka 'description' WAJIB diisi.
        """
        contact_id = data.get('contact_id')
        description = data.get('description')

        if not contact_id and not description:
            # Kalo dua-duanya kosong, error
            raise serializers.ValidationError("Harap isi 'Keterangan' jika 'Vendor' tidak dipilih.")
        
        return data

class InventoryItemSerializer(serializers.ModelSerializer):
    """
    Serializer untuk menampilkan dan membuat daftar barang (stok).
    """
    # Kita tambahin nama akun biar gampang dibaca di frontend
    asset_account_name = serializers.CharField(source='asset_account.name', read_only=True)
    hpp_account_name = serializers.CharField(source='hpp_account.name', read_only=True)
    

    class Meta:
        model = InventoryItem
        # Tampilkan semua field, termasuk yg read-only
        fields = [
            'id', 'name', 'sku', 
            'asset_account', 'asset_account_name', 
            'hpp_account', 'hpp_account_name',
            'quantity_on_hand', 'average_cost', 'total_value'
        ]
        # Field ini dihitung otomatis sama backend, jadi frontend cuma bisa baca
        read_only_fields = [
            'asset_account_name', 'hpp_account_name',
            'quantity_on_hand', 'average_cost', 'total_value'
        ]

class InventoryPurchaseSerializer(serializers.Serializer):
    """
    Serializer untuk validasi 'pintasan' input pembelian barang inventori.
    """
    PAYMENT_TYPES = [
        ('TUNAI', 'Tunai'),
        ('KREDIT', 'Kredit'),
    ]

    date = serializers.DateField()
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    item_id = serializers.IntegerField() 
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.0'))
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal('11.00'))
    tipe_pembayaran = serializers.ChoiceField(choices=PAYMENT_TYPES)
    contact_id = serializers.IntegerField(required=False, allow_null=True)

class ContactSerializer(serializers.ModelSerializer):
    """
    Serializer untuk menampilkan dan membuat daftar Kontak
    (Customer, Vendor, Dll).
    """
    class Meta:
        model = Contact
        fields = ['id', 'name', 'type', 'email', 'phone']

class FixedAssetSerializer(serializers.ModelSerializer):
    """
    Serializer untuk menampilkan dan membuat daftar Aset Tetap.
    """
    # Kita tambahin nama akun biar gampang dibaca
    asset_account_name = serializers.CharField(source='asset_account.name', read_only=True)
    accumulated_depreciation_account_name = serializers.CharField(source='accumulated_depreciation_account.name', read_only=True)
    depreciation_expense_account_name = serializers.CharField(source='depreciation_expense_account.name', read_only=True)

    # Ambil properti 'monthly_depreciation' dari model
    monthly_depreciation = serializers.ReadOnlyField()

    class Meta:
        model = FixedAsset
        fields = [
            'id', 'name', 'description',
            'asset_account', 'asset_account_name',
            'accumulated_depreciation_account', 'accumulated_depreciation_account_name',
            'depreciation_expense_account', 'depreciation_expense_account_name',
            'purchase_date', 'purchase_cost', 'salvage_value', 'useful_life_months',
            'is_fully_depreciated', 'last_depreciation_date',
            'monthly_depreciation' # Tampilkan hasil perhitungan
        ]
        read_only_fields = [
            'asset_account_name', 'accumulated_depreciation_account_name', 
            'depreciation_expense_account_name', 'is_fully_depreciated', 
            'last_depreciation_date', 'monthly_depreciation'
        ]
        
class SalesInvoiceItemSerializer(serializers.Serializer):
    """
    Serializer 'anak' untuk validasi TIAP BARIS barang yang dijual.
    """
    item_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.0'))
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal('11.00'))


class SalesInvoiceSerializer(serializers.Serializer):
    """
    Serializer 'induk' untuk validasi data Sales Invoice (Stok Keluar).
    """
    PAYMENT_TYPES = [
        ('TUNAI', 'Tunai'),
        ('KREDIT', 'Kredit'),
    ]

    date = serializers.DateField()
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    tipe_pembayaran = serializers.ChoiceField(choices=PAYMENT_TYPES)
    items = SalesInvoiceItemSerializer(many=True)
    contact_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_items(self, items):
        if not items or len(items) == 0:
            raise serializers.ValidationError("Invoice harus memiliki minimal 1 barang.")
        return items

class ReceivePaymentSerializer(serializers.Serializer):
    """
    Serializer untuk 'pintasan' Jurnal Penerimaan Kas
    (Saat Customer melunasi Piutang).
    """
    date = serializers.DateField()
    contact_id = serializers.IntegerField() # <-- ID Customer yang bayar
    account_debit_id = serializers.IntegerField() # <-- ID Akun Kas/Bank (tempat duit masuk)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))


class MakePaymentSerializer(serializers.Serializer):
    """
    Serializer untuk 'pintasan' Jurnal Pengeluaran Kas
    (Saat kita melunasi Utang ke Vendor).
    """
    date = serializers.DateField()
    contact_id = serializers.IntegerField() # <-- ID Vendor yang kita bayar
    account_credit_id = serializers.IntegerField() # <-- ID Akun Kas/Bank (tempat duit keluar)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))

class SalesReturnSerializer(serializers.Serializer):
    date = serializers.DateField()
    contact_id = serializers.IntegerField()
    items = serializers.ListField(child=serializers.DictField()) 
    description = serializers.CharField(required=False, allow_blank=True)
    tipe_pengembalian = serializers.ChoiceField(choices=['TUNAI', 'KREDIT'])
