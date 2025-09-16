// src/hooks/useViolations.js
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SQLite from 'react-native-sqlite-storage';
import violationsService from '../services/violationService';

// Ініціалізація SQLite
SQLite.DEBUG(true);
SQLite.enablePromise(true);

const VIOLATIONS_STORAGE_KEY = 'violations';
const OFFLINE_VIOLATIONS_KEY = 'offlineViolations';

export const useViolations = () => {
  // Стани
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState(null);
  
  // Фільтри та пошук
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    dateFrom: null,
    dateTo: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('dateTime');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Пагінація
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // Offline стани
  const [isOnline, setIsOnline] = useState(true);
  const [db, setDb] = useState(null);

  // Ініціалізація бази даних
  useEffect(() => {
    const initDatabase = async () => {
      try {
        const database = await SQLite.openDatabase({
          name: 'ViolationsDB.db',
          location: 'default',
        });
        
        // Створення таблиці правопорушень
        await database.executeSql(`
          CREATE TABLE IF NOT EXISTS violations (
            id TEXT PRIMARY KEY,
            description TEXT,
            category TEXT,
            photo TEXT,
            dateTime TEXT,
            latitude REAL,
            longitude REAL,
            isSynced INTEGER DEFAULT 0,
            createdAt TEXT,
            updatedAt TEXT
          )
        `);
        
        setDb(database);
      } catch (err) {
        console.error('Database initialization error:', err);
        setError('Помилка ініціалізації бази даних');
      }
    };

    initDatabase();

    // Перевірка статусу мережі
    const checkNetworkStatus = () => {
      // В реальному додатку тут буде перевірка мережі
      setIsOnline(true);
    };

    checkNetworkStatus();
  }, []);

  // Завантаження правопорушень
  const loadViolations = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const {
        page: pageNum = page,
        pageSize: size = pageSize,
        filters: filterOptions = filters,
        search: searchStr = searchQuery,
        sort: sortField = sortBy,
        order: sortOrdering = sortOrder
      } = options;

      // Параметри для API запиту
      const apiParams = {
        page: pageNum,
        limit: size,
        sortBy: sortField,
        sortOrder: sortOrdering,
        ...filterOptions
      };

      // Додавання пошуку якщо є
      if (searchStr) {
        apiParams.search = searchStr;
      }

      // Якщо є інтернет - використовуємо API
      if (isOnline) {
        const response = await violationsService.getViolations(apiParams);
        
        if (response.success) {
          setViolations(response.data);
          setTotalCount(response.pagination?.total || response.data.length);
          setPagination(response.pagination);
          return response;
        } else {
          throw new Error(response.error);
        }
      } else {
        // Якщо немає інтернету - завантажуємо з локальної бази
        if (db) {
          const [results] = await db.executeSql(
            `SELECT * FROM violations ORDER BY ${sortField} ${sortOrdering === 'desc' ? 'DESC' : 'ASC'} LIMIT ? OFFSET ?`,
            [size, (pageNum - 1) * size]
          );
          
          const localViolations = [];
          for (let i = 0; i < results.rows.length; i++) {
            localViolations.push(results.rows.item(i));
          }
          
          setViolations(localViolations);
          setTotalCount(localViolations.length);
          return { success: true, data: localViolations, totalCount: localViolations.length };
        }
      }
    } catch (err) {
      console.error('Load violations error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters, searchQuery, sortBy, sortOrder, isOnline, db]);

  // Додавання правопорушення
  const addViolation = useCallback(async (violationData) => {
    try {
      setLoading(true);
      setError(null);

      // Якщо є інтернет - використовуємо API
      if (isOnline) {
        const response = await violationsService.createViolation(violationData);
        
        if (response.success) {
          setViolations(prev => [response.data, ...prev]);
          setTotalCount(prev => prev + 1);
          return response;
        } else {
          throw new Error(response.error);
        }
      } else {
        // Якщо немає інтернету - зберігаємо локально
        const newId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const newViolation = {
          id: newId,
          ...violationData,
          isSynced: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Збереження в локальну базу даних
        if (db) {
          await db.executeSql(
            `INSERT INTO violations (
              id, description, category, photo, dateTime, latitude, longitude, isSynced, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newViolation.id,
              newViolation.description,
              newViolation.category,
              newViolation.photo,
              newViolation.dateTime,
              newViolation.location?.latitude || 0,
              newViolation.location?.longitude || 0,
              0, // isSynced
              newViolation.createdAt,
              newViolation.updatedAt
            ]
          );
        }

        // Збереження в AsyncStorage для офлайн режиму
        const offlineViolations = await AsyncStorage.getItem(OFFLINE_VIOLATIONS_KEY);
        const parsedViolations = offlineViolations ? JSON.parse(offlineViolations) : [];
        parsedViolations.push(newViolation);
        await AsyncStorage.setItem(OFFLINE_VIOLATIONS_KEY, JSON.stringify(parsedViolations));

        setViolations(prev => [newViolation, ...prev]);
        setTotalCount(prev => prev + 1);

        return { success: true, data: newViolation };
      }
    } catch (err) {
      console.error('Add violation error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [db, isOnline]);

  // Отримання правопорушення за ID
  const getViolationById = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      // Пошук в локальному стані
      const localViolation = violations.find(v => v.id === id);
      if (localViolation) {
        return { success: true, data: localViolation };
      }

      // Пошук в базі даних
      if (db) {
        const [results] = await db.executeSql(
          'SELECT * FROM violations WHERE id = ?',
          [id]
        );
        
        if (results.rows.length > 0) {
          const violation = results.rows.item(0);
          return { success: true, data: violation };
        }
      }

      // Якщо є інтернет - запит до сервера
      if (isOnline) {
        const response = await violationsService.getViolation(id);
        return response;
      }

      return { success: false, error: 'Правопорушення не знайдено' };
    } catch (err) {
      console.error('Get violation error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [violations, db, isOnline]);

  // Оновлення правопорушення
  const updateViolation = useCallback(async (id, data) => {
    try {
      setLoading(true);
      setError(null);

      // Якщо є інтернет - використовуємо API
      if (isOnline) {
        const response = await violationsService.updateViolation(id, data);
        
        if (response.success) {
          setViolations(prev => 
            prev.map(v => v.id === id ? { ...v, ...response.data } : v)
          );
          return response;
        } else {
          throw new Error(response.error);
        }
      } else {
        // Якщо немає інтернету - оновлюємо локально
        const updatedViolation = {
          ...data,
          updatedAt: new Date().toISOString()
        };

        // Оновлення в базі даних
        if (db) {
          await db.executeSql(
            `UPDATE violations SET 
              description = ?, category = ?, photo = ?, dateTime = ?, 
              latitude = ?, longitude = ?, updatedAt = ?, isSynced = ?
              WHERE id = ?`,
            [
              updatedViolation.description,
              updatedViolation.category,
              updatedViolation.photo,
              updatedViolation.dateTime,
              updatedViolation.location?.latitude || 0,
              updatedViolation.location?.longitude || 0,
              updatedViolation.updatedAt,
              0, // isSynced
              id
            ]
          );
        }

        // Оновлення в локальному стані
        setViolations(prev => 
          prev.map(v => v.id === id ? { ...v, ...updatedViolation } : v)
        );

        return { success: true, data: updatedViolation };
      }
    } catch (err) {
      console.error('Update violation error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [db, isOnline]);

  // Видалення правопорушення
  const deleteViolation = useCallback(async (id) => {
    try {
      setLoading(true);
      setError(null);

      // Якщо є інтернет - використовуємо API
      if (isOnline) {
        const response = await violationsService.deleteViolation(id);
        
        if (response.success) {
          setViolations(prev => prev.filter(v => v.id !== id));
          setTotalCount(prev => prev - 1);
          return response;
        } else {
          throw new Error(response.error);
        }
      } else {
        // Якщо немає інтернету - видаляємо локально
        // Видалення з бази даних
        if (db) {
          await db.executeSql('DELETE FROM violations WHERE id = ?', [id]);
        }

        // Видалення з локального стану
        setViolations(prev => prev.filter(v => v.id !== id));
        setTotalCount(prev => prev - 1);

        return { success: true };
      }
    } catch (err) {
      console.error('Delete violation error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [db, isOnline]);

  // Отримання правопорушень за датою
  const getViolationsByDate = useCallback(async (date) => {
    try {
      setLoading(true);
      setError(null);

      // Якщо є інтернет - використовуємо API
      if (isOnline) {
        const response = await violationsService.getViolationDates({ date });
        return response;
      } else {
        // Для офлайн режиму - фільтрація з існуючих даних
        const filteredViolations = violations.filter(violation => {
          const violationDate = new Date(violation.dateTime).toDateString();
          const targetDate = new Date(date).toDateString();
          return violationDate === targetDate;
        });

        return { success: true, data: filteredViolations };
      }
    } catch (err) {
      console.error('Get violations by date error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [violations, isOnline]);

  // Отримання правопорушень за локацією
  const getViolationsByLocation = useCallback(async (locationParams) => {
    try {
      setLoading(true);
      setError(null);

      // Якщо є інтернет - використовуємо API
      if (isOnline) {
        const response = await violationsService.getViolationsByLocation(locationParams);
        
        if (response.success) {
          setViolations(response.data);
          setTotalCount(response.pagination?.total || response.data.length);
          setPagination(response.pagination);
          return response;
        } else {
          throw new Error(response.error);
        }
      } else {
        // Для офлайн режиму - розрахунок відстані між двома точками (в метрах)
        const calculateDistance = (lat1, lon1, lat2, lon2) => {
          const R = 6371e3; // Радіус Землі в метрах
          const φ1 = lat1 * Math.PI/180;
          const φ2 = lat2 * Math.PI/180;
          const Δφ = (lat2-lat1) * Math.PI/180;
          const Δλ = (lon2-lon1) * Math.PI/180;

          const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                    Math.cos(φ1) * Math.cos(φ2) *
                    Math.sin(Δλ/2) * Math.sin(Δλ/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

          return R * c;
        };

        // Фільтрація за радіусом
        const nearbyViolations = violations.filter(violation => {
          if (!violation.location) return false;
          
          const distance = calculateDistance(
            locationParams.latitude, 
            locationParams.longitude, 
            violation.location.latitude, 
            violation.location.longitude
          );
          
          return distance <= (locationParams.radius || 1000);
        });

        return { success: true, data: nearbyViolations };
      }
    } catch (err) {
      console.error('Get violations by location error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [violations, isOnline]);

  // Синхронізація правопорушень
  const syncViolations = useCallback(async () => {
    if (!isOnline) {
      return { success: false, error: 'Немає підключення до інтернету' };
    }

    try {
      setLoading(true);
      setError(null);

      // Отримання офлайн правопорушень
      const offlineViolations = await AsyncStorage.getItem(OFFLINE_VIOLATIONS_KEY);
      const parsedViolations = offlineViolations ? JSON.parse(offlineViolations) : [];

      const unsyncedViolations = parsedViolations.filter(v => !v.isSynced);

      // Синхронізація кожного правопорушення
      const syncedViolations = [];
      const failedViolations = [];

      for (const violation of unsyncedViolations) {
        try {
          const response = await violationsService.createViolation(violation);
          
          if (response.success) {
            // Оновлення статусу синхронізації
            violation.isSynced = true;
            violation.id = response.data.id; // Оновлення ID з сервера
            syncedViolations.push(violation);
          } else {
            failedViolations.push(violation);
          }
        } catch (err) {
          console.error('Sync violation error:', err);
          failedViolations.push(violation);
        }
      }

      // Оновлення AsyncStorage
      const updatedViolations = parsedViolations.map(v => {
        const synced = syncedViolations.find(sv => sv.id === v.id);
        return synced || v;
      });
      
      await AsyncStorage.setItem(OFFLINE_VIOLATIONS_KEY, JSON.stringify(updatedViolations));

      // Оновлення SQLite бази
      if (db && syncedViolations.length > 0) {
        for (const violation of syncedViolations) {
          await db.executeSql(
            'UPDATE violations SET isSynced = 1, id = ? WHERE id = ?',
            [violation.id, violation.id]
          );
        }
      }

      // Оновлення локального стану
      setViolations(prev => 
        prev.map(v => {
          const synced = syncedViolations.find(sv => sv.id === v.id);
          return synced ? { ...v, ...synced } : v;
        })
      );

      return {
        success: true,
        syncedCount: syncedViolations.length,
        failedCount: failedViolations.length
      };
    } catch (err) {
      console.error('Sync violations error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, [db, isOnline]);

  // Отримання статистики
  const getStatistics = useCallback(() => {
    const stats = {
      total: violations.length,
      byCategory: {},
      byDate: {},
      recent: violations.slice(0, 5)
    };

    // Статистика по категоріям
    violations.forEach(violation => {
      const category = violation.category || 'other';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    // Статистика по датах
    violations.forEach(violation => {
      const date = new Date(violation.dateTime).toDateString();
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;
    });

    return stats;
  }, [violations]);

  // Оновлення фільтрів
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(1); // Скидання пагінації
  }, []);

  // Оновлення пошуку
  const updateSearch = useCallback((query) => {
    setSearchQuery(query);
    setPage(1); // Скидання пагінації
  }, []);

  // Оновлення сортування
  const updateSort = useCallback((field, order = 'asc') => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1); // Скидання пагінації
  }, []);

  // Зміна сторінки
  const changePage = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  // Зміна розміру сторінки
  const changePageSize = useCallback((newSize) => {
    setPageSize(newSize);
    setPage(1); // Скидання до першої сторінки
  }, []);

  // Очищення помилок
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Перезавантаження даних
  const refresh = useCallback(async () => {
    return await loadViolations();
  }, [loadViolations]);

  return {
    // Дані
    violations,
    totalCount,
    pagination,
    
    // Стани
    loading,
    error,
    isOnline,
    
    // Фільтри та пошук
    filters,
    searchQuery,
    sortBy,
    sortOrder,
    
    // Пагінація
    page,
    pageSize,
    
    // Функції CRUD
    addViolation,
    getViolations: loadViolations,
    getViolationById,
    updateViolation,
    deleteViolation,
    
    // Спеціальні функції
    getViolationsByDate,
    getViolationsByLocation,
    syncViolations,
    getStatistics,
    
    // Управління станом
    updateFilters,
    updateSearch,
    updateSort,
    changePage,
    changePageSize,
    clearError,
    refresh,
  };
};

// Хелпер для фільтрації правопорушень
export const useViolationFilters = () => {
  const [activeFilters, setActiveFilters] = useState({
    category: 'all',
    status: 'all',
    dateRange: null,
  });

  const applyFilter = useCallback((filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({
      category: 'all',
      status: 'all',
      dateRange: null,
    });
  }, []);

  return {
    activeFilters,
    applyFilter,
    clearFilters
  };
};

// Хелпер для пошуку правопорушень
export const useViolationSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const performSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchQuery('');
      return { success: true, data: [] };
    }

    setIsSearching(true);
    setSearchQuery(query);

    try {
      const response = await violationsService.getViolations({ search: query });
      return response;
    } catch (error) {
      console.error('Search error:', error);
      return { success: false, error: error.message };
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    searchQuery,
    isSearching,
    performSearch,
    clearSearch
  };
};

// Хелпер для пагінації
export const useViolationPagination = (initialPage = 1, initialPageSize = 10) => {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const goToPage = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const changePageSize = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setPage(1); // Повертаємося до першої сторінки
  }, []);

  const nextPage = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  const prevPage = useCallback(() => {
    setPage(prev => Math.max(1, prev - 1));
  }, []);

  return {
    page,
    pageSize,
    goToPage,
    changePageSize,
    nextPage,
    prevPage
  };
};