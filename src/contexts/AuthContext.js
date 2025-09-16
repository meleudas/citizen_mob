// src/contexts/AuthContext.js
import React, { createContext, useState, useCallback, useEffect } from 'react';
import authService from '../services/authService'; // Переконайтесь, що шлях правильний

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false); // Додано стан для гостя
  const [isLoading, setIsLoading] = useState(true); // Початкове завантаження
  const [user, setUser] = useState(null);

  // Перевірка стану авторизації через AuthService
  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      const authResult = await authService.checkAuthStatus();
      
      if (authResult.isAuthenticated && authResult.user) {
        setIsAuthenticated(true);
        setIsGuest(false); // Не гість, якщо авторизований
        setUser(authResult.user);
      } else {
        setIsAuthenticated(false);
        setIsGuest(false); // Скидаємо стан гостя при перевірці
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

  // Логін через AuthService
  const login = useCallback(async (credentials) => {
    try {
      setIsLoading(true);
      const result = await authService.login(credentials);
      
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setIsGuest(false); // Не гість після логіну
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

  // Реєстрація через AuthService
  const register = useCallback(async (userData) => {
    try {
      setIsLoading(true);
      const result = await authService.register(userData);
      
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setIsGuest(false); // Не гість після реєстрації
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

  // Вхід як гість
  const loginAsGuest = useCallback(() => {
    console.log('👥 [AuthContext] Вхід як гість');
    setIsAuthenticated(false); // Не авторизований
    setIsGuest(true); // Але є гість
    setUser({ 
      id: 'guest', 
      firstName: 'Гість', 
      lastName: '', 
      email: 'guest@example.com',
      isGuest: true 
    });
    setIsLoading(false);
  }, []);

  // Логаут через AuthService (вихід також з гостьового режиму)
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await authService.logout();
      setIsAuthenticated(false);
      setIsGuest(false); // Вихід з гостьового режиму
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Оновлення даних користувача через AuthService
  const updateUser = useCallback(async (userData) => {
    try {
      const result = await authService.updateProfile(userData);
      if (result.success && result.user) {
        setUser(result.user);
      }
      return result;
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Ініціальна перевірка статусу авторизації при монтуванні
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const value = {
    isAuthenticated,
    isGuest, // Додано в контекст
    isLoading,
    user,
    checkAuthStatus,
    login,
    register,
    loginAsGuest, // Додано функцію
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};