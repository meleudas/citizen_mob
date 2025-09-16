// src/services/storageService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { encode as btoa } from 'base-64';

// Ключі для зберігання даних
const STORAGE_KEYS = {
  // Користувач
  USER_DATA: 'userData',
  USER_TOKEN: 'userToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_PREFERENCES: 'userPreferences',
  
  // Правопорушення
  VIOLATIONS_CACHE: 'violationsCache',
  PENDING_VIOLATIONS: 'pendingViolations',
  VIOLATION_DRAFTS: 'violationDrafts',
  
  // Налаштування
  APP_SETTINGS: 'appSettings',
  THEME_PREFERENCE: 'themePreference',
  LANGUAGE_PREFERENCE: 'languagePreference',
  
  // Геолокація
  LOCATION_HISTORY: 'locationHistory',
  LAST_KNOWN_LOCATION: 'lastKnownLocation',
  
  // Кеш
  CACHE_DATA: 'cacheData',
  IMAGE_CACHE: 'imageCache',
  MAP_TILES_CACHE: 'mapTilesCache',
  
  // Синхронізація
  SYNC_QUEUE: 'syncQueue',
  LAST_SYNC_TIME: 'lastSyncTime',
  SYNC_METADATA: 'syncMetadata',
  
  // Статистика
  USAGE_STATS: 'usageStats',
  APP_SESSIONS: 'appSessions',
  
  // Безпека
  SECURITY_TOKENS: 'securityTokens',
  ENCRYPTION_KEYS: 'encryptionKeys',
};

// Типи даних для зберігання
/**
 * @typedef {Object} StorageItem
 * @property {string} key - Ключ елемента
 * @property {*} value - Значення елемента
 * @property {number} [timestamp] - Час створення
 * @property {number} [expires] - Час закінчення терміну дії (в мілісекундах)
 * @property {string} [dataType] - Тип даних
 */

class StorageService {
  constructor() {
    this.isInitialized = false;
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.maxCacheSize = 1000; // Максимальна кількість елементів в кеші
    this.defaultExpiry = 24 * 60 * 60 * 1000; // 24 години за замовчуванням
  }

  // Ініціалізація сервісу
  async initialize() {
    try {
      // Перевірка доступності AsyncStorage
      await AsyncStorage.getItem('@storage_init_check');
      this.isInitialized = true;
      
      console.log('Storage service initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Storage service initialization error:', error);
      return { success: false, error: error.message };
    }
  }

