// File: src/components/InvoicePDF.jsx
// (VERSI FIX: PPN Turun ke Bawah & Tampilan Lebih Masuk Akal)

import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

const formatRupiah = (value) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  
  // Header Section
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  companySection: { width: '60%' },
  companyTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50', marginBottom: 4 },
  companyAddress: { fontSize: 9, color: '#555', lineHeight: 1.4 },
  
  invoiceSection: { width: '40%', alignItems: 'flex-end' },
  invoiceTitle: { fontSize: 24, fontWeight: 'light', textTransform: 'uppercase', color: '#2c3e50', marginBottom: 10 },
  invoiceDetails: { flexDirection: 'row', marginBottom: 2 },
  label: { width: 80, textAlign: 'right', paddingRight: 10, color: '#777', fontSize: 9 },
  value: { width: 90, textAlign: 'right', fontWeight: 'bold', fontSize: 9 },

  // Bill To
  billTo: { marginTop: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  billToLabel: { fontSize: 8, color: '#aaa', textTransform: 'uppercase', marginBottom: 4 },
  billToName: { fontSize: 12, fontWeight: 'bold', color: '#333' },

  // Table
  tableContainer: { marginTop: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#2c3e50', color: 'white', padding: 6, alignItems: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 8, alignItems: 'center' },
  
  // Column Widths
  colDesc: { width: '60%', paddingLeft: 5 },
  colQty: { width: '10%', textAlign: 'center' }, // Kita keep dulu
  colTotal: { width: '30%', textAlign: 'right', paddingRight: 5 },

  // Totals
  totalContainer: { marginTop: 10, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', paddingVertical: 3 },
  totalLabelText: { width: 100, textAlign: 'right', paddingRight: 10, color: '#555' },
  totalValueText: { width: 100, textAlign: 'right' },
  grandTotalRow: { flexDirection: 'row', marginTop: 5, paddingTop: 5, borderTopWidth: 1, borderTopColor: '#333' },
  grandTotalValue: { width: 100, textAlign: 'right', fontWeight: 'bold', fontSize: 12, color: '#2c3e50' },

  // Footer
  paymentBox: { marginTop: 30, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 4 },
  footer: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#aaa' }
});

export const InvoicePDF = ({ data }) => {
  if (!data || !data.journal) return <Document><Page><Text>No Data</Text></Page></Document>;

  const { journal, items } = data;

  // --- LOGIKA FILTERING (INI KUNCINYA) ---
  // 1. Ambil semua item kredit (Pendapatan & PPN Keluaran)
  const creditItems = items.filter(item => Number(item.credit) > 0);

  // 2. Pisahkan PPN dari Barang
  // Asumsi: Akun pajak pasti mengandung kata "PPN" atau "Pajak" di namanya
  const taxItems = creditItems.filter(item => 
    item.account_name.toLowerCase().includes('ppn') || 
    item.account_name.toLowerCase().includes('pajak')
  );

  const productItems = creditItems.filter(item => 
    !item.account_name.toLowerCase().includes('ppn') && 
    !item.account_name.toLowerCase().includes('pajak')
  );

  // 3. Hitung Angka
  const subTotal = productItems.reduce((sum, item) => sum + Number(item.credit), 0);
  const totalTax = taxItems.reduce((sum, item) => sum + Number(item.credit), 0);
  const grandTotal = subTotal + totalTax;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.companySection}>
            <Text style={styles.companyTitle}>EQUILIB FARM</Text>
            <Text style={styles.companyAddress}>Jl. Agrikultur Modern No. 88</Text>
            <Text style={styles.companyAddress}>Jawa Tengah, Indonesia</Text>
            <Text style={styles.companyAddress}>Email: finance@equilib.com</Text>
          </View>
          <View style={styles.invoiceSection}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.invoiceDetails}>
              <Text style={styles.label}>No. Invoice:</Text>
              <Text style={styles.value}>#{journal.id}</Text>
            </View>
            <View style={styles.invoiceDetails}>
              <Text style={styles.label}>Tanggal:</Text>
              <Text style={styles.value}>{dayjs(journal.date).format('DD MMM YYYY')}</Text>
            </View>
          </View>
        </View>

        {/* BILL TO */}
        <View style={styles.billTo}>
          <Text style={styles.billToLabel}>TAGIHAN KEPADA:</Text>
          <Text style={styles.billToName}>{journal.contact_name || 'Pelanggan Tunai'}</Text>
        </View>

        {/* TABLE */}
        <View style={styles.tableContainer}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            <Text style={styles.colDesc}>DESKRIPSI BARANG</Text>
            <Text style={styles.colQty}>QTY</Text>
            <Text style={styles.colTotal}>JUMLAH</Text>
          </View>

          {/* Table Rows (Cuma Produk, PPN Gak Masuk Sini) */}
          {productItems.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={styles.colDesc}>{item.account_name}</Text>
              {/* Qty kita strip (-) karena di jurnal gak nyimpen qty */}
              <Text style={styles.colQty}>-</Text> 
              <Text style={styles.colTotal}>{formatRupiah(item.credit)}</Text>
            </View>
          ))}
        </View>

        {/* TOTALS SECTION */}
        <View style={styles.totalContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelText}>Subtotal:</Text>
            <Text style={styles.totalValueText}>{formatRupiah(subTotal)}</Text>
          </View>
          
          {/* PPN Muncul Di Sini Sekarang */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabelText}>PPN (11%):</Text>
            <Text style={styles.totalValueText}>{formatRupiah(totalTax)}</Text>
          </View>

          <View style={styles.grandTotalRow}>
            <Text style={styles.totalLabelText}>TOTAL TAGIHAN:</Text>
            <Text style={styles.grandTotalValue}>{formatRupiah(grandTotal)}</Text>
          </View>
        </View>

        {/* PAYMENT INFO */}
        <View style={styles.paymentBox}>
            <Text style={{ fontWeight: 'bold', fontSize: 9, marginBottom: 4 }}>Instruksi Pembayaran:</Text>
            <Text>BCA: 1234-5678-90 a/n Joko Susilo</Text>
            <Text>Mandiri: 0987-6543-21 a/n Joko Susilo</Text>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          Terima kasih telah berbisnis dengan Equilib Farm.
        </Text>
      </Page>
    </Document>
  );
};