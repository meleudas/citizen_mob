// src/services/authService.js
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Ключі для зберігання даних
const USER_DATA_KEY = 'userData';
const USER_TOKEN_KEY = 'userToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const DEVICE_INFO_KEY = 'deviceInfo';

// Інтерфейси для типів даних
/**
 * @typedef {Object} User
 * @property {number} id - ID користувача
 * @property {string} firstName - Ім'я
 * @property {string} lastName - Прізвище
 * @property {string} email - Email
 * @property {string} [avatar] - URL аватара
 * @property {Date} [createdAt] - Дата створення
 * @property {Date} [updatedAt] - Дата оновлення
 */

/**
 * @typedef {Object} AuthResponse
 * @property {boolean} success - Статус успіху
 * @property {User} [user] - Дані користувача
 * @property {string} [token] - Access токен
 * @property {string} [refreshToken] - Refresh токен
 * @property {string} [error] - Повідомлення про помилку
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string} email - Email користувача
 * @property {string} password - Пароль користувача
 * @property {boolean} [rememberMe] - Запам'ятати мене
 */

/**
 * @typedef {Object} RegisterData
 * @property {string} firstName - Ім'я
 * @property {string} lastName - Прізвище
 * @property {string} email - Email
 * @property {string} password - Пароль
 */

class AuthService {
  constructor() {
    this.isAuthenticated = false;
    this.currentUser = null;
    this.token = null;
    this.refreshToken = null;
  }

  getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      model: Platform.constants?.Model || 'Unknown',
      manufacturer: Platform.constants?.Manufacturer || 'Unknown',
      userAgent: `ZakonosluzhbyApp/${Platform.Version} (${Platform.OS})`,
    };
  }

  async saveUserData(user, token, refreshToken) {
    try {
      console.log('💾 [AuthService.saveUserData] Початок збереження даних користувача');
      console.log('💾 [AuthService.saveUserData] Вхідні дані:', { 
        hasUser: !!user, 
        hasToken: !!token, 
        hasRefreshToken: !!refreshToken
      });

      if (!user) {
        const errorMsg = 'Відсутні дані користувача';
        console.error('❌ [AuthService.saveUserData] ПОМИЛКА: ' + errorMsg);
        throw new Error(errorMsg);
      }
      if (!token) {
        const errorMsg = 'Відсутній токен доступу';
        console.error('❌ [AuthService.saveUserData] ПОМИЛКА: ' + errorMsg);
        throw new Error(errorMsg);
      }

      const userData = {
        ...user,
        lastLogin: new Date().toISOString(),
        deviceInfo: this.getDeviceInfo(),
      };

      console.log('💾 [AuthService.saveUserData] Підготовлені дані для збереження');

      const storageData = [
        [USER_DATA_KEY, JSON.stringify(userData)]
      ];

      if (token) {
        storageData.push([USER_TOKEN_KEY, token]);
      }
      if (refreshToken) {
        storageData.push([REFRESH_TOKEN_KEY, refreshToken]);
      }

      await AsyncStorage.multiSet(storageData);
      console.log('💾 [AuthService.saveUserData] Дані збережені в AsyncStorage');

      this.currentUser = userData;
      this.token = token;
      this.refreshToken = refreshToken || null;
      this.isAuthenticated = true;

      if (token) {
        api.setTokens(token, refreshToken);
      }

      return { success: true, user: userData };
    } catch (error) {
      console.error('💥 [AuthService.saveUserData] ПОМИЛКА збереження даних:', error);
      return { success: false, error: error.message };
    }
  }
  
  async loadUserData() {
    try {
      const userData = await AsyncStorage.getItem(USER_DATA_KEY);
      const token = await AsyncStorage.getItem(USER_TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);

      if (userData && token) {
        const parsedUserData = JSON.parse(userData);
        this.currentUser = parsedUserData;
        this.token = token;
        this.refreshToken = refreshToken;
        this.isAuthenticated = true;

        api.setTokens(token, refreshToken);

        return { success: true, user: parsedUserData };
      }

      return { success: false, error: 'No saved user data found' };
    } catch (error) {
      console.error('Error loading user data:', error);
      return { success: false, error: error.message };
    }
  }

  async clearUserData() {
    try {
      await AsyncStorage.multiRemove([
        USER_DATA_KEY,
        USER_TOKEN_KEY,
        REFRESH_TOKEN_KEY,
        DEVICE_INFO_KEY,
      ]);

      this.currentUser = null;
      this.token = null;
      this.refreshToken = null;
      this.isAuthenticated = false;

      api.clearTokens();

      return { success: true };
    } catch (error) {
      console.error('Error clearing user data:', error);
      return { success: false, error: error.message };
    }
  }

  // Вхід користувача
  /**
   * @param {LoginCredentials} credentials - Дані для входу
   * @returns {Promise<AuthResponse>}
   */
   async login(credentials) {
    try {
      const { email, password, rememberMe = false } = credentials;

      // Валідація вхідних даних
      if (!email || !password) {
        return { success: false, error: 'Email та пароль обов\'язкові' };
      }

      // Підготовка даних для запиту
      const loginData = {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        rememberMe,
        deviceInfo: this.getDeviceInfo(),
      };

      // Виконання запиту
      const response = await api.post('/auth/login', loginData, {
        includeAuth: false,
      });

      console.log('🔐 [AuthService.login] Відповідь від сервера:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        // Правильне розпакування даних з відповіді сервера
        const responseData = response.data.data || response.data;
        const { user, accessToken, refreshToken } = responseData;
        const token = accessToken; // Використовуємо accessToken

        console.log('🔐 [AuthService.login] Розпаковані дані:', { 
          hasUser: !!user, 
          hasToken: !!token, 
          hasRefreshToken: !!refreshToken 
        });

        // Перевірка наявності необхідних даних
        if (!user || !token) {
          const errorMessage = 'Сервер не повернув необхідні дані для входу';
          console.error('❌ [AuthService.login] Помилка:', errorMessage);
          return { success: false, error: errorMessage };
        }

        // Збереження даних користувача
        const saveResult = await this.saveUserData(user, token, refreshToken);

        if (saveResult.success) {
          return {
            success: true,
            data: {
              user: saveResult.user,
              accessToken: token,
              refreshToken,
            },
            user: saveResult.user,
            token, // Для сумісності
            refreshToken, // Для сумісності
          };
        } else {
          return { success: false, error: saveResult.error };
        }
      } else {
        return { success: false, error: response.error || 'Помилка входу' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  }
  // Реєстрація користувача
  /**
   * @param {RegisterData} userData - Дані для реєстрації
   * @returns {Promise<AuthResponse>}
   */
  async register(userData) {
    console.log('🔐 [AuthService.register] === ПОЧАТОК РЕЄСТРАЦІЇ ===');
    console.log('🔐 [AuthService.register] Отримані дані userData:', userData);
    
    try {
      const { firstName, lastName, email, password } = userData;

      // Валідація вхідних даних
      console.log('🔐 [AuthService.register] Перевірка обов\'язкових полів...');
      if (!firstName || !lastName || !email || !password) {
        const errorMessage = 'Всі поля обов\'язкові';
        console.warn('⚠️ [AuthService.register] ПОМИЛКА ВАЛІДАЦІЇ:', errorMessage);
        return { success: false, error: errorMessage };
      }

      if (password.length < 6) {
        const errorMessage = 'Пароль має містити мінімум 6 символів';
        console.warn('⚠️ [AuthService.register] ПОМИЛКА ВАЛІДАЦІЇ ПАРОЛЯ:', errorMessage);
        return { success: false, error: errorMessage };
      }

      // Підготовка даних для запиту
      const registerData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        deviceInfo: this.getDeviceInfo(),
      };

      console.log('📤 [AuthService.register] Підготовлені дані для API запиту:', registerData);

      // Виконання запиту
      const response = await api.post('/auth/register', registerData, {
        includeAuth: false,
      });

      console.log('📥 [AuthService.register] Відповідь від API:', response);

      if (response.success && response.data) {
        // Виправлення: правильний доступ до даних
        const responseData = response.data.data || response.data;
        const { accessToken, refreshToken, user } = responseData;
        
        console.log('📥 [AuthService.register] Розпаковані дані:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          hasUser: !!user 
        });

        // Виправлення: використовуємо accessToken замість token
        const token = accessToken;
        
        // Виправлення: перевіряємо наявність токенів
        if (!token) {
          const errorMessage = 'Сервер не повернув токен доступу';
          console.error('❌ [AuthService.register] Помилка: відсутній accessToken');
          return { success: false, error: errorMessage };
        }

        // Збереження даних користувача
        console.log('💾 [AuthService.register] Збереження даних користувача через saveUserData...');
        const saveResult = await this.saveUserData(user, token, refreshToken || '');

        if (saveResult.success) {
          console.log('✅ [AuthService.register] Реєстрація успішна');
          return {
            success: true,
            user: saveResult.user,
            token, // Повертаємо accessToken
            refreshToken: refreshToken || '', // Може бути порожнім
          };
        } else {
          console.error('❌ [AuthService.register] Помилка збереження даних користувача:', saveResult.error);
          return { success: false, error: saveResult.error };
        }
      } else {
        const errorMessage = response.error || 'Помилка реєстрації';
        console.error('❌ [AuthService.register] Помилка реєстрації:', errorMessage);
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('💥 [AuthService.register] КРИТИЧНА ПОМИЛКА реєстрації:', error);
      return { success: false, error: error.message };
    }
  }

  // Вихід користувача
  /**
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async logout() {
    try {
      // Спроба виконати запит на сервер для виходу
      if (this.token) {
        await api.post('/auth/logout', {}, {
          includeAuth: true,
        }).catch(error => {
          // Ігноруємо помилки виходу, оскільки важливіше очистити локальні дані
          console.warn('Logout API call failed:', error);
        });
      }

      // Очищення даних користувача
      const clearResult = await this.clearUserData();

      return clearResult;
    } catch (error) {
      console.error('Logout error:', error);
      // Все одно очищуємо локальні дані навіть при помилці
      await this.clearUserData();
      return { success: false, error: error.message };
    }
  }

  // Відновлення пароля
  /**
   * @param {string} email - Email користувача
   * @returns {Promise<{success: boolean, error?: string, message?: string}>}
   */
  async forgotPassword(email) {
    try {
      if (!email) {
        return { success: false, error: 'Email обов\'язковий' };
      }

      // Валідація email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return { success: false, error: 'Невірний формат email' };
      }

      const response = await api.post('/auth/forgot-password', {
        email: email.trim().toLowerCase(),
      }, {
        includeAuth: false,
      });

      if (response.success) {
        return {
          success: true,
          message: response.data?.message || 'Посилання для відновлення пароля надіслано на ваш email',
        };
      } else {
        return { success: false, error: response.error || 'Помилка відновлення пароля' };
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      return { success: false, error: error.message };
    }
  }

  // Скидання пароля
  /**
   * @param {string} token - Токен для скидання пароля
   * @param {string} newPassword - Новий пароль
   * @returns {Promise<{success: boolean, error?: string, message?: string}>}
   */
  async resetPassword(token, newPassword) {
    try {
      if (!token || !newPassword) {
        return { success: false, error: 'Токен та новий пароль обов\'язкові' };
      }

      if (newPassword.length < 6) {
        return { success: false, error: 'Пароль має містити мінімум 6 символів' };
      }

      const response = await api.post('/auth/reset-password', {
        token,
        password: newPassword.trim(),
      }, {
        includeAuth: false,
      });

      if (response.success) {
        return {
          success: true,
          message: response.data?.message || 'Пароль успішно змінено',
        };
      } else {
        return { success: false, error: response.error || 'Помилка скидання пароля' };
      }
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    }
  }

  // Оновлення профілю користувача
  /**
   * @param {Partial<User>} userData - Оновлені дані користувача
   * @returns {Promise<{success: boolean, user?: User, error?: string}>}
   */
 async updateProfile(userData) {
    try {
      if (!this.isAuthenticated || !this.token) {
        return { success: false, error: 'Користувач не авторизований' };
      }

      // Змінено на PUT запит для оновлення профілю
      const response = await api.put('/auth/profile', userData, {
        includeAuth: true,
      });

      if (response.success && response.data) {
        const updatedUser = response.data;

        // Оновлення даних користувача в локальному сховищі
        const currentData = await AsyncStorage.getItem(USER_DATA_KEY);
        if (currentData) {
          const parsedData = JSON.parse(currentData);
          const mergedData = { ...parsedData, ...updatedUser };
          
          await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(mergedData));
          this.currentUser = mergedData;
        }

        return { success: true, user: updatedUser };
      } else {
        return { success: false, error: response.error || 'Помилка оновлення профілю' };
      }
    } catch (error) {
      console.error('Update profile error:', error);
      return { success: false, error: error.message };
    }
  }

  // Зміна пароля
  /**
   * @param {string} currentPassword - Поточний пароль
   * @param {string} newPassword - Новий пароль
   * @returns {Promise<{success: boolean, error?: string, message?: string}>}
   */
  async changePassword(currentPassword, newPassword) {
    try {
      if (!currentPassword || !newPassword) {
        return { success: false, error: 'Поточний та новий пароль обов\'язкові' };
      }

      if (newPassword.length < 6) {
        return { success: false, error: 'Новий пароль має містити мінімум 6 символів' };
      }

      const response = await api.put('/auth/password', { // Виправлено з POST на PUT
        currentPassword,
        newPassword,
      }, {
        includeAuth: true,
      });

      if (response.success) {
        return {
          success: true,
          message: response.data?.message || 'Пароль успішно змінено',
        };
      } else {
        return { success: false, error: response.error || 'Помилка зміни пароля' };
      }
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, error: error.message };
    }
  }

  // Перевірка стану авторизації
  /**
   * @returns {Promise<{isAuthenticated: boolean, user?: User}>}
   */
  async checkAuthStatus() {
    try {
      // Якщо вже авторизовані - перевіряємо токен
      if (this.token) {
        const isValid = await this.validateToken(this.token);
        if (isValid) {
          return { isAuthenticated: true, user: this.currentUser };
        } else {
          // Якщо токен недійсний - пробуємо оновити
          try {
            const refreshResult = await this.refreshToken();
            if (refreshResult.success) {
              return { isAuthenticated: true, user: this.currentUser };
            } else {
              await this.clearUserData();
              return { isAuthenticated: false };
            }
          } catch (refreshError) {
            await this.clearUserData();
            return { isAuthenticated: false };
          }
        }
      }

      // Перевірка збережених даних
      const loadResult = await this.loadUserData();
      return {
        isAuthenticated: loadResult.success,
        user: loadResult.success ? loadResult.user : null,
      };
    } catch (error) {
      console.error('Check auth status error:', error);
      await this.clearUserData();
      return { isAuthenticated: false };
    }
  }

  // Валідація токена
  /**
   * @param {string} token - Токен для валідації
   * @returns {Promise<boolean>}
   */
  async validateToken(token) {
    try {
      const response = await api.get('/auth/me', { // Виправлено з /auth/validate-token на /auth/me
        headers: { Authorization: `Bearer ${token}` },
        includeAuth: false,
      });

      return response.success && response.data;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  // Оновлення токена
  /**
   * @returns {Promise<{success: boolean, token?: string, refreshToken?: string, error?: string}>}
   */
  async refreshToken() {
    try {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await api.post('/auth/refresh', { // Виправлено з /auth/refresh-token на /auth/refresh
        refreshToken: this.refreshToken, // Це правильне поле для бекенду
      }, {
        includeAuth: false,
      });

      if (response.success && response.data) {
        const { token, refreshToken } = response.data;

        // Оновлення токенів
        await this.saveUserData(this.currentUser, token, refreshToken);

        return { success: true, token, refreshToken };
      } else {
        throw new Error(response.error || 'Failed to refresh token');
      }
    } catch (error) {
      console.error('Refresh token error:', error);
      await this.clearUserData();
      return { success: false, error: error.message };
    }
  }

  // Отримання поточного користувача
  /**
   * @returns {User | null}
   */
  getCurrentUser() {
    return this.currentUser;
  }

  // Отримання статусу авторизації
  /**
   * @returns {boolean}
   */
  getIsAuthenticated() {
    return this.isAuthenticated;
  }

  // Отримання токена
  /**
   * @returns {string | null}
   */
  getToken() {
    return this.token;
  }

  // Отримання refresh токена
  /**
   * @returns {string | null}
   */
  getRefreshToken() {
    return this.refreshToken;
  }

  // Отримання повного імені користувача
  /**
   * @returns {string}
   */
  getUserFullName() {
    if (this.currentUser) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }
    return '';
  }

  // Отримання email користувача
  /**
   * @returns {string | null}
   */
  getUserEmail() {
    return this.currentUser?.email || null;
  }

  // Отримання ID користувача
  /**
   * @returns {number | null}
   */
  getUserId() {
    return this.currentUser?.id || null;
  }
}

// Екземпляр AuthService
const authService = new AuthService();

// Експорт для використання
export default authService;

// Експорт класу для можливого розширення
export { AuthService };

// Експорт допоміжних функцій
export const mockAuthCall = async (delay = 1000, shouldFail = false, userData = null) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Mock auth call failed'));
      } else {
        resolve({
          success: true,
          data: userData || {
            user: {
              id: 1,
              firstName: 'Іван',
              lastName: 'Петренко',
              email: 'ivan@example.com',
            },
            token: 'mock-jwt-token',
            refreshToken: 'mock-refresh-token',
          },
        });
      }
    }, delay);
  });
};

// Експорт для тестування
export const createAuthService = (config = {}) => {
  const service = new AuthService();
  // Налаштування конфігурації, якщо потрібно
  return service;
};