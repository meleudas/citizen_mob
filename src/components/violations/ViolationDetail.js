// src/components/violations/ViolationDetail.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ViolationDetail = ({
  // Основні пропси
  violation,
  onEdit,
  onDelete,
  onShare,
  onNavigateToLocation,
  
  // Стани
  isSynced = true,
  isLocal = false,
  
  // Стилі
  style,
  imageStyle,
  contentStyle,
  
  // Accessibility
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const { colors } = useAppTheme();

  // Категорії з кольорами та іконками
  const categoryConfig = {
    parking: { 
      color: '#FF5722', 
      icon: 'local-parking',
      label: 'Паркування'
    },
    trash: { 
      color: '#4CAF50', 
      icon: 'delete',
      label: 'Сміття'
    },
    noise: { 
      color: '#FFC107', 
      icon: 'volume-up',
      label: 'Шум'
    },
    traffic: { 
      color: '#2196F3', 
      icon: 'directions-car',
      label: 'Порушення ПДР'
    },
    vandalism: { 
      color: '#9C27B0', 
      icon: 'brush',
      label: 'Вандалізм'
    },
    other: { 
      color: '#607D8B', 
      icon: 'warning',
      label: 'Інше'
    },
  };

  // Форматування дати
  const formatDate = (dateString) => {
    if (!dateString) return 'Дата не вказана';
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Форматування геолокації
  const formatLocation = (location) => {
    if (!location) return 'Локація не вказана';
    
    const { latitude, longitude, address } = location;
    const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    
    if (address) {
      return `${address}\n${coords}`;
    }
    
    return coords;
  };

  // Копіювання координат
  const copyCoordinates = () => {
    if (!violation.location) return;
    
    const { latitude, longitude } = violation.location;
    const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    
    // В реальному додатку тут буде Clipboard.setString(coords)
    Alert.alert(
      'Координати скопійовано',
      coords,
      [{ text: 'OK' }]
    );
  };

  // Відкриття в Google Maps / Apple Maps
  const openInMaps = () => {
    if (!violation.location) return;
    
    const { latitude, longitude } = violation.location;
    const label = violation.description || 'Правопорушення';
    const url = Platform.select({
      ios: `maps:?q=${label}&ll=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${label}`,
    });
    
    Linking.openURL(url).catch(() => {
      Alert.alert(
        'Помилка',
        'Не вдалося відкрити карту',
        [{ text: 'OK' }]
      );
    });
  };

  // Поділитися правопорушенням
  const handleShare = async () => {
    try {
      const message = `Правопорушення: ${violation.description}\nКатегорія: ${categoryConfig[violation.category]?.label || 'Невідома'}\nДата: ${formatDate(violation.dateTime)}`;
      
      await Share.share({
        message: message,
        title: 'Правопорушення',
      });
      
      if (onShare) {
        onShare(violation.id);
      }
    } catch (error) {
      console.error('Помилка при поширенні:', error);
    }
  };

  // Обробка видалення
  const handleDelete = () => {
    Alert.alert(
      'Видалення правопорушення',
      'Ви впевнені, що хочете видалити це правопорушення?',
      [
        { text: 'Скасувати', style: 'cancel' },
        { 
          text: 'Видалити', 
          style: 'destructive',
          onPress: () => {
            if (onDelete) {
              onDelete(violation.id);
            }
          }
        }
      ]
    );
  };

  // Отримання конфігурації категорії
  const getCategoryConfig = () => {
    const category = violation.category || 'other';
    return categoryConfig[category] || categoryConfig.other;
  };

  const categoryConfigData = getCategoryConfig();

  // Рендер фото
  const renderPhoto = () => {
    if (violation.photoUrl) {
      return (
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: violation.photoUrl }}
            style={[styles.photo, imageStyle]}
            resizeMode="contain"
          />
        </View>
      );
    }
    
    if (violation.photo) {
      // Для локальних фото (Base64 або file URI)
      return (
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: typeof violation.photo === 'string' ? violation.photo : violation.photo.uri }}
            style={[styles.photo, imageStyle]}
            resizeMode="contain"
          />
        </View>
      );
    }

    // Placeholder якщо фото немає
    return (
      <View style={[styles.photoPlaceholder, { backgroundColor: colors.inputBackground }]}>
        <Icon 
          name={categoryConfigData.icon} 
          size={64} 
          color={categoryConfigData.color} 
        />
        <Text style={[styles.noPhotoText, { color: colors.textSecondary }]}>
          Фото відсутнє
        </Text>
      </View>
    );
  };

  // Рендер статусу синхронізації
  const renderSyncStatus = () => {
    if (isLocal && !isSynced) {
      return (
        <View style={[styles.syncStatus, { backgroundColor: colors.warning + '20' }]}>
          <Icon name="sync" size={20} color={colors.warning} />
          <Text style={[styles.syncStatusText, { color: colors.warning }]}>
            Очікує синхронізації
          </Text>
        </View>
      );
    }
    
    if (isSynced) {
      return (
        <View style={[styles.syncStatus, { backgroundColor: colors.success + '20' }]}>
          <Icon name="check-circle" size={20} color={colors.success} />
          <Text style={[styles.syncStatusText, { color: colors.success }]}>
            Синхронізовано
          </Text>
        </View>
      );
    }
    
    return null;
  };

  // Рендер категорії
  const renderCategory = () => {
    return (
      <View style={[styles.categoryBadge, { backgroundColor: categoryConfigData.color + '20' }]}>
        <Icon 
          name={categoryConfigData.icon} 
          size={20} 
          color={categoryConfigData.color} 
        />
        <Text style={[styles.categoryText, { color: categoryConfigData.color }]}>
          {categoryConfigData.label}
        </Text>
      </View>
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }, style]}
      contentContainerStyle={styles.contentContainer}
      testID={testID}
      accessibilityLabel={accessibilityLabel || `Деталі правопорушення: ${violation.description || 'без опису'}`}
      {...restProps}
    >
      {/* Фото */}
      {renderPhoto()}

      {/* Основна інформація */}
      <View style={[styles.mainContent, { backgroundColor: colors.card }, contentStyle]}>
        {/* Статус синхронізації */}
        {renderSyncStatus()}

        {/* Категорія */}
        {renderCategory()}

        {/* Опис */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="description" size={20} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Опис
            </Text>
          </View>
          <Text style={[styles.description, { color: colors.text }]}>
            {violation.description || 'Опис відсутній'}
          </Text>
        </View>

        {/* Дата та час */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="schedule" size={20} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Дата та час
            </Text>
          </View>
          <Text style={[styles.infoText, { color: colors.text }]}>
            {formatDate(violation.dateTime)}
          </Text>
        </View>

        {/* Геолокація */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="location-on" size={20} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Місце
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.locationContainer}
            onPress={openInMaps}
            accessibilityLabel="Відкрити в картах"
            accessibilityRole="button"
          >
            <Text style={[styles.locationText, { color: colors.text }]}>
              {formatLocation(violation.location)}
            </Text>
            <Icon name="open-in-new" size={16} color={colors.primary} />
          </TouchableOpacity>
          
          {violation.location && (
            <TouchableOpacity
              style={styles.copyCoordinatesButton}
              onPress={copyCoordinates}
              accessibilityLabel="Копіювати координати"
            >
              <Text style={[styles.copyCoordinatesText, { color: colors.primary }]}>
                Копіювати координати
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Кнопки дій */}
        <View style={[styles.actionsContainer, { borderTopColor: colors.border }]}>
          {onEdit && (
            <TouchableOpacity
              style={[styles.actionButton, { borderRightColor: colors.border }]}
              onPress={() => onEdit(violation.id)}
              accessibilityLabel="Редагувати правопорушення"
              accessibilityRole="button"
            >
              <Icon name="edit" size={24} color={colors.primary} />
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                Редагувати
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={[styles.actionButton, { borderRightColor: colors.border }]}
            onPress={handleShare}
            accessibilityLabel="Поділитися правопорушенням"
            accessibilityRole="button"
          >
            <Icon name="share" size={24} color={colors.primary} />
            <Text style={[styles.actionButtonText, { color: colors.primary }]}>
              Поділитися
            </Text>
          </TouchableOpacity>
          
          {onDelete && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDelete}
              accessibilityLabel="Видалити правопорушення"
              accessibilityRole="button"
            >
              <Icon name="delete" size={24} color={colors.error} />
              <Text style={[styles.actionButtonText, { color: colors.error }]}>
                Видалити
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  photoContainer: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  photoPlaceholder: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 20,
  },
  noPhotoText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  mainContent: {
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  syncStatusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 25,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  categoryText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    paddingLeft: 32,
  },
  infoText: {
    fontSize: 16,
    paddingLeft: 32,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 32,
  },
  locationText: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
  },
  copyCoordinatesButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingLeft: 32,
  },
  copyCoordinatesText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    marginTop: 20,
    paddingTop: 16,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRightWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
});

export default ViolationDetail;