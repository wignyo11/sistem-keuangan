// File: src/pages/SubsidiaryLedger.jsx
// (Halaman Laporan Buku Besar Pembantu + Export ALL Multi-Sheet)

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
  const num = parseFloat(value) || 0;
  if (num < 0) {
    return `(${new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Math.abs(num))})`;
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num);
};

// Kolom untuk tabel mutasi
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

const SubsidiaryLedger = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  
  // --- STATE UNTUK FILTER ---
  const [accounts, setAccounts] = useState([]); 
  const [contacts, setContacts] = useState([]); 
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ]);

  // --- STATE UNTUK EXCEL ---
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, contactsRes] = await Promise.all([
          axios.get('/api/accounts/'),
          axios.get('/api/contacts/')
        ]);
        
        setAccounts(accountsRes.data.filter(
          acc => acc.number === '1-1100' || acc.number === '2-1000'
        ));
        setContacts(contactsRes.data);
        
      } catch (err) {
        setError('Gagal mengambil data. Pastikan server backend (Django) sudah berjalan.');
        message.error('Gagal memuat data master (akun/kontak).');
      }
    };
    fetchData();
  }, []);

  const generateReport = async () => {
    if (!selectedAccount || !selectedContact || !dateRange || dateRange.length !== 2) {
      message.error('Silakan pilih Akun Kontrol, Kontak, dan Periode Tanggal.');
      return;
    }

    setLoading(true);
    setReportData(null);
    setError(null);

    const [startDate, endDate] = dateRange;
    
    try {
      const response = await axios.get(
        `/api/reports/subsidiary-ledger/`, 
        {
          params: {
            account_id: selectedAccount,
            contact_id: selectedContact,
            start_date: startDate.format('YYYY-MM-DD'),
            end_date: endDate.format('YYYY-MM-DD'),
          }
        }
      );
      setReportData(response.data);
    } catch (err) {
      setError('Gagal mengambil data laporan. Pastikan server backend berjalan.');
    } finally {
      setLoading(false);
    }
  };

  // --- KODE PEMBANTU BIKIN EXCEL ---
  const generateExcelData = (dataReport, start, end) => {
    const excelData = [];
    const dateStart = start.format('DD/MM/YYYY');
    const dateEnd = end.format('DD/MM/YYYY');
    
    excelData.push(["PT. ARTO SUKSES AGREE KALCER JAYA ABADI", "", "", ""]);
    excelData.push(["BUKU BESAR PEMBANTU", "", "", ""]);
    excelData.push([`Kontak: ${dataReport.kontak}`, "", "", ""]);
    excelData.push([`Akun Kontrol: ${dataReport.akun_kontrol}`, "", "", ""]);
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
      { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } }, 
    ];
    Object.keys(worksheet).forEach(key => {
        if (key[0] === '!') return; 
        if (worksheet[key].t === 'n') { worksheet[key].z = '#,##0.00;(#,##0.00)'; }
    });
    worksheet['!cols'] = [ { wch: 15 }, { wch: 45 }, { wch: 20 }, { wch: 20 } ];
    return worksheet;
  };

  // --- FUNGSI EXPORT SATU KONTAK ---
  const exportToExcel = () => {
    if (!reportData) return;
    setIsExporting(true);

    setTimeout(() => {
      try {
        const excelData = generateExcelData(reportData, dateRange[0], dateRange[1]);
        const worksheet = formatWorksheet(excelData);

        const safeContactName = reportData.kontak.replace(/[^a-zA-Z0-9 -]/g, "").substring(0, 31);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, safeContactName);
        XLSX.writeFile(workbook, `Buku_Pembantu_${safeContactName}_${dayjs().format('YYYYMMDD')}.xlsx`);

        api.success({
          message: 'Export Sukses!',
          description: `Buku Pembantu untuk kontak ${reportData.kontak} berhasil diexport!`,
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

  // --- FUNGSI EXPORT SEMUA KONTAK (MULTI-SHEET) ---
  const exportAllToExcel = async () => {
    if (!selectedAccount || !dateRange || dateRange.length !== 2) {
      message.error('Pilih Akun Kontrol dan Rentang Tanggal dulu bre!');
      return;
    }

    if (contacts.length === 0) {
      message.error('Daftar kontak kosong.');
      return;
    }

    setIsExportingAll(true);
    const hideMsg = message.loading('Sedang merangkum seluruh kontak, mohon tunggu...', 0);
    const [startDate, endDate] = dateRange;

    try {
      const workbook = XLSX.utils.book_new();
      let adaDataValid = false;

      // Loop semua kontak yang ada
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];
        
        try {
          const response = await axios.get(`/api/reports/subsidiary-ledger/`, {
            params: {
              account_id: selectedAccount,
              contact_id: contact.id,
              start_date: startDate.format('YYYY-MM-DD'),
              end_date: endDate.format('YYYY-MM-DD'),
            }
          });

          const dataKontak = response.data;
          
          // FILTER: Skip kontak yang saldonya 0 dan ga ada transaksi
          if (dataKontak.mutasi.length === 0 && parseFloat(dataKontak.saldo_awal) === 0 && parseFloat(dataKontak.saldo_akhir) === 0) {
            continue; 
          }

          adaDataValid = true;

          const excelData = generateExcelData(dataKontak, startDate, endDate);
          const worksheet = formatWorksheet(excelData);

          const sheetName = contact.name.replace(/[^a-zA-Z0-9 ]/g, "").substring(0, 31);
          XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        } catch (err) {
          console.error(`Gagal ambil data kontak ${contact.name}`, err);
        }
      }

      if (!adaDataValid) {
        api.warning({
          message: 'Laporan Kosong!',
          description: 'Tidak ada mutasi piutang/utang untuk seluruh kontak di periode ini.',
          placement: 'topRight',
        });
        return;
      }

      // Ambil nama akun buat jadi nama file (misal: Piutang_Usaha_SEMUA_KONTAK.xlsx)
      const akunKontrolTerpilih = accounts.find(a => a.id === selectedAccount);
      const safeAccName = akunKontrolTerpilih ? akunKontrolTerpilih.name.replace(/[^a-zA-Z0-9 -]/g, "") : "Akun";

      XLSX.writeFile(workbook, `Buku_Pembantu_${safeAccName}_SEMUA_KONTAK_${dayjs().format('YYYYMMDD')}.xlsx`);

      api.success({
        message: 'Export Semua Kontak Sukses!',
        description: `Seluruh rincian ${safeAccName} per kontak berhasil direkap!`,
        placement: 'topRight',
        duration: 6,
      });

    } catch (error) {
      console.error("Error export all:", error);
      api.error({ message: 'Gagal Export Semua Kontak!' });
    } finally {
      hideMsg(); 
      setIsExportingAll(false);
    }
  };

  return (
    <div>
      {/* WADAH NOTIFIKASI */}
      {contextHolder}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Laporan Buku Besar Pembantu</Title>
          <p style={{ color: '#a0aec0' }}>Laporan ini merinci mutasi Piutang per Customer atau Utang per Vendor.</p>
        </div>
        
        {/* TOMBOL EXPORT SEMUA KONTAK */}
        <Button 
          type="primary" 
          style={{ background: '#0f6132', borderColor: '#0f6132', height: '40px' }} 
          icon={<DatabaseOutlined />} 
          onClick={exportAllToExcel}
          loading={isExportingAll}
        >
          Export Semua Kontak (Multi-Sheet)
        </Button>
      </div>
      
      {/* --- BAGIAN FILTER --- */}
      <Card 
        className="glass-card" 
        style={{ marginBottom: '24px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
        <Row gutter={16} align="bottom">
          <Col>
            <Text>Pilih Akun Kontrol:</Text><br />
            <Select
              style={{ width: 250 }}
              placeholder="Pilih Akun Piutang/Utang..."
              onChange={(value) => setSelectedAccount(value)}
            >
              {accounts.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {`${acc.number} - ${acc.name}`}
                </Option>
              ))}
            </Select>
          </Col>
          <Col>
            <Text>Pilih Kontak (Customer/Vendor):</Text><br />
            <Select
              showSearch
              style={{ width: 250 }}
              placeholder="Cari kontak..."
              onChange={(value) => setSelectedContact(value)}
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
            >
              {contacts.map(contact => (
                <Option key={contact.id} value={contact.id}>
                  {contact.name} ({contact.type})
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
              style={{ width: '300px' }} 
            />
          </Col>
          <Col style={{ marginTop: '18px' }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={generateReport} loading={loading}>
              Tampilkan
            </Button>
          </Col>
        </Row>
      </Card>

      {/* --- BAGIAN HASIL LAPORAN --- */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin tip="Menghitung Buku Pembantu..." size="large" />
        </div>
      )}

      {error && <Alert message="Error" description={error} type="error" showIcon />}

      {!loading && !reportData && (
        <Empty description="Silakan pilih Akun Kontrol, Kontak, dan Periode, lalu klik 'Tampilkan'." />
      )}

      {/* Tampilkan jika data SUDAH ADA */}
      {reportData && (
        <Card className="glass-card" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', borderRadius: '8px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
             <div>
                <Title level={3} style={{ margin: 0 }}>Buku Besar Pembantu: {reportData.kontak}</Title>
                <Text strong style={{ color: '#e2e8f0' }}>Akun Kontrol: {reportData.akun_kontrol}</Text><br/>
                <Text style={{ color: '#a0aec0' }}>Periode: {reportData.periode}</Text>
             </div>
             
             {/* Tombol export single kontak */}
             <Button 
                type="primary" 
                style={{ background: '#107c41', borderColor: '#107c41' }} 
                icon={<FileExcelOutlined />} 
                onClick={exportToExcel}
                loading={isExporting}
              >
                Export Kontak Ini Saja
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
        </Card>
      )}
    </div>
  );
};

export default SubsidiaryLedger;