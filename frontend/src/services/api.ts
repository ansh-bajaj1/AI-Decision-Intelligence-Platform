import axios from 'axios';

const api = axios.create({
  // Fallback to local API port if env variable not present
  baseURL: (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-inject JWT token into headers if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('insightiq_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle unauthorized errors (expired token)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('insightiq_token');
      localStorage.removeItem('insightiq_user');
      // If we are not on the login page, redirect to login
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
