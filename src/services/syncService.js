import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import violationsService from './violationService';
import cloudinaryService from './cloudinaryService';

// --- Додано: глобальна функція для отримання стану мережі ---
let networkStateProvider = null;

export const setNetworkStateProvider = (provider) => {
  networkStateProvider = provider;
};

const getNetworkState = () => {
  if (!networkStateProvider) {
    console.warn('Network state provider not set. Returning default offline state.');
    // Повертаємо значення, які відповідають isOnline() = false
    return { isConnected: false, isServerReachable: false, isServerReachable: false, isOnline: false };
  }
  return networkStateProvider();
};
// --- Кінець додавання ---

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncStatus = 'idle'; // idle, syncing, completed, failed
    this.syncListeners = [];
    this.conflictListeners = [];
    this.autoSyncEnabled = true;
    this.lastSyncTime = null;
    this.syncPromise = null;
    this.lastAutoSyncTime = 0;
    this.networkSubscription = null;
  }

  // 🔧 Видалено fetch-перевірку, використовуємо стан з useNetwork
  // Тепер це просто обгортка для isOnline
  async checkInternetReachable() {
    const state = getNetworkState();
    return state.isOnline; // isOnline тепер враховує сервер
  }

  // 🌐 Підписка на зміни мережі (без setInterval!)
  subscribeToNetworkChanges(callback) {
    if (this.networkSubscription) {
      this.networkSubscription.remove();
    }

    this.networkSubscription = Network.addNetworkListener(async (state) => {
      // Оновлюємо стан через провайдер (це має бути реалізовано в UI)
      // Ми викликаємо callback, щоб інформувати UI
      const networkState = getNetworkState(); // Отримуємо стан через провайдер
      const networkInfo = {
        isConnected: state.isConnected,
        isInternetReachable: networkState.isInternetReachable,
        isServerReachable: networkState.isServerReachable,
        isOnline: networkState.isOnline, // Додано: новий стан
        type: state.type || 'unknown',
      };

      callback?.(networkInfo);

      // 🔁 Автоматична синхронізація лише при переході в онлайн (тепер з сервером)
      // Змінено: перевіряємо isOnline, який враховує сервер
      if (networkState.isOnline && this.autoSyncEnabled) {
        await this.autoSync();
      }
    });

    return () => {
      if (this.networkSubscription) {
        this.networkSubscription.remove();
        this.networkSubscription = null;
      }
    };
  }

  // ⏱️ Автоматична синхронізація з debounce
  async autoSync() {
    const now = Date.now();
    if (now - this.lastAutoSyncTime < 10000) {
      return; // не частіше ніж раз на 10 сек
    }

    if (!this.autoSyncEnabled || this.isSyncing) return;

    // Змінено: використовуємо isOnline через провайдер
    const networkState = getNetworkState();
    if (!networkState.isOnline) return; // isOnline тепер враховує сервер

    const offlineViolations = await this.getOfflineViolations();
    if (offlineViolations.length === 0) return;

    this.lastAutoSyncTime = now;
    await this.syncViolations();
  }

  // 🔄 Синхронізація з захистом від паралельних запусків
  async syncViolations() {
    if (this.syncPromise) {
      console.log('🔄 Sync already in progress, returning existing promise...');
      return this.syncPromise;
    }

    this.syncPromise = this.performSync();
    try {
      return await this.syncPromise;
    } finally {
      this.syncPromise = null;
    }
  }

  async performSync() {
    if (this.isSyncing) {
      return {
        success: false,
        error: 'Sync already in progress',
      };
    }

    this.isSyncing = true;
    this.updateSyncStatus('syncing');
    this.notifySyncListeners('syncing');

    try {
      const offlineViolations = await this.getOfflineViolations();

      if (offlineViolations.length === 0) {
        this.updateSyncStatus('completed');
        this.isSyncing = false;
        this.lastSyncTime = new Date().toISOString();
        this.notifySyncListeners('completed');

        return {
          success: true,
          data: { synced: 0, conflicts: 0 },
          message: 'No offline violations to sync',
        };
      }

      let syncedCount = 0;
      let conflictCount = 0;
      const failedSyncs = [];

      for (const violation of offlineViolations) {
        try {
          const result = await this.syncSingleViolation(violation);

          if (result.success) {
            syncedCount++;
            await this.removeOfflineViolation(violation.localId);
          } else if (result.conflict) {
            conflictCount++;
            this.notifyConflictListeners(violation, result.serverData);
          } else {
            failedSyncs.push({ violation, error: result.error });
          }
        } catch (error) {
          failedSyncs.push({ violation, error: error.message });
        }
      }

      this.updateSyncStatus('completed');
      this.isSyncing = false;
      this.lastSyncTime = new Date().toISOString();
      this.notifySyncListeners('completed', {
        syncedCount,
        conflictCount,
        failedSyncs,
      });

      return {
        success: true,
        data: {
          synced: syncedCount,
          conflicts: conflictCount,
          failed: failedSyncs.length,
          total: offlineViolations.length,
        },
        message: `Sync completed: ${syncedCount} synced, ${conflictCount} conflicts, ${failedSyncs.length} failed`,
      };
    } catch (error) {
      this.updateSyncStatus('failed');
      this.isSyncing = false;
      this.notifySyncListeners('failed', { error: error.message });

      return {
        success: false,
        error: error.message || 'Failed to sync violations',
      };
    }
  }

  async syncSingleViolation(violation) {
    try {
      let photoUrl = null;
      
      if (violation.data?.photo) {
        try {
          const uploadResult = await cloudinaryService.uploadPhoto(violation.data.photo);
          if (uploadResult.success) {
            photoUrl = uploadResult.secureUrl;
          }
        } catch (photoError) {
          console.error('Failed to upload photo:', photoError);
        }
      }

      const serverData = {
        ...violation.data,
        ...(photoUrl && { photoUrl }),
      };
      
      delete serverData.photo;

      if (violation.isNew) {
        const result = await violationsService.createViolation(serverData);
        
        if (result.success) {
          return {
            success: true,
            serverData: result.data
          };
        } else {
          if (result.status === 409) {
            return {
              success: false,
              conflict: true,
              serverData: result.data
            };
          }
          throw new Error(result.error);
        }
      } else {
        const result = await violationsService.updateViolation(violation.id, serverData);
        
        if (result.success) {
          return {
            success: true,
            serverData: result.data
          };
        } else {
          if (result.status === 409) {
            return {
              success: false,
              conflict: true,
              serverData: result.data
            };
          }
          throw new Error(result.error);
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  handleSyncError(error, violation) {
    console.warn('Sync error for violation:', violation.localId, error);
    return {
      success: false,
      error: error.message,
      violation: violation,
      retryable: this.isRetryableError(error)
    };
  }

  isRetryableError(error) {
    const retryableStatuses = [500, 502, 503, 504];
    return error.status && retryableStatuses.includes(error.status);
  }

  // 📥 Черга для офлайн даних
  async addToSyncQueue(violation) {
    try {
      const queue = await this.getSyncQueue();
      const newViolation = {
        ...violation,
        localId: this.generateLocalId(),
        timestamp: new Date().toISOString(),
        retryCount: 0
      };
      
      queue.push(newViolation);
      await this.saveSyncQueue(queue);
      
      return {
        success: true,
        data: newViolation,
        message: 'Violation added to sync queue'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to add violation to sync queue'
      };
    }
  }

  async getSyncQueue() {
    try {
      const queueData = await AsyncStorage.getItem('sync_queue');
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Failed to get sync queue:', error);
      return [];
    }
  }

  async saveSyncQueue(queue) {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(queue));
      return true;
    } catch (error) {
      console.error('Failed to save sync queue:', error);
      return false;
    }
  }

  async clearSyncQueue() {
    try {
      await AsyncStorage.removeItem('sync_queue');
      return {
        success: true,
        message: 'Sync queue cleared'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to clear sync queue'
      };
    }
  }

  // 💾 Робота з офлайн правопорушеннями
  async saveOfflineViolation(violation) {
    try {
      const violations = await this.getOfflineViolations();
      const offlineViolation = {
        ...violation,
        localId: this.generateLocalId(),
        savedAt: new Date().toISOString(),
        synced: false
      };
      
      violations.push(offlineViolation);
      await AsyncStorage.setItem('offline_violations', JSON.stringify(violations));
      
      return {
        success: true,
        data: offlineViolation
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to save offline violation'
      };
    }
  }

  async getOfflineViolations() {
    try {
      const data = await AsyncStorage.getItem('offline_violations');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Failed to get offline violations:', error);
      return [];
    }
  }

  async removeOfflineViolation(localId) {
    try {
      const violations = await this.getOfflineViolations();
      const filteredViolations = violations.filter(v => v.localId !== localId);
      await AsyncStorage.setItem('offline_violations', JSON.stringify(filteredViolations));
      return true;
    } catch (error) {
      console.error('Failed to remove offline violation:', error);
      return false;
    }
  }

  async clearOfflineViolations() {
    try {
      await AsyncStorage.removeItem('offline_violations');
      return {
        success: true,
        message: 'Offline violations cleared'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to clear offline violations'
      };
    }
  }

  // ⚖️ Обробка конфліктів
  async resolveConflict(localViolation, serverViolation, resolution = 'server') {
    try {
      let resolvedViolation;
      
      switch (resolution) {
        case 'server':
          resolvedViolation = serverViolation;
          break;
        case 'local':
          const updateResult = await violationsService.updateViolation(
            serverViolation.id,
            localViolation.data
          );
          if (updateResult.success) {
            resolvedViolation = updateResult.data;
          } else {
            throw new Error('Failed to update server violation');
          }
          break;
        case 'merge':
          const mergedData = this.mergeViolationData(localViolation.data, serverViolation);
          const mergeResult = await violationsService.updateViolation(
            serverViolation.id,
            mergedData
          );
          if (mergeResult.success) {
            resolvedViolation = mergeResult.data;
          } else {
            throw new Error('Failed to merge violation data');
          }
          break;
        default:
          throw new Error('Invalid conflict resolution strategy');
      }

      await this.removeOfflineViolation(localViolation.localId);
      
      return {
        success: true,
        data: resolvedViolation,
        message: 'Conflict resolved successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to resolve conflict'
      };
    }
  }

  mergeViolationData(localData, serverData) {
    return {
      ...serverData,
      ...localData,
      updatedAt: new Date().toISOString()
    };
  }

  // 📊 Статус і налаштування
  getSyncStatus() {
    return {
      status: this.syncStatus,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
    };
  }

  updateSyncStatus(status) {
    this.syncStatus = status;
  }

  setAutoSync(enabled) {
    this.autoSyncEnabled = enabled;
  }

  async getSyncStats() {
    const offlineViolations = await this.getOfflineViolations();
    const queue = await this.getSyncQueue();
    
    return {
      offlineViolations: offlineViolations.length,
      queueLength: queue.length,
      lastSyncTime: this.lastSyncTime,
      isSyncing: this.isSyncing,
      status: this.syncStatus
    };
  }

  // 📡 Слухачі
  addSyncListener(callback) {
    this.syncListeners.push(callback);
    return () => {
      this.syncListeners = this.syncListeners.filter(listener => listener !== callback);
    };
  }

  removeSyncListener(callback) {
    this.syncListeners = this.syncListeners.filter(listener => listener !== callback);
  }

  notifySyncListeners(status, data = {}) {
    this.syncListeners.forEach(listener => {
      listener({
        status,
        data,
        timestamp: new Date().toISOString()
      });
    });
  }

  addConflictListener(callback) {
    this.conflictListeners.push(callback);
    return () => {
      this.conflictListeners = this.conflictListeners.filter(listener => listener !== callback);
    };
  }

  removeConflictListener(callback) {
    this.conflictListeners = this.conflictListeners.filter(listener => listener !== callback);
  }

  notifyConflictListeners(localViolation, serverData) {
    this.conflictListeners.forEach(listener => {
      listener({
        localViolation,
        serverData,
        timestamp: new Date().toISOString()
      });
    });
  }

  generateLocalId() {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

const syncService = new SyncService();

export default syncService;

// Експорт усіх методів (як у тебе було)
export const {
  checkInternetReachable,
  subscribeToNetworkChanges,
  syncViolations,
  addToSyncQueue,
  getSyncQueue,
  clearSyncQueue,
  autoSync,
  getSyncStatus,
  saveOfflineViolation,
  getOfflineViolations,
  removeOfflineViolation,
  clearOfflineViolations,
  resolveConflict,
  addSyncListener,
  removeSyncListener,
  addConflictListener,
  removeConflictListener,
  setAutoSync,
  getSyncStats
} = syncService;