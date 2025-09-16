// cameraService.js

import { Camera } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

class CameraService {
  constructor() {
    this.isCameraReady = false;
  }

  // 1. Перевірка та запит дозволів
  async checkCameraPermissions() {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      return {
        success: true,
        granted: status === 'granted',
        status,
        message: `Camera permission: ${status}`
      };
    } catch (error) {
      return {
        success: false,
        granted: false,
        error: error.message || 'Failed to check camera permissions'
      };
    }
  }

  async checkMediaLibraryPermissions() {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      return {
        success: true,
        granted: status === 'granted',
        status,
        message: `Media library permission: ${status}`
      };
    } catch (error) {
      return {
        success: false,
        granted: false,
        error: error.message || 'Failed to check media library permissions'
      };
    }
  }

  async checkAllPermissions() {
    const cameraPermission = await this.checkCameraPermissions();
    const mediaPermission = await this.checkMediaLibraryPermissions();
    
    return {
      success: cameraPermission.granted && mediaPermission.granted,
      camera: cameraPermission,
      media: mediaPermission,
      message: 'All permissions checked'
    };
  }

  // 2. Зйомка фото через expo-camera
  async takePicture(cameraRef, options = {}) {
    try {
      if (!cameraRef || !cameraRef.current) {
        throw new Error('Camera reference is not available');
      }

      const defaultOptions = {
        quality: 0.8,
        base64: false,
        skipProcessing: false,
        ...options
      };

      const photo = await cameraRef.current.takePictureAsync(defaultOptions);
      
      return {
        success: true,
        data: {
          uri: photo.uri,
          width: photo.width,
          height: photo.height,
          base64: photo.base64,
          exif: photo.exif
        },
        message: 'Photo taken successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to take picture'
      };
    }
  }

  // 3. Вибір з галереї через ImagePicker
  async pickFromGallery(options = {}) {
    try {
      const defaultOptions = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        ...options
      };

      const result = await ImagePicker.launchImageLibraryAsync(defaultOptions);

      if (result.canceled) {
        return {
          success: false,
          canceled: true,
          message: 'Image picker was canceled'
        };
      }

      return {
        success: true,
        data: {
          uri: result.assets[0].uri,
          width: result.assets[0].width,
          height: result.assets[0].height,
          type: result.assets[0].type,
          fileName: result.assets[0].fileName
        },
        message: 'Image picked successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to pick image from gallery'
      };
    }
  }

  // 4. Збереження фото
  async savePhoto(uri, album = 'Violations') {
    try {
      const asset = await MediaLibrary.createAssetAsync(uri);
      
      if (album) {
        const albumObj = await MediaLibrary.getAlbumAsync(album);
        if (albumObj) {
          await MediaLibrary.addAssetsToAlbumAsync([asset], albumObj, false);
        } else {
          await MediaLibrary.createAlbumAsync(album, asset, false);
        }
      }

      return {
        success: true,
        data: asset,
        message: 'Photo saved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to save photo'
      };
    }
  }

  // 5. Оптимізація розміру та якості
  async optimizeImage(uri, options = {}) {
    try {
      const defaultOptions = {
        resize: { width: 1920, height: 1080 }, // Full HD
        quality: 0.8,
        format: SaveFormat.JPEG,
        compress: true,
        ...options
      };

      // Отримуємо розміри оригінального зображення
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      // Обчислюємо нові розміри з збереженням пропорцій
      let resizeOptions = null;
      if (defaultOptions.resize) {
        resizeOptions = {
          width: defaultOptions.resize.width,
          height: defaultOptions.resize.height
        };
      }

      // Оптимізуємо зображення
      const result = await manipulateAsync(
        uri,
        resizeOptions ? [{ resize: resizeOptions }] : [],
        {
          compress: defaultOptions.quality,
          format: defaultOptions.format
        }
      );

      // Отримуємо інформацію про оптимізований файл
      const optimizedFileInfo = await FileSystem.getInfoAsync(result.uri);

      return {
        success: true,
        data: {
          originalUri: uri,
          optimizedUri: result.uri,
          originalSize: fileInfo.size,
          optimizedSize: optimizedFileInfo.size,
          savings: fileInfo.size - optimizedFileInfo.size,
          savingsPercentage: ((fileInfo.size - optimizedFileInfo.size) / fileInfo.size * 100).toFixed(2)
        },
        message: 'Image optimized successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to optimize image'
      };
    }
  }

  // 6. Робота з файловою системою
  async getFileInfo(uri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      return {
        success: true,
        data: {
          uri: fileInfo.uri,
          size: fileInfo.size,
          modificationTime: fileInfo.modificationTime,
          isDirectory: fileInfo.isDirectory,
          readable: fileInfo.isDirectory ? undefined : await FileSystem.readAsStringAsync(uri).then(() => true).catch(() => false)
        },
        message: 'File info retrieved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to get file info'
      };
    }
  }

  async deleteFile(uri) {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
      
      return {
        success: true,
        message: 'File deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to delete file'
      };
    }
  }

  async copyFile(sourceUri, destinationUri) {
    try {
      await FileSystem.copyAsync({
        from: sourceUri,
        to: destinationUri
      });
      
      return {
        success: true,
        data: { destinationUri },
        message: 'File copied successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to copy file'
      };
    }
  }

  // Додаткові утиліти
  async convertToBase64(uri) {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      return {
        success: true,
        data: base64,
        message: 'Image converted to base64'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to convert image to base64'
      };
    }
  }

  async validateImage(uri) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      
      if (!fileInfo.exists) {
        return {
          success: false,
          error: 'File does not exist'
        };
      }

      // Перевірка розміру файлу (наприклад, максимум 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileInfo.size > maxSize) {
        return {
          success: false,
          error: `File size (${(fileInfo.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size (10MB)`
        };
      }

      return {
        success: true,
        data: {
          uri: fileInfo.uri,
          size: fileInfo.size,
          isValid: true
        },
        message: 'Image validation passed'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to validate image'
      };
    }
  }

  // Отримання thumbnail
  async createThumbnail(uri, options = {}) {
    try {
      const defaultOptions = {
        width: 300,
        height: 300,
        quality: 0.7
      };

      const result = await manipulateAsync(
        uri,
        [{ resize: { width: defaultOptions.width, height: defaultOptions.height } }],
        {
          compress: defaultOptions.quality,
          format: SaveFormat.JPEG
        }
      );

      return {
        success: true,
        data: {
          uri: result.uri,
          width: result.width,
          height: result.height
        },
        message: 'Thumbnail created successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to create thumbnail'
      };
    }
  }
}

// Експортуємо екземпляр сервісу
const cameraService = new CameraService();

export default cameraService;

// Експортуємо окремі функції для зручності
export const {
  checkCameraPermissions,
  checkMediaLibraryPermissions,
  checkAllPermissions,
  takePicture,
  pickFromGallery,
  savePhoto,
  optimizeImage,
  getFileInfo,
  deleteFile,
  copyFile,
  convertToBase64,
  validateImage,
  createThumbnail
} = cameraService;