// src/components/violations/ViolationCard.js
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  PanGestureHandler,
  State,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ViolationCard = ({
  // Основні пропси
  violation,
  onPress,
  onEdit,
  onDelete,
  
  // Стани
  isSynced = true,
  isLocal = false,
  
  // Swipe дії
  swipeEnabled = true,
  
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
  const translateX = useRef(new Animated.Value(0)).current;
  const panRef = useRef(null);

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
      label: 'ПДР'
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
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('uk-UA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Скорочення геолокації
  const formatLocation = (location) => {
    if (!location) return 'Локація не вказана';
    const { latitude, longitude } = location;
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  };

  // Обробка swipe дій
  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const { translationX } = event.nativeEvent;
      
      if (translationX < -100 && onDelete) {
        // Swipe вліво - видалення
        Animated.spring(translateX, {
          toValue: -300,
          useNativeDriver: true,
          friction: 5,
        }).start(() => {
          onDelete(violation.id);
        });
      } else if (translationX > 100 && onEdit) {
        // Swipe вправо - редагування
        Animated.spring(translateX, {
          toValue: 300,
          useNativeDriver: true,
          friction: 5,
        }).start(() => {
          onEdit(violation.id);
        });
      } else {
        // Повернення в початкову позицію
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
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
        <Image
          source={{ uri: violation.photoUrl }}
          style={[styles.photo, imageStyle]}
          resizeMode="cover"
        />
      );
    }
    
    if (violation.photo) {
      // Для локальних фото (Base64 або file URI)
      return (
        <Image
          source={{ uri: typeof violation.photo === 'string' ? violation.photo : violation.photo.uri }}
          style={[styles.photo, imageStyle]}
          resizeMode="cover"
        />
      );
    }

    // Placeholder якщо фото немає
    return (
      <View style={[styles.photoPlaceholder, { backgroundColor: colors.inputBackground }]}>
        <Icon 
          name={categoryConfigData.icon} 
          size={32} 
          color={categoryConfigData.color} 
        />
      </View>
    );
  };

  // Рендер статусу синхронізації
  const renderSyncStatus = () => {
    if (isLocal && !isSynced) {
      return (
        <View style={[styles.syncStatus, { backgroundColor: colors.warning + '20' }]}>
          <Icon name="sync" size={16} color={colors.warning} />
          <Text style={[styles.syncStatusText, { color: colors.warning }]}>
            Очікує синхронізації
          </Text>
        </View>
      );
    }
    
    if (isSynced) {
      return (
        <View style={[styles.syncStatus, { backgroundColor: colors.success + '20' }]}>
          <Icon name="check-circle" size={16} color={colors.success} />
          <Text style={[styles.syncStatusText, { color: colors.success }]}>
            Синхронізовано
          </Text>
        </View>
      );
    }
    
    return null;
  };

  // Рендер картки
  const renderCardContent = () => {
    return (
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
        {/* Верхня частина - фото та категорія */}
        <View style={styles.header}>
          <View style={styles.photoContainer}>
            {renderPhoto()}
          </View>
          
          <View style={styles.headerInfo}>
            <View style={[styles.categoryBadge, { backgroundColor: categoryConfigData.color + '20' }]}>
              <Icon 
                name={categoryConfigData.icon} 
                size={16} 
                color={categoryConfigData.color} 
              />
              <Text style={[styles.categoryText, { color: categoryConfigData.color }]}>
                {categoryConfigData.label}
              </Text>
            </View>
            
            {renderSyncStatus()}
          </View>
        </View>

        {/* Основний контент */}
        <View style={[styles.content, contentStyle]}>
          {/* Опис */}
          <Text 
            style={[styles.description, { color: colors.text }]} 
            numberOfLines={3}
          >
            {violation.description || 'Опис відсутній'}
          </Text>

          {/* Дата та час */}
          <View style={styles.infoRow}>
            <Icon name="schedule" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              {formatDate(violation.dateTime)}
            </Text>
          </View>

          {/* Геолокація */}
          <View style={styles.infoRow}>
            <Icon name="location-on" size={16} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>
              {formatLocation(violation.location)}
            </Text>
          </View>
        </View>

        {/* Кнопки дій */}
        <View style={[styles.actions, { borderTopColor: colors.border }]}>
          {onEdit && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(violation.id)}
              accessibilityLabel="Редагувати правопорушення"
            >
              <Icon name="edit" size={20} color={colors.primary} />
              <Text style={[styles.actionText, { color: colors.primary }]}>Редагувати</Text>
            </TouchableOpacity>
          )}
          
          {onDelete && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onDelete(violation.id)}
              accessibilityLabel="Видалити правопорушення"
            >
              <Icon name="delete" size={20} color={colors.error} />
              <Text style={[styles.actionText, { color: colors.error }]}>Видалити</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Якщо swipe вимкнено або немає дій - звичайна картка
  if (!swipeEnabled || (!onDelete && !onEdit)) {
    return (
      <TouchableOpacity
        onPress={() => onPress && onPress(violation.id)}
        activeOpacity={0.7}
        testID={testID}
        accessibilityLabel={accessibilityLabel || `Правопорушення: ${violation.description || 'без опису'}`}
        accessibilityRole="button"
        {...restProps}
      >
        {renderCardContent()}
      </TouchableOpacity>
    );
  }

  // Картка з swipe діями
  return (
    <PanGestureHandler
      ref={panRef}
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      enabled={swipeEnabled}
    >
      <Animated.View
        style={[
          styles.swipeContainer,
          {
            transform: [{ translateX }],
          },
        ]}
        testID={testID}
        accessibilityLabel={accessibilityLabel || `Правопорушення: ${violation.description || 'без опису'}`}
        {...restProps}
      >
        {/* Фонові дії для swipe */}
        <View style={styles.swipeActions}>
          {onDelete && (
            <View style={[styles.swipeAction, { backgroundColor: colors.error, left: 0 }]}>
              <Icon name="delete" size={24} color="white" />
              <Text style={styles.swipeActionText}>Видалити</Text>
            </View>
          )}
          
          {onEdit && (
            <View style={[styles.swipeAction, { backgroundColor: colors.primary, right: 0 }]}>
              <Icon name="edit" size={24} color="white" />
              <Text style={styles.swipeActionText}>Редагувати</Text>
            </View>
          )}
        </View>

        {/* Основна картка */}
        <TouchableOpacity
          onPress={() => onPress && onPress(violation.id)}
          activeOpacity={0.7}
          style={styles.cardTouchable}
        >
          {renderCardContent()}
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  swipeActions: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  swipeAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 8,
  },
  swipeActionText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  cardTouchable: {
    zIndex: 1,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
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
        elevation: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    padding: 16,
  },
  photoContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 16,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  syncStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  syncStatusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    padding: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ViolationCard;