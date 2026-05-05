// File: src/pages/BalanceSheet.jsx
// (Halaman Laporan Neraca - Format Skontro Excel Super Rapi)

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
  Tag,
  notification
} from 'antd';
import { SearchOutlined, FileExcelOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;

// Fungsi helper untuk format Rupiah (UI Web)
const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

// Komponen kecil untuk satu baris laporan di Web
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
  const [endDate, setEndDate] = useState(dayjs().endOf('month')); 

  const [isExporting, setIsExporting] = useState(false);
  const [api, contextHolder] = notification.useNotification();

  const generateReport = async () => {
    if (!endDate) {
      message.error('Silakan pilih tanggal akhir periode.');
      return;
    }

    setLoading(true);
    setReportData(null);
    setError(null);

    try {
      const response = await axios.get(
        `/api/reports/balance-sheet/`, 
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

  // --- FUNGSI EXPORT EXCEL (FORMAT SKONTRO - KIRI KANAN) ---
  const exportToExcel = () => {
    if (!reportData) return;

    setIsExporting(true);

    setTimeout(() => {
      try {
        const excelData = [];
        const dateStr = dayjs(reportData.periode_per_tanggal).format('DD/MM/YYYY');

        // 1. HEADER UTAMA (Tengah)
        excelData.push(["PT. ARTO SUKSES AGREE KALCER JAYA ABADI", "", "", "", ""]);
        excelData.push(["NERACA (BALANCE SHEET)", "", "", "", ""]);
        excelData.push([`Per Tanggal: ${dateStr}`, "", "", "", ""]);
        excelData.push(["(dalam IDR)", "", "", "", ""]);
        excelData.push(["", "", "", "", ""]); 

        // 2. SIAPIN DATA KIRI (ASET)
        const leftSide = [];
        leftSide.push(["ASET", ""]);
        
        reportData.aset.detail_akun.forEach(akun => {
          leftSide.push([`  ${akun.nomor_akun} ${akun.nama_akun}`, parseFloat(akun.saldo_akhir) || 0]);
        });
        
        leftSide.push(["", ""]); // Spasi sebelum total
        leftSide.push(["TOTAL ASET", parseFloat(reportData.aset.total) || 0]);

        // 3. SIAPIN DATA KANAN (LIABILITAS & EKUITAS)
        const rightSide = [];
        rightSide.push(["LIABILITAS", ""]);
        
        reportData.liabilitas.detail_akun.forEach(akun => {
          rightSide.push([`  ${akun.nomor_akun} ${akun.nama_akun}`, parseFloat(akun.saldo_akhir) || 0]);
        });
        rightSide.push(["Total Liabilitas", parseFloat(reportData.liabilitas.total) || 0]);
        
        rightSide.push(["", ""]); // Spasi antar kelompok
        
        rightSide.push(["EKUITAS", ""]);
        reportData.ekuitas.detail_akun.forEach(akun => {
          rightSide.push([`  ${akun.nomor_akun} ${akun.nama_akun}`, parseFloat(akun.saldo_akhir) || 0]);
        });
        rightSide.push([`  Laba Ditahan`, parseFloat(reportData.ekuitas.laba_ditahan_semua_periode) || 0]);
        rightSide.push(["Total Ekuitas", parseFloat(reportData.ekuitas.total) || 0]);
        
        rightSide.push(["", ""]); // Spasi sebelum total akhir
        rightSide.push(["TOTAL LIABILITAS & EKUITAS", parseFloat(reportData.total_liabilitas_plus_ekuitas) || 0]);

        // 4. GABUNGIN KIRI DAN KANAN JADI 5 KOLOM (A, B, [Spasi C], D, E)
        const maxRows = Math.max(leftSide.length, rightSide.length);
        
        // Header Tabel
        excelData.push(["Akun Aset", "Nominal (Rp)", "", "Akun Liabilitas & Ekuitas", "Nominal (Rp)"]);

        for (let i = 0; i < maxRows; i++) {
          const L = leftSide[i] || ["", ""];
          const R = rightSide[i] || ["", ""];
          // Kolom C sengaja kita kasih string kosong "" biar jadi pemisah
          excelData.push([L[0], L[1], "", R[0], R[1]]); 
        }

        // 5. CONVERT KE WORKSHEET
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);

        // --- MERGE CELLS (Biar Header di tengah-tengah dari kolom A sampai E) ---
        worksheet['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // PT
          { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // NERACA
          { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // Tanggal
          { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }, // (dalam IDR)
        ];

        // --- FORMAT ANGKA OTOMATIS (Ribuan & Kurung untuk minus) ---
        Object.keys(worksheet).forEach(key => {
            if (key[0] === '!') return; 
            if (worksheet[key].t === 'n') { 
                worksheet[key].z = '#,##0.00;(#,##0.00)'; 
            }
        });

        // --- ATUR LEBAR KOLOM ---
        const columnWidths = [
          { wch: 35 }, // Kolom A: Nama Akun Aset
          { wch: 20 }, // Kolom B: Nominal Aset
          { wch: 3 },  // Kolom C: SPASI PEMISAH (Sengaja kecil aja)
          { wch: 35 }, // Kolom D: Nama Akun Liabilitas/Ekuitas
          { wch: 20 }, // Kolom E: Nominal Liabilitas/Ekuitas
        ];
        worksheet['!cols'] = columnWidths;

        // Generate File
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Neraca");
        XLSX.writeFile(workbook, `Neraca_PT_ARTO_${dayjs().format('YYYYMMDD')}.xlsx`);

        api.success({
          message: 'Export Sukses!',
          description: 'Laporan Neraca (Balance Sheet) berhasil diexport!',
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
    <Card 
        className="glass-card" 
        style={{ marginBottom: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
      {/* Wadah Notifikasi */}
      {contextHolder}

      <Title level={2}>Laporan Neraca (Balance Sheet)</Title>
      
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

      <hr style={{ margin: '24px 0', borderColor: 'rgba(255,255,255,0.1)' }} />

      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Menghitung Neraca..." size="large" />
        </div>
      )}

      {error && <Alert message="Error" description={error} type="error" showIcon />}

      {!loading && !reportData && (
        <Empty description="Silakan generate laporan untuk melihat data." />
      )}

      {reportData && (
        <div>
          {/* HEADER LAPORAN & TOMBOL EXPORT EXCEL */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <div style={{ flex: 1, textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Laporan Neraca</Title>
                <Title level={5} style={{ margin: 0, color: '#a0aec0' }}>
                  Per Tanggal {dayjs(reportData.periode_per_tanggal).format('DD MMMM YYYY')}
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

          <Row gutter={24}>
            {/* --- KOLOM KIRI (ASET) --- */}
            <Col span={12}>
              <Card type="inner" title="ASET" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)' }}>
                {reportData.aset.detail_akun.map(akun => (
                  <ReportRow 
                    key={akun.nomor_akun}
                    label={`${akun.nomor_akun} - ${akun.nama_akun}`}
                    value={akun.saldo_akhir}
                  />
                ))}
                <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <ReportRow 
                  label="TOTAL ASET"
                  value={reportData.aset.total}
                  isTotal={true}
                />
              </Card>
            </Col>
            
            {/* --- KOLOM KANAN (LIABILITAS + EKUITAS) --- */}
            <Col span={12}>
              <Card type="inner" title="LIABILITAS (KEWAJIBAN)" style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)' }}>
                {reportData.liabilitas.detail_akun.map(akun => (
                  <ReportRow 
                    key={akun.nomor_akun}
                    label={`${akun.nomor_akun} - ${akun.nama_akun}`}
                    value={akun.saldo_akhir}
                  />
                ))}
                <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <ReportRow 
                  label="Total Liabilitas"
                  value={reportData.liabilitas.total}
                  isTotal={true}
                />
              </Card>
              
              <Card type="inner" title="EKUITAS (MODAL)" style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)' }}>
                {reportData.ekuitas.detail_akun.map(akun => (
                  <ReportRow 
                    key={akun.nomor_akun}
                    label={`${akun.nomor_akun} - ${akun.nama_akun}`}
                    value={akun.saldo_akhir}
                  />
                ))}
                <ReportRow 
                  label="Laba Ditahan"
                  value={reportData.ekuitas.laba_ditahan_semua_periode}
                />
                <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                <ReportRow 
                  label="Total Ekuitas"
                  value={reportData.ekuitas.total}
                  isTotal={true}
                />
              </Card>
              
              <hr style={{ borderColor: 'rgba(255,255,255,0.1)', marginTop: '20px' }} />
              <ReportRow 
                label="TOTAL LIAB + EKUITAS"
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