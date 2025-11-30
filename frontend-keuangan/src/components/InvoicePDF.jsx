// File: src/components/InvoicePDF.jsx
// (VERSI: BLUE CORPORATE STYLE - Mirip Referensi Gambar)

import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');

const formatRupiah = (value) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

// --- WARNA TEMA (Biru Profesional) ---
const PRIMARY_COLOR = '#2e4053'; // Biru Gelap
const ACCENT_COLOR = '#f2f4f7';  // Abu sangat muda (buat selang-seling)
const BORDER_COLOR = '#bfbfbf';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#333' },
  
  // 1. Header Atas
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  companyColumn: { width: '55%' },
  invoiceDataColumn: { width: '40%' },
  
  companyName: { fontSize: 24, color: PRIMARY_COLOR, marginBottom: 5 },
  companyAddress: { fontSize: 10, lineHeight: 1.4, color: '#555' },
  
  invoiceTitle: { fontSize: 28, color: '#8899a6', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'right', marginBottom: 10 },
  
  // Tabel Mini di Header Kanan
  metaTable: { border: `1px solid ${BORDER_COLOR}`, borderBottom: 0 },
  metaRow: { flexDirection: 'row', borderBottom: `1px solid ${BORDER_COLOR}` },
  metaLabel: { width: '40%', padding: 4, backgroundColor: '#e0e0e0', textAlign: 'right', fontWeight: 'bold', fontSize: 9 },
  metaValue: { width: '60%', padding: 4, textAlign: 'center', fontSize: 9 },

  // 2. Bill To Section
  billToContainer: { marginBottom: 25 },
  sectionHeader: { backgroundColor: PRIMARY_COLOR, color: 'white', padding: 5, fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', width: '50%' },
  billToContent: { paddingLeft: 5, paddingTop: 5, width: '50%' },
  billToName: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },

  // 3. Main Table
  tableContainer: { marginTop: 10, borderBottom: `2px solid ${PRIMARY_COLOR}` },
  tableHeader: { flexDirection: 'row', backgroundColor: PRIMARY_COLOR, color: 'white', paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center' },
  rowStriped: { backgroundColor: ACCENT_COLOR }, // Warna selang-seling

  // Kolom Tabel
  colDesc: { width: '50%' },
  colQty: { width: '10%', textAlign: 'center' },
  colPrice: { width: '20%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },

  // 4. Footer Section (Comments & Totals)
  footerContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
  
  // Kiri: Comments
  commentsSection: { width: '55%' },
  commentsHeader: { backgroundColor: PRIMARY_COLOR, color: 'white', padding: 5, fontSize: 10, fontWeight: 'bold', marginBottom: 5 },
  commentsBox: { border: `1px solid ${BORDER_COLOR}`, padding: 8, height: 80, fontSize: 9, lineHeight: 1.5 },

  // Kanan: Totals
  totalsSection: { width: '35%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  totalLabel: { fontWeight: 'bold', fontSize: 10, color: '#555' },
  totalValue: { fontSize: 10, textAlign: 'right' },
  
  // Kotak Total Akhir
  grandTotalBox: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, borderTop: '2px solid #333', paddingTop: 5 },
  grandTotalLabel: { fontSize: 12, fontWeight: 'bold' },
  grandTotalValue: { fontSize: 12, fontWeight: 'bold', color: PRIMARY_COLOR },

  // Footer Paling Bawah
  pageFooter: { position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontSize: 8, color: '#aaa', fontStyle: 'italic' }
});

