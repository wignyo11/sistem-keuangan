// File: src/AppLayout.jsx
// (VERSI: TAMPILAN JURNAL.ID - OTORISASI 100% AMAN)

import React, { useContext, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Space, Typography, theme, Tooltip, Switch } from 'antd';
import { 
  HomeOutlined, DollarCircleOutlined, ShoppingCartOutlined, SolutionOutlined, 
  BookOutlined, RiseOutlined, PieChartOutlined, ReconciliationOutlined, 
  AuditOutlined, TableOutlined, AreaChartOutlined, InboxOutlined, 
  ShopOutlined, ContactsOutlined, UsergroupAddOutlined, TransactionOutlined, 
  SendOutlined, CarOutlined, HistoryOutlined, LogoutOutlined, UserOutlined,
  MenuUnfoldOutlined, MenuFoldOutlined, SunOutlined, MoonOutlined, FileTextOutlined
} from '@ant-design/icons';
import AuthContext from './context/AuthContext';
import logoImage from 'C:/Users/lenovo/.ssh/GITHUB/keuangan_akuntansi/frontend-keuangan/src/assets/logo.png';

const { Header, Content, Footer, Sider } = Layout;

// --- WARNA STYLE JURNAL.ID ---
const STYLES = {
  sidebarBg: '#1B2531', // Hitam Kebiruan
  headerBg: '#00B5E2',  // Biru Khas Jurnal
  menuText: '#A3AAB3',
  contentBg: '#F4F6F8', // Abu-abu muda untuk background konten
};

// --- MENU ITEMS (SAMA PERSIS SEPERTI SEBELUMNYA) ---
const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: <Link to="/">Dashboard</Link> },
  {
    key: 'transaksi', label: 'Transaksi', icon: <DollarCircleOutlined />,
    children: [ 
      { key: '/input-penjualan', label: <Link to="/input-penjualan">Input Penjualan</Link> },
      { key: '/input-inventory', label: <Link to="/input-inventory">Input Beli Barang</Link> },
      { key: '/input-beban', label: <Link to="/input-beban">Input Beban</Link> },
      { type: 'divider' },
      { key: '/transaksi/terima-pembayaran', label: <Link to="/transaksi/terima-pembayaran">Terima Pembayaran</Link> },
      { key: '/transaksi/bayar-utang', label: <Link to="/transaksi/bayar-utang">Bayar Utang</Link> },
      { type: 'divider' },
      { key: '/journal', label: <Link to="/journal">Jurnal Umum</Link> },
    ],
  },
  {
    key: 'master', label: 'Data Master', icon: <SolutionOutlined />,
    children: [
        { key: '/accounts', label: <Link to="/accounts">Bagan Akun</Link> },
        { key: '/inventory', label: <Link to="/inventory">Daftar Barang</Link> },
        { key: '/contacts', label: <Link to="/contacts">Daftar Kontak</Link> },
        { key: '/fixed-assets', label: <Link to="/fixed-assets">Daftar Aset Tetap</Link> },
    ]
  },
  {
    key: 'tindakan', label: 'Tindakan Periode', icon: <HistoryOutlined />,
    children: [{ key: '/tindakan/run-depreciation', label: <Link to="/tindakan/run-depreciation">Jalankan Penyusutan</Link> }]
  },
  {
    key: 'laporan', label: 'Laporan', icon: <PieChartOutlined />,
    children: [ 
      { key: '/laporan/laba-rugi', label: <Link to="/laporan/laba-rugi">Laba Rugi</Link> },
      { key: '/laporan/neraca', label: <Link to="/laporan/neraca">Neraca</Link> },
      { key: '/laporan/arus-kas', label: <Link to="/laporan/arus-kas">Arus Kas</Link> },
      { type: 'divider' },
      { key: '/laporan/neraca-saldo', label: <Link to="/laporan/neraca-saldo">Neraca Saldo</Link> },
      { key: '/laporan/buku-besar', label: <Link to="/laporan/buku-besar">Buku Besar</Link> },
      { key: '/laporan/buku-pembantu', label: <Link to="/laporan/buku-pembantu">Buku Pembantu</Link> },
      { key: '/sales/history', label: <Link to="/sales/history">Riwayat Penjualan</Link> },
    ],
  },
];

