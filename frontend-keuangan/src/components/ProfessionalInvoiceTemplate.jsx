// File: src/components/ProfessionalInvoiceTemplate.jsx
import React from 'react';
import { Typography, Row, Col, Table, Divider } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/id'; // Biar tanggalnya Bahasa Indonesia

dayjs.locale('id');
const { Title, Text } = Typography;

// Helper Rupiah yang rapi
const formatRupiah = (value) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

export const ProfessionalInvoiceTemplate = React.forwardRef(({ data }, ref) => {
  // 1. Safety Check
  if (!data || !data.journal) return null;
  const { journal, items } = data;

  // 2. Filter & Transform Data
  // Kita cuma mau nampilin item yang SISI KREDIT (Pendapatan/Penjualan)
  // karena ini Invoice buat customer.
  const salesItems = items.filter(item => Number(item.credit) > 0);
  
  const tableData = salesItems.map((item, idx) => ({
    key: idx,
    description: item.account_name, // Nama Akun jadi deskripsi barang
    // KARENA KITA BELUM PUNYA DATA QTY & HARGA SATUAN DI BACKEND,
    // KITA AKALI DULU BIAR TAMPILANNYA PRO:
    quantity: 1, 
    unitPrice: item.credit,
    total: item.credit
  }));

  // Hitung Total
  const subTotal = salesItems.reduce((sum, item) => sum + Number(item.credit), 0);
  const tax = 0; // Hardcode 0 dulu, nanti bisa diupdate kalo Pak Joko PKP
  const grandTotal = subTotal + tax;

  // Tanggal Jatuh Tempo (Misal H+7)
  const dueDate = dayjs(journal.date).add(7, 'day');

  // ================= STYLING VARIABLES =================
  const styles = {
    page: {
        padding: '40px', background: 'white', fontFamily: 'Helvetica, Arial, sans-serif', color: '#333', fontSize: '14px'
    },
    headerGray: {
        background: '#f8f9fa', padding: '15px 20px', borderRadius: '8px 8px 0 0', borderBottom: '2px solid #e9ecef'
    },
    companyName: {
        fontSize: '24px', fontWeight: 'bold', color: '#2c3e50', marginBottom: '5px'
    },
    invoiceTitle: {
        fontSize: '32px', fontWeight: '300', color: '#2c3e50', textAlign: 'right', textTransform: 'uppercase'
    },
    label: {
        fontWeight: 'bold', color: '#6c757d', display: 'block', marginBottom: '2px'
    },
    value: {
        fontSize: '16px', fontWeight: '500'
    },
    tableHeader: {
        background: '#2c3e50', color: 'white', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '12px'
    },
    totalLabel: {
        fontWeight: 'bold', textAlign: 'right', paddingRight: '20px', fontSize: '14px'
    },
    totalValue: {
        fontWeight: 'bold', textAlign: 'right', fontSize: '16px'
    },
    grandTotalValue: {
        fontWeight: 'bold', textAlign: 'right', fontSize: '20px', color: '#2c3e50'
    },
    bankBox: {
        marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef'
    }
  };

  // Kolom Tabel Ant Design
  const columns = [
    { 
      title: 'DESKRIPSI', 
      dataIndex: 'description', 
      key: 'description',
      onHeaderCell: () => ({ style: styles.tableHeader })
    },
    // Kolom Qty & Unit Price kita sembunyikan dulu kalau mau jujur,
    // Atau tampilkan hardcode '1' biar kelihatan pro kayak di gambar referensi.
    // SAYA PILIH TAMPILKAN BIAR MIRIP REFERENSI:
    { 
      title: 'KUANTITAS', 
      dataIndex: 'quantity', 
      key: 'quantity', align: 'center',
      onHeaderCell: () => ({ style: styles.tableHeader }),
      render: () => '1 (Paket)' // Hardcode biar terlihat pro
    },
    { 
      title: 'HARGA SATUAN', 
      dataIndex: 'unitPrice', 
      key: 'unitPrice', align: 'right',
      onHeaderCell: () => ({ style: styles.tableHeader }),
      render: (val) => formatRupiah(val)
    },
    { 
      title: 'JUMLAH', 
      dataIndex: 'total', 
      key: 'total', align: 'right',
      onHeaderCell: () => ({ style: styles.tableHeader }),
      render: (val) => formatRupiah(val)
    },
  ];

  return (
    <div ref={ref} style={styles.page}>
      {/* --- HEADER --- */}
      <Row justify="space-between" align="top" style={{ marginBottom: 40 }}>
        <Col span={12}>
            {/* Ganti URL ini dengan logo Selada Pak Joko nanti */}
            <img src="https://cdn-icons-png.flaticon.com/512/7630/7630242.png" alt="Logo" style={{ width: 60, marginBottom: 15 }} />
            <div style={styles.companyName}>EQUILIB FARM</div>
            <Text>Jl. Agrikultur Modern No. 10, Jawa Tengah<br/>Telp: (021) 555-0199 | Email: sales@equilib.com</Text>
        </Col>
        <Col span={12} style={{ textAlign: 'right' }}>
            <div style={styles.invoiceTitle}>INVOICE</div>
            <div style={{ marginTop: 20 }}>
                <Row gutter={[24, 16]} justify="end">
                    <Col style={{ textAlign: 'left' }}>
                        <Text style={styles.label}>Nomor Invoice:</Text>
                        <Text style={styles.value}>INV/{dayjs(journal.date).format('YYYY')}/{journal.id.toString().padStart(4, '0')}</Text>
                    </Col>
                    <Col style={{ textAlign: 'left' }}>
                        <Text style={styles.label}>Tanggal:</Text>
                        <Text style={styles.value}>{dayjs(journal.date).format('DD MMM YYYY')}</Text>
                    </Col>
                    <Col style={{ textAlign: 'left' }}>
                        <Text style={styles.label}>Jatuh Tempo:</Text>
                        <Text style={styles.value}>{dueDate.format('DD MMM YYYY')}</Text>
                    </Col>
                </Row>
            </div>
        </Col>
      </Row>

      {/* --- CUSTOMER INFO --- */}
      <Row style={{ marginBottom: 30 }} gutter={40}>
          <Col span={12}>
            <div style={styles.headerGray}>
                <Text strong style={{textTransform: 'uppercase'}}>Tagihan Kepada (Bill To):</Text>
            </div>
            <div style={{ padding: '15px 20px' }}>
                <Title level={4} style={{ margin: 0, color: '#2c3e50' }}>{journal.contact_name || 'Pelanggan Tunai'}</Title>
                {/* Nanti backend perlu kirim alamat kontak juga */}
                <Text type="secondary">Alamat belum tersedia di database.</Text>
            </div>
          </Col>
          {/* Bisa ditambah Ship To kalo perlu */}
      </Row>

      {/* --- TABEL ITEM --- */}
      <Table 
        dataSource={tableData} 
        columns={columns} 
        pagination={false} 
        bordered={false}
        rowKey="key"
        size="middle"
        style={{ marginBottom: 30 }}
      />

      {/* --- TOTALS & PAYMENT INFO --- */}
      <Row justify="space-between" gutter={40}>
        {/* Kiri: Info Pembayaran */}
        <Col span={14}>
            <div style={styles.bankBox}>
                <Title level={5} style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>Informasi Pembayaran:</Title>
                <Text style={styles.label}>Bank Transfer:</Text>
                <Text strong style={{ fontSize: 16 }}>BCA 1234-5678-90 a/n Joko Susilo</Text><br/>
                <Text strong style={{ fontSize: 16 }}>Mandiri 0987-6543-21 a/n Joko Susilo</Text>
                
                <Divider style={{ margin: '15px 0' }} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                    * Mohon cantumkan Nomor Invoice pada berita transfer.<br/>
                    * Keterlambatan pembayaran dapat dikenakan denda sesuai ketentuan.
                </Text>
            </div>
        </Col>

        {/* Kanan: Total */}
        <Col span={10}>
            <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
                <Row gutter={[0, 12]}>
                    <Col span={12} style={styles.totalLabel}>Subtotal:</Col>
                    <Col span={12} style={styles.totalValue}>{formatRupiah(subTotal)}</Col>

                    <Col span={12} style={styles.totalLabel}>Pajak (0%):</Col>
                    <Col span={12} style={styles.totalValue}>{formatRupiah(tax)}</Col>
                    
                    <Divider style={{ margin: '10px 0' }} />
                    
                    <Col span={12} style={styles.totalLabel}><span style={{fontSize: 18}}>TOTAL TAGIHAN:</span></Col>
                    <Col span={12} style={styles.grandTotalValue}>{formatRupiah(grandTotal)}</Col>
                </Row>
            </div>
            <div style={{ textAlign: 'center', marginTop: 30, color: '#6c757d', fontStyle: 'italic' }}>
                Terima kasih atas kepercayaan Anda berbisnis dengan Equilib Farm.
            </div>
        </Col>
      </Row>
    </div>
  );
});