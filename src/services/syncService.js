// src/services/syncService.js

import * as Network from 'expo-network';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';
import violationsService from './violationService';
import cloudinaryService from './cloudinaryService';

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncQueue = [];
    this.syncStatus = 'idle'; // idle, syncing, completed, failed
    this.syncListeners = [];
    this.conflictListeners = [];
    this.autoSyncEnabled = true;
    this.lastSyncTime = null;
    this.networkCheckInterval = null;
  }

  // 1. Перевірка статусу мережі
  async checkNetworkStatus() {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const connectivityState = await Network.getConnectivityStateAsync();
      
      return {
        success: true,
        data: {
          isConnected: networkState.isConnected,
          isInternetReachable: connectivityState.isInternetReachable,
          type: networkState.type || 'unknown',
          details: networkState
        },
        message: 'Network status checked successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to check network status'
      };
    }
  }

  // Прослуховування змін мережі
  subscribeToNetworkChanges(callback) {
    // Використовуємо інтервал для перевірки змін мережі
    const interval = setInterval(async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        const connectivityState = await Network.getConnectivityStateAsync();
        
        const networkInfo = {
          isConnected: networkState.isConnected,
          isInternetReachable: connectivityState.isInternetReachable,
          type: networkState.type || 'unknown'
        };
        
        callback(networkInfo);
        
        // Автоматична синхронізація при з'єднанні
        if (networkState.isConnected && connectivityState.isInternetReachable && this.autoSyncEnabled) {
          this.autoSync();
        }
      } catch (error) {
        console.error('Network monitoring error:', error);
      }
    }, 3000); // Перевірка кожні 3 секунди

    return () => clearInterval(interval);
  }

  // 2. Синхронізація violations з сервером
  async syncViolations() {
    if (this.isSyncing) {
      return {
        success: false,
        error: 'Sync already in progress'
      };
    }

    this.isSyncing = true;
    this.updateSyncStatus('syncing');
    this.notifySyncListeners('syncing');

    try {
      // Отримуємо офлайн дані
      const offlineViolations = await this.getOfflineViolations();
      
      if (offlineViolations.length === 0) {
        this.updateSyncStatus('completed');
        this.isSyncing = false;
        this.notifySyncListeners('completed');
        
        return {
          success: true,
          data: { synced: 0, conflicts: 0 },
          message: 'No offline violations to sync'
        };
      }

      let syncedCount = 0;
      let conflictCount = 0;
      const failedSyncs = [];

      // Синхронізуємо кожне правопорушення
      for (const violation of offlineViolations) {
        try {
          const result = await this.syncSingleViolation(violation);
          
          if (result.success) {
            syncedCount++;
            // Видаляємо з офлайн сховища після успішної синхронізації
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
      this.notifySyncListeners('completed', { syncedCount, conflictCount, failedSyncs });

      return {
        success: true,
        data: {
          synced: syncedCount,
          conflicts: conflictCount,
          failed: failedSyncs.length,
          total: offlineViolations.length
        },
        message: `Sync completed: ${syncedCount} synced, ${conflictCount} conflicts, ${failedSyncs.length} failed`
      };

    } catch (error) {
      this.updateSyncStatus('failed');
      this.isSyncing = false;
      this.notifySyncListeners('failed', { error: error.message });
      
      return {
        success: false,
        error: error.message || 'Failed to sync violations'
      };
    }
  }

  // Синхронізація одного правопорушення
  async syncSingleViolation(violation) {
    try {
      // Спочатку завантажуємо фото на Cloudinary, якщо вони є
      const photoUrls = [];
      if (violation.data.photoKeys && violation.data.photoKeys.length > 0) {
        for (const photoKey of violation.data.photoKeys) {
          try {
            // Отримуємо фото з AsyncStorage
            const photoData = await AsyncStorage.getItem(photoKey);
            if (photoData) {
              const photoObject = JSON.parse(photoData);
              
              // Завантажуємо фото на Cloudinary
              const uploadResult = await cloudinaryService.uploadPhoto(photoObject);
              if (uploadResult.success) {
                photoUrls.push(uploadResult.secureUrl);
                // Опційно: видаляємо фото з AsyncStorage після успішного завантаження
                await AsyncStorage.removeItem(photoKey);
              }
            }
          } catch (photoError) {
            console.error('Failed to upload photo:', photoError);
          }
        }
      }

      // Підготовка даних для сервера
      const serverData = {
        ...violation.data,
        photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      };
      
      // Видаляємо посилання на локальні фото
      delete serverData.photoKeys;

      // Перевіряємо, чи це нове правопорушення або оновлення
      if (violation.isNew) {
        // Створення нового правопорушення
        const result = await violationsService.createViolation(serverData);
        
        if (result.success) {
          return {
            success: true,
            serverData: result.data
          };
        } else {
          // Перевіряємо на конфлікт
          if (result.status === 409) { // Conflict
            return {
              success: false,
              conflict: true,
              serverData: result.data
            };
          }
          throw new Error(result.error);
        }
      } else {
        // Оновлення існуючого правопорушення
        const result = await violationsService.updateViolation(violation.id, serverData);
        
        if (result.success) {
          return {
            success: true,
            serverData: result.data
          };
        } else {
          if (result.status === 409) { // Conflict
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

  // 3. Обробка помилок синхронізації
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
    // Помилки мережі та сервера 5xx - повторювані
    const retryableStatuses = [500, 502, 503, 504];
    return error.status && retryableStatuses.includes(error.status);
  }

  // 4. Черга для офлайн даних
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

  // 5. Автоматична синхронізація при з'єднанні
  async autoSync() {
    if (!this.autoSyncEnabled) return;

    const networkStatus = await this.checkNetworkStatus();
    if (!networkStatus.success || !networkStatus.data.isConnected) {
      return;
    }

    // Перевіряємо, чи є що синхронізувати
    const offlineViolations = await this.getOfflineViolations();
    if (offlineViolations.length > 0) {
      await this.syncViolations();
    }
  }

  // 6. Статус синхронізації
  getSyncStatus() {
    return {
      status: this.syncStatus,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      queueLength: this.syncQueue.length
    };
  }

  updateSyncStatus(status) {
    this.syncStatus = status;
  }

  // Робота з офлайн правопорушеннями
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

  // 7. Обробка конфліктів даних
  async resolveConflict(localViolation, serverViolation, resolution = 'server') {
    try {
      let resolvedViolation;
      
      switch (resolution) {
        case 'server':
          resolvedViolation = serverViolation;
          break;
        case 'local':
          // Оновлюємо серверну версію локальними даними
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
          // Об'єднуємо дані (реалізація залежить від структури даних)
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

      // Видаляємо з офлайн сховища
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
    // Проста реалізація об'єднання - можна розширити
    return {
      ...serverData,
      ...localData,
      updatedAt: new Date().toISOString()
    };
  }

  // Допоміжні методи
  generateLocalId() {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Слухачі подій
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

  // Налаштування
  setAutoSync(enabled) {
    this.autoSyncEnabled = enabled;
  }

  // Отримання статистики синхронізації
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
}

// Експортуємо екземпляр сервісу
const syncService = new SyncService();

export default syncService;

// Експортуємо окремі функції для зручності
export const {
  checkNetworkStatus,
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