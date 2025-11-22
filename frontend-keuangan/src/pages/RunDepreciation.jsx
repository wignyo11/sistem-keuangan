// (Halaman untuk AJE Otomatis)
import React, { useState } from 'react';
import {
  Card,
  DatePicker,
  Button,
  Spin,
  Typography,
  message,
  Alert,
  Form,
} from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const RunDepreciation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // Untuk nampilin pesan sukses
  
  // Tanggal default: akhir bulan ini
  const [endDate, setEndDate] = useState(dayjs().endOf('month'));
  
  const navigate = useNavigate();

  // Fungsi yang dipanggil "Tombol Merah"
  const handleRunDepreciation = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Panggil API "sihir" AJE kita
      const response = await axios.post(
        '/api/actions/run-depreciation/',
        { run_up_to_date: endDate.format('YYYY-MM-DD') } // Kirim tanggal yg dipilih
      );
      
      message.success(response.data.status); // "Sukses: 1 Jurnal AJE telah dibuat"
      setResult(response.data.status); // Simpan pesan sukses
      
      // Kasih jeda 2 detik biar Pak Joko bisa baca pesan suksesnya,
      // lalu otomatis pindah ke Jurnal Umum
      setTimeout(() => {
        navigate('/journal');
      }, 2000);

    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Gagal menjalankan penyusutan.';
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title={<Title level={2}><HistoryOutlined /> Jalankan Penyusutan Otomatis</Title>}
      style={{ maxWidth: 600, margin: 'auto', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)', borderRadius: '8px' }}
    >
      <Paragraph>
        Gunakan fitur ini di **akhir setiap bulan** untuk membuat Jurnal Penyesuaian (AJE) penyusutan secara otomatis.
      </Paragraph>
      <Paragraph>
        Sistem akan mencari semua aset tetap yang belum disusutkan sampai tanggal yang Anda pilih dan membuatkan jurnalnya.
      </Paragraph>
      
      <Form layout="vertical">
        <Form.Item
          label="Jalankan Penyusutan s/d Tanggal:"
        >
          <DatePicker 
            value={endDate}
            onChange={setEndDate}
            picker="date"
            style={{ width: '100%' }}
          />
        </Form.Item>
        
        <Form.Item>
          <Button
            type="primary"
            danger // <-- Bikin tombolnya MERAH, nandain ini aksi penting
            onClick={handleRunDepreciation}
            loading={loading}
            block
            size="large"
          >
            {loading ? 'Memproses...' : 'JALANKAN PENYUSUTAN SEKARANG'}
          </Button>
        </Form.Item>
      </Form>

      {/* Nampilin pesan Error atau Sukses */}
      {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginTop: '16px' }} />}
      {result && <Alert message="Sukses" description={result} type="success" showIcon style={{ marginTop: '16px' }} />}

    </Card>
  );
};

export default RunDepreciation;