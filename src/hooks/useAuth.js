// src/hooks/useAuth.js
import { useState, useEffect, useCallback, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthContext } from '../contexts/AuthContext';
import authService from '../services/authService';

const TOKEN_KEY = 'userToken';
const USER_KEY = 'userData';
const REFRESH_TOKEN_KEY = 'refreshToken';
const REMEMBER_ME_KEY = 'rememberMe';

export const useAuth = () => {
  // Використовуємо контекст для глобального стану
  const context = useContext(AuthContext);
  
  if (!context) {
    const errorMsg = 'useAuth must be used within an AuthProvider';
    console.error('❌ [useAuth] Критична помилка:', errorMsg);
    throw new Error(errorMsg);
  }

  const { 
    isAuthenticated: contextIsAuthenticated, 
    user: contextUser, 
    isLoading: contextLoading,
    checkAuthStatus: contextCheckAuthStatus,
    login: contextLogin,
    register: contextRegister, // Це значення тепер використовується
    logout: contextLogout,
    loginAsGuest: contextLoginAsGuest,
    updateUser: contextUpdateUser
  } = context;

  // Локальний стан для додаткових функцій
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);

  // Завантаження токену та даних користувача при запуску
  useEffect(() => {
    console.log('📥 [useEffect] Ефект завантаження збережених даних аутентифікації запущено');
    const loadStoredAuthData = async () => {
      try {
        console.log('📥 [loadStoredAuthData] Початок завантаження даних з AsyncStorage');
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        const storedRefreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
        
        console.log('📥 [loadStoredAuthData] Завантажені дані:', { 
          hasStoredToken: !!storedToken, 
          hasStoredUser: !!storedUser, 
          hasStoredRefreshToken: !!storedRefreshToken 
        });
        
        if (storedToken) {
          setToken(storedToken);
          console.log('📥 [loadStoredAuthData] Токен збережено в локальний стан');
        }
        
        if (storedRefreshToken) {
          setRefreshToken(storedRefreshToken);
          console.log('📥 [loadStoredAuthData] Refresh токен збережено в локальний стан');
        }
      } catch (error) {
        console.error('❌ [loadStoredAuthData] Помилка завантаження даних аутентифікації:', error);
      }
    };

    loadStoredAuthData();
  }, []);

  // Валідація токену
  const validateToken = useCallback(async (authToken) => {
    console.log('🔍 [validateToken] Початок валідації токену:', !!authToken);
    if (!authToken) {
      console.log('⚠️ [validateToken] Токен відсутній, валідація не пройдена');
      return false;
    }

    try {
      // Використовуємо authService для валідації токену
      const isValid = await authService.validateToken(authToken);
      console.log('✅ [validateToken] Токен валідний:', isValid);
      return isValid;
    } catch (error) {
      console.error('❌ [validateToken] Помилка валідації токену:', error);
      return false;
    }
  }, []);

  // Auto-refresh токену
  const refreshAuthToken = useCallback(async () => {
    console.log('🔄 [refreshAuthToken] Початок оновлення токену');
    if (!refreshToken) {
      const errorMsg = 'No refresh token available';
      console.warn('⚠️ [refreshAuthToken] Refresh токен відсутній');
      throw new Error(errorMsg);
    }

    try {
      setLoading(true);
      setError(null);
      console.log('🔄 [refreshAuthToken] Виконання запиту на оновлення токену');

      // Використовуємо authService для оновлення токену
      const response = await authService.refreshToken();
      
      if (response.success) {
        console.log('✅ [refreshAuthToken] Отримано нові токени');

        // Збереження нових токенів
        await AsyncStorage.setItem(TOKEN_KEY, response.token);
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
        console.log('💾 [refreshAuthToken] Нові токени збережені в AsyncStorage');
        
        setToken(response.token);
        setRefreshToken(response.refreshToken);
        console.log('🔄 [refreshAuthToken] Локальний стан токенів оновлено');

        return response;
      } else {
        throw new Error(response.error || 'Failed to refresh token');
      }
    } catch (error) {
      console.error('❌ [refreshAuthToken] Помилка оновлення токену:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
      console.log('🔄 [refreshAuthToken] Завершення процесу оновлення токену');
    }
  }, [refreshToken]);

  // Вхід
  const login = useCallback(async (loginData) => {
    console.log('🔐 [useAuth.login] === ПОЧАТОК ВХОДУ ===');
    console.log('🔐 [useAuth.login] ВХІДНІ ПАРАМЕТРИ:', loginData);
    
    try {
      setLoading(true);
      setError(null);
      console.log('🔐 [useAuth.login] Стан завантаження встановлено в true');

      // Валідація вхідних даних
      const { email, password, rememberMe = false } = loginData;
      
      console.log('🔐 [useAuth.login] Розпаковані дані:', { email, hasPassword: !!password, rememberMe });
      
      if (!email || !password) {
        const errorMsg = 'Email та пароль обов\'язкові';
        console.warn('⚠️ [useAuth.login] ПОМИЛКА ВАЛІДАЦІЇ: Відсутні обов\'язкові дані');
        throw new Error(errorMsg);
      }

      console.log('🔐 [useAuth.login] Всі перевірки пройдено, передаємо дані в authService');
      
      // Використовуємо authService для входу
      const response = await authService.login(loginData);
      console.log('🔐 [useAuth.login] Відповідь від authService:', response);
      
      if (response.success && response.data) {
        // Виправлення: правильний доступ до даних
        const loginResult = response.data;
        const { accessToken, refreshToken, user } = loginResult;
        const token = accessToken; // Використовуємо accessToken
        
        console.log('🔐 [useAuth.login] Розпаковані дані з відповіді:', { 
          hasToken: !!token, 
          hasRefreshToken: !!refreshToken, 
          hasUser: !!user 
        });

        if (!token || !user) {
          const errorMsg = 'Сервер не повернув необхідні дані';
          console.error('❌ [useAuth.login] ПОМИЛКА: ' + errorMsg);
          throw new Error(errorMsg);
        }

        console.log('✅ [useAuth.login] Успішний вхід через authService');

        // Збереження даних
        console.log('💾 [useAuth.login] Збереження даних користувача...');
        await AsyncStorage.setItem(TOKEN_KEY, token);
        if (refreshToken) {
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
        await AsyncStorage.setItem(REMEMBER_ME_KEY, rememberMe.toString());
        console.log('💾 [useAuth.login] Дані користувача збережені в AsyncStorage');

        // Оновлення контексту
        console.log('🔄 [useAuth.login] Оновлення контексту через contextLogin');
        const contextLoginResult = await contextLogin(user, token);
        console.log('🔄 [useAuth.login] Результат оновлення контексту:', contextLoginResult);
        
        if (!contextLoginResult.success) {
          const errorMsg = contextLoginResult.error || 'Помилка оновлення контексту';
          console.error('❌ [useAuth.login] Помилка оновлення контексту:', errorMsg);
          throw new Error(errorMsg);
        }

        // Оновлення локального стану
        setToken(token);
        setRefreshToken(refreshToken || null);
        console.log('🔐 [useAuth.login] Локальний стан оновлено, вхід завершено');

        return { 
          success: true, 
          user: user, 
          token: token, 
          refreshToken: refreshToken || null
        };
      } else {
        const errorMsg = response.error || 'Помилка входу';
        console.error('❌ [useAuth.login] Помилка входу від authService:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('💥 [useAuth.login] КРИТИЧНА ПОМИЛКА входу:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
      console.log('🔐 [useAuth.login] === ЗАВЕРШЕННЯ ВХОДУ ===');
    }
  }, [contextLogin]);
  const register = useCallback(async (firstName, lastName, email, password) => {
    console.log('📝 [useAuth.register] === ПОЧАТОК РЕЄСТРАЦІЇ ===');
    console.log('📝 [useAuth.register] ВХІДНІ ПАРАМЕТРИ:', { 
      firstName, 
      lastName, 
      email, 
      hasPassword: !!password,
      passwordLength: password ? password.length : 0
    });
    
    try {
      setLoading(true);
      setError(null);
      console.log('📝 [useAuth.register] Стан завантаження встановлено в true');

      // Валідація вхідних даних
      console.log('📝 [useAuth.register] Перевірка обов\'язкових полів...');
      if (!firstName || !lastName || !email || !password) {
        const errorMsg = 'Всі поля обов\'язкові';
        console.warn('⚠️ [useAuth.register] ПОМИЛКА ВАЛІДАЦІЇ: Відсутні обов\'язкові дані');
        console.log('⚠️ [useAuth.register] Конкретно відсутні поля:', {
          firstNameMissing: !firstName,
          lastNameMissing: !lastName,
          emailMissing: !email,
          passwordMissing: !password
        });
        throw new Error(errorMsg);
      }

      if (password.length < 6) {
        const errorMsg = 'Пароль має містити мінімум 6 символів';
        console.warn('⚠️ [useAuth.register] ПОМИЛКА ВАЛІДАЦІЇ ПАРОЛЯ:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('📝 [useAuth.register] Всі перевірки пройдено, передаємо дані в authService');
      
      // Використовуємо authService для реєстрації (не contextRegister!)
      const registerData = { firstName, lastName, email, password };
      console.log('📝 [useAuth.register] Підготовлені дані для authService.register:', registerData);
      
      const response = await authService.register(registerData);
      console.log('📝 [useAuth.register] Відповідь від authService:', response);
      
      if (response.success) {
        console.log('✅ [useAuth.register] Успішна реєстрація через authService');

        // Збереження даних
        console.log('💾 [useAuth.register] Збереження даних користувача...');
        await AsyncStorage.setItem(TOKEN_KEY, response.token);
        if (response.refreshToken) {
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
        }
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
        console.log('💾 [useAuth.register] Дані користувача збережені в AsyncStorage');

        // Оновлення локального стану
        setToken(response.token);
        setRefreshToken(response.refreshToken);
        console.log('📝 [useAuth.register] Локальний стан оновлено');

        // Повертаємо успіх без виклику contextRegister
        return { 
          success: true, 
          user: response.user, 
          token: response.token, 
          refreshToken: response.refreshToken 
        };
      } else {
        const errorMsg = response.error || 'Помилка реєстрації';
        console.error('❌ [useAuth.register] Помилка реєстрації від authService:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('💥 [useAuth.register] КРИТИЧНА ПОМИЛКА реєстрації:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
      console.log('📝 [useAuth.register] === ЗАВЕРШЕННЯ РЕЄСТРАЦІЇ ===');
    }
  }, [contextRegister, login]);

  // Вихід
  const logout = useCallback(async () => {
    console.log('🚪 [logout] Початок процесу виходу');
    try {
      setLoading(true);
      
      // Використовуємо authService для виходу
      await authService.logout();
      
      // Видалення даних з AsyncStorage
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      await AsyncStorage.removeItem(REMEMBER_ME_KEY);
      console.log('🗑️ [logout] Дані користувача видалені з AsyncStorage');

      // Оновлення контексту
      console.log('🔄 [logout] Оновлення контексту через contextLogout');
      await contextLogout();
      console.log('🔄 [logout] Контекст оновлено');

      setToken(null);
      setRefreshToken(null);
      setError(null);
      console.log('🚪 [logout] Локальний стан очищено');

      return { success: true };
    } catch (error) {
      console.error('❌ [logout] Помилка виходу:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
      console.log('🚪 [logout] Завершення процесу виходу');
    }
  }, [contextLogout]);

  // Оновлення профілю
  const updateProfile = useCallback(async (userData) => {
    console.log('✏️ [updateProfile] Початок оновлення профілю', { hasUserData: !!userData });
    try {
      setLoading(true);
      setError(null);

      // Використовуємо authService для оновлення профілю
      const response = await authService.updateProfile(userData);
      
      if (response.success) {
        console.log('✅ [updateProfile] Профіль оновлено');

        // Збереження оновлених даних
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(response.user));
        console.log('💾 [updateProfile] Оновлені дані користувача збережені в AsyncStorage');

        // Оновлення контексту
        console.log('🔄 [updateProfile] Оновлення контексту через contextUpdateUser');
        await contextUpdateUser(response.user);
        console.log('🔄 [updateProfile] Контекст оновлено');

        return { success: true, user: response.user };
      } else {
        throw new Error(response.error || 'Помилка оновлення профілю');
      }
    } catch (error) {
      console.error('❌ [updateProfile] Помилка оновлення профілю:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
      console.log('✏️ [updateProfile] Завершення процесу оновлення профілю');
    }
  }, [contextUser, contextUpdateUser]);

  // Перевірка, чи користувач авторизований (локальна функція)
  const checkIsAuthenticatedLocally = useCallback(async () => {
    console.log('🔐 [checkIsAuthenticatedLocally] Перевірка статусу авторизації', { hasToken: !!token });
    if (!token) {
      console.log('⚠️ [checkIsAuthenticatedLocally] Токен відсутній, користувач не авторизований');
      return false;
    }
    
    const isValid = await validateToken(token);
    console.log('🔐 [checkIsAuthenticatedLocally] Результат валідації токену:', isValid);
    if (!isValid) {
      // Якщо токен недійсний, спробуємо оновити його
      try {
        console.log('🔄 [checkIsAuthenticatedLocally] Спроба оновлення токену');
        await refreshAuthToken();
        console.log('✅ [checkIsAuthenticatedLocally] Токен успішно оновлено');
        return true;
      } catch (error) {
        console.error('❌ [checkIsAuthenticatedLocally] Помилка оновлення токену, виконання виходу');
        await logout();
        return false;
      }
    }
    
    console.log('✅ [checkIsAuthenticatedLocally] Користувач авторизований');
    return true;
  }, [token, validateToken, refreshAuthToken, logout]);

  // Отримання даних користувача
  const getUser = useCallback(async () => {
    console.log('👤 [getUser] Отримання даних користувача');
    try {
      const storedUser = await AsyncStorage.getItem(USER_KEY);
      console.log('👤 [getUser] Дані користувача отримані з AsyncStorage:', !!storedUser);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.error('❌ [getUser] Помилка отримання даних користувача:', error);
      return null;
    }
  }, []);

  // Відновлення пароля
  const forgotPassword = useCallback(async (email) => {
    console.log('orgotPassword] Початок процесу відновлення пароля', { email });
    try {
      setLoading(true);
      setError(null);

      if (!email) {
        const errorMsg = 'Email обов\'язковий';
        console.warn('⚠️ [forgotPassword] Email не вказаний');
        throw new Error(errorMsg);
      }

      // Використовуємо authService для відновлення пароля
      const response = await authService.forgotPassword(email);
      
      if (response.success) {
        console.log('✅ [forgotPassword] Запит на відновлення пароля відправлено');
        return { success: true, message: response.message };
      } else {
        throw new Error(response.error || 'Помилка відновлення пароля');
      }
    } catch (error) {
      console.error('❌ [forgotPassword] Помилка відновлення пароля:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
      console.log('orgotPassword] Завершення процесу відновлення пароля');
    }
  }, []);

  // Зміна пароля
  const resetPassword = useCallback(async (token, newPassword) => {
    console.log('🔑 [resetPassword] Початок процесу зміни пароля', { hasToken: !!token, hasNewPassword: !!newPassword });
    try {
      setLoading(true);
      setError(null);

      if (!token || !newPassword) {
        const errorMsg = 'Токен та новий пароль обов\'язкові';
        console.warn('⚠️ [resetPassword] Відсутні обов\'язкові дані для зміни пароля');
        throw new Error(errorMsg);
      }

      if (newPassword.length < 6) {
        const errorMsg = 'Пароль має містити мінімум 6 символів';
        console.warn('⚠️ [resetPassword] Новий пароль занадто короткий');
        throw new Error(errorMsg);
      }

      // Використовуємо authService для зміни пароля
      const response = await authService.resetPassword(token, newPassword);
      
      if (response.success) {
        console.log('✅ [resetPassword] Пароль успішно змінено');
        return { success: true, message: response.message };
      } else {
        throw new Error(response.error || 'Помилка зміни пароля');
      }
    } catch (error) {
      console.error('❌ [resetPassword] Помилка зміни пароля:', error);
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
      console.log('🔑 [resetPassword] Завершення процесу зміни пароля');
    }
  }, []);

  // Очищення помилок
  const clearError = useCallback(() => {
    console.log('🧹 [clearError] Очищення помилок');
    setError(null);
  }, []);

  // Формуємо об'єкт, який повертається
  const returnValue = {
    // Стани
    loading: loading || contextLoading,
    error,
    user: contextUser,
    token,
    isAuthenticated: contextIsAuthenticated,
    isGuest: context.isGuest,
    
    // Функції з контексту
    checkAuthStatus: contextCheckAuthStatus,
    login: contextLogin,
    register: register, // Використовуємо нашу виправлену функцію
    logout: contextLogout,
    updateUser: contextUpdateUser,
    loginAsGuest: context.loginAsGuest,
    
    // Локальні функції
    refreshAuthToken,
    checkIsAuthenticatedLocally,
    getUser,
    updateProfile,
    forgotPassword,
    resetPassword,
    clearError,
    
    // Додаткові функції
    validateToken,
  };

  return returnValue;
};