import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const hadToken = !!sessionStorage.getItem('token');
      // Clear both storages so the expired token doesn't re-seed on next page load
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('originalToken');
      sessionStorage.removeItem('originalUser');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only navigate to login if we had a token AND we're not already on the login page
      if (hadToken && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
