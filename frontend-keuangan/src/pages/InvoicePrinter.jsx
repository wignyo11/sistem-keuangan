// File: src/pages/InvoicePrinter.jsx
import React, { useRef, useState } from 'react';
import { Button, Input, Card, message, Spin, Empty, theme } from 'antd';
import { PrinterOutlined, SearchOutlined, FileSearchOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import axios from '../utils/axiosInstance';
import { ProfessionalInvoiceTemplate } from '../components/ProfessionalInvoiceTemplate';

const InvoicePrinter = () => {
  const { token } = theme.useToken();
  const [journalId, setJournalId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Ref untuk komponen kertas
  const componentRef = useRef();

  // Hook Print
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Bukti_Transaksi_${journalId}`,
  });

  const fetchJournal = async () => {
    if (!journalId) {
        message.warning("Masukkan ID Jurnal dulu!");
        return;
    }
    setLoading(true);
    setData(null); // Reset data lama

    try {
      // Ambil data detail jurnal dari API
      const res = await axios.get(`/api/journal-entries/${journalId}/`);
      
      // Susun data untuk dikirim ke template
      setData({
        journal: res.data,
        items: res.data.items 
      });
      message.success("Data ditemukan!");
    } catch (err) {
      console.error(err);
      message.error("ID Transaksi tidak ditemukan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: '20px auto' }}>
      {/* 1. CARD PENCARIAN */}
      <Card 
        title="Cetak Faktur / Bukti Transaksi" 
        style={{ background: token.colorBgContainer, marginBottom: 20 }}
      >
        <div style={{ display: 'flex', gap: 10 }}>
            <Input 
                prefix={<FileSearchOutlined />}
                placeholder="Masukkan Nomor ID Transaksi (Contoh: 5)" 
                value={journalId} 
                onChange={e => setJournalId(e.target.value)} 
                onPressEnter={fetchJournal}
                style={{ width: 300 }}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={fetchJournal} loading={loading}>
                Cari Data
            </Button>
            
            {/* Tombol Print cuma muncul kalau data ada */}
            {data && (
                <Button 
                    type="primary" 
                    danger 
                    icon={<PrinterOutlined />} 
                    onClick={handlePrint}
                    style={{ marginLeft: 'auto' }}
                >
                    Cetak PDF / Print
                </Button>
            )}
        </div>
      </Card>

      {/* 2. AREA PREVIEW (KERTAS) */}
      <div style={{ 
          border: '1px dashed #ccc', 
          padding: 20, 
          borderRadius: 8,
          minHeight: 500,
          display: 'flex',
          justifyContent: 'center',
          overflow: 'auto'
      }}>
          {data ? (
              // Panggil Template di sini
              <div style={{ boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
                <ProfessionalInvoiceTemplate ref={componentRef} data={data} />
              </div>
          ) : (
              <div style={{ color: 'white', marginTop: 100, textAlign: 'center' }}>
                  <Empty description={<span style={{color:'white'}}>Data belum dimuat</span>} />
              </div>
          )}
      </div>
    </div>
  );
};

export default InvoicePrinter;