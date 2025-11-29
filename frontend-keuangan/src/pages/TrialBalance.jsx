// File: src/pages/TrialBalance.jsx
// (Halaman Laporan Neraca Saldo)

import React, { useState } from 'react';
import {
  Card,
  DatePicker,
  Button,
  Spin,
  Empty,
  Typography,
  Row,
  Col,
  message,
  Alert,
  Table // <-- Kita butuh Table
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// Fungsi helper untuk format Rupiah
const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

// Kolom untuk tabel Neraca Saldo
const columns = [
  {
    title: 'Nomor Akun',
    dataIndex: 'nomor_akun',
    key: 'nomor_akun',
  },
  {
    title: 'Nama Akun',
    dataIndex: 'nama_akun',
    key: 'nama_akun',
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
    dataIndex: 'kredit',
    key: 'kredit',
    align: 'right',
    render: (text) => parseFloat(text) === 0 ? '-' : new Intl.NumberFormat('id-ID').format(text),
  }
];

const TrialBalance = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [endDate, setEndDate] = useState(dayjs().endOf('month'));

  const generateReport = async () => {
    if (!endDate) {
      message.error('Silakan pilih tanggal akhir periode.');
      return;
    }
    setLoading(true);
    setReportData(null);
    setError(null);

    try {
      // Panggil API 'kalkulator' Neraca Saldo
      const response = await axios.get(
        `/api/reports/trial-balance/`, 
        {
          params: {
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
      <Title level={2}>Laporan Neraca Saldo (Trial Balance)</Title>
      
      {/* --- BAGIAN FILTER --- */}
      <Row gutter={16} align="bottom" style={{ marginBottom: '24px' }}>
        <Col>
          <Text>Pilih Periode (Per Tanggal):</Text>
          <br />
          <DatePicker 
            value={endDate}
            onChange={setEndDate}
            picker="date"
            style={{ width: '250px' }}
          />
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={generateReport}
            loading={loading}
          >
            Generate Laporan
          </Button>
        </Col>
      </Row>

      <hr />

      {/* --- BAGIAN HASIL LAPORAN --- */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Menghitung Neraca Saldo..." size="large" />
        </div>
      )}

      {error && <Alert message="Error" description={error} type="error" showIcon />}

      {!loading && !reportData && (
        <Empty description="Silakan generate laporan untuk melihat data." />
      )}

      {/* Tampilkan jika data SUDAH ADA */}
      {reportData && (
        <div>
          <Title level={4} style={{ textAlign: 'center' }}>
            Neraca Saldo
          </Title>
          <Title level={5} style={{ textAlign: 'center', marginTop: 0 }}>
            Per Tanggal {dayjs(reportData.periode_per_tanggal).format('DD MMMM YYYY')}
          </Title>

          {/* --- Tabel Mutasi --- */}
          <Table
            columns={columns}
            dataSource={reportData.detail_akun}
            rowKey="nomor_akun"
            bordered
            size="small"
            pagination={false}
            style={{ marginTop: '8px' }}
            
            summary={() => (
          <Table.Summary.Row style={{ fontWeight: 'bold' }}>
            <Table.Summary.Cell index={0} colSpan={2} style={{ textAlign: 'right' }}>
              <Title level={5}>GRAND TOTAL</Title>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              <Title level={5} style={{ color: reportData.is_balanced ? 'green' : 'red' }}>
                {formatRupiah(reportData.total_debit)}
              </Title>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <Title level={5} style={{ color: reportData.is_balanced ? 'green' : 'red' }}>
                {formatRupiah(reportData.total_kredit)}
              </Title>
            </Table.Summary.Cell>
          </Table.Summary.Row>
         )}
          />
        </div>
      )}
    </Card>
  );
};

export default TrialBalance;