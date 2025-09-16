// src/services/cloudinaryService.js
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Налаштування Cloudinary
const CLOUDINARY_CONFIG = {
  cloudName: 'daaxbffvb',
  apiKey: '647888569862437',
  apiSecret: 'aXJICixlaqZ7IMt8fmL3AOonqzE',
  uploadPreset: 'violation-uploads',
  baseUrl: 'cloudinary://647888569862437:aXJICixlaqZ7IMt8fmL3AOonqzE@daaxbffvb',
};

// Типи трансформацій
const TRANSFORMATIONS = {
  thumbnail: {
    width: 150,
    height: 150,
    crop: 'fill',
    gravity: 'face',
    quality: 'auto',
    fetch_format: 'auto',
  },
  preview: {
    width: 400,
    height: 300,
    crop: 'fill',
    quality: 'auto:good',
    fetch_format: 'auto',
  },
  full: {
    width: 1200,
    height: 900,
    crop: 'limit',
    quality: 'auto:best',
    fetch_format: 'auto',
  },
  optimized: {
    width: 800,
    height: 600,
    crop: 'fill',
    quality: 'auto:eco',
    fetch_format: 'auto',
  },
};

// Інтерфейси для типів даних
/**
 * @typedef {Object} CloudinaryUploadOptions
 * @property {string} [folder] - Папка для збереження
 * @property {string} [publicId] - Публічний ID файлу
 * @property {boolean} [useFilename] - Використовувати оригінальне ім'я файлу
 * @property {string} [uniqueFilename] - Унікальне ім'я файлу
 * @property {Object} [transformation] - Трансформація зображення
 * @property {string} [resourceType] - Тип ресурсу (image, raw, auto)
 * @property {string} [type] - Тип завантаження (upload, private, authenticated)
 * @property {Object} [context] - Контекст метаданих
 * @property {string} [tags] - Теги для файлу
 * @property {boolean} [overwrite] - Перезаписувати існуючі файли
 * @property {string} [invalidate] - Інвалідувати CDN кеш
 */

/**
 * @typedef {Object} CloudinaryUploadResponse
 * @property {boolean} success - Статус успіху
 * @property {string} [url] - URL зображення
 * @property {string} [secureUrl] - Безпечний URL зображення
 * @property {string} [publicId] - Публічний ID
 * @property {string} [version] - Версія зображення
 * @property {string} [signature] - Підпис
 * @property {number} [width] - Ширина
 * @property {number} [height] - Висота
 * @property {string} [format] - Формат зображення
 * @property {number} [bytes] - Розмір в байтах
 * @property {string} [error] - Повідомлення про помилку
 */

/**
 * @typedef {Object} CloudinaryTransformOptions
 * @property {number} [width] - Ширина
 * @property {number} [height] - Висота
 * @property {string} [crop] - Тип обрізки (fill, fit, limit, thumb)
 * @property {string} [gravity] - Гравітація (face, center, north, south)
 * @property {number} [quality] - Якість (1-100 або auto)
 * @property {string} [fetchFormat] - Формат (auto, jpg, png, webp)
 * @property {boolean} [progressive] - Прогресивне завантаження
 * @property {string} [effect] - Ефекти (sepia, blur, grayscale)
 */

class CloudinaryService {
  constructor() {
    this.config = CLOUDINARY_CONFIG;
    this.transformations = TRANSFORMATIONS;
    this.uploadQueue = [];
    this.isUploading = false;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 секунда
  }

  // Отримання URL для завантаження
  /**
   * @private
   * @returns {string}
   */
  getUploadUrl() {
    return `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/upload`;
  }

  // Отримання публічного URL зображення
  /**
   * @param {string} publicId - Публічний ID зображення
   * @param {CloudinaryTransformOptions} [transformations] - Трансформації
   * @returns {string}
   */
  getImageUrl(publicId, transformations = {}) {
    if (!publicId) {
      throw new Error('Public ID is required');
    }

    const baseImageUrl = `https://res.cloudinary.com/${this.config.cloudName}/image/upload`;

    // Побудова строки трансформацій
    const transformParams = this.buildTransformationParams(transformations);
    const transformString = transformParams ? `${transformParams}/` : '';

    return `${baseImageUrl}/${transformString}${publicId}`;
  }

