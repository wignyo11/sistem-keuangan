// File: src/pages/TrialBalance.jsx
// (Halaman Laporan Neraca Saldo + Export Excel Super Rapi)

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
  Table,
  notification
} from 'antd';
import { SearchOutlined, FileExcelOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx'; // <-- Import library excel

const { Title, Text } = Typography;

// Fungsi helper untuk format Rupiah UI
const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

// Kolom untuk tabel Neraca Saldo di UI
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

  // --- STATE UNTUK EXCEL ---
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

  // --- FUNGSI EXPORT EXCEL (FORMAT TABEL 4 KOLOM) ---
  const exportToExcel = () => {
    if (!reportData) return;

    setIsExporting(true);

    setTimeout(() => {
      try {
        const excelData = [];
        const dateStr = dayjs(reportData.periode_per_tanggal).format('DD/MM/YYYY');

        // 1. BAGIAN HEADER LAPORAN (Tengah)
        excelData.push(["PT. ARTO SUKSES AGREE KALCER JAYA ABADI", "", "", ""]);
        excelData.push(["NERACA SALDO (TRIAL BALANCE)", "", "", ""]);
        excelData.push([`Per Tanggal: ${dateStr}`, "", "", ""]);
        excelData.push(["(dalam IDR)", "", "", ""]);
        excelData.push(["", "", "", ""]); 

        // 2. HEADER TABEL
        excelData.push(["Nomor Akun", "Nama Akun", "Debit", "Kredit"]);

        // 3. ISI DATA TABEL
        reportData.detail_akun.forEach(akun => {
          let deb = parseFloat(akun.debit) || 0;
          let kre = parseFloat(akun.kredit) || 0;
          
          // Kalau nol, kita lempar string "-" biar rapi, kalau ada angka kita lempar Number
          excelData.push([
            akun.nomor_akun, 
            akun.nama_akun, 
            deb === 0 ? "-" : deb, 
            kre === 0 ? "-" : kre
          ]);
        });

        // 4. BARIS TOTAL
        excelData.push([
          "", 
          "GRAND TOTAL", 
          parseFloat(reportData.total_debit) || 0, 
          parseFloat(reportData.total_kredit) || 0
        ]);

        // Convert ke format Worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);

        // --- MERGE CELLS (Gabung kolom A sampai D untuk judul biar di tengah) ---
        worksheet['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // PT
          { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Judul
          { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // Periode
          { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }, // (dalam IDR)
          { s: { r: excelData.length - 1, c: 0 }, e: { r: excelData.length - 1, c: 1 } }, // Merge baris GRAND TOTAL
        ];

        // --- FORMAT ANGKA OTOMATIS (Ribuan) ---
        Object.keys(worksheet).forEach(key => {
            if (key[0] === '!') return; 
            if (worksheet[key].t === 'n') { 
                worksheet[key].z = '#,##0.00;(#,##0.00)'; 
            }
        });

        // --- ATUR LEBAR KOLOM ---
        const columnWidths = [
          { wch: 15 }, // Kolom A: Nomor Akun
          { wch: 45 }, // Kolom B: Nama Akun
          { wch: 20 }, // Kolom C: Debit
          { wch: 20 }, // Kolom D: Kredit
        ];
        worksheet['!cols'] = columnWidths;

        // Generate File
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Neraca Saldo");
        XLSX.writeFile(workbook, `Neraca_Saldo_PT_ARTO_${dayjs().format('YYYYMMDD')}.xlsx`);

        api.success({
          message: 'Export Sukses!',
          description: 'Laporan Neraca Saldo berhasil diexport dengan format rapi!',
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
      {/* WADAH NOTIFIKASI */}
      {contextHolder}

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

      <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

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
          {/* HEADER HASIL LAPORAN & TOMBOL EXPORT */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '20px' }}>
             <div style={{ flex: 1, textAlign: 'center' }}>
                <Title level={4} style={{ margin: 0 }}>Neraca Saldo</Title>
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
              <Title level={5} style={{ margin: 0 }}>GRAND TOTAL</Title>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={2} align="right">
              <Title level={5} style={{ margin: 0, color: reportData.is_balanced ? '#3f8600' : '#cf1322' }}>
                {formatRupiah(reportData.total_debit)}
              </Title>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={3} align="right">
              <Title level={5} style={{ margin: 0, color: reportData.is_balanced ? '#3f8600' : '#cf1322' }}>
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