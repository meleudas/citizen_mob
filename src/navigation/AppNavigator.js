// src/navigation/AppNavigator.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { useThemeColors } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Error Boundary для навігації
class NavigationErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Navigation Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Щось пішло не так з навігацією. Перезапустіть додаток.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const AppNavigator = () => {
  console.log('🔄 [AppNavigator] Початок рендеру компонента');

  // Hooks used for theme
  const { colors, isDark } = useThemeColors();
  console.log('🎨 [useThemeColors] Тема завантажена:', { isDark, hasColors: !!colors });

  // Hooks used for authentication - отримуємо як isAuthenticated, так і isGuest
  const { isAuthenticated, isGuest, isLoading: authLoading, checkAuthStatus } = useAuth();
  console.log('🔐 [useAuth] Стан аутентифікації:', { isAuthenticated, isGuest, authLoading, hasCheckAuthStatus: !!checkAuthStatus });

  // State hook for initialization
  const [isInitializing, setIsInitializing] = useState(true);
  console.log('⚙️ [useState] Стан ініціалізації:', isInitializing);

  // Налаштування теми для навігації
  const navigationTheme = isDark ? DarkTheme : DefaultTheme;
  const customTheme = {
    ...navigationTheme,
    colors: {
      ...navigationTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.error,
    },
  };
  console.log('🎨 [Тема] Тема навігації налаштована');

  // Визначення активного навігатора - з урахуванням гостя
  const renderActiveNavigator = useCallback(() => {
    console.log('🧭 [useCallback] Визначення активного навігатора:', { isAuthenticated, isGuest });
    // Якщо користувач авторизований або увійшов як гість - показуємо MainNavigator
    if (isAuthenticated || isGuest) {
      console.log('🧭 [useCallback] Показ MainNavigator');
      return <MainNavigator />;
    } else {
      console.log('🧭 [useCallback] Показ AuthNavigator');
      return <AuthNavigator />;
    }
  }, [isAuthenticated, isGuest]);
  console.log('🧭 [useCallback] Функція renderActiveNavigator створена');

  // Ініціалізація додатку

  useEffect(() => {
    console.log('🚀 [useEffect] Ефект ініціалізації запущено');
    const initializeApp = async () => {
      try {
        console.log('🔄 [initializeApp] Початок ініціалізації додатку');
        if (checkAuthStatus) {
          console.log('🔑 [initializeApp] Виклик checkAuthStatus');
          await checkAuthStatus();
          console.log('✅ [initializeApp] checkAuthStatus завершено успішно');
        } else {
          console.warn('⚠️ [initializeApp] checkAuthStatus є undefined');
        }
      } catch (error) {
        console.error('❌ [App initialization error]:', error);
      }
      // Не встановлюємо setIsInitializing(false) тут, бо це може викликати зайвий рендер
    };

    // Виконуємо ініціалізацію лише один раз
    if (isInitializing) {
      console.log('⚡ [useEffect] Запуск initializeApp оскільки isInitializing = true');
      initializeApp().then(() => {
        setIsInitializing(false);
        console.log('🏁 [initializeApp] Ініціалізація завершена, isInitializing встановлено в false');
      });
    } else {
      console.log('⏭️ [useEffect] Пропуск initializeApp оскільки isInitializing = false');
    }
  }, [checkAuthStatus, isInitializing]);
  console.log('🚀 [useEffect] Ефект ініціалізації зареєстровано');

  // --- END OF HOOKS ---

  // Обробка стану завантаження
  console.log('⏳ [Рендер] Перевірка стану завантаження:', { isInitializing, authLoading });
  if (isInitializing || authLoading) {
    console.log('⏳ [Рендер] Показ екрану завантаження');
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <LoadingSpinner
          visible={true}
          text="Ініціалізація додатку..."
          overlay={true}
        />
      </View>
    );
  }

  console.log('✅ [Рендер] Показ основного інтерфейсу навігації');
  return (
    <NavigationErrorBoundary>
      <NavigationContainer
        theme={customTheme}
        fallback={
          <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <LoadingSpinner
              visible={true}
              text="Завантаження навігації..."
              overlay={true}
            />
          </View>
        }
      >
        {renderActiveNavigator()}
      </NavigationContainer>
    </NavigationErrorBoundary>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#ff3b30',
  },
});

export default AppNavigator;