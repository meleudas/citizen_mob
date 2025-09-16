// src/hooks/useLocation.js
import { useState, useEffect, useCallback, useRef } from 'react';
import locationService from '../services/locationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CACHE_KEY = 'locationCache';
const LOCATION_PERMISSION_KEY = 'locationPermission';

export const useLocation = () => {
  // Стани
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState('unknown');
  const [isWatching, setIsWatching] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Refs для відстеження
  const watchIdRef = useRef(null);
  const locationCallbackRef = useRef(null);

  // Перевірка дозволів на геолокацію
  const checkPermission = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await locationService.checkPermissions();
      
      if (result.success) {
        setPermission(result.state);
        await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, result.state);
        return result.state;
      } else {
        setPermission('denied');
        await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, 'denied');
        return 'denied';
      }
    } catch (err) {
      console.error('Permission check error:', err);
      setPermission('denied');
      return 'denied';
    } finally {
      setLoading(false);
    }
  }, []);

  // Запит дозволу на геолокацію
  const requestPermission = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await locationService.requestPermissions();
      
      if (result.success) {
        setPermission('granted');
        await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, 'granted');
        return { success: true, permission: 'granted' };
      } else {
        setPermission('denied');
        await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, 'denied');
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Permission request error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Отримання поточної позиції
  const getCurrentLocation = useCallback(async (options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await locationService.getCurrentPosition(options);
      
      if (result.success) {
        const locationData = result.data;
        setLocation(locationData);
        setLastUpdated(new Date());
        
        // Кешування позиції
        cacheLocation(locationData);
        
        return { success: true, data: locationData };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Get current location error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Відстеження переміщень
  const watchPosition = useCallback((callback, options = {}) => {
    try {
      const handlePositionUpdate = (result) => {
        if (result.success) {
          const locationData = result.data;
          setLocation(locationData);
          setLastUpdated(new Date());
          
          // Кешування позиції
          cacheLocation(locationData);
          
          // Виклик callback
          if (callback) {
            callback(locationData);
          }
        } else {
          console.error('Watch position error:', result.error);
          setError(result.error);
        }
      };
      
      const watchId = locationService.watchPosition(handlePositionUpdate, options);
      
      if (watchId !== null) {
        watchIdRef.current = watchId;
        locationCallbackRef.current = callback;
        setIsWatching(true);
      }
    } catch (err) {
      console.error('Watch position error:', err);
      setError(err.message);
    }
  }, []);

  // Зупинка відстеження
  const stopWatching = useCallback(() => {
    locationService.clearWatch();
    watchIdRef.current = null;
    locationCallbackRef.current = null;
    setIsWatching(false);
  }, []);

  // Кешування позиції
  const cacheLocation = useCallback(async (locationData) => {
    try {
      const cacheData = {
        location: locationData,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cacheData));
    } catch (err) {
      console.error('Location cache error:', err);
    }
  }, []);

  // Отримання кешованої позиції
  const getCachedLocation = useCallback(async () => {
    try {
      const cachedData = await AsyncStorage.getItem(LOCATION_CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        // Перевірка, чи кеш ще не застарів (10 хвилин)
        if (Date.now() - parsed.timestamp < 600000) {
          return parsed.location;
        }
      }
      return null;
    } catch (err) {
      console.error('Get cached location error:', err);
      return null;
    }
  }, []);

  // Зворотне геокодування (отримання адреси за координатами)
  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await locationService.reverseGeocode(lat, lng);
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Reverse geocode error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Геокодування (отримання координат за адресою)
  const geocode = useCallback(async (address) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await locationService.geocode(address);
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        setError(result.error);
        return { success: false, error: result.error };
      }
    } catch (err) {
      console.error('Geocode error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Отримання адреси з локації
  const getAddressFromLocation = useCallback(async (locationData) => {
    if (!locationData) {
      return { success: false, error: 'Немає даних локації' };
    }
    
    return await reverseGeocode(locationData.latitude, locationData.longitude);
  }, [reverseGeocode]);

  // Розрахунок відстані між двома точками
  const getDistance = useCallback((location1, location2, unit = 'km') => {
    if (!location1 || !location2) {
      return { success: false, error: 'Немає даних локації' };
    }

    const result = locationService.calculateDistance(
      location1.latitude, 
      location1.longitude, 
      location2.latitude, 
      location2.longitude,
      unit
    );
    
    return result;
  }, []);

  // Отримання напрямку між двома точками
  const getBearing = useCallback((location1, location2) => {
    if (!location1 || !location2) {
      return 0;
    }

    const { latitude: lat1, longitude: lng1 } = location1;
    const { latitude: lat2, longitude: lng2 } = location2;

    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) -
              Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    const bearing = (θ * 180/Math.PI + 360) % 360;

    return bearing;
  }, []);

  // Форматування координат
  const formatCoordinates = useCallback((latitude, longitude, precision = 6) => {
    return locationService.formatCoordinates(latitude, longitude, precision);
  }, []);

  // Перевірка валідності координат
  const isValidCoordinates = useCallback((latitude, longitude) => {
    return locationService.isValidCoordinates(latitude, longitude);
  }, []);

  // Очищення помилок
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Очищення кешу
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(LOCATION_CACHE_KEY);
    } catch (err) {
      console.error('Clear cache error:', err);
    }
  }, []);

  // Ефект для очищення при демонтажі
  useEffect(() => {
    return () => {
      if (locationService.isWatchingPosition()) {
        locationService.clearWatch();
      }
    };
  }, []);

  return {
    // Стани
    location,
    loading,
    error,
    permission,
    isWatching,
    lastUpdated,
    
    // Основні функції
    getCurrentLocation,
    watchPosition,
    stopWatching,
    reverseGeocode,
    geocode,
    getAddressFromLocation,
    getDistance,
    getBearing,
    formatCoordinates,
    isValidCoordinates,
    
    // Управління станом
    checkPermission,
    requestPermission,
    getCachedLocation,
    clearError,
    clearCache,
  };
};

