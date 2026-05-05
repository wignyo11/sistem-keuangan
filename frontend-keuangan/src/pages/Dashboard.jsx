// File: src/pages/Dashboard.jsx
// (VERSI FIX: LAZY RENDER TECHNIQUE + GLASSMORPHISM)

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Row, Col, Card, Typography, Spin, Alert, Button, Progress, List, Tag, theme
} from 'antd';
import { 
  ReloadOutlined, RightOutlined, WalletOutlined
} from '@ant-design/icons';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from 'recharts';
import axios from '../utils/axiosInstance';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { useToken } = theme;

// --- STATIC COLORS ---
const CHART_COLORS = {
  greenBar: '#82C91E',
  redBar: '#FF7F50',
  blueLine: '#00B5E2',
  overdue: '#E53935',
  awaiting: '#FFB300',
  paid: '#43A047',
  pie: ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8884d8']
};

const formatRupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value || 0);

// --- WIDGET CARD ---
const JurnalWidget = ({ title, action, children, style, bodyPadding= 24 }) => {
  const { token } = useToken();

  return (
    <Card 
        className="glass-card" 
        variant="borderless"
        title={<span style={{color: token.colorTextHeading, fontSize: 15, fontWeight: 600}}>{title}</span>}
        extra={action}
        style={{ 
            borderRadius: token.borderRadiusLG, 
            boxShadow: token.boxShadowTertiary,
            border: `1px solid ${token.colorBorderSecondary}`,
            marginBottom: 24, 
            ...style
        }}
        styles={{
            header: { borderBottom: `1px solid ${token.colorSplit}`, minHeight: 48, padding: '0 20px'  },
            body: { padding: bodyPadding }
        }}
    >
        {children}
    </Card>
  );
};

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  // SOLUSI UTAMA: State ini menunda render chart
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  
  const { token } = useToken();

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/reports/dashboard-summary/');
      setData(res.data);
      setError(null);
    } catch (err) {
      setError('Gagal memuat data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
    
    // DELAY RENDER CHART: 500ms agar Ant Design selesai atur layout dulu
    const timer = setTimeout(() => {
        setIsLayoutReady(true);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (loading) return (
    <div style={{ height: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
        <Spin size="large" />
        <div style={{ marginTop: 10, color: '#999' }}>Memuat Data...</div>
    </div>
  );
  if (error) return <Alert message="Error" description={error} type="error" showIcon style={{ margin: 24 }} />;

  const safeData = data || {};
  const kpi = safeData.kpi || {};
  const trend_chart = safeData.trend_chart || [];
  const pie_chart = safeData.pie_chart || [];
  const recent_activity = safeData.recent_activity || [];

  // 1. DATA UNTUK GRAFIK LABA RUGI (OMZET vs BEBAN)
  // Backend ngirim key: 'pendapatan', 'beban', 'laba'
  const profitData = trend_chart.map(item => ({
    name: item.name,
    Masuk: item.pendapatan || 0,  // Gunakan 'pendapatan' (Sales), bukan 'cash_in'
    Keluar: item.beban || 0,      // Gunakan 'beban' (Expense)
    Saldo: item.laba || 0
  }));

  // 2. DATA UNTUK GRAFIK ARUS KAS (DUIT REAL)
  // Backend ngirim key: 'cash_in', 'cash_out', 'cash_net'
  const realCashFlowData = trend_chart.map(item => ({
    name: item.name,
    Masuk: parseFloat(item.cash_in) || 0,
    Keluar: parseFloat(item.cash_out) || 0,
    Saldo: parseFloat(item.cash_net) || 0
  }));

  return (
    // DIUBAH: background token.colorBgLayout diganti jadi 'transparent'
    <div style={{ paddingBottom: 40, background: 'transparent', minHeight: '100vh', width: '100%' }}>
      
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
         <div>
            <Title level={3} style={{ margin: 0, color: token.colorText, fontWeight: 500 }}>Business Overview</Title>
            <Text style={{ color: token.colorTextSecondary }}>Ringkasan kinerja bisnis Anda periode ini</Text>
         </div>
         <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh Data</Button>
      </div>

      <Row gutter={24}>
        
        {/* --- KOLOM KIRI --- */}
        <Col xs={24} lg={16}>
            
            {/* 1. CHART LABA RUGI */}
            <JurnalWidget 
                title="Chart Laba Rugi" 
                action={<Tag color="blue">6 Bulan Terakhir</Tag>}
            >
                <div style={{ height: 320, width: '100%' }}>
                    {/* HANYA RENDER JIKA LAYOUT READY */}
                    {isLayoutReady && (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={profitData} margin={{top:20, right:0, bottom:0, left:0}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={token.colorSplit} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} style={{fontSize:12, fill: token.colorTextSecondary}} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} style={{fontSize:12, fill: token.colorTextSecondary}} />
                                <Tooltip 
                                    formatter={(val) => formatRupiah(val)} 
                                    contentStyle={{
                                        borderRadius:4, 
                                        border: `1px solid ${token.colorBorderSecondary}`, 
                                        boxShadow: token.boxShadowSecondary,
                                        background: token.colorBgElevated,
                                        color: token.colorText
                                    }}
                                    itemStyle={{color: token.colorText}}
                                    labelStyle={{color: token.colorTextSecondary}}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{fontSize: 12, color: token.colorTextSecondary}}/>
                                <Bar dataKey="Masuk" stackId="a" barSize={32} fill={CHART_COLORS.greenBar} radius={[0,0,0,0]} />
                                <Bar dataKey="Keluar" stackId="a" barSize={32} fill={CHART_COLORS.redBar} radius={[4,4,0,0]} />
                                <Line type="monotone" dataKey="Saldo" stroke={CHART_COLORS.blueLine} strokeWidth={3} dot={{r:4, fill: token.colorBgContainer, strokeWidth:2}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </JurnalWidget>
            
            {/* 2. CHART ARUS KAS */}
            <JurnalWidget 
                title="Arus Kas Masuk vs Keluar (Real Cash Flow)" 
                action={<Tag color="green">Cash Basis</Tag>}
            >
                <div style={{ height: 280, width: '100%' }}>
                    {/* HANYA RENDER JIKA LAYOUT READY */}
                    {isLayoutReady && (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={realCashFlowData} margin={{ top: 10, right: 0, bottom: 0, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} style={{ fontSize: 11, fill: '#888' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `${val/1000}k`} style={{ fontSize: 11, fill: '#888' }} />
                                <Tooltip formatter={(val) => formatRupiah(val)} contentStyle={{ borderRadius: 4, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} />
                                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12, color: '#666' }}/>
                                <Area type="monotone" dataKey="Masuk" name="Uang Masuk" stackId="1" stroke={CHART_COLORS.greenBar} fill={CHART_COLORS.greenBar} fillOpacity={0.6} />
                                <Area type="monotone" dataKey="Keluar" name="Uang Keluar" stackId="2" stroke={CHART_COLORS.redBar} fill={CHART_COLORS.redBar} fillOpacity={0.6} />
                                <Line type="monotone" dataKey="Saldo" name="Net Cash" stroke={CHART_COLORS.blueLine} strokeWidth={2} dot={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </JurnalWidget>

            {/* 3. PIUTANG & UTANG */}
            <Row gutter={24}>
                <Col xs={24} md={12}>
                    <JurnalWidget title="Penjualan Belum Dibayar" action={<Link to="/transaksi/terima-pembayaran"><RightOutlined /></Link>}>
                         <div style={{marginBottom: 20}}>
                             <Text style={{fontSize:12, color: token.colorTextSecondary, display:'block'}}>Total Piutang</Text>
                             <div style={{fontSize: 28, fontWeight: '700', color: token.colorText}}>
                                 {formatRupiah(kpi.piutang)}
                             </div>
                         </div>
                         <div style={{marginBottom: 15}}>
                             <div style={{display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4, color: token.colorTextDescription}}>
                                 <span>Belum Jatuh Tempo</span>
                                 <span style={{color: CHART_COLORS.awaiting, fontWeight:600}}>{formatRupiah(kpi.piutang)}</span>
                             </div>
                             <Progress percent={100} showInfo={false} strokeColor={CHART_COLORS.awaiting} size="small" trailColor={token.colorFillSecondary} />
                         </div>
                         <div style={{marginBottom: 5}}>
                             <div style={{display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4, color: token.colorTextDescription}}>
                                 <span>Jatuh Tempo (Overdue)</span>
                                 <span style={{color: CHART_COLORS.overdue, fontWeight:600}}>Rp 0</span>
                             </div>
                             <Progress percent={0} showInfo={false} strokeColor={CHART_COLORS.overdue} size="small" trailColor={token.colorFillSecondary} />
                         </div>
                    </JurnalWidget>
                </Col>

                <Col xs={24} md={12}>
                    <JurnalWidget title="Pembelian Belum Dibayar" action={<Link to="/transaksi/bayar-utang"><RightOutlined /></Link>}>
                         <div style={{marginBottom: 20}}>
                             <Text style={{fontSize:12, color: token.colorTextSecondary, display:'block'}}>Total Utang</Text>
                             <div style={{fontSize: 28, fontWeight: '700', color: token.colorText}}>
                                 {formatRupiah(kpi.utang)}
                             </div>
                         </div>
                         <div style={{marginBottom: 15}}>
                             <div style={{display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4, color: token.colorTextDescription}}>
                                 <span>Belum Jatuh Tempo</span>
                                 <span style={{color: '#1890FF', fontWeight:600}}>{formatRupiah(kpi.utang)}</span>
                             </div>
                             <Progress percent={100} showInfo={false} strokeColor="#1890FF" size="small" trailColor={token.colorFillSecondary} />
                         </div>
                    </JurnalWidget>
                </Col>
            </Row>
        </Col>

        {/* --- KOLOM KANAN --- */}
        <Col xs={24} lg={8}>
            
            {/* 1. BIAYA OPERASIONAL (PIE CHART) */}
            <JurnalWidget title="Biaya Operasional">
                <Row align="middle" gutter={16}>
                    <Col span={10}>
                        <div style={{ height: 120, width: '100%', position: 'relative' }}>
                            {/* HANYA RENDER JIKA LAYOUT READY */}
                            {isLayoutReady && pie_chart.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie 
                                            data={pie_chart} 
                                            innerRadius={35} 
                                            outerRadius={50} 
                                            paddingAngle={2} 
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {pie_chart.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS.pie[index % CHART_COLORS.pie.length]} />)}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(val) => formatRupiah(val)}
                                            contentStyle={{
                                                background: token.colorBgElevated, 
                                                color: token.colorText, 
                                                border: `1px solid ${token.colorBorderSecondary}`,
                                                borderRadius: 4
                                            }} 
                                            itemStyle={{color: token.colorText}}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div style={{textAlign:'center', paddingTop:50, fontSize:10, color: token.colorTextDisabled}}>
                                    {!isLayoutReady ? 'Loading Chart...' : 'No Data'}
                                </div>
                            )}
                             <div style={{position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', fontSize:10, color: token.colorTextSecondary, textAlign:'center', lineHeight:1}}>
                                Total
                             </div>
                        </div>
                    </Col>
                    
                    <Col span={14}>
                        <List
                            size="small"
                            split={false}
                            dataSource={pie_chart.slice(0, 4)}
                            renderItem={(item, index) => (
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 8, fontSize: 11}}>
                                    <div style={{display:'flex', alignItems:'center', overflow:'hidden'}}>
                                        <div style={{minWidth:8, height:8, borderRadius:'50%', backgroundColor: CHART_COLORS.pie[index % CHART_COLORS.pie.length], marginRight:6}}></div>
                                        <span style={{color: token.colorTextSecondary, whiteSpace:'nowrap', textOverflow:'ellipsis', overflow:'hidden', maxWidth: 80}} title={item.name}>
                                            {item.name}
                                        </span>
                                    </div>
                                    <span style={{fontWeight:'600', color: token.colorText}}>{formatRupiah(item.value)}</span>
                                </div>
                            )}
                        />
                    </Col>
                </Row>
            </JurnalWidget>

            {/* 2. KAS & BANK */}
            <JurnalWidget title="Kas & Bank" action={<Link to="/laporan/neraca"><RightOutlined /></Link>} noPadding>
                <List
                    dataSource={[{ name: 'Kas Besar', val: kpi.kas }, { name: 'Bank BCA', val: 0 }]}
                    renderItem={(item) => (
                        <List.Item style={{padding: '12px 20px', borderBottom: `1px solid ${token.colorSplit}`}}>
                            <List.Item.Meta
                                avatar={<WalletOutlined style={{fontSize:18, color: CHART_COLORS.blueLine}} />}
                                title={<span style={{fontSize:13, color: token.colorText}}>{item.name}</span>}
                            />
                            <div style={{fontWeight:'600', color: token.colorText}}>{formatRupiah(item.val)}</div>
                        </List.Item>
                    )}
                />
            </JurnalWidget>

             {/* 3. AKTIVITAS TERAKHIR */}
             <JurnalWidget title="Aktivitas Terakhir" noPadding>
                <List
                    dataSource={recent_activity.slice(0, 4)}
                    renderItem={(item) => (
                        <List.Item style={{padding: '12px 20px', borderBottom: `1px solid ${token.colorSplit}`}}>
                           <div style={{width:'100%'}}>
                                <div style={{display:'flex', justifyContent:'space-between', marginBottom: 2}}>
                                    <span style={{fontWeight:500, color: token.colorText, fontSize:12}}>{item.description}</span>
                                    <span style={{color: item.total>0 ? CHART_COLORS.paid : CHART_COLORS.overdue, fontSize:12, fontWeight:600}}>
                                        {formatRupiah(item.total)}
                                    </span>
                                </div>
                                <div style={{color: token.colorTextDescription, fontSize: 11}}>
                                    {dayjs(item.date).format('DD MMM')} • {item.contact}
                                </div>
                           </div>
                        </List.Item>
                    )}
                />
             </JurnalWidget>
        </Col>

      </Row>
    </div>
  );
};

export default Dashboard;