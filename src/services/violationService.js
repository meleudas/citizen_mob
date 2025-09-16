// violationsService.js

import api from './api';

// Базовий URL для правопорушень
const VIOLATIONS_URL = '/violations';

// 1. Отримання списку правопорушень
export const getViolations = async (params = {}) => {
  try {
    const response = await api.get(VIOLATIONS_URL, { params });
    return {
      success: true,
      data: response.data.data || response.data,
      pagination: response.data.pagination,
      message: 'Violations retrieved successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.response?.data?.message || 'Failed to fetch violations',
      status: error.response?.status
    };
  }
};

// 2. Отримання одного правопорушення
export const getViolation = async (id) => {
  try {
    const response = await api.get(`${VIOLATIONS_URL}/${id}`);
    return {
      success: true,
      data: response.data,
      message: 'Violation retrieved successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.response?.data?.message || 'Failed to fetch violation',
      status: error.response?.status
    };
  }
};

// 3. Створення правопорушення
export const createViolation = async (violationData) => {
  try {
    // Використовуємо FormData для підтримки файлів
    const formData = new FormData();
    
    // Додаємо всі поля
    Object.keys(violationData).forEach(key => {
      if (key === 'photos' && Array.isArray(violationData[key])) {
        // Додаємо фото як окремі файли
        violationData[key].forEach((file, index) => {
          formData.append(`photos[${index}]`, file);
        });
      } else if (Array.isArray(violationData[key])) {
        violationData[key].forEach((item, index) => {
          formData.append(`${key}[${index}]`, item);
        });
      } else {
        formData.append(key, violationData[key]);
      }
    });

    const response = await api.post(VIOLATIONS_URL, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return {
      success: true,
      data: response.data,
      message: 'Violation created successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.response?.data?.message || 'Failed to create violation',
      status: error.response?.status
    };
  }
};

// 4. Оновлення правопорушення
export const updateViolation = async (id, violationData) => {
  try {
    // Використовуємо FormData для підтримки файлів при оновленні
    const formData = new FormData();
    
    // Додаємо всі поля
    Object.keys(violationData).forEach(key => {
      if (key === 'photos' && Array.isArray(violationData[key])) {
        violationData[key].forEach((file, index) => {
          formData.append(`photos[${index}]`, file);
        });
      } else if (Array.isArray(violationData[key])) {
        violationData[key].forEach((item, index) => {
          formData.append(`${key}[${index}]`, item);
        });
      } else {
        formData.append(key, violationData[key]);
      }
    });

    // Важливо: для оновлення з файлами використовуємо POST з _method
    formData.append('_method', 'PUT');

    const response = await api.post(`${VIOLATIONS_URL}/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return {
      success: true,
      data: response.data,
      message: 'Violation updated successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.response?.data?.message || 'Failed to update violation',
      status: error.response?.status
    };
  }
};

// 5. Видалення правопорушення
export const deleteViolation = async (id) => {
  try {
    const response = await api.delete(`${VIOLATIONS_URL}/${id}`);
    return {
      success: true,
      data: response.data,
      message: 'Violation deleted successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.response?.data?.message || 'Failed to delete violation',
      status: error.response?.status
    };
  }
};

// 6. Отримання дат з правопорушеннями
export const getViolationDates = async (params = {}) => {
  try {
    const response = await api.get(`${VIOLATIONS_URL}/dates`, { params });
    return {
      success: true,
      data: response.data,
      message: 'Violation dates retrieved successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.response?.data?.message || 'Failed to fetch violation dates',
      status: error.response?.status
    };
  }
};

// 7. Отримання правопорушень за геолокацією
export const getViolationsByLocation = async (locationParams) => {
  try {
    const response = await api.get(`${VIOLATIONS_URL}/location`, {
      params: locationParams
    });
    return {
      success: true,
      data: response.data.data || response.data,
      pagination: response.data.pagination,
      message: 'Violations by location retrieved successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error.response?.data?.message || 'Failed to fetch violations by location',
      status: error.response?.status
    };
  }
};

// Експортуємо всі функції разом
export default {
  getViolations,
  getViolation,
  createViolation,
  updateViolation,
  deleteViolation,
  getViolationDates,
  getViolationsByLocation
};