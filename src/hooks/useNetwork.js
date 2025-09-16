// src/hooks/useNetwork.js
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_ACTIONS_KEY = 'offlineActions';
const NETWORK_STATS_KEY = 'networkStats';

export const useNetwork = () => {
  // Стани мережі
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [networkQuality, setNetworkQuality] = useState('good');
  const [lastChecked, setLastChecked] = useState(new Date());
  const [networkStats, setNetworkStats] = useState({
    onlineTime: 0,
    offlineTime: 0,
    connectionChanges: 0,
    failedRequests: 0,
    successfulRequests: 0,
  });

  // Refs
  const networkListeners = useRef([]);
  const offlineActions = useRef([]);
  const connectionStartTime = useRef(Date.now());
  const statsInterval = useRef(null);
  const networkCheckInterval = useRef(null);

  // Завантаження офлайн дій та статистики
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        // Завантаження офлайн дій
        const storedActions = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
        if (storedActions) {
          offlineActions.current = JSON.parse(storedActions);
        }

        // Завантаження статистики
        const storedStats = await AsyncStorage.getItem(NETWORK_STATS_KEY);
        if (storedStats) {
          setNetworkStats(JSON.parse(storedStats));
        }
      } catch (error) {
        console.error('Error loading stored network data:', error);
      }
    };

    loadStoredData();
  }, []);

  // Відстеження змін мережі
  useEffect(() => {
    // Функція для перевірки стану мережі
    const checkNetworkStatus = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        
        // Для перевірки інтернету використовуємо простий пінг
        let internetReachable = true;
        try {
          // Спроба зробити простий запит
          await fetch('https://httpbin.org/get', { 
            method: 'HEAD', 
            timeout: 5000 
          });
        } catch (pingError) {
          internetReachable = false;
        }
        
        const state = {
          isConnected: networkState.isConnected,
          isInternetReachable: internetReachable,
          type: networkState.type || 'unknown',
          details: networkState
        };
        
        handleNetworkChange(state);
      } catch (error) {
        console.error('Network status check error:', error);
        // За замовчуванням вважаємо, що є з'єднання
        handleNetworkChange({
          isConnected: true,
          isInternetReachable: true,
          type: 'unknown',
          details: {}
        });
      }
    };

    // Ініціалізація мережі
    checkNetworkStatus();

    // Встановлення інтервалу для періодичної перевірки
    networkCheckInterval.current = setInterval(checkNetworkStatus, 3000); // Кожні 3 секунди

    // Інтервал для оновлення статистики
    statsInterval.current = setInterval(updateNetworkStats, 60000); // Кожну хвилину

    return () => {
      if (networkCheckInterval.current) {
        clearInterval(networkCheckInterval.current);
      }
      if (statsInterval.current) {
        clearInterval(statsInterval.current);
      }
    };
  }, []);

  // Обробка змін мережі
  const handleNetworkChange = useCallback((state) => {
    const {
      isConnected: newIsConnected,
      isInternetReachable: newIsInternetReachable,
      type: newConnectionType,
    } = state;

    setIsConnected(newIsConnected);
    setIsInternetReachable(newIsInternetReachable);
    setConnectionType(newConnectionType);
    setLastChecked(new Date());

    // Визначення якості мережі
    const quality = determineNetworkQuality(state);
    setNetworkQuality(quality);

    // Оновлення часу підключення
    const currentTime = Date.now();
    const timeElapsed = currentTime - connectionStartTime.current;
    connectionStartTime.current = currentTime;

    // Оновлення статистики
    setNetworkStats(prev => ({
      ...prev,
      connectionChanges: prev.connectionChanges + 1,
      onlineTime: newIsConnected ? prev.onlineTime + timeElapsed : prev.onlineTime,
      offlineTime: !newIsConnected ? prev.offlineTime + timeElapsed : prev.offlineTime,
    }));

    // Виклик слухачів
    networkListeners.current.forEach(callback => {
      try {
        callback({
          isConnected: newIsConnected,
          isInternetReachable: newIsInternetReachable,
          connectionType: newConnectionType,
          networkQuality: quality,
        });
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });

    // Якщо з'єднання відновлено - спроба виконати офлайн дії
    if (newIsConnected && newIsInternetReachable && offlineActions.current.length > 0) {
      retryFailedRequests();
    }
  }, []);

  // Визначення якості мережі
  const determineNetworkQuality = useCallback((state) => {
    if (!state.isConnected) return 'none';
    
    const { type } = state;
    
    // Якість для мобільного з'єднання
    if (type === 'CELLULAR') {
      return 'fair';
    }
    
    // Якість для WiFi
    if (type === 'WIFI') {
      return 'good';
    }
    
    return 'good';
  }, []);

  // Оновлення статистики мережі
  const updateNetworkStats = useCallback(async () => {
    try {
      await AsyncStorage.setItem(NETWORK_STATS_KEY, JSON.stringify(networkStats));
    } catch (error) {
      console.error('Error saving network stats:', error);
    }
  }, [networkStats]);

  // Перевірка, чи є інтернет
  const isOnline = useCallback(() => {
    return isConnected && isInternetReachable;
  }, [isConnected, isInternetReachable]);

  // Отримання типу підключення
  const getConnectionType = useCallback(() => {
    return connectionType;
  }, [connectionType]);

  // Додавання слухача мережі
  const addNetworkListener = useCallback((callback) => {
    if (typeof callback === 'function') {
      networkListeners.current.push(callback);
      return () => {
        networkListeners.current = networkListeners.current.filter(cb => cb !== callback);
      };
    }
  }, []);

  // Видалення слухача мережі
  const removeNetworkListener = useCallback((callback) => {
    networkListeners.current = networkListeners.current.filter(cb => cb !== callback);
  }, []);

  // Retry механізм для невдалих запитів
  const retryFailedRequests = useCallback(async () => {
    if (!isOnline() || offlineActions.current.length === 0) {
      return { success: false, message: 'No internet or no pending actions' };
    }

    const actionsToRetry = [...offlineActions.current];
    const successfulActions = [];
    const failedActions = [];

    for (const action of actionsToRetry) {
      try {
        const result = await executeOfflineAction(action);
        if (result.success) {
          successfulActions.push(action);
        } else {
          failedActions.push(action);
        }
      } catch (error) {
        failedActions.push(action);
      }
    }

    // Оновлення списку офлайн дій
    offlineActions.current = failedActions;
    await saveOfflineActions();

    // Оновлення статистики
    setNetworkStats(prev => ({
      ...prev,
      successfulRequests: prev.successfulRequests + successfulActions.length,
      failedRequests: prev.failedRequests + failedActions.length,
    }));

    return {
      success: true,
      successful: successfulActions.length,
      failed: failedActions.length,
    };
  }, [isOnline]);

  // Виконання офлайн дії
  const executeOfflineAction = useCallback(async (action) => {
    try {
      const { type, payload, timestamp } = action;
      
      // Перевірка, чи дія не застаріла (старше 24 годин)
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        return { success: false, message: 'Action expired' };
      }

      // Виконання дії в залежності від типу
      switch (type) {
        case 'violation_create':
          // Виклик API для створення правопорушення
          // const response = await api.createViolation(payload);
          // return { success: true, data: response };
          return { success: true, data: { id: `synced_${Date.now()}` } };
          
        case 'violation_update':
          // Виклик API для оновлення правопорушення
          // const response = await api.updateViolation(payload.id, payload.data);
          // return { success: true, data: response };
          return { success: true, data: { id: payload.id } };
          
        case 'violation_delete':
          // Виклик API для видалення правопорушення
          // const response = await api.deleteViolation(payload.id);
          // return { success: true, data: response };
          return { success: true, data: { id: payload.id } };
          
        default:
          return { success: false, message: 'Unknown action type' };
      }
    } catch (error) {
      console.error('Error executing offline action:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Додавання офлайн дії в чергу
  const queueOfflineAction = useCallback(async (type, payload) => {
    try {
      const action = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        payload,
        timestamp: Date.now(),
        retries: 0,
      };

      offlineActions.current.push(action);
      await saveOfflineActions();

      return { success: true, action };
    } catch (error) {
      console.error('Error queuing offline action:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Збереження офлайн дій
  const saveOfflineActions = useCallback(async () => {
    try {
      await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(offlineActions.current));
    } catch (error) {
      console.error('Error saving offline actions:', error);
    }
  }, []);

  // Отримання статистики мережі
  const getNetworkStats = useCallback(() => {
    return {
      ...networkStats,
      isConnected,
      connectionType,
      networkQuality,
      lastChecked,
      pendingActions: offlineActions.current.length,
    };
  }, [networkStats, isConnected, connectionType, networkQuality, lastChecked]);

  // Очищення офлайн дій
  const clearOfflineActions = useCallback(async () => {
    try {
      offlineActions.current = [];
      await AsyncStorage.removeItem(OFFLINE_ACTIONS_KEY);
      return { success: true };
    } catch (error) {
      console.error('Error clearing offline actions:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // Отримання списку офлайн дій
  const getOfflineActions = useCallback(() => {
    return [...offlineActions.current];
  }, []);

  // Оновлення якості мережі вручну
  const checkNetworkQuality = useCallback(async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      
      // Для перевірки інтернету використовуємо простий пінг
      let internetReachable = true;
      try {
        await fetch('https://httpbin.org/get', { 
          method: 'HEAD', 
          timeout: 5000 
        });
      } catch (pingError) {
        internetReachable = false;
      }
      
      const state = {
        isConnected: networkState.isConnected,
        isInternetReachable: internetReachable,
        type: networkState.type || 'unknown',
        details: networkState
      };
      
      const quality = determineNetworkQuality(state);
      setNetworkQuality(quality);
      return quality;
    } catch (error) {
      console.error('Error checking network quality:', error);
      return 'unknown';
    }
  }, [determineNetworkQuality]);

  // Симуляція перевірки інтернету
  const pingInternet = useCallback(async () => {
    try {
      await fetch('https://httpbin.org/get', { 
        method: 'HEAD', 
        timeout: 5000 
      });
      setIsInternetReachable(true);
      return true;
    } catch (error) {
      setIsInternetReachable(false);
      return false;
    }
  }, []);

  return {
    // Стани
    isConnected,
    connectionType,
    isInternetReachable,
    networkQuality,
    lastChecked,
    networkStats,
    
    // Основні функції
    isOnline,
    getConnectionType,
    addNetworkListener,
    removeNetworkListener,
    retryFailedRequests,
    queueOfflineAction,
    getNetworkStats,
    
    // Додаткові функції
    clearOfflineActions,
    getOfflineActions,
    checkNetworkQuality,
    pingInternet,
  };
};


// Хелпер для автоматичного retry запитів
export const useNetworkRetry = () => {
  const { isOnline, queueOfflineAction } = useNetwork();
  const [retryQueue, setRetryQueue] = useState([]);

  const executeWithRetry = useCallback(async (action, maxRetries = 3) => {
    let attempts = 0;
    
    while (attempts < maxRetries) {
      try {
        if (isOnline()) {
          const result = await action();
          return { success: true, data: result };
        } else {
          throw new Error('No internet connection');
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxRetries) {
          // Додати в офлайн чергу
          const actionType = getActionType(action);
          const payload = getActionPayload(action);
          
          await queueOfflineAction(actionType, payload);
          
          return { 
            success: false, 
            error: error.message, 
            queued: true 
          };
        }
        
        // Затримка перед повторною спробою
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
  }, [isOnline, queueOfflineAction]);

  const getActionType = (action) => {
    // Визначення типу дії з функції
    if (action.name) {
      return action.name.replace('bound ', '');
    }
    return 'unknown';
  };

  const getActionPayload = (action) => {
    // Витягування payload з дії
    return {};
  };

  return {
    executeWithRetry,
    retryQueue,
  };
};

// Хелпер для моніторингу конкретних запитів
export const useRequestMonitor = () => {
  const { isOnline } = useNetwork();
  const [requests, setRequests] = useState([]);

  const trackRequest = useCallback((requestId, url, method) => {
    const request = {
      id: requestId,
      url,
      method,
      status: 'pending',
      timestamp: Date.now(),
    };
    
    setRequests(prev => [...prev, request]);
    
    return (status, response = null) => {
      setRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status, response, completedAt: Date.now() }
            : req
        )
      );
    };
  }, []);

  const getPendingRequests = useCallback(() => {
    return requests.filter(req => req.status === 'pending');
  }, [requests]);

  const getFailedRequests = useCallback(() => {
    return requests.filter(req => req.status === 'failed');
  }, [requests]);

  const clearRequests = useCallback(() => {
    setRequests([]);
  }, []);

  return {
    trackRequest,
    requests,
    getPendingRequests,
    getFailedRequests,
    clearRequests,
  };
};

// Хелпер для офлайн синхронізації
export const useOfflineSync = () => {
  const { 
    isOnline, 
    retryFailedRequests, 
    getOfflineActions,
    clearOfflineActions 
  } = useNetwork();
  
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    progress: 0,
    total: 0,
    completed: 0,
  });

  const syncOfflineData = useCallback(async () => {
    if (!isOnline()) {
      return { success: false, message: 'No internet connection' };
    }

    const actions = getOfflineActions();
    if (actions.length === 0) {
      return { success: true, message: 'No pending actions' };
    }

    setSyncStatus({
      isSyncing: true,
      progress: 0,
      total: actions.length,
      completed: 0,
    });

    try {
      const result = await retryFailedRequests();
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        progress: 100,
        completed: prev.total,
      }));

      return result;
    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
      }));

      return { success: false, error: error.message };
    }
  }, [isOnline, retryFailedRequests, getOfflineActions]);

  const cancelSync = useCallback(() => {
    setSyncStatus({
      isSyncing: false,
      progress: 0,
      total: 0,
      completed: 0,
    });
  }, []);

  return {
    syncStatus,
    syncOfflineData,
    cancelSync,
  };
};