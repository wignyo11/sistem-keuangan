// File: src/pages/ChartOfAccounts.jsx
// (KODE LENGKAP - GET & POST)

import React, { useState, useEffect } from 'react'
import {
  Table, Spin, Alert, Typography, Button, message,
  Modal, Form, Input, Select
} from 'antd'
import { PlusOutlined } from '@ant-design/icons' // Import ikon tambah
import axios from '../utils/axiosInstance';

const { Title } = Typography;

// 1. Tentukan kolom-kolom untuk tabel
const columns = [
  {
    title: 'Nomor Akun',
    dataIndex: 'number',
    key: 'number',
    sorter: (a, b) => a.number.localeCompare(b.number),
  },
  {
    title: 'Nama Akun',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Tipe Akun',
    dataIndex: 'type',
    key: 'type',
    filters: [
      { text: 'Aset', value: 'ASET' },
      { text: 'Liabilitas', value: 'LIABILITAS' },
      { text: 'Ekuitas', value: 'EKUITAS' },
      { text: 'Pendapatan', value: 'PENDAPATAN' },
      { text: 'Beban (HPP)', value: 'BEBAN' },
      { text: 'Beban Lainnya', value: 'BEBAN_LAIN' },
    ],
    onFilter: (value, record) => record.type.indexOf(value) === 0,
  },
  {
    title: 'Saldo Normal',
    dataIndex: 'normal_balance',
    key: 'normal_balance',
  },
];

function ChartOfAccounts() {
  // 2. State untuk data tabel
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 3. State untuk Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm(); // Hook dari Antd untuk mengontrol form

  // 4. Fungsi untuk AMBIL (GET) data
  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/accounts/');
      setAccounts(response.data);
      setError(null);
    } catch (err) {
      setError('Gagal mengambil data dari server. Pastikan server backend (Django) sudah berjalan di port 8000.');
      console.error(err);
      message.error('Gagal mengambil data dari server!');
    } finally {
      setLoading(false);
    }
  };

  // 5. Fungsi untuk KIRIM (POST) data
  const handleFormSubmit = async (values) => {
    try {
      // Kirim data (POST) ke API Django
      await axios.post('/api/accounts/', values);
      
      message.success('Akun baru berhasil ditambahkan!'); // Notif sukses
      setIsModalOpen(false); // Tutup modal
      form.resetFields(); // Kosongkan form
      
      // Ambil ulang data biar tabelnya update
      fetchAccounts(); 
      
    } catch (err) {
      // Tangani jika ada error validasi dari server (misal: nomor akun duplikat)
      if (err.response && err.response.data && err.response.data.number) {
        message.error(`Gagal: ${err.response.data.number[0]}`);
      } else {
        message.error('Gagal menambahkan akun. Cek kembali data Anda.');
      }
      console.error(err);
    }
  };

  // 6. Ambil data saat halaman pertama kali dibuka
  useEffect(() => {
    fetchAccounts();
  }, []);

  // 7. Tampilkan 'loading spinner' kalo lagi ambil data
  if (loading && accounts.length === 0) { // Hanya tampilkan full-screen spinner saat loading awal
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin tip="Memuat data Akun..." size="large" />
      </div>
    );
  }

  // 8. Tampilkan pesan 'error' kalo gagal
  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon 
              action={
                <Button size="small" type="primary" onClick={fetchAccounts}>
                  Coba Lagi
                </Button>
              }
           />;
  }

  // 9. Tampilkan halaman (Tombol, Tabel, dan Modal)
  return (
    <div>
      {/* --- HEADER & TOMBOL --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={2} style={{ margin: 0 }}>Bagan Akun (Chart of Accounts)</Title>
        <Button 
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)} // Buka modal saat diklik
        >
          Tambah Akun
        </Button>
      </div>
      <p>Ini adalah daftar semua akun dalam sistem akuntansi.</p>
      
      {/* --- TABEL DATA --- */}
      <Table 
        style={{ 
        background: '#417690', 
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(8, 2, 2, 0.05)'
        }}
        columns={columns}
        dataSource={accounts}
        rowKey="id"
        bordered
        size="small"
        loading={loading} // Tampilkan loading di tabel saat refresh
      />

      {/* --- MODAL UNTUK FORM TAMBAH AKUN --- */}
      <Modal
        title="Tambah Akun Baru"
        open={isModalOpen} // Status buka/tutup
        onCancel={() => setIsModalOpen(false)} // Aksi saat klik 'Cancel'
        footer={null} // Kita buat tombol submit sendiri di dalam form
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit} // Panggil fungsi ini saat submit
        >
          <Form.Item
            name="number"
            label="Nomor Akun"
            rules={[{ required: true, message: 'Mohon masukkan nomor akun!' }]}
          >
            <Input placeholder="Contoh: 1-1000" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Nama Akun"
            rules={[{ required: true, message: 'Mohon masukkan nama akun!' }]}
          >
            <Input placeholder="Contoh: Kas" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Tipe Akun"
            rules={[{ required: true, message: 'Mohon pilih tipe akun!' }]}
          >
            <Select placeholder="Pilih tipe akun">
              <Select.Option value="ASET">Aset</Select.Option>
              <Select.Option value="LIABILITAS">Liabilitas</Select.Option>
              <Select.Option value="EKUITAS">Ekuitas</Select.Option>
              <Select.Option value="PENDAPATAN">Pendapatan</Select.Option>
              <Select.Option value="BEBAN">Beban (HPP)</Select.Option>
              <Select.Option value="BEBAN_LAIN">Beban Lainnya</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="normal_balance"
            label="Saldo Normal"
            rules={[{ required: true, message: 'Mohon pilih saldo normal!' }]}
          >
            <Select placeholder="Pilih saldo normal">
              <Select.Option value="DEBIT">Debit</Select.Option>
              <Select.Option value="KREDIT">Kredit</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Simpan
            </Button>
          </Form.Item>
        </Form>
      </Modal>

    </div>
  )
}

export default ChartOfAccounts