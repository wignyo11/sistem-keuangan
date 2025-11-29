// File: src/pages/GeneralLedger.jsx
// (Halaman Laporan Buku Besar)

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
  Select, // <-- Kita butuh Select
  message,
  Alert,
  Table // <-- Kita butuh Table
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

// Fungsi helper untuk format Rupiah
const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

// Kolom untuk tabel mutasi
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
    key: 'credit',
    align: 'right',
    render: (text) => parseFloat(text) === 0 ? '-' : new Intl.NumberFormat('id-ID').format(text),
  }
];

const GeneralLedger = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  
  // --- STATE UNTUK FILTER ---
  const [accounts, setAccounts] = useState([]); // Untuk nyimpen daftar akun
  const [selectedAccount, setSelectedAccount] = useState(null); // Akun yg dipilih
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  // --- Ambil daftar akun (untuk dropdown) saat halaman dibuka ---
  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get('/api/accounts/');
        setAccounts(response.data);
      } catch (error) {
        message.error('Gagal memuat daftar akun.');
        console.error('Gagal fetch akun:', error);
      }
    };
    fetchAccounts();
  }, []); // [] = Jalankan sekali

  // Fungsi yang dipanggil saat tombol "Generate" diklik
  const generateReport = async () => {
    if (!selectedAccount || !dateRange || dateRange.length !== 2) {
      message.error('Silakan pilih Akun dan Rentang Tanggal.');
      return;
    }

    setLoading(true);
    setReportData(null);
    setError(null);

    const [startDate, endDate] = dateRange;
    
    try {
      // Panggil API 'kalkulator' Buku Besar kita
      const response = await axios.get(
        `/api/reports/general-ledger/`, 
        {
          params: {
            account_id: selectedAccount, // <-- Kirim ID Akun
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
    <Card style={{ marginBottom: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
      <Title level={2}>Buku Besar (General Ledger)</Title>
      <p>Laporan ini merinci semua transaksi (mutasi) untuk satu akun dalam periode tertentu.</p>
      
      {/* --- BAGIAN FILTER --- */}
      <Row gutter={16} align="bottom" style={{ marginBottom: '24px' }}>
        <Col>
          <Text>Pilih Akun:</Text><br />
          <Select
            showSearch
            style={{ width: 300 }}
            placeholder="Cari dan pilih akun..."
            onChange={(value) => setSelectedAccount(value)}
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {accounts.map(acc => (
              <Option key={acc.id} value={acc.id}>
                {`${acc.number} - ${acc.name}`}
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
        <Col>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={generateReport}
            loading={loading}
          >
            Tampilkan Buku Besar
          </Button>
        </Col>
      </Row>

      <hr />

      {/* --- BAGIAN HASIL LAPORAN --- */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Menghitung Buku Besar..." size="large" />
        </div>
      )}

      {error && <Alert message="Error" description={error} type="error" showIcon />}

      {!loading && !reportData && (
        <Empty description="Silakan pilih Akun dan Periode, lalu klik 'Tampilkan'." />
      )}

      {/* Tampilkan jika data SUDAH ADA */}
      {reportData && (
        <div>
          <Title level={4}>Buku Besar: {reportData.akun}</Title>
          <Text>Periode: {reportData.periode}</Text>
          
          {/* --- Header Saldo Awal --- */}
          <Row justify="space-between" style={{ padding: '8px 12px', marginTop: '16px' }}>
            <Col><Text strong>Saldo Awal (per {dateRange[0].format('DD MMM YYYY')})</Text></Col>
            <Col><Text strong>{formatRupiah(reportData.saldo_awal)}</Text></Col>
          </Row>

          {/* --- Tabel Mutasi --- */}
          <Table
            columns={columns}
            dataSource={reportData.mutasi}
            rowKey="id"
            bordered
            size="small"
            pagination={false}
            style={{ marginTop: '8px' }}
          />
          
          {/* --- Footer Total Mutasi & Saldo Akhir --- */}
          <Row justify="space-between" style={{ padding: '12px', marginTop: '8px' }}>
            <Col span={12}>
              <Text strong>Total Mutasi Periode Ini:</Text>
            </Col>
            <Col span={6} style={{ textAlign: 'right' }}>
              <Text strong>{formatRupiah(reportData.total_debit_mutasi)}</Text>
            </Col>
            <Col span={6} style={{ textAlign: 'right' }}>
              <Text strong>{formatRupiah(reportData.total_kredit_mutasi)}</Text>
            </Col>
          </Row>
          <Row justify="space-between" style={{ padding: '12px' }}>
            <Col><Title level={5}>Saldo Akhir (per {dateRange[1].format('DD MMM YYYY')})</Title></Col>
            <Col><Title level={5}>{formatRupiah(reportData.saldo_akhir)}</Title></Col>
          </Row>
        </div>
      )}

    </Card>
  );
};

export default GeneralLedger;