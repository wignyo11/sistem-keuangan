// (Form Jurnal Penerimaan Kas / Pelunasan Piutang)

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
import { TransactionOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;
const { Option } = Select;

const ReceivePayment = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  // State untuk dropdown
  const [customers, setCustomers] = useState([]); 
  const [cashAccounts, setCashAccounts] = useState([]); // Akun Kas/Bank
  
  const navigate = useNavigate();

  // Ambil data Customer dan Akun Kas saat halaman dibuka
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
        
        // Filter: Hanya Kontak Customer
        setCustomers(
          contactsRes.data.filter(c => c.type === 'CUSTOMER')
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
      // Panggil API 'receive-payment' yang kita buat
      await axios.post('/api/transactions/receive-payment/', postData);
      
      message.success('Pembayaran berhasil dicatat! Piutang telah berkurang.');
      form.resetFields();
      
      // Pindah ke Buku Besar Pembantu (biar bisa langsung cek)
      // (Ini opsional, bisa juga ke /journal)
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
               className="glass-card" 
              // Judul sekarang warnanya ngikut tema (token.colorText), bukan merah lagi
              title={
                <Title level={3} style={{ margin: 0, fontSize: '20px' }}>
                  <TransactionOutlined style={{ marginRight: 8 }} /> Input Penerimaan Piutang
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
      <p>Gunakan form ini saat Anda menerima pembayaran dari *customer* untuk melunasi piutang mereka.</p>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="date"
          label="Tanggal Pembayaran Diterima"
          rules={[{ required: true, message: 'Tanggal wajib diisi!' }]}
          initialValue={dayjs()}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        
        <Form.Item
          name="contact_id"
          label="Diterima Dari (Customer)"
          rules={[{ required: true, message: 'Customer wajib dipilih!' }]}
        >
          <Select showSearch placeholder="Pilih customer...">
            {customers.map(contact => (
              <Option key={contact.id} value={contact.id}>
                {contact.name}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="account_debit_id"
          label="Masuk Ke Akun (Kas/Bank)"
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
            Simpan Pembayaran
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ReceivePayment;