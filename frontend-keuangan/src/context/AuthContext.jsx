// File: src/context/AuthContext.jsx
// (VERSI FIX: Clean Console & Anti-Warning)

import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { Spin } from 'antd';

const AuthContext = createContext();

export default AuthContext;

export const AuthProvider = ({ children }) => {
    
    const [authTokens, setAuthTokens] = useState(() => {
        const storedTokens = localStorage.getItem('authTokens');
        return storedTokens ? JSON.parse(storedTokens) : null;
    });

    const [user, setUser] = useState(() => {
        const storedTokens = localStorage.getItem('authTokens');
        return storedTokens ? jwtDecode(storedTokens) : null;
    });

    const [appReady, setAppReady] = useState(false); 
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();

    useEffect(() => {
        if (authTokens) {
            axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + authTokens.access;
        }
        setAppReady(true);
    }, []); 

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

    if (!appReady) {
        return (
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 20 }}>
                {/* FIX: Spin gak pake 'tip' di sini, teksnya kita taruh manual di bawah biar rapi */}
                <Spin size="large" />
                <span style={{ color: '#1890ff', fontWeight: 500 }}>Menyiapkan Data...</span>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    );
};