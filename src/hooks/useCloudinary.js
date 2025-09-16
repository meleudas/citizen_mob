// src/hooks/useCloudinary.js
import { useState, useCallback } from 'react';
import cloudinaryService from '../services/cloudinaryService';

export const useCloudinary = () => {
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);

  // Завантаження одного фото
  const uploadPhoto = useCallback(async (fileData, options = {}) => {
    try {
      setUploading(true);
      setError(null);
      
      const result = await cloudinaryService.uploadPhoto(fileData, {
        folder: options.folder || 'violations',
        tags: options.tags || ['violation', 'user_upload'],
        ...options
      });
      
      if (result.success) {
        setUploadedPhotos(prev => [...prev, result]);
      }
      
      return result;
    } catch (err) {
      console.error('Upload photo error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  }, []);

  // Завантаження base64 фото
  const uploadBase64Photo = useCallback(async (base64Data, options = {}) => {
    try {
      setUploading(true);
      setError(null);
      
      const result = await cloudinaryService.uploadBase64Photo(base64Data, {
        folder: options.folder || 'violations',
        tags: options.tags || ['violation', 'user_upload'],
        ...options
      });
      
      if (result.success) {
        setUploadedPhotos(prev => [...prev, result]);
      }
      
      return result;
    } catch (err) {
      console.error('Upload base64 photo error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setUploading(false);
    }
  }, []);

  // Видалення фото
  const deletePhoto = useCallback(async (publicId) => {
    try {
      setDeleting(true);
      setError(null);
      
      const result = await cloudinaryService.deletePhoto(publicId);
      
      if (result.success) {
        setUploadedPhotos(prev => prev.filter(photo => photo.publicId !== publicId));
      }
      
      return result;
    } catch (err) {
      console.error('Delete photo error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setDeleting(false);
    }
  }, []);

  // Отримання URL з різними трансформаціями
  const getTransformedImageUrl = useCallback((publicId, transformationType = 'optimized') => {
    return cloudinaryService.getTransformedImageUrl(publicId, transformationType);
  }, []);

  // Отримання всіх URL з різними трансформаціями
  const getPhotoUrls = useCallback((publicId) => {
    return {
      thumbnail: cloudinaryService.getThumbnailUrl(publicId),
      preview: cloudinaryService.getPreviewUrl(publicId),
      full: cloudinaryService.getFullSizeUrl(publicId),
      optimized: cloudinaryService.getOptimizedUrl(publicId),
    };
  }, []);

  // Очищення помилок
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Очищення списку завантажених фото
  const clearUploadedPhotos = useCallback(() => {
    setUploadedPhotos([]);
  }, []);

  return {
    // Стани
    uploading,
    deleting,
    error,
    uploadedPhotos,
    
    // Функції
    uploadPhoto,
    uploadBase64Photo,
    deletePhoto,
    getTransformedImageUrl,
    getPhotoUrls,
    clearError,
    clearUploadedPhotos
  };
};