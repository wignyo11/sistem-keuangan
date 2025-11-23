import axios from 'axios';
import { applyAuthTokenInterceptor } from 'axios-jwt'; 
// Deteksi otomatis:
// Kalau mode DEV (Laptop) -> Pake localhost
// Kalau mode PROD (Railway) -> Pake alamat website sendiri (kosongin)
const baseURL = import.meta.env.DEV 
  ? 'http://127.0.0.1:8000' 
  : ''; 

const axiosInstance = axios.create({
    baseURL: baseURL, 
    timeout: 5000,
    headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
    },
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
        // JANGAN cek baseURL lagi. Cukup cek URL tujuannya.
        // Kalau URL-nya BUKAN login atau refresh, WAJIB pake token.
        const isAuthEndpoint = config.url.includes('/token/');
        return !isAuthEndpoint; 
    },
    getAccessToken: () => getAuthTokens()?.access,
    getRefreshToken: () => getAuthTokens()?.refresh,
    onRefresh: refreshAuthLogic
});

export default axiosInstance; // <-- Export "Axios Pinter"