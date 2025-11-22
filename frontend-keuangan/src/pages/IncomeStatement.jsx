// File: src/pages/IncomeStatement.jsx
// (Halaman Laporan Laba Rugi)

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
  Statistic, // <-- Komponen baru untuk nampilin angka
  message,
  Alert
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Fungsi helper untuk format Rupiah
const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const IncomeStatement = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null); // State untuk nyimpen data JSON
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'), // Default: Awal bulan ini
    dayjs().endOf('month'),   // Default: Akhir bulan ini
  ]);

  // Fungsi yang dipanggil saat tombol "Generate" diklik
  const generateReport = async () => {
    if (!dateRange || dateRange.length !== 2) {
      message.error('Silakan pilih rentang tanggal.');
      return;
    }

    setLoading(true);
    setReportData(null); // Kosongkan data lama
    setError(null);

    const [startDate, endDate] = dateRange;
    
    try {
      // Panggil API 'kalkulator' kita
      const response = await axios.get(
        `/api/reports/income-statement/`, 
        {
          params: {
            start_date: startDate.format('YYYY-MM-DD'),
            end_date: endDate.format('YYYY-MM-DD'),
          }
        }
      );
      setReportData(response.data); // Simpan data JSON ke state
    } catch (err) {
      setError('Gagal mengambil data laporan. Pastikan server backend berjalan.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={{ marginBottom: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
      <Title level={2}>Laporan Laba Rugi</Title>
      
      {/* --- BAGIAN FILTER --- */}
      <Row gutter={16} align="bottom">
        <Col>
          <Text>Pilih Periode Laporan:</Text>
          <br />
          <RangePicker 
            value={dateRange}
            onChange={setDateRange}
            ranges={{
              'Bulan Ini': [dayjs().startOf('month'), dayjs().endOf('month')],
              'Bulan Lalu': [
                dayjs().subtract(1, 'month').startOf('month'),
                dayjs().subtract(1, 'month').endOf('month'),
              ],
              'Tahun Ini': [dayjs().startOf('year'), dayjs().endOf('year')],
            }}
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

      <hr style={{ margin: '24px 0' }} />

      {/* --- BAGIAN HASIL LAPORAN --- */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Menghitung Laporan..." size="large" />
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
            Laporan Laba Rugi
          </Title>
          <Title level={5} style={{ textAlign: 'center', marginTop: 0 }}>
            Periode {dayjs(reportData.periode.split(' s/d ')[0]).format('DD MMM YYYY')} - {dayjs(reportData.periode.split(' s/d ')[1]).format('DD MMM YYYY')}
          </Title>

          {/* Bagian Pendapatan */}
          <Card type="inner" title="Pendapatan" style={{ marginTop: '16px' }}>
            {reportData.pendapatan.detail_akun.map(akun => (
              <Row justify="space-between" key={akun.nomor_akun}>
                <Col><Text>{akun.nama_akun} ({akun.nomor_akun})</Text></Col>
                <Col><Text>{formatRupiah(akun.total)}</Text></Col>
              </Row>
            ))}
            <hr />
            <Row justify="space-between">
              <Col><Title level={5}>Total Pendapatan</Title></Col>
              <Col><Title level={5}>{formatRupiah(reportData.pendapatan.total)}</Title></Col>
            </Row>
          </Card>
          
          {/* Bagian Beban */}
          <Card type="inner" title="Beban-Beban" style={{ marginTop: '16px' }}>
            {reportData.beban.detail_akun.map(akun => (
              <Row justify="space-between" key={akun.nomor_akun}>
                <Col><Text>{akun.nama_akun} ({akun.nomor_akun})</Text></Col>
                <Col><Text>({formatRupiah(akun.total)})</Text></Col> 
              </Row>
            ))}
            <hr />
            <Row justify="space-between">
              <Col><Title level={5}>Total Beban</Title></Col>
              <Col><Title level={5}>({formatRupiah(reportData.beban.total)})</Title></Col>
            </Row>
          </Card>
          
          {/* Bagian Laba Bersih */}
          <Row justify="space-between" style={{ marginTop: '24px' }}>
            <Col>
              <Statistic 
                title={<Title level={3}>LABA BERSIH</Title>}
                value={reportData.laba_bersih}
                precision={0}
                prefix="Rp"
                valueStyle={{ 
                  color: reportData.laba_bersih >= 0 ? '#3f8600' : '#cf1322', // Hijau kalo untung, Merah kalo rugi
                  fontSize: '1,5rem'
                }}
              />
            </Col>
          </Row>
        </div>
      )}

    </Card>
  );
};

export default IncomeStatement;