# accounting/serializers.py

from decimal import Decimal
from rest_framework import serializers
from .models import Account, JournalEntry, JournalItem, InventoryItem, InventoryLog, Contact, FixedAsset
from django.db import transaction

# --- 1. JOURNAL SERIALIZERS (YANG KITA UPDATE BUAT INVOICE) ---

class JournalItemSerializer(serializers.ModelSerializer):
    # Nama Akun & Nomor Akun (Read Only)
    account_name = serializers.ReadOnlyField(source='account.name')
    account_number = serializers.ReadOnlyField(source='account.number')

    class Meta:
        model = JournalItem
        fields = ['id', 'account', 'account_name', 'account_number', 'debit', 'credit']

class JournalEntrySerializer(serializers.ModelSerializer):
    items = JournalItemSerializer(many=True) # Jangan lupa read_only=True kalau cuma buat display, tapi kalau buat create biarin gini
    
    # Method Field biar Anti-Crash kalau kontak kosong
    contact_name = serializers.SerializerMethodField()
    contact_phone = serializers.SerializerMethodField()
    invoice_details = serializers.SerializerMethodField()

    class Meta:
        model = JournalEntry
        # PERBAIKAN TYPO: 'contact_phone' (pake underscore)
        fields = ['id', 'date', 'description', 'contact', 'contact_name', 'contact_phone', 'created_at', 'items', 'invoice_details']

    def get_contact_name(self, obj):
        if obj.contact: 
            return obj.contact.name
        return "-" 

    def get_contact_phone(self, obj):
        if obj.contact:
            return obj.contact.phone
        return ""
    
    def get_invoice_details(self, obj):
        logs = InventoryLog.objects.filter(
            journal_entry__date=obj.date,
            journal_entry__contact=obj.contact,
            transaction_type='JUAL'
        )
        
        # 2. Ambil Total Penjualan (Omzet) dari Jurnal Ini
        total_sales = 0
        for item in obj.items.all():
            if item.account.type == 'PENDAPATAN':
                total_sales += item.credit

        # 3. Gabungkan
        # Ini estimasi: Kita bagi rata total penjualan dengan total qty.
        # (Kelemahan: Kalau jual Selada Merah 10rb & Selada Hijau 5rb, harganya bakal dirata-rata).
        # Tapi ini solusi terbaik tanpa nambah tabel baru.
        
        result = []
        total_qty = sum(log.quantity for log in logs)
        
        if total_qty > 0:
            avg_price = total_sales / total_qty
            
            for log in logs:
                result.append({
                    'name': log.item.name,      # Nama: Selada Merah
                    'qty': log.quantity,        # Qty: 10
                    'price': avg_price,         # Harga: 3000 (Hasil bagi rata)
                    'total': log.quantity * avg_price
                })
        
        # Kalau gak nemu log (misal jasa), balikin kosong biar frontend pake fallback
        return result
    
    def validate(self, attrs):
        # Validasi manual cuma dipake kalau create lewat sini (Manual Journal)
        # Kalau lewat shortcut (Sales/Purchase), validasi ini gak kepake
        if 'items' in attrs:
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


# --- 2. MASTER DATA SERIALIZERS ---

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ['id', 'number', 'name', 'type', 'normal_balance']

class InventoryItemSerializer(serializers.ModelSerializer):
    asset_account_name = serializers.CharField(source='asset_account.name', read_only=True)
    hpp_account_name = serializers.CharField(source='hpp_account.name', read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            'id', 'name', 'sku', 
            'asset_account', 'asset_account_name', 
            'hpp_account', 'hpp_account_name',
            'quantity_on_hand', 'average_cost', 'total_value'
        ]
        read_only_fields = [
            'asset_account_name', 'hpp_account_name',
            'quantity_on_hand', 'average_cost', 'total_value'
        ]

class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = ['id', 'name', 'type', 'email', 'phone']

class FixedAssetSerializer(serializers.ModelSerializer):
    asset_account_name = serializers.CharField(source='asset_account.name', read_only=True)
    accumulated_depreciation_account_name = serializers.CharField(source='accumulated_depreciation_account.name', read_only=True)
    depreciation_expense_account_name = serializers.CharField(source='depreciation_expense_account.name', read_only=True)
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
            'monthly_depreciation' 
        ]
        read_only_fields = [
            'asset_account_name', 'accumulated_depreciation_account_name', 
            'depreciation_expense_account_name', 'is_fully_depreciated', 
            'last_depreciation_date', 'monthly_depreciation'
        ]


# --- 3. SHORTCUT & TRANSACTION SERIALIZERS ---

class SalesShortcutSerializer(serializers.Serializer):
    PAYMENT_TYPES = [('TUNAI', 'Tunai'), ('KREDIT', 'Kredit')]
    date = serializers.DateField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    tipe_pembayaran = serializers.ChoiceField(choices=PAYMENT_TYPES)
    description = serializers.CharField(max_length=255)

class PurchaseShortcutSerializer(serializers.Serializer):
    PAYMENT_TYPES = [('TUNAI', 'Tunai'), ('KREDIT', 'Kredit')]
    date = serializers.DateField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    account_debit_id = serializers.IntegerField() 
    tipe_pembayaran = serializers.ChoiceField(choices=PAYMENT_TYPES)
    contact_id = serializers.IntegerField(required=False, allow_null=True) 
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)

    def validate(self, data):
        if not data.get('contact_id') and not data.get('description'):
            raise serializers.ValidationError("Harap isi 'Keterangan' jika 'Vendor' tidak dipilih.")
        return data

class InventoryPurchaseSerializer(serializers.Serializer):
    PAYMENT_TYPES = [('TUNAI', 'Tunai'), ('KREDIT', 'Kredit')]
    date = serializers.DateField()
    description = serializers.CharField(max_length=255, required=False, allow_blank=True)
    item_id = serializers.IntegerField() 
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.0'))
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal('11.00'))
    tipe_pembayaran = serializers.ChoiceField(choices=PAYMENT_TYPES)
    contact_id = serializers.IntegerField(required=False, allow_null=True)

class SalesInvoiceItemSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
    quantity = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.0'))
    tax_rate = serializers.DecimalField(max_digits=5, decimal_places=2, default=Decimal('11.00'))

class SalesInvoiceSerializer(serializers.Serializer):
    PAYMENT_TYPES = [('TUNAI', 'Tunai'), ('KREDIT', 'Kredit')]
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
    date = serializers.DateField()
    contact_id = serializers.IntegerField() 
    account_debit_id = serializers.IntegerField() 
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))

class MakePaymentSerializer(serializers.Serializer):
    date = serializers.DateField()
    contact_id = serializers.IntegerField()
    account_credit_id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=Decimal('0.01'))

class SalesReturnSerializer(serializers.Serializer):
    date = serializers.DateField()
    contact_id = serializers.IntegerField()
    items = serializers.ListField(child=serializers.DictField()) 
    description = serializers.CharField(required=False, allow_blank=True)
    tipe_pengembalian = serializers.ChoiceField(choices=['TUNAI', 'KREDIT'])