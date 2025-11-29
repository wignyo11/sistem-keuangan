// File: src/pages/InputPenjualan.jsx
// (VERSI PRO: Input Penjualan + Langsung Cetak Invoice)

import React, { useState, useEffect, useRef } from 'react';
import {
  Form,
  Button,
  DatePicker,
  InputNumber,
  Typography,
  message,
  Card,
  Select,
  Row,
  Col,
  Space,
  Divider,
  Input,
  Modal // Tambah Modal
} from 'antd';
import { 
  MinusCircleOutlined, 
  PlusOutlined, 
  SaveOutlined, 
  PrinterOutlined, 
  ReloadOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print'; // Import Print
import { ProfessionalInvoiceTemplate } from '../components/ProfessionalInvoiceTemplate'; // Import Template

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
  
  // Data Master
  const [inventoryItems, setInventoryItems] = useState([]); 
  const [contacts, setContacts] = useState([]); 
  
  // State untuk Fitur Cetak
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [lastTransactionId, setLastTransactionId] = useState(null);
  const [printData, setPrintData] = useState(null);
  const componentRef = useRef();

  // Hook Print
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Invoice-${lastTransactionId}`,
  });

  // Ambil data BARANG dan KONTAK CUSTOMER
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
      }
    };
    fetchData();
  }, []);

  // Fungsi Ambil Data Invoice buat Diprint
  const fetchInvoiceData = async (id) => {
    try {
      const res = await axios.get(`/api/journal-entries/${id}/`);
      setPrintData({
        journal: res.data,
        items: res.data.items 
      });
    } catch (error) {
      console.error("Gagal ambil data invoice:", error);
    }
  };

  const handleSubmit = async (values) => {
    setLoading(true);

    const selectedContact = contacts.find(c => c.id === values.contact_id);
    const description = values.description || `Penjualan ke: ${selectedContact ? selectedContact.name : 'Customer'}`;

    const postData = {
      ...values,
      date: dayjs(values.date).format('YYYY-MM-DD'),
      description: description,
      items: values.items.map(item => ({
        ...item,
        tax_rate: item.tax_rate || 0.0 
      }))
    };

    try {
      // 1. Simpan Transaksi
      const response = await axios.post('/api/sales/invoice/', postData);
      
      // 2. Ambil ID Transaksi Baru
      const newId = response.data.id; // Backend ngirim ID di sini
      
      if (!newId) {
          throw new Error("Backend tidak mengembalikan ID Transaksi.");
      }

      setLastTransactionId(newId);

      // 3. Siapkan Data Print
      await fetchInvoiceData(newId);

      // 4. Reset Form & Tampilkan Modal Sukses
      form.resetFields(); 
      setTotalInvoice(0);
      setSuccessModalVisible(true); 

    } catch (err) {
      if (err.response && err.response.data) {
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
  
  // Kalkulator Total
  const [totalInvoice, setTotalInvoice] = useState(0);
  const handleFormChange = () => {
    const items = form.getFieldValue('items') || [];
    let total = 0;
    items.forEach(item => {
      const hargaBarang = (item?.quantity || 0) * (item?.unit_price || 0);
      const ppn = hargaBarang * ((item?.tax_rate || 0) / 100);
      total += (hargaBarang + ppn);
    });
    setTotalInvoice(total);
  };

  return (
    <>
      <Card 
        title={<Title level={3} style={{margin:0}}>Input Penjualan (Stok Keluar)</Title>}
        style={{ maxWidth: 1000, margin: 'auto', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', borderRadius: '8px' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={handleFormChange}
          initialValues={{ date: dayjs(), tipe_pembayaran: 'TUNAI', items: [{}] }}
        >
          {/* --- BARIS 1: INFO INDUK --- */}
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="date" label="Tanggal Penjualan" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="contact_id" label="Customer (Pelanggan)" rules={[{ required: true }]}>
                <Select showSearch placeholder="Pilih customer...">
                  {contacts.map(contact => (
                    <Option key={contact.id} value={contact.id}>{contact.name}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="tipe_pembayaran" label="Tipe Pembayaran" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="TUNAI">Tunai (Masuk Kas)</Select.Option>
                  <Select.Option value="KREDIT">Kredit (Masuk Piutang)</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Catatan / Keterangan (Opsional)" name="description">
             <Input placeholder="Contoh: Pesanan untuk acara..." />
          </Form.Item>

          <Divider orientation="left">Daftar Barang</Divider>

          {/* --- BARIS 2: FORM DINAMIS --- */}
          <Form.List
            name="items"
            rules={[{ validator: async (_, items) => { if (!items || items.length < 1) { return Promise.reject(new Error('Minimal harus ada 1 barang.'));}}}]}
          >
            {(fields, { add, remove }) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', alignItems: 'baseline', flexWrap:'wrap' }} align="baseline">
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
                    
                    <Form.Item {...restField} name={[name, 'quantity']} rules={[{ required: true }]}>
                      <InputNumber min={0.01} placeholder="Qty" style={{width: '80px'}} />
                    </Form.Item>
                    
                    <Form.Item {...restField} name={[name, 'unit_price']} rules={[{ required: true }]}>
                      <InputNumber min={0} placeholder="Harga" style={{ width: '140px' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => value.replace(/\$\s?|(,*)/g, '')} />
                    </Form.Item>
                    
                    <Form.Item {...restField} name={[name, 'tax_rate']} initialValue={0.0}>
                      <InputNumber min={0} max={100} style={{ width: '70px' }} formatter={(value) => `${value}%`} parser={(value) => value.replace('%', '')} />
                    </Form.Item>
                    
                    <MinusCircleOutlined onClick={() => remove(name)} style={{color:'red'}} />
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
              <Title level={4}>Total Tagihan: {formatRupiah(totalInvoice)}</Title>
            </Col>
          </Row>
          
          <Row justify="end">
            <Col>
              <Button type="primary" htmlType="submit" loading={loading} size="large" icon={<SaveOutlined />}>
                Simpan Penjualan
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* --- MODAL SUKSES & CETAK (INI YANG BARU) --- */}
      <Modal
        open={successModalVisible}
        onCancel={() => setSuccessModalVisible(false)}
        footer={null}
        centered
        maskClosable={false}
        width={400}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircleOutlined style={{ fontSize: 60, color: '#52c41a', marginBottom: 20 }} />
            <Title level={3}>Transaksi Berhasil!</Title>
            <Text type="secondary">ID Invoice: #{lastTransactionId}</Text>
            
            <Divider />
            
            <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                    type="primary" 
                    size="large" 
                    icon={<PrinterOutlined />} 
                    block 
                    onClick={handlePrint}
                    disabled={!printData} // Tunggu data siap
                >
                    Cetak Invoice
                </Button>
                
                <Button 
                    size="large" 
                    icon={<ReloadOutlined />} 
                    block 
                    onClick={() => setSuccessModalVisible(false)}
                >
                    Input Transaksi Baru
                </Button>
            </Space>
        </div>
      </Modal>

      <div style={{ display: 'none' }}>
         {/* SOLUSI: Pasang ref di DIV pembungkus ini, bukan di komponennya */}
         <div ref={componentRef}>
            {/* Panggil template sebagai anak biasa */}
            <ProfessionalInvoiceTemplate data={printData} />
         </div>
      </div>
    </>
  );
};

export default InputPenjualan;