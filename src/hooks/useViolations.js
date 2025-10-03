// src/hooks/useViolations.js
import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetwork } from './useNetwork';
import violationsService from '../services/violationService';

// Redux слайси
import {
  setViolations,
  addViolation as addViolationRedux,
  updateViolation as updateViolationRedux,
  deleteViolation as deleteViolationRedux,
  setCurrentViolation,
  setFilters,
  clearError,
  selectAllViolations,
  selectViolationsLoading,
  selectViolationsError,
  selectViolationsFilters,
  selectViolationsPagination,
  selectSyncStatus
} from '../store/violationsSlice';

export const useViolations = () => {
  const dispatch = useDispatch();
  const network = useNetwork();

  // Селектори Redux
  const violations = useSelector(selectAllViolations);
  const loading = useSelector(selectViolationsLoading);
  const error = useSelector(selectViolationsError);
  const filters = useSelector(selectViolationsFilters);
  const pagination = useSelector(selectViolationsPagination);
  const syncStatus = useSelector(selectSyncStatus);

  // Локальні стани
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('dateTime');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Використовуємо реальний статус мережі
  const isOnline = network.isOnline();

  // Завантаження правопорушень
  const loadViolations = useCallback(async (options = {}) => {
    try {
      const {
        page: pageNum = page,
        pageSize: size = pageSize,
        filters: filterOptions = filters,
        search: searchStr = searchQuery,
        sort: sortField = sortBy,
        order: sortOrdering = sortOrder
      } = options;

      const apiParams = {
        page: pageNum,
        limit: size,
        sortBy: sortField,
        sortOrder: sortOrdering,
        ...filterOptions
      };

      if (searchStr) {
        apiParams.search = searchStr;
      }

      if (isOnline) {
        const response = await violationsService.getViolations(apiParams);
        if (response.success) {
          dispatch(setViolations(response.data));
          return response;
        } else {
          throw new Error(response.error);
        }
      } else {
        // Якщо немає мережі — беремо з локального стану Redux
        return { success: true, data: violations };
      }
    } catch (err) {
      console.error('Load violations error:', err);
      dispatch(clearError());
      return { success: false, error: err.message };
    }
  }, [page, pageSize, filters, searchQuery, sortBy, sortOrder, isOnline, violations, dispatch]);

  // Додавання правопорушення
  const addViolation = useCallback(async (violationData) => {
    try {
      if (isOnline) {
        const response = await violationsService.createViolation(violationData);
        if (response.success) {
          dispatch(addViolationRedux(response.data));
          return response;
        } else {
          throw new Error(response.error);
        }
      } else {
        // Якщо немає мережі — зберігаємо локально (в Redux)
        const newId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newViolation = {
          id: newId,
          ...violationData,
          isSynced: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Зберігаємо в офлайн-сховище
        const offlineViolations = await AsyncStorage.getItem('offlineViolations');
        const parsedViolations = offlineViolations ? JSON.parse(offlineViolations) : [];
        parsedViolations.push(newViolation);
        await AsyncStorage.setItem('offlineViolations', JSON.stringify(parsedViolations));

        dispatch(addViolationRedux(newViolation));
        return { success: true, data: newViolation };
      }
    } catch (err) {
      console.error('Add violation error:', err);
      dispatch(clearError());
      return { success: false, error: err.message };
    }
  }, [isOnline, dispatch]);

  // Отримання правопорушення за ID
  const getViolationById = useCallback(async (id) => {
    try {
      const localViolation = violations.find(v => v.id === id);
      if (localViolation) {
        dispatch(setCurrentViolation(localViolation));
        return { success: true, data: localViolation };
      }

      if (isOnline) {
        const response = await violationsService.getViolation(id);
        if (response.success) {
          dispatch(setCurrentViolation(response.data));
          return response;
        }
      }

      return { success: false, error: 'Правопорушення не знайдено' };
    } catch (err) {
      console.error('Get violation error:', err);
      dispatch(clearError());
      return { success: false, error: err.message };
    }
  }, [violations, isOnline, dispatch]);

  // Оновлення правопорушення
  const updateViolation = useCallback(async (id, data) => {
    try {
      if (isOnline) {
        const response = await violationsService.updateViolation(id, data);
        if (response.success) {
          dispatch(updateViolationRedux(response.data));
          return response;
        } else {
          throw new Error(response.error);
        }
      } else {
        const updatedViolation = {
          ...data,
          id,
          updatedAt: new Date().toISOString(),
          isSynced: false
        };

        dispatch(updateViolationRedux({ id, ...updatedViolation }));
        return { success: true, data: updatedViolation };
      }
    } catch (err) {
      console.error('Update violation error:', err);
      dispatch(clearError());
      return { success: false, error: err.message };
    }
  }, [isOnline, dispatch]);

  // Видалення правопорушення
  const deleteViolation = useCallback(async (id) => {
    try {
      if (isOnline) {
        const response = await violationsService.deleteViolation(id);
        if (response.success) {
          dispatch(deleteViolationRedux(id));
          return response;
        } else {
          throw new Error(response.error);
        }
      } else {
        dispatch(deleteViolationRedux(id));
        return { success: true };
      }
    } catch (err) {
      console.error('Delete violation error:', err);
      dispatch(clearError());
      return { success: false, error: err.message };
    }
  }, [isOnline, dispatch]);

  // Синхронізація правопорушень
  const syncViolations = useCallback(async () => {
    if (!isOnline) {
      return { success: false, error: 'Немає підключення до інтернету' };
    }

    try {
      const offlineViolations = await AsyncStorage.getItem('offlineViolations');
      const parsedViolations = offlineViolations ? JSON.parse(offlineViolations) : [];

      const unsyncedViolations = parsedViolations.filter(v => !v.isSynced);

      const syncedViolations = [];
      const failedViolations = [];

      for (const violation of unsyncedViolations) {
        try {
          const response = await violationsService.createViolation({
            ...violation,
            id: undefined
          });

          if (response.success) {
            const syncedViolation = {
              ...violation,
              ...response.data,
              isSynced: true,
              id: response.data.id
            };

            syncedViolations.push(syncedViolation);
          } else {
            failedViolations.push(violation);
          }
        } catch (err) {
          console.error('Sync violation error:', err);
          failedViolations.push(violation);
        }
      }

      // Оновлюємо список офлайн-порушень
      const updatedViolations = parsedViolations.map(v => {
        const synced = syncedViolations.find(sv => sv.id === v.id);
        return synced || v;
      });

      await AsyncStorage.setItem('offlineViolations', JSON.stringify(updatedViolations));

      // Оновлюємо Redux
      syncedViolations.forEach(synced => {
        dispatch(updateViolationRedux(synced));
      });

      return {
        success: true,
        syncedCount: syncedViolations.length,
        failedCount: failedViolations.length
      };
    } catch (err) {
      console.error('Sync violations error:', err);
      dispatch(clearError());
      return { success: false, error: err.message };
    }
  }, [isOnline, dispatch]);

  // Інші функції (getViolationsByDate, getViolationsByLocation, getStatistics тощо)
  // залишаємо без змін, але вони будуть працювати з Redux станом

  const getStatistics = useCallback(() => {
    const stats = {
      total: violations.length,
      byCategory: {},
      byDate: {},
      recent: violations.slice(0, 5)
    };

    violations.forEach(violation => {
      const category = violation.category || 'other';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    violations.forEach(violation => {
      const date = new Date(violation.dateTime).toDateString();
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;
    });

    return stats;
  }, [violations]);

  const updateFilters = useCallback((newFilters) => {
    dispatch(setFilters(newFilters));
    setPage(1);
  }, [dispatch]);

  const updateSearch = useCallback((query) => {
    setSearchQuery(query);
    setPage(1);
  }, []);

  const updateSort = useCallback((field, order = 'asc') => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
  }, []);

  const changePage = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const changePageSize = useCallback((newSize) => {
    setPageSize(newSize);
    setPage(1);
  }, []);

  const clearErrorLocal = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const refresh = useCallback(async () => {
    return await loadViolations();
  }, [loadViolations]);

  return {
    violations,
    pagination,
    loading: loading.fetch || loading.create || loading.update || loading.delete || loading.sync,
    error,
    isOnline,
    syncStatus,
    filters,
    searchQuery,
    sortBy,
    sortOrder,
    page,
    pageSize,
    addViolation,
    getViolations: loadViolations,
    getViolationById,
    updateViolation,
    deleteViolation,
    syncViolations,
    getStatistics,
    updateFilters,
    updateSearch,
    updateSort,
    changePage,
    changePageSize,
    clearError: clearErrorLocal,
    refresh,
  };
};