  // Побудова строки трансформацій
  /**
   * @private
   * @param {CloudinaryTransformOptions} transformations - Трансформації
   * @returns {string}
   */
  buildTransformationParams(transformations) {
    const params = [];

    if (transformations.width) {
      params.push(`w_${transformations.width}`);
    }

    if (transformations.height) {
      params.push(`h_${transformations.height}`);
    }

    if (transformations.crop) {
      params.push(`c_${transformations.crop}`);
    }

    if (transformations.gravity) {
      params.push(`g_${transformations.gravity}`);
    }

    if (transformations.quality) {
      params.push(`q_${transformations.quality}`);
    }

    if (transformations.fetchFormat) {
      params.push(`f_${transformations.fetchFormat}`);
    }

    if (transformations.progressive) {
      params.push('fl_progressive');
    }

    if (transformations.effect) {
      params.push(`e_${transformations.effect}`);
    }

    return params.join(',');
  }

  // Завантаження фото
  /**
   * @param {Object} fileData - Дані файлу
   * @param {string} fileData.uri - URI файлу
   * @param {string} fileData.type - Тип файлу
   * @param {string} fileData.name - Ім'я файлу
   * @param {CloudinaryUploadOptions} [options] - Опції завантаження
   * @returns {Promise<CloudinaryUploadResponse>}
   */
  async uploadPhoto(fileData, options = {}) {
    try {
      // Валідація вхідних даних
      if (!fileData || !fileData.uri) {
        throw new Error('File data with URI is required');
      }

      // Підготовка FormData
      const formData = new FormData();
      
      // Додавання файлу
      formData.append('file', {
        uri: fileData.uri,
        type: fileData.type || 'image/jpeg',
        name: fileData.name || `violation_${Date.now()}.${this.getFileExtension(fileData.uri)}`,
      });

      // Додавання параметрів завантаження
      formData.append('upload_preset', this.config.uploadPreset);
      
      if (options.folder) {
        formData.append('folder', options.folder);
      }
      
      if (options.publicId) {
        formData.append('public_id', options.publicId);
      }
      
      if (options.tags) {
        formData.append('tags', options.tags);
      }
      
      if (options.context) {
        formData.append('context', JSON.stringify(options.context));
      }

      // Додавання інформації про пристрій
      const deviceInfo = this.getDeviceInfo();
      formData.append('context', JSON.stringify({
        device: deviceInfo.model,
        platform: deviceInfo.platform,
        app_version: deviceInfo.version,
      }));

      // Виконання завантаження
      const response = await this.makeUploadRequest(formData, options);

      if (response.success) {
        // Збереження інформації про завантаження
        await this.saveUploadHistory({
          publicId: response.publicId,
          url: response.secureUrl,
          timestamp: Date.now(),
          fileSize: response.bytes,
          dimensions: {
            width: response.width,
            height: response.height,
          },
        });

        return response;
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      return { success: false, error: error.message };
    }
  }

  // Завантаження base64 фото
  /**
   * @param {string} base64Data - Base64 строка фото
   * @param {CloudinaryUploadOptions} [options] - Опції завантаження
   * @returns {Promise<CloudinaryUploadResponse>}
   */
  async uploadBase64Photo(base64Data, options = {}) {
    try {
      // Валідація вхідних даних
      if (!base64Data) {
        throw new Error('Base64 data is required');
      }

      // Підготовка FormData
      const formData = new FormData();
      
      // Додавання base64 даних
      formData.append('file', base64Data);

      // Додавання параметрів завантаження
      formData.append('upload_preset', this.config.uploadPreset);
      
      if (options.folder) {
        formData.append('folder', options.folder);
      }
      
      if (options.publicId) {
        formData.append('public_id', options.publicId);
      }
      
      if (options.tags) {
        formData.append('tags', options.tags);
      }
      
      if (options.context) {
        formData.append('context', JSON.stringify(options.context));
      }

      // Додавання інформації про пристрій
      const deviceInfo = this.getDeviceInfo();
      formData.append('context', JSON.stringify({
        device: deviceInfo.model,
        platform: deviceInfo.platform,
        app_version: deviceInfo.version,
      }));

      // Виконання завантаження
      const response = await this.makeUploadRequest(formData, options);

      if (response.success) {
        // Збереження інформації про завантаження
        await this.saveUploadHistory({
          publicId: response.publicId,
          url: response.secureUrl,
          timestamp: Date.now(),
          fileSize: response.bytes,
          dimensions: {
            width: response.width,
            height: response.height,
          },
        });

        return response;
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Cloudinary base64 upload error:', error);
      return { success: false, error: error.message };
    }
  }

  // Виконання HTTP запиту на завантаження
  /**
   * @private
   * @param {FormData} formData - Дані для завантаження
   * @param {CloudinaryUploadOptions} options - Опції завантаження
   * @param {number} [retryCount=0] - Кількість спроб
   * @returns {Promise<CloudinaryUploadResponse>}
   */
  async makeUploadRequest(formData, options, retryCount = 0) {
    try {
      const response = await fetch(this.getUploadUrl(), {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseData = await response.json();

      if (response.ok && responseData.secure_url) {
        return {
          success: true,
          url: responseData.url,
          secureUrl: responseData.secure_url,
          publicId: responseData.public_id,
          version: responseData.version,
          signature: responseData.signature,
          width: responseData.width,
          height: responseData.height,
          format: responseData.format,
          bytes: responseData.bytes,
          resourceType: responseData.resource_type,
        };
      } else {
        throw new Error(responseData.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error(`Upload attempt ${retryCount + 1} failed:`, error);

      // Повторна спроба при помилках мережі
      if (retryCount < this.maxRetries && this.shouldRetry(error)) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount)); // Експоненційна затримка
        return await this.makeUploadRequest(formData, options, retryCount + 1);
      }

      throw error;
    }
  }

  // Перевірка, чи потрібно повторити спробу
  /**
   * @private
   * @param {Error} error - Помилка
   * @returns {boolean}
   */
  shouldRetry(error) {
    const retryableErrors = [
      'Network request failed',
      'timeout',
      'ECONNABORTED',
      'ECONNRESET',
    ];

    return retryableErrors.some(retryableError => 
      error.message.includes(retryableError)
    );
  }

  // Отримання URL з трансформаціями
  /**
   * @param {string} publicId - Публічний ID зображення
   * @param {string} transformationType - Тип трансформації (thumbnail, preview, full, optimized)
   * @returns {string}
   */
  getTransformedImageUrl(publicId, transformationType = 'optimized') {
    const transformations = this.transformations[transformationType] || this.transformations.optimized;
    return this.getImageUrl(publicId, transformations);
  }

  // Створення thumbnail
  /**
   * @param {string} publicId - Публічний ID зображення
   * @returns {string}
   */
  getThumbnailUrl(publicId) {
    return this.getTransformedImageUrl(publicId, 'thumbnail');
  }

  // Створення preview зображення
  /**
   * @param {string} publicId - Публічний ID зображення
   * @returns {string}
   */
  getPreviewUrl(publicId) {
    return this.getTransformedImageUrl(publicId, 'preview');
  }

  // Створення повного розміру зображення
  /**
   * @param {string} publicId - Публічний ID зображення
   * @returns {string}
   */
  getFullSizeUrl(publicId) {
    return this.getTransformedImageUrl(publicId, 'full');
  }

  // Створення оптимізованого зображення
  /**
   * @param {string} publicId - Публічний ID зображення
   * @returns {string}
   */
  getOptimizedUrl(publicId) {
    return this.getTransformedImageUrl(publicId, 'optimized');
  }

  // Видалення фото
  /**
   * @param {string} publicId - Публічний ID зображення
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async deletePhoto(publicId) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      // Видалення з Cloudinary API
      const deleteUrl = `https://api.cloudinary.com/v1_1/${this.config.cloudName}/image/destroy`;
      
      const formData = new FormData();
      formData.append('public_id', publicId);
      formData.append('api_key', this.config.apiKey);

      const response = await fetch(deleteUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseData = await response.json();

      if (response.ok && responseData.result === 'ok') {
        // Видалення з історії завантажень
        await this.removeUploadFromHistory(publicId);
        
        return { success: true };
      } else {
        throw new Error(responseData.error?.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      return { success: false, error: error.message };
    }
  }

  // Оптимізація фото (створення різних версій)
  /**
   * @param {string} publicId - Публічний ID зображення
   * @returns {Promise<{success: boolean, urls?: Object, error?: string}>}
   */
  async optimizePhoto(publicId) {
    try {
      if (!publicId) {
        throw new Error('Public ID is required');
      }

      // Створення різних версій зображення
      const optimizedUrls = {
        thumbnail: this.getThumbnailUrl(publicId),
        preview: this.getPreviewUrl(publicId),
        full: this.getFullSizeUrl(publicId),
        optimized: this.getOptimizedUrl(publicId),
      };

      return {
        success: true,
        urls: optimizedUrls,
      };
    } catch (error) {
      console.error('Photo optimization error:', error);
      return { success: false, error: error.message };
    }
  }

  // Отримання інформації про пристрій
  /**
   * @private
   * @returns {Object}
   */
  getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      model: Platform.constants?.Model || 'Unknown',
      manufacturer: Platform.constants?.Manufacturer || 'Unknown',
    };
  }

  // Отримання розширення файлу
  /**
   * @private
   * @param {string} uri - URI файлу
   * @returns {string}
   */
  getFileExtension(uri) {
    const match = uri.match(/\.([^.]+)$/);
    return match ? match[1] : 'jpg';
  }

  // Затримка
  /**
   * @private
   * @param {number} ms - Мілісекунди
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Збереження історії завантажень
  /**
   * @private
   * @param {Object} uploadInfo - Інформація про завантаження
   * @returns {Promise<void>}
   */
  async saveUploadHistory(uploadInfo) {
    try {
      const historyKey = 'cloudinary_upload_history';
      const history = await AsyncStorage.getItem(historyKey);
      const parsedHistory = history ? JSON.parse(history) : [];
      
      parsedHistory.push(uploadInfo);
      
      // Зберігаємо тільки останні 100 завантажень
      if (parsedHistory.length > 100) {
        parsedHistory.shift();
      }
      
      await AsyncStorage.setItem(historyKey, JSON.stringify(parsedHistory));
    } catch (error) {
      console.warn('Failed to save upload history:', error);
    }
  }

  // Видалення з історії завантажень
  /**
   * @private
   * @param {string} publicId - Публічний ID
   * @returns {Promise<void>}
   */
  async removeUploadFromHistory(publicId) {
    try {
      const historyKey = 'cloudinary_upload_history';
      const history = await AsyncStorage.getItem(historyKey);
      if (history) {
        const parsedHistory = JSON.parse(history);
        const filteredHistory = parsedHistory.filter(
          item => item.publicId !== publicId
        );
        await AsyncStorage.setItem(historyKey, JSON.stringify(filteredHistory));
      }
    } catch (error) {
      console.warn('Failed to remove upload from history:', error);
    }
  }

  // Отримання історії завантажень
  /**
   * @returns {Promise<Array>}
   */
  async getUploadHistory() {
    try {
      const historyKey = 'cloudinary_upload_history';
      const history = await AsyncStorage.getItem(historyKey);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.warn('Failed to get upload history:', error);
      return [];
    }
  }

  // Очищення історії завантажень
  /**
   * @returns {Promise<void>}
   */
  async clearUploadHistory() {
    try {
      const historyKey = 'cloudinary_upload_history';
      await AsyncStorage.removeItem(historyKey);
    } catch (error) {
      console.warn('Failed to clear upload history:', error);
    }
  }

  // Отримання статистики використання
  /**
   * @returns {Promise<{success: boolean, stats?: Object, error?: string}>}
   */
  async getUsageStats() {
    try {
      const history = await this.getUploadHistory();
      
      const stats = {
        totalUploads: history.length,
        totalBytes: history.reduce((sum, item) => sum + (item.bytes || 0), 0),
        averageFileSize: history.length > 0 
          ? Math.round(history.reduce((sum, item) => sum + (item.bytes || 0), 0) / history.length)
          : 0,
        mostCommonFormat: this.getMostCommonFormat(history),
        uploadHistory: history.slice(-10), // Останні 10 завантажень
      };

      return { success: true, stats };
    } catch (error) {
      console.error('Usage stats error:', error);
      return { success: false, error: error.message };
    }
  }

  // Отримання найпоширенішого формату
  /**
   * @private
   * @param {Array} history - Історія завантажень
   * @returns {string}
   */
  getMostCommonFormat(history) {
    if (history.length === 0) return 'unknown';
    
    const formatCounts = {};
    history.forEach(item => {
      const format = item.format || 'unknown';
      formatCounts[format] = (formatCounts[format] || 0) + 1;
    });

    return Object.keys(formatCounts).reduce((a, b) => 
      formatCounts[a] > formatCounts[b] ? a : b
    );
  }

  /**
   * Отримання всіх URL з різними трансформаціями
   * @param {string} publicId - Публічний ID зображення
   * @returns {Object}
   */
  getPhotoUrls(publicId) {
    return {
      thumbnail: this.getThumbnailUrl(publicId),
      preview: this.getPreviewUrl(publicId),
      full: this.getFullSizeUrl(publicId),
      optimized: this.getOptimizedUrl(publicId),
    };
  }

  // Отримання інформації про конфігурацію
  /**
   * @returns {Object}
   */
  getConfigInfo() {
    return {
      cloudName: this.config.cloudName,
      baseUrl: this.config.baseUrl,
      transformations: Object.keys(this.transformations),
      maxRetries: this.maxRetries,
      retryDelay: this.retryDelay,
    };
  }

  // Оновлення конфігурації
  /**
   * @param {Object} newConfig - Нова конфігурація
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  // Оновлення трансформацій
  /**
   * @param {Object} newTransformations - Нові трансформації
   */
  updateTransformations(newTransformations) {
    this.transformations = { ...this.transformations, ...newTransformations };
  }

  // Встановлення максимальної кількості спроб
  /**
   * @param {number} maxRetries - Максимальна кількість спроб
   */
  setMaxRetries(maxRetries) {
    this.maxRetries = maxRetries;
  }

  // Встановлення затримки між спробами
  /**
   * @param {number} retryDelay - Затримка в мілісекундах
   */
  setRetryDelay(retryDelay) {
    this.retryDelay = retryDelay;
  }

  // Тестове завантаження
  /**
   * @param {Object} fileData - Дані файлу для тесту
   * @returns {Promise<CloudinaryUploadResponse>}
   */
  async testUpload(fileData) {
    try {
      console.log('Testing Cloudinary upload...');
      
      // Симуляція завантаження
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Повернення тестових даних
      const testPublicId = `test_${Date.now()}`;
      
      return {
        success: true,
        url: `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${testPublicId}`,
        secureUrl: `https://res.cloudinary.com/${this.config.cloudName}/image/upload/${testPublicId}`,
        publicId: testPublicId,
        version: '1234567890',
        width: 800,
        height: 600,
        format: 'jpg',
        bytes: 123456,
        resourceType: 'image',
      };
    } catch (error) {
      console.error('Test upload error:', error);
      return { success: false, error: error.message };
    }
  }

  // Тестове видалення
  /**
   * @param {string} publicId - Публічний ID для тесту
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async testDelete(publicId) {
    try {
      console.log('Testing Cloudinary delete...', publicId);
      
      // Симуляція видалення
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return { success: true };
    } catch (error) {
      console.error('Test delete error:', error);
      return { success: false, error: error.message };
    }
  }
}

// Екземпляр CloudinaryService
const cloudinaryService = new CloudinaryService();

// Експорт для використання
export default cloudinaryService;

// Експорт класу для можливого розширення
export { CloudinaryService };

// Експорт типів для TypeScript/JSDoc
/**
 * @typedef {Object} CloudinaryConfig
 * @property {string} cloudName - Назва cloud
 * @property {string} apiKey - API ключ
 * @property {string} apiSecret - API секрет
 * @property {string} uploadPreset - Preset для завантаження
 * @property {string} baseUrl - Базова URL
 */

/**
 * @typedef {Object} UploadHistoryItem
 * @property {string} publicId - Публічний ID
 * @property {string} url - URL зображення
 * @property {number} timestamp - Час завантаження
 * @property {number} [fileSize] - Розмір файлу
 * @property {Object} [dimensions] - Розміри
 * @property {number} dimensions.width - Ширина
 * @property {number} dimensions.height - Висота
 */

// Експорт допоміжних функцій
export const mockCloudinaryCall = async (
  delay = 1000,
  shouldFail = false,
  resultData = null
) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error('Mock Cloudinary call failed'));
      } else {
        resolve({
          success: true,
          data: resultData || { message: 'Mock Cloudinary call successful' },
        });
      }
    }, delay);
  });
};

// Експорт для тестування
export const createCloudinaryService = (config = {}) => {
  const service = new CloudinaryService();
  
  if (config.cloudName) {
    service.updateConfig(config);
  }
  
  return service;
};