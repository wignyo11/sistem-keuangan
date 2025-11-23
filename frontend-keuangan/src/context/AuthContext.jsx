import { createContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode"; // <-- Import ini
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance'; // Pake axios kita yg pinter

const AuthContext = createContext();

export default AuthContext;

export const AuthProvider = ({ children }) => {
    
    // 1. INISIALISASI STATE (JURUS ANTI AMNESIA)
    // Pas website dibuka/refresh, langsung cek localStorage dulu!
    const [authTokens, setAuthTokens] = useState(() => {
        const storedTokens = localStorage.getItem('authTokens');
        return storedTokens ? JSON.parse(storedTokens) : null;
    });

    const [user, setUser] = useState(() => {
        const storedTokens = localStorage.getItem('authTokens');
        return storedTokens ? jwtDecode(storedTokens) : null;
    });

    const [loading, setLoading] = useState(false); // Loading buat login process
    const navigate = useNavigate();

    // 2. FUNGSI LOGIN
    const loginUser = async (username, password) => {
        setLoading(true);
        try {
            // Pake axios biasa dulu buat login pertama kali
            // (Biar gak kena interceptor token yg belum ada)
            const response = await axiosInstance.post('/api/token/', {
                username, password
            });

            const data = response.data;

            if (response.status === 200) {
                setAuthTokens(data);
                setUser(jwtDecode(data.access));
                localStorage.setItem('authTokens', JSON.stringify(data));
                navigate('/'); // Lempar ke Dashboard
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

    // 3. FUNGSI LOGOUT
    const logoutUser = () => {
        setAuthTokens(null);
        setUser(null);
        localStorage.removeItem('authTokens');
        navigate('/login');
    };

    // 4. CONTEXT DATA
    const contextData = {
        user: user,
        authTokens: authTokens,
        loginUser: loginUser,
        logoutUser: logoutUser,
    };

    // 5. CEK OTOMATIS SAAT LOAD
    // (Opsional: Bisa ditambah logika buat verify token ke backend kalau mau super aman)
    useEffect(() => {
        if (authTokens) {
            setUser(jwtDecode(authTokens.access));
        }
    }, [authTokens]);

    return (
        <AuthContext.Provider value={contextData}>
            {children}
        </AuthContext.Provider>
    );
};