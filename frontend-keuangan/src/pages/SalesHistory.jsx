// File: src/pages/SalesHistory.jsx
// (VERSI FIX: Cetak Ulang Invoice dengan Tampilan Profesional)

import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Card, Typography, message, Tag, Space } from 'antd';
import { PrinterOutlined, HistoryOutlined } from '@ant-design/icons';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import { ProfessionalInvoiceTemplate } from '../components/ProfessionalInvoiceTemplate'; // Pake template ganteng

const { Title, Text } = Typography;

const SalesHistory = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // --- STATE KHUSUS PRINT ---
  const [printData, setPrintData] = useState(null); // Data invoice yg mau dicetak
  const [isReadyToPrint, setIsReadyToPrint] = useState(false); // Penanda kapan boleh print
  
  const componentRef = useRef(null);

  // Hook Print
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Reprint-Invoice`,
    onAfterPrint: () => {
        setIsReadyToPrint(false); // Reset setelah selesai
        setPrintData(null); 
    },
    removeAfterPrint: true
  });

  // --- EFEK OTOMATIS: Nunggu data masuk ke kertas, baru print ---
  useEffect(() => {
    if (isReadyToPrint && printData) {
        // Kasih jeda dikit biar React sempet nge-render tulisan di kertasnya
        setTimeout(() => {
            handlePrint();
        }, 500); 
    }
  }, [isReadyToPrint, printData, handlePrint]);

  // --- AMBIL DATA RIWAYAT ---
  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/journal-entries/');
      // Filter cuma Jurnal Penjualan (yg ada akun Pendapatan/4-xxxx di kredit)
      // Atau bisa cek deskripsi mengandung "Penjualan"
      const salesEntries = res.data.filter(entry => 
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

  // --- FUNGSI KLIK CETAK ---
  const onPrintClick = async (journalId) => {
    const hideLoading = message.loading('Menyiapkan dokumen...', 0);
    try {
        // 1. Ambil detail data dari server
        const res = await axios.get(`/api/journal-entries/${journalId}/`);
        
        // 2. Masukin ke state kertas
        setPrintData({
            journal: res.data,
            items: res.data.items 
        });

        // 3. Bilang ke useEffect: "Woi, data udah siap nih, print dong!"
        setIsReadyToPrint(true);
        
        hideLoading();
    } catch (error) {
        hideLoading();
        console.error(error);
        message.error("Gagal memuat detail transaksi.");
    }
  };

  // Kolom Tabel
  const columns = [
    { 
        title: 'ID Invoice', 
        dataIndex: 'id', 
        width: 100, 
        render: val => <Tag color="blue">#{val}</Tag> 
    },
    { 
        title: 'Tanggal', 
        dataIndex: 'date', 
        width: 120, 
        render: val => dayjs(val).format('DD/MM/YYYY') 
    },
    { 
        title: 'Pelanggan', 
        dataIndex: 'contact_name', 
        render: val => <Text strong>{val || 'Pelanggan Umum'}</Text> 
    },
    { 
        title: 'Total Penjualan', 
        key: 'total', 
        align: 'right',
        render: (_, record) => {
            // Hitung total dari sisi Kredit akun Pendapatan (4-xxxx)
            // Ini biar akurat ngambil nominal omzetnya
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
      align: 'center',
      render: (_, record) => (
        <Button 
            type="primary" 
            ghost
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
      <Card 
        title={<Space><HistoryOutlined /> <Title level={4} style={{margin:0}}>Riwayat Penjualan</Title></Space>}
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
      >
        <Table 
            dataSource={data} 
            columns={columns} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 10 }} 
            bordered
            size="middle"
        />
      </Card>

      {/* --- DIV PENGUMPET (TEMPAT NGE-RENDER KERTAS) --- */}
      {/* Pake teknik overflow hidden biar gak keliatan user tapi kebaca printer */}
      <div style={{ overflow: 'hidden', height: 0, width: 0 }}>
         <div ref={componentRef}>
            <ProfessionalInvoiceTemplate data={printData} />
         </div>
      </div>
    </div>
  );
};

export default SalesHistory;