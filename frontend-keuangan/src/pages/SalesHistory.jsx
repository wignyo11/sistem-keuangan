// File: src/pages/SalesHistory.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Card, Typography, Space, Tag, message } from 'antd';
import { PrinterOutlined, SearchOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import { ProfessionalInvoiceTemplate } from '../components/ProfessionalInvoiceTemplate';

const { Title } = Typography;

const SalesHistory = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State Cetak
  const [printData, setPrintData] = useState(null);
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Invoice-Reprint`,
  });

  // Fetch Data Riwayat
  const fetchHistory = async () => {
    setLoading(true);
    try {
      // Kita panggil semua jurnal
      const res = await axios.get('/api/journal-entries/');
      // Filter: Cuma yang deskripsinya mengandung "Penjualan" atau Akun Kreditnya Pendapatan
      // (Cara paling gampang filter di frontend dulu)
      const salesEntries = res.data.filter(entry => 
         // Cek apakah ada item yang akunnya tipe PENDAPATAN
         entry.items.some(item => item.account_number.startsWith('4-'))
      );
      setData(salesEntries);
    } catch (err) {
      message.error("Gagal ambil data riwayat.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  // Fungsi Siapin Data & Cetak
  const onPrintClick = async (journalId) => {
    const hide = message.loading('Menyiapkan dokumen...', 0);
    try {
        const res = await axios.get(`/api/journal-entries/${journalId}/`);
        setPrintData({
            journal: res.data,
            items: res.data.items 
        });
        // Tunggu sebentar biar state ke-update, baru print
        setTimeout(() => {
            handlePrint();
            hide();
        }, 500);
    } catch (error) {
        hide();
        message.error("Gagal memuat detail transaksi.");
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 60, render: val => <span style={{fontWeight:'bold'}}>#{val}</span> },
    { title: 'Tanggal', dataIndex: 'date', width: 120, render: val => dayjs(val).format('DD/MM/YYYY') },
    { title: 'Pelanggan', dataIndex: 'contact_name', render: val => val || 'Umum' },
    { title: 'Keterangan', dataIndex: 'description', ellipsis: true },
    { 
        title: 'Total', 
        key: 'total', 
        align: 'right',
        render: (_, record) => {
            // Hitung total dari sisi Kredit Pendapatan
            const total = record.items
                .filter(i => i.account_number.startsWith('4-'))
                .reduce((sum, i) => sum + Number(i.credit), 0);
            return new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0}).format(total);
        }
    },
    {
      title: 'Aksi',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button 
            type="dashed" 
            size="small" 
            icon={<PrinterOutlined />} 
            onClick={() => onPrintClick(record.id)}
        >
            Cetak
        </Button>
      ),
    },
  ];

  return (
    <div style={{paddingBottom: 50}}>
      <Card title={<Title level={3} style={{margin:0}}>Riwayat Penjualan</Title>}>
        <Table 
            dataSource={data} 
            columns={columns} 
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Hidden Print Component */}
      <div style={{ display: 'none' }}>
         <ProfessionalInvoiceTemplate ref={componentRef} data={printData} />
      </div>
    </div>
  );
};

export default SalesHistory;