import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  // Use useCallback to prevent infinite loops
  const checkAuth = useCallback(async () => {
    if (initialized) return; // Prevent multiple calls
    
    try {
      console.log('Checking authentication...'); // Debug log
      const response = await api.get('/api/me');
      console.log('Auth check successful:', response.data); // Debug log
      setUser(response.data.user);
    } catch (error) {
      console.log('Auth check failed:', error.response?.status); // Debug log
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, [initialized]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    try {
      console.log('Attempting login with:', { email, password: '***' }); // Debug log - don't log actual password
      
      // Validate input
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const response = await api.post('/api/login', { 
        email: email.trim(), 
        password: password 
      });
      
      console.log('Login successful:', response.data); // Debug log
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      console.error('Login error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      }); // Enhanced debug log
      throw error;
    }
  };

  const register = async (email, password, name) => {
    try {
      console.log('Attempting registration with:', { email, name, password: '***' }); // Debug log
      
      // Validate input
      if (!email || !password || !name) {
        throw new Error('All fields are required');
      }
      
      const response = await api.post('/api/register', { 
        email: email.trim(), 
        password: password,
        name: name.trim()
      });
      
      console.log('Registration successful:', response.data); // Debug log
      setUser(response.data.user);
      return response.data;
    } catch (error) {
      console.error('Registration error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      }); // Enhanced debug log
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Attempting logout...'); // Debug log
      await api.post('/api/logout');
      setUser(null);
      setInitialized(false); // Reset initialization state
      console.log('Logout successful'); // Debug log
    } catch (error) {
      console.error('Logout error:', error); // Debug log
      // Still clear user state even if API call fails
      setUser(null);
      setInitialized(false);
    }
  };

  // Force refresh auth check
  const refreshAuth = useCallback(() => {
    setInitialized(false);
    setLoading(true);
    checkAuth();
  }, [checkAuth]);

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    checkAuth: refreshAuth // Renamed to avoid confusion
  };

  console.log('AuthProvider render:', { user: !!user, loading, initialized }); // Debug log

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};