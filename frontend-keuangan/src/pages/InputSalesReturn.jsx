// File: src/pages/InputSalesReturn.jsx
// (VERSI ADAPTIF TEMA: Support Dark Mode & Light Mode Otomatis)

import React, { useState, useEffect } from 'react';
import {
  Form, Button, DatePicker, InputNumber, Typography, message, Card, Select, Row, Col, Divider, theme
} from 'antd';
import { DeleteOutlined, PlusOutlined, RollbackOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

const InputSalesReturn = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [customers, setCustomers] = useState([]);
  const navigate = useNavigate();

  // --- INI KUNCINYA: Ambil Token Warna dari Tema Sistem ---
  const { token } = theme.useToken(); 

  // Ambil data Barang & Customer dari Backend
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, contactsRes] = await Promise.all([
          axios.get('/api/inventory-items/'),
          axios.get('/api/contacts/')
        ]);
        setInventoryItems(itemsRes.data);
        setCustomers(contactsRes.data.filter(c => c.type === 'CUSTOMER'));
      } catch (err) {
        message.error('Gagal memuat data master.');
      }
    };
    fetchData();
  }, []);

  const onFinish = async (values) => {
    setLoading(true);
    try {
        const formattedItems = values.items.map(item => ({
            item_id: item.item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            tax_rate: item.tax_rate || 0
        }));

        const payload = {
            date: values.date.format('YYYY-MM-DD'),
            contact_id: values.contact_id,
            tipe_pengembalian: values.tipe_pengembalian,
            description: values.description || "Retur Penjualan Barang",
            items: formattedItems
        };

        await axios.post('/api/sales/return/', payload);
        
        message.success('Retur berhasil dicatat! Stok telah dikembalikan.');
        form.resetFields();
        navigate('/inventory'); 
    } catch (error) {
        console.error(error);
        const errorMsg = error.response?.data?.error || 'Gagal mencatat retur.';
        message.error(errorMsg);
    } finally {
        setLoading(false);
    }
  };

  return (
    <Card 
      className="glass-card" 
      title={
        <Title level={3} style={{ margin: 0, fontSize: '20px' }}>
          <RollbackOutlined style={{ marginRight: 8 }} /> Input Retur Penjualan
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
      <Text type="secondary" style={{display:'block', marginBottom: 20}}>
        Gunakan form ini jika pelanggan mengembalikan barang. Stok bertambah, Piutang/Kas berkurang.
      </Text>

      <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ date: dayjs(), tipe_pengembalian: 'KREDIT', items: [{}] }}>
        
        <Row gutter={16}>
            <Col span={12}>
                <Form.Item name="date" label="Tanggal Retur" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} />
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="contact_id" label="Pelanggan (Customer)" rules={[{ required: true }]}>
                    <Select showSearch placeholder="Pilih Pelanggan" optionFilterProp="children">
                        {customers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
        </Row>

        <Form.Item name="tipe_pengembalian" label="Metode Pengembalian Dana" rules={[{ required: true }]}>
            <Select>
                <Option value="KREDIT">Potong Piutang (Pelanggan belum lunas)</Option>
                <Option value="TUNAI">Kembalikan Uang Tunai (Ambil dari Kas)</Option>
            </Select>
        </Form.Item>

        {/* Garis pemisah warna default */}
        <Divider orientation="left">Barang yang Diretur</Divider>

        <Form.List name="items">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Row 
                  key={key} 
                  gutter={8} 
                  align="middle" 
                  style={{ 
                    marginBottom: 8, 
                    // --- INI YANG BIKIN BACKGROUND NYESUAIIN TEMA ---
                    background: token.colorFillAlter, // Warna isian alternatif (abu muda / hitam pudar)
                    border: `1px solid ${token.colorBorderSecondary}`, // Border tipis sesuai tema
                    padding: 10, 
                    borderRadius: 8 
                  }}
                >
                  <Col span={8}>
                    <Form.Item {...restField} name={[name, 'item_id']} label="Nama Barang" rules={[{ required: true, message: 'Pilih barang' }]}>
                      <Select placeholder="Pilih Barang" showSearch optionFilterProp="children">
                        {inventoryItems.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                    <Form.Item {...restField} name={[name, 'quantity']} label="Qty" rules={[{ required: true }]}>
                      <InputNumber placeholder="Jml" min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={6}>
                    <Form.Item {...restField} name={[name, 'unit_price']} label="Harga Jual (Dulu)" rules={[{ required: true }]}>
                      <InputNumber 
                        placeholder="Rp" min={0} style={{ width: '100%' }} 
                        formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} 
                        parser={value => value.replace(/\$\s?|(,*)/g, '')}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={4}>
                     <Form.Item {...restField} name={[name, 'tax_rate']} label="PPN %" initialValue={0}>
                        <InputNumber placeholder="%" min={0} max={100} />
                     </Form.Item>
                  </Col>
                  <Col span={2} style={{textAlign:'center'}}>
                    <Button type="text" danger icon={<DeleteOutlined />} onClick={() => remove(name)} />
                  </Col>
                </Row>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />} style={{marginTop: 10}}>
                  Tambah Barang Lain
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        <Divider />

        <Form.Item>
            {/* Tombol pakai warna tema juga */}
            <Button type="primary" htmlType="submit" loading={loading} block size="large" icon={<RollbackOutlined />}>
                Simpan Transaksi Retur
            </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default InputSalesReturn;