# accounting/models.py

from django.db import models
from decimal import Decimal
from django.db.models import F, Sum


class Account(models.Model):
    class AccountType(models.TextChoices):
        ASET = 'ASET', 'Aset'
        LIABILITAS = 'LIABILITAS', 'Liabilitas'
        EKUITAS = 'EKUITAS', 'Ekuitas'
        PENDAPATAN = 'PENDAPATAN', 'Pendapatan'
        BEBAN = 'BEBAN', 'Beban (HPP)'
        BEBAN_OPERASIONAL = 'BEBAN_OPERASIONAL', 'Beban Operasional'
        BEBAN_LAIN = 'BEBAN_LAIN', 'Beban Lainnya'

    class NormalBalance(models.TextChoices):
        DEBIT = 'DEBIT', 'Debit'
        KREDIT = 'KREDIT', 'Kredit'

    name = models.CharField(max_length=100)
    number = models.CharField(max_length=20, unique=True, help_text="Contoh: 1-1000")
    type = models.CharField(max_length=20, choices=AccountType.choices)
    normal_balance = models.CharField(max_length=10, choices=NormalBalance.choices)

    def __str__(self):
        return f"{self.number} - {self.name}"

    class Meta:
        ordering = ['number']

class Contact(models.Model):
    """
    Database untuk Customer, Vendor, atau Karyawan.
    """
    CONTACT_TYPES = [
        ('CUSTOMER', 'Customer'),
        ('VENDOR', 'Vendor'),
        ('OTHER', 'Lainnya'),
    ]

    name = models.CharField(max_length=255, unique=True)
    type = models.CharField(max_length=20, choices=CONTACT_TYPES)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return f"{self.name} ({self.type})"

    class Meta:
        ordering = ['name']

