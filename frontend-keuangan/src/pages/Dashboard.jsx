// File: src/pages/Dashboard.jsx
// (VERSI FINAL - Executive Dashboard dengan Data Real-Time & Grafik Analitis)

import React, { useEffect, useState } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Typography, Spin, Alert, 
  List, Tag, Space, Divider 
} from 'antd';
import { 
  WalletOutlined, BankOutlined, RiseOutlined, FallOutlined, 
  ShoppingOutlined, HistoryOutlined 
} from '@ant-design/icons';
import { 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';
import axios from '../utils/axiosInstance';

const { Title, Text } = Typography;

// Warna Chart untuk Pie Chart
const COLORS = ['#417690', '#E67E22', '#2ECC71', '#E74C3C', '#9B59B6'];

// Helper format Rupiah
const formatCurrency = (value) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // URL ini sudah disesuaikan dengan perbaikan di urls.py tadi
        const res = await axios.get('/api/reports/dashboard-summary/'); 
        setData(res.data);
      } catch (error) {
        console.error("Dashboard Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!data) return <Alert message="Gagal memuat data dashboard." type="error" showIcon />;

  // Ambil data dari backend
  const { kpi, trend_chart, ranking, pie_chart, recent_activity } = data;

  // Komponen Kartu KPI (Versi Bersih & Jujur)
  const StatCard = ({ title, value, prefix, color, secondary }) => (
    <Card bordered={false} style={{ borderRadius: 12, height: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
      <Statistic 
        title={<Text type="secondary">{title}</Text>}
        value={value}
        prefix={prefix}
        valueStyle={{ color: color, fontWeight: 700, fontSize: '24px' }}
        formatter={(val) => formatCurrency(val)}
      />
      {/* Footer kartu hanya muncul jika ada text secondary */}
      {secondary && <div style={{ marginTop: 8, fontSize: 12, color: '#8c8c8c' }}>{secondary}</div>}
    </Card>
  );

  // Kolom untuk Tabel Transaksi Terakhir
  const columns = [
    { title: 'Tanggal', dataIndex: 'date', key: 'date', width: 100 },
    { title: 'Keterangan', dataIndex: 'description', key: 'desc', ellipsis: true },
    { title: 'Kontak', dataIndex: 'contact', key: 'contact', responsive: ['md'] },
    { 
      title: 'Nilai', dataIndex: 'total', key: 'total', align: 'right',
      render: (val) => <Text strong>{formatCurrency(val)}</Text>
    },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 0 }}>Executive Dashboard</Title>
        <Text type="secondary">Analisis performa keuangan & operasional real-time.</Text>
      </div>

      {/* --- 1. KPI CARDS (Posisi Keuangan & Laba) --- */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            title="Total Kas & Bank" value={kpi.kas} 
            prefix={<WalletOutlined />} color="#417690"
            secondary="Likuiditas saat ini"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            title="Omzet Bulan Ini" value={kpi.pendapatan} 
            prefix={<ShoppingOutlined />} color="#2ECC71"
            secondary="Total Pendapatan Operasional"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            title="Laba Bersih" value={kpi.laba_bersih} 
            prefix={kpi.laba_bersih >= 0 ? <RiseOutlined /> : <FallOutlined />} 
            color={kpi.laba_bersih >= 0 ? "#27AE60" : "#C0392B"}
            secondary="Profitabilitas Bulan Ini"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard 
            title="Piutang Pelanggan" value={kpi.piutang} 
            prefix={<BankOutlined />} color="#E67E22"
            secondary="Tagihan Belum Lunas"
          />
        </Col>
      </Row>

      {/* --- 2. ANALYTICS SECTION (Grafik & Ranking) --- */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        
        {/* KIRI: GRAFIK GABUNGAN (Omzet vs Laba) */}
        <Col xs={24} lg={16}>
          <Card title="Tren Profitabilitas (6 Bulan)" bordered={false} style={{ borderRadius: 12 }}>
            <div style={{ height: 350, width: '100%' }}>
              <ResponsiveContainer>
                <ComposedChart data={trend_chart} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                  <CartesianGrid stroke="#f5f5f5" vertical={false} />
                  <XAxis dataKey="name" scale="point" padding={{ left: 30, right: 30 }} />
                  <YAxis tickFormatter={(val) => `${val/1000}k`} />
                  <Tooltip formatter={(val) => formatCurrency(val)} labelStyle={{ color: '#000' }} />
                  <Legend verticalAlign="top" height={36}/>
                  
                  {/* Bar: Omzet */}
                  <Bar dataKey="pendapatan" name="Omzet" barSize={30} fill="#417690" radius={[4, 4, 0, 0]} />
                  
                  {/* Area: Beban */}
                  <Area type="monotone" dataKey="beban" name="Beban" fill="#ffccc7" stroke="none" fillOpacity={0.4} />

                  {/* Garis: Laba Bersih */}
                  <Line type="monotone" dataKey="laba" name="Laba Bersih" stroke="#E74C3C" strokeWidth={3} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>

        {/* KANAN: PIE CHART & RANKING */}
        <Col xs={24} lg={8}>
          <Row gutter={[0, 16]}>
            {/* Pie Chart Beban */}
            <Col span={24}>
               <Card title="Komposisi Beban (Top 5)" bordered={false} style={{ borderRadius: 12 }}>
                  <div style={{ height: 200, width: '100%' }}>
                    {pie_chart && pie_chart.length > 0 ? (
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={pie_chart} innerRadius={50} outerRadius={70}
                                    paddingAngle={2} dataKey="value"
                                >
                                    {pie_chart.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => formatCurrency(val)} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{textAlign:'center', padding: 50, color:'#ccc'}}>Belum ada data beban</div>
                    )}
                  </div>
                  {/* Legend Manual */}
                  <div style={{ marginTop: 10, maxHeight: 100, overflowY: 'auto' }}>
                      {pie_chart && pie_chart.map((item, index) => (
                          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                              <span><span style={{ color: COLORS[index % COLORS.length] }}>●</span> {item.name}</span>
                              <span>{formatCurrency(item.value)}</span>
                          </div>
                      ))}
                  </div>
               </Card>
            </Col>

            {/* Ranking Produk (Data Jujur: Qty & HPP) */}
            <Col span={24}>
                <Card title="Produk Terlaris" bordered={false} style={{ borderRadius: 12 }}>
                    <List
                        itemLayout="horizontal"
                        dataSource={ranking || []}
                        renderItem={(item, index) => (
                            <List.Item style={{ padding: '8px 0' }}>
                                <List.Item.Meta
                                    avatar={<Tag color="#417690">#{index+1}</Tag>}
                                    title={<Text style={{ fontSize: 14 }}>{item.name}</Text>}
                                    description={
                                        <Space split={<Divider type="vertical" />}>
                                            <Text type="secondary" style={{ fontSize: 12 }}>Qty: {item.quantity_sold}</Text>
                                            <Text type="success" style={{ fontSize: 12 }}>HPP: {formatCurrency(item.estimasi_nilai)}</Text>
                                        </Space>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                    {(!ranking || ranking.length === 0) && (
                        <div style={{textAlign:'center', color:'#ccc', padding: '20px'}}>Belum ada penjualan</div>
                    )}
                </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* --- 3. RECENT TRANSACTIONS (TABEL) --- */}
      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
            <Card 
                title={<Space><HistoryOutlined /> Aktivitas Terakhir</Space>} 
                bordered={false} 
                style={{ borderRadius: 12 }}
            >
                <Table 
                    dataSource={recent_activity || []} 
                    columns={columns} 
                    rowKey="id" 
                    pagination={false} 
                    size="small" 
                />
            </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;