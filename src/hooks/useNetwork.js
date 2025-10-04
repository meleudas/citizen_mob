// src/hooks/useNetwork.js
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OFFLINE_ACTIONS_KEY = 'offlineActions';
const NETWORK_STATS_KEY = 'networkStats';
const SERVER_PING_URL = 'http://192.168.3.22:3000/api/ping';

export const useNetwork = () => {
  // Стани мережі
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState('unknown');
  const [isInternetReachable, setIsInternetReachable] = useState(true);
  const [isServerReachable, setIsServerReachable] = useState(true); // Додано: новий стан
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
        const storedActions = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
        if (storedActions) {
          offlineActions.current = JSON.parse(storedActions);
        }

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
    const checkNetworkStatus = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();

        const state = {
          isConnected: networkState.isConnected,
          isInternetReachable: networkState.isInternetReachable,
          type: networkState.type || 'unknown',
          details: networkState,
        };

        // Додано: перевіряємо досягнення сервера
        const serverReachable = await checkServerReachable();

        handleNetworkChange({ ...state, isServerReachable: serverReachable });
      } catch (error) {
        console.error('Network status check error:', error);
        handleNetworkChange({
          isConnected: false,
          isInternetReachable: false,
          isServerReachable: false, // Додано: вважаємо сервер недосягненим при помилці
          type: 'unknown',
          details: {},
        });
      }
    };

    // Ініціалізація
    checkNetworkStatus();

    networkCheckInterval.current = setInterval(checkNetworkStatus, 3000);
    statsInterval.current = setInterval(updateNetworkStats, 60000);

    return () => {
      if (networkCheckInterval.current) clearInterval(networkCheckInterval.current);
      if (statsInterval.current) clearInterval(statsInterval.current);
    };
  }, []);

  const checkServerReachable = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(SERVER_PING_URL, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        }
      });
      clearTimeout(timeoutId);

      // Якщо отримали відповідь (навіть 4xx/5xx), сервер доступний
      return response.ok || response.status < 500;
    } catch (error) {
      console.error('Server ping error:', error);
      return false;
    }
  }, []);

  const handleNetworkChange = useCallback((state) => {
    const {
      isConnected: newIsConnected,
      isInternetReachable: newIsInternetReachable,
      isServerReachable: newIsServerReachable, // Додано: отримуємо новий стан
      type: newConnectionType,
    } = state;

    setIsConnected(newIsConnected);
    setIsInternetReachable(newIsInternetReachable);
    setIsServerReachable(newIsServerReachable); // Додано: оновлюємо новий стан
    setConnectionType(newConnectionType);
    setLastChecked(new Date());

    const quality = determineNetworkQuality(state);
    setNetworkQuality(quality);

    const currentTime = Date.now();
    const timeElapsed = currentTime - connectionStartTime.current;
    connectionStartTime.current = currentTime;

    setNetworkStats((prev) => ({
      ...prev,
      connectionChanges: prev.connectionChanges + 1,
      onlineTime: newIsConnected ? prev.onlineTime + timeElapsed : prev.onlineTime,
      offlineTime: !newIsConnected ? prev.offlineTime + timeElapsed : prev.offlineTime,
    }));

    networkListeners.current.forEach((callback) => {
      try {
        callback({
          isConnected: newIsConnected,
          isInternetReachable: newIsInternetReachable,
          isServerReachable: newIsServerReachable, // Додано: передаємо новий стан
          connectionType: newConnectionType,
          networkQuality: quality,
        });
      } catch (error) {
        console.error('Network listener error:', error);
      }
    });

    // Повтор офлайн-дій при відновленні зв’язку з сервером
    if (newIsConnected && newIsServerReachable && offlineActions.current.length > 0) {
      retryFailedRequests();
    }
  }, [determineNetworkQuality, retryFailedRequests]);

  const determineNetworkQuality = useCallback((state) => {
    if (!state.isConnected) return 'none';
    if (state.type === 'CELLULAR') return 'fair';
    if (state.type === 'WIFI') return 'good';
    return 'good';
  }, []);

  const updateNetworkStats = useCallback(async () => {
    try {
      await AsyncStorage.setItem(NETWORK_STATS_KEY, JSON.stringify(networkStats));
    } catch (error) {
      console.error('Error saving network stats:', error);
    }
  }, [networkStats]);

  // Змінено: isOnline тепер залежить від isServerReachable
  const isOnline = useCallback(() => {
    // isConnected && isInternetReachable && isServerReachable
    return isConnected && isInternetReachable && isServerReachable;
  }, [isConnected, isInternetReachable, isServerReachable]); // Додано залежність від isServerReachable

  // isOnlineToServer залишається без змін, але вона тепер еквівалентна isOnline
  // Якщо вам потрібна різниця між "є інтернет" і "є інтернет і сервер досягнений", залиште isOnlineToServer
  const isOnlineToServer = useCallback(() => {
    return isConnected && isServerReachable;
  }, [isConnected, isServerReachable]);

  const getConnectionType = useCallback(() => connectionType, [connectionType]);

  const addNetworkListener = useCallback((callback) => {
    if (typeof callback === 'function') {
      networkListeners.current.push(callback);
      return () => {
        networkListeners.current = networkListeners.current.filter((cb) => cb !== callback);
      };
    }
  }, []);

  const removeNetworkListener = useCallback((callback) => {
    networkListeners.current = networkListeners.current.filter((cb) => cb !== callback);
  }, []);

    
  const executeOfflineAction = useCallback(async (action) => {
    try {
      const { type, payload, timestamp } = action;
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        return { success: false, message: 'Action expired' };
      }

      switch (type) {
        case 'violation_create':
        case 'violation_update':
        case 'violation_delete':
          // Виправлено: додано ключ 'data'
          return { success: true, data: { id: payload?.id || `synced_${Date.now()}` } };
        default:
          return { success: false, message: 'Unknown action type' };
      }
    } catch (error) {
      console.error('Error executing offline action:', error);
      return { success: false, error: error.message };
    }
  }, []);

  const retryFailedRequests = useCallback(async () => {
    // Змінено: перевіряємо isOnlineToServer або isConnected && isServerReachable
    if (!isOnlineToServer() || offlineActions.current.length === 0) {
      return { success: false, message: 'No connection to server or no pending actions' };
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

    offlineActions.current = failedActions;
    await saveOfflineActions();

    setNetworkStats((prev) => ({
      ...prev,
      successfulRequests: prev.successfulRequests + successfulActions.length,
      failedRequests: prev.failedRequests + failedActions.length,
    }));

    return {
      success: true,
      successful: successfulActions.length,
      failed: failedActions.length,
    };
  }, [isOnlineToServer, executeOfflineAction, saveOfflineActions]);

  const saveOfflineActions = useCallback(async () => {
    try {
      await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(offlineActions.current));
    } catch (error) {
      console.error('Error saving offline actions:', error);
    }
  }, []);

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
  }, [saveOfflineActions]);

  const getNetworkStats = useCallback(() => {
    return {
      ...networkStats,
      isConnected,
      connectionType,
      networkQuality,
      lastChecked,
      pendingActions: offlineActions.current.length,
      isServerReachable, // Додано: новий стан до статистики
    };
  }, [networkStats, isConnected, connectionType, networkQuality, lastChecked, isServerReachable]);

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

  const getOfflineActions = useCallback(() => {
    return [...offlineActions.current];
  }, []);

  return {
    // Стани
    isConnected,
    connectionType,
    isInternetReachable,
    isServerReachable, // Додано: новий стан
    networkQuality,
    lastChecked,
    networkStats,

    // Основні функції
    isOnline, // Тепер враховує isServerReachable
    isOnlineToServer, // Залишається для випадків, якщо потрібна різниця
    getConnectionType,
    addNetworkListener,
    removeNetworkListener,
    retryFailedRequests,
    queueOfflineAction,
    getNetworkStats,

    // Додаткові
    clearOfflineActions,
    getOfflineActions,
  };
};

