// (Halaman CRUD untuk Daftar Aset Tetap)
import React, { useState, useEffect } from 'react';
import {
  Table, Spin, Alert, Typography, Button, message,
  Modal, Form, Input, Select, Card, DatePicker, InputNumber, Row, Col
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';

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

// --- Kolom untuk Tabel Aset Tetap ---
const columns = [
  {
    title: 'Nama Aset',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Tgl Perolehan',
    dataIndex: 'purchase_date',
    key: 'purchase_date',
    render: (text) => dayjs(text).format('DD MMM YYYY'),
  },
  {
    title: 'Harga Perolehan',
    dataIndex: 'purchase_cost',
    key: 'purchase_cost',
    align: 'right',
    render: (text) => formatRupiah(text)
  },
  {
    title: 'Penyusutan / Bulan',
    dataIndex: 'monthly_depreciation',
    key: 'monthly_depreciation',
    align: 'right',
    render: (text) => formatRupiah(text)
  },
  {
    title: 'Akun Aset',
    dataIndex: 'asset_account_name',
    key: 'asset_account_name',
  },
  {
    title: 'Akun Akumulasi',
    dataIndex: 'accumulated_depreciation_account_name',
    key: 'accumulated_depreciation_account_name',
  },
  {
    title: 'Akun Beban',
    dataIndex: 'depreciation_expense_account_name',
    key: 'depreciation_expense_account_name',
  },
];

const FixedAssets = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  // State untuk Dropdown di Form
  const [allAccounts, setAllAccounts] = useState([]);

  // Fungsi untuk AMBIL (GET) data
  const fetchAssets = async () => {
    setLoading(true);
    try {
      const [assetsRes, accountsRes] = await Promise.all([
        axios.get('/api/fixed-assets/'),
        axios.get('/api/accounts/')
      ]);

      setAssets(assetsRes.data);
      setAllAccounts(accountsRes.data);
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
    fetchAssets();
  }, []);

  // Fungsi untuk KIRIM (POST) data
  const handleFormSubmit = async (values) => {
    try {
      await axios.post('/api/fixed-assets/', {
          ...values,
          purchase_date: dayjs(values.purchase_date).format('YYYY-MM-DD'),
      });
      message.success('Aset Tetap baru berhasil ditambahkan!');
      setIsModalOpen(false);
      form.resetFields();
      fetchAssets(); // Ambil ulang data biar tabel update
    } catch (err) {
      message.error('Gagal menambahkan aset.');
      console.error(err);
    }
  };
  
  // Filter Akun untuk Dropdown
  const assetAccs = allAccounts.filter(acc => acc.type === 'ASET' && acc.normal_balance === 'DEBIT');
  const accumAccs = allAccounts.filter(acc => acc.type === 'ASET' && acc.normal_balance === 'KREDIT');
  const expenseAccs = allAccounts.filter(acc => acc.type === 'BEBAN' || acc.type === 'BEBAN_LAIN');


  if (loading && assets.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin tip="Memuat Data Aset Tetap..." size="large" />
      </div>
    );
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon 
              action={ <Button size="small" type="primary" onClick={fetchAssets}>Coba Lagi</Button> }
           />;
  }

  // Tampilkan Halaman
  return (
    <Card style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', borderRadius: '8px' }}>
      {/* --- HEADER & TOMBOL --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={2} style={{ margin: 0 }}>Daftar Aset Tetap</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Tambah Aset Tetap
        </Button>
      </div>
      <p>Database semua aset tetap (misal: kendaraan, peralatan) yang akan disusutkan (depresiasi) secara otomatis.</p>
      
      {/* --- TABEL DATA --- */}
      <Table
        columns={columns}
        dataSource={assets}
        rowKey="id"
        bordered
        size="small"
        loading={loading}
      />

      {/* --- MODAL UNTUK FORM TAMBAH ASET --- */}
      <Modal
        title="Tambah Aset Tetap Baru"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
        >
          <Form.Item
            name="name"
            label="Nama Aset"
            rules={[{ required: true, message: 'Mohon masukkan nama aset!' }]}
          >
            <Input placeholder="Contoh: Mobil Pickup Suzuki Carry" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="purchase_date"
                label="Tanggal Perolehan (Beli)"
                rules={[{ required: true }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="purchase_cost"
                label="Harga Perolehan (Rp)"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: '100%' }} placeholder="100000000" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => value.replace(/\$\s?|(,*)/g, '')}/>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="useful_life_months"
                label="Umur Manfaat (Bulan)"
                rules={[{ required: true }]}
                initialValue={60} // 5 tahun
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="salvage_value"
            label="Nilai Sisa (Residu) di Akhir Umur (Rp)"
            initialValue={0}
          >
            <InputNumber min={0} style={{ width: '100%' }} placeholder="0" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => value.replace(/\$\s?|(,*)/g, '')}/>
          </Form.Item>
          
          <hr />
          
          <Form.Item
            name="asset_account"
            label="Akun Aset (Contoh: 1-2100 - Kendaraan)"
            rules={[{ required: true }]}
            initialValue={assetAccs.find(acc => acc.number === '1-2100')?.id}
          >
            <Select showSearch placeholder="Pilih akun aset...">
              {assetAccs.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {`${acc.number} - ${acc.name}`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="accumulated_depreciation_account"
            label="Akun Akumulasi Penyusutan (Contoh: 1-2110 - Akum. Peny. Kendaraan)"
            rules={[{ required: true }]}
            initialValue={accumAccs.find(acc => acc.number === '1-2110')?.id}
          >
            <Select showSearch placeholder="Pilih akun akumulasi (Aset-Kredit)...">
              {accumAccs.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {`${acc.number} - ${acc.name}`}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Form.Item
            name="depreciation_expense_account"
            label="Akun Beban Penyusutan (Contoh: 6-1500 - Beban Peny. Kendaraan)"
            rules={[{ required: true }]}
            initialValue={expenseAccs.find(acc => acc.number === '6-1500')?.id}
          >
            <Select showSearch placeholder="Pilih akun beban (Beban)...">
              {expenseAccs.map(acc => (
                <Option key={acc.id} value={acc.id}>
                  {`${acc.number} - ${acc.name}`}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Simpan Aset Tetap
            </Button>
          </Form.Item>
        </Form>
      </Modal>

    </Card>
  )
}

export default FixedAssets;