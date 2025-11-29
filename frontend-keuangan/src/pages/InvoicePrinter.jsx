// File: src/pages/InvoicePrinter.jsx
import React, { useRef, useState, useEffect } from 'react';
import { Button, Input, Card, message, Spin } from 'antd';
import { PrinterOutlined, SearchOutlined } from '@ant-design/icons';
import { useReactToPrint } from 'react-to-print';
import axios from '../utils/axiosInstance';
import { InvoiceTemplate } from '../components/InvoiceTemplate';

const InvoicePrinter = () => {
  const [journalId, setJournalId] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const componentRef = useRef();

  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
    documentTitle: `Invoice-${journalId}`,
  });

  const fetchJournal = async () => {
    if (!journalId) return;
    setLoading(true);
    try {
      // Kita panggil detail jurnal
      const res = await axios.get(`/api/journal-entries/${journalId}/`);
      
      // Kita butuh nama akun di items, backend defaultnya cuma ngasih ID akun.
      // Untuk simplifikasi, kita anggap backend udah ngasih atau kita map manual nanti.
      // Disini kita pass data mentah dulu.
      
      // PERLU PENYESUAIAN BACKEND DIKIT BIAR NAMA AKUN MUNCUL DI ITEM
      // Tapi sementara kita pakai data yang ada.
      setData({
        journal: {
            id: res.data.id,
            date: res.data.date,
            contact_name: res.data.contact ? res.data.contact_name : '-' // Perlu serializer update dikit
        },
        items: res.data.items // Perlu serializer update biar ada 'account_name'
      });
    } catch (err) {
      message.error("ID Jurnal tidak ditemukan!");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '20px auto' }}>
      <Card title="Cetak Bukti Transaksi">
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <Input 
                placeholder="Masukkan ID Jurnal / Transaksi" 
                value={journalId} 
                onChange={e => setJournalId(e.target.value)} 
                style={{ width: 200 }}
            />
            <Button type="primary" icon={<SearchOutlined />} onClick={fetchJournal} loading={loading}>
                Cari Data
            </Button>
            {data && (
                <Button type="primary" danger icon={<PrinterOutlined />} onClick={handlePrint}>
                    Cetak PDF / Print
                </Button>
            )}
        </div>

        {/* Area Preview (Disembunyikan di layar, muncul pas print) */}
        <div style={{ border: '1px dashed #ccc', padding: 10, background: '#f0f0f0', overflow: 'auto' }}>
            {data ? (
                <InvoiceTemplate ref={componentRef} data={data} />
            ) : <div style={{textAlign: 'center', padding: 20}}>Silakan cari ID transaksi dulu</div>}
        </div>
      </Card>
    </div>
  );
};

export default InvoicePrinter;