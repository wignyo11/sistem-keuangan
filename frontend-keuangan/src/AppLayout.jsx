import React from 'react';
import { Link } from 'react-router-dom';
import { Layout, Menu, Button, theme, Switch, Space } from 'antd';
import { 
  HomeOutlined, 
  DollarCircleOutlined,
  ShoppingCartOutlined,
  SolutionOutlined, 
  BookOutlined, 
  RiseOutlined,
  PieChartOutlined,
  ReconciliationOutlined,
  AuditOutlined,
  TableOutlined,
  AreaChartOutlined,
  InboxOutlined,
  ShopOutlined,
  ContactsOutlined,
  UsergroupAddOutlined,
  TransactionOutlined,
  SendOutlined,
  CarOutlined,
  HistoryOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  RollbackOutlined,
  PrinterOutlined,
  UndoOutlined
} from '@ant-design/icons';
import { useContext } from 'react'; 
import AuthContext from './context/AuthContext';

const { Header, Content, Footer, Sider } = Layout;

const menuItems = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: <Link to="/">DASHBOARD</Link>,
  },

  // --- GRUP 1: SEMUA INPUT JADI SATU ---
  {
    key: 'transaksi', 
    label: 'TRANSAKSI',
    icon: <DollarCircleOutlined />, // Ikon "Duit"
    children: [ 
      {
        key: '/input-penjualan',
        icon: <DollarCircleOutlined />, // Pake ikon yang sama
        label: <Link to="/input-penjualan">Input Penjualan</Link>,
      },
      {
        key: '/sales/return',
        icon: <RollbackOutlined />,
        label: <Link to="/sales/return">Retur Penjualan</Link>,
      },
      {
        key: '/input-inventory',
        icon: <ShopOutlined />,
        label: <Link to="/input-inventory">Input Beli Barang (Stok)</Link>,
      },
      {
        key: '/input-beban',
        icon: <ShoppingCartOutlined />,
        label: <Link to="/input-beban">Input Beban (Non-Stok)</Link>,
      },
      {
        type: 'divider', // <-- Garis pemisah
      },
      {
        key: '/transaksi/terima-pembayaran',
        icon: <TransactionOutlined />, // Ikon "Terima Duit"
        label: <Link to="/transaksi/terima-pembayaran">Terima Pembayaran</Link>,
      },
      {
        key: '/transaksi/bayar-utang',
        icon: <SendOutlined />, // Ikon "Kirim Duit"
        label: <Link to="/transaksi/bayar-utang">Bayar Utang</Link>,
      },
      {
        type: 'divider', // <-- Garis pemisah
      },
      {
        key: '/journal',
        icon: <BookOutlined />,
        label: <Link to="/journal">Jurnal Umum (Manual)</Link>,
      },
      {
        key: '/sales/history',
        icon: <UndoOutlined />, // Import icon ini dulu
        label: <Link to="/sales/history">Riwayat Penjualan</Link>,
      },
    ],
  },
  
  // --- GRUP 2: DATA MASTER (SETUP) ---
  {
    key: 'master', 
    label: 'DATA MASTER',
    icon: <SolutionOutlined />,
    children: [
        {
          key: '/accounts',
          icon: <SolutionOutlined />,
          label: <Link to="/accounts">Bagan Akun (COA)</Link>,
        },
        {
          key: '/inventory',
          icon: <InboxOutlined />,
          label: <Link to="/inventory">Daftar Barang (Inventori)</Link>,
        },
        {
          key: '/contacts',
          icon: <ContactsOutlined />,
          label: <Link to="/contacts">Daftar Kontak (Customer/Vendor)</Link>,
        },
        {
          key: '/fixed-assets',
          icon: <CarOutlined />,
          label: <Link to="/fixed-assets">Daftar Aset Tetap</Link>,
        },
    ]
  },
  
  // --- GRUP 3: TINDAKAN AKHIR PERIODE ---
  {
    key: 'tindakan',
    label: 'TINDAKAN PERIODE',
    icon: <HistoryOutlined />,
    children: [
      {
        key: '/tindakan/run-depreciation',
        icon: <HistoryOutlined />,
        label: <Link to="/tindakan/run-depreciation">Jalankan Penyusutan</Link>, 
      },
    ]
  },
  
  // --- GRUP 4: LAPORAN (OUTPUT) ---
  {
    key: 'laporan', 
    label: 'LAPORAN',
    icon: <PieChartOutlined />,
    children: [ 
      {
        key: '/laporan/laba-rugi', 
        icon: <RiseOutlined />,
        label: <Link to="/laporan/laba-rugi">Laba Rugi</Link>,
      },
      {
        key: '/laporan/neraca',
        icon: <ReconciliationOutlined />,
        label: <Link to="/laporan/neraca">Neraca</Link>,
      },
      {
        key: '/laporan/arus-kas',
        icon: <AreaChartOutlined />,
        label: <Link to="/laporan/arus-kas">Arus Kas</Link>,
      },
      {
        type: 'divider', // <-- Garis pemisah
      },
      {
        key: '/laporan/neraca-saldo',
        icon: <TableOutlined />,
        label: <Link to="/laporan/neraca-saldo">Neraca Saldo</Link>,
      },
      {
        key: '/laporan/buku-besar',
        icon: <AuditOutlined />,
        label: <Link to="/laporan/buku-besar">Buku Besar</Link>,
      },
      {
        key: '/laporan/buku-pembantu',
        icon: <UsergroupAddOutlined />, 
        label: <Link to="/laporan/buku-pembantu">Buku Pembantu</Link>,
      },
    ],
  },
  
];


