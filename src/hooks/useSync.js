// src/hooks/useSync.js
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import syncService from '../services/syncService';
import { useNetwork } from './useNetwork';

const SYNC_STATUS_KEY = 'syncStatus';
const LAST_SYNC_KEY = 'lastSyncTime';
const SYNC_SETTINGS_KEY = 'syncSettings';

// Утиліта для логування (лише в розробці)
const log = (...args) => {
  if (__DEV__) {
    console.log('[useSync]', new Date().toISOString(), ...args);
  }
};

export const useSync = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [lastSync, setLastSync] = useState(null);
  const [nextSync, setNextSync] = useState(null);
  const [syncErrors, setSyncErrors] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [offlineViolations, setOfflineViolations] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  
  const [syncSettings, setSyncSettings] = useState({
    autoSync: true,
    syncInterval: 300000, // 5 хвилин
    batchSize: 10,
    retryAttempts: 3,
    resolveConflicts: 'server',
  });
  
  const syncIntervalRef = useRef(null);
  const syncPromiseRef = useRef(null);
  const hasPendingRef = useRef(false);
  
  const { isOnline, isServerReachable } = useNetwork();

  // 🔁 Інтервал автосинхронізації
  useEffect(() => {
    log('🔄 Setting up auto-sync interval. Conditions:', {
      autoSync: syncSettings.autoSync,
      isOnline,
      isServerReachable,
    });

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    if (syncSettings.autoSync && isOnline && isServerReachable) {
      syncIntervalRef.current = setInterval(() => {
        if (offlineViolations.length > 0 && !isSyncing) {
          log('⏰ Interval triggered syncData()');
          syncData();
        }
      }, syncSettings.syncInterval);
    }

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
        log('⏹️ Cleaned up sync interval');
      }
    };
  }, [syncSettings.autoSync, syncSettings.syncInterval, isOnline, isServerReachable]);

  // 📥 Реакція на зміну offlineViolations
  useEffect(() => {
    setPendingCount(offlineViolations.length);
    log('📥 offlineViolations updated:', offlineViolations.length, 'items');

    if (
      offlineViolations.length > 0 &&
      !isSyncing &&
      syncSettings.autoSync &&
      isOnline &&
      isServerReachable
    ) {
      if (!hasPendingRef.current) {
        hasPendingRef.current = true;
        log('🚀 Triggering sync due to new offline data');
        syncData();
      } else {
        log('⏸️ Sync already pending for new data — skipping');
      }
    } else if (offlineViolations.length === 0) {
      hasPendingRef.current = false;
      log('✅ No pending violations — cleared pending flag');
    }
  }, [offlineViolations.length]);

  // 💾 Збереження статусу
  useEffect(() => {
    const saveSyncStatus = async () => {
      try {
        await AsyncStorage.setItem(SYNC_STATUS_KEY, JSON.stringify({
          isSyncing,
          syncProgress,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.error('[useSync] Error saving sync status:', error);
      }
    };
    saveSyncStatus();
    log('💾 Sync status saved:', { isSyncing, syncProgress });
  }, [isSyncing, syncProgress]);

  // 🔄 Основна синхронізація
  const syncData = useCallback(async () => {
    if (syncPromiseRef.current) {
      log('⏳ Sync already in progress — returning existing promise');
      return syncPromiseRef.current;
    }

    if (!isOnline || !isServerReachable) {
      log('🚫 Sync skipped: no internet');
      return { success: false, message: 'No internet connection' };
    }

    log('▶️ Starting syncData()');

    syncPromiseRef.current = (async () => {
      try {
        setIsSyncing(true);
        setSyncProgress(0);
        setSyncErrors([]);

        const result = await syncService.syncViolations();

        if (result.success) {
          const updatedViolations = await syncService.getOfflineViolations();
          setOfflineViolations(updatedViolations);

          const syncTime = new Date();
          setLastSync(syncTime);
          await AsyncStorage.setItem(LAST_SYNC_KEY, syncTime.getTime().toString());
          setNextSync(new Date(syncTime.getTime() + syncSettings.syncInterval));

          setSyncProgress(100);
          hasPendingRef.current = updatedViolations.length > 0;

          log('✅ Sync completed successfully. Remaining violations:', updatedViolations.length);
          return result;
        } else {
          throw new Error(result.error);
        }
      } catch (error) {
        console.error('[useSync] Sync error:', error);
        const errorInfo = {
          message: error.message,
          timestamp: new Date(),
          items: offlineViolations.length,
        };
        setSyncErrors(prev => [...prev, errorInfo]);
        log('❌ Sync failed:', error.message);
        return { success: false, error: error.message };
      } finally {
        setIsSyncing(false);
        syncPromiseRef.current = null;
        log('⏹️ Sync finished (success or error)');
      }
    })();

    return syncPromiseRef.current;
  }, [isOnline, isServerReachable, syncSettings.syncInterval]);

  // ✋ Ручна синхронізація
  const manualSync = useCallback(async () => {
    log('✋ manualSync() called');
    if (!isOnline || !isServerReachable) {
      log('🚫 Manual sync blocked: no internet');
      return { success: false, message: 'No internet connection' };
    }
    hasPendingRef.current = false;
    return await syncData();
  }, [syncData, isOnline, isServerReachable]);

  // 💾 Збереження офлайн правопорушення
  const saveOfflineViolation = useCallback(async (violationData) => {
    try {
      const result = await syncService.saveOfflineViolation(violationData);
      if (result.success) {
        const updatedViolations = await syncService.getOfflineViolations();
        setOfflineViolations(updatedViolations);
        log('📥 Saved new offline violation. Total:', updatedViolations.length);
      }
      return result;
    } catch (error) {
      console.error('[useSync] Error saving offline violation:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // 📥 Отримання офлайн правопорушень
  const getOfflineViolations = useCallback(async () => {
    try {
      const violations = await syncService.getOfflineViolations();
      setOfflineViolations(violations);
      log('📋 getOfflineViolations() →', violations.length, 'items');
      return violations;
    } catch (error) {
      console.error('[useSync] Error getting offline violations:', error);
      return [];
    }
  }, []);

  // 🧹 Очищення
  const clearOfflineViolations = useCallback(async () => {
    try {
      const result = await syncService.clearOfflineViolations();
      if (result.success) {
        setOfflineViolations([]);
        hasPendingRef.current = false;
        log('🧹 Cleared all offline violations');
      }
      return result;
    } catch (error) {
      console.error('[useSync] Error clearing violations:', error);
      return { success: false, error: error.message };
    }
  }, []);

  // ⚙️ Оновлення налаштувань
  const updateSyncSettings = useCallback(async (newSettings) => {
    try {
      const updated = { ...syncSettings, ...newSettings };
      setSyncSettings(updated);
      await AsyncStorage.setItem(SYNC_SETTINGS_KEY, JSON.stringify(updated));
      syncService.setAutoSync(updated.autoSync);
      log('⚙️ Sync settings updated:', updated);
      return { success: true };
    } catch (error) {
      console.error('[useSync] Error updating settings:', error);
      return { success: false, error: error.message };
    }
  }, [syncSettings]);

  // 🛑 Призупинення
  const pauseSync = useCallback(() => {
    log('⏸️ pauseSync() called');
    updateSyncSettings({ autoSync: false });
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
    return { success: true };
  }, [updateSyncSettings]);

  // ▶️ Відновлення
  const resumeSync = useCallback(() => {
    log('▶️ resumeSync() called');
    updateSyncSettings({ autoSync: true });
    return { success: true };
  }, [updateSyncSettings]);

  // ℹ️ Гетери
  const getSyncStatus = useCallback(() => syncService.getSyncStatus(), []);
  const getLastSyncTime = useCallback(() => lastSync, [lastSync]);
  const clearSyncErrors = useCallback(() => {
    setSyncErrors([]);
    log('🧹 Cleared sync errors');
  }, []);
  const clearResolvedConflicts = useCallback(() => {
    setConflicts([]);
    log('🧹 Cleared resolved conflicts');
  }, []);

  // ⚖️ Вирішення конфлікту (без логування помилок — вже є в syncService)
  const resolveConflict = useCallback(async (localViolation, serverData, resolution = 'server') => {
    try {
      const result = await syncService.resolveConflict(localViolation, serverData, resolution);
      if (result.success) {
        setConflicts(prev => prev.filter(c => c.localViolation.localId !== localViolation.localId));
      }
      return result;
    } catch (error) {
      console.error('[useSync] Error resolving conflict:', error);
      return { success: false, error: error.message };
    }
  }, []);

  return {
    isSyncing,
    syncProgress,
    lastSync,
    nextSync,
    syncErrors,
    conflicts,
    offlineViolations,
    pendingCount,
    syncSettings,
    
    syncData,
    manualSync,
    resolveConflict,
    getSyncStatus,
    getLastSyncTime,
    pauseSync,
    resumeSync,
    
    saveOfflineViolation,
    getOfflineViolations,
    clearOfflineViolations,
    updateSyncSettings,
    clearSyncErrors,
    clearResolvedConflicts,
  };
};