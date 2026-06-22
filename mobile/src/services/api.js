import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = 'https://visitor.sonnetinfotech.com/api';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('visitanthub_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // 401 handling is done per-screen via logout from AuthContext
    return Promise.reject(err);
  }
);

export default api;
