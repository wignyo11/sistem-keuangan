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
  Col,
  Space
} from 'antd';
import { MinusCircleOutlined, PlusOutlined, DollarCircleOutlined } from '@ant-design/icons';
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


const InputPenjualan = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  const [inventoryItems, setInventoryItems] = useState([]); 
  const [contacts, setContacts] = useState([]); 
  
  const navigate = useNavigate();

  // Ambil data BARANG dan KONTAK CUSTOMER sekaligus
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [itemsRes, contactsRes] = await Promise.all([
          axios.get('/api/inventory-items/'),
          axios.get('/api/contacts/')
        ]);

        setInventoryItems(itemsRes.data);
        setContacts(contactsRes.data.filter(c => c.type === 'CUSTOMER'));

      } catch (err) {
        message.error('Gagal memuat data master (barang/kontak).');
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);

    const selectedContact = contacts.find(c => c.id === values.contact_id);
    const description = `Penjualan ke: ${selectedContact ? selectedContact.name : 'Customer'}`;

    // --- LOGIKA PPN BARU ---
    const postData = {
      ...values,
      date: dayjs(values.date).format('YYYY-MM-DD'),
      description: description,
      items: values.items.map(item => ({
        ...item,
        tax_rate: item.tax_rate || 0.0 // Pastiin kirim 0 kalo PPN kosong
      }))
    };
    // --- BATAS LOGIKA ---

    try {
      // Panggil API 'sihir' STOK KELUAR kita (yg udah bisa PPN)
      await axios.post('/api/inventory/sell/', postData);
      
      message.success('Penjualan (termasuk PPN) berhasil dicatat! Jurnal Penjualan & HPP telah dibuat.');
      form.resetFields();
      navigate('/journal'); 

    } catch (err) {
      if (err.response && err.response.data) {
        // Tangani error validasi (misal: stok tidak cukup)
        const errorDetail = err.response.data.detail || err.response.data[0];
        const errorMsg = Array.isArray(errorDetail) ? errorDetail[0] : (errorDetail || 'Gagal mencatat penjualan.');
        message.error(`Gagal: ${errorMsg}`);
      } else {
        message.error('Gagal mencatat penjualan.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // --- Kalkulator Total DI-UPGRADE (termasuk PPN) ---
  const [totalInvoice, setTotalInvoice] = useState(0);
  const handleFormChange = () => {
    const items = form.getFieldValue('items') || [];
    let total = 0;
    items.forEach(item => {
      const hargaBarang = (item?.quantity || 0) * (item?.unit_price || 0);
      const ppn = hargaBarang * ((item?.tax_rate || 0) / 100);
      total += (hargaBarang + ppn); // Total = Harga + PPN
    });
    setTotalInvoice(total);
  };
  // --- BATAS UPGRADE ---

  return (
    <Card 
      // Judul sekarang warnanya ngikut tema (token.colorText), bukan merah lagi
      title={
        <Title level={3} style={{ margin: 0, fontSize: '20px' }}>
          <DollarCircleOutlined style={{ marginRight: 8 }} /> Input Penjualan
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
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleFormChange}
      >
        {/* --- BARIS 1: INFO INDUK --- */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="date"
              label="Tanggal Penjualan"
              rules={[{ required: true }]}
              initialValue={dayjs()}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="contact_id"
              label="Customer (Pelanggan)"
              rules={[{ required: true, message: 'Customer wajib dipilih!' }]}
            >
              <Select showSearch placeholder="Pilih customer...">
                {contacts.map(contact => (
                  <Option key={contact.id} value={contact.id}>
                    {contact.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="tipe_pembayaran"
              label="Tipe Pembayaran"
              rules={[{ required: true }]}
              initialValue="TUNAI"
            >
              <Select>
                <Select.Option value="TUNAI">Tunai (Masuk Kas)</Select.Option>
                <Select.Option value="KREDIT">Kredit (Masuk Piutang)</Select.Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <hr />
        <Title level={5}>Barang yang Dijual</Title>

        {/* --- BARIS 2: FORM DINAMIS (DI-UPGRADE) --- */}
        <Form.List
          name="items"
          rules={[{ validator: async (_, items) => { if (!items || items.length < 1) { return Promise.reject(new Error('Minimal harus ada 1 barang.'));}}}]}
        >
          {(fields, { add, remove }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', alignItems: 'baseline' }} align="baseline">
                  {/* Dropdown Barang */}
                  <Form.Item
                    {...restField}
                    name={[name, 'item_id']}
                    rules={[{ required: true, message: 'Pilih Barang' }]}
                    style={{ width: '300px' }}
                  >
                    <Select showSearch placeholder="Pilih barang...">
                      {inventoryItems.map(item => (
                        <Option key={item.id} value={item.id}>
                          {item.name} (Stok: {item.quantity_on_hand})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  {/* Input Qty */}
                  <Form.Item
                    {...restField}
                    name={[name, 'quantity']}
                    rules={[{ required: true, message: 'Qty' }]}
                  >
                    <InputNumber min={0.01} placeholder="Qty" />
                  </Form.Item>
                  {/* Input Harga Jual */}
                  <Form.Item
                    {...restField}
                    name={[name, 'unit_price']}
                    rules={[{ required: true, message: 'Harga Jual' }]}
                  >
                    <InputNumber min={0} placeholder="Harga Jual Satuan" style={{ width: '150px' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => value.replace(/\$\s?|(,*)/g, '')} />
                  </Form.Item>
                  
                  {/* --- FIELD PPN BARU --- */}
                  <Form.Item
                    {...restField}
                    name={[name, 'tax_rate']}
                    label="PPN (%)"
                    initialValue={0.0}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      style={{ width: '100px' }}
                      formatter={(value) => `${value}%`}
                      parser={(value) => value.replace('%', '')}
                    />
                  </Form.Item>
                  {/* --- BATAS FIELD PPN --- */}
                  
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Tambah Barang
                </Button>
              </Form.Item>
            </div>
          )}
        </Form.List>

        {/* --- BARIS 3: TOTAL & SUBMIT --- */}
        <Row justify="end" style={{ marginTop: '24px' }}>
          <Col>
            <Title level={4}>Total Tagihan (Termasuk PPN): {formatRupiah(totalInvoice)}</Title>
          </Col>
        </Row>
        
        <Row justify="end">
          <Col>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              Simpan Penjualan
            </Button>
          </Col>
        </Row>
      </Form>
    </Card>
  );
};

export default InputPenjualan;