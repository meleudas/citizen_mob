// src/hooks/useCamera.js
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PermissionsAndroid, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system'; // Замінюємо RNFS на expo-file-system
import cameraService from '../services/cameraService';

const CAMERA_PERMISSION_KEY = 'cameraPermission';
const GALLERY_PERMISSION_KEY = 'galleryPermission';
const LOCAL_IMAGES_KEY = 'localImages';

export const useCamera = () => {
  // Стани
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState({
    camera: 'unknown',
    gallery: 'unknown',
  });
  const [cameraType, setCameraType] = useState('back'); // back, front
  const [flashMode, setFlashMode] = useState('auto'); // on, off, auto
  
  // Ref для камери
  const cameraRef = useRef(null);

  // Перевірка дозволів на камеру
  const checkCameraPermission = useCallback(async () => {
    try {
      console.log('Checking camera permission...');
      setLoading(true);
      setError(null);
      
      const result = await cameraService.checkCameraPermissions();
      
      if (result.success) {
        console.log('Camera permission status:', result.status);
        setPermission(prev => ({ ...prev, camera: result.status }));
        await AsyncStorage.setItem(CAMERA_PERMISSION_KEY, result.status);
        return result.status;
      } else {
        console.error('Failed to check camera permission:', result.error);
        setPermission(prev => ({ ...prev, camera: 'denied' }));
        return 'denied';
      }
    } catch (err) {
      console.error('Camera permission check error:', err);
      setPermission(prev => ({ ...prev, camera: 'denied' }));
      return 'denied';
    } finally {
      setLoading(false);
    }
  }, []);

  // Перевірка дозволів на галерею
  const checkGalleryPermission = useCallback(async () => {
    try {
      console.log('Checking gallery permission...');
      setLoading(true);
      setError(null);
      
      const result = await cameraService.checkMediaLibraryPermissions();
      
      if (result.success) {
        console.log('Gallery permission status:', result.status);
        setPermission(prev => ({ ...prev, gallery: result.status }));
        await AsyncStorage.setItem(GALLERY_PERMISSION_KEY, result.status);
        return result.status;
      } else {
        console.error('Failed to check gallery permission:', result.error);
        setPermission(prev => ({ ...prev, gallery: 'denied' }));
        return 'denied';
      }
    } catch (err) {
      console.error('Gallery permission check error:', err);
      setPermission(prev => ({ ...prev, gallery: 'denied' }));
      return 'denied';
    } finally {
      setLoading(false);
    }
  }, []);

  // Запит дозволу на камеру
  const requestCameraPermission = useCallback(async () => {
    try {
      console.log('Requesting camera permission...');
      setLoading(true);
      setError(null);
      
      const result = await cameraService.checkCameraPermissions();
      
      if (result.success && result.granted) {
        console.log('Camera permission granted');
        setPermission(prev => ({ ...prev, camera: 'granted' }));
        await AsyncStorage.setItem(CAMERA_PERMISSION_KEY, 'granted');
        return { success: true, permission: 'granted' };
      } else {
        // Для Android запитуємо дозвіл
        if (Platform.OS === 'android') {
          console.log('Requesting Android camera permission...');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CAMERA,
            {
              title: 'Дозвіл на камеру',
              message: 'Додатку потрібен доступ до камери для зйомки фото',
              buttonNeutral: 'Запитати пізніше',
              buttonNegative: 'Скасувати',
              buttonPositive: 'ОК',
            }
          );
          
          const permissionStatus = granted === 'granted' ? 'granted' : 'denied';
          console.log('Android camera permission status:', permissionStatus);
          setPermission(prev => ({ ...prev, camera: permissionStatus }));
          await AsyncStorage.setItem(CAMERA_PERMISSION_KEY, permissionStatus);
          return { success: granted === 'granted', permission: permissionStatus };
        }
        
        console.warn('Camera permission denied');
        setPermission(prev => ({ ...prev, camera: 'denied' }));
        return { success: false, permission: 'denied' };
      }
    } catch (err) {
      console.error('Camera permission request error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Запит дозволу на галерею
  const requestGalleryPermission = useCallback(async () => {
    try {
      console.log('Requesting gallery permission...');
      setLoading(true);
      setError(null);
      
      const result = await cameraService.checkMediaLibraryPermissions();
      
      if (result.success && result.granted) {
        console.log('Gallery permission granted');
        setPermission(prev => ({ ...prev, gallery: 'granted' }));
        await AsyncStorage.setItem(GALLERY_PERMISSION_KEY, 'granted');
        return { success: true, permission: 'granted' };
      } else {
        // Для Android запитуємо дозвіл
        if (Platform.OS === 'android') {
          console.log('Requesting Android gallery permission...');
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
            {
              title: 'Дозвіл на галерею',
              message: 'Додатку потрібен доступ до галереї для вибору фото',
              buttonNeutral: 'Запитати пізніше',
              buttonNegative: 'Скасувати',
              buttonPositive: 'ОК',
            }
          );
          
          const permissionStatus = granted === 'granted' ? 'granted' : 'denied';
          console.log('Android gallery permission status:', permissionStatus);
          setPermission(prev => ({ ...prev, gallery: permissionStatus }));
          await AsyncStorage.setItem(GALLERY_PERMISSION_KEY, permissionStatus);
          return { success: granted === 'granted', permission: permissionStatus };
        }
        
        console.warn('Gallery permission denied');
        setPermission(prev => ({ ...prev, gallery: 'denied' }));
        return { success: false, permission: 'denied' };
      }
    } catch (err) {
      console.error('Gallery permission request error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Зйомка фото
  const takePhoto = useCallback(async (options = {}) => {
    try {
      console.log('Starting takePhoto function...');
      setLoading(true);
      setError(null);
      
      // Перевірка дозволів
      const cameraPerm = await checkCameraPermission();
      console.log('Camera permission status:', cameraPerm);
      
      if (cameraPerm !== 'granted') {
        console.warn('Camera permission not granted, requesting...');
        const requestResult = await requestCameraPermission();
        if (!requestResult.success) {
          throw new Error('Дозвіл на камеру не надано');
        }
      }
      
      // Налаштування за замовчуванням
      const defaultOptions = {
        quality: 0.8,
        base64: true,
        skipProcessing: false,
        ...options
      };
      
      // Перевірка чи ref існує
      if (!cameraRef.current) {
        console.error('Camera reference is not available');
        throw new Error('Camera reference is not available');
      }
      
      console.log('Camera reference is available, taking picture...');
      const result = await cameraService.takePicture(cameraRef, defaultOptions);
      
      if (result.success) {
        console.log('Photo taken successfully:', result.data);
        setPhoto(result.data);
        return { success: true, photo: result.data };
      } else {
        console.error('Failed to take picture:', result.error);
        throw new Error(result.error || 'Не вдалося зробити фото');
      }
    } catch (err) {
      console.error('Take photo error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [cameraRef, checkCameraPermission, requestCameraPermission]);

  // Вибір з галереї
  const pickFromGallery = useCallback(async (options = {}) => {
    try {
      console.log('Starting pickFromGallery function...');
      setLoading(true);
      setError(null);
      
      // Перевірка дозволів
      const galleryPerm = await checkGalleryPermission();
      console.log('Gallery permission status:', galleryPerm);
      
      if (galleryPerm !== 'granted') {
        console.warn('Gallery permission not granted, requesting...');
        const requestResult = await requestGalleryPermission();
        if (!requestResult.success) {
          throw new Error('Дозвіл на галерею не надано');
        }
      }
      
      // Налаштування за замовчуванням
      const defaultOptions = {
        mediaTypes: 'photo',
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        ...options
      };
      
      console.log('Picking image from gallery...');
      const result = await cameraService.pickFromGallery(defaultOptions);
      
      if (result.success && !result.canceled) {
        console.log('Image picked successfully:', result.data);
        setPhoto(result.data);
        return { success: true, photo: result.data };
      } else if (result.canceled) {
        console.log('Image selection canceled by user');
        return { success: false, cancelled: true };
      } else {
        console.error('Failed to pick image:', result.error);
        throw new Error(result.error || 'Не вдалося вибрати фото');
      }
    } catch (err) {
      console.error('Pick from gallery error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [checkGalleryPermission, requestGalleryPermission]);

  // Оптимізація зображення
  const optimizeImage = useCallback(async (imageUri, options = {}) => {
    try {
      console.log('Optimizing image:', imageUri);
      setLoading(true);
      setError(null);
      
      const defaultOptions = {
        resize: { width: 1920, height: 1080 },
        quality: 0.8,
        format: 'jpeg',
        ...options
      };
      
      const result = await cameraService.optimizeImage(imageUri, defaultOptions);
      
      if (result.success) {
        console.log('Image optimized successfully:', result.data);
        return { success: true, data: result.data };
      } else {
        console.error('Failed to optimize image:', result.error);
        throw new Error(result.error || 'Не вдалося оптимізувати зображення');
      }
    } catch (err) {
      console.error('Optimize image error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Зміна розміру зображення
  const resizeImage = useCallback(async (imageUri, maxWidth = 1024, maxHeight = 1024, quality = 80) => {
    try {
      console.log('Resizing image:', imageUri);
      setLoading(true);
      setError(null);
      
      // Використовуємо сервіс для оптимізації замість ImageResizer
      const result = await cameraService.optimizeImage(imageUri, {
        resize: { width: maxWidth, height: maxHeight },
        quality: quality / 100,
        format: 'jpeg'
      });
      
      if (result.success) {
        console.log('Image resized successfully:', result.data);
        return { success: true, data: result.data };
      } else {
        console.error('Failed to resize image:', result.error);
        throw new Error(result.error || 'Не вдалося змінити розмір зображення');
      }
    } catch (err) {
      console.error('Resize image error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Компресія зображення
  const compressImage = useCallback(async (imageUri, quality = 80) => {
    try {
      console.log('Compressing image:', imageUri);
      setLoading(true);
      setError(null);
      
      // Використовуємо сервіс для оптимізації з компресією
      const result = await cameraService.optimizeImage(imageUri, {
        quality: quality / 100,
        format: 'jpeg'
      });
      
      if (result.success) {
        console.log('Image compressed successfully:', result.data);
        return { success: true, data: result.data };
      } else {
        console.error('Failed to compress image:', result.error);
        throw new Error(result.error || 'Не вдалося компресувати зображення');
      }
    } catch (err) {
      console.error('Compress image error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Збереження фото
  const savePhoto = useCallback(async (uri, album = 'Violations') => {
    try {
      console.log('Saving photo to album:', album);
      setLoading(true);
      setError(null);
      
      const result = await cameraService.savePhoto(uri, album);
      
      if (result.success) {
        console.log('Photo saved successfully:', result.data);
        return { success: true, data: result.data };
      } else {
        console.error('Failed to save photo:', result.error);
        throw new Error(result.error || 'Не вдалося зберегти фото');
      }
    } catch (err) {
      console.error('Save photo error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Збереження в локальне сховище
  const saveToLocalStorage = useCallback(async (imageData) => {
    try {
      console.log('Saving image to local storage...');
      setLoading(true);
      setError(null);
      
      const imageId = `image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const imagePath = `${FileSystem.documentDirectory}${imageId}.jpg`;
      
      // Збереження файлу
      if (imageData.uri) {
        console.log('Copying image file:', imageData.uri, 'to', imagePath);
        await FileSystem.copyAsync({
          from: imageData.uri,
          to: imagePath
        });
      } else if (imageData.base64) {
        console.log('Writing base64 image to file:', imagePath);
        await FileSystem.writeAsStringAsync(imagePath, imageData.base64, {
          encoding: FileSystem.EncodingType.Base64
        });
      }
      
      // Збереження метаданих
      const imageMetadata = {
        id: imageId,
        path: imagePath,
        uri: imagePath, // В Expo FileSystem URI вже правильний
        timestamp: Date.now(),
        ...imageData
      };
      
      // Оновлення списку локальних зображень
      const localImages = await AsyncStorage.getItem(LOCAL_IMAGES_KEY);
      const parsedImages = localImages ? JSON.parse(localImages) : [];
      parsedImages.push(imageMetadata);
      await AsyncStorage.setItem(LOCAL_IMAGES_KEY, JSON.stringify(parsedImages));
      
      console.log('Image saved to local storage:', imageMetadata);
      return { success: true, data: imageMetadata };
    } catch (err) {
      console.error('Save to local storage error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Видалення локального зображення
  const deleteLocalImage = useCallback(async (imageId) => {
    try {
      console.log('Deleting local image:', imageId);
      setLoading(true);
      setError(null);
      
      // Отримання списку локальних зображень
      const localImages = await AsyncStorage.getItem(LOCAL_IMAGES_KEY);
      const parsedImages = localImages ? JSON.parse(localImages) : [];
      
      // Знаходження зображення
      const imageToDelete = parsedImages.find(img => img.id === imageId);
      if (!imageToDelete) {
        console.warn('Image not found for deletion:', imageId);
        throw new Error('Зображення не знайдено');
      }
      
      // Видалення файлу
      console.log('Deleting image file:', imageToDelete.path);
      await FileSystem.deleteAsync(imageToDelete.path, { idempotent: true });
      
      // Оновлення списку
      const updatedImages = parsedImages.filter(img => img.id !== imageId);
      await AsyncStorage.setItem(LOCAL_IMAGES_KEY, JSON.stringify(updatedImages));
      
      console.log('Local image deleted successfully:', imageId);
      return { success: true };
    } catch (err) {
      console.error('Delete local image error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Отримання локальних зображень
  const getLocalImages = useCallback(async () => {
    try {
      console.log('Getting local images...');
      const localImages = await AsyncStorage.getItem(LOCAL_IMAGES_KEY);
      const parsedImages = localImages ? JSON.parse(localImages) : [];
      
      // Перевірка існування файлів
      const existingImages = [];
      for (const image of parsedImages) {
        const fileInfo = await FileSystem.getInfoAsync(image.path);
        if (fileInfo.exists) {
          existingImages.push(image);
        }
      }
      
      // Оновлення списку (видалення неіснуючих файлів)
      if (existingImages.length !== parsedImages.length) {
        await AsyncStorage.setItem(LOCAL_IMAGES_KEY, JSON.stringify(existingImages));
      }
      
      console.log('Retrieved local images:', existingImages.length);
      return { success: true, data: existingImages };
    } catch (err) {
      console.error('Get local images error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, []);

  // Очищення локальних зображень
  const clearLocalImages = useCallback(async () => {
    try {
      console.log('Clearing local images...');
      setLoading(true);
      setError(null);
      
      const localImages = await AsyncStorage.getItem(LOCAL_IMAGES_KEY);
      const parsedImages = localImages ? JSON.parse(localImages) : [];
      
      // Видалення всіх файлів
      for (const image of parsedImages) {
        try {
          console.log('Deleting image file:', image.path);
          await FileSystem.deleteAsync(image.path, { idempotent: true });
        } catch (err) {
          console.warn('Failed to delete image file:', err);
        }
      }
      
      // Очищення списку
      await AsyncStorage.removeItem(LOCAL_IMAGES_KEY);
      
      console.log('Local images cleared successfully');
      return { success: true };
    } catch (err) {
      console.error('Clear local images error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Валідація зображення
  const validateImage = useCallback(async (uri) => {
    try {
      console.log('Validating image:', uri);
      setLoading(true);
      setError(null);
      
      const result = await cameraService.validateImage(uri);
      
      if (result.success) {
        console.log('Image validation passed:', result.data);
        return { success: true, data: result.data };
      } else {
        console.error('Image validation failed:', result.error);
        throw new Error(result.error || 'Невалідне зображення');
      }
    } catch (err) {
      console.error('Validate image error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Створення thumbnail
  const createThumbnail = useCallback(async (uri, options = {}) => {
    try {
      console.log('Creating thumbnail for image:', uri);
      setLoading(true);
      setError(null);
      
      const defaultOptions = {
        width: 300,
        height: 300,
        quality: 0.7,
        ...options
      };
      
      const result = await cameraService.createThumbnail(uri, defaultOptions);
      
      if (result.success) {
        console.log('Thumbnail created successfully:', result.data);
        return { success: true, data: result.data };
      } else {
        console.error('Failed to create thumbnail:', result.error);
        throw new Error(result.error || 'Не вдалося створити thumbnail');
      }
    } catch (err) {
      console.error('Create thumbnail error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Оновлення типу камери
  const switchCamera = useCallback(() => {
    console.log('Switching camera type:', cameraType);
    setCameraType(prev => prev === 'back' ? 'front' : 'back');
  }, [cameraType]);

  // Оновлення режиму спалаху
  const toggleFlash = useCallback(() => {
    const modes = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    console.log('Toggling flash mode:', flashMode, '->', modes[nextIndex]);
    setFlashMode(modes[nextIndex]);
  }, [flashMode]);

  // Очищення помилок
  const clearError = useCallback(() => {
    console.log('Clearing error');
    setError(null);
  }, []);

  // Очищення фото
  const clearPhoto = useCallback(() => {
    console.log('Clearing photo');
    setPhoto(null);
  }, []);

  return {
    // Стани
    photo,
    loading,
    error,
    permission,
    cameraType,
    flashMode,
    cameraRef,
    
    // Основні функції
    takePhoto,
    pickFromGallery,
    optimizeImage,
    resizeImage,
    compressImage,
    savePhoto,
    saveToLocalStorage,
    deleteLocalImage,
    getLocalImages,
    clearLocalImages,
    validateImage,
    createThumbnail,
    
    // Управління станом
    checkCameraPermission,
    checkGalleryPermission,
    requestCameraPermission,
    requestGalleryPermission,
    switchCamera,
    toggleFlash,
    clearError,
    clearPhoto,
  };
};