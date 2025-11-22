// File: src/pages/JournalEntryModal.jsx
// (Komponen Modal & Form untuk Input Jurnal Baru)

import React, { useState } from 'react';
import {
  Modal, Form, Input, DatePicker, Button, Select,
  InputNumber, Space, message, Row, Col, Typography
} from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';

const { Option } = Select;
const { Text, Title } = Typography;

// Komponen ini menerima 4 props:
// - open: (boolean) status modal buka/tutup
// - onClose: (function) fungsi untuk menutup modal
// - onSubmitSuccess: (function) fungsi yg dipanggil kalo submit sukses (biar tabelnya refresh)
// - accounts: (array) daftar akun dari 'ChartOfAccounts' (biar bisa jadi dropdown)
const JournalEntryModal = ({ open, onClose, onSubmitSuccess, accounts }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [totalDebit, setTotalDebit] = useState(0);
  const [totalCredit, setTotalCredit] = useState(0);

  // Fungsi untuk menghitung ulang total debit/kredit setiap form berubah
  const calculateTotals = () => {
    const items = form.getFieldValue('items') || [];
    let debit = 0;
    let credit = 0;
    items.forEach(item => {
      debit += parseFloat(item?.debit || 0);
      credit += parseFloat(item?.credit || 0);
    });
    setTotalDebit(debit);
    setTotalCredit(credit);
  };

  // Fungsi saat form di-submit
  const handleSubmit = async (values) => {
    setLoading(true);

    // Validasi keseimbangan
    if (totalDebit === 0 && totalCredit === 0) {
      message.error('Jurnal tidak boleh nol!');
      setLoading(false);
      return;
    }
    if (totalDebit !== totalCredit) {
      message.error(`Jurnal tidak seimbang! Debit: ${totalDebit} | Kredit: ${totalCredit}`);
      setLoading(false);
      return;
    }

    // Ubah format data agar sesuai dengan API Django
    const postData = {
      ...values,
      date: dayjs(values.date).format('YYYY-MM-DD'),
      items: values.items.map(item => ({
        ...item,
        debit: item.debit || 0,
        credit: item.credit || 0,
      }))
    };

    try {
      // Kirim (POST) ke API
      await axios.post('/api/journal-entries/', postData);
      message.success('Jurnal baru berhasil disimpan!');
      
      form.resetFields(); // Kosongkan form
      setTotalDebit(0); // Reset total
      setTotalCredit(0);
      onSubmitSuccess(); // Panggil fungsi sukses (untuk refresh tabel)
      onClose(); // Tutup modal
      
    } catch (err) {
      console.error(err);
      message.error('Gagal menyimpan jurnal. Cek kembali data Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Input Jurnal Umum Baru"
      open={open}
      onCancel={onClose}
      width={1000} // Buat modal lebih lebar
      footer={[
        <Button key="cancel" onClick={onClose}>
          Batal
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={() => form.submit()}>
          Simpan Jurnal
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit} onValuesChange={calculateTotals}>
        {/* Baris 1: Tanggal & Keterangan */}
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="date"
              label="Tanggal"
              rules={[{ required: true, message: 'Tanggal wajib diisi!' }]}
              initialValue={dayjs()} // Default hari ini
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={16}>
            <Form.Item
              name="description"
              label="Keterangan"
              rules={[{ required: true, message: 'Keterangan wajib diisi!' }]}
            >
              <Input placeholder="Contoh: Pembelian bibit selada" />
            </Form.Item>
          </Col>
        </Row>

        <hr />
        <Title level={5}>Item Jurnal (Debit/Kredit)</Title>

        {/* Baris 2: Ini adalah bagian form dinamis (Form.List) */}
        <Form.List
          name="items"
          rules={[{
            validator: async (_, items) => {
              if (!items || items.length < 2) {
                return Promise.reject(new Error('Minimal harus ada 2 baris (1 debit, 1 kredit)'));
              }
            },
          }]}
        >
          {(fields, { add, remove }) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {fields.map(({ key, name, ...restField }) => (
                <Space key={key} style={{ display: 'flex', alignItems: 'baseline' }} align="baseline">
                  {/* Dropdown Akun */}
                  <Form.Item
                    {...restField}
                    name={[name, 'account']}
                    rules={[{ required: true, message: 'Pilih Akun' }]}
                    style={{ width: '350px' }}
                  >
                    <Select showSearch placeholder="Pilih Akun" filterOption={(input, option) =>
                        option.children.toLowerCase().includes(input.toLowerCase())
                      }>
                      {accounts.map(acc => (
                        <Option key={acc.id} value={acc.id}>
                          {`${acc.number} - ${acc.name}`}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  {/* Input Debit */}
                  <Form.Item
                    {...restField}
                    name={[name, 'debit']}
                  >
                    <InputNumber min={0} placeholder="Debit" style={{ width: '200px' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => value.replace(/\$\s?|(,*)/g, '')} />
                  </Form.Item>
                  {/* Input Kredit */}
                  <Form.Item
                    {...restField}
                    name={[name, 'credit']}
                  >
                    <InputNumber min={0} placeholder="Kredit" style={{ width: '200px' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => value.replace(/\$\s?|(,*)/g, '')} />
                  </Form.Item>
                  {/* Tombol Hapus Baris */}
                  <MinusCircleOutlined onClick={() => remove(name)} />
                </Space>
              ))}
              {/* Tombol Tambah Baris */}
              <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                  Tambah Baris Akun
                </Button>
              </Form.Item>
            </div>
          )}
        </Form.List>
        
        {/* Baris 3: Total & Status Keseimbangan */}
        <Row justify="end" style={{ background: '#f0f2f5', padding: '16px' }}>
          <Col span={8}>
            <Text strong>Total Debit: </Text>
            <Text>{new Intl.NumberFormat('id-ID').format(totalDebit)}</Text>
          </Col>
          <Col span={8}>
            <Text strong>Total Kredit: </Text>
            <Text>{new Intl.NumberFormat('id-ID').format(totalCredit)}</Text>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            {totalDebit === totalCredit && totalDebit > 0 ? (
              <Text strong type="success">SEIMBANG</Text>
            ) : (
              <Text strong type="danger">TIDAK SEIMBANG</Text>
            )}
          </Col>
        </Row>

      </Form>
    </Modal>
  );
};

export default JournalEntryModal;