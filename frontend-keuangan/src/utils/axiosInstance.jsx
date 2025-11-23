// File: src/utils/axiosInstance.js
import axios from 'axios';
import { applyAuthTokenInterceptor } from 'axios-jwt';

// --- PERBAIKAN: LANGSUNG TEMBAK RAILWAY ---
// Ganti link di bawah ini dengan Link Railway lo yang asli (jangan sampe salah ketik/spasi)
// Contoh: 'https://equilib-system-atma.up.railway.app'
const BASE_URL = 'https://equilib-system-atma.up.railway.app'; 

const axiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000, // Gua naikin jadi 10 detik jaga-jaga sinyal
    headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
    },
});

// Helper ambil token
const getAuthTokens = () => {
  const tokens = localStorage.getItem('authTokens');
  return tokens ? JSON.parse(tokens) : null;
}

// Logic Refresh Token
const refreshAuthLogic = async (failedRequest) => {
    const tokens = getAuthTokens();
    if (!tokens?.refresh) {
        return Promise.reject(failedRequest);
    }
    try {
        const response = await axios.post(BASE_URL + '/api/token/refresh/', {
            refresh: tokens.refresh
        });
        const newTokens = {
            ...tokens,
            access: response.data.access
        };
        localStorage.setItem('authTokens', JSON.stringify(newTokens));
        failedRequest.response.config.headers['Authorization'] = 'Bearer ' + newTokens.access;
        axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + newTokens.access;
        return Promise.resolve();
    } catch (refreshError) {
        localStorage.removeItem('authTokens');
        window.location.href = '/login';
        return Promise.reject(refreshError);
    }
};

// Interceptor
applyAuthTokenInterceptor(axiosInstance, {
    requestTrigger: (config) => {
        // Tembak semua request KECUALI login/refresh/register
        return !config.url.includes('/token/') && !config.url.includes('/users/');
    },
    getAccessToken: () => getAuthTokens()?.access,
    getRefreshToken: () => getAuthTokens()?.refresh,
    onRefresh: refreshAuthLogic
});

export default axiosInstance;