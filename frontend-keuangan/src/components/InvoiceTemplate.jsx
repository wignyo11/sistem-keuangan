// File: src/components/InvoiceTemplate.jsx
import React from 'react';
import { Typography, Row, Col, Table, Divider } from 'antd';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// Helper Rupiah
const formatRupiah = (value) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

// forwardRef PENTING biar library print bisa baca komponen ini
export const InvoiceTemplate = React.forwardRef(({ data }, ref) => {
  
  // SAFETY CHECK: Kalau data belum siap, jangan render apa-apa (biar gak error putih)
  if (!data || !data.journal) return null;

  const { journal, items } = data;

  // Kolom Tabel Invoice
  const columns = [
    { 
      title: 'Akun', 
      key: 'account',
      render: (record) => `${record.account_number} - ${record.account_name}` 
    },
    { 
      title: 'Posisi', 
      key: 'type', 
      align: 'center',
      render: (record) => Number(record.debit) > 0 ? 'DEBIT' : 'KREDIT'
    },
    { 
      title: 'Nominal', 
      key: 'amount', 
      align: 'right', 
      render: (record) => formatRupiah(Number(record.debit) > 0 ? record.debit : record.credit) 
    },
  ];

  // Hitung Total (Ambil dari Debit saja)
  const totalAmount = items.reduce((sum, item) => sum + Number(item.debit), 0);

  return (
    // Style inline ini biar hasil print sama persis kayak di layar
    <div ref={ref} style={{ padding: '40px', background: 'white', color: 'black', fontFamily: 'Arial, sans-serif' }}>
      
      {/* HEADER / KOP SURAT */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <Title level={3} style={{ margin: 0, textTransform: 'uppercase' }}>EQUILIB FARM & CO.</Title>
        <Text>Jl. Selada Segar No. 88, Jawa Tengah</Text><br/>
        <Text>Telp: 0812-3456-7890 | Email: admin@equilib.com</Text>
        <Divider style={{ borderTop: '2px solid #000', margin: '20px 0' }} />
      </div>

      {/* INFO TRANSAKSI */}
      <Row justify="space-between" style={{ marginBottom: '20px' }}>
        <Col>
          <Title level={5} style={{ margin: 0 }}>INVOICE / BUKTI JURNAL</Title>
          <table style={{ marginTop: 10 }}>
            <tbody>
              <tr>
                <td style={{ paddingRight: 20 }}>No. Ref</td>
                <td>: <strong>#{journal.id}</strong></td>
              </tr>
              <tr>
                <td>Tanggal</td>
                <td>: {dayjs(journal.date).format('DD MMMM YYYY')}</td>
              </tr>
            </tbody>
          </table>
        </Col>
        <Col style={{ textAlign: 'right' }}>
          <Text type="secondary">Kepada Yth:</Text><br/>
          <Title level={4} style={{ margin: 0 }}>{journal.contact_name || 'Umum / Tunai'}</Title>
        </Col>
      </Row>

      {/* TABEL BARANG */}
      <Table 
        dataSource={items} 
        columns={columns} 
        pagination={false} 
        bordered 
        rowKey="id"
        size="small"
        summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={2} style={{ textAlign: 'right', fontWeight: 'bold' }}>
                TOTAL TRANSAKSI
              </Table.Summary.Cell>
              <Table.Summary.Cell index={1} style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>
                {formatRupiah(totalAmount)}
              </Table.Summary.Cell>
            </Table.Summary.Row>
        )}
      />

      <div style={{ marginTop: '20px', fontStyle: 'italic', color: '#666' }}>
        Catatan: {journal.description}
      </div>

      {/* TANDA TANGAN */}
      <Row style={{ marginTop: '80px' }}>
        <Col span={8} style={{ textAlign: 'center' }}>
          <Text>Dibuat Oleh,</Text>
          <br /><br /><br /><br />
          <Text style={{ textDecoration: 'underline' }}>( Admin Keuangan )</Text>
        </Col>
        <Col span={8} offset={8} style={{ textAlign: 'center' }}>
          <Text>Disetujui Oleh,</Text>
          <br /><br /><br /><br />
          <Text style={{ textDecoration: 'underline' }}>( Pak Joko )</Text>
        </Col>
      </Row>
    </div>
  );
});