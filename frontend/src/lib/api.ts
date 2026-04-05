import axios from 'axios';

export const api = axios.create({ baseURL: '/' });

// Attach JWT from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401 (expired or invalid token)
let _logout: (() => void) | null = null;
export function setLogoutCallback(fn: () => void) { _logout = fn; }

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) _logout?.();
    return Promise.reject(error);
  }
);
