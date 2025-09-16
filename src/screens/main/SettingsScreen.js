// src/screens/main/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Linking,
  Platform,
  Modal as RNModal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Custom hooks
import { useTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useNetwork } from '../../hooks/useNetwork';

// Common components
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Switch from '../../components/common/Switch';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Icon from 'react-native-vector-icons/MaterialIcons';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const {
    theme,
    isDark,
    systemTheme,
    toggleTheme,
    setTheme,
    getColors,
    getTypography,
  } = useTheme();
  const {
    language,
    availableLanguages,
    changeLanguage,
    t,
    formatDate,
  } = useLanguage();
  const { logout, loading: authLoading } = useAuth();
  const { isConnected, connectionType, networkQuality, isOnline } = useNetwork();
  
  const colors = getColors();
  
  // Local state
  const [notifications, setNotifications] = useState({
    enabled: true,
    sound: true,
    vibration: true,
  });
  const [privacy, setPrivacy] = useState({
    locationSharing: true,
    analytics: true,
  });
  const [accessibility, setAccessibility] = useState({
    fontSize: 'medium',
    highContrast: false,
  });
  const [appInfo, setAppInfo] = useState({
    version: '1.0.0',
    build: '1',
    bundleId: '',
  });
  const [cacheInfo, setCacheInfo] = useState({
    size: '0 MB',
    lastCleared: null,
  });
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    actions: []
  });
  
  // Load app info
  useEffect(() => {
    loadAppInfo();
  }, []);
  
  const loadAppInfo = async () => {
    try {
      // Використання Expo Constants для інформації про додаток
      const version = Constants.expoConfig?.version || '1.0.0';
      const build = Constants.expoConfig?.ios?.buildNumber || 
                   Constants.expoConfig?.android?.versionCode || '1';
      const bundleId = Constants.expoConfig?.slug || '';
      
      setAppInfo({
        version,
        build,
        bundleId,
      });
      
      // Simulate cache info
      setCacheInfo({
        size: '24.5 MB',
        lastCleared: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      });
    } catch (error) {
      console.error('Error loading app info:', error);
    }
  };
  
  // Show modal helper
  const showModal = (title, message, actions = []) => {
    setModalContent({ title, message, actions });
    setModalVisible(true);
  };
  
  // Hide modal helper
  const hideModal = () => {
    setModalVisible(false);
  };
  
  // Theme options
  const themeOptions = [
    { key: 'light', label: t('settings.theme.light') || 'Світла', icon: 'light-mode' },
    { key: 'dark', label: t('settings.theme.dark') || 'Темна', icon: 'dark-mode' },
    { key: 'system', label: t('settings.theme.system') || 'Системна', icon: 'auto-mode' },
  ];
  
  // Font size options
  const fontSizeOptions = [
    { key: 'small', label: t('settings.accessibility.small') || 'Малий', multiplier: 0.85 },
    { key: 'medium', label: t('settings.accessibility.medium') || 'Середній', multiplier: 1.0 },
    { key: 'large', label: t('settings.accessibility.large') || 'Великий', multiplier: 1.15 },
  ];
  
  // Handle theme change
  const onThemeChange = (newTheme) => {
    setTheme(newTheme);
  };
  
  // Handle language change
  const onLanguageChange = async (newLanguage) => {
    try {
      await changeLanguage(newLanguage);
      showModal(
        t('settings.languageChanged') || 'Мову змінено',
        t('settings.languageChangedMessage') || 'Додаток буде перезапущено для застосування змін',
        [
          {
            text: 'OK',
            onPress: hideModal,
          }
        ]
      );
    } catch (error) {
      showModal(
        t('settings.languageChangeError') || 'Помилка',
        error.message || t('settings.languageChangeErrorMessage') || 'Не вдалося змінити мову',
        [
          {
            text: t('common.ok') || 'OK',
            onPress: hideModal,
          }
        ]
      );
    }
  };
  
  // Handle notification toggle
  const onNotificationToggle = (setting, value) => {
    setNotifications(prev => ({
      ...prev,
      [setting]: value,
    }));
  };
  
  // Handle privacy change
  const onPrivacyChange = (setting, value) => {
    setPrivacy(prev => ({
      ...prev,
      [setting]: value,
    }));
  };
  
  // Handle accessibility change
  const onAccessibilityChange = (setting, value) => {
    setAccessibility(prev => ({
      ...prev,
      [setting]: value,
    }));
  };
  
  // Handle logout
  const onLogout = () => {
    showModal(
      t('auth.logoutConfirm') || 'Вихід',
      t('auth.logoutConfirmMessage') || 'Ви впевнені, що хочете вийти?',
      [
        {
          text: t('common.cancel') || 'Скасувати',
          style: 'cancel',
          onPress: hideModal,
        },
        {
          text: t('auth.logout') || 'Вийти',
          style: 'destructive',
          onPress: () => {
            hideModal();
            logout();
          },
        },
      ]
    );
  };
  
  // Handle clear cache
  const onClearCache = () => {
    showModal(
      t('settings.clearCache') || 'Очищення кешу',
      t('settings.clearCacheConfirm') || 'Ви впевнені, що хочете очистити кеш додатку?',
      [
        {
          text: t('common.cancel') || 'Скасувати',
          style: 'cancel',
          onPress: hideModal,
        },
        {
          text: t('settings.clear') || 'Очистити',
          style: 'destructive',
          onPress: () => {
            // Simulate cache clearing
            setCacheInfo({
              size: '0 MB',
              lastCleared: new Date(),
            });
            hideModal();
            showModal(
              t('settings.cacheCleared') || 'Кеш очищено',
              t('settings.cacheClearedMessage') || 'Кеш додатку успішно очищено',
              [
                {
                  text: t('common.ok') || 'OK',
                  onPress: hideModal,
                }
              ]
            );
          },
        },
      ]
    );
  };
  
  // Handle feedback
  const onSendFeedback = () => {
    showModal(
      t('settings.sendFeedback') || 'Відправити відгук',
      t('settings.sendFeedbackMessage') || 'Оберіть спосіб відправки відгуку',
      [
        {
          text: 'Email',
          onPress: () => {
            hideModal();
            Linking.openURL('mailto:support@example.com?subject=Відгук про додаток');
          },
        },
        {
          text: t('common.cancel') || 'Скасувати',
          style: 'cancel',
          onPress: hideModal,
        },
      ]
    );
  };
  
  // Handle rate app
  const onRateApp = () => {
    showModal(
      t('settings.rateApp') || 'Оцінити додаток',
      t('settings.rateAppMessage') || 'Дякуємо за підтримку! Ви будете перенаправлені в App Store',
      [
        {
          text: t('settings.rate') || 'Оцінити',
          onPress: () => {
            hideModal();
            // In real app, this would open App Store/Google Play
            showModal(
              t('settings.thankYou') || 'Дякуємо!',
              t('settings.rateThankYouMessage') || 'Дякуємо за вашу оцінку!',
              [
                {
                  text: t('common.ok') || 'OK',
                  onPress: hideModal,
                }
              ]
            );
          },
        },
        {
          text: t('common.cancel') || 'Скасувати',
          style: 'cancel',
          onPress: hideModal,
        },
      ]
    );
  };
  
  // Render theme section
  const renderThemeSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('settings.theme.title') || 'Тема'}
      </Text>
      
      <Card 
        style={[styles.settingsCard, { backgroundColor: colors.card }]}
        elevation="small"
      >
        {themeOptions.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
            onPress={() => onThemeChange(option.key)}
            accessibilityLabel={`${option.label} ${theme === option.key ? t('settings.selected') || 'вибрано' : ''}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: theme === option.key }}
          >
            <View style={styles.settingContent}>
              <Icon 
                name={option.icon} 
                size={24} 
                color={theme === option.key ? colors.primary : colors.textSecondary} 
              />
              <Text 
                style={[
                  styles.settingText, 
                  { color: theme === option.key ? colors.primary : colors.text }
                ]}
              >
                {option.label}
              </Text>
            </View>
            
            {theme === option.key && (
              <Icon name="check" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  );
  
  // Render language section
  const renderLanguageSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('settings.language.title') || 'Мова'}
      </Text>
      
      <Card 
        style={[styles.settingsCard, { backgroundColor: colors.card }]}
        elevation="small"
      >
        {availableLanguages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[styles.settingItem, { borderBottomColor: colors.border }]}
            onPress={() => onLanguageChange(lang.code)}
            accessibilityLabel={`${lang.flag} ${lang.name} ${language === lang.code ? t('settings.selected') || 'вибрано' : ''}`}
            accessibilityRole="radio"
            accessibilityState={{ selected: language === lang.code }}
          >
            <View style={styles.settingContent}>
              <Text style={[styles.languageFlag, { color: colors.text }]}>
                {lang.flag}
              </Text>
              <Text 
                style={[
                  styles.settingText, 
                  { color: language === lang.code ? colors.primary : colors.text }
                ]}
              >
                {lang.name}
              </Text>
            </View>
            
            {language === lang.code && (
              <Icon name="check" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </Card>
    </View>
  );
  
  // Render notifications section
  const renderNotificationsSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('settings.notifications.title') || 'Сповіщення'}
      </Text>
      
      <Card 
        style={[styles.settingsCard, { backgroundColor: colors.card }]}
        elevation="small"
      >
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingContent}>
            <Icon name="notifications" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.notifications.enabled') || 'Увімкнути сповіщення'}
            </Text>
          </View>
          <Switch
            value={notifications.enabled}
            onValueChange={(value) => onNotificationToggle('enabled', value)}
            accessibilityLabel={t('settings.notifications.enabled') || 'Увімкнути сповіщення'}
          />
        </View>
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingContent}>
            <Icon name="volume-up" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.notifications.sound') || 'Звук сповіщень'}
            </Text>
          </View>
          <Switch
            value={notifications.sound}
            onValueChange={(value) => onNotificationToggle('sound', value)}
            disabled={!notifications.enabled}
            accessibilityLabel={t('settings.notifications.sound') || 'Звук сповіщень'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Icon name="vibration" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.notifications.vibration') || 'Вібрація'}
            </Text>
          </View>
          <Switch
            value={notifications.vibration}
            onValueChange={(value) => onNotificationToggle('vibration', value)}
            disabled={!notifications.enabled}
            accessibilityLabel={t('settings.notifications.vibration') || 'Вібрація'}
          />
        </View>
      </Card>
    </View>
  );
  
  // Render privacy section
  const renderPrivacySection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('settings.privacy.title') || 'Конфіденційність'}
      </Text>
      
      <Card 
        style={[styles.settingsCard, { backgroundColor: colors.card }]}
        elevation="small"
      >
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingContent}>
            <Icon name="location-on" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.privacy.locationSharing') || 'Ділитися геолокацією'}
            </Text>
          </View>
          <Switch
            value={privacy.locationSharing}
            onValueChange={(value) => onPrivacyChange('locationSharing', value)}
            accessibilityLabel={t('settings.privacy.locationSharing') || 'Ділитися геолокацією'}
          />
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Icon name="analytics" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.privacy.analytics') || 'Аналітика використання'}
            </Text>
          </View>
          <Switch
            value={privacy.analytics}
            onValueChange={(value) => onPrivacyChange('analytics', value)}
            accessibilityLabel={t('settings.privacy.analytics') || 'Аналітика використання'}
          />
        </View>
      </Card>
    </View>
  );
  
  // Render accessibility section
  const renderAccessibilitySection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('settings.accessibility.title') || 'Доступність'}
      </Text>
      
      <Card 
        style={[styles.settingsCard, { backgroundColor: colors.card }]}
        elevation="small"
      >
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingContent}>
            <Icon name="text-fields" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.accessibility.fontSize') || 'Розмір шрифту'}
            </Text>
          </View>
          <View style={styles.fontSizeSelector}>
            {fontSizeOptions.map((size) => (
              <TouchableOpacity
                key={size.key}
                style={[
                  styles.fontSizeButton,
                  { 
                    backgroundColor: accessibility.fontSize === size.key 
                      ? colors.primary + '20' 
                      : colors.inputBackground,
                    borderColor: accessibility.fontSize === size.key 
                      ? colors.primary 
                      : colors.border,
                  }
                ]}
                onPress={() => onAccessibilityChange('fontSize', size.key)}
                accessibilityLabel={size.label}
                accessibilityRole="button"
                accessibilityState={{ selected: accessibility.fontSize === size.key }}
              >
                <Text style={[
                  styles.fontSizeText,
                  { 
                    color: accessibility.fontSize === size.key 
                      ? colors.primary 
                      : colors.text,
                    fontSize: 14 * size.multiplier,
                  }
                ]}>
                  A
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Icon name="contrast" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.accessibility.highContrast') || 'Високий контраст'}
            </Text>
          </View>
          <Switch
            value={accessibility.highContrast}
            onValueChange={(value) => onAccessibilityChange('highContrast', value)}
            accessibilityLabel={t('settings.accessibility.highContrast') || 'Високий контраст'}
          />
        </View>
      </Card>
    </View>
  );
  
  // Render about section
  const renderAboutSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('settings.about.title') || 'Про додаток'}
      </Text>
      
      <Card 
        style={[styles.settingsCard, { backgroundColor: colors.card }]}
        elevation="small"
      >
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingContent}>
            <Icon name="info" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.about.version') || 'Версія'}
            </Text>
          </View>
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
            {appInfo.version} ({appInfo.build})
          </Text>
        </View>
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingContent}>
            <Icon name="storage" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.about.cache') || 'Кеш додатку'}
            </Text>
          </View>
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
            {cacheInfo.size}
          </Text>
        </View>
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingContent}>
            <Icon name="network-check" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.about.network') || 'Статус мережі'}
            </Text>
          </View>
          <View style={styles.networkStatus}>
            <View style={[
              styles.networkIndicator,
              { 
                backgroundColor: isOnline ? colors.success : colors.error 
              }
            ]} />
            <Text style={[styles.networkText, { color: colors.textSecondary }]}>
              {isOnline ? t('settings.about.connected') || 'Підключено' : t('settings.about.disconnected') || 'Відключено'}
            </Text>
          </View>
        </View>
        
        <View style={[styles.settingItem, { borderBottomColor: colors.border }]}>
          <View style={styles.settingContent}>
            <Icon name="signal-cellular-alt" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.about.quality') || 'Якість з\'єднання'}
            </Text>
          </View>
          <Text style={[styles.settingValue, { color: colors.textSecondary }]}>
            {t(`settings.about.quality.${networkQuality}`) || networkQuality}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={onClearCache}
          accessibilityLabel={t('settings.clearCache') || 'Очистити кеш'}
          accessibilityRole="button"
        >
          <View style={styles.settingContent}>
            <Icon name="cleaning-services" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.clearCache') || 'Очистити кеш'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: colors.border }]}
          onPress={onSendFeedback}
          accessibilityLabel={t('settings.sendFeedback') || 'Відправити відгук'}
          accessibilityRole="button"
        >
          <View style={styles.settingContent}>
            <Icon name="feedback" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.sendFeedback') || 'Відправити відгук'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.settingItem}
          onPress={onRateApp}
          accessibilityLabel={t('settings.rateApp') || 'Оцінити додаток'}
          accessibilityRole="button"
        >
          <View style={styles.settingContent}>
            <Icon name="star" size={24} color={colors.textSecondary} />
            <Text style={[styles.settingText, { color: colors.text }]}>
              {t('settings.rateApp') || 'Оцінити додаток'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </Card>
    </View>
  );
  
  // Render logout button
  const renderLogoutButton = () => (
    <View style={styles.section}>
      <Button
        title={t('auth.logout') || 'Вийти з облікового запису'}
        onPress={onLogout}
        variant="danger"
        size="large"
        iconLeft={<Icon name="logout" size={20} />}
        style={styles.logoutButton}
        accessibilityLabel={t('auth.logout') || 'Вийти з облікового запису'}
      />
    </View>
  );
  
  // Render custom modal
  const renderCustomModal = () => (
    <RNModal
      visible={modalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={hideModal}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          {modalContent.title && (
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{modalContent.title}</Text>
            </View>
          )}
          <View style={styles.modalContent}>
            <Text style={[styles.modalMessage, { color: colors.text }]}>
              {modalContent.message}
            </Text>
            <View style={styles.modalActions}>
              {modalContent.actions.map((action, index) => (
                <View key={index} style={styles.modalButtonWrapper}>
                  <Button
                    title={action.text}
                    onPress={action.onPress}
                    variant={action.style === 'destructive' ? 'error' : 'primary'}
                    style={styles.modalButton}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </RNModal>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Section */}
        {renderThemeSection()}
        
        {/* Language Section */}
        {renderLanguageSection()}
        
        {/* Notifications Section */}
        {renderNotificationsSection()}
        
        {/* Privacy Section */}
        {renderPrivacySection()}
        
        {/* Accessibility Section */}
        {renderAccessibilitySection()}
        
        {/* About Section */}
        {renderAboutSection()}
        
        {/* Logout Button */}
        {renderLogoutButton()}
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {t('settings.appName') || 'Законослухняний громадянин'} v{appInfo.version}
          </Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            © {new Date().getFullYear()} {t('settings.copyright') || 'Всі права захищені'}
          </Text>
        </View>
      </ScrollView>
      
      {/* Custom Modal */}
      {renderCustomModal()}
      
      {/* Loading overlay */}
      <LoadingSpinner
        visible={authLoading}
        overlay={true}
        text={t('settings.loggingOut') || 'Вихід...'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingsCard: {
    borderRadius: 12,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  languageFlag: {
    fontSize: 24,
  },
  fontSizeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  fontSizeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeText: {
    fontWeight: '600',
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  networkText: {
    fontSize: 14,
  },
  logoutButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  // Custom Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.25)',
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContent: {
    padding: 16,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'column',
  },
  modalButtonWrapper: {
    marginBottom: 8,
  },
  modalButton: {
    width: '100%',
  },
});

export default SettingsScreen;