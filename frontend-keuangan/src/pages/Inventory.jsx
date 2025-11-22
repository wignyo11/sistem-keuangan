import React, { useState, useEffect } from 'react';
import {
  Table, Spin, Alert, Typography, Button, message,
  Modal, Form, Input, Select, Card
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';

const { Title } = Typography;
const { Option } = Select;

// Fungsi helper untuk format Rupiah
const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

// --- Kolom untuk Tabel Inventori ---
const columns = [
  {
    title: 'Nama Barang',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'SKU (Kode)',
    dataIndex: 'sku',
    key: 'sku',
  },
  {
    title: 'Stok Saat Ini',
    dataIndex: 'quantity_on_hand',
    key: 'quantity_on_hand',
    align: 'right',
  },
  {
    title: 'Harga Rata-rata',
    dataIndex: 'average_cost',
    key: 'average_cost',
    align: 'right',
    render: (text) => formatRupiah(text)
  },
  {
    title: 'Total Nilai Persediaan',
    dataIndex: 'total_value',
    key: 'total_value',
    align: 'right',
    render: (text) => formatRupiah(text)
  },
  {
    title: 'Akun Aset',
    dataIndex: 'asset_account_name',
    key: 'asset_account_name',
  },
  {
    title: 'Akun HPP',
    dataIndex: 'hpp_account_name',
    key: 'hpp_account_name',
  },
];

const Inventory = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  // State untuk Dropdown di Form
  const [assetAccounts, setAssetAccounts] = useState([]);
  const [hppAccounts, setHppAccounts] = useState([]);

  // Fungsi untuk AMBIL (GET) data
  const fetchInventory = async () => {
    setLoading(true);
    try {
      // Kita ambil 2 data sekaligus: Daftar Barang & Daftar Akun (untuk form)
      const [itemsRes, accountsRes] = await Promise.all([
        axios.get('/api/inventory-items/'),
        axios.get('/api/accounts/')
      ]);

      setItems(itemsRes.data);
      
      // Filter akun untuk dropdown
      setAssetAccounts(accountsRes.data.filter(acc => acc.type === 'ASET'));
      setHppAccounts(accountsRes.data.filter(acc => acc.type === 'BEBAN' || acc.type === 'BEBAN_LAIN'));
      
      setError(null);
    } catch (err) {
      setError('Gagal mengambil data. Pastikan server backend berjalan.');
      console.error(err);
      message.error('Gagal mengambil data!');
    } finally {
      setLoading(false);
    }
  };

  // Ambil data saat halaman pertama dibuka
  useEffect(() => {
    fetchInventory();
  }, []);

  // Fungsi untuk KIRIM (POST) data
  const handleFormSubmit = async (values) => {
    try {
      await axios.post('/api/inventory-items/', values);
      message.success('Barang baru berhasil ditambahkan!');
      setIsModalOpen(false);
      form.resetFields();
      fetchInventory(); // Ambil ulang data biar tabel update
    } catch (err) {
      message.error('Gagal menambahkan barang. Cek kembali data Anda.');
      console.error(err);
    }
  };

  // Tampilkan 'loading spinner'
  if (loading && items.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin tip="Memuat Data Inventori..." size="large" />
      </div>
    );
  }

  // Tampilkan 'error'
  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon 
              action={ <Button size="small" type="primary" onClick={fetchInventory}>Coba Lagi</Button> }
           />;
  }

  // Tampilkan Halaman
  return (
    <Card style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', borderRadius: '8px' }}>
      {/* --- HEADER & TOMBOL --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={2} style={{ margin: 0 }}>Daftar Barang (Inventori)</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Tambah Barang
        </Button>
      </div>
      <p>Daftar semua barang yang stoknya dikelola (metode perpetual). Stok dan nilai akan di-update otomatis oleh "Input Penjualan" & "Input Beban".</p>
      
      {/* --- TABEL DATA --- */}
      <Table
        columns={columns}
        dataSource={items}
        rowKey="id"
        bordered
        size="small"
        loading={loading}
      />

      {/* --- MODAL UNTUK FORM TAMBAH BARANG --- */}
      <Modal
        title="Tambah Barang Inventori Baru"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
        >
          <Form.Item
            name="name"
            label="Nama Barang"
            rules={[{ required: true, message: 'Mohon masukkan nama barang!' }]}
          >
            <Input placeholder="Contoh: Bibit Selada Merah" />
          </Form.Item>

          <Form.Item
            name="sku"
            label="SKU (Kode Barang)"
          >
            <Input placeholder="Contoh: SLD-MRH-001" />
          </Form.Item>

          <Form.Item
            name="asset_account"
            label="Akun Aset (Persediaan)"
            rules={[{ required: true, message: 'Mohon pilih akun aset!' }]}
            // Kita set default ke '1-1200 - Persediaan Barang'
            initialValue={assetAccounts.find(acc => acc.number === '1-1200')?.id}
          >
            <Select showSearch placeholder="Pilih akun aset...">
              {assetAccounts.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {`${acc.number} - ${acc.name}`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="hpp_account"
            label="Akun Beban (HPP)"
            rules={[{ required: true, message: 'Mohon pilih akun HPP!' }]}
            // Kita set default ke '5-1000 - HPP'
            initialValue={hppAccounts.find(acc => acc.number === '5-1000')?.id}
          >
            <Select showSearch placeholder="Pilih akun beban (HPP)...">
              {hppAccounts.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {`${acc.number} - ${acc.name}`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Simpan Barang
            </Button>
          </Form.Item>
        </Form>
      </Modal>

    </Card>
  )
}

export default Inventory;