export const InvoicePDF = ({ data }) => {
  if (!data || !data.journal) return <Document><Page><Text>No Data</Text></Page></Document>;

  const { journal, items } = data;

  // --- LOGIKA FILTERING (Biar PPN misah) ---
  const creditItems = items.filter(item => Number(item.credit) > 0);
  
  // Filter PPN (Asumsi nama akun mengandung 'PPN' atau 'Pajak')
  const taxItems = creditItems.filter(item => 
    item.account_name.toLowerCase().includes('ppn') || 
    item.account_name.toLowerCase().includes('pajak')
  );
  
  // Filter Barang Asli
  const productItems = creditItems.filter(item => 
    !item.account_name.toLowerCase().includes('ppn') && 
    !item.account_name.toLowerCase().includes('pajak')
  );

  const subTotal = productItems.reduce((sum, item) => sum + Number(item.credit), 0);
  const totalTax = taxItems.reduce((sum, item) => sum + Number(item.credit), 0);
  const grandTotal = subTotal + totalTax;
  
  // Jatuh Tempo (H+30 default, atau sesuaikan)
  const dueDate = dayjs(journal.date).add(30, 'day');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* 1. HEADER ATAS */}
        <View style={styles.headerContainer}>
          <View style={styles.companyColumn}>
            <Text style={styles.companyName}>EQUILIB FARM</Text>
            <Text style={styles.companyAddress}>
              Jl. Agrikultur Modern No. 88{'\n'}
              Jawa Tengah, Indonesia 50123{'\n'}
              Phone: (021) 555-0199 | Fax: (021) 555-0198{'\n'}
              Website: www.equilibfarm.com
            </Text>
          </View>
          
          <View style={styles.invoiceDataColumn}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <View style={styles.metaTable}>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>DATE</Text>
                    <Text style={styles.metaValue}>{dayjs(journal.date).format('DD/MM/YYYY')}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>INVOICE #</Text>
                    <Text style={styles.metaValue}>{journal.id}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>CUSTOMER ID</Text>
                    <Text style={styles.metaValue}>{journal.contact ? journal.contact : '-'}</Text>
                </View>
                <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>DUE DATE</Text>
                    <Text style={styles.metaValue}>{dueDate.format('DD/MM/YYYY')}</Text>
                </View>
            </View>
          </View>
        </View>

        {/* 2. BILL TO */}
        <View style={styles.billToContainer}>
            <Text style={styles.sectionHeader}>BILL TO</Text>
            <View style={styles.billToContent}>
                <Text style={styles.billToName}>{journal.contact_name || 'Pelanggan Tunai'}</Text>
                <Text style={{fontSize: 10, color: '#555'}}>
                    {/* Hardcode alamat karena di backend belum ada */}
                    [Alamat Pelanggan Belum Tersedia]{'\n'}
                    Kota, Kode Pos{'\n'}
                    Indonesia
                </Text>
            </View>
        </View>

        {/* 3. MAIN TABLE */}
        <View style={styles.tableContainer}>
            {/* Header */}
            <View style={styles.tableHeader}>
                <Text style={styles.colDesc}>DESCRIPTION</Text>
                <Text style={styles.colQty}>QTY</Text>
                <Text style={styles.colPrice}>UNIT PRICE</Text>
                <Text style={styles.colTotal}>AMOUNT</Text>
            </View>

            {/* Rows (Zebra Striping) */}
            {productItems.map((item, index) => (
                <View key={index} style={[styles.tableRow, index % 2 !== 0 ? styles.rowStriped : {}]}>
                    <Text style={styles.colDesc}>{item.account_name}</Text>
                    <Text style={styles.colQty}>-</Text>
                    <Text style={styles.colPrice}>-</Text>
                    <Text style={styles.colTotal}>{formatRupiah(item.credit)}</Text>
                </View>
            ))}
            
            {/* Spacer Rows (Biar tabelnya gak kepotong pendek banget, opsional) */}
            <View style={[styles.tableRow, productItems.length % 2 !== 0 ? styles.rowStriped : {}]}><Text> </Text></View>
            <View style={[styles.tableRow, productItems.length % 2 === 0 ? styles.rowStriped : {}]}><Text> </Text></View>
        </View>

        {/* 4. FOOTER (COMMENTS & TOTALS) */}
        <View style={styles.footerContainer}>
            
            {/* Kiri: Instruksi Pembayaran */}
            <View style={styles.commentsSection}>
                <Text style={styles.commentsHeader}>OTHER COMMENTS / PAYMENT INFO</Text>
                <View style={styles.commentsBox}>
                    <Text style={{fontWeight:'bold', marginBottom: 2}}>Total payment due in 30 days</Text>
                    <Text>Silakan transfer pembayaran ke:</Text>
                    <Text style={{marginTop: 4}}>• BCA: 1234-5678-90 (Joko Susilo)</Text>
                    <Text>• Mandiri: 0987-6543-21 (Joko Susilo)</Text>
                    <Text style={{marginTop: 4, fontSize: 8, fontStyle: 'italic'}}>Harap cantumkan No. Invoice pada berita transfer.</Text>
                </View>
            </View>

            {/* Kanan: Totals */}
            <View style={styles.totalsSection}>
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal</Text>
                    <Text style={styles.totalValue}>{formatRupiah(subTotal)}</Text>
                </View>
                
                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Taxable</Text>
                    <Text style={styles.totalValue}>{formatRupiah(subTotal)}</Text>
                </View>

                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax Rate</Text>
                    <Text style={styles.totalValue}>{totalTax > 0 ? '11%' : '0%'}</Text>
                </View>

                <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax Due</Text>
                    <Text style={styles.totalValue}>{formatRupiah(totalTax)}</Text>
                </View>

                <View style={styles.grandTotalBox}>
                    <Text style={styles.grandTotalLabel}>TOTAL</Text>
                    <Text style={styles.grandTotalValue}>{formatRupiah(grandTotal)}</Text>
                </View>
            </View>
        </View>

        {/* Footer Paling Bawah */}
        <Text style={styles.pageFooter}>
            Jika ada pertanyaan mengenai invoice ini, silakan hubungi [Nama, HP, Email]
            {'\n'}Thank You For Your Business!
        </Text>

      </Page>
    </Document>
  );
};