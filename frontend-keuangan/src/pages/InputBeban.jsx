// File: src/pages/InputBeban.jsx
// (VERSI UPGRADE - Vendor Opsional, Keterangan Wajib + Efek Glassmorphism)

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
import { ShoppingCartOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;
const { Option } = Select;

const InputBeban = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  
  const [bebanAccounts, setBebanAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  
  // --- STATE BARU ---
  // State untuk tau apakah dropdown Vendor lagi diisi
  const [isVendorSelected, setIsVendorSelected] = useState(false);
  // --- BATAS STATE ---

  const navigate = useNavigate();

  // Ambil data Akun Beban dan Kontak Vendor sekaligus
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [accountsRes, contactsRes] = await Promise.all([
          axios.get('/api/accounts/'),
          axios.get('/api/contacts/')
        ]);

        setBebanAccounts(
          accountsRes.data.filter(acc => acc.type === 'BEBAN' || acc.type === 'BEBAN_OPERASIONAL' || acc.type === 'BEBAN_LAIN')
        );
        setContacts(
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
    
    // --- LOGIKA BARU UNTUK 'description' ---
    let postData;
    if (values.contact_id) {
      // Jika Vendor DIPILIH, 'description' kita bikin otomatis
      const selectedContact = contacts.find(c => c.id === values.contact_id);
      const selectedAccount = bebanAccounts.find(a => a.id === values.account_debit_id);
      const description = `Beban ${selectedAccount ? selectedAccount.name : ''} dari: ${selectedContact ? selectedContact.name : 'Vendor'}`;
      
      postData = { ...values, date: dayjs(values.date).format('YYYY-MM-DD'), description: description };
    } else {
      // Jika Vendor KOSONG, 'description' kita ambil dari input manual
      postData = { ...values, date: dayjs(values.date).format('YYYY-MM-DD') };
    }
    // --- BATAS LOGIKA ---

    try {
      await axios.post('/api/purchases/', postData);
      
      message.success('Beban berhasil dicatat! Jurnal Umum telah dibuat.');
      form.resetFields();
      setIsVendorSelected(false); // Balikin state
      navigate('/journal');

    } catch (err) {
      if (err.response && err.response.data) {
        // Tampilkan error validasi dari backend (Misal: "Harap isi 'Keterangan'...")
        const errorMsg = err.response.data.detail || err.response.data.error || err.response.data[0] || 'Gagal mencatat beban.';
        message.error(`Gagal: ${errorMsg}`);
      } else {
        message.error('Gagal mencatat beban.');
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
        <ShoppingCartOutlined style={{ marginRight: 8 }} />Input Beban (Pintasan)
        </Title>
      } 
      style={{ 
        maxWidth: 900, 
        margin: '20px auto',
        // borderRadius dan boxShadow bawaan dihapus karena udah diurus sama .glass-card
      }}
    >

      <p>Gunakan form ini untuk mencatat beban non-stok (misal: Listrik, Air, Gaji). Pilih 'Vendor' ATAU isi 'Keterangan' manual.</p>
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="date"
          label="Tanggal Pembelian"
          rules={[{ required: true, message: 'Tanggal wajib diisi!' }]}
          initialValue={dayjs()}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        {/* --- DROPDOWN VENDOR (SEKARANG OPSIONAL) --- */}
        <Form.Item
          name="contact_id"
          label="Vendor (Supplier) - Opsional"
        >
          <Select 
            showSearch 
            placeholder="Pilih vendor (jika ada)"
            allowClear // <-- Bikin dia bisa dikosongin (X)
            onChange={(value) => setIsVendorSelected(!!value)} // <-- Update state
          >
            {contacts.map(contact => (
              <Option key={contact.id} value={contact.id}>
                {contact.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        {/* --- BATAS DROPDOWN --- */}

        {/* --- KETERANGAN MANUAL (LOGIKA BARU) --- */}
        <Form.Item
          name="description"
          label="Keterangan (Wajib diisi jika Vendor kosong)"
          // Bikin 'required' jadi dinamis
          rules={[{ required: !isVendorSelected, message: 'Keterangan wajib diisi!' }]}
        >
          <Input 
            placeholder="Contoh: Bayar parkir bulanan"
            disabled={isVendorSelected} // <-- Kunci field ini kalo Vendor dipilih
          />
        </Form.Item>
        {/* --- BATAS KETERANGAN --- */}

        <Form.Item
          name="account_debit_id"
          label="Kategori Beban (Akun Debit)"
          rules={[{ required: true, message: 'Kategori beban wajib diisi!' }]}
        >
          <Select showSearch placeholder="Pilih akun beban...">
            {bebanAccounts.map(acc => (
              <Option key={acc.id} value={acc.id}>
                {`${acc.number} - ${acc.name}`}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="tipe_pembayaran"
          label="Tipe Pembayaran (Akun Kredit)"
          rules={[{ required: true, message: 'Tipe pembayaran wajib diisi!' }]}
          initialValue="TUNAI"
        >
          <Select>
            <Select.Option value="TUNAI">Tunai (Bayar dari Kas)</Select.Option>
            <Select.Option value="KREDIT">Kredit (Masuk Utang Usaha)</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="total"
          label="Total Pembelian (Rp)"
          rules={[{ required: true, message: 'Total wajib diisi!' }]}
        >
          <InputNumber
            min={1}
            style={{ width: '100%' }}
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
            placeholder="150000"
          />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Simpan Beban
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default InputBeban;
