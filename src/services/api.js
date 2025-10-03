// src/services/api.js
import AsyncStorage from '@react-native-async-storage/async-storage';

// Базова URL для API
const BASE_URL = __DEV__ 
  ? 'http://192.168.3.22:3000/api' 
  : 'https://server.citizen-mob.com/api';


const TIMEOUT = 10000; 


const TOKEN_KEY = 'userToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Інтерфейс для API відповідей
/**
 * @template T
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Статус успіху
 * @property {T} [data] - Дані відповіді
 * @property {string} [error] - Повідомлення про помилку
 * @property {number} [statusCode] - HTTP статус код
 */

class ApiClient {
  constructor() {
    this.baseUrl = BASE_URL;
    this.token = null;
    this.refreshToken = null;
  }

  async getTokens() {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      
      this.token = token;
      this.refreshToken = refreshToken;
      
      return { token, refreshToken };
    } catch (error) {
      console.error('Error getting tokens:', error);
      return { token: null, refreshToken: null };
    }
  }

  async setTokens(token, refreshToken) {
    try {
      if (token) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        this.token = token;
      }
      
      if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        this.refreshToken = refreshToken;
      }
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  async clearTokens() {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      
      this.token = null;
      this.refreshToken = null;
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  getHeaders(includeAuth = true, contentType = 'application/json') {
    const headers = {};

    if (contentType) {
      headers['Content-Type'] = contentType;
    }

    if (includeAuth && this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  getTimeoutPromise() {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Час запиту вичерпано')), TIMEOUT);
    });
  }

  async request(endpoint, options = {}) {
    const {
      method = 'GET',
      data = null,
      headers = {},
      includeAuth = true,
      contentType = 'application/json',
      timeout = TIMEOUT,
    } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const requestHeaders = { ...this.getHeaders(includeAuth, contentType), ...headers };

    const requestOptions = {
      method,
      headers: requestHeaders,
    };

    if (data && method !== 'GET') {
      if (contentType === 'application/json') {
        requestOptions.body = JSON.stringify(data);
      } else {
        requestOptions.body = data;
      }
    }

    try {
      const response = await Promise.race([
        fetch(url, requestOptions),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Час запиту вичерпано')), timeout);
        })
      ]);

      const responseData = await response.json();

      if (!response.ok) {
        const error = new Error(responseData.message || 'Помилка API запиту');
        error.statusCode = response.status;
        error.responseData = responseData;
        throw error;
      }

      return {
        success: true,
        data: responseData,
        statusCode: response.status,
      };
    } catch (error) {
      console.error('API request error:', error);

      if (error.statusCode === 401 && this.refreshToken) {
        try {
          await this.refreshAccessToken();
          return await this.request(endpoint, options);
        } catch (refreshError) {
          console.error('Token refresh error:', refreshError);
          await this.clearTokens();
          // Перенаправлення на екран входу
          // Це має бути оброблено на рівні додатку
        }
      }

      return {
        success: false,
        error: error.message,
        statusCode: error.statusCode || 500,
      };
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('Немає refresh токена для оновлення');
    }

    const response = await this.request('/auth/refresh', {
      method: 'POST',
      data: { refreshToken: this.refreshToken },
      includeAuth: false,
    });

    if (response.success && response.data) {
      const { token, refreshToken } = response.data;
      await this.setTokens(token, refreshToken);
      return response.data;
    } else {
      throw new Error(response.error || 'Помилка оновлення токена');
    }
  }

  // GET запит
  async get(endpoint, options = {}) {
    return await this.request(endpoint, { ...options, method: 'GET' });
  }

  // POST запит
  async post(endpoint, data, options = {}) {
    return await this.request(endpoint, { ...options, method: 'POST', data });
  }

  // PUT запит
  async put(endpoint, data, options = {}) {
    return await this.request(endpoint, { ...options, method: 'PUT', data });
  }

  // PATCH запит
  async patch(endpoint, data, options = {}) {
    return await this.request(endpoint, { ...options, method: 'PATCH', data });
  }

  // DELETE запит
  async delete(endpoint, options = {}) {
    return await this.request(endpoint, { ...options, method: 'DELETE' });
  }


  async uploadFile(endpoint, file, fieldName = 'file', additionalData = {}) {
    try {
      const formData = new FormData();
      formData.append(fieldName, file);

      Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
      });

      return await this.request(endpoint, {
        method: 'POST',
        data: formData,
        contentType: 'multipart/form-data',
        headers: {
          'Accept': 'application/json',
        },
      });
    } catch (error) {
      console.error('File upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async checkConnection() {
    try {
      const response = await Promise.race([
        fetch(`${this.baseUrl}/health`, { method: 'GET' }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Connection timeout')), 3000);
        })
      ]);

      return response.ok;
    } catch (error) {
      console.error('Connection check error:', error);
      return false;
    }
  }

  getApiInfo() {
    return {
      baseUrl: this.baseUrl,
      version: '1.0.0',
      timeout: TIMEOUT,
      isAuthenticated: !!this.token,
    };
  }
}

// Екземпляр API клієнта
const apiClient = new ApiClient();

// Експорт API клієнта
export default apiClient;

// Експорт типів для TypeScript/JSDoc
/**
 * @typedef {Object} ApiConfig
 * @property {string} baseUrl - Базова URL для API
 * @property {number} timeout - Таймаут запиту в мілісекундах
 * @property {string} [token] - Токен авторизації
 */

/**
 * @template T
 * @typedef {Object} RequestOptions
 * @property {string} [method='GET'] - HTTP метод
 * @property {T} [data] - Дані для відправки
 * @property {Object} [headers] - Додаткові заголовки
 * @property {boolean} [includeAuth=true] - Включати токен авторизації
 * @property {string} [contentType='application/json'] - Content-Type заголовок
 * @property {number} [timeout=10000] - Таймаут запиту
 */

// Експорт допоміжних функцій
export const setAuthToken = (token) => {
  apiClient.token = token;
};

export const clearAuthToken = () => {
  apiClient.token = null;
};

export const getAuthToken = () => {
  return apiClient.token;
};

// Експорт для використання в middleware
export const createApiClient = (config = {}) => {
  const client = new ApiClient();
  if (config.baseUrl) client.baseUrl = config.baseUrl;
  if (config.timeout) client.timeout = config.timeout;
  return client;
};

// Експорт для тестування
export const mockApiCall = async (delay = 1000, shouldFail = false) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Mock API call failed'));
      } else {
        resolve({ success: true, data: { message: 'Mock API call successful' } });
      }
    }, delay);
  });
};

// Експорт для використання в інших сервісах
export { ApiClient };