  // Базове збереження даних
  /**
   * @param {string} key - Ключ для збереження
   * @param {*} value - Значення для збереження
   * @param {Object} options - Опції збереження
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async setItem(key, value, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const {
        expiry = this.defaultExpiry,
        encrypt = false,
        compress = false,
        dataType = typeof value,
      } = options;

      let processedValue = value;

      // Компресія даних
      if (compress && typeof value === 'string' && value.length > 1000) {
        processedValue = await this.compressData(value);
      }

      // Шифрування даних
      if (encrypt) {
        processedValue = await this.encryptData(processedValue);
      }

      // Підготовка даних для збереження
      const storageItem = {
        value: processedValue,
        timestamp: Date.now(),
        expires: expiry ? Date.now() + expiry : null,
        dataType,
      };

      // Збереження в AsyncStorage
      await AsyncStorage.setItem(key, JSON.stringify(storageItem));

      // Додавання в кеш
      this.addToCache(key, storageItem);

      return { success: true };
    } catch (error) {
      console.error(`Error setting item ${key}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Базове отримання даних
  /**
   * @param {string} key - Ключ для отримання
   * @param {Object} options - Опції отримання
   * @returns {Promise<{success: boolean, data?: *, error?: string}>}
   */
  async getItem(key, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const { decrypt = false, decompress = false } = options;

      // Перевірка кешу
      const cachedItem = this.getFromCache(key);
      if (cachedItem && !this.isExpired(cachedItem)) {
        return { success: true, data: cachedItem.value };
      }

      // Отримання з AsyncStorage
      const itemString = await AsyncStorage.getItem(key);
      if (!itemString) {
        return { success: false, error: 'Item not found' };
      }

      const storageItem = JSON.parse(itemString);

      // Перевірка терміну дії
      if (this.isExpired(storageItem)) {
        await this.removeItem(key);
        return { success: false, error: 'Item expired' };
      }

      let processedValue = storageItem.value;

      // Розшифрування даних
      if (decrypt) {
        processedValue = await this.decryptData(processedValue);
      }

      // Декомпресія даних
      if (decompress) {
        processedValue = await this.decompressData(processedValue);
      }

      // Оновлення кешу
      this.addToCache(key, storageItem);

      return { success: true, data: processedValue };
    } catch (error) {
      console.error(`Error getting item ${key}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Видалення даних
  /**
   * @param {string} key - Ключ для видалення
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async removeItem(key) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await AsyncStorage.removeItem(key);
      
      // Видалення з кешу
      this.removeFromCache(key);

      return { success: true };
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Очищення всіх даних
  /**
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async clearAll() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await AsyncStorage.clear();
      
      // Очищення кешу
      this.cache.clear();
      this.cacheExpiry.clear();

      return { success: true };
    } catch (error) {
      console.error('Error clearing storage:', error);
      return { success: false, error: error.message };
    }
  }

  // Отримання всіх ключів
  /**
   * @returns {Promise<{success: boolean, keys?: string[], error?: string}>}
   */
  async getAllKeys() {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const keys = await AsyncStorage.getAllKeys();
      return { success: true, keys };
    } catch (error) {
      console.error('Error getting all keys:', error);
      return { success: false, error: error.message };
    }
  }

  // Масове збереження даних
  /**
   * @param {Array<Array<string, *>>} keyValuePairs - Масив пар [ключ, значення]
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async multiSet(keyValuePairs) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const processedPairs = keyValuePairs.map(([key, value]) => [
        key,
        JSON.stringify({
          value,
          timestamp: Date.now(),
          expires: Date.now() + this.defaultExpiry,
          dataType: typeof value,
        }),
      ]);

      await AsyncStorage.multiSet(processedPairs);
      
      // Додавання в кеш
      processedPairs.forEach(([key, itemString]) => {
        const item = JSON.parse(itemString);
        this.addToCache(key, item);
      });

      return { success: true };
    } catch (error) {
      console.error('Error multi-setting items:', error);
      return { success: false, error: error.message };
    }
  }

  // Масове отримання даних
  /**
   * @param {string[]} keys - Масив ключів
   * @returns {Promise<{success: boolean, data?: Array<*>, error?: string}>}
   */
  async multiGet(keys) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const results = await AsyncStorage.multiGet(keys);
      const processedResults = results.map(([key, valueString]) => {
        if (!valueString) return [key, null];
        
        const item = JSON.parse(valueString);
        
        // Перевірка терміну дії
        if (this.isExpired(item)) {
          this.removeItem(key).catch(console.error);
          return [key, null];
        }
        
        // Додавання в кеш
        this.addToCache(key, item);
        
        return [key, item.value];
      });

      return { success: true, data: processedResults };
    } catch (error) {
      console.error('Error multi-getting items:', error);
      return { success: false, error: error.message };
    }
  }

  // Масове видалення даних
  /**
   * @param {string[]} keys - Масив ключів для видалення
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async multiRemove(keys) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      await AsyncStorage.multiRemove(keys);
      
      // Видалення з кешу
      keys.forEach(key => this.removeFromCache(key));

      return { success: true };
    } catch (error) {
      console.error('Error multi-removing items:', error);
      return { success: false, error: error.message };
    }
  }

  // Збереження користувацьких даних
  /**
   * @param {Object} userData - Дані користувача
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveUserData(userData) {
    return await this.setItem(STORAGE_KEYS.USER_DATA, userData, {
      expiry: 7 * 24 * 60 * 60 * 1000, // 7 днів
    });
  }

  // Отримання користувацьких даних
  /**
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getUserData() {
    return await this.getItem(STORAGE_KEYS.USER_DATA);
  }

  // Збереження токенів авторизації
  /**
   * @param {string} token - Access токен
   * @param {string} refreshToken - Refresh токен
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveAuthTokens(token, refreshToken) {
    const tokens = { token, refreshToken };
    return await this.setItem(STORAGE_KEYS.SECURITY_TOKENS, tokens, {
      encrypt: true,
      expiry: 30 * 24 * 60 * 60 * 1000, // 30 днів
    });
  }

  // Отримання токенів авторизації
  /**
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getAuthTokens() {
    return await this.getItem(STORAGE_KEYS.SECURITY_TOKENS, {
      decrypt: true,
    });
  }

  // Збереження правопорушень в кеш
  /**
   * @param {Array} violations - Масив правопорушень
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async cacheViolations(violations) {
    return await this.setItem(STORAGE_KEYS.VIOLATIONS_CACHE, violations, {
      expiry: 1 * 60 * 60 * 1000, // 1 година
    });
  }

  // Отримання кешованих правопорушень
  /**
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getCachedViolations() {
    return await this.getItem(STORAGE_KEYS.VIOLATIONS_CACHE);
  }

  // Збереження черги синхронізації
  /**
   * @param {Array} queue - Черга синхронізації
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveSyncQueue(queue) {
    return await this.setItem(STORAGE_KEYS.SYNC_QUEUE, queue);
  }

  // Отримання черги синхронізації
  /**
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getSyncQueue() {
    return await this.getItem(STORAGE_KEYS.SYNC_QUEUE);
  }

  // Збереження налаштувань додатку
  /**
   * @param {Object} settings - Налаштування додатку
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveAppSettings(settings) {
    return await this.setItem(STORAGE_KEYS.APP_SETTINGS, settings);
  }

  // Отримання налаштувань додатку
  /**
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getAppSettings() {
    return await this.getItem(STORAGE_KEYS.APP_SETTINGS);
  }

  // Збереження історії геолокації
  /**
   * @param {Array} locations - Масив локацій
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveLocationHistory(locations) {
    return await this.setItem(STORAGE_KEYS.LOCATION_HISTORY, locations, {
      expiry: 7 * 24 * 60 * 60 * 1000, // 7 днів
    });
  }

  // Отримання історії геолокації
  /**
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async getLocationHistory() {
    return await this.getItem(STORAGE_KEYS.LOCATION_HISTORY);
  }

  // Збереження останньої відомої локації
  /**
   * @param {Object} location - Дані локації
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveLastKnownLocation(location) {
    return await this.setItem(STORAGE_KEYS.LAST_KNOWN_LOCATION, location, {
      expiry: 1 * 60 * 60 * 1000, // 1 година
    });
  }

  // Отримання останньої відомої локації
  /**
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getLastKnownLocation() {
    return await this.getItem(STORAGE_KEYS.LAST_KNOWN_LOCATION);
  }

  // Збереження чернеток правопорушень
  /**
   * @param {Object} drafts - Чернетки правопорушень
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveViolationDrafts(drafts) {
    return await this.setItem(STORAGE_KEYS.VIOLATION_DRAFTS, drafts);
  }

  // Отримання чернеток правопорушень
  /**
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getViolationDrafts() {
    return await this.getItem(STORAGE_KEYS.VIOLATION_DRAFTS);
  }

  // Збереження статистики використання
  /**
   * @param {Object} stats - Статистика використання
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async saveUsageStats(stats) {
    const existingStats = await this.getUsageStats();
    const mergedStats = existingStats.success 
      ? { ...existingStats.data, ...stats }
      : stats;
      
    return await this.setItem(STORAGE_KEYS.USAGE_STATS, mergedStats);
  }

  // Отримання статистики використання
  /**
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async getUsageStats() {
    return await this.getItem(STORAGE_KEYS.USAGE_STATS);
  }

  // Додавання в кеш
  /**
   * @private
   * @param {string} key - Ключ
   * @param {StorageItem} item - Елемент для кешування
   */
  addToCache(key, item) {
    // Обмеження розміру кешу
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.cacheExpiry.delete(firstKey);
    }

    this.cache.set(key, item);
    if (item.expires) {
      this.cacheExpiry.set(key, item.expires);
    }
  }

  // Отримання з кешу
  /**
   * @private
   * @param {string} key - Ключ
   * @returns {StorageItem | null}
   */
  getFromCache(key) {
    return this.cache.get(key) || null;
  }

  // Видалення з кешу
  /**
   * @private
   * @param {string} key - Ключ
   */
  removeFromCache(key) {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }

  // Перевірка терміну дії
  /**
   * @private
   * @param {StorageItem} item - Елемент для перевірки
   * @returns {boolean}
   */
  isExpired(item) {
    if (!item.expires) return false;
    return Date.now() > item.expires;
  }

  // Компресія даних
  /**
   * @private
   * @param {string} data - Дані для компресії
   * @returns {Promise<string>}
   */
  async compressData(data) {
    try {
      // Проста компресія через base64 для демонстрації
      // В реальному додатку можна використовувати zlib або інші бібліотеки
      return btoa(unescape(encodeURIComponent(data)));
    } catch (error) {
      console.warn('Compression failed, returning original data:', error);
      return data;
    }
  }

  // Декомпресія даних
  /**
   * @private
   * @param {string} data - Дані для декомпресії
   * @returns {Promise<string>}
   */
  async decompressData(data) {
    try {
      // Проста декомпресія через base64 для демонстрації
      return decodeURIComponent(escape(atob(data)));
    } catch (error) {
      console.warn('Decompression failed, returning original data:', error);
      return data;
    }
  }

  // Шифрування даних
  /**
   * @private
   * @param {*} data - Дані для шифрування
   * @returns {Promise<string>}
   */
  async encryptData(data) {
    try {
      // Просте шифрування для демонстрації
      // В реальному додатку використовуйте нормальні криптографічні бібліотеки
      const jsonString = typeof data === 'string' ? data : JSON.stringify(data);
      return btoa(jsonString);
    } catch (error) {
      console.warn('Encryption failed, returning original data:', error);
      return data;
    }
  }

  // Розшифрування даних
  /**
   * @private
   * @param {string} data - Дані для розшифрування
   * @returns {Promise<*>}
   */
  async decryptData(data) {
    try {
      // Просте розшифрування для демонстрації
      const decryptedString = atob(data);
      try {
        return JSON.parse(decryptedString);
      } catch {
        return decryptedString;
      }
    } catch (error) {
      console.warn('Decryption failed, returning encrypted data:', error);
      return data;
    }
  }

  // Отримання інформації про сховище
  /**
   * @returns {Promise<{success: boolean, info?: Object, error?: string}>}
   */
  async getStorageInfo() {
    try {
      const keys = await this.getAllKeys();
      const cacheSize = this.cache.size;
      
      return {
        success: true,
        info: {
          totalKeys: keys.success ? keys.keys.length : 0,
          cacheSize,
          isInitialized: this.isInitialized,
          platform: Platform.OS,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      console.error('Error getting storage info:', error);
      return { success: false, error: error.message };
    }
  }

  // Очищення застарілих даних
  /**
   * @returns {Promise<{success: boolean, cleanedItems?: number, error?: string}>}
   */
  async cleanupExpiredData() {
    try {
      const keys = await this.getAllKeys();
      if (!keys.success) {
        throw new Error(keys.error);
      }

      let cleanedItems = 0;
      
      for (const key of keys.keys) {
        try {
          const itemString = await AsyncStorage.getItem(key);
          if (itemString) {
            const item = JSON.parse(itemString);
            if (this.isExpired(item)) {
              await this.removeItem(key);
              cleanedItems++;
            }
          }
        } catch (error) {
          console.warn(`Error cleaning up item ${key}:`, error);
        }
      }

      return { success: true, cleanedItems };
    } catch (error) {
      console.error('Error cleaning up expired data:', error);
      return { success: false, error: error.message };
    }
  }

  // Експорт даних
  /**
   * @returns {Promise<{success: boolean, data?: string, error?: string}>}
   */
  async exportData() {
    try {
      const keys = await this.getAllKeys();
      if (!keys.success) {
        throw new Error(keys.error);
      }

      const exportData = {};
      
      for (const key of keys.keys) {
        try {
          const item = await AsyncStorage.getItem(key);
          if (item) {
            exportData[key] = JSON.parse(item);
          }
        } catch (error) {
          console.warn(`Error exporting item ${key}:`, error);
        }
      }

      return {
        success: true,
        data: JSON.stringify(exportData, null, 2),
      };
    } catch (error) {
      console.error('Error exporting data:', error);
      return { success: false, error: error.message };
    }
  }

  // Імпорт даних
  /**
   * @param {string} data - Дані для імпорту
   * @returns {Promise<{success: boolean, importedItems?: number, error?: string}>}
   */
  async importData(data) {
    try {
      const importData = JSON.parse(data);
      const keyValuePairs = Object.entries(importData).map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]);

      await AsyncStorage.multiSet(keyValuePairs);
      
      // Оновлення кешу
      Object.entries(importData).forEach(([key, item]) => {
        this.addToCache(key, item);
      });

      return {
        success: true,
        importedItems: keyValuePairs.length,
      };
    } catch (error) {
      console.error('Error importing data:', error);
      return { success: false, error: error.message };
    }
  }

  // Встановлення максимальної кількості елементів в кеші
  /**
   * @param {number} maxSize - Максимальний розмір кешу
   */
  setMaxCacheSize(maxSize) {
    this.maxCacheSize = maxSize;
  }

  // Встановлення стандартного терміну дії
  /**
   * @param {number} expiry - Термін дії в мілісекундах
   */
  setDefaultExpiry(expiry) {
    this.defaultExpiry = expiry;
  }

  // Отримання списку ключів з префіксом
  /**
   * @param {string} prefix - Префікс для пошуку
   * @returns {Promise<{success: boolean, keys?: string[], error?: string}>}
   */
  async getKeysWithPrefix(prefix) {
    try {
      const allKeys = await this.getAllKeys();
      if (!allKeys.success) {
        throw new Error(allKeys.error);
      }

      const filteredKeys = allKeys.keys.filter(key => key.startsWith(prefix));
      
      return { success: true, keys: filteredKeys };
    } catch (error) {
      console.error('Error getting keys with prefix:', error);
      return { success: false, error: error.message };
    }
  }

  // Видалення ключів з префіксом
  /**
   * @param {string} prefix - Префікс для видалення
   * @returns {Promise<{success: boolean, deletedItems?: number, error?: string}>}
   */
  async removeKeysWithPrefix(prefix) {
    try {
      const keysResult = await this.getKeysWithPrefix(prefix);
      if (!keysResult.success) {
        throw new Error(keysResult.error);
      }

      if (keysResult.keys.length > 0) {
        await this.multiRemove(keysResult.keys);
        
        // Видалення з кешу
        keysResult.keys.forEach(key => this.removeFromCache(key));
      }

      return {
        success: true,
        deletedItems: keysResult.keys.length,
      };
    } catch (error) {
      console.error('Error removing keys with prefix:', error);
      return { success: false, error: error.message };
    }
  }
}

// Екземпляр StorageService
const storageService = new StorageService();

// Ініціалізація сервісу при імпорті
storageService.initialize().catch(console.error);

// Експорт для використання
export default storageService;

// Експорт класу для можливого розширення
export { StorageService };

// Експорт ключів для зручності
export { STORAGE_KEYS };

// Експорт допоміжних функцій
export const mockStorageOperation = async (delay = 1000, shouldFail = false, resultData = null) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Mock storage operation failed'));
      } else {
        resolve({
          success: true,
          data: resultData || { message: 'Mock storage operation successful' },
        });
      }
    }, delay);
  });
};

// Експорт для тестування
export const createStorageService = (config = {}) => {
  const service = new StorageService();
  
  if (config.maxCacheSize) {
    service.setMaxCacheSize(config.maxCacheSize);
  }
  
  if (config.defaultExpiry) {
    service.setDefaultExpiry(config.defaultExpiry);
  }
  
  return service;
};

// Експорт типів для TypeScript/JSDoc
/**
 * @typedef {Object} StorageConfig
 * @property {number} [maxCacheSize=1000] - Максимальна кількість елементів в кеші
 * @property {number} [defaultExpiry=86400000] - Стандартний термін дії в мілісекундах (24 години)
 */

/**
 * @typedef {Object} StorageOptions
 * @property {number} [expiry] - Термін дії в мілісекундах
 * @property {boolean} [encrypt=false] - Чи шифрувати дані
 * @property {boolean} [compress=false] - Чи компресувати дані
 * @property {string} [dataType] - Тип даних
 */