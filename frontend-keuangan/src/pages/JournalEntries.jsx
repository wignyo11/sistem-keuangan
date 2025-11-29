import React, { useState, useEffect } from 'react'
import { Table, Spin, Alert, Typography, Button, message, Tag } from 'antd'
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs'
import JournalEntryModal from './JournalEntryModal' // Import modal
import { PlusOutlined } from '@ant-design/icons' // Import ikon

const { Title } = Typography;

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
  const [isModalOpen, setIsModalOpen] = useState(false); // State untuk modal
  const [accounts, setAccounts] = useState([]); // State untuk dropdown akun

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

  // --- Kolom untuk TABEL UTAMA (Induk) ---
  const mainColumns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 70, 
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
  // INI STRUKTUR LOGIKA YANG BENAR
  // ===============================================

  // 1. Tampilkan 'loading spinner' HANYA SAAT loading awal
  if (loading && entries.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin tip="Memuat Jurnal..." size="large" />
      </div>
    );
  }

  // 2. Tampilkan 'error' HANYA SAAT ada error
  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon
              action={
                <Button size="small" type="primary" onClick={fetchJournalEntries}>
                  Coba Lagi
                </Button>
              }
           />;
  }

  // 3. Tampilkan halaman JIKA sudah tidak loading DAN tidak error
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={2} style={{ margin: 0 }}>Jurnal Umum</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)} // Buka modal
        >
          Input Jurnal Baru
        </Button>
      </div>
      <p>Menampilkan semua transaksi yang dicatat dalam sistem.</p>
      
      <Table
        columns={mainColumns}
        dataSource={entries}
        rowKey="id"
        bordered
        size="small"
        loading={loading} // Ini spinner kecil di atas tabel saat me-refresh
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

      {/* Komponen Modal */}
      <JournalEntryModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitSuccess={() => fetchJournalEntries()} // Refresh tabel kalo sukses
        accounts={accounts} // Oper daftar akun ke modal
      />
    </div>
  )
}

export default JournalEntries