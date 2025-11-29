// File: src/components/ProfessionalInvoiceTemplate.jsx
import React from 'react';
import { Typography, Row, Col, Table, Divider } from 'antd';
import dayjs from 'dayjs';
import 'dayjs/locale/id';

dayjs.locale('id');
const { Title, Text } = Typography;

const formatRupiah = (value) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

// HAPUS forwardRef, jadiin fungsi biasa
export const ProfessionalInvoiceTemplate = ({ data }) => {
  // 1. Safety Check: Kalau data kosong, return div kosong (JANGAN return null biar ref induk gak error)
  if (!data || !data.journal) {
      return <div style={{ padding: 20 }}>Data belum siap dicetak...</div>;
  }

  const { journal, items } = data;

  const salesItems = items.filter(item => Number(item.credit) > 0);
  
  const tableData = salesItems.map((item, idx) => ({
    key: idx,
    description: item.account_name,
    quantity: 1, 
    unitPrice: item.credit,
    total: item.credit
  }));

  const subTotal = salesItems.reduce((sum, item) => sum + Number(item.credit), 0);
  const tax = 0; 
  const grandTotal = subTotal + tax;
  const dueDate = dayjs(journal.date).add(7, 'day');

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

  const columns = [
    { 
      title: 'DESKRIPSI', 
      dataIndex: 'description', 
      key: 'description',
      onHeaderCell: () => ({ style: styles.tableHeader })
    },
    { 
      title: 'KUANTITAS', 
      dataIndex: 'quantity', 
      key: 'quantity', align: 'center',
      onHeaderCell: () => ({ style: styles.tableHeader }),
      render: () => '1 (Paket)' 
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
    // Hapus ref={ref} di sini karena udah dipegang div pembungkus
    <div style={styles.page}>
      {/* HEADER */}
      <Row justify="space-between" align="top" style={{ marginBottom: 40 }}>
        <Col span={12}>
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

      {/* CUSTOMER */}
      <Row style={{ marginBottom: 30 }} gutter={40}>
          <Col span={12}>
            <div style={styles.headerGray}>
                <Text strong style={{textTransform: 'uppercase'}}>Tagihan Kepada (Bill To):</Text>
            </div>
            <div style={{ padding: '15px 20px' }}>
                <Title level={4} style={{ margin: 0, color: '#2c3e50' }}>{journal.contact_name || 'Pelanggan Tunai'}</Title>
                <Text type="secondary">Alamat belum tersedia di database.</Text>
            </div>
          </Col>
      </Row>

      {/* TABEL */}
      <Table 
        dataSource={tableData} 
        columns={columns} 
        pagination={false} 
        bordered={false}
        rowKey="key"
        size="middle"
        style={{ marginBottom: 30 }}
      />

      {/* TOTALS */}
      <Row justify="space-between" gutter={40}>
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
};