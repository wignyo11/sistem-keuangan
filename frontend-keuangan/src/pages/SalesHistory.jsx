// File: src/pages/SalesHistory.jsx
import React, { useState, useEffect } from 'react';
import { Table, Button, Card, Typography, message } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import { pdf } from '@react-pdf/renderer'; // Import PDF
import { InvoicePDF } from '../components/InvoicePDF'; // Import Template
import { UndoOutlined
} from '@ant-design/icons';

const { Title } = Typography;

const SalesHistory = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/journal-entries/');
      const salesEntries = res.data.filter(entry => 
         entry.items.some(item => item.account_number.startsWith('4-'))
      );
      setData(salesEntries);
    } catch (err) {
      message.error("Gagal ambil data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // --- FUNGSI CETAK BARU ---
  const onPrintClick = async (journalId) => {
    const hide = message.loading('Membuat PDF...', 0);
    try {
        // 1. Ambil detail
        const res = await axios.get(`/api/journal-entries/${journalId}/`);
        const invoiceData = { journal: res.data, items: res.data.items };

        // 2. Generate PDF
        const blob = await pdf(<InvoicePDF data={invoiceData} />).toBlob();
        
        // 3. Open
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        
        hide();
    } catch (error) {
        hide();
        console.error(error);
        message.error("Gagal membuat PDF.");
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60, render: val => <b>#{val}</b> },
    { title: 'Tanggal', dataIndex: 'date', render: val => dayjs(val).format('DD/MM/YY') },
    { title: 'Pelanggan', dataIndex: 'contact_name', render: val => val || 'Umum' },
    { title: 'Total', key: 'total', align: 'right',
        render: (_, record) => {
            const total = record.items.filter(i => i.account_number.startsWith('4-')).reduce((sum, i) => sum + Number(i.credit), 0);
            return new Intl.NumberFormat('id-ID').format(total);
        }
    },
    {
      title: 'Aksi', key: 'action', width: 100, align: 'center',
      render: (_, record) => (
        <Button type="dashed" size="small" icon={<PrinterOutlined />} onClick={() => onPrintClick(record.id)}>
            PDF
        </Button>
      ),
    },
  ];

  return (
    <Card 
                className="glass-card" 
                title={
                  <Title level={3} style={{ margin: 0, fontSize: '20px' }}>
                    <UndoOutlined style={{ marginRight: 8 }} /> Riwayat Penjualan
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
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
    </Card>
  );
};

export default SalesHistory;