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

// 3. Створення правопорушення - ВИПРАВЛЕНО
export const createViolation = async (violationData) => {
  try {
    // Використовуємо JSON замість FormData
    const response = await api.post('/violations', violationData, {
      headers: {
        'Content-Type': 'application/json'
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

// 4. Оновлення правопорушення - ВИПРАВЛЕНО
export const updateViolation = async (id, violationData) => {
  try {
    // Використовуємо JSON для оновлення
    const response = await api.put(`${VIOLATIONS_URL}/${id}`, violationData, {
      headers: {
        'Content-Type': 'application/json'
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