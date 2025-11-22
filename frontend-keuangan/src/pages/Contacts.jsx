import React, { useState, useEffect } from 'react';
import {
  Table, Spin, Alert, Typography, Button, message,
  Modal, Form, Input, Select, Card, Tag
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';

const { Title } = Typography;
const { Option } = Select;

// --- Kolom untuk Tabel Kontak ---
const columns = [
  {
    title: 'Nama Kontak',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Tipe',
    dataIndex: 'type',
    key: 'type',
    render: (type) => (
      <Tag color={type === 'CUSTOMER' ? 'blue' : 'gold'}>
        {type}
      </Tag>
    )
  },
  {
    title: 'Email',
    dataIndex: 'email',
    key: 'email',
  },
  {
    title: 'Telepon',
    dataIndex: 'phone',
    key: 'phone',
  },
];

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk Modal & Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  
  // Fungsi untuk AMBIL (GET) data
  const fetchContacts = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/contacts/');
      setContacts(response.data);
      setError(null);
    } catch (err) {
      setError('Gagal mengambil data kontak. Pastikan server backend berjalan.');
      console.error(err);
      message.error('Gagal mengambil data!');
    } finally {
      setLoading(false);
    }
  };

  // Ambil data saat halaman pertama dibuka
  useEffect(() => {
    fetchContacts();
  }, []);

  // Fungsi untuk KIRIM (POST) data
  const handleFormSubmit = async (values) => {
    try {
      await axios.post('/api/contacts/', values);
      message.success('Kontak baru berhasil ditambahkan!');
      setIsModalOpen(false);
      form.resetFields();
      fetchContacts(); // Ambil ulang data biar tabel update
    } catch (err) {
      if (err.response && err.response.data && err.response.data.name) {
         message.error(`Gagal: ${err.response.data.name[0]}`); // Error jika nama duplikat
      } else {
        message.error('Gagal menambahkan kontak.');
      }
      console.error(err);
    }
  };

  // Tampilkan 'loading spinner'
  if (loading && contacts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin tip="Memuat Data Kontak..." size="large" />
      </div>
    );
  }

  // Tampilkan 'error'
  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon 
              action={ <Button size="small" type="primary" onClick={fetchContacts}>Coba Lagi</Button> }
           />;
  }

  // Tampilkan Halaman
  return (
    <Card style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', borderRadius: '8px' }}>
      {/* --- HEADER & TOMBOL --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Title level={2} style={{ margin: 0 }}>Daftar Kontak (Customer & Vendor)</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsModalOpen(true)}
        >
          Tambah Kontak
        </Button>
      </div>
      <p>Database semua *customer* (pelanggan) dan *vendor* (supplier) Anda.</p>
      
      {/* --- TABEL DATA --- */}
      <Table
        columns={columns}
        dataSource={contacts}
        rowKey="id"
        bordered
        size="small"
        loading={loading}
      />

      {/* --- MODAL UNTUK FORM TAMBAH KONTAK --- */}
      <Modal
        title="Tambah Kontak Baru"
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
            label="Nama Kontak"
            rules={[{ required: true, message: 'Mohon masukkan nama kontak!' }]}
          >
            <Input placeholder="Contoh: Budi (Customer) atau Supplier Andy" />
          </Form.Item>

          <Form.Item
            name="type"
            label="Tipe Kontak"
            rules={[{ required: true, message: 'Mohon pilih tipe kontak!' }]}
            initialValue="CUSTOMER"
          >
            <Select placeholder="Pilih tipe...">
              <Option value="CUSTOMER">Customer (Pelanggan)</Option>
              <Option value="VENDOR">Vendor (Supplier)</Option>
              <Option value="OTHER">Lainnya</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="email"
            label="Email (Opsional)"
          >
            <Input placeholder="contoh@gmail.com" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Telepon (Opsional)"
          >
            <Input placeholder="0812..." />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              Simpan Kontak
            </Button>
          </Form.Item>
        </Form>
      </Modal>

    </Card>
  )
}

export default Contacts;