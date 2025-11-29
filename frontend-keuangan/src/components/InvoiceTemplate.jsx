// File: src/components/InvoiceTemplate.jsx
import React from 'react';
import { Typography, Row, Col, Table, Divider } from 'antd';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// Format Rupiah
const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

export const InvoiceTemplate = React.forwardRef(({ data }, ref) => {
  if (!data) return null;

  const { journal, items } = data; // Data dikirim dari parent

  const columns = [
    { title: 'Deskripsi Barang', dataIndex: 'account_name', key: 'account' }, // Kita ambil nama akun/barang
    { title: 'Debit/Kredit', dataIndex: 'type', key: 'type', align: 'center' }, 
    { title: 'Jumlah', dataIndex: 'amount', key: 'amount', align: 'right', render: (val) => formatRupiah(val) },
  ];

  // Map items biar enak dibaca tabel
  const tableData = items.map((item, idx) => ({
    key: idx,
    account_name: item.account_name, // Nanti backend harus kirim nama akun
    type: item.debit > 0 ? 'Debit' : 'Kredit',
    amount: item.debit > 0 ? item.debit : item.credit
  }));

  // Total Transaksi (Ambil dari total debit aja)
  const total = items.reduce((sum, item) => sum + Number(item.debit), 0);

  return (
    <div ref={ref} style={{ padding: '40px', background: 'white', minHeight: '297mm', width: '210mm', margin: '0 auto' }}>
      {/* KOP SURAT */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <Title level={2} style={{ margin: 0 }}>PERUSAHAAN SELADA PAK JOKO</Title>
        <Text>Jl. Pertanian No. 1, Kota Sayur</Text><br/>
        <Text>Telp: 0812-3456-7890 | Email: admin@seladajoko.com</Text>
        <Divider style={{ borderTop: '2px solid #333' }} />
      </div>

      {/* INFO INVOICE */}
      <Row justify="space-between" style={{ marginBottom: 30 }}>
        <Col>
          <Title level={4}>INVOICE / BUKTI JURNAL</Title>
          <Text strong>No. Transaksi:</Text> #{journal.id}<br/>
          <Text strong>Tanggal:</Text> {dayjs(journal.date).format('DD MMMM YYYY')}<br/>
        </Col>
        <Col style={{ textAlign: 'right' }}>
          <Text strong>Kepada Yth:</Text><br/>
          <Text>{journal.contact_name || 'Pelanggan Umum'}</Text>
        </Col>
      </Row>

      {/* TABEL BARANG */}
      <Table 
        dataSource={tableData} 
        columns={columns} 
        pagination={false} 
        bordered 
        summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>TOTAL</Table.Summary.Cell>
              <Table.Summary.Cell index={1} style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatRupiah(total)}</Table.Summary.Cell>
            </Table.Summary.Row>
        )}
      />

      {/* FOOTER TTD */}
      <Row style={{ marginTop: 80 }}>
        <Col span={8} style={{ textAlign: 'center' }}>
          <Text>Diterima Oleh,</Text>
          <br /><br /><br /><br />
          <Text>( ....................... )</Text>
        </Col>
        <Col span={8} offset={8} style={{ textAlign: 'center' }}>
          <Text>Hormat Kami,</Text>
          <br /><br /><br /><br />
          <Text>( Admin Keuangan )</Text>
        </Col>
      </Row>
    </div>
  );
});