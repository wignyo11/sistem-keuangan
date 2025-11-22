// File: src/pages/BalanceSheet.jsx
// (Halaman Laporan Neraca - Format Skontro)

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
  Statistic,
  message,
  Alert,
  Tag // Kita butuh Tag
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// Fungsi helper untuk format Rupiah (sama kayak L/R)
const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

// Komponen kecil untuk satu baris laporan
const ReportRow = ({ label, value, isTotal = false }) => (
  <Row justify="space-between" style={{ padding: '4px 0' }}>
    <Col>
      <Text strong={isTotal}>{label}</Text>
    </Col>
    <Col>
      <Text strong={isTotal}>{formatRupiah(value)}</Text>
    </Col>
  </Row>
);

const BalanceSheet = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [endDate, setEndDate] = useState(dayjs().endOf('month')); // Neraca cuma butuh 1 tanggal

  const generateReport = async () => {
    if (!endDate) {
      message.error('Silakan pilih tanggal akhir periode.');
      return;
    }

    setLoading(true);
    setReportData(null);
    setError(null);

    try {
      // Panggil API 'kalkulator' Neraca kita
      const response = await axios.get(
        `/api/reports/balance-sheet/`, 
        {
          params: {
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
      <Title level={2}>Laporan Neraca (Balance Sheet)</Title>
      
      {/* --- BAGIAN FILTER --- */}
      <Row gutter={16} align="bottom">
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

      <hr style={{ margin: '24px 0' }} />

      {/* --- BAGIAN HASIL LAPORAN --- */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Menghitung Neraca..." size="large" />
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
            Laporan Neraca
          </Title>
          <Title level={5} style={{ textAlign: 'center', marginTop: 0 }}>
            Per Tanggal {dayjs(reportData.periode_per_tanggal).format('DD MMMM YYYY')}
          </Title>

          {/* Ini layout Skontro (Kiri-Kanan) */}
          <Row gutter={24}>
          
            {/* --- KOLOM KIRI (ASET) --- */}
            <Col span={12}>
              <Card type="inner" title="ASET">
                {reportData.aset.detail_akun.map(akun => (
                  <ReportRow 
                    key={akun.nomor_akun}
                    label={`${akun.nama_akun} (${akun.nomor_akun})`}
                    value={akun.saldo_akhir}
                  />
                ))}
                <hr />
                <ReportRow 
                  label="TOTAL ASET"
                  value={reportData.aset.total}
                  isTotal={true}
                />
              </Card>
            </Col>
            
            {/* --- KOLOM KANAN (LIABILITAS + EKUITAS) --- */}
            <Col span={12}>
              <Card type="inner" title="LIABILITAS (KEWAJIBAN)">
                {reportData.liabilitas.detail_akun.map(akun => (
                  <ReportRow 
                    key={akun.nomor_akun}
                    label={`${akun.nama_akun} (${akun.nomor_akun})`}
                    value={akun.saldo_akhir}
                  />
                ))}
                <ReportRow 
                  label="Total Liabilitas"
                  value={reportData.liabilitas.total}
                  isTotal={true}
                />
              </Card>
              
              <Card type="inner" title="EKUITAS (MODAL)" style={{ marginTop: '16px' }}>
                {reportData.ekuitas.detail_akun.map(akun => (
                  <ReportRow 
                    key={akun.nomor_akun}
                    label={`${akun.nama_akun} (${akun.nomor_akun})`}
                    value={akun.saldo_akhir}
                  />
                ))}
                <ReportRow 
                  label="Laba Ditahan (Semua Periode)"
                  value={reportData.ekuitas.laba_ditahan_semua_periode}
                />
                <hr />
                <ReportRow 
                  label="Total Ekuitas"
                  value={reportData.ekuitas.total}
                  isTotal={true}
                />
              </Card>
              
              <hr />
              <ReportRow 
                label="TOTAL LIABILITAS + EKUITAS"
                value={reportData.total_liabilitas_plus_ekuitas}
                isTotal={true}
              />
            </Col>
          </Row>
          
          {/* --- INDIKATOR BALANCE --- */}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            {reportData.is_balanced ? (
              <Tag color="green" style={{ fontSize: '1.2rem', padding: '8px' }}>
                BALANCE (Aset = Liabilitas + Ekuitas)
              </Tag>
            ) : (
              <Tag color="red" style={{ fontSize: '1.2rem', padding: '8px' }}>
                UNBALANCE
              </Tag>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default BalanceSheet;