// src/hooks/useSync.js
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import syncService from '../services/syncService';
import { useNetwork } from './useNetwork';

const SYNC_STATUS_KEY = 'syncStatus';
const LAST_SYNC_KEY = 'lastSyncTime';
const OFFLINE_VIOLATIONS_KEY = 'offline_violations';
const SYNC_SETTINGS_KEY = 'syncSettings';

export const useSync = () => {
  // Стани синхронізації
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [nextSync, setNextSync] = useState(null);
  const [syncErrors, setSyncErrors] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [offlineViolations, setOfflineViolations] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  
  // Налаштування синхронізації
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: 300000, // 5 хвилин
    batchSize: 10,
    retryAttempts: 3,
    resolveConflicts: 'server', // server, local, merge
  });
  
  // Refs
  const syncIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const network = useNetwork();
  
  // Завантаження збережених даних
  useEffect(() => {
    const loadSyncData = async () => {
      try {
        // Завантаження останньої синхронізації
        const lastSyncTime = await AsyncStorage.getItem(LAST_SYNC_KEY);
        if (lastSyncTime) {
          setLastSync(new Date(parseInt(lastSyncTime)));
        }
        
        // Завантаження офлайн правопорушень
        const storedViolations = await AsyncStorage.getItem(OFFLINE_VIOLATIONS_KEY);
        if (storedViolations) {
          const violations = JSON.parse(storedViolations);
          setOfflineViolations(violations);
          setPendingCount(violations.length);
        }
        
        // Завантаження налаштувань
        const storedSettings = await AsyncStorage.getItem(SYNC_SETTINGS_KEY);
        if (storedSettings) {
          setSyncSettings(JSON.parse(storedSettings));
        }
        
        // Завантаження статусу синхронізації
        const storedStatus = await AsyncStorage.getItem(SYNC_STATUS_KEY);
        if (storedStatus) {
          const status = JSON.parse(storedStatus);
          setIsSyncing(status.isSyncing);
          setSyncProgress(status.syncProgress);
        }
      } catch (error) {
        console.error('Error loading sync data:', error);
      }
    };
    
    loadSyncData();
    
    // Підписка на події синхронізації
    const unsubscribeSync = syncService.addSyncListener((syncEvent) => {
      console.log('Sync event received:', syncEvent);
      // Оновлення UI з статусом синхронізації
    });

    // Підписка на конфлікти
    const unsubscribeConflict = syncService.addConflictListener((conflict) => {
      console.log('Conflict detected:', conflict);
      setConflicts(prev => [...prev, conflict]);
    });

    return () => {
      isMountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      unsubscribeSync();
      unsubscribeConflict();
    };
  }, []);
  
  // Автоматична синхронізація
  useEffect(() => {
    if (syncSettings.autoSync && network.isOnline() && network.isInternetReachable) {
      // Початкова синхронізація
      if (offlineViolations.length > 0) {
        syncData();
      }
      
      // Встановлення інтервалу синхронізації
      syncIntervalRef.current = setInterval(() => {
        if (network.isOnline() && network.isInternetReachable && offlineViolations.length > 0) {
          syncData();
        }
      }, syncSettings.syncInterval);
    }
    
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [syncSettings.autoSync, syncSettings.syncInterval, network, offlineViolations.length]);
  
  // Збереження статусу синхронізації
  useEffect(() => {
    const saveSyncStatus = async () => {
      try {
        const status = {
          isSyncing,
          syncProgress,
          timestamp: Date.now(),
        };
        await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
      } catch (error) {
        console.error('Error saving sync status:', error);
      }
    };
    
    saveSyncStatus();
  }, [isSyncing, syncProgress]);
  
  // Синхронізація даних
  const syncData = useCallback(async () => {
    if (isSyncing || !network.isOnline() || !network.isInternetReachable) {
      return { success: false, message: 'Sync already in progress or offline' };
    }
    
    try {
      setIsSyncing(true);
      setSyncProgress(0);
      setSyncErrors([]);
      
      const result = await syncService.syncViolations();
      
      if (result.success) {
        // Оновлення офлайн правопорушень
        const remainingViolations = await syncService.getOfflineViolations();
        setOfflineViolations(remainingViolations);
        setPendingCount(remainingViolations.length);
        
        // Оновлення часу синхронізації
        const syncTime = new Date();
        setLastSync(syncTime);
        await AsyncStorage.setItem(LAST_SYNC_KEY, syncTime.getTime().toString());
        
        // Оновлення наступної синхронізації
        const nextSyncTime = new Date(syncTime.getTime() + syncSettings.syncInterval);
        setNextSync(nextSyncTime);
        
        setIsSyncing(false);
        setSyncProgress(100);
        
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
      
      const errorInfo = {
        message: error.message,
        timestamp: new Date(),
        items: offlineViolations.length,
      };
      
      setSyncErrors(prev => [...prev, errorInfo]);
      setIsSyncing(false);
      
      return { success: false, error: error.message };
    }
  }, [isSyncing, network, offlineViolations, syncSettings]);
  
  // Ручна синхронізація
  const manualSync = useCallback(async () => {
    if (!network.isOnline() || !network.isInternetReachable) {
      return { success: false, message: 'No internet connection' };
    }
    
    return await syncData();
  }, [syncData, network]);
  
  // Вирішення конфлікту
  const resolveConflict = useCallback(async (localViolation, serverData, resolution = 'server') => {
    try {
      const result = await syncService.resolveConflict(localViolation, serverData, resolution);
      
      if (result.success) {
        // Видаляємо вирішений конфлікт
        setConflicts(prev => prev.filter(conflict => 
          conflict.localViolation.localId !== localViolation.localId
        ));
      }
      
      return result;
    } catch (error) {
      console.error('Error resolving conflict:', error);
      return { success: false, error: error.message };
    }
  }, []);
  
  // Отримання статусу синхронізації
  const getSyncStatus = useCallback(() => {
    return syncService.getSyncStatus();
  }, []);
  
  // Отримання часу останньої синхронізації
  const getLastSyncTime = useCallback(() => {
    return lastSync;
  }, [lastSync]);
  
  // Призупинення синхронізації
  const pauseSync = useCallback(() => {
    syncService.setAutoSync(false);
    setSyncSettings(prev => ({
      ...prev,
      autoSync: false,
    }));
    
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    
    return { success: true };
  }, []);
  
  // Відновлення синхронізації
  const resumeSync = useCallback(() => {
    syncService.setAutoSync(true);
    setSyncSettings(prev => ({
      ...prev,
      autoSync: true,
    }));
    
    return { success: true };
  }, []);
  
  // Збереження офлайн правопорушення
  const saveOfflineViolation = useCallback(async (violationData) => {
    try {
      const result = await syncService.saveOfflineViolation(violationData);
      
      if (result.success) {
        // Оновлення локального стану
        const updatedViolations = await syncService.getOfflineViolations();
        setOfflineViolations(updatedViolations);
        setPendingCount(updatedViolations.length);
      }
      
      return result;
    } catch (error) {
      console.error('Error saving offline violation:', error);
      return { success: false, error: error.message };
    }
  }, []);
  
  // Отримання офлайн правопорушень
  const getOfflineViolations = useCallback(async () => {
    try {
      const violations = await syncService.getOfflineViolations();
      setOfflineViolations(violations);
      setPendingCount(violations.length);
      return violations;
    } catch (error) {
      console.error('Error getting offline violations:', error);
      return [];
    }
  }, []);
  
  // Очищення офлайн правопорушень
  const clearOfflineViolations = useCallback(async () => {
    try {
      const result = await syncService.clearOfflineViolations();
      
      if (result.success) {
        setOfflineViolations([]);
        setPendingCount(0);
      }
      
      return result;
    } catch (error) {
      console.error('Error clearing offline violations:', error);
      return { success: false, error: error.message };
    }
  }, []);
  
  // Оновлення налаштувань синхронізації
  const updateSyncSettings = useCallback(async (newSettings) => {
    try {
      const updatedSettings = { ...syncSettings, ...newSettings };
      setSyncSettings(updatedSettings);
      await AsyncStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(updatedSettings));
      
      // Оновлення налаштувань в сервісі
      if (newSettings.autoSync !== undefined) {
        syncService.setAutoSync(newSettings.autoSync);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating sync settings:', error);
      return { success: false, error: error.message };
    }
  }, [syncSettings]);
  
  // Очищення помилок синхронізації
  const clearSyncErrors = useCallback(() => {
    setSyncErrors([]);
  }, []);
  
  // Очищення вирішених конфліктів
  const clearResolvedConflicts = useCallback(() => {
    setConflicts([]);
  }, []);
  
  return {
    // Стани
    isSyncing,
    syncProgress,
    lastSync,
    nextSync,
    syncErrors,
    conflicts,
    offlineViolations,
    pendingCount,
    syncSettings,
    
    // Основні функції
    syncData,
    manualSync,
    resolveConflict,
    getSyncStatus,
    getLastSyncTime,
    pauseSync,
    resumeSync,
    
    // Додаткові функції
    saveOfflineViolation,
    getOfflineViolations,
    clearOfflineViolations,
    updateSyncSettings,
    clearSyncErrors,
    clearResolvedConflicts,
  };
};

// Хелпер для синхронізації правопорушень
export const useViolationSync = () => {
  const sync = useSync();
  
  const syncViolation = useCallback(async (violationData) => {
    return await sync.saveOfflineViolation(violationData);
  }, [sync]);
  
  const syncViolationsBatch = useCallback(async (violations) => {
    const results = [];
    
    for (const violation of violations) {
      const result = await syncViolation(violation);
      results.push(result);
    }
    
    return results;
  }, [syncViolation]);
  
  return {
    syncViolation,
    syncViolationsBatch,
    ...sync,
  };
};

// Хелпер для прогресу синхронізації
export const useSyncProgress = () => {
  const { syncProgress, isSyncing, pendingCount } = useSync();
  const [estimatedTime, setEstimatedTime] = useState(0);
  
  useEffect(() => {
    if (isSyncing && pendingCount > 0) {
      // Оцінка часу синхронізації (приблизно 2 секунди на 1 елемент)
      const estimated = pendingCount * 2000;
      setEstimatedTime(estimated);
    } else {
      setEstimatedTime(0);
    }
  }, [isSyncing, pendingCount]);
  
  const getFormattedProgress = useCallback(() => {
    return {
      percentage: syncProgress,
      items: pendingCount,
      estimatedTime,
      formattedTime: estimatedTime > 0 
        ? `${Math.ceil(estimatedTime / 1000)} сек` 
        : '0 сек',
    };
  }, [syncProgress, pendingCount, estimatedTime]);
  
  return {
    progress: syncProgress,
    isSyncing,
    pendingCount,
    estimatedTime,
    getFormattedProgress,
  };
};

// Хелпер для фонової синхронізації
export const useBackgroundSync = () => {
  const { syncData, syncSettings, isSyncing } = useSync();
  const [backgroundSyncActive, setBackgroundSyncActive] = useState(false);
  
  const startBackgroundSync = useCallback(() => {
    if (backgroundSyncActive) return;
    
    setBackgroundSyncActive(true);
    
    // Синхронізація кожні 30 секунд у фоновому режимі
    const interval = setInterval(() => {
      if (!isSyncing) {
        syncData();
      }
    }, 30000);
    
    return () => {
      clearInterval(interval);
      setBackgroundSyncActive(false);
    };
  }, [backgroundSyncActive, isSyncing, syncData]);
  
  return {
    backgroundSyncActive,
    startBackgroundSync,
  };
};