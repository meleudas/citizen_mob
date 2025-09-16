// Slice для управління налаштуваннями
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { storageService } from '../services/storageService';

// Async thunks
export const loadSettingsAsync = createAsyncThunk(
  'settings/loadSettings',
  async (_, { rejectWithValue }) => {
    try {
      const settings = await storageService.getSettings();
      return settings || {};
    } catch (error) {
      return rejectWithValue('Failed to load settings');
    }
  }
);

export const saveSettingsAsync = createAsyncThunk(
  'settings/saveSettings',
  async (settings, { rejectWithValue }) => {
    try {
      await storageService.saveSettings(settings);
      return settings;
    } catch (error) {
      return rejectWithValue('Failed to save settings');
    }
  }
);

// Initial state
const initialState = {
  theme: 'system', // 'light', 'dark', 'system'
  language: 'uk', // 'uk', 'en', 'ru'
  notifications: {
    enabled: true,
    sound: true,
    vibration: true,
  },
  privacy: {
    locationSharing: true,
    analytics: true,
  },
  accessibility: {
    fontSize: 'medium', // 'small', 'medium', 'large'
    highContrast: false,
  },
  loading: false,
  error: null,
};

// Settings slice
const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
    setLanguage: (state, action) => {
      state.language = action.payload;
    },
    setNotificationSettings: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    setPrivacySettings: (state, action) => {
      state.privacy = { ...state.privacy, ...action.payload };
    },
    setAccessibilitySettings: (state, action) => {
      state.accessibility = { ...state.accessibility, ...action.payload };
    },
    updateSettings: (state, action) => {
      return { ...state, ...action.payload };
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Load settings
    builder
      .addCase(loadSettingsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadSettingsAsync.fulfilled, (state, action) => {
        state.loading = false;
        return { ...state, ...action.payload };
      })
      .addCase(loadSettingsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Save settings
      .addCase(saveSettingsAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveSettingsAsync.fulfilled, (state, action) => {
        state.loading = false;
        return { ...state, ...action.payload };
      })
      .addCase(saveSettingsAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

// Actions
export const {
  setTheme,
  setLanguage,
  setNotificationSettings,
  setPrivacySettings,
  setAccessibilitySettings,
  updateSettings,
  clearError,
} = settingsSlice.actions;

// Selectors
export const selectTheme = (state) => state.settings.theme;
export const selectLanguage = (state) => state.settings.language;
export const selectNotificationSettings = (state) => state.settings.notifications;
export const selectPrivacySettings = (state) => state.settings.privacy;
export const selectAccessibilitySettings = (state) => state.settings.accessibility;
export const selectSettingsLoading = (state) => state.settings.loading;
export const selectSettingsError = (state) => state.settings.error;

export default settingsSlice.reducer;