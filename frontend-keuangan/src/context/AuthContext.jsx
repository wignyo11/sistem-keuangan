// File: src/context/AuthContext.jsx
import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';

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

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const loginUser = async (username, password) => {
        setLoading(true);
        try {
            // 1. Minta Token
            const response = await axiosInstance.post('/api/token/', {
                username, password
            });

            const data = response.data;

            if (response.status === 200) {
                // 2. Simpan Data
                setAuthTokens(data);
                setUser(jwtDecode(data.access));
                localStorage.setItem('authTokens', JSON.stringify(data));

                // --- TAMBAHAN PENTING: PAKSA AXIOS PAKE TOKEN SEKARANG JUGA ---
                axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + data.access;
                
                // 3. Pindah Halaman
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
        // Hapus header biar bersih
        delete axiosInstance.defaults.headers.common['Authorization'];
        navigate('/login');
    };

    // Cek token pas pertama load
    useEffect(() => {
        if (authTokens) {
            setUser(jwtDecode(authTokens.access));
            // Pasang header pas refresh halaman
            axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + authTokens.access;
        }
    }, [authTokens]);

    const contextData = {
        user: user,
        authTokens: authTokens,
        loginUser: loginUser,
        logoutUser: logoutUser,
    };

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    );
};