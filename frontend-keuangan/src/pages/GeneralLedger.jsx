// File: src/pages/GeneralLedger.jsx
// (Halaman Laporan Buku Besar + Fitur Export ALL Multi-Sheet)

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
  Table,
  notification
} from 'antd';
import { SearchOutlined, FileExcelOutlined, DatabaseOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

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

// Kolom untuk tabel mutasi UI
const columns = [
  {
    title: 'Tanggal',
    dataIndex: ['journal_entry__date'],
    key: 'tanggal',
    render: (text) => dayjs(text).format('DD MMM YYYY'),
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
  
  const [accounts, setAccounts] = useState([]); 
  const [selectedAccount, setSelectedAccount] = useState(null); 
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false); // <-- State baru buat loading export semua
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const response = await axios.get('/api/accounts/');
        setAccounts(response.data);
      } catch (error) {
        message.error('Gagal memuat daftar akun.');
      }
    };
    fetchAccounts();
  }, []); 

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
      const response = await axios.get(
        `/api/reports/general-ledger/`, 
        {
          params: {
            account_id: selectedAccount,
            start_date: startDate.format('YYYY-MM-DD'),
            end_date: endDate.format('YYYY-MM-DD'),
          }
        }
      );
      setReportData(response.data);
    } catch (err) {
      setError('Gagal mengambil data laporan.');
    } finally {
      setLoading(false);
    }
  };

  // --- FUNGSI EXPORT SATU AKUN ---
  const exportToExcel = () => {
    if (!reportData) return;
    setIsExporting(true);

    setTimeout(() => {
      try {
        const excelData = generateExcelData(reportData, dateRange[0], dateRange[1]);
        const worksheet = formatWorksheet(excelData);

        const safeAccountName = reportData.akun.replace(/[^a-zA-Z0-9 -]/g, "").substring(0, 31);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, safeAccountName);
        XLSX.writeFile(workbook, `Buku_Besar_${safeAccountName}_${dayjs().format('YYYYMMDD')}.xlsx`);

        api.success({
          message: 'Export Sukses!',
          description: `Buku Besar untuk akun ${reportData.akun} berhasil diexport!`,
          placement: 'topRight',
        });
      } catch (error) {
        console.error("Error bikin Excel:", error);
        api.error({ message: 'Gagal Export!' });
      } finally {
        setIsExporting(false);
      }
    }, 500);
  };

  // --- FUNGSI EXPORT SEMUA AKUN (MULTI-SHEET) ---
  const exportAllToExcel = async () => {
    if (!dateRange || dateRange.length !== 2) {
      message.error('Silakan pilih Rentang Tanggal terlebih dahulu!');
      return;
    }

    if (accounts.length === 0) {
      message.error('Daftar akun kosong, pastikan koneksi backend jalan.');
      return;
    }

    setIsExportingAll(true);
    const hideMsg = message.loading('Sedang merangkum seluruh akun, mohon tunggu...', 0);
    const [startDate, endDate] = dateRange;

    try {
      const workbook = XLSX.utils.book_new();
      let adaDataValid = false;

      // Kita loop satu per satu biar server Django lu nggak nge-lag ditembak banyak request
      for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i];
        
        try {
          const response = await axios.get(`/api/reports/general-ledger/`, {
            params: {
              account_id: acc.id,
              start_date: startDate.format('YYYY-MM-DD'),
              end_date: endDate.format('YYYY-MM-DD'),
            }
          });

          const dataAkun = response.data;
          
          // FILTER: Skip kalau saldonya 0 dan mutasinya kosong
          if (dataAkun.mutasi.length === 0 && parseFloat(dataAkun.saldo_awal) === 0 && parseFloat(dataAkun.saldo_akhir) === 0) {
            continue; // Lewati akun ini, lanjut ke akun berikutnya
          }

          adaDataValid = true;

          // Susun data Excel-nya
          const excelData = generateExcelData(dataAkun, startDate, endDate);
          const worksheet = formatWorksheet(excelData);

          // Bikin nama tab Excel (Max 31 karakter, ga boleh ada simbol aneh)
          const sheetName = `${acc.number}-${acc.name}`.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 31);
          
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        } catch (err) {
          console.error(`Gagal ambil data akun ${acc.name}`, err);
        }
      }

      if (!adaDataValid) {
        api.warning({
          message: 'Laporan Kosong!',
          description: 'Tidak ada mutasi atau saldo di periode ini untuk seluruh akun.',
          placement: 'topRight',
        });
        return;
      }

      // Download gabungannya!
      XLSX.writeFile(workbook, `Buku_Besar_SEMUA_AKUN_PT_ARTO_${dayjs().format('YYYYMMDD')}.xlsx`);

      api.success({
        message: 'Export Semua Akun Sukses!',
        description: 'Seluruh akun berhasil direkap ke dalam 1 file Excel!',
        placement: 'topRight',
        duration: 6,
      });

    } catch (error) {
      console.error("Error export all:", error);
      api.error({ message: 'Gagal Export Semua Akun!' });
    } finally {
      hideMsg(); // Tutup pesan loading
      setIsExportingAll(false);
    }
  };

  // --- KODE PEMBANTU: Biar logika nyusun sel Excel ga diulang 2 kali ---
  const generateExcelData = (dataReport, start, end) => {
    const excelData = [];
    const dateStart = start.format('DD/MM/YYYY');
    const dateEnd = end.format('DD/MM/YYYY');
    
    excelData.push(["PT. ARTO SUKSES AGREE KALCER JAYA ABADI", "", "", ""]);
    excelData.push(["BUKU BESAR (GENERAL LEDGER)", "", "", ""]);
    excelData.push([`Nama Akun: ${dataReport.akun}`, "", "", ""]);
    excelData.push([`Periode: ${dataReport.periode}`, "", "", ""]);
    excelData.push(["(dalam IDR)", "", "", ""]);
    excelData.push(["", "", "", ""]); 

    excelData.push(["Tanggal", "Keterangan", "Debit", "Kredit"]);

    excelData.push([dateStart, "SALDO AWAL", "", parseFloat(dataReport.saldo_awal) || 0]);

    dataReport.mutasi.forEach(item => {
      let deb = parseFloat(item.debit) || 0;
      let kre = parseFloat(item.credit) || 0;
      excelData.push([
        dayjs(item.journal_entry__date).format('DD/MM/YYYY'), 
        item.journal_entry__description, 
        deb === 0 ? "-" : deb, 
        kre === 0 ? "-" : kre
      ]);
    });

    excelData.push(["", "Total Mutasi Periode Ini", parseFloat(dataReport.total_debit_mutasi) || 0, parseFloat(dataReport.total_kredit_mutasi) || 0]);
    excelData.push([dateEnd, "SALDO AKHIR", "", parseFloat(dataReport.saldo_akhir) || 0]);

    return excelData;
  };

  const formatWorksheet = (excelData) => {
    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, 
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, 
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, 
      { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } }, 
      { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } }, 
    ];
    Object.keys(worksheet).forEach(key => {
        if (key[0] === '!') return; 
        if (worksheet[key].t === 'n') { worksheet[key].z = '#,##0.00;(#,##0.00)'; }
    });
    worksheet['!cols'] = [ { wch: 15 }, { wch: 45 }, { wch: 20 }, { wch: 20 } ];
    return worksheet;
  };

  return (
    <Card className="glass-card" style={{ marginBottom: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
      {contextHolder}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Buku Besar (General Ledger)</Title>
          <p style={{ color: '#a0aec0' }}>Laporan ini merinci semua transaksi (mutasi) untuk satu akun dalam periode tertentu.</p>
        </div>
        
        {/* ---> TOMBOL EXPORT SEMUA AKUN DI TARUH DI ATAS SINI <--- */}
        <Button 
          type="primary" 
          style={{ background: '#0f6132', borderColor: '#0f6132', height: '40px' }} 
          icon={<DatabaseOutlined />} 
          onClick={exportAllToExcel}
          loading={isExportingAll}
        >
          Export Semua Akun (Multi-Sheet)
        </Button>
      </div>
      
      <Row gutter={16} align="bottom" style={{ marginBottom: '24px', marginTop: '16px' }}>
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
          <Button type="primary" icon={<SearchOutlined />} onClick={generateReport} loading={loading}>
            Tampilkan Buku Besar
          </Button>
        </Col>
      </Row>

      <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Menghitung Buku Besar..." size="large" />
        </div>
      )}

      {error && <Alert message="Error" description={error} type="error" showIcon />}

      {!loading && !reportData && (
        <Empty description="Silakan pilih Akun dan Periode, lalu klik 'Tampilkan Buku Besar'." />
      )}

      {reportData && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', marginTop: '16px' }}>
             <div>
                <Title level={4} style={{ margin: 0 }}>Buku Besar: {reportData.akun}</Title>
                <Text style={{ color: '#a0aec0' }}>Periode: {reportData.periode}</Text>
             </div>
             
             {/* Tombol export single akun */}
             <Button 
                type="primary" 
                style={{ background: '#107c41', borderColor: '#107c41' }} 
                icon={<FileExcelOutlined />} 
                onClick={exportToExcel}
                loading={isExporting}
              >
                Export Akun Ini Saja
              </Button>
          </div>
          
          <Row justify="space-between" style={{ padding: '8px 12px', marginTop: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <Col><Text strong>Saldo Awal (per {dateRange[0].format('DD MMM YYYY')})</Text></Col>
            <Col><Text strong style={{ color: '#00bcd4' }}>{formatRupiah(reportData.saldo_awal)}</Text></Col>
          </Row>

          <Table
            columns={columns}
            dataSource={reportData.mutasi}
            rowKey="id"
            bordered
            size="small"
            pagination={false}
            style={{ marginTop: '8px', marginBottom: '8px' }}
          />
          
          <div style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px' }}>
            <Row justify="space-between" style={{ marginBottom: '8px' }}>
              <Col span={12}><Text strong>Total Mutasi Periode Ini:</Text></Col>
              <Col span={6} style={{ textAlign: 'right' }}><Text strong>{formatRupiah(reportData.total_debit_mutasi)}</Text></Col>
              <Col span={6} style={{ textAlign: 'right' }}><Text strong>{formatRupiah(reportData.total_kredit_mutasi)}</Text></Col>
            </Row>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Row justify="space-between" style={{ marginTop: '8px' }}>
              <Col><Title level={5} style={{ margin: 0 }}>Saldo Akhir (per {dateRange[1].format('DD MMM YYYY')})</Title></Col>
              <Col><Title level={5} style={{ margin: 0, color: '#00bcd4' }}>{formatRupiah(reportData.saldo_akhir)}</Title></Col>
            </Row>
          </div>
        </div>
      )}

    </Card>
  );
};

export default GeneralLedger;