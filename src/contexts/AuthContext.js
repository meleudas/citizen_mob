// src/contexts/AuthContext.js
import React, { createContext, useState, useCallback, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const authResult = await authService.checkAuthStatus();
      
      if (authResult.isAuthenticated && authResult.user) {
        setIsAuthenticated(true);
        setIsGuest(false);
        setUser(authResult.user);
      } else {
        setIsAuthenticated(false);
        setIsGuest(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setIsGuest(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (credentials) => {
    try {
      setIsLoading(true);
      const result = await authService.login(credentials);
      
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setIsGuest(false);
        setUser(result.user);
      }
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      setIsLoading(true);
      const result = await authService.register(userData);
      
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setIsGuest(false);
        setUser(result.user);
      }
      return result;
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginAsGuest = useCallback(() => {
    console.log('👥 [AuthContext] Вхід як гість');
    setIsAuthenticated(false);
    setIsGuest(true);
    setUser({ 
      id: 'guest', 
      firstName: 'Гість', 
      lastName: '', 
      email: 'guest@example.com',
      isGuest: true 
    });
    setIsLoading(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setIsAuthenticated(false);
      setIsGuest(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback(async (userData) => {
    try {
      const result = await authService.updateProfile(userData);
      
      if (result.success && result.user) {
        // У вашому сервісі повертається { success: true, user: updatedUser }
        setUser(result.user);
        // Повертаємо результат з оновленим користувачем
        return { success: true, user: result.user };
      } else {
        return result;
      }
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const value = {
    isAuthenticated,
    isGuest,
    isLoading,
    user,
    checkAuthStatus,
    login,
    register,
    loginAsGuest,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};