// File: src/pages/Dashboard.jsx
// (VERSI FINAL: DARK MODE FIXED + ANTI CRASH)

import React, { useEffect, useState } from 'react';
import { 
  Card, Row, Col, Typography, Spin, Alert, 
  List, Tabs, Avatar, Tooltip as AntTooltip, Divider, Space, theme // <-- Import theme
} from 'antd';
import { 
  InfoCircleOutlined 
} from '@ant-design/icons';
import { 
  ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const COLORS = ['#5B8FF9', '#5AD8A6', '#5D7092', '#F6BD16', '#E8684A'];

const formatRupiah = (value) => 
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0);

const Dashboard = () => {
  // --- AMBIL TOKEN TEMA ---
  const { token } = theme.useToken();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartTab, setChartTab] = useState('omzet');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/api/reports/dashboard-summary/');
        setData(res.data);
      } catch (error) {
        console.error("Dashboard Error:", error);
        setError("Gagal mengambil data terbaru.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={{height:'80vh', display:'flex', justifyContent:'center', alignItems:'center'}}><Spin size="large" tip="Memuat Dashboard..." /></div>;
  if (error && !data) return <Alert message="Error" description="Gagal terhubung ke server." type="error" showIcon style={{margin: 20}} />;

  const safeData = data || {}; 
  const kpi = safeData.kpi || {}; 
  const trend_chart = safeData.trend_chart || [];
  const ranking = safeData.ranking || [];
  const pie_chart = safeData.pie_chart || [];
  const recent_activity = safeData.recent_activity || [];

  // --- KOMPONEN KARTU DENGAN WARNA TEMA ---
  const ProCard = ({ title, value, footerTitle, footerValue, colorIndex }) => (
    <Card 
        bordered={false} 
        bodyStyle={{ padding: '20px 24px 8px' }} 
        style={{ 
            height: '100%', 
            borderRadius: 8, 
            boxShadow: '0 1px 2px -2px rgba(0,0,0,0.16), 0 3px 6px 0 rgba(0,0,0,0.12)',
            background: token.colorBgContainer // <-- Pake warna background tema
        }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', color: token.colorTextSecondary }}>
        <span>{title}</span>
        <AntTooltip title="Info Detail">
            <InfoCircleOutlined />
        </AntTooltip>
      </div>
      <div style={{ 
          fontSize: '26px', 
          fontWeight: 'bold', 
          color: token.colorText, // <-- Warna Teks Utama
          marginTop: 4, 
          marginBottom: 8 
      }}>
        {value}
      </div>
      
      <div style={{ height: 10, background: token.colorFillSecondary, borderRadius: 5, overflow: 'hidden', marginBottom: 15 }}>
         <div style={{ width: '70%', height: '100%', background: COLORS[colorIndex] || COLORS[0] }}></div>
      </div>

      <Divider style={{ margin: '10px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', color: token.colorTextSecondary, fontSize: 12 }}>
        <span>{footerTitle}</span>
        <span style={{ fontWeight: 'bold', color: token.colorText }}>{footerValue}</span>
      </div>
    </Card>
  );

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 24 }}>
         <Title level={3} style={{ marginBottom: 0 }}>Executive Dashboard</Title>
         <Text type="secondary">Analisis performa bisnis real-time</Text>
      </div>
      
      {error && <Alert message={error} type="warning" showIcon closable style={{marginBottom: 20}} />}

      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}><ProCard title="Total Kas & Bank" value={formatRupiah(kpi.kas || 0)} footerTitle="Likuiditas saat ini" footerValue="Aman" colorIndex={0} /></Col>
        <Col xs={24} sm={12} lg={6}><ProCard title="Omzet Bulan Ini" value={formatRupiah(kpi.pendapatan || 0)} footerTitle="Total Pendapatan" footerValue="Operasional" colorIndex={1} /></Col>
        <Col xs={24} sm={12} lg={6}><ProCard title="Laba Bersih" value={formatRupiah(kpi.laba_bersih || 0)} footerTitle="Profitabilitas" footerValue="Bulan Ini" colorIndex={4} /></Col>
        <Col xs={24} sm={12} lg={6}><ProCard title="Piutang Pelanggan" value={formatRupiah(kpi.piutang || 0)} footerTitle="Tagihan Belum Lunas" footerValue="Segera Tagih" colorIndex={3} /></Col>
      </Row>

      {/* GRAFIK UTAMA */}
      <Card 
        bordered={false} 
        style={{ 
            marginTop: 24, 
            borderRadius: 8, 
            boxShadow: '0 1px 2px -2px rgba(0,0,0,0.16), 0 3px 6px 0 rgba(0,0,0,0.12)',
            background: token.colorBgContainer
        }} 
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ padding: '0 24px' }}>
            <Tabs defaultActiveKey="omzet" size="large" tabBarStyle={{ marginBottom: 24 }} onChange={setChartTab} items={[{ label: 'Tren Profitabilitas (6 Bulan)', key: 'omzet' }]} />
        </div>
        
        <Row>
            <Col xs={24} xl={16} style={{ padding: '0 24px 24px' }}>
                <div style={{ height: 350, width: '100%' }}>
                  <ResponsiveContainer>
                    <ComposedChart data={trend_chart} margin={{ top: 20, right: 0, bottom: 0, left: 0 }}>
                      <CartesianGrid stroke={token.colorBorderSecondary} vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: token.colorTextSecondary}} />
                      <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} tick={{fill: token.colorTextSecondary}} />
                      <Tooltip 
                        formatter={(val) => formatRupiah(val)} 
                        contentStyle={{borderRadius: 8, border:'none', boxShadow:'0 2px 8px rgba(0,0,0,0.15)', background: token.colorBgElevated, color: token.colorText}} 
                        itemStyle={{color: token.colorText}}
                        labelStyle={{color: token.colorText}}
                      />
                      <Legend verticalAlign="top" height={36} wrapperStyle={{ color: token.colorText }} />
                      <Area type="monotone" dataKey="beban" name="Beban" stroke="#E8684A" fill="#E8684A" fillOpacity={0.1} />
                      <Line type="monotone" dataKey="laba" name="Laba Bersih" stroke="#C0392B" strokeWidth={3} dot={{r:4}} />
                      <Bar dataKey="pendapatan" name="Omzet" barSize={30} fill="#2c5c75" radius={[4, 4, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
            </Col>
            <Col xs={24} xl={8} style={{ padding: '0 24px 24px' }}>
                <Title level={5} style={{marginBottom: 20}}>Komposisi Beban (Top 5)</Title>
                <div style={{ height: 200, marginBottom: 20 }}>
                    {pie_chart.length > 0 ? (
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={pie_chart} innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value">
                                    {pie_chart.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke={token.colorBgContainer} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val) => formatRupiah(val)} contentStyle={{background: token.colorBgElevated, borderRadius:8, border:'none', color: token.colorText}} itemStyle={{color: token.colorText}} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : <div style={{textAlign:'center', marginTop:80, color: token.colorTextSecondary}}>Belum ada data beban</div>}
                </div>
                <List size="small" dataSource={pie_chart} renderItem={(item, index) => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                        <span style={{color: token.colorText}}>
                            <span style={{display:'inline-block', width:8, height:8, borderRadius:'50%', background: COLORS[index % COLORS.length], marginRight: 8}}></span>{item.name}
                        </span>
                        <span style={{fontWeight:'bold', color: token.colorText}}>{formatRupiah(item.value)}</span>
                    </div>
                )} />
            </Col>
        </Row>
      </Card>

      {/* 3. ROW BAWAH */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
            <Card title="Produk Terlaris" bordered={false} style={{ borderRadius: 8, height: '100%', boxShadow: '0 1px 2px -2px rgba(0,0,0,0.16)', background: token.colorBgContainer }}>
                <List itemLayout="horizontal" dataSource={ranking} renderItem={(item, index) => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={<div style={{width: 24, height: 24, borderRadius: '50%', backgroundColor: index < 3 ? '#314659' : token.colorFillSecondary, color: index < 3 ? '#fff' : token.colorText, display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 600, fontSize: 12}}>{index + 1}</div>}
                            title={<Text style={{ fontSize: 14 }}>{item.name}</Text>}
                            description={
                                <Space split={<Divider type="vertical" />}>
                                    <Text type="secondary">Terjual: {item.quantity_sold}</Text>
                                    <Text type="success">HPP: {formatRupiah(item.estimasi_nilai)}</Text>
                                </Space>
                            }
                        />
                    </List.Item>
                )} />
                {ranking.length === 0 && <div style={{textAlign:'center', padding:20, color: token.colorTextSecondary}}>Belum ada data penjualan</div>}
            </Card>
        </Col>
        <Col xs={24} lg={12}>
            <Card title="Aktivitas Terakhir" bordered={false} style={{ borderRadius: 8, height: '100%', boxShadow: '0 1px 2px -2px rgba(0,0,0,0.16)', background: token.colorBgContainer }}>
                <List itemLayout="horizontal" dataSource={recent_activity} renderItem={(item) => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={<Avatar style={{ backgroundColor: '#E6F7FF', color: '#1890FF' }}>{item.description ? item.description[0].toUpperCase() : '?'}</Avatar>}
                            title={<span style={{fontWeight: 500, color: token.colorText}}>{item.description}</span>}
                            description={<span style={{color: token.colorTextSecondary}}>{`${dayjs(item.date).format('DD MMM YYYY')} - ${item.contact}`}</span>}
                        />
                        <div style={{textAlign: 'right'}}>
                            <div style={{ fontWeight: 'bold', color: '#1890FF' }}>{formatRupiah(item.total)}</div>
                        </div>
                    </List.Item>
                )} />
                {recent_activity.length === 0 && <div style={{textAlign:'center', padding:20, color: token.colorTextSecondary}}>Belum ada transaksi</div>}
            </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;