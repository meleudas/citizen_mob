// src/hooks/useTheme.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

const THEME_STORAGE_KEY = 'appTheme';
const DEFAULT_THEME = 'system';

// Теми
const themes = {
  light: {
    // Основні кольори
    primary: '#007AFF',
    secondary: '#34C759',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    info: '#5AC8FA',
    
    // Фони
    background: '#FFFFFF',
    card: '#FFFFFF',
    inputBackground: '#F2F2F7',
    
    // Текст
    text: '#000000',
    textSecondary: '#8E8E93',
    textTertiary: '#C7C7CC',
    
    // Бордери
    border: '#C6C6C8',
    separator: '#D1D1D6',
    
    // Інші
    shadow: 'rgba(0, 0, 0, 0.1)',
    disabled: '#D1D1D6',
    placeholder: '#C7C7CC',
    
    // Статуси
    online: '#34C759',
    offline: '#FF3B30',
    pending: '#FF9500',
    
    // Системні
    statusBar: 'dark-content',
    isDark: false,
  },
  
  dark: {
    // Основні кольори
    primary: '#0A84FF',
    secondary: '#30D158',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
    info: '#64D2FF',
    
    // Фони
    background: '#000000',
    card: '#1C1C1E',
    inputBackground: '#2C2C2E',
    
    // Текст
    text: '#FFFFFF',
    textSecondary: '#98989A',
    textTertiary: '#48484A',
    
    // Бордери
    border: '#2C2C2E',
    separator: '#3A3A3C',
    
    // Інші
    shadow: 'rgba(0, 0, 0, 0.3)',
    disabled: '#48484A',
    placeholder: '#636366',
    
    // Статуси
    online: '#30D158',
    offline: '#FF453A',
    pending: '#FF9F0A',
    
    // Системні
    statusBar: 'light-content',
    isDark: true,
  }
};

// Типографіка
const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
  },
  h2: {
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 34,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 30,
  },
  body1: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  },
  body2: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  }
};

// Контекст теми
const ThemeContext = createContext();

// Провайдер теми
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('system');
  const [systemTheme, setSystemTheme] = useState(Appearance.getColorScheme() || 'light');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Завантаження збереженої теми
  useEffect(() => {
    const loadSavedTheme = async () => {
      try {
        setLoading(true);
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (savedTheme) {
          setTheme(savedTheme);
        }
        setLoading(false);
      } catch (err) {
        setError('Failed to load theme settings');
        setLoading(false);
      }
    };

    loadSavedTheme();
  }, []);

  // Відстеження системної теми
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme || 'light');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Збереження теми
  const saveTheme = useCallback(async (newTheme) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (err) {
      setError('Failed to save theme settings');
    }
  }, []);

  // Перемикання теми
  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 
                    theme === 'light' ? 'dark' : 
                    systemTheme === 'dark' ? 'light' : 'dark';
    
    setTheme(newTheme);
    saveTheme(newTheme);
  }, [theme, systemTheme, saveTheme]);

  // Встановлення конкретної теми
  const setThemeMode = useCallback((themeName) => {
    if (['light', 'dark', 'system'].includes(themeName)) {
      setTheme(themeName);
      saveTheme(themeName);
    }
  }, [saveTheme]);

  // Отримання поточної теми
  const getCurrentTheme = useCallback(() => {
    const currentTheme = theme === 'system' ? (systemTheme || 'light') : (theme || 'light');
    return currentTheme;
  }, [theme, systemTheme]);

  // Перевірка, чи темна тема
  const isDarkMode = useCallback(() => {
    return getCurrentTheme() === 'dark';
  }, [getCurrentTheme]);

  const getColors = useCallback(() => {
    const currentTheme = getCurrentTheme();
    if (currentTheme && themes[currentTheme]) {
      return themes[currentTheme];
    }
    return themes.light;
  }, [getCurrentTheme]);

  // Отримання типографіки
  const getTypography = useCallback(() => {
    return typography;
  }, []);

  // Отримання темізованих стилів
  const getThemedStyles = useCallback((customStyles = {}) => {
    const colors = getColors();
    const currentTheme = getCurrentTheme();
    
    return {
      colors,
      typography,
      theme: currentTheme,
      isDark: isDarkMode(),
      ...customStyles
    };
  }, [getColors, getCurrentTheme, isDarkMode]);

  // Очищення помилок
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // Стани
    theme,
    isDark: isDarkMode(),
    systemTheme,
    loading,
    error,
    
    // Основні функції
    toggleTheme,
    setTheme: setThemeMode,
    getTheme: getCurrentTheme,
    isDarkMode,
    getColors,
    getTypography,
    getThemedStyles,
    
    // Управління станом
    clearError,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Хук для використання теми
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

