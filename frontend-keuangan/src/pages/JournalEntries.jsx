// File: src/pages/JournalEntries.jsx
import React, { useState, useEffect } from 'react'
import { Table, Spin, Alert, Typography, Button, notification, message, Tag, Card } from 'antd'
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs'
import JournalEntryModal from './JournalEntryModal' // Import modal
import { PlusOutlined, FileExcelOutlined } from '@ant-design/icons' // Import ikon Excel
import * as XLSX from 'xlsx'; // Import library excel

const { Title, Text } = Typography;

// --- Kolom untuk TABEL DETAIL (di dalam) ---
const expandedRowColumns = [
  {
    title: 'Akun',
    dataIndex: 'account_name',
    key: 'account_name',
    render: (text, record) => `${record.account} - ${text}`
  },
  {
    title: 'Debit (Rp)',
    dataIndex: 'debit',
    key: 'debit',
    align: 'right',
    render: (text) => new Intl.NumberFormat('id-ID').format(text)
  },
  {
    title: 'Kredit (Rp)',
    dataIndex: 'credit',
    key: 'credit',
    align: 'right',
    render: (text) => new Intl.NumberFormat('id-ID').format(text)
  },
];

function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accounts, setAccounts] = useState([]); 
  const [isExporting, setIsExporting] = useState(false); 
  const [api, contextHolder] = notification.useNotification();

  // Fungsi untuk ambil data Jurnal dan Akun
  const fetchJournalEntries = async () => {
    setLoading(true);
    try {
      // Ambil 2 data sekaligus
      const [entriesRes, accountsRes] = await Promise.all([
        axios.get('/api/journal-entries/'),
        axios.get('/api/accounts/')
      ]);
      
      setEntries(entriesRes.data);
      setAccounts(accountsRes.data);
      setError(null);
    } catch (err) {
      setError('Gagal mengambil data. Pastikan server backend (Django) sudah berjalan.');
      console.error(err);
      message.error('Gagal mengambil data!');
    } finally {
      setLoading(false);
    }
  };

  // Ambil data saat halaman pertama dibuka
  useEffect(() => {
    fetchJournalEntries();
  }, []);

  // --- FUNGSI EXPORT EXCEL (DENGAN UX LOADING) ---
  const exportToExcel = () => {
    // 1. Nyalain animasi muter di tombol
    setIsExporting(true);

    // 2. Kasih jeda setengah detik biar animasi sempet jalan sebelum proses Excel yang berat
    setTimeout(() => {
      try {
        console.log("Memulai proses export..."); 
        
        if (!entries || entries.length === 0) {
          message.warning('Tidak ada data jurnal untuk diexport!');
          setIsExporting(false); // Matiin loading kalau gagal
          return;
        }

        const dataRapi = [];
        
        entries.forEach((jurnal) => {
          const items = jurnal.items || []; 
          
          items.forEach((item, index) => {
            dataRapi.push({
              "ID Jurnal": index === 0 ? `#${jurnal.id}` : "",
              "Tanggal": index === 0 ? dayjs(jurnal.date).format('DD MMM YYYY') : "",
              "Keterangan": index === 0 ? jurnal.description : "",
              "No. Akun": item.account || "",
              "Nama Akun": item.account_name || "",
              "Debit (Rp)": parseFloat(item.debit) || 0,
              "Kredit (Rp)": parseFloat(item.credit) || 0
            });
          });
          
          // Baris kosong sebagai pemisah 
          dataRapi.push({
              "ID Jurnal": "", "Tanggal": "", "Keterangan": "", 
              "No. Akun": "", "Nama Akun": "", "Debit (Rp)": "", "Kredit (Rp)": ""
          }); 
        });

        // Bikin worksheet
        const worksheet = XLSX.utils.json_to_sheet(dataRapi);

        // Atur lebar kolom
        const columnWidths = [
          { wch: 10 }, { wch: 15 }, { wch: 35 }, 
          { wch: 12 }, { wch: 25 }, { wch: 18 }, { wch: 18 }
        ];
        worksheet['!cols'] = columnWidths;

        // Buat file dan download
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Jurnal Umum");
        XLSX.writeFile(workbook, `Jurnal_Umum_Equilib_${dayjs().format('YYYYMMDD')}.xlsx`);
        
        // 3. Munculin notifikasi hijau!
        api.success({
          message: 'Export Sukses!',
          description: 'Berhasil Download Laporan Excel Jurnal Umum!',
          placement: 'topRight',
          duration: 5,
        });
        
      } catch (error) {
        console.error("Terjadi error saat bikin Excel:", error);
        message.error("Gagal membuat Excel! Buka Inspect Element -> Console untuk melihat detail error.");
      } finally {
        // 4. Matiin animasi muter di tombol setelah sukses/gagal
        setIsExporting(false);
      }
    }, 500); // Waktu tunda 500 milidetik
  };

  // --- Kolom untuk TABEL UTAMA (Induk) ---
  const mainColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      sorter: (a, b) => a.id - b.id,
      render: (text) => <Text strong>#{text}</Text> 
    },
    {
      title: 'Tanggal',
      dataIndex: 'date',
      key: 'date',
      render: (text) => dayjs(text).format('DD MMMM YYYY'),
      sorter: (a, b) => new Date(a.date) - new Date(b.date),
    },
    {
      title: 'Keterangan',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Total (Rp)',
      key: 'total',
      align: 'right',
      render: (_, record) => {
        const totalDebit = record.items.reduce((sum, item) => sum + parseFloat(item.debit), 0);
        return new Intl.NumberFormat('id-ID').format(totalDebit);
      }
    },
    {
      title: 'Status',
      key: 'status',
      align: 'center',
      render: (_, record) => {
        const totalDebit = record.items.reduce((sum, item) => sum + parseFloat(item.debit), 0);
        const totalCredit = record.items.reduce((sum, item) => sum + parseFloat(item.credit), 0);
        return totalDebit === totalCredit ? (
          <Tag color="green">BALANCE</Tag>
        ) : (
          <Tag color="red">UNBALANCE</Tag>
        );
      }
    }
  ];

  // ===============================================
  // STRUKTUR RENDER
  // ===============================================

  if (loading && entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin tip="Memuat Jurnal..." size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon
              action={
                <Button size="small" type="primary" onClick={fetchJournalEntries}>
                  Coba Lagi
                </Button>
              }
           />;
  }

  return (
    <div>
      {contextHolder}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#e2e8f0' }}>Jurnal Umum</Title>
          <Text style={{ color: '#a0aec0' }}>Menampilkan semua transaksi yang dicatat dalam sistem.</Text>
        </div>
        
        {/* Container untuk grup tombol */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* ---> TAMBAHAN: Atribut loading di Tombol Export Excel */}
          <Button 
            type="primary" 
            style={{ background: '#107c41', borderColor: '#107c41' }} 
            icon={<FileExcelOutlined />} 
            onClick={exportToExcel}
            loading={isExporting} // Kunci animasinya di sini
          >
            Export Excel
          </Button>

          {/* Tombol Input Baru */}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalOpen(true)}
          >
            Input Jurnal Baru
          </Button>
        </div>
      </div>
      
      {/* Bungkus table pakai Card biar bisa dikasih efek glassmorphism lu */}
      <Card className="glass-card" bordered={false} bodyStyle={{ padding: 0 }}>
        <Table
          columns={mainColumns}
          dataSource={entries}
          rowKey="id"
          size="small"
          loading={loading}
          expandable={{
            expandedRowRender: (record) => (
              <Table
                columns={expandedRowColumns}
                dataSource={record.items}
                rowKey="id"
                size="small"
                pagination={false}
              />
            ),
            rowExpandable: (record) => record.items && record.items.length > 0,
          }}
        />
      </Card>

      {/* Komponen Modal */}
      <JournalEntryModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitSuccess={() => fetchJournalEntries()}
        accounts={accounts}
      />
    </div>
  )
}

export default JournalEntries