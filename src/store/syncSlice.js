// Slice для управління синхронізацією
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as Network from 'expo-network';
import { storageService } from '../services/storageService';

// Async thunks
export const syncDataAsync = createAsyncThunk(
  'sync/syncData',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const { auth } = getState();
      
      // Використовуємо expo-network замість NetInfo
      const networkState = await Network.getNetworkStateAsync();
      const connectivityState = await Network.getConnectivityStateAsync();
      
      if (!networkState.isConnected || !connectivityState.isInternetReachable) {
        throw new Error('No internet connection');
      }
      
      // Тут буде логіка синхронізації
      // Поки що заглушка
      return { success: true, syncedCount: 0 };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const checkSyncStatusAsync = createAsyncThunk(
  'sync/checkSyncStatus',
  async (_, { rejectWithValue }) => {
    try {
      const pendingCount = await storageService.getPendingSyncCount();
      return { pendingCount };
    } catch (error) {
      return rejectWithValue('Failed to check sync status');
    }
  }
);

// Initial state
const initialState = {
  status: 'idle', // 'idle', 'syncing', 'error', 'offline'
  progress: 0, // 0-100
  lastSync: null,
  nextSync: null,
  offlineQueue: [],
  conflicts: [],
  errors: [],
  network: {
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  },
  loading: false,
  error: null,
};

// Sync slice
const syncSlice = createSlice({
  name: 'sync',
  initialState,
  reducers: {
    setSyncStatus: (state, action) => {
      state.status = action.payload;
    },
    setSyncProgress: (state, action) => {
      state.progress = action.payload;
    },
    setLastSync: (state, action) => {
      state.lastSync = action.payload;
    },
    setNextSync: (state, action) => {
      state.nextSync = action.payload;
    },
    addToOfflineQueue: (state, action) => {
      state.offlineQueue.push(action.payload);
    },
    removeFromOfflineQueue: (state, action) => {
      state.offlineQueue = state.offlineQueue.filter(item => item.id !== action.payload);
    },
    resolveConflict: (state, action) => {
      state.conflicts = state.conflicts.filter(c => c.id !== action.payload.conflictId);
    },
    setNetworkStatus: (state, action) => {
      state.network = { ...state.network, ...action.payload };
    },
    addError: (state, action) => {
      state.errors.push(action.payload);
    },
    clearErrors: (state) => {
      state.errors = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Sync data
    builder
      .addCase(syncDataAsync.pending, (state) => {
        state.loading = true;
        state.status = 'syncing';
        state.error = null;
      })
      .addCase(syncDataAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.status = 'idle';
        state.progress = 100;
        state.lastSync = new Date().toISOString();
        state.error = null;
      })
      .addCase(syncDataAsync.rejected, (state, action) => {
        state.loading = false;
        state.status = 'error';
        state.error = action.payload;
      })
      // Check sync status
      .addCase(checkSyncStatusAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkSyncStatusAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.offlineQueue.length = action.payload.pendingCount;
      })
      .addCase(checkSyncStatusAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Actions
export const {
  setSyncStatus,
  setSyncProgress,
  setLastSync,
  setNextSync,
  addToOfflineQueue,
  removeFromOfflineQueue,
  resolveConflict,
  setNetworkStatus,
  addError,
  clearErrors,
  clearError,
} = syncSlice.actions;

// Selectors
export const selectSyncStatus = (state) => state.sync.status;
export const selectSyncProgress = (state) => state.sync.progress;
export const selectLastSyncTime = (state) => state.sync.lastSync;
export const selectOfflineQueue = (state) => state.sync.offlineQueue;
export const selectSyncConflicts = (state) => state.sync.conflicts;
export const selectSyncErrors = (state) => state.sync.errors;
export const selectNetworkStatus = (state) => state.sync.network;
export const selectSyncLoading = (state) => state.sync.loading;
export const selectSyncError = (state) => state.sync.error;

export default syncSlice.reducer;