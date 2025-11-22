// File: src/context/AuthContext.jsx
// (VERSI UPGRADE - Pake axiosInstance)

import React, { createContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import { Spin } from 'antd';
import axiosInstance from '../utils/axiosInstance'; // <-- IMPORT "AXIOS PINTER" KITA

const AuthContext = createContext();
export default AuthContext;

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [authTokens, setAuthTokens] = useState(() => 
    localStorage.getItem('authTokens')
      ? JSON.parse(localStorage.getItem('authTokens'))
      : null
  );

  const [user, setUser] = useState(() => {
    if (localStorage.getItem('authTokens')) {
      const token = JSON.parse(localStorage.getItem('authTokens')).access;
      const decodedToken = jwtDecode(token);
      return { 
        user_id: decodedToken.user_id, 
        username: decodedToken.username,
        groups: decodedToken.groups || []
      };
    }
    return null;
  });

  const [loading, setLoading] = useState(false); // Kita matiin 'loading' awal

  // --- FUNGSI LOGIN (DI-UPGRADE) ---
  const loginUser = async (username, password) => {
    try {
      // 1. Panggil API '/api/token/' PAKE "AXIOS PINTER"
      const response = await axiosInstance.post('/api/token/', {
        username: username,
        password: password,
      });

      const data = response.data;
      const decodedToken = jwtDecode(data.access);

      setAuthTokens(data);
      setUser({ 
        user_id: decodedToken.user_id, 
        username: decodedToken.username,
        groups: decodedToken.groups || []
      });

      localStorage.setItem('authTokens', JSON.stringify(data));

      // "Ajarin" axiosInstance (lagi) buat request berikutnya
      axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + data.access;

      navigate('/');

    } catch (error) {
      console.error("Login Gagal:", error);
      alert('Username atau password salah!');
    }
  };

  // --- FUNGSI LOGOUT (DI-UPGRADE) ---
  const logoutUser = () => {
    setAuthTokens(null);
    setUser(null);
    localStorage.removeItem('authTokens');

    // Hapus "kunci" dari "axios pinter"
    delete axiosInstance.defaults.headers.common['Authorization'];

    navigate('/login');
  };

  // Kita HAPUS 'useEffect' yang "ngajarin" axios,
  // karena 'axiosInstance' udah pinter dari sananya.

  const contextData = {
    user: user,
    authTokens: authTokens,
    loginUser: loginUser,
    logoutUser: logoutUser,
  };

  // Jangan nampilin apa-apa kalo 'loading'
  if (loading) {
      return <Spin tip="Memuat Sesi..." size="large" style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }} />;
  }

  return (
    <AuthContext.Provider value={contextData}>
      {children} 
    </AuthContext.Provider>
  );
};