// --- Хелпери ---

export const useNetworkRetry = () => {
  // Змінено: використовуємо isOnline, яке тепер враховує сервер
  const { isOnline, queueOfflineAction } = useNetwork();
  const [retryQueue, setRetryQueue] = useState([]);

  const executeWithRetry = useCallback(
    async (action, maxRetries = 3) => {
      let attempts = 0;
      while (attempts < maxRetries) {
        try {
          // Змінено: перевіряємо isOnline (яке тепер враховує сервер)
          if (isOnline()) {
            const result = await action();
            return { success: true,  result };
          } else {
            throw new Error('No connection to server'); // Оновлено повідомлення
          }
        } catch (error) {
          attempts++;
          if (attempts >= maxRetries) {
            const actionType = action.name?.replace('bound ', '') || 'unknown';
            await queueOfflineAction(actionType, {});
            return { success: false, error: error.message, queued: true };
          }
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
        }
      }
    },
    [isOnline, queueOfflineAction] // Змінено: залежність
  );

  return { executeWithRetry, retryQueue };
};

export const useRequestMonitor = () => {
  // Змінено: використовуємо isOnline, яке тепер враховує сервер
  const { isOnline } = useNetwork();
  const [requests, setRequests] = useState([]);

  const trackRequest = useCallback((requestId, url, method) => {
    const request = { id: requestId, url, method, status: 'pending', timestamp: Date.now() };
    setRequests((prev) => [...prev, request]);
    return (status, response = null) => {
      setRequests((prev) =>
        prev.map((req) => (req.id === requestId ? { ...req, status, response, completedAt: Date.now() } : req))
      );
    };
  }, []);

  const getPendingRequests = useCallback(() => requests.filter((req) => req.status === 'pending'), [requests]);
  const getFailedRequests = useCallback(() => requests.filter((req) => req.status === 'failed'), [requests]);
  const clearRequests = useCallback(() => setRequests([]), []);

  return { trackRequest, requests, getPendingRequests, getFailedRequests, clearRequests };
};

export const useOfflineSync = () => {
  // Змінено: використовуємо isOnline, яке тепер враховує сервер
  const { isOnline, retryFailedRequests, getOfflineActions } = useNetwork(); // isOnline тепер враховує сервер
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    progress: 0,
    total: 0,
    completed: 0,
  });

  const syncOfflineData = useCallback(async () => {
    // Змінено: перевіряємо isOnline (яке тепер враховує сервер)
    if (!isOnline()) {
      return { success: false, message: 'No connection to server' }; // Оновлено повідомлення
    }

    const actions = getOfflineActions();
    if (actions.length === 0) {
      return { success: true, message: 'No pending actions' };
    }

    setSyncStatus({ isSyncing: true, progress: 0, total: actions.length, completed: 0 });

    try {
      const result = await retryFailedRequests();
      setSyncStatus((prev) => ({ ...prev, isSyncing: false, progress: 100, completed: prev.total }));
      return result;
    } catch (error) {
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
      return { success: false, error: error.message };
    }
  }, [isOnline, retryFailedRequests, getOfflineActions]); // Змінено: залежність

  const cancelSync = useCallback(() => {
    setSyncStatus({ isSyncing: false, progress: 0, total: 0, completed: 0 });
  }, []);

  return { syncStatus, syncOfflineData, cancelSync };
};