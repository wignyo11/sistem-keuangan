// File: src/main.jsx
// (VERSI BARU - Dengan "Benteng" AuthProvider)

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext' 

import 'antd/dist/reset.css'; 
import './index.css' 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* "BUNGKUS" PAKAI AuthProvider (Ini yang hilang) */}
      <AuthProvider> 
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)