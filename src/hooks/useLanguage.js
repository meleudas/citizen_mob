// src/hooks/useLanguage.js
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { translations } from '../constants/Translations';
const LANGUAGE_STORAGE_KEY = 'appLanguage';
const DEFAULT_LANGUAGE = 'uk';

// Список доступних мов
const availableLanguages = [
  {
    code: 'uk',
    name: 'Українська',
    locale: 'uk-UA',
    flag: '🇺🇦',
    isRTL: false,
  },
  {
    code: 'en',
    name: 'English',
    locale: 'en-US',
    flag: '🇺🇸',
    isRTL: false,
  },
  {
    code: 'pl',
    name: 'Polski',
    locale: 'pl-PL',
    flag: '🇵🇱',
    isRTL: false,
  },
];


// Контекст мови
const LanguageContext = createContext();

// Провайдер мови
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [translationsData, setTranslationsData] = useState(translations);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Визначення системної мови
  const getSystemLanguage = useCallback(() => {
    let deviceLanguage = DEFAULT_LANGUAGE;
    
    if (Platform.OS === 'ios') {
      // Отримання системної мови для iOS
      try {
        const locale = NativeModules.SettingsManager?.settings?.AppleLocale ||
                      NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
        
        if (locale && typeof locale === 'string') {
          deviceLanguage = locale.split('-')[0];
        }
      } catch (err) {
        console.warn('Failed to get iOS system language:', err);
      }
    } else {
      // Отримання системної мови для Android
      try {
        const locale = NativeModules.I18nManager?.localeIdentifier;
        
        if (locale && typeof locale === 'string') {
          deviceLanguage = locale.split('_')[0];
        }
      } catch (err) {
        console.warn('Failed to get Android system language:', err);
      }
    }
    
    // Перевірка, чи підтримується мова
    const supportedLanguage = availableLanguages.find(lang => lang.code === deviceLanguage);
    return supportedLanguage ? deviceLanguage : DEFAULT_LANGUAGE;
  }, []);

  // Завантаження збереженої мови
  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        setLoading(true);
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        
        if (savedLanguage && availableLanguages.find(lang => lang.code === savedLanguage)) {
          setLanguage(savedLanguage);
        } else {
          // Встановлення системної мови
          const systemLanguage = getSystemLanguage();
          setLanguage(systemLanguage);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error loading language:', err);
        setError('Failed to load language settings');
        // Встановлення мови за замовчуванням при помилці
        setLanguage(DEFAULT_LANGUAGE);
        setLoading(false);
      }
    };

    loadSavedLanguage();
  }, [getSystemLanguage]);

  // Зміна мови
  const changeLanguage = useCallback(async (languageCode) => {
    try {
      if (availableLanguages.find(lang => lang.code === languageCode)) {
        setLanguage(languageCode);
        await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, languageCode);
        return { success: true };
      } else {
        throw new Error('Unsupported language');
      }
    } catch (err) {
      console.error('Error changing language:', err);
      setError('Failed to change language');
      return { success: false, error: err.message };
    }
  }, []);

  // Переклад тексту
  const t = useCallback((key, params = {}) => {
    const translation = translationsData[language]?.[key] || translationsData[DEFAULT_LANGUAGE]?.[key] || key;
    
    // Заміна параметрів у тексті
    let translatedText = translation;
    Object.keys(params).forEach(param => {
      translatedText = translatedText.replace(`{{${param}}}`, params[param]);
    });
    
    return translatedText;
  }, [language, translationsData]);

  // Форматування дати
  const formatDate = useCallback((date, format = 'full') => {
    if (!date) return '';
    
    const dateObj = new Date(date);
    const options = {
      short: { year: 'numeric', month: 'short', day: 'numeric' },
      medium: { year: 'numeric', month: 'long', day: 'numeric' },
      full: { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' },
      time: { hour: '2-digit', minute: '2-digit' }
    };
    
    try {
      return new Intl.DateTimeFormat(
        availableLanguages.find(lang => lang.code === language)?.locale || 'uk-UA',
        options[format]
      ).format(dateObj);
    } catch (err) {
      // Fallback для випадку помилки
      return dateObj.toLocaleString();
    }
  }, [language]);

  // Форматування числа
  const formatNumber = useCallback((number, options = {}) => {
    try {
      return new Intl.NumberFormat(
        availableLanguages.find(lang => lang.code === language)?.locale || 'uk-UA',
        options
      ).format(number);
    } catch (err) {
      // Fallback для випадку помилки
      return number.toString();
    }
  }, [language]);

  // Отримання поточної мови
  const getCurrentLanguage = useCallback(() => {
    return availableLanguages.find(lang => lang.code === language) || availableLanguages[0];
  }, [language]);

  // Отримання доступних мов
  const getAvailableLanguages = useCallback(() => {
    return availableLanguages;
  }, []);

  // Перевірка RTL (справа наліво)
  const isRTL = useCallback(() => {
    const currentLang = getCurrentLanguage();
    return currentLang ? currentLang.isRTL : false;
  }, [getCurrentLanguage]);

  // Очищення помилок
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    // Стани
    language,
    availableLanguages,
    translations: translationsData,
    isRTL: isRTL(),
    loading,
    error,
    
    // Основні функції
    changeLanguage,
    t,
    formatDate,
    formatNumber,
    getCurrentLanguage,
    getAvailableLanguages,
    
    // Управління станом
    clearError,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// Хук для використання мови
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  
  return context;
};

// Хелпер для форматування валюти
export const useCurrency = () => {
  const { language } = useLanguage();
  
  const formatCurrency = useCallback((amount, currency = 'UAH') => {
    try {
      const locale = availableLanguages.find(lang => lang.code === language)?.locale || 'uk-UA';
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (err) {
      return `${amount} ${currency}`;
    }
  }, [language]);
  
  return { formatCurrency };
};

// Хелпер для множинного числа
export const usePlural = () => {
  const { language } = useLanguage();
  
  const plural = useCallback((count, forms) => {
    // forms: [one, few, many] для української
    // forms: [one, other] для англійської
    
    const getPluralForm = (num, lang) => {
      if (lang === 'uk') {
        if (num % 10 === 1 && num % 100 !== 11) return 0; // one
        if (num % 10 >= 2 && num % 10 <= 4 && (num % 100 < 10 || num % 100 >= 20)) return 1; // few
        return 2; // many
      } else if (lang === 'en') {
        return num === 1 ? 0 : 1; // one, other
      } else if (lang === 'pl') {
        if (num === 1) return 0; // one
        if (num % 10 >= 2 && num % 10 <= 4 && (num % 100 < 10 || num % 100 >= 20)) return 1; // few
        return 2; // many
      }
      return 0;
    };
    
    const formIndex = getPluralForm(count, language);
    return forms[formIndex] || forms[0];
  }, [language]);
  
  return { plural };
};

// Хелпер для динамічних перекладів
export const useDynamicTranslation = () => {
  const { t } = useLanguage();
  
  const translateWithFallback = useCallback((key, fallback, params = {}) => {
    const translation = t(key, params);
    return translation === key ? fallback : translation;
  }, [t]);
  
  return { t: translateWithFallback };
};