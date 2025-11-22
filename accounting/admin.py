# accounting/admin.py

from django.contrib import admin
from .models import Account, JournalEntry, JournalItem, Contact, InventoryItem, FixedAsset

class JournalItemInline(admin.TabularInline):
    model = JournalItem
    extra = 2 

@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ('date', 'description')
    inlines = [JournalItemInline]

@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ('number', 'name', 'type', 'normal_balance')
    list_filter = ('type',)

@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ('name', 'type', 'email', 'phone')
    list_filter = ('type',)

@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'sku', 'quantity_on_hand', 'average_cost', 'total_value')

@admin.register(FixedAsset)
class FixedAssetAdmin(admin.ModelAdmin):
    list_display = ('name', 'asset_account', 'purchase_cost', 'monthly_depreciation', 'last_depreciation_date')
    list_filter = ('asset_account',)