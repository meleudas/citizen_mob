// src/components/forms/ViolationForm.js
import React, { useState, useEffect, useRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Animated,
  Modal, // ДОДАНО
  FlatList, // ДОДАНО
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';
import Input from '../common/Input';
import Button from '../common/Button';
import ErrorMessage from '../common/ErrorMessage';
import LoadingSpinner from '../common/LoadingSpinner';
import Icon from 'react-native-vector-icons/MaterialIcons';
import * as Location from 'expo-location';
import { useLanguage } from '../../hooks/useLanguage';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
// ДОДАНО нові хуки
import { useNetwork } from '../../hooks/useNetwork';
import { useSync } from '../../hooks/useSync';

const ViolationForm = React.forwardRef(({
  // Основні пропси
  onSubmit,
  onCancel,
  initialValues = {},
  
  // Стан
  loading = false,
  error = null,
  
  // Стилі
  style,
  inputStyle,
  buttonStyle,
  
  // Accessibility
  testID,
  accessibilityLabel,
  ...restProps
}, ref) => {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();
  // ДОДАНО хуки для мережі та синхронізації
  const network = useNetwork();
  const { syncProgress, isSyncing, pendingCount } = useSync();
  
  // Refs
  const scrollViewRef = useRef(null);
  const descriptionInputRef = useRef(null);
  const cameraRef = useRef(null);
  const networkStatusAnimation = useRef(new Animated.Value(0)).current;
  
  // Стан форми
  const [formData, setFormData] = useState({
    description: initialValues.description || '',
    category: initialValues.category || '',
    photo: initialValues.photo || null,
    location: initialValues.location || null,
    dateTime: initialValues.dateTime || new Date(),
  });
  
  // Стан валідації
  const [errors, setErrors] = useState({});
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [isOnline, setIsOnline] = useState(network.isOnline() && network.isServerReachable);
  
  // Категорії правопорушеннь
  const categories = [
    { key: 'parking', label: t('violations.categories.parking') || 'Паркування' },
    { key: 'trash', label: t('violations.categories.trash') || 'Сміття' },
    { key: 'noise', label: t('violations.categories.noise') || 'Шум' },
    { key: 'traffic', label: t('violations.categories.traffic') || 'Порушення правил дорожнього руху' },
    { key: 'vandalism', label: t('violations.categories.vandalism') || 'Вандалізм' },
    { key: 'public_safety', label: t('violations.categories.public_safety') || 'Безпека громадських місць' },
    { key: 'infrastructure', label: t('violations.categories.infrastructure') || 'Інфраструктура' },
    { key: 'environment', label: t('violations.categories.environment') || 'Навколишнє середовище' },
    { key: 'other', label: t('violations.categories.other') || 'Інше' }
  ];

  // Анімація для модального вікна
  const slideAnim = useRef(new Animated.Value(300)).current;

  // Анімація статусу мережі
  useEffect(() => {
    Animated.timing(networkStatusAnimation, {
      toValue: isOnline ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isOnline, networkStatusAnimation]);

  // Відстеження статусу мережі
  useEffect(() => {
    const updateNetworkStatus = () => {
      const onlineStatus = network.isOnline() && network.isServerReachable;
      setIsOnline(onlineStatus);
    };
    
    updateNetworkStatus();
  }, [network]);

  // Анімація відкриття/закриття модального вікна
  useEffect(() => {
    if (showCategoryPicker) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showCategoryPicker]);

  // Додаємо методи для зовнішнього використання через ref
  useImperativeHandle(ref, () => ({
    resetForm: () => {
      setFormData({
        description: '',
        category: '',
        photo: null,
        location: null,
        dateTime: new Date(),
      });
      setErrors({});
    },
    getFormData: () => formData,
  }));

  // Перевірка дозволів камери при монтуванні
  useEffect(() => {
    const checkPermissions = async () => {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      setCameraPermission(permissionResult.granted);
    };
    
    checkPermissions();
  }, []);

  // Валідація форми
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.description.trim()) {
      newErrors.description = t('violations.errors.descriptionRequired') || 'Опис обов\'язковий';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = t('violations.errors.descriptionMinLength') || 'Опис має містити мінімум 10 символів';
    }
    
    if (!formData.category) {
      newErrors.category = t('violations.errors.categoryRequired') || 'Оберіть категорію';
    }
    
    if (!formData.photo) {
      newErrors.photo = t('violations.errors.photoRequired') || 'Фото обов\'язкове';
    }
    
    if (!formData.location) {
      newErrors.location = t('violations.errors.locationRequired') || 'Геолокація обов\'язкова';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обробка зміни полів
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Очищення помилки при зміні поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Обробка зйомки фото
  const handleTakePhoto = async () => {
    if (loading || isPhotoLoading) return;
    
    try {
      setIsPhotoLoading(true);
      setErrors(prev => ({ ...prev, photo: null }));
      
      // Перевірка дозволів
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.status !== 'granted') {
        setErrors(prev => ({ 
          ...prev, 
          photo: t('violations.errors.cameraPermissionDenied') || 'Доступ до камери відмовлено' 
        }));
        setIsPhotoLoading(false);
        return;
      }
      
      // Зйомка фото
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
      });

      if (result.canceled) {
        setIsPhotoLoading(false);
        return;
      }

      const photo = result.assets[0];
      
      // Валідація розміру файлу (новий API)
      try {
        const file = new File(photo.uri);
        
        // Перевірка чи файл існує
        if (!file.exists) {
          throw new Error('Файл не існує');
        }
        
        // Перевірка розміру файлу (максимум 10MB)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          setErrors(prev => ({ 
            ...prev, 
            photo: `Файл занадто великий (${(file.size / 1024 / 1024).toFixed(2)}MB)` 
          }));
          setIsPhotoLoading(false);
          return;
        }
        
      } catch (validationError) {
        console.warn('Попередження валідації:', validationError);
        // Продовжуємо, навіть якщо валідація не вдалася
      }
      
      // Встановлюємо фото
      handleInputChange('photo', {
        uri: photo.uri,
        width: photo.width,
        height: photo.height,
      });
      
    } catch (error) {
      console.error('Помилка зйомки фото:', error);
      setErrors(prev => ({ 
        ...prev, 
        photo: t('violations.errors.photoError') || 'Помилка при зйомці фото' 
      }));
    } finally {
      setIsPhotoLoading(false);
    }
  };

  // Обробка отримання геолокації
  const handleGetCurrentLocation = async () => {
    if (loading || isLocationLoading) return;
    
    setIsLocationLoading(true);
    setErrors(prev => ({ ...prev, location: null }));
    
    try {
      // Запит дозволу на використання геолокації
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setIsLocationLoading(false);
        setErrors(prev => ({ 
          ...prev, 
          location: t('violations.errors.locationPermissionDenied') || 'Доступ до геолокації відмовлено. Перевірте налаштування додатку.' 
        }));
        return;
      }

      // Отримання поточної позиції
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeout: 15000,
        maximumAge: 10000,
      });

      setIsLocationLoading(false);
      
      const { latitude, longitude } = location.coords;
      handleInputChange('location', {
        latitude,
        longitude,
        timestamp: new Date(),
      });
    } catch (error) {
      setIsLocationLoading(false);
      console.error('Помилка геолокації:', error);
      
      let errorMessage = t('violations.errors.locationError') || 'Не вдалося отримати геолокацію. Перевірте налаштування додатку.';
      
      if (error.code === 'E_LOCATION_SETTINGS') {
        errorMessage = t('violations.errors.locationSettings') || 'Геолокація вимкнена. Увімкніть її в налаштуваннях пристрою.';
      }
      
      setErrors(prev => ({ ...prev, location: errorMessage }));
    }
  };

  // Обробка вибору дати/часу
  const handleDateTimeChange = () => {
    if (loading) return;
    
    // В реальному додатку тут буде DatePicker
    const newDateTime = new Date();
    handleInputChange('dateTime', newDateTime);
  };

  // Обробка сабміту форми
  const handleSubmit = () => {
    if (loading) return;
    
    if (validateForm()) {
      onSubmit({
        ...formData,
        dateTime: formData.dateTime.toISOString(),
      });
    } else {
      // Прокрутити до першої помилки
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    }
  };

  // Форматування дати для відображення
  const formatDateTime = (date) => {
    if (!date) return '';
    return date.toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Рендер статусу мережі
  const renderNetworkStatus = () => {
    const backgroundColor = networkStatusAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [colors.warning, colors.success]
    });

    return (
      <Animated.View style={[styles.networkStatus, { backgroundColor }]}>
        <View style={styles.networkStatusContent}>
          <Icon 
            name={isOnline ? "wifi" : "wifi-off"} 
            size={16} 
            color={colors.white} 
          />
          <Text style={[styles.networkStatusText, { color: colors.white, marginLeft: 8 }]}>
            {isOnline 
              ? `${t('common.online') || 'Онлайн'}${isSyncing ? ` (${Math.round(syncProgress)}%)` : ''}` 
              : t('common.offline') || 'Офлайн'}
          </Text>
          {isSyncing && (
            <View style={styles.syncIndicator}>
              <LoadingSpinner visible={true} size="small" color={colors.white} />
              <Text style={[styles.syncText, { color: colors.white, marginLeft: 4 }]}>
                {pendingCount > 0 ? `(${pendingCount})` : ''}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  };

  // Рендер фото
  const renderPhotoPreview = () => {
    if (isPhotoLoading) {
      return (
        <View style={[styles.photoContainer, { backgroundColor: colors.card }]}>
          <LoadingSpinner visible={true} size="small" />
          <Text style={[styles.photoLoadingText, { color: colors.textSecondary }]}>
            {t('violations.photo.loading') || 'Завантаження фото...'}
          </Text>
        </View>
      );
    }

    if (formData.photo) {
      return (
        <View style={styles.photoContainer}>
          <Image 
            source={{ uri: formData.photo.uri }} 
            style={styles.photo}
            resizeMode="cover"
            accessibilityLabel={t('violations.photo.preview') || "Попередній перегляд фото"}
          />
          <TouchableOpacity
            style={[styles.removePhotoButton, { backgroundColor: colors.error }]}
            onPress={() => handleInputChange('photo', null)}
            accessibilityLabel={t('violations.photo.remove') || "Видалити фото"}
            accessibilityRole="button"
          >
            <Icon name="close" size={20} color={colors.white} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[styles.photoPlaceholder, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handleTakePhoto}
        disabled={loading}
        accessibilityLabel={t('violations.photo.add') || "Зробити фото правопорушення"}
        accessibilityRole="button"
      >
        <Icon name="photo-camera" size={48} color={colors.primary} />
        <Text style={[styles.photoPlaceholderText, { color: colors.text }]}>
          {t('violations.photo.take') || 'Зробити фото'}
        </Text>
        <Text style={[styles.photoPlaceholderSubtext, { color: colors.textSecondary }]}>
          {t('violations.photo.tapToCapture') || 'Натисніть для зйомки'}
        </Text>
        {!isOnline && (
          <View style={[styles.offlineIndicator, { backgroundColor: colors.warning }]}>
            <Icon name="cloud-off" size={16} color={colors.white} />
            <Text style={[styles.offlineText, { color: colors.white, marginLeft: 4 }]}>
              {t('violations.photo.offlineMode') || 'Режим офлайн'}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Рендер геолокації
  const renderLocationInfo = () => {
    if (isLocationLoading) {
      return (
        <View style={[styles.locationContainer, { backgroundColor: colors.card }]}>
          <LoadingSpinner visible={true} size="small" text={t('violations.location.loading') || "Отримання геолокації..."} />
        </View>
      );
    }

    if (formData.location) {
      return (
        <View style={[styles.locationContainer, { backgroundColor: colors.card }]}>
          <View style={styles.locationInfo}>
            <Icon name="location-on" size={20} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.text }]}>
              {formData.location.latitude.toFixed(6)}, {formData.location.longitude.toFixed(6)}
            </Text>
          </View>
          <Text style={[styles.locationTime, { color: colors.textSecondary }]}>
            {t('violations.location.obtained') || 'Отримано'}: {formData.location.timestamp?.toLocaleTimeString('uk-UA') || 'щойно'}
          </Text>
        </View>
      );
    }

    return null;
  };

  // Рендер елементу категорії для FlatList
  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.modalCategoryItem, { 
        borderBottomColor: colors.border 
      }]}
      onPress={() => {
        handleInputChange('category', item.key);
        setShowCategoryPicker(false);
      }}
      disabled={loading}
      accessibilityLabel={item.label}
      accessibilityRole="button"
    >
      <Text style={[styles.modalCategoryItemText, { color: colors.text }]}>
        {item.label}
      </Text>
      {formData.category === item.key && (
        <Icon name="check" size={24} color={colors.primary} />
      )}
    </TouchableOpacity>
  );

  // Рендер модального вікна категорій
  const renderCategoryModal = () => (
    <Modal
      visible={showCategoryPicker}
      transparent={true}
      animationType="none"
      onRequestClose={() => setShowCategoryPicker(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowCategoryPicker(false)}
      >
        <Animated.View style={[
          styles.modalContent,
          {
            backgroundColor: colors.background,
            transform: [{ translateY: slideAnim }]
          }
        ]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('violations.category.select') || 'Оберіть категорію'}
            </Text>
            <TouchableOpacity
              onPress={() => setShowCategoryPicker(false)}
              style={styles.modalCloseButton}
            >
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.key}
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );

  // Рендер вибору категорії з модальним вікном
  const renderCategorySelector = () => (
    <View style={styles.categoryContainer}>
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.text }]}>
          {t('violations.category') || 'Категорія'} *
        </Text>
        {errors.category && (
          <Text style={[styles.errorText, { color: colors.error }]}>
            {errors.category}
          </Text>
        )}
      </View>
      
      <TouchableOpacity
        style={[styles.categorySelector, { 
          backgroundColor: colors.card, 
          borderColor: errors.category ? colors.error : colors.border 
        }]}
        onPress={() => !loading && setShowCategoryPicker(true)}
        disabled={loading}
        accessibilityLabel={t('violations.category.select') || "Оберіть категорію правопорушення"}
        accessibilityRole="button"
      >
        <Text style={[styles.categorySelectorText, { 
          color: formData.category ? colors.text : colors.textSecondary 
        }]}>
          {formData.category 
            ? categories.find(c => c.key === formData.category)?.label || formData.category
            : t('violations.category.placeholder') || 'Оберіть категорію'
          }
        </Text>
        <Icon name="arrow-drop-down" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Модальне вікно категорій */}
      {renderCategoryModal()}
    </View>
  );

  return (
    <ScrollView 
      ref={scrollViewRef}
      style={[styles.container, style]}
      contentContainerStyle={styles.contentContainer}
      testID={testID}
      accessibilityLabel={accessibilityLabel || t('violations.form.title') || "Форма додавання правопорушення"}
      keyboardShouldPersistTaps="handled"
      {...restProps}
    >
      {/* Статус мережі */}
      {renderNetworkStatus()}

      {/* Заголовок */}
      <Text style={[styles.title, { color: colors.text }]}>
        {t('violations.form.addTitle') || 'Додати правопорушення'}
      </Text>

      {/* Помилка форми */}
      <ErrorMessage
        message={error}
        visible={!!error}
        type="error"
        style={styles.formError}
        accessibilityLabel={error}
      />

      {/* Опис */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('violations.description') || 'Опис правопорушення'} *
          </Text>
          <Text style={[styles.characterCount, { color: colors.textSecondary }]}>
            {formData.description.length}/500
          </Text>
        </View>
        <Input
          ref={descriptionInputRef}
          value={formData.description}
          onChangeText={(value) => handleInputChange('description', value)}
          placeholder={t('violations.description.placeholder') || "Детально опишіть правопорушення..."}
          multiline={true}
          numberOfLines={4}
          maxLength={500}
          showError={!!errors.description}
          errorText={errors.description}
          style={[styles.input, inputStyle]}
          accessibilityLabel={t('violations.description') || "Опис правопорушення"}
          editable={!loading}
        />
      </View>

      {/* Категорія */}
      {renderCategorySelector()}

      {/* Фото */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('violations.photo') || 'Фото правопорушення'} *
          </Text>
          {errors.photo && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.photo}
            </Text>
          )}
        </View>
        {renderPhotoPreview()}
      </View>

      {/* Геолокація */}
      <View style={styles.fieldContainer}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('violations.location') || 'Геолокація'} *
          </Text>
          {errors.location && (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errors.location}
            </Text>
          )}
        </View>
        {renderLocationInfo()}
        <Button
          title={formData.location 
            ? t('violations.location.update') || "Оновити геолокацію" 
            : t('violations.location.get') || "Отримати геолокацію"
          }
          onPress={handleGetCurrentLocation}
          variant="secondary"
          loading={isLocationLoading}
          disabled={loading || isLocationLoading}
          style={styles.locationButton}
          iconLeft={<Icon name="my-location" size={20} color={isDark ? colors.white : colors.primary} />}
          accessibilityLabel={formData.location 
            ? t('violations.location.update') || "Оновити геолокацію"
            : t('violations.location.get') || "Отримати геолокацію"
          }
        />
      </View>

      {/* Дата та час */}
      <View style={styles.fieldContainer}>
        <Text style={[styles.label, { color: colors.text }]}>
          {t('violations.dateTime') || 'Дата та час'}
        </Text>
        <TouchableOpacity
          style={[styles.dateTimeContainer, { backgroundColor: colors.card }]}
          onPress={handleDateTimeChange}
          disabled={loading}
          accessibilityLabel={t('violations.dateTime.select') || "Оберіть дату та час"}
          accessibilityRole="button"
        >
          <Icon name="schedule" size={20} color={colors.textSecondary} />
          <Text style={[styles.dateTimeText, { color: colors.text }]}>
            {formatDateTime(formData.dateTime)}
          </Text>
          <Icon name="edit" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Кнопки дій */}
      <View style={styles.buttonContainer}>
        <Button
          title={t('common.cancel') || "Скасувати"}
          onPress={onCancel}
          variant="ghost"
          disabled={loading}
          style={[styles.button, styles.cancelButton]}
          accessibilityLabel={t('common.cancel') || "Скасувати"}
        />
        <Button
          title={t('common.save') || "Зберегти"}
          onPress={handleSubmit}
          variant="primary"
          loading={loading}
          disabled={loading}
          style={[styles.button, styles.submitButton]}
          iconLeft={<Icon name="save" size={20} color={isDark ? colors.white : colors.primary} />}
          accessibilityLabel={t('common.save') || "Зберегти правопорушення"}
        />
      </View>

      {/* Loading overlay */}
      <LoadingSpinner
        visible={loading}
        overlay={true}
        text={t('violations.saving') || "Збереження правопорушення..."}
        accessibilityLabel={t('violations.saving') || "Збереження правопорушення..."}
      />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  networkStatus: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  networkStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  networkStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  syncIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncText: {
    fontSize: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
    textAlign: 'center',
  },
  formError: {
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  characterCount: {
    fontSize: 12,
  },
  input: {
    marginBottom: 0,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
  },
  categoryContainer: {
    marginBottom: 24,
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 56,
  },
  categorySelectorText: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  // Стилі для модального вікна
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Для безпечної зони
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalList: {
    paddingHorizontal: 20,
  },
  modalCategoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCategoryItemText: {
    fontSize: 16,
    flex: 1,
  },
  photoContainer: {
    position: 'relative',
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  photoPlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    position: 'relative',
  },
  photoPlaceholderText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  photoPlaceholderSubtext: {
    marginTop: 4,
    fontSize: 14,
  },
  photoLoadingText: {
    marginTop: 8,
    fontSize: 14,
  },
  offlineIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '500',
  },
  locationContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  locationTime: {
    fontSize: 12,
    marginLeft: 28,
  },
  locationButton: {
    marginTop: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  dateTimeText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    marginRight: 8,
  },
  submitButton: {
    marginLeft: 8,
  },
});

export default ViolationForm;