// Хелпер для адаптації до accessibility
export const useAccessibilityTheme = () => {
  const { getColors, isDarkMode } = useTheme();
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    reduceMotion: false,
    increaseContrast: false,
    largerText: false,
  });

  // В реальному додатку тут буде використання AccessibilityInfo API
  useEffect(() => {
    // Симуляція отримання налаштувань доступності
    const checkAccessibilitySettings = async () => {
      setAccessibilitySettings({
        reduceMotion: false,
        increaseContrast: false,
        largerText: false,
      });
    };

    checkAccessibilitySettings();
  }, []);

  // Адаптовані кольори для доступності
  const getAccessibilityColors = useCallback(() => {
    const baseColors = getColors();
    
    if (accessibilitySettings.increaseContrast) {
      return {
        ...baseColors,
        text: isDarkMode() ? '#FFFFFF' : '#000000',
        textSecondary: isDarkMode() ? '#CCCCCC' : '#333333',
        border: isDarkMode() ? '#FFFFFF' : '#000000',
      };
    }
    
    return baseColors;
  }, [getColors, isDarkMode, accessibilitySettings]);

  // Адаптована типографіка
  const getAccessibilityTypography = useCallback(() => {
    if (accessibilitySettings.largerText) {
      return {
        h1: { ...typography.h1, fontSize: typography.h1.fontSize * 1.2 },
        h2: { ...typography.h2, fontSize: typography.h2.fontSize * 1.2 },
        h3: { ...typography.h3, fontSize: typography.h3.fontSize * 1.2 },
        body1: { ...typography.body1, fontSize: typography.body1.fontSize * 1.2 },
        body2: { ...typography.body2, fontSize: typography.body2.fontSize * 1.2 },
        caption: { ...typography.caption, fontSize: typography.caption.fontSize * 1.2 },
        button: { ...typography.button, fontSize: typography.button.fontSize * 1.2 },
      };
    }
    
    return typography;
  }, [accessibilitySettings.largerText]);

  return {
    accessibilitySettings,
    getAccessibilityColors,
    getAccessibilityTypography,
  };
};

// Хук для отримання кольорів теми
export const useThemeColors = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useThemeColors must be used within a ThemeProvider');
  }
  
  // Визначаємо поточну тему
  const getCurrentTheme = () => {
    if (context.theme === 'system') {
      return context.systemTheme || 'light';
    }
    return context.theme || 'light';
  };
  
  const currentTheme = getCurrentTheme();
  const isDark = currentTheme === 'dark';
  const colors = themes[currentTheme] || themes.light;
  
  return { 
    colors, 
    isDark,
    theme: currentTheme
  };
};

// Хелпер для динамічної темізації компонентів
export const useComponentTheme = (componentName) => {
  const { getColors, getTypography } = useTheme();
  
  // Спеціальні стилі для різних компонентів
  const getComponentStyles = useCallback(() => {
    const colors = getColors();
    const typo = getTypography();
    
    const componentStyles = {
      button: {
        primary: {
          backgroundColor: colors.primary,
          textColor: colors.background,
          borderColor: colors.primary,
        },
        secondary: {
          backgroundColor: colors.secondary,
          textColor: colors.background,
          borderColor: colors.secondary,
        },
        outline: {
          backgroundColor: 'transparent',
          textColor: colors.primary,
          borderColor: colors.primary,
        },
        ghost: {
          backgroundColor: 'transparent',
          textColor: colors.text,
          borderColor: 'transparent',
        }
      },
      
      input: {
        default: {
          backgroundColor: colors.inputBackground,
          borderColor: colors.border,
          textColor: colors.text,
          placeholderColor: colors.placeholder,
        },
        error: {
          backgroundColor: colors.inputBackground,
          borderColor: colors.error,
          textColor: colors.text,
          placeholderColor: colors.placeholder,
        }
      },
      
      card: {
        default: {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        }
      }
    };
    
    const styles = componentStyles[componentName] || {};
    return styles;
  }, [componentName, getColors, getTypography]);

  return {
    styles: getComponentStyles(),
    colors: getColors(),
    typography: getTypography(),
  };
};

// Хелпер для темізації додатку
export const useAppTheme = () => {
  const { getColors, getTypography, isDarkMode, theme } = useTheme();
  
  // Темізовані стилі для всього додатку
  const getAppStyles = useCallback(() => {
    const colors = getColors();
    const typo = getTypography();
    
    return {
      // Основні стилі додатку
      app: {
        background: {
          backgroundColor: colors.background,
        },
        container: {
          backgroundColor: colors.background,
          flex: 1,
        },
        safeArea: {
          backgroundColor: colors.background,
        }
      },
      
      // Навігація
      navigation: {
        header: {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
        tabBar: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
        }
      },
      
      // Списки
      list: {
        separator: {
          backgroundColor: colors.separator,
        },
        item: {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        }
      }
    };
  }, [getColors, getTypography]);

  return {
    colors: getColors(),
    typography: getTypography(),
    isDark: isDarkMode(),
    theme,
    styles: getAppStyles(),
  };
};

// Експорт тем для використання в інших частинах додатку
export { themes, typography };