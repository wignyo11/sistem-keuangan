// File: src/pages/InputInventory.jsx
// (VERSI UPGRADE - Sudah mendukung PPN Masukan)

import React, { useState, useEffect } from 'react';
import {
  Form,
  Button,
  Input,
  DatePicker,
  InputNumber,
  Typography,
  message,
  Card,
  Select,
  Row,
  Col
} from 'antd';
import { ShopOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

// Fungsi helper format Rupiah
const formatRupiah = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const InputInventory = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  const [inventoryItems, setInventoryItems] = useState([]); 
  const [contacts, setContacts] = useState([]); 
  
  const navigate = useNavigate();

  // Ambil data BARANG dan KONTAK VENDOR sekaligus
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, contactsRes] = await Promise.all([
          axios.get('/api/inventory-items/'),
          axios.get('/api/contacts/')
        ]);
        
        setInventoryItems(itemsRes.data);
        setContacts(contactsRes.data.filter(c => c.type === 'VENDOR'));

      } catch (err) {
        message.error('Gagal memuat data master (barang/kontak).');
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);

    // Dapatkan nama vendor & barang untuk 'description'
    const selectedContact = contacts.find(c => c.id === values.contact_id);
    const selectedItem = inventoryItems.find(i => i.id === values.item_id);
    const description = `Pembelian ${selectedItem ? selectedItem.name : 'Barang'} dari: ${selectedContact ? selectedContact.name : 'Vendor'}`;

    const postData = {
      ...values,
      date: dayjs(values.date).format('YYYY-MM-DD'),
      description: description,
      tax_rate: values.tax_rate || 0.0 // <-- Pastiin kita kirim 0 kalo kosong
    };

    try {
      // Panggil API 'sihir' STOK MASUK kita (yg udah bisa PPN)
      await axios.post('/api/inventory/purchase/', postData);
      
      message.success('Pembelian barang (termasuk PPN) berhasil dicatat!');
      form.resetFields();
      navigate('/inventory'); 

    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        message.error(`Gagal: ${err.response.data.error}`);
      } else {
        message.error('Gagal mencatat pembelian.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
          className="glass-card" 
          title={
            <Title level={3} style={{ margin: 0, fontSize: '20px' }}>
              <ShopOutlined style={{ marginRight: 8 }} /> Input Pembelian Barang (Stok Masuk)
            </Title>
          } 
          style={{ 
            maxWidth: 900, 
            margin: '20px auto', 
            borderRadius: 12, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            // Background card otomatis ngikut tema (Putih/Gelap)
          }}
    >
      <p>Gunakan form ini untuk membeli barang yang stoknya dihitung. Sistem akan otomatis menambah stok dan menjurnal PPN Masukan (jika ada).</p>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="date"
          label="Tanggal Pembelian"
          rules={[{ required: true }]}
          initialValue={dayjs()}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item
          name="contact_id"
          label="Vendor (Supplier)"
          rules={[{ required: true, message: 'Vendor wajib dipilih!' }]}
        >
          <Select showSearch placeholder="Pilih vendor...">
            {contacts.map(contact => (
              <Option key={contact.id} value={contact.id}>
                {contact.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          name="item_id"
          label="Nama Barang"
          rules={[{ required: true, message: 'Barang wajib dipilih!' }]}
        >
          <Select showSearch placeholder="Pilih barang yang dibeli...">
            {inventoryItems.map(item => (
              <Option key={item.id} value={item.id}>
                {item.name} (Stok: {item.quantity_on_hand})
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="quantity"
              label="Kuantitas (Qty)"
              rules={[{ required: true }]}
            >
              <InputNumber min={0.01} style={{ width: '100%' }} placeholder="100" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="unit_cost"
              label="Harga Beli Satuan (Rp)"
              rules={[{ required: true }]}
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                placeholder="2000"
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="tipe_pembayaran"
              label="Tipe Pembayaran"
              rules={[{ required: true }]}
              initialValue="TUNAI"
            >
              <Select>
                <Select.Option value="TUNAI">Tunai (Bayar dari Kas)</Select.Option>
                <Select.Option value="KREDIT">Kredit (Masuk Utang Usaha)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          {/* --- FIELD PPN BARU --- */}
          <Col span={12}>
            <Form.Item
              name="tax_rate"
              label="PPN Masukan (%)"
              initialValue={0.0} // Default 0%
            >
              <InputNumber
                min={0}
                max={100}
                style={{ width: '100%' }}
                formatter={(value) => `${value}%`}
                parser={(value) => value.replace('%', '')}
              />
            </Form.Item>
          </Col>
          {/* --- BATAS FIELD PPN --- */}
        </Row>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Simpan Pembelian
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default InputInventory;