# File: accounting/urls.py
# (VERSI FINAL - Anti RecursionError & 100% Lengkap)

from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import SEMUA view kita
from .views import (
    # CRUD ViewSets
    AccountViewSet, JournalEntryViewSet, JournalItemViewSet, 
    InventoryItemViewSet, ContactViewSet, FixedAssetViewSet,
    
    # "Pintasan" Lama (Non-Inventori)
    CreateSalesShortcutView, CreatePurchaseShortcutView, 
    
    # "Pintasan" Inventori (Sihir)
    PurchaseInventoryView, CreateSalesInvoiceView,
    
    # "Pintasan" Pelunasan (AR/AP)
    ReceivePaymentView, MakePaymentView,
    
    # "Kalkulator" Laporan
    IncomeStatementView, BalanceSheetView, GeneralLedgerView, 
    TrialBalanceView, DashboardSummaryView, CashFlowStatementView, 
    SubsidiaryLedgerView,
    
    # "Tindakan" (AJE Otomatis)
    RunDepreciationView, CreateSalesReturnView
)

# --- INI BAGIAN PENTING ---
# 1. Daftarin semua ViewSet CRUD kita ke Router
router = DefaultRouter()
router.register(r'accounts', AccountViewSet)
router.register(r'journal-entries', JournalEntryViewSet)
router.register(r'journal-items', JournalItemViewSet)
router.register(r'inventory-items', InventoryItemViewSet)
router.register(r'contacts', ContactViewSet)
router.register(r'fixed-assets', FixedAssetViewSet)

# 2. 'urlpatterns' kita sekarang adalah GABUNGAN
#    dari 'router.urls' (CRUD) dan 'path' manual (Sihir/Kalkulator)

urlpatterns = router.urls + [
    
    # API PINTASAN LAMA (NON-INVENTORI)
    path('sales/', CreateSalesShortcutView.as_view(), name='create-sales-shortcut'),
    path('purchases/', CreatePurchaseShortcutView.as_view(), name='create-purchase-shortcut'),
    
    # API LAPORAN
    path('reports/income-statement/', IncomeStatementView.as_view(), name='report-income-statement'),
    path('reports/balance-sheet/', BalanceSheetView.as_view(), name='report-balance-sheet'),
    path('reports/general-ledger/', GeneralLedgerView.as_view(), name='report-general-ledger'),
    path('reports/trial-balance/', TrialBalanceView.as_view(), name='report-trial-balance'),
    path('reports/dashboard-summary/', DashboardSummaryView.as_view(), name='report-dashboard-summary'),
    path('reports/cash-flow-statement/', CashFlowStatementView.as_view(), name='report-cash-flow-statement'),
    path('reports/subsidiary-ledger/', SubsidiaryLedgerView.as_view(), name='report-subsidiary-ledger'),
    
    # API TINDAKAN
    path('actions/run-depreciation/', RunDepreciationView.as_view(), name='action-run-depreciation'),
    
    # API TRANSAKSI (PELUNASAN)
    path('transactions/receive-payment/', ReceivePaymentView.as_view(), name='tx-receive-payment'),
    path('transactions/make-payment/', MakePaymentView.as_view(), name='tx-make-payment'),
    
    # API INVENTORI (SIHIR)
    path('inventory/purchase/', PurchaseInventoryView.as_view(), name='inventory-purchase-stock'),
    path('inventory/sell/', CreateSalesInvoiceView.as_view(), name='inventory-sell-stock'),
    path('sales/return/', CreateSalesReturnView.as_view(), name='sales-return'),
    path('sales/invoice/', CreateSalesInvoiceView.as_view(), name='sales-invoice-create'),
]