const AppLayout = ({ children, isDarkMode, toggleTheme }) => {
  const { logoutUser, user } = useContext(AuthContext); // <-- Ambil 'user' JUGA
  const {
    token: { colorBgContainer, colorBgLayout },
  } = theme.useToken();

  // --- "Sihir" Departemen (Grup) ---
  // Cek 'user' ini masuk grup apa
  const isOwner = user && user.groups.includes('Owner');
  const isAccountant = user && user.groups.includes('Akuntan');
  const isSales = user && user.groups.includes('Staf Penjualan');
  const isPurchasing = user && user.groups.includes('Staf Pembelian');
  // --- Batas Sihir ---

  // Filter menu berdasarkan "Departemen"
  const filteredMenuItems = menuItems.filter(item => {
    // Kalo lo 'Pemilik', liat semua
    if (isOwner) return true;

    // Menu 'Dashboard' (bisa diliat Akuntan & Pemilik)
    if (item.key === '/') return isAccountant;

    // Menu 'Transaksi' (Folder)
    if (item.key === 'transaksi') {
        // Cek "anak"-nya
        item.children = item.children.filter(child => {
            if (child.key === '/input-penjualan') return isSales || isAccountant;
            if (child.key === '/sales/history') return isSales || isAccountant;
            if (child.key === '/sales/return') return isSales || isAccountant;
            if (child.key === '/input-inventory') return isPurchasing || isAccountant;
            if (child.key === '/input-beban') return isPurchasing || isAccountant;
            if (child.key === '/transaksi/terima-pembayaran') return isSales || isAccountant;
            if (child.key === '/transaksi/bayar-utang') return isPurchasing || isAccountant;
            if (child.key === '/journal') return isAccountant;
            return false;
        });
        // Tampilkan folder 'Transaksi' HANYA kalo "anak"-nya ada
        return item.children.length > 0;
    }

    // Menu 'Data Master' (Bisa diliat semua, KECUALI Bagan Akun)
    if (item.key === 'master') {
         item.children = item.children.filter(child => {
            if (child.key === '/accounts') return isAccountant; // COA cuma Akuntan
            if (child.key === '/inventory') return isSales || isPurchasing || isAccountant;
            if (child.key === '/contacts') return isSales || isPurchasing || isAccountant;
            if (child.key === '/fixed-assets') return isAccountant; // Aset Tetap cuma Akuntan
            return false;
        });
        return item.children.length > 0;
    }

    // Menu 'Tindakan Periode' (Cuma Akuntan)
    if (item.key === 'tindakan') return isAccountant;

    // Menu 'Laporan' (Cuma Akuntan)
    if (item.key === 'laporan') return isAccountant;

    return false;
  });
  // --- Batas Logika "Satpam" ---

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible theme="dark">
        <div style={{
          height: '32px',
          margin: '16px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '6px',
          color: 'white',
          textAlign: 'center',
          lineHeight: '32px',
          fontWeight: 'bold'
        }}>
          EQUILIB SYSTEM
        </div>
        <Menu theme="dark" defaultSelectedKeys={['/']} mode="inline" items={filteredMenuItems} />
      </Sider>
      
      <Layout style={{ background: colorBgLayout }}>
        
        <Header style={{ 
           padding: '0 24px', // Gedein padding dikit biar lega
           background: colorBgContainer, 
           display: 'flex', 
           justifyContent: 'space-between', 
           alignItems: 'center'
        }}>
           <h1 style={{ margin: 0, 
                     fontFamily: "'Calibri', 'Roboto', sans-serif", // <--- TAMBAHIN INI BRO
                     fontWeight: 300, // (Opsional) Atur ketebalan: 300 (tipis), 400 (biasa), 500 (sedang), 700 (tebal)
                     color: isDarkMode ? '#fff' : '#000' // (Opsional) Biar warna aman di dark/light mode
           }}>Financial Statements</h1>
           
           {/* --- BAGIAN KANAN HEADER --- */}
           <Space>
             {/* 1. TOMBOL GANTI TEMA (SWITCH) */}
             <Switch
               checkedChildren={<MoonOutlined />} // Icon pas Gelap
               unCheckedChildren={<SunOutlined />} // Icon pas Terang
               checked={isDarkMode} // Status nyala/mati
               onChange={toggleTheme} // Fungsi pas diklik
             />

             {/* 2. TOMBOL LOGOUT */}
             <Button 
               type="primary" 
               danger 
               icon={<LogoutOutlined />} 
               onClick={logoutUser}
             >
              LOGOUT
             </Button>
           </Space>
           {/* --- BATAS BAGIAN KANAN --- */}
 
        </Header>
        
        <Content style={{ margin: '16px' }}>
          <div style={{ 
            padding: 24, 
            minHeight: 360, 
            background: colorBgContainer, 
            borderRadius: '8px'
          }}>
            {children}
          </div>
        </Content>
        
        <Footer style={{ textAlign: 'center', background: 'transparent' }}>
          Sistem Akuntansi ©2025 Created by Group 8
        </Footer>
      </Layout>
    </Layout>
  );
};

export default AppLayout;