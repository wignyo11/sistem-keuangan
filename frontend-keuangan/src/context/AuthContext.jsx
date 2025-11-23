// File: src/context/AuthContext.jsx
// (VERSI FINAL: ANTI-RACE CONDITION)

import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { Spin } from 'antd'; // Kita butuh spinner loading

const AuthContext = createContext();

export default AuthContext;

export const AuthProvider = ({ children }) => {
    
    // 1. Ambil data dari LocalStorage SEBELUM render apapun
    const [authTokens, setAuthTokens] = useState(() => {
        const storedTokens = localStorage.getItem('authTokens');
        return storedTokens ? JSON.parse(storedTokens) : null;
    });

    const [user, setUser] = useState(() => {
        const storedTokens = localStorage.getItem('authTokens');
        return storedTokens ? jwtDecode(storedTokens) : null;
    });

    // State buat nahan render (PENTING!)
    const [appReady, setAppReady] = useState(false); 
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();

    // 2. EFEK PERTAMA KALI LOAD (INISIALISASI)
    useEffect(() => {
        if (authTokens) {
            // TEMPEL TOKEN DULU KE AXIOS
            axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + authTokens.access;
        }
        // Baru bilang aplikasi siap
        setAppReady(true);
    }, []); // Cuma jalan sekali pas refresh

    // 3. Login Logic
    const loginUser = async (username, password) => {
        setLoading(true);
        try {
            const response = await axiosInstance.post('/api/token/', {
                username, password
            });
            const data = response.data;

            if (response.status === 200) {
                setAuthTokens(data);
                setUser(jwtDecode(data.access));
                localStorage.setItem('authTokens', JSON.stringify(data));
                
                // Tempel token langsung
                axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + data.access;
                
                navigate('/');
            } else {
                alert('Ada yang salah!');
            }
        } catch (error) {
            console.error("Login Error:", error);
            alert('Username atau Password salah!');
        } finally {
            setLoading(false);
        }
    };

    // 4. Logout Logic
    const logoutUser = () => {
        setAuthTokens(null);
        setUser(null);
        localStorage.removeItem('authTokens');
        delete axiosInstance.defaults.headers.common['Authorization'];
        navigate('/login');
    };

    const contextData = {
        user,
        authTokens,
        loginUser,
        logoutUser,
    };

    // 5. TAHAN RENDER SAMPAI SIAP
    // Ini kuncinya. Kalau belum siap, tampilin loading putih doang.
    // Jangan biarin Dashboard ngerender duluan.
    if (!appReady) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Spin size="large" tip="Menyiapkan Data..." />
            </div>
        );
    }

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    );
};