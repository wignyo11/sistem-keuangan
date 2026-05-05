// File: src/pages/IncomeStatement.jsx
// (Halaman Laporan Laba Rugi - STANDAR AKUNTANSI RAPI)

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
  notification
} from 'antd';
import { SearchOutlined, FileExcelOutlined } from '@ant-design/icons'; 
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx'; 

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Fungsi helper untuk format Rupiah di UI Web
const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const IncomeStatement = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null); 
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'), 
    dayjs().endOf('month'),  
  ]);
  
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
        `/api/reports/income-statement/`, 
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

  // --- FUNGSI EXPORT EXCEL (FORMAT STANDAR AKUNTANSI) ---
  const exportToExcel = () => {
    if (!reportData) return;

    setIsExporting(true);

    setTimeout(() => {
      try {
        const excelData = [];
        
        // Format tanggal sesuai foto (DD/MM/YYYY)
        const dateStart = dayjs(reportData.periode.split(' s/d ')[0]).format('DD/MM/YYYY');
        const dateEnd = dayjs(reportData.periode.split(' s/d ')[1]).format('DD/MM/YYYY');
        const periodeStr = `${dateStart} - ${dateEnd}`;

        // 1. BAGIAN HEADER (Tengah)
        excelData.push(["PT. ARTO SUKSES AGREE KALCER JAYA ABADI", ""]);
        excelData.push(["LABA RUGI", ""]);
        excelData.push([periodeStr, ""]);
        excelData.push(["(dalam IDR)", ""]);
        excelData.push(["", ""]); // Spasi

        // 2. BARIS "BIRU" (Tanggal)
        excelData.push(["Tanggal", periodeStr]);

        // 3. PENDAPATAN
        excelData.push(["Pendapatan", ""]); 
        reportData.pendapatan.detail_akun.forEach(akun => {
          excelData.push([
            `  ${akun.nomor_akun} ${akun.nama_akun}`, // Nomor dan Nama digabung
            parseFloat(akun.total) || 0 
          ]);
        });
        excelData.push(["Total dari Pendapatan", parseFloat(reportData.pendapatan.total) || 0]);
        excelData.push(["", ""]); // Spasi

        // 4. BEBAN OPERASIONAL
        excelData.push(["Beban Operasional", ""]);
        reportData.beban.detail_akun.forEach(akun => {
          let nominal = parseFloat(akun.total) || 0;
          // Kita bikin jadi angka minus biar otomatis kena format kurung () di Excel
          excelData.push([
            `  ${akun.nomor_akun} ${akun.nama_akun}`, 
            -Math.abs(nominal)
          ]);
        });
        excelData.push(["Total dari Beban Operasional", -Math.abs(parseFloat(reportData.beban.total) || 0)]);
        excelData.push(["", ""]); // Spasi

        // 5. LABA BERSIH
        excelData.push(["Laba (Rugi)", parseFloat(reportData.laba_bersih) || 0]);

        // Convert ke format Worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);

        // --- MERGE CELLS (Gabung kolom A dan B untuk header biar bisa di-center) ---
        worksheet['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, // PT
          { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }, // LABA RUGI
          { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }, // Periode
          { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, // (dalam IDR)
        ];

        // --- FORMAT ANGKA (Pemisah ribuan & tanda kurung untuk minus) ---
        Object.keys(worksheet).forEach(key => {
            if (key[0] === '!') return; 
            
            // Format: #,##0.00;(#,##0.00) -> Artinya positif normal, negatif pake kurung
            if (worksheet[key].t === 'n') { 
                worksheet[key].z = '#,##0.00;(#,##0.00)'; 
            }
        });

        // --- ATUR LEBAR KOLOM (Cuma 2 Kolom sesuai foto) ---
        const columnWidths = [
          { wch: 55 }, // Kolom A: Keterangan (Lebar banget)
          { wch: 25 }, // Kolom B: Nominal (Cukup buat angka jutaan/miliaran)
        ];
        worksheet['!cols'] = columnWidths;

        // Generate File
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Laba Rugi");
        XLSX.writeFile(workbook, `Laba_Rugi_PT_ARTO_${dayjs().format('YYYYMMDD')}.xlsx`);

        api.success({
          message: 'Export Sukses!',
          description: 'Laporan Laba Rugi berhasil diexport!',
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
      {contextHolder}

      <Title level={2}>Laporan Laba Rugi</Title>
      
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

      <hr style={{ margin: '24px 0', borderColor: 'rgba(255,255,255,0.1)' }} />

      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Menghitung Laporan..." size="large" />
        </div>
      )}

      {error && <Alert message="Error" description={error} type="error" showIcon />}

      {!loading && !reportData && (
        <Empty description="Silakan generate laporan untuk melihat data." />
      )}

      {reportData && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
             <div style={{ flex: 1, textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Laporan Laba Rugi</Title>
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

          <Card type="inner" title="Pendapatan" style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)' }}>
            {reportData.pendapatan.detail_akun.map(akun => (
              <Row justify="space-between" key={akun.nomor_akun} style={{ marginBottom: '8px' }}>
                <Col><Text>{akun.nama_akun} ({akun.nomor_akun})</Text></Col>
                <Col><Text>{formatRupiah(akun.total)}</Text></Col>
              </Row>
            ))}
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Row justify="space-between">
              <Col><Title level={5} style={{ margin: 0 }}>Total Pendapatan</Title></Col>
              <Col><Title level={5} style={{ margin: 0, color: '#00bcd4' }}>{formatRupiah(reportData.pendapatan.total)}</Title></Col>
            </Row>
          </Card>
          
          <Card type="inner" title="Beban-Beban" style={{ marginTop: '16px', background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.1)' }}>
            {reportData.beban.detail_akun.map(akun => (
              <Row justify="space-between" key={akun.nomor_akun} style={{ marginBottom: '8px' }}>
                <Col><Text>{akun.nama_akun} ({akun.nomor_akun})</Text></Col>
                <Col><Text>({formatRupiah(akun.total)})</Text></Col> 
              </Row>
            ))}
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Row justify="space-between">
              <Col><Title level={5} style={{ margin: 0 }}>Total Beban</Title></Col>
              <Col><Title level={5} style={{ margin: 0, color: '#ff4d4f' }}>({formatRupiah(reportData.beban.total)})</Title></Col>
            </Row>
          </Card>
          
          <Row justify="space-between" style={{ marginTop: '24px', padding: '0 24px' }}>
            <Col span={24} style={{ textAlign: 'right' }}>
              <Statistic 
                title={<Title level={3} style={{ margin: 0 }}>LABA BERSIH</Title>}
                value={reportData.laba_bersih}
                precision={0}
                prefix="Rp"
                valueStyle={{ 
                  color: reportData.laba_bersih >= 0 ? '#3f8600' : '#cf1322', 
                  fontSize: '2rem',
                  fontWeight: 'bold'
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