// Хелпер для фонової геолокації
export const useBackgroundLocation = () => {
  const [isBackgroundLocationEnabled, setIsBackgroundLocationEnabled] = useState(false);
  const [backgroundLocation, setBackgroundLocation] = useState(null);

  const enableBackgroundLocation = useCallback(async () => {
    try {
      // Налаштування фонової геолокації через locationService
      // (при потребі можна розширити locationService для підтримки фонової геолокації)
      
      setIsBackgroundLocationEnabled(true);
      return { success: true };
    } catch (error) {
      console.error('Enable background location error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const disableBackgroundLocation = useCallback(async () => {
    try {
      // Вимкнення фонової геолокації
      
      setIsBackgroundLocationEnabled(false);
      return { success: true };
    } catch (error) {
      console.error('Disable background location error:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    isBackgroundLocationEnabled,
    backgroundLocation,
    enableBackgroundLocation,
    disableBackgroundLocation,
  };
};

// Хелпер для геозон
export const useGeofencing = () => {
  const [geofences, setGeofences] = useState([]);
  const [activeGeofences, setActiveGeofences] = useState([]);

  const addGeofence = useCallback((geofence) => {
    setGeofences(prev => [...prev, geofence]);
  }, []);

  const removeGeofence = useCallback((id) => {
    setGeofences(prev => prev.filter(g => g.id !== id));
  }, []);

  const activateGeofence = useCallback((id) => {
    setActiveGeofences(prev => [...prev, id]);
  }, []);

  const deactivateGeofence = useCallback((id) => {
    setActiveGeofences(prev => prev.filter(g => g !== id));
  }, []);

  return {
    geofences,
    activeGeofences,
    addGeofence,
    removeGeofence,
    activateGeofence,
    deactivateGeofence,
  };
};

// Хелпер для кешування адрес
export const useAddressCache = () => {
  const ADDRESS_CACHE_KEY = 'addressCache';
  const [addressCache, setAddressCache] = useState({});

  const cacheAddress = useCallback(async (coordinates, address) => {
    try {
      const key = `${coordinates.latitude},${coordinates.longitude}`;
      const cacheData = {
        address,
        timestamp: Date.now(),
      };
      
      const currentCache = await AsyncStorage.getItem(ADDRESS_CACHE_KEY);
      const parsedCache = currentCache ? JSON.parse(currentCache) : {};
      parsedCache[key] = cacheData;
      
      await AsyncStorage.setItem(ADDRESS_CACHE_KEY, JSON.stringify(parsedCache));
      setAddressCache(parsedCache);
    } catch (err) {
      console.error('Cache address error:', err);
    }
  }, []);

  const getCachedAddress = useCallback(async (coordinates) => {
    try {
      const key = `${coordinates.latitude},${coordinates.longitude}`;
      const currentCache = await AsyncStorage.getItem(ADDRESS_CACHE_KEY);
      const parsedCache = currentCache ? JSON.parse(currentCache) : {};
      
      const cachedData = parsedCache[key];
      if (cachedData && Date.now() - cachedData.timestamp < 86400000) { // 24 години
        return cachedData.address;
      }
      
      return null;
    } catch (err) {
      console.error('Get cached address error:', err);
      return null;
    }
  }, []);

  const clearAddressCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(ADDRESS_CACHE_KEY);
      setAddressCache({});
    } catch (err) {
      console.error('Clear address cache error:', err);
    }
  }, []);

  return {
    addressCache,
    cacheAddress,
    getCachedAddress,
    clearAddressCache,
  };
};