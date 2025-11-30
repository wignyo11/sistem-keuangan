// File: src/components/ProfessionalInvoiceTemplate.jsx
// (VERSI GANTENG MIRIP GAMBAR REFERENSI - STABIL TANPA forwardRef)

import React from 'react';
import { Typography, Row, Col, Table, Divider, Space } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');
const { Title, Text } = Typography;

// Helper format Rupiah
const formatRupiah = (value) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

// KITA JADIIN KOMPONEN BIASA AJA (GAK PAKE forwardRef BIAR GAK ERROR)
export const ProfessionalInvoiceTemplate = ({ data }) => {
  
  // 1. SAFETY CHECK: Kalo data belum siap, jangan render yang berat-berat
  if (!data || !data.journal) {
      return (
        <div style={{ padding: '50px', textAlign: 'center', color: '#ccc' }}>
            Menyiapkan Data Invoice...
        </div>
      );
  }

  const { journal, items } = data;

  // Ambil item penjualan (kredit > 0)
  const salesItems = items.filter(item => Number(item.credit) > 0);
  
  // Mapping data buat tabel
  const tableData = salesItems.map((item, idx) => ({
    key: idx,
    description: item.account_name || 'Item Penjualan',
    // Hardcode Qty 1 biar tampilan pro kayak di gambar (karena backend blm support qty real)
    quantity: 1, 
    unitPrice: item.credit,
    total: item.credit
  }));

  // Hitung Total
  const subTotal = salesItems.reduce((sum, item) => sum + Number(item.credit), 0);
  // Kalo nanti Pak Joko PKP, pajaknya dihitung di sini. Sementara 0.
  const tax = 0; 
  const grandTotal = subTotal + tax;
  
  // Jatuh tempo misal H+14
  const dueDate = dayjs(journal.date).add(14, 'day');

  // ================= STYLE GANTENG ALA ODOO/ERP =================
  const styles = {
    page: {
        padding: '40px 50px', background: 'white', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", 
        color: '#555', fontSize: '13px', width: '210mm', minHeight: '297mm', boxSizing: 'border-box'
    },
    companyLogoImg: { width: '80px', marginBottom: '15px' },
    companyName: { fontSize: '22px', fontWeight: '700', color: '#333', marginBottom: '5px', letterSpacing: '-0.5px' },
    companyAddress: { fontSize: '13px', lineHeight: '1.6', color: '#777' },
    
    invoiceTitleBig: { fontSize: '36px', fontWeight: '300', color: '#333', textAlign: 'right', textTransform: 'uppercase', marginBottom: '20px' },
    invoiceInfoLabel: { fontWeight: '600', color: '#888', display: 'block', marginBottom: '3px', fontSize: '11px', textTransform: 'uppercase' },
    invoiceInfoValue: { fontSize: '15px', fontWeight: '500', color: '#333' },
    
    sectionHeaderBox: { background: '#f8f9fa', padding: '12px 20px', borderBottom: '2px solid #e9ecef', marginTop: '40px' },
    sectionHeaderText: { fontWeight: 'bold', textTransform: 'uppercase', color: '#555', fontSize: '12px' },
    billToBox: { padding: '20px' },
    billToName: { fontSize: '18px', fontWeight: 'bold', color: '#333', marginBottom: '5px' },
    billToAddress: { fontSize: '13px', color: '#777', lineHeight: '1.6' },

    tableHeader: { background: '#333', color: 'white', fontWeight: '600', textTransform: 'uppercase', fontSize: '11px', padding: '12px 8px' },
    tableBody: { fontSize: '13px', color: '#333' },

    paymentBox: { background: '#f8f9fa', padding: '25px', borderRadius: '4px', border: '1px solid #e9ecef', height: '100%' },
    paymentTitle: { fontSize: '16px', fontWeight: 'bold', color: '#333', marginBottom: '15px' },
    paymentBank: { fontSize: '14px', fontWeight: '600', color: '#555', marginBottom: '5px' },
    paymentNote: { fontSize: '11px', color: '#999', fontStyle: 'italic', marginTop: '20px' },

    totalsBox: { padding: '20px 0' },
    totalLabel: { fontWeight: '600', textAlign: 'right', paddingRight: '20px', fontSize: '13px', color: '#777' },
    totalValue: { fontWeight: '600', textAlign: 'right', fontSize: '15px', color: '#333' },
    grandTotalLabel: { fontWeight: '700', textAlign: 'right', paddingRight: '20px', fontSize: '16px', color: '#333', textTransform: 'uppercase' },
    grandTotalValue: { fontWeight: '800', textAlign: 'right', fontSize: '22px', color: '#2c3e50' },

    footerText: { textAlign: 'center', marginTop: '60px', borderTop: '1px solid #eee', paddingTop: '20px', color: '#aaa', fontSize: '11px' }
  };

  // Kolom Tabel dengan Style Khusus
  const columns = [
    { 
      title: 'Deskripsi Barang / Jasa', 
      dataIndex: 'description', 
      key: 'description',
      onHeaderCell: () => ({ style: styles.tableHeader }),
      render: (text) => <span style={{fontWeight: 500}}>{text}</span>
    },
    { 
      title: 'Kuantitas', 
      dataIndex: 'quantity', 
      key: 'quantity', align: 'center', width: 100,
      onHeaderCell: () => ({ style: styles.tableHeader }),
      render: () => '1.00' 
    },
    { 
      title: 'Harga Satuan', 
      dataIndex: 'unitPrice', 
      key: 'unitPrice', align: 'right', width: 150,
      onHeaderCell: () => ({ style: styles.tableHeader }),
      render: (val) => formatRupiah(val)
    },
    { 
      title: 'Subtotal', 
      dataIndex: 'total', 
      key: 'total', align: 'right', width: 150,
      onHeaderCell: () => ({ style: styles.tableHeader }),
      render: (val) => <span style={{fontWeight: 600}}>{val > 0 ? formatRupiah(val) : '-'}</span>
    },
  ];

  return (
    <div style={styles.page}>
      {/* --- HEADER --- */}
      <Row justify="space-between" align="top">
        {/* KIRI: Info Perusahaan */}
        <Col span={12}>
            {/* Ganti src ini dengan logo Equilib nanti */}
            <img src="https://cdn-icons-png.flaticon.com/512/2823/2823517.png" alt="Logo" style={styles.companyLogoImg} />
            <div style={styles.companyName}>EQUILIB FARM SEJAHTERA</div>
            <div style={styles.companyAddress}>
                Jl. Agrikultur Modern Kav. 88<br/>
                Jawa Tengah, Indonesia 50123<br/>
                Telp: (024) 1234-5678 | Email: finance@equilibfarm.com
            </div>
        </Col>
        {/* KANAN: Judul Invoice & Detail */}
        <Col span={12} style={{ textAlign: 'right' }}>
            <div style={styles.invoiceTitleBig}>INVOICE</div>
            <Space direction="vertical" size={12} style={{width:'100%', alignItems:'end'}}>
                <Row gutter={30} style={{textAlign:'left'}}>
                    <Col>
                        <Text style={styles.invoiceInfoLabel}>Nomor Invoice</Text>
                        <Text style={styles.invoiceInfoValue}>INV/{dayjs(journal.date).format('YYYY')}/{journal.id.toString().padStart(5, '0')}</Text>
                    </Col>
                    <Col>
                        <Text style={styles.invoiceInfoLabel}>Tanggal Faktur</Text>
                        <Text style={styles.invoiceInfoValue}>{dayjs(journal.date).format('DD MMM YYYY')}</Text>
                    </Col>
                    <Col>
                        <Text style={styles.invoiceInfoLabel}>Jatuh Tempo</Text>
                        <Text style={styles.invoiceInfoValue}>{dueDate.format('DD MMM YYYY')}</Text>
                    </Col>
                </Row>
            </Space>
        </Col>
      </Row>

      {/* --- BILL TO (KEPADA) --- */}
      <Row style={{ marginTop: 40 }}>
          <Col span={12}>
            <div style={styles.sectionHeaderBox}>
                <Text style={styles.sectionHeaderText}>Tagihan Kepada (Bill To):</Text>
            </div>
            <div style={styles.billToBox}>
                <div style={styles.billToName}>{journal.contact_name || 'Pelanggan Tunai / Umum'}</div>
                <div style={styles.billToAddress}>
                    {/* Karena di backend belum ada field alamat, kita hardcode dulu biar rapi */}
                    Alamat pelanggan belum tercatat di database.<br/>
                    Mohon lengkapi data kontak.
                    <br/>Indonesia
                </div>
            </div>
          </Col>
      </Row>

      {/* --- TABEL ITEM --- */}
      <Table 
        dataSource={tableData} 
        columns={columns} 
        pagination={false} 
        bordered={false}
        rowKey="key"
        size="middle"
        style={{ marginTop: 20, marginBottom: 30 }}
        rowClassName={() => 'editable-row'} // Biar CSS-nya masuk
      />

      <Divider style={{margin: '0'}} />

      {/* --- FOOTER: PEMBAYARAN & TOTAL --- */}
      <Row justify="space-between" gutter={40} style={{marginTop: 30}}>
        {/* Kiri: Info Pembayaran */}
        <Col span={14}>
            <div style={styles.paymentBox}>
                <div style={styles.paymentTitle}>Instruksi Pembayaran:</div>
                <Text style={{marginBottom: 10, display:'block'}}>Silakan transfer pembayaran ke salah satu rekening berikut:</Text>
                
                <div style={styles.paymentBank}>BANK BCA (IDR)</div>
                <div style={{marginBottom:15}}>No. Rek: 1234-5678-990 a/n PT Equilib Farm</div>
                
                <div style={styles.paymentBank}>BANK MANDIRI (IDR)</div>
                <div>No. Rek: 0987-6543-221 a/n PT Equilib Farm</div>

                <div style={styles.paymentNote}>
                    * Harap mencantumkan Nomor Invoice pada berita transfer.<br/>
                    * Pembayaran dianggap sah setelah dana diterima di rekening kami.
                </div>
            </div>
        </Col>

        {/* Kanan: Kalkulasi Total */}
        <Col span={10}>
            <div style={styles.totalsBox}>
                <Row gutter={[0, 15]}>
                    <Col span={12} style={styles.totalLabel}>Subtotal:</Col>
                    <Col span={12} style={styles.totalValue}>{formatRupiah(subTotal)}</Col>

                    <Col span={12} style={styles.totalLabel}>Pajak (PPN 0%):</Col>
                    <Col span={12} style={styles.totalValue}>{formatRupiah(tax)}</Col>
                    
                    <Divider style={{ margin: '15px 0' }} />
                    
                    <Col span={12} style={styles.grandTotalLabel}>TOTAL TAGIHAN:</Col>
                    <Col span={12} style={styles.grandTotalValue}>{formatRupiah(grandTotal)}</Col>
                </Row>
            </div>
        </Col>
      </Row>
        
      {/* Footer Akhir */}
      <div style={styles.footerText}>
        Terima kasih telah berbisnis dengan Equilib Farm. Dokumen ini dibuat secara otomatis oleh komputer dan sah tanpa tanda tangan.
      </div>
    </div>
  );
};