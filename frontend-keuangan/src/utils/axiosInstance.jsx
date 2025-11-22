// File: src/utils/axiosInstance.jsx
// (File BARU - "Axios Pinter" kita)

import axios from 'axios';
import { applyAuthTokenInterceptor } from 'axios-jwt';

const baseURL = 'http://127.0.0.1:8000'; // API Backend kita

// 1. Bikin 'instance' axios
const axiosInstance = axios.create({
    baseURL: baseURL
});

// 2. Fungsi untuk dapet "kunci" dari brankas (localStorage)
const getAuthTokens = () => {
  const tokens = localStorage.getItem('authTokens');
  return tokens ? JSON.parse(tokens) : null;
}

// 3. Fungsi untuk 'refresh' "kunci"
const refreshAuthLogic = async (failedRequest) => {
    const tokens = getAuthTokens();

    if (!tokens?.refresh) {
        return Promise.reject(failedRequest);
    }

    try {
        // Panggil API '/api/token/refresh/'
        const response = await axios.post(baseURL + '/api/token/refresh/', {
            refresh: tokens.refresh
        });

        // Simpen "kunci" baru
        const newTokens = {
            ...tokens, // Simpen 'refresh' token yang lama
            access: response.data.access // Ambil 'access' token yang baru
        };

        localStorage.setItem('authTokens', JSON.stringify(newTokens));

        // "Ajarin" axios buat pake "kunci" baru ini
        failedRequest.response.config.headers['Authorization'] = 'Bearer ' + newTokens.access;
        axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + newTokens.access;

        return Promise.resolve();

    } catch (refreshError) {
        // Kalo "kunci cadangan" (refresh token) ikutan expired
        localStorage.removeItem('authTokens');
        window.location.href = '/login'; // Tendang paksa ke login
        return Promise.reject(refreshError);
    }
};

// 4. "Pasang Pencegat"-nya ke 'axios pinter' kita
applyAuthTokenInterceptor(axiosInstance, {
    requestTrigger: (config) => {
        // Kita cuma pasang "kunci" kalo manggil API kita (bukan API luar)
        return config.baseURL === baseURL && config.url !== '/api/token/';
    },
    getAccessToken: () => getAuthTokens()?.access, // Ambil "kunci" utama
    getRefreshToken: () => getAuthTokens()?.refresh, // Ambil "kunci cadangan"
    onRefresh: refreshAuthLogic // Kalo expired, panggil fungsi "refresh"
});

export default axiosInstance; // <-- Export "Axios Pinter"