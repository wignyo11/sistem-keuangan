// File: src/pages/ChartOfAccounts.jsx
// (VERSI FINAL: Value Benar + Support Dark Mode)

import React, { useState, useEffect } from 'react'
import {
  Table, Spin, Alert, Typography, Button, message,
  Modal, Form, Input, Select, theme // <-- Import theme
} from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import axios from '../utils/axiosInstance';

const { Title } = Typography;

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
      { text: 'Beban Operasional', value: 'BEBAN_OPERASIONAL' },
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
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [form] = Form.useForm();
  
  // Ambil token warna dari tema (Biar Dark Mode cantik)
  const { token } = theme.useToken();

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/accounts/');
      setAccounts(response.data);
      setError(null);
    } catch (err) {
      setError('Gagal mengambil data akun.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (values) => {
    try {
      await axios.post('/api/accounts/', values);
      message.success('Akun baru berhasil ditambahkan!');
      setIsModalOpen(false);
      form.resetFields();
      fetchAccounts(); 
    } catch (err) {
      if (err.response && err.response.data && err.response.data.number) {
        message.error(`Gagal: ${err.response.data.number[0]}`);
      } else {
        message.error('Gagal menambahkan akun. Cek koneksi atau data duplikat.');
      }
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  if (loading && accounts.length === 0) {
    return <div style={{ textAlign: 'center', padding: '50px' }}><Spin tip="Memuat data..." size="large" /></div>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon action={<Button size="small" onClick={fetchAccounts}>Retry</Button>} />;
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={2} style={{ margin: 0 }}>Bagan Akun (COA)</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalOpen(true)}>
          Tambah Akun
        </Button>
      </div>
      
      {/* Tabel dengan Style Dinamis (Ngikut Tema) */}
      <Table 
        style={{ 
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
        columns={columns}
        dataSource={accounts}
        rowKey="id"
        bordered
        size="middle"
        pagination={{ pageSize: 20 }}
        loading={loading}
        // Hapus background hardcode, biarkan AntD ngatur sesuai Dark/Light mode
      />

      {/* Modal Form */}
      <Modal
        title="Tambah Akun Baru"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleFormSubmit}>
          <Form.Item name="number" label="Nomor Akun" rules={[{ required: true }]}>
            <Input placeholder="Contoh: 4-2000" />
          </Form.Item>

          <Form.Item name="name" label="Nama Akun" rules={[{ required: true }]}>
            <Input placeholder="Contoh: Retur Penjualan" />
          </Form.Item>

          <Form.Item name="type" label="Tipe Akun" rules={[{ required: true }]}>
            {/* VALUE DI SINI WAJIB HURUF BESAR SEMUA */}
            <Select placeholder="Pilih Tipe">
              <Select.Option value="ASET">Aset</Select.Option>
              <Select.Option value="LIABILITAS">Liabilitas</Select.Option>
              <Select.Option value="EKUITAS">Ekuitas</Select.Option>
              <Select.Option value="PENDAPATAN">Pendapatan</Select.Option>
              <Select.Option value="BEBAN">Beban (HPP)</Select.Option>
              <Select.Option value="BEBAN_OPERASIONAL">Beban Operasional</Select.Option>
              <Select.Option value="BEBAN_LAIN">Beban Lainnya</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="normal_balance" label="Saldo Normal" rules={[{ required: true }]}>
            {/* VALUE DI SINI WAJIB HURUF BESAR SEMUA */}
            <Select placeholder="Pilih Saldo Normal">
              <Select.Option value="DEBIT">Debit</Select.Option>
              <Select.Option value="KREDIT">Kredit</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>Simpan</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ChartOfAccounts