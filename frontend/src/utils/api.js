import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true,
});


let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error.response?.status, error.config?.url); // Debug log
    
    // Only redirect on 401 for protected routes, not auth routes
    if (error.response?.status === 401 && !isRedirecting) {
      const url = error.config?.url || '';
      
      // Don't redirect if we're already on auth routes or calling auth endpoints
      if (!url.includes('/api/login') && 
          !url.includes('/api/register') && 
          !url.includes('/api/me') &&
          !window.location.pathname.includes('/login') &&
          !window.location.pathname.includes('/register')) {
        
        console.log('Redirecting to login due to 401'); // Debug log
        isRedirecting = true;
        
        // Use a small delay to prevent immediate loops
        setTimeout(() => {
          window.location.href = '/login';
          isRedirecting = false;
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);

// Reset redirect flag when request is made
api.interceptors.request.use(
  (config) => {
    // Reset redirect flag for new requests
    if (isRedirecting && config.url?.includes('/api/login')) {
      isRedirecting = false;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;