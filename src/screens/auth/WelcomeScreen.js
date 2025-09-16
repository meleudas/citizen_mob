// src/screens/auth/WelcomeScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { useThemeColors } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import Button from '../../components/common/Button';
import Picker from '../../components/common/Picker';
import { useAuth }  from '../../hooks/useAuth';
const WelcomeScreen = ({ navigation }) => {
  console.log('🗺️ [WelcomeScreen] Доступні маршрути з поточного навігатора:', navigation.getState()?.routes.map(r => r.name));
  const { loginAsGuest } = useAuth();
  const { colors } = useThemeColors();
  const { t, language, changeLanguage, getAvailableLanguages } = useLanguage();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    // Переходимо на екран реєстрації
    navigation.navigate('Register');
  };

  const handleLogin = () => {
    // Переходимо на екран входу
    navigation.navigate('Login');
  }

  const handleGuestAccess = () => {
    // Для гостя переходимо безпосередньо на головний екран
    console.log('🚪 [handleGuestAccess] Спроба переходу як гість');
    loginAsGuest();
    
  };

  // Отримання доступних мов для вибору
  const availableLanguages = getAvailableLanguages();
  
  // Форматування даних для Picker
  const languageOptions = availableLanguages.map(lang => ({
    label: `${lang.flag} ${lang.name}`,
    value: lang.code
  }));

  const handleLanguageChange = async (selectedLanguage) => {
    await changeLanguage(selectedLanguage);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Вибір мови - переміщено вгору */}
        <View style={styles.languageSelectorContainer}>
          <Picker
            selectedValue={language}
            onValueChange={handleLanguageChange}
            items={languageOptions}
            style={[styles.languagePicker, { backgroundColor: colors.card }]}
            accessibilityLabel={t('auth.selectLanguage')}
          />
        </View>

        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          {/* Логотип або ілюстрація */}
          <View style={styles.logoContainer}>
            <Text style={[styles.logo, { color: colors.primary }]}>
              🛡️
            </Text>
            <Text style={[styles.appName, { color: colors.text }]}>
              {t('auth.appName')}
            </Text>
          </View>

          {/* Опис */}
          <View style={styles.descriptionContainer}>
            <Text style={[styles.description, { color: colors.text }]}>
              {t('auth.welcomeDescription')}
            </Text>
            <Text style={[styles.subDescription, { color: colors.textSecondary }]}>
              {t('auth.welcomeSubDescription')}
            </Text>
          </View>

          {/* Кнопки дій */}
          <View style={styles.buttonContainer}>
            <Button
              title={t('auth.getStarted')}
              onPress={handleGetStarted}
              variant="primary"
              size="large"
              style={styles.mainButton}
              accessibilityLabel={t('auth.getStartedAccessibility')}
            />
            
            {/* Кнопка "Продовжити як гість" */}
            <Button
              title={t('auth.continueAsGuest')}
              onPress={handleGuestAccess}
              variant="outline"
              size="large"
              style={styles.guestButton}
              accessibilityLabel={t('auth.continueAsGuestAccessibility')}
            />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              {t('auth.alreadyHaveAccount')}
            </Text>
            <TouchableOpacity 
              onPress={handleLogin}
              accessibilityLabel={t('auth.signIn')}
              accessibilityRole="button"
            >
              <Text style={[styles.signInText, { color: colors.primary }]}>
                {t('auth.signIn')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  languageSelectorContainer: {
    alignSelf: 'flex-end',
    width: '40%',
    margin: 30,
  },
  languagePicker: {
    borderRadius: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 34,
  },
  descriptionContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  description: {
    fontSize: 20,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 28,
  },
  subDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 32,
  },
  mainButton: {
    marginBottom: 16,
  },
  guestButton: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 16,
    marginRight: 8,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WelcomeScreen;