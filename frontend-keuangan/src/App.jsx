// File: src/App.jsx
import React, { useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, theme } from 'antd'
import AuthContext from './context/AuthContext'
import PublicRoute from './utils/PublicRoute'

import AppLayout from './AppLayout' 
import Login from './pages/Login'

// ... (Import halaman-halaman lain tetep sama, gak usah diubah)
import Dashboard from './pages/Dashboard'
import ChartOfAccounts from './pages/ChartOfAccounts'
import JournalEntries from './pages/JournalEntries'
import InputPenjualan from './pages/InputPenjualan'
import InputBeban from './pages/InputBeban'
import IncomeStatement from './pages/IncomeStatement'
import BalanceSheet from './pages/BalanceSheet'
import GeneralLedger from './pages/GeneralLedger'
import TrialBalance from './pages/TrialBalance'
import CashFlowStatement from './pages/CashFlowStatement'
import Inventory from './pages/Inventory'
import InputInventory from './pages/InputInventory'
import Contacts from './pages/Contacts'
import FixedAssets from './pages/FixedAssets'
import RunDepreciation from './pages/RunDepreciation'
import SubsidiaryLedger from './pages/SubsidiaryLedger'
import ReceivePayment from './pages/ReceivePayment'
import MakePayment from './pages/MakePayment'
import './App.css' 

function App() {
  let { user } = useContext(AuthContext);

  // --- 1. LOGIKA TEMA BARU (Bisa Manual + Simpan di Browser) ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Cek dulu: User pernah simpan settingan gak?
    const savedTheme = localStorage.getItem('appTheme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    // Kalau gak ada simpanan, baru cek settingan Laptop/OS
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      // Cuma update kalo user belum pernah set manual
      if (!localStorage.getItem('appTheme')) {
         setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Fungsi buat ganti tema saat tombol diklik
  const toggleTheme = (checked) => {
    setIsDarkMode(checked);
    // Simpan pilihan user ke memori browser
    localStorage.setItem('appTheme', checked ? 'dark' : 'light');
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#417690', 
          borderRadius: 6,
        fontFamily: `'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`,
        },
      }}
    >
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
        </Route>

        <Route 
          path="/*" 
          element={
            user ? (
              // --- 2. KIRIM "REMOT" TEMA KE APPLAYOUT ---
              // Kita kirim status 'isDarkMode' dan fungsi 'toggleTheme' ke layout
              <AppLayout isDarkMode={isDarkMode} toggleTheme={toggleTheme}>
                <Routes>
                  {/* ... Semua Route Internal Lo (SAMA AJA, GAK BERUBAH) ... */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/input-penjualan" element={<InputPenjualan />} />
                  <Route path="/input-beban" element={<InputBeban />} />
                  <Route path="/input-inventory" element={<InputInventory />} />
                  <Route path="/accounts" element={<ChartOfAccounts />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/contacts" element={<Contacts />} />
                  <Route path="/fixed-assets" element={<FixedAssets />} />
                  <Route path="/tindakan/run-depreciation" element={<RunDepreciation />} />
                  <Route path="/journal" element={<JournalEntries />} />
                  <Route path="/laporan/laba-rugi" element={<IncomeStatement />} />
                  <Route path="/laporan/neraca" element={<BalanceSheet />} />
                  <Route path="/laporan/buku-besar" element={<GeneralLedger />} />
                  <Route path="/laporan/neraca-saldo" element={<TrialBalance />} />
                  <Route path="/laporan/arus-kas" element={<CashFlowStatement />} />
                  <Route path="/laporan/buku-pembantu" element={<SubsidiaryLedger />} />
                  <Route path="/transaksi/terima-pembayaran" element={<ReceivePayment />} />
                  <Route path="/transaksi/bayar-utang" element={<MakePayment />} />
                  
                  <Route path="*" element={<Navigate to="/" />} /> 
                </Routes>
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </ConfigProvider>
  )
}

export default App