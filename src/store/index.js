// Головний файл store - налаштування Redux store
import { configureStore } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { persistReducer, persistStore } from 'redux-persist';

// Import slices
import rootReducer from './rootReducer';

// Persist configuration
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'settings'], // Що зберігати
  blacklist: ['violations', 'sync'], // Що НЕ зберігати (важкі дані)
};

// Configure persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Create store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const persistor = persistStore(store);

// Utility function to reset store
export const resetStore = () => {
  store.dispatch({ type: 'RESET_APP' });
};

export default { store, persistor };