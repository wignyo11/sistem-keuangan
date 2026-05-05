// File: src/pages/CashFlowStatement.jsx
// (Halaman Laporan Arus Kas - Metode Tidak Langsung + Export Excel Rapi)

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
  Statistic,
  notification
} from 'antd';
import { SearchOutlined, FileExcelOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Fungsi helper untuk format Rupiah di UI
const formatRupiah = (value, showSign = false) => {
  const num = parseFloat(value) || 0;
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
  
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

// Komponen kecil untuk satu baris laporan di UI
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

  // --- STATE UNTUK EXCEL ---
  const [isExporting, setIsExporting] = useState(false);
  const [api, contextHolder] = notification.useNotification();

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

  // --- FUNGSI EXPORT EXCEL (FORMAT KLASIK 2 KOLOM) ---
  const exportToExcel = () => {
    if (!reportData) return;

    setIsExporting(true);

    setTimeout(() => {
      try {
        const excelData = [];
        
        const dateStart = dayjs(reportData.periode.split(' s/d ')[0]).format('DD/MM/YYYY');
        const dateEnd = dayjs(reportData.periode.split(' s/d ')[1]).format('DD/MM/YYYY');
        const periodeStr = `${dateStart} - ${dateEnd}`;

        // 1. BAGIAN HEADER
        excelData.push(["PT. ARTO SUKSES AGREE KALCER JAYA ABADI", ""]);
        excelData.push(["LAPORAN ARUS KAS", ""]);
        excelData.push([`Periode: ${periodeStr}`, ""]);
        excelData.push(["(dalam IDR)", ""]);
        excelData.push(["", ""]);

        // 2. ARUS KAS DARI OPERASI
        excelData.push(["Arus Kas dari Aktivitas Operasi", ""]);
        excelData.push(["  Laba Bersih", parseFloat(reportData.operasi.laba_bersih) || 0]);
        excelData.push(["  Penyesuaian (Akrual):", ""]);
        
        reportData.operasi.penyesuaian.forEach(item => {
          // Logika akrual: Piutang minus, Utang plus
          let nominal = item.item.includes('Piutang') ? -item.jumlah : item.jumlah;
          excelData.push([`    ${item.item}`, parseFloat(nominal) || 0]);
        });
        
        excelData.push(["Total Arus Kas Neto dari Operasi", parseFloat(reportData.operasi.arus_kas_neto_operasi) || 0]);
        excelData.push(["", ""]);

        // 3. ARUS KAS DARI INVESTASI
        excelData.push(["Arus Kas dari Aktivitas Investasi", ""]);
        if (reportData.investasi.detail.length === 0) {
           excelData.push(["  (Tidak ada aktivitas investasi)", 0]);
        } else {
           reportData.investasi.detail.forEach(item => {
             excelData.push([`  ${item.item}`, parseFloat(item.jumlah) || 0]);
           });
        }
        excelData.push(["Total Arus Kas Neto dari Investasi", parseFloat(reportData.investasi.arus_kas_neto_investasi) || 0]);
        excelData.push(["", ""]);

        // 4. ARUS KAS DARI PENDANAAN
        excelData.push(["Arus Kas dari Aktivitas Pendanaan", ""]);
        if (reportData.pendanaan.detail.length === 0) {
           excelData.push(["  (Tidak ada aktivitas pendanaan)", 0]);
        } else {
           reportData.pendanaan.detail.forEach(item => {
             excelData.push([`  ${item.item}`, parseFloat(item.jumlah) || 0]);
           });
        }
        excelData.push(["Total Arus Kas Neto dari Pendanaan", parseFloat(reportData.pendanaan.arus_kas_neto_pendanaan) || 0]);
        excelData.push(["", ""]);

        // 5. REKAPITULASI KAS AKHIR
        excelData.push(["KENAIKAN (PENURUNAN) KAS NETO", parseFloat(reportData.perubahan_kas_neto) || 0]);
        excelData.push(["Saldo Kas Awal Periode", parseFloat(reportData.verifikasi.saldo_awal_kas) || 0]);
        excelData.push(["Saldo Kas Akhir Periode", parseFloat(reportData.verifikasi.saldo_akhir_kas) || 0]);

        // Convert ke format Worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);

        // --- MERGE CELLS HEADER ---
        worksheet['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, 
          { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, 
          { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }, 
          { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, 
        ];

        // --- FORMAT ANGKA (Pemisah ribuan & tanda kurung untuk minus) ---
        Object.keys(worksheet).forEach(key => {
            if (key[0] === '!') return; 
            if (worksheet[key].t === 'n') { 
                worksheet[key].z = '#,##0.00;(#,##0.00)'; 
            }
        });

        // --- ATUR LEBAR KOLOM ---
        const columnWidths = [
          { wch: 55 }, // Kolom A: Keterangan
          { wch: 25 }, // Kolom B: Nominal
        ];
        worksheet['!cols'] = columnWidths;

        // Generate File
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Arus Kas");
        XLSX.writeFile(workbook, `Arus_Kas_PT_ARTO_${dayjs().format('YYYYMMDD')}.xlsx`);

        api.success({
          message: 'Export Sukses!',
          description: 'Laporan Arus Kas berhasil diexport!',
          placement: 'topRight',
          duration: 5,
        });

      } catch (error) {
        console.error("Terjadi error saat bikin Excel:", error);
        api.error({
          message: 'Gagal Export!',
          description: 'Ada masalah saat membuat file Excel. Cek console.',
        });
      } finally {
        setIsExporting(false);
      }
    }, 500);
  };

  return (
    <div>
       <Card 
            className="glass-card" 
            style={{ marginBottom: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
            {/* WADAH NOTIFIKASI */}
            {contextHolder}
      
            <Title level={2}>Laporan Arus Kas</Title>

        <Row gutter={24} align="bottom">
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
                'Tahun Ini': [dayjs().startOf('year'), dayjs().endOf('year')],
                'Tahun Lalu': [
                  dayjs().subtract(1, 'year').startOf('year'),
                  dayjs().subtract(1, 'year').endOf('year'),
                ],
              }}
              style={{ width: '300px' }} // Agak dilebarin dikit biar pas
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
      
        <hr style={{ margin: '24px 0', borderColor: 'rgba(255,255,255,0.1)' }} />

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
      </Card>

      {/* Tampilkan jika data SUDAH ADA */}
      {reportData && (
        <Card 
          className="glass-card" 
          style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
          
          {/* HEADER HASIL LAPORAN & TOMBOL EXPORT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <div style={{ flex: 1, textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Laporan Arus Kas</Title>
                <Title level={5} style={{ margin: 0, color: '#a0aec0' }}>
                  Periode {dayjs(reportData.periode.split(' s/d ')[0]).format('DD MMM YYYY')} - {dayjs(reportData.periode.split(' s/d ')[1]).format('DD MMM YYYY')}
                </Title>
             </div>
             
             <Button 
                type="primary" 
                style={{ background: '#107c41', borderColor: '#107c41' }} 
                icon={<FileExcelOutlined />} 
                onClick={exportToExcel}
                loading={isExporting}
              >
                Export Excel
              </Button>
          </div>

          {/* --- 1. ARUS KAS DARI OPERASI --- */}
          <Title level={5}>Arus Kas dari Aktivitas Operasi</Title>
          <ReportRow label="Laba Bersih" value={reportData.operasi.laba_bersih} />
          <Text strong style={{ paddingLeft: '20px' }}>Penyesuaian (Akrual):</Text>
          {reportData.operasi.penyesuaian.map((item, index) => (
            <ReportRow 
              key={index}
              label={item.item} 
              value={item.item.includes('Piutang') ? -item.jumlah : item.jumlah}
              indent={2} 
            />
          ))}
          <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
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
          {reportData.investasi.detail.map((item, index) => (
             <ReportRow 
              key={`inv-${index}`}
              label={item.item} 
              value={item.jumlah}
              indent={1} 
            />
          ))}
          <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          <ReportRow 
            label="Arus Kas Neto dari Investasi"
            value={reportData.investasi.arus_kas_neto_investasi}
            isTotal={true}
          />
          
          {/* --- 3. ARUS KAS DARI PENDANAAN --- */}
          <Title level={5} style={{ marginTop: '16px' }}>Arus Kas dari Aktivitas Pendanaan</Title>
          {reportData.pendanaan.detail.length === 0 && (
            <Text style={{ paddingLeft: '20px', color: '#888' }}>(Tidak ada aktivitas pendanaan)</Text>
          )}
          {reportData.pendanaan.detail.map((item, index) => (
             <ReportRow 
              key={`pen-${index}`}
              label={item.item} 
              value={item.jumlah}
              indent={1} 
            />
          ))}
          <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          <ReportRow 
            label="Arus Kas Neto dari Pendanaan"
            value={reportData.pendanaan.arus_kas_neto_pendanaan}
            isTotal={true}
          />
          
          {/* --- TOTAL & VERIFIKASI --- */}
          <hr style={{ borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.2)' }} />
          <Row justify="space-between" style={{ marginTop: '24px' }}>
            <Col>
              <Statistic 
                title={<Title level={4} style={{ margin: 0 }}>KENAIKAN/PENURUNAN KAS NETO</Title>}
                value={reportData.perubahan_kas_neto}
                formatter={(val) => formatRupiah(val)}
                valueStyle={{ 
                  color: reportData.perubahan_kas_neto >= 0 ? '#3f8600' : '#cf1322',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}
              />
            </Col>
            <Col style={{ textAlign: 'right' }}>
              <Text strong>Saldo Kas Awal Periode</Text>
              <Title level={5} style={{ margin: 0, marginBottom: '8px' }}>{formatRupiah(reportData.verifikasi.saldo_awal_kas)}</Title>
              <Text strong>Saldo Kas Akhir Periode</Text>
              <Title level={5} style={{ margin: 0 }}>{formatRupiah(reportData.verifikasi.saldo_akhir_kas)}</Title>
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