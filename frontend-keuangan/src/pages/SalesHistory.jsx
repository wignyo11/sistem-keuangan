// File: src/pages/SalesHistory.jsx
// (VERSI FIX: AUTO-PRINT SAAT DATA SIAP)

import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Card, Typography, message } from 'antd';
import { PrinterOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import { ProfessionalInvoiceTemplate } from '../components/ProfessionalInvoiceTemplate';

const { Title } = Typography;

const SalesHistory = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State khusus buat print
  const [printData, setPrintData] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false); // Flag penanda
  
  const componentRef = useRef();

  // Hook Print
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Invoice-Reprint`,
    onAfterPrint: () => {
        setIsPrinting(false); // Reset flag setelah print
        setPrintData(null);   // Bersihin data
    }
  });

  // --- MAGIC EFFECT: Pantau Data, Kalau Siap Langsung Print ---
  useEffect(() => {
    if (isPrinting && printData && printData.journal) {
        // Kasih jeda dikit biar React sempet nge-render kertasnya
        setTimeout(() => {
            handlePrint();
        }, 500); // Tunggu 0.5 detik
    }
  }, [printData, isPrinting, handlePrint]);
  // ------------------------------------------------------------

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

  const onPrintClick = async (journalId) => {
    const hide = message.loading('Menyiapkan dokumen...', 0);
    try {
        const res = await axios.get(`/api/journal-entries/${journalId}/`);
        
        // 1. Set Data
        setPrintData({
            journal: res.data,
            items: res.data.items 
        });
        // 2. Angkat Bendera "Siap Print"
        setIsPrinting(true); 
        
        hide();
    } catch (error) {
        hide();
        console.error(error);
        message.error("Gagal memuat detail.");
        setIsPrinting(false);
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
            Cetak
        </Button>
      ),
    },
  ];

  return (
    <div style={{paddingBottom: 50}}>
      <Card title={<Title level={3} style={{margin:0}}>Riwayat Penjualan</Title>}>
        <Table dataSource={data} columns={columns} rowKey="id" loading={loading} />
      </Card>

      {/* Hidden Print Area */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
         <div ref={componentRef}>
            <ProfessionalInvoiceTemplate data={printData} />
         </div>
      </div>
    </div>
  );
};

export default SalesHistory;