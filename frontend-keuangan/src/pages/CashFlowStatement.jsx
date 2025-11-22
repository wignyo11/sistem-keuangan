// File: src/pages/CashFlowStatement.jsx
// (Halaman Laporan Arus Kas - Metode Tidak Langsung)

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
  Tag,
  Statistic
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Fungsi helper untuk format Rupiah
const formatRupiah = (value, showSign = false) => {
  const num = parseFloat(value);
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
  
  // Kasih tanda kurung (...) untuk angka negatif, kayak di akuntansi
  if (num < 0) {
    return `(${new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Math.abs(num))})`;
  }
  
  if (showSign && num > 0) {
    return `+${formatted}`;
  }
  return formatted;
};

// Komponen kecil untuk satu baris laporan
const ReportRow = ({ label, value, isTotal = false, indent = 0 }) => (
  <Row justify="space-between" style={{ padding: `4px 0 4px ${indent * 20}px` }}>
    <Col>
      <Text strong={isTotal}>{label}</Text>
    </Col>
    <Col>
      <Text strong={isTotal}>{formatRupiah(value)}</Text>
    </Col>
  </Row>
);

const CashFlowStatement = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const generateReport = async () => {
    if (!dateRange || dateRange.length !== 2) {
      message.error('Silakan pilih rentang tanggal.');
      return;
    }

    setLoading(true);
    setReportData(null);
    setError(null);

    const [startDate, endDate] = dateRange;
    
    try {
      // Panggil API 'kalkulator' Arus Kas kita
      const response = await axios.get(
        `/api/reports/cash-flow-statement/`, 
        {
          params: {
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
      <Title level={2}>Laporan Arus Kas</Title>
      
      {/* --- BAGIAN FILTER --- */}
      <Card style={{ marginBottom: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
        <Row gutter={16} align="bottom">
          <Col>
            <Text>Pilih Periode Laporan:</Text><br />
            <RangePicker 
              value={dateRange}
              onChange={setDateRange}
              ranges={{
                'Bulan Ini': [dayjs().startOf('month'), dayjs().endOf('month')],
                'Bulan Lalu': [
                  dayjs().subtract(1, 'month').startOf('month'),
                  dayjs().subtract(1, 'month').endOf('month'),
                ],
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
      </Card>

      {/* --- BAGIAN HASIL LAPORAN --- */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Menghitung Arus Kas..." size="large" />
        </div>
      )}

      {error && <Alert message="Error" description={error} type="error" showIcon />}

      {!loading && !reportData && (
        <Empty description="Silakan generate laporan untuk melihat data." />
      )}

      {/* Tampilkan jika data SUDAH ADA */}
      {reportData && (
        <Card style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
          <Title level={4} style={{ textAlign: 'center' }}>
            Laporan Arus Kas
          </Title>
          <Title level={5} style={{ textAlign: 'center', marginTop: 0 }}>
            Periode {dayjs(reportData.periode.split(' s/d ')[0]).format('DD MMM YYYY')} - {dayjs(reportData.periode.split(' s/d ')[1]).format('DD MMM YYYY')}
          </Title>

          {/* --- 1. ARUS KAS DARI OPERASI --- */}
          <Title level={5}>Arus Kas dari Aktivitas Operasi</Title>
          <ReportRow label="Laba Bersih" value={reportData.operasi.laba_bersih} />
          <Text strong style={{ paddingLeft: '20px' }}>Penyesuaian (Akrual):</Text>
          {reportData.operasi.penyesuaian.map((item, index) => (
            // Kita balik logikanya: Kenaikan Piutang (Positif) adalah PENGURANG Kas
            // Kenaikan Utang (Positif) adalah PENAMBAH Kas
            <ReportRow 
              key={index}
              label={item.item} 
              value={item.item.includes('Piutang') ? -item.jumlah : item.jumlah} // <-- Logika Akrual
              indent={2} 
            />
          ))}
          <hr />
          <ReportRow 
            label="Arus Kas Neto dari Operasi"
            value={reportData.operasi.arus_kas_neto_operasi}
            isTotal={true}
          />

          {/* --- 2. ARUS KAS DARI INVESTASI --- */}
          <Title level={5} style={{ marginTop: '16px' }}>Arus Kas dari Aktivitas Investasi</Title>
          {reportData.investasi.detail.length === 0 && (
            <Text style={{ paddingLeft: '20px', color: '#888' }}>(Tidak ada aktivitas investasi)</Text>
          )}
          {/* (Nanti di-loop kalo udah ada datanya) */}
          <hr />
          <ReportRow 
            label="Arus Kas Neto dari Investasi"
            value={reportData.investasi.arus_kas_neto_investasi}
            isTotal={true}
          />
          
          {/* --- 3. ARUS KAS DARI PENDANAAN --- */}
          <Title level={5} style={{ marginTop: '16px' }}>Arus Kas dari Aktivitas Pendanaan</Title>
          {reportData.pendanaan.detail.map((item, index) => (
             <ReportRow 
              key={index}
              label={item.item} 
              value={item.jumlah}
              indent={1} 
            />
          ))}
          <hr />
          <ReportRow 
            label="Arus Kas Neto dari Pendanaan"
            value={reportData.pendanaan.arus_kas_neto_pendanaan}
            isTotal={true}
          />
          
          {/* --- TOTAL & VERIFIKASI --- */}
          <hr style={{ borderStyle: 'dashed' }} />
          <Row justify="space-between" style={{ marginTop: '24px' }}>
            <Col>
              <Statistic 
                title={<Title level={4}>KENAIKAN/PENURUNAN KAS NETO</Title>}
                value={reportData.perubahan_kas_neto}
                formatter={formatRupiah}
                valueStyle={{ 
                  color: reportData.perubahan_kas_neto >= 0 ? '#3f8600' : '#cf1322',
                  fontSize: '1.5rem'
                }}
              />
            </Col>
            <Col style={{ textAlign: 'right' }}>
              <Text strong>Saldo Kas Awal Periode</Text>
              <Title level={5}>{formatRupiah(reportData.verifikasi.saldo_awal_kas)}</Title>
              <Text strong>Saldo Kas Akhir Periode</Text>
              <Title level={5}>{formatRupiah(reportData.verifikasi.saldo_akhir_kas)}</Title>
            </Col>
          </Row>
          
          {/* --- INDIKATOR BALANCE --- */}
          <div style={{ textAlign: 'center', marginTop: '24px' }}>
            {reportData.verifikasi.is_balanced ? (
              <Tag color="green" style={{ fontSize: '1.2rem', padding: '8px' }}>
                BALANCE (Perubahan Kas = Saldo Akhir - Saldo Awal)
              </Tag>
            ) : (
              <Tag color="red" style={{ fontSize: '1.2rem', padding: '8px' }}>
                UNBALANCE
              </Tag>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default CashFlowStatement;