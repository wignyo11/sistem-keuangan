import React, { useState, useEffect } from 'react';
import {
  Card,
  DatePicker,
  Button,
  Spin,
  Empty,
  Typography,
  Row,
  Col,
  Select, 
  message,
  Alert,
  Table
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Fungsi helper untuk format Rupiah
const formatRupiah = (value) => {
  const num = parseFloat(value);
  if (num < 0) {
    return `(${new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Math.abs(num))})`;
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
};

// Kolom untuk tabel mutasi (sama kayak Buku Besar)
const columns = [
  {
    title: 'Tanggal',
    dataIndex: ['journal_entry__date'],
    key: 'tanggal',
    render: (text) => dayjs(text).format('DD-MM-YYYY'),
  },
  {
    title: 'Keterangan',
    dataIndex: ['journal_entry__description'],
    key: 'keterangan',
  },
  {
    title: 'Debit',
    dataIndex: 'debit',
    key: 'debit',
    align: 'right',
    render: (text) => parseFloat(text) === 0 ? '-' : new Intl.NumberFormat('id-ID').format(text),
  },
  {
    title: 'Kredit',
    dataIndex: 'credit',
    key: 'kredit',
    align: 'right',
    render: (text) => parseFloat(text) === 0 ? '-' : new Intl.NumberFormat('id-ID').format(text),
  }
];

const SubsidiaryLedger = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  
  // --- STATE UNTUK FILTER ---
  const [accounts, setAccounts] = useState([]); // Untuk Akun Kontrol
  const [contacts, setContacts] = useState([]); // Untuk Kontak
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  // Ambil daftar akun & kontak (untuk dropdown) saat halaman dibuka
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, contactsRes] = await Promise.all([
          axios.get('/api/accounts/'),
          axios.get('/api/contacts/')
        ]);
        
        // Kita HANYA ambil Akun Kontrol (Piutang & Utang)
        setAccounts(accountsRes.data.filter(
          acc => acc.number === '1-1100' || acc.number === '2-1000'
        ));
        setContacts(contactsRes.data);
        
      } catch (err) {
        setError('Gagal mengambil data. Pastikan server backend (Django) sudah berjalan.');
        console.error(err);
        message.error('Gagal memuat data master (akun/kontak).');
      }
    };
    fetchData();
  }, []);

  const generateReport = async () => {
    if (!selectedAccount || !selectedContact || !dateRange || dateRange.length !== 2) {
      message.error('Silakan pilih Akun Kontrol, Kontak, dan Periode Tanggal.');
      return;
    }

    setLoading(true);
    setReportData(null);
    setError(null);

    const [startDate, endDate] = dateRange;
    
    try {
      // Panggil API 'kalkulator' Buku Besar Pembantu
      const response = await axios.get(
        `/api/reports/subsidiary-ledger/`, 
        {
          params: {
            account_id: selectedAccount, // <-- Kirim ID Akun
            contact_id: selectedContact, // <-- Kirim ID Kontak
            start_date: startDate.format('YYYY-MM-DD'),
            end_date: endDate.format('YYYY-MM-DD'),
          }
        }
      );
      setReportData(response.data);
    } catch (err) {
      setError('Gagal mengambil data laporan. Pastikan server backend berjalan.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>Laporan Buku Besar Pembantu</Title>
      <p>Laporan ini merinci mutasi Piutang per Customer atau Utang per Vendor.</p>
      
      {/* --- BAGIAN FILTER --- */}
      <Card style={{ marginBottom: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
        <Row gutter={16} align="bottom">
          <Col>
            <Text>Pilih Akun Kontrol:</Text><br />
            <Select
              style={{ width: 250 }}
              placeholder="Pilih Akun Piutang/Utang..."
              onChange={(value) => setSelectedAccount(value)}
            >
              {accounts.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {`${acc.number} - ${acc.name}`}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Text>Pilih Kontak (Customer/Vendor):</Text><br />
            <Select
              showSearch
              style={{ width: 250 }}
              placeholder="Cari kontak..."
              onChange={(value) => setSelectedContact(value)}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {contacts.map(contact => (
                <Option key={contact.id} value={contact.id}>
                  {contact.name} ({contact.type})
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Text>Pilih Periode:</Text><br />
            <RangePicker 
              value={dateRange}
              onChange={setDateRange}
            />
          </Col>
          <Col style={{ marginTop: '18px' }}>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={generateReport}
              loading={loading}
            >
              Tampilkan
            </Button>
          </Col>
        </Row>
      </Card>

      {/*BAGIAN HASIL LAPORAN*/}
      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Menghitung Buku Pembantu..." size="large" />
        </div>
      )}

      {error && <Alert message="Error" description={error} type="error" showIcon />}

      {!loading && !reportData && (
        <Empty description="Silakan pilih Akun Kontrol, Kontak, dan Periode, lalu klik 'Tampilkan'." />
      )}

      {/* Tampilkan jika data SUDAH ADA */}
      {reportData && (
        <Card style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', borderRadius: '8px' }}>
          <Title level={3}>Buku Besar Pembantu: {reportData.kontak}</Title>
          <Text strong>Akun Kontrol: {reportData.akun_kontrol}</Text><br/>
          <Text>Periode: {reportData.periode}</Text>
          
          <Row justify="space-between" style={{ background: '#ffffffff', padding: '8px 12px', marginTop: '16px' }}>
            <Col><Text strong>Saldo Awal (per {dateRange[0].format('DD MMM YYYY')})</Text></Col>
            <Col><Text strong>{formatRupiah(reportData.saldo_awal)}</Text></Col>
          </Row>

          <Table
            columns={columns}
            dataSource={reportData.mutasi}
            rowKey="id"
            bordered
            size="small"
            pagination={false}
            style={{ marginTop: '8px' }}
          />
          
          <Row justify="space-between" style={{ background: '#f0f2f5', padding: '12px', marginTop: '8px' }}>
            <Col span={12}><Text strong>Total Mutasi Periode Ini:</Text></Col>
            <Col span={6} style={{ textAlign: 'right' }}><Text strong>{formatRupiah(reportData.total_debit_mutasi)}</Text></Col>
            <Col span={6} style={{ textAlign: 'right' }}><Text strong>{formatRupiah(reportData.total_kredit_mutasi)}</Text></Col>
          </Row>
          <Row justify="space-between" style={{ background: '#fafafa', padding: '12px' }}>
            <Col><Title level={5}>Saldo Akhir (per {dateRange[1].format('DD MMM YYYY')})</Title></Col>
            <Col><Title level={5}>{formatRupiah(reportData.saldo_akhir)}</Title></Col>
          </Row>
        </Card>
      )}
    </div>
  );
};

export default SubsidiaryLedger;