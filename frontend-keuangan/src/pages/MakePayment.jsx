// (Form Jurnal Pengeluaran Kas / Pembayaran Utang)

import React, { useState, useEffect } from 'react';
import {
  Form,
  Button,
  DatePicker,
  InputNumber,
  Typography,
  message,
  Card,
  Select,
} from 'antd';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;
const { Option } = Select;

const MakePayment = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  // State untuk dropdown
  const [vendors, setVendors] = useState([]); // <-- Vendor
  const [cashAccounts, setCashAccounts] = useState([]); // Akun Kas/Bank
  
  const navigate = useNavigate();

  // Ambil data Vendor dan Akun Kas saat halaman dibuka
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, contactsRes] = await Promise.all([
          axios.get('/api/accounts/'),
          axios.get('/api/contacts/')
        ]);
        
        // Filter: Hanya Akun Aset (buat Kas/Bank)
        setCashAccounts(
          accountsRes.data.filter(acc => acc.type === 'ASET')
        );
        
        // Filter: Hanya Kontak VENDOR
        setVendors(
          contactsRes.data.filter(c => c.type === 'VENDOR')
        );

      } catch (err) {
        message.error('Gagal memuat data master (akun/kontak).');
        console.error(err);
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (values) => {
    setLoading(true);

    const postData = {
      ...values,
      date: dayjs(values.date).format('YYYY-MM-DD'),
    };

    try {
      // Panggil API 'make-payment' yang kita buat
      await axios.post('/api/transactions/make-payment/', postData);
      
      message.success('Pembayaran utang berhasil dicatat! Utang telah berkurang.');
      form.resetFields();
      
      // Pindah ke Buku Besar Pembantu (biar bisa langsung cek)
      navigate('/laporan/buku-pembantu'); 

    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        message.error(`Gagal: ${err.response.data.error}`);
      } else {
        message.error('Gagal mencatat pembayaran.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title={<Title level={2}>Bayar Utang (Pelunasan Utang)</Title>}
      style={{ maxWidth: 600, margin: 'auto', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', borderRadius: '8px' }}
    >
      <p>Gunakan form ini saat Anda membayar utang ke *vendor* (supplier).</p>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="date"
          label="Tanggal Pembayaran"
          rules={[{ required: true, message: 'Tanggal wajib diisi!' }]}
          initialValue={dayjs()}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item
          name="contact_id"
          label="Dibayar Ke (Vendor)"
          rules={[{ required: true, message: 'Vendor wajib dipilih!' }]}
        >
          <Select showSearch placeholder="Pilih vendor...">
            {vendors.map(contact => (
              <Option key={contact.id} value={contact.id}>
                {contact.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="account_credit_id" // <-- 'account_CREDIT_id'
          label="Keluar Dari Akun (Kas/Bank)"
          rules={[{ required: true, message: 'Akun Kas/Bank wajib dipilih!' }]}
          initialValue={cashAccounts.find(acc => acc.number === '1-1000')?.id} // Default ke '1-1000 - Kas'
        >
          <Select showSearch placeholder="Pilih akun Kas/Bank...">
            {cashAccounts.map(acc => (
              <Option key={acc.id} value={acc.id}>
                {`${acc.number} - ${acc.name}`}
              </Option>
            ))}
          </Select>
        </Form.Item>
        
        <Form.Item
          name="amount"
          label="Jumlah Pembayaran (Rp)"
          rules={[{ required: true, message: 'Jumlah wajib diisi!' }]}
        >
          <InputNumber
            min={1}
            style={{ width: '100%' }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
            placeholder="100000"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Simpan Pembayaran Utang
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default MakePayment;