const AppLayout = ({ children, isDarkMode, toggleTheme }) => {
  const { logoutUser, user } = useContext(AuthContext);
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();

  // ============================================================
  // 🔒 LOGIKA OTORISASI (INI TIDAK SAYA UBAH SAMA SEKALI) 🔒
  // ============================================================
  const isOwner = user && user.groups.includes('Owner');
  const isAccountant = user && user.groups.includes('Akuntan');
  const isSales = user && user.groups.includes('Staf Penjualan');
  const isPurchasing = user && user.groups.includes('Staf Pembelian');

  const filteredMenuItems = menuItems.filter(item => {
    if (isOwner) return true;
    if (item.key === '/') return isAccountant;
    
    if (item.key === 'transaksi') {
        item.children = item.children.filter(child => {
            if (child.key === '/input-penjualan') return isSales || isAccountant;
            if (child.key === '/input-inventory') return isPurchasing || isAccountant;
            if (child.key === '/input-beban') return isPurchasing || isAccountant;
            if (child.key === '/transaksi/terima-pembayaran') return isSales || isAccountant;
            if (child.key === '/transaksi/bayar-utang') return isPurchasing || isAccountant;
            if (child.key === '/journal') return isAccountant;
            return false;
        });
        return item.children.length > 0;
    }

    if (item.key === 'master') {
         item.children = item.children.filter(child => {
            if (child.key === '/accounts') return isAccountant;
            if (child.key === '/inventory') return isSales || isPurchasing || isAccountant;
            if (child.key === '/contacts') return isSales || isPurchasing || isAccountant;
            if (child.key === '/fixed-assets') return isAccountant;
            return false;
        });
        return item.children.length > 0;
    }

    if (item.key === 'tindakan') return isAccountant;
    if (item.key === 'laporan') return isAccountant;

    return false;
  });
  // ============================================================
  
  const sidebarBg = isDarkMode ? '#001529' : '#1B2531';
  const headerBg = isDarkMode ? '#141414' : '#00B5E2';
  const contentBg = isDarkMode ? '#000000' : '#F4F6F8';
  const textColor = isDarkMode ? '#ffffff' : '#ffffff';
   
  const QuickButton = ({ icon, label, link }) => (
      <Link to={link}>
          <Button 
            type="primary" 
            icon={icon} 
            style={{ 
                background: 'rgba(255,255,255,0.2)', 
                border: 'none', 
                color: textColor, 
                fontWeight: 500,
                fontSize: 13
            }}
          >
            {label}
          </Button>
      </Link>
  );

   return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        width={240}
        style={{ background: sidebarBg, zIndex: 10 }}
      >
        <div style={{
            height: '74px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: (collapsed ? 'center' : 'flex-start'), // Kalau ditutup rata tengah, kalau dibuka rata kiri dikit
            background: isDarkMode ? 'rgba(255,255,255,0.1)' : '#151C26',
            padding: (collapsed ? '0' : '0 20px'), // Kasih padding kalau sidebar terbuka biar gak mepet kiri
            overflow: 'hidden', // Biar gambar gak bleber pas sidebar nutup cepet
            transition: 'all 0.2s'
        }}>
        <img 
            src={logoImage} 
            alt="Logo Equilib" 
            style={{
            maxHeight: '62px', // Batasi tinggi maksimal agar muat di header 64px
            maxWidth: '100%',  // Lebar menyesuaikan
            objectFit: 'contain', // Pastikan gambar gak gepeng
      // Kalau collapsed, mungkin lo mau ngecilin logonya atau diatur via CSS lain. 
      // Tapi dengan objectFit contain dan container overflow hidden, biasanya aman.
         }}
         />
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={[location.pathname]}
          items={filteredMenuItems}
          style={{ background: sidebarBg }}
        />
      </Sider>
      
      <Layout style={{ background: contentBg }}> 
        
        <Header style={{ 
           padding: '0 24px', 
           background: headerBg, 
           display: 'flex', justifyContent: 'space-between', alignItems: 'center',
           height: 64, boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          
          {/* KIRI: Toggle & Title */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
              className: 'trigger',
              onClick: () => setCollapsed(!collapsed),
              style: { fontSize: '18px', cursor: 'pointer', marginRight: 24, color: textColor }
            })}
            <Typography.Text strong style={{ fontSize: 18, color: textColor }}>PERUSAHAAN SELADA JOKO</Typography.Text>
          </div>

          
  
          {/* KANAN: User Profile & Theme Switch */}
          <Space size="middle">
             
             {/* SWITCH TEMA */}
             <Switch 
                checkedChildren={<MoonOutlined />} 
                unCheckedChildren={<SunOutlined />} 
                checked={isDarkMode}
                onChange={toggleTheme}
             />

             <div style={{ textAlign: 'right', lineHeight: '1.2', color: textColor }}>
                 <div style={{ fontWeight: 'bold', fontSize: 13 }}>{user?.username || 'User'}</div>
                 <div style={{ fontSize: 11, opacity: 0.9 }}>{isOwner ? 'Owner' : 'Staff'}</div>
             </div>
             <Avatar style={{ backgroundColor: 'white', color: headerBg }} icon={<UserOutlined />} />
             <Tooltip title="Keluar">
                 <Button type="text" icon={<LogoutOutlined style={{color: textColor}} />} onClick={logoutUser} />
             </Tooltip>
          </Space>
        </Header>
        
        <Content style={{ margin: '24px' }}>
          <div style={{ minHeight: 360 }}>{children}</div>
        </Content>
        
        <Footer style={{ textAlign: 'center', color: '#999', background: 'transparent' }}>Equilib System By Group 9 ©2025</Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
