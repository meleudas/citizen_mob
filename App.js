import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import AppNavigator from './src/navigation/AppNavigator';
import LoadingSpinner from './src/components/common/LoadingSpinner';
import { store, persistor } from './src/store';
import { ThemeProvider } from './src/hooks/useTheme';
import { AuthProvider } from './src/contexts/AuthContext';
import { LanguageProvider } from './src/hooks/useLanguage';

export default function App() {
  return (
    <LanguageProvider>
    <AuthProvider>
      <ThemeProvider>
        <Provider store={store}>
          <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
            <SafeAreaProvider>
              <AppNavigator />
            </SafeAreaProvider>
          </PersistGate>
        </Provider>
      </ThemeProvider>
    </AuthProvider>
    </LanguageProvider>
  );
}