class FixedAsset(models.Model):
    """
    Database untuk Aset Tetap (Kendaraan, Peralatan, dll)
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)

    # Akun terkait
    asset_account = models.ForeignKey(
        Account, 
        on_delete=models.PROTECT,
        related_name='fixed_assets',
        limit_choices_to={'type': 'ASET', 'normal_balance': 'DEBIT'}
    )
    accumulated_depreciation_account = models.ForeignKey(
        Account, 
        on_delete=models.PROTECT,
        related_name='fixed_assets_akum',
        limit_choices_to={'type': 'ASET', 'normal_balance': 'KREDIT'}
    )
    depreciation_expense_account = models.ForeignKey(
        Account, 
        on_delete=models.PROTECT,
        related_name='fixed_assets_beban',
        limit_choices_to={'type__in': ['BEBAN', 'BEBAN_OPERASIONAL', 'BEBAN_LAIN']}
    )

    # Info Kalkulasi
    purchase_date = models.DateField()
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.0'))
    salvage_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.0')) # Nilai Sisa
    useful_life_months = models.IntegerField(default=60) # Umur Manfaat (dalam BULAN)

    # Info Status
    is_fully_depreciated = models.BooleanField(default=False)
    last_depreciation_date = models.DateField(null=True, blank=True) # Tanggal terakhir AJE diposting

    def __str__(self):
        return f"{self.name} ({self.asset_account.name})"

    @property
    def monthly_depreciation(self):
        """
        Menghitung penyusutan per bulan (Metode Garis Lurus)
        """
        if self.useful_life_months == 0:
            return Decimal('0.0')

        depreciable_cost = self.purchase_cost - self.salvage_value
        return depreciable_cost / self.useful_life_months

class JournalEntry(models.Model):
    id = models.BigAutoField(primary_key=True)
    date = models.DateField()
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    contact = models.ForeignKey(
        Contact, 
        on_delete=models.SET_NULL, # Kalo kontaknya dihapus, jurnalnya JANGAN ikut kehapus
        null=True, 
        blank=True,
        related_name='journal_entries'
    )

    def __str__(self):
        return f"Jurnal {self.id} - {self.date} - {self.description}"

    class Meta:
        ordering = ['-date']

class JournalItem(models.Model):
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='items')
    account = models.ForeignKey(Account, on_delete=models.PROTECT, help_text="Akun yang terpengaruh")
    debit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.0'))
    credit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.0'))

    def __str__(self):
        if self.debit > 0:
            return f"{self.account.name} (Debit) - {self.debit}"
        return f"{self.account.name} (Kredit) - {self.credit}"
    
class InventoryItem(models.Model):
    """
    Daftar semua barang (SKU) yang kita punya.
    Contoh: Bibit Selada, Selada Siap Jual, Plastik Kemasan.
    """
    name = models.CharField(max_length=100, unique=True)
    sku = models.CharField(max_length=50, unique=True, blank=True, null=True, help_text="Stock Keeping Unit (Kode Barang)")

    # Akun Aset yang terhubung (Misal: '1-1200 - Persediaan Barang')
    asset_account = models.ForeignKey(
        Account, 
        on_delete=models.PROTECT,
        limit_choices_to={'type': 'ASET'}
    )
    # Akun HPP/Beban yang terhubung (Misal: '5-1000 - HPP')
    hpp_account = models.ForeignKey(
        Account, 
        on_delete=models.PROTECT,
        limit_choices_to={'type__in': ['BEBAN', 'BEBAN_OPERASIONAL', 'BEBAN_LAIN']},
        related_name='hpp_items'
    )

    # --- Pelacakan Stok (Metode Perpetual Rata-Rata) ---
    quantity_on_hand = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.0'))
    average_cost = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.0'))
    total_value = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.0'))

    def __str__(self):
        return f"{self.name} (Stok: {self.quantity_on_hand})"

    def recalculate_inventory(self):
        """
        Menghitung ulang nilai rata-rata.
        Dipanggil setiap ada pembelian.
        """
        # Ambil semua log Beli (Masuk)
        logs = self.inventory_logs.filter(transaction_type='BELI').aggregate(
            total_qty=Sum('quantity', default=Decimal('0.0')),
            total_cost=Sum('total_cost', default=Decimal('0.0'))
        )

        # Ambil semua log Jual (Keluar)
        sold_logs = self.inventory_logs.filter(transaction_type='JUAL').aggregate(
            total_qty=Sum('quantity', default=Decimal('0.0'))
        )

        # Hitung stok & nilai saat ini
        self.quantity_on_hand = logs['total_qty'] - sold_logs['total_qty']

        if logs['total_qty'] > 0:
            # Ini adalah inti dari "Weighted-Average Cost"
            self.average_cost = logs['total_cost'] / logs['total_qty']
        else:
            self.average_cost = Decimal('0.0')

        self.total_value = self.quantity_on_hand * self.average_cost
        self.save()


class InventoryLog(models.Model):
    """
    Log Book (Buku Catatan) untuk semua pergerakan stok.
    Ini adalah "Buku Besar Pembantu" untuk Persediaan.
    """
    TRANSACTION_TYPES = [
        ('BELI', 'Pembelian Stok'),
        ('JUAL', 'Penjualan (HPP)'),
        ('PENYESUAIAN', 'Penyesuaian Stok (Rusak/Hilang)'),
        ('RETUR_JUAL', 'Retur Penjualan'),
    ]

    item = models.ForeignKey(InventoryItem, on_delete=models.CASCADE, related_name='inventory_logs')
    date = models.DateField()
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    quantity = models.DecimalField(max_digits=12, decimal_places=2) # Qty yg bergerak

    # Untuk 'BELI': Ini adalah total biaya pembelian
    # Untuk 'JUAL': Ini adalah total HPP (qty * average_cost saat itu)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)

    # Link ke Jurnal Umum-nya
    journal_entry = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.date} - {self.item.name} - {self.transaction_type} ({self.quantity})"

