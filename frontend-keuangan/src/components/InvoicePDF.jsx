// File: src/components/InvoicePDF.jsx
import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

// Format Rupiah
const formatRupiah = (value) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

// Style PDF
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  companyTitle: { fontSize: 18, fontWeight: 'bold', color: '#2c3e50' },
  invoiceTitle: { fontSize: 24, fontWeight: 'light', textTransform: 'uppercase', textAlign: 'right' },
  section: { margin: 10, padding: 10, flexGrow: 1 },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 5 },
  headerRow: { flexDirection: 'row', backgroundColor: '#2c3e50', color: 'white', padding: 5 },
  cellDesc: { width: '50%' },
  cellQty: { width: '10%', textAlign: 'center' },
  cellPrice: { width: '20%', textAlign: 'right' },
  cellTotal: { width: '20%', textAlign: 'right' },
  totalSection: { marginTop: 20, alignItems: 'flex-end' },
  totalRow: { flexDirection: 'row', paddingVertical: 3 },
  totalLabel: { width: 100, textAlign: 'right', paddingRight: 10, fontWeight: 'bold' },
  totalValue: { width: 100, textAlign: 'right' },
  footer: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#aaa' }
});

// Komponen Dokumen PDF
export const InvoicePDF = ({ data }) => {
  if (!data || !data.journal) return <Document><Page><Text>No Data</Text></Page></Document>;

  const { journal, items } = data;
  const salesItems = items.filter(item => Number(item.credit) > 0);
  const subTotal = salesItems.reduce((sum, item) => sum + Number(item.credit), 0);
  const grandTotal = subTotal; // Tambah pajak disini kalo ada

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyTitle}>EQUILIB FARM</Text>
            <Text>Jl. Agrikultur Modern No. 88</Text>
            <Text>Jawa Tengah, Indonesia</Text>
            <Text>Email: finance@equilib.com</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text>INV#{journal.id}</Text>
            <Text>Tgl: {dayjs(journal.date).format('DD MMMM YYYY')}</Text>
          </View>
        </View>

        <View style={{ borderBottomWidth: 2, borderBottomColor: '#333', marginBottom: 20 }}></View>

        {/* CUSTOMER INFO */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 12 }}>Tagihan Kepada:</Text>
          <Text style={{ fontSize: 14, marginVertical: 5 }}>{journal.contact_name || 'Pelanggan Tunai'}</Text>
        </View>

        {/* TABEL HEADER */}
        <View style={styles.headerRow}>
          <Text style={styles.cellDesc}>DESKRIPSI</Text>
          <Text style={styles.cellQty}>QTY</Text>
          <Text style={styles.cellPrice}>HARGA</Text>
          <Text style={styles.cellTotal}>JUMLAH</Text>
        </View>

        {/* TABEL BODY */}
        {salesItems.map((item, index) => (
          <View key={index} style={styles.row}>
            <Text style={styles.cellDesc}>{item.account_name}</Text>
            <Text style={styles.cellQty}>1</Text>
            <Text style={styles.cellPrice}>{formatRupiah(item.credit)}</Text>
            <Text style={styles.cellTotal}>{formatRupiah(item.credit)}</Text>
          </View>
        ))}

        {/* TOTALS */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatRupiah(subTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Pajak (0%):</Text>
            <Text style={styles.totalValue}>{formatRupiah(0)}</Text>
          </View>
          <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: '#ccc', paddingTop: 5 }]}>
            <Text style={[styles.totalLabel, { fontSize: 14 }]}>TOTAL:</Text>
            <Text style={[styles.totalValue, { fontSize: 14, fontWeight: 'bold' }]}>{formatRupiah(grandTotal)}</Text>
          </View>
        </View>

        {/* PAYMENT INFO */}
        <View style={{ marginTop: 40, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 5 }}>
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>Instruksi Pembayaran:</Text>
            <Text>BCA: 1234-5678-90 a/n Joko Susilo</Text>
            <Text>Mandiri: 0987-6543-21 a/n Joko Susilo</Text>
        </View>

        {/* FOOTER */}
        <Text style={styles.footer}>
          Dokumen ini sah dan diproses oleh komputer. Terima kasih atas kepercayaan Anda.
        </Text>
      </Page>
    </Document>
  );
};