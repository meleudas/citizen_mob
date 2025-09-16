// Slice для управління правопорушеннями
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { violationService } from '../services/violationService';
import { storageService } from '../services/storageService';

// Async thunks
export const fetchViolationsAsync = createAsyncThunk(
  'violations/fetchViolations',
  async (filters = {}, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const response = await violationService.getViolations(state.auth.token, filters);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch violations');
    }
  }
);

export const createViolationAsync = createAsyncThunk(
  'violations/createViolation',
  async (violationData, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const response = await violationService.createViolation(state.auth.token, violationData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create violation');
    }
  }
);

export const updateViolationAsync = createAsyncThunk(
  'violations/updateViolation',
  async ({ id, data }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const response = await violationService.updateViolation(state.auth.token, id, data);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update violation');
    }
  }
);

export const deleteViolationAsync = createAsyncThunk(
  'violations/deleteViolation',
  async (id, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      await violationService.deleteViolation(state.auth.token, id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete violation');
    }
  }
);

export const syncViolationsAsync = createAsyncThunk(
  'violations/syncViolations',
  async (_, { getState, dispatch, rejectWithValue }) => {
    try {
      const state = getState();
      
      // Синхронізація офлайн даних
      const offlineViolations = await storageService.getOfflineViolations();
      
      const syncedViolations = [];
      const errors = [];
      
      for (const violation of offlineViolations) {
        try {
          const response = await violationService.createViolation(state.auth.token, violation);
          syncedViolations.push(response.data);
          // Видалити з офлайн сховища
          await storageService.removeOfflineViolation(violation.localId);
        } catch (error) {
          errors.push({ violation, error: error.message });
        }
      }
      
      return { syncedViolations, errors };
    } catch (error) {
      return rejectWithValue('Sync failed');
    }
  }
);

// Initial state
const initialState = {
  violations: [],
  currentViolation: null,
  loading: {
    fetch: false,
    create: false,
    update: false,
    delete: false,
    sync: false,
  },
  error: null,
  filters: {
    category: '',
    dateRange: { start: null, end: null },
    search: '',
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
  },
  syncStatus: {
    lastSync: null,
    isSyncing: false,
    pendingCount: 0,
  },
};

// Violations slice
const violationsSlice = createSlice({
  name: 'violations',
  initialState,
  reducers: {
    setViolations: (state, action) => {
      state.violations = action.payload;
    },
    addViolation: (state, action) => {
      state.violations.unshift(action.payload);
    },
    updateViolation: (state, action) => {
      const index = state.violations.findIndex(v => v.id === action.payload.id);
      if (index !== -1) {
        state.violations[index] = action.payload;
      }
    },
    deleteViolation: (state, action) => {
      state.violations = state.violations.filter(v => v.id !== action.payload);
    },
    setCurrentViolation: (state, action) => {
      state.currentViolation = action.payload;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
    resetViolations: () => initialState,
  },
  extraReducers: (builder) => {
    // Fetch violations
    builder
      .addCase(fetchViolationsAsync.pending, (state) => {
        state.loading.fetch = true;
        state.error = null;
      })
      .addCase(fetchViolationsAsync.fulfilled, (state, action) => {
        state.loading.fetch = false;
        state.violations = action.payload.violations;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchViolationsAsync.rejected, (state, action) => {
        state.loading.fetch = false;
        state.error = action.payload;
      })
      // Create violation
      .addCase(createViolationAsync.pending, (state) => {
        state.loading.create = true;
        state.error = null;
      })
      .addCase(createViolationAsync.fulfilled, (state, action) => {
        state.loading.create = false;
        state.violations.unshift(action.payload);
      })
      .addCase(createViolationAsync.rejected, (state, action) => {
        state.loading.create = false;
        state.error = action.payload;
      })
      // Update violation
      .addCase(updateViolationAsync.pending, (state) => {
        state.loading.update = true;
        state.error = null;
      })
      .addCase(updateViolationAsync.fulfilled, (state, action) => {
        state.loading.update = false;
        const index = state.violations.findIndex(v => v.id === action.payload.id);
        if (index !== -1) {
          state.violations[index] = action.payload;
        }
      })
      .addCase(updateViolationAsync.rejected, (state, action) => {
        state.loading.update = false;
        state.error = action.payload;
      })
      // Delete violation
      .addCase(deleteViolationAsync.pending, (state) => {
        state.loading.delete = true;
        state.error = null;
      })
      .addCase(deleteViolationAsync.fulfilled, (state, action) => {
        state.loading.delete = false;
        state.violations = state.violations.filter(v => v.id !== action.payload);
      })
      .addCase(deleteViolationAsync.rejected, (state, action) => {
        state.loading.delete = false;
        state.error = action.payload;
      })
      // Sync violations
      .addCase(syncViolationsAsync.pending, (state) => {
        state.loading.sync = true;
        state.syncStatus.isSyncing = true;
        state.error = null;
      })
      .addCase(syncViolationsAsync.fulfilled, (state, action) => {
        state.loading.sync = false;
        state.syncStatus.isSyncing = false;
        state.syncStatus.lastSync = new Date().toISOString();
        state.syncStatus.pendingCount = 0;
        
        // Оновити синхронізовані правопорушення
        action.payload.syncedViolations.forEach(synced => {
          const index = state.violations.findIndex(v => v.localId === synced.localId);
          if (index !== -1) {
            state.violations[index] = { ...synced, isSynced: true };
          }
        });
      })
      .addCase(syncViolationsAsync.rejected, (state, action) => {
        state.loading.sync = false;
        state.syncStatus.isSyncing = false;
        state.error = action.payload;
      });
  },
});

// Actions
export const {
  setViolations,
  addViolation,
  updateViolation,
  deleteViolation,
  setCurrentViolation,
  setFilters,
  clearError,
  resetViolations,
} = violationsSlice.actions;

// Selectors
export const selectAllViolations = (state) => state.violations.violations;
export const selectCurrentViolation = (state) => state.violations.currentViolation;
export const selectViolationsLoading = (state) => state.violations.loading;
export const selectViolationsError = (state) => state.violations.error;
export const selectViolationsFilters = (state) => state.violations.filters;
export const selectViolationsPagination = (state) => state.violations.pagination;
export const selectSyncStatus = (state) => state.violations.syncStatus;

// Custom selectors
export const selectViolationsByDate = (date) => (state) => {
  return state.violations.violations.filter(v => 
    new Date(v.dateTime).toDateString() === new Date(date).toDateString()
  );
};

export const selectViolationsByCategory = (category) => (state) => {
  if (!category) return state.violations.violations;
  return state.violations.violations.filter(v => v.category === category);
};

export default violationsSlice.reducer;