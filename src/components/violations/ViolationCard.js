// src/components/violations/ViolationCard.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ViolationCard = ({
  violation,
  onPress,
  onEdit,
  onDelete,
  isSynced = true,
  isLocal = false,
  swipeEnabled = true,
  style,
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const { colors } = useAppTheme();

  // Перевірка на наявність violation
  if (!violation) {
    return null;
  }

  // Конфігурація категорій з кольорами та іконками
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
    public_safety: { 
      color: '#E91E63', 
      icon: 'security', 
      label: 'Безпека' 
    },
    infrastructure: { 
      color: '#3F51B5', 
      icon: 'construction', 
      label: 'Інфраструктура' 
    },
    environment: { 
      color: '#009688', 
      icon: 'eco', 
      label: 'Навколишнє середовище' 
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
    try {
      const date = new Date(dateString);
      return date.toLocaleString('uk-UA', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Невідома дата';
    }
  };

  // Отримання конфігурації категорії
  const getCategoryConfig = () => {
    const category = violation.category || 'other';
    return categoryConfig[category] || categoryConfig.other;
  };

  const categoryConfigData = getCategoryConfig();

  // Рендер фото (спрощена версія)
  const renderPhoto = () => {
    if (violation.photoUrl || violation.photo) {
      return (
        <View style={[styles.photoPlaceholder, { backgroundColor: colors.inputBackground }]}>
          <Icon 
            name={categoryConfigData.icon} 
            size={24} 
            color={categoryConfigData.color} 
          />
        </View>
      );
    }
    
    // Placeholder якщо фото немає
    return (
      <View style={[styles.photoPlaceholder, { backgroundColor: colors.inputBackground }]}>
        <Icon 
          name={categoryConfigData.icon} 
          size={24} 
          color={categoryConfigData.color} 
        />
      </View>
    );
  };

  return (
    <TouchableOpacity
      onPress={() => onPress && onPress(violation.id)}
      activeOpacity={0.7}
      testID={testID}
      accessibilityLabel={accessibilityLabel || `Правопорушення: ${violation.description || 'без опису'}`}
      accessibilityRole="button"
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border || '#E0E0E0' }, style]}
      {...restProps}
    >
      {/* Заголовок з фото та категорією */}
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
          
          {/* Статус синхронізації */}
          {isLocal && !isSynced && (
            <View style={[styles.syncStatus, { backgroundColor: (colors.warning || '#FF9800') + '20' }]}>
              <Icon name="sync" size={14} color={colors.warning || '#FF9800'} />
              <Text style={[styles.syncStatusText, { color: colors.warning || '#FF9800' }]}>
                Очікує
              </Text>
            </View>
          )}
          
          {isSynced && (
            <View style={[styles.syncStatus, { backgroundColor: (colors.success || '#4CAF50') + '20' }]}>
              <Icon name="check-circle" size={14} color={colors.success || '#4CAF50'} />
              <Text style={[styles.syncStatusText, { color: colors.success || '#4CAF50' }]}>
                Синхр.
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Основний контент */}
      <View style={styles.content}>
        <Text 
          style={[styles.description, { color: colors.text || '#000000' }]} 
          numberOfLines={3}
        >
          {violation.description || 'Опис відсутній'}
        </Text>

        <View style={styles.infoRow}>
          <Icon name="schedule" size={16} color={colors.textSecondary || '#666666'} />
          <Text style={[styles.infoText, { color: colors.textSecondary || '#666666' }]}>
            {formatDate(violation.dateTime)}
          </Text>
        </View>

        {violation.location && (
          <View style={styles.infoRow}>
            <Icon name="location-on" size={16} color={colors.textSecondary || '#666666'} />
            <Text style={[styles.infoText, { color: colors.textSecondary || '#666666' }]} numberOfLines={1}>
              {`${violation.location.latitude?.toFixed(6) || '0.000000'}, ${violation.location.longitude?.toFixed(6) || '0.000000'}`}
            </Text>
          </View>
        )}
      </View>

      {/* Кнопки дій */}
      {(onEdit || onDelete) && (
        <View style={[styles.actions, { borderTopColor: colors.border || '#E0E0E0' }]}>
          {onEdit && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => onEdit(violation.id)}
              accessibilityLabel="Редагувати правопорушення"
            >
              <Icon name="edit" size={20} color={colors.primary || '#2196F3'} />
              <Text style={[styles.actionText, { color: colors.primary || '#2196F3' }]}>Редагувати</Text>
            </TouchableOpacity>
          )}
          
          {onDelete && (
            <TouchableOpacity
              style={[styles.actionButton, { borderLeftWidth: 1, borderLeftColor: colors.border || '#E0E0E0' }]}
              onPress={() => onDelete(violation.id)}
              accessibilityLabel="Видалити правопорушення"
            >
              <Icon name="delete" size={20} color={colors.error || '#F44336'} />
              <Text style={[styles.actionText, { color: colors.error || '#F44336' }]}>Видалити</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  header: {
    flexDirection: 'row',
    padding: 16,
  },
  photoContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  syncStatusText: {
    fontSize: 11,
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