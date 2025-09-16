// src/components/maps/MapMarker.js
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';
import { Marker } from 'react-native-maps';

const MapMarker = ({
  // Основні пропси
  coordinate,
  title,
  description,
  category = 'default',
  onPress,
  onCalloutPress,
  
  // Візуальні налаштування
  color,
  icon,
  size = 'medium', // small, medium, large
  animated = true,
  
  // Callout
  showCallout = false,
  calloutTitle,
  calloutDescription,
  
  // Стан
  isSelected = false,
  isCluster = false,
  clusterCount = 0,
  
  // Accessibility
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const { colors } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const bounceAnim = useRef(new Animated.Value(1)).current;

  // Категорії з кольорами
  const categoryColors = {
    parking: '#FF5722', // Паркування
    trash: '#4CAF50',   // Сміття
    noise: '#FFC107',   // Шум
    traffic: '#2196F3', // Порушення ПДР
    vandalism: '#9C27B0', // Вандалізм
    other: '#607D8B',   // Інше
    default: colors.primary,
  };

  // Визначення розмірів
  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { width: 24, height: 24, borderRadius: 12 };
      case 'large':
        return { width: 40, height: 40, borderRadius: 20 };
      case 'medium':
      default:
        return { width: 32, height: 32, borderRadius: 16 };
    }
  };

  const sizeStyle = getSizeStyle();

  // Визначення кольору
  const getMarkerColor = () => {
    if (color) return color;
    return categoryColors[category] || categoryColors.default;
  };

  const markerColor = getMarkerColor();

  // Анімація при виборі
  useEffect(() => {
    if (isSelected) {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isSelected]);

  // Обробка натискання на маркер
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  // Рендер іконки
  const renderIcon = () => {
    if (icon) {
      return React.cloneElement(icon, {
        style: [
          icon.props.style,
          styles.icon,
          { color: 'white', fontSize: size === 'small' ? 12 : size === 'large' ? 20 : 16 },
        ],
      });
    }

    // Дефолтні іконки для категорій
    const defaultIcons = {
      parking: '🅿️',
      trash: '🗑️',
      noise: '🔊',
      traffic: '🚗',
      vandalism: '🎨',
      other: '⚠️',
      default: '📍',
    };

    const iconText = isCluster 
      ? `${clusterCount}`
      : defaultIcons[category] || defaultIcons.default;

    return (
      <Text style={[
        styles.defaultIcon,
        { 
          fontSize: size === 'small' ? 12 : size === 'large' ? 20 : 16,
          color: 'white'
        }
      ]}>
        {iconText}
      </Text>
    );
  };

  // Рендер кастомного маркера
  const renderCustomMarker = () => {
    return (
      <Animated.View
        style={[
          styles.markerContainer,
          {
            backgroundColor: markerColor,
            ...sizeStyle,
          },
          animated && {
            transform: [
              { scale: bounceAnim }
            ],
          },
          isSelected && styles.selectedMarker,
        ]}
      >
        <View style={styles.markerContent}>
          {renderIcon()}
        </View>
        
        {/* Трикутник внизу маркера */}
        <View style={[
          styles.markerTriangle,
          { borderTopColor: markerColor }
        ]} />
      </Animated.View>
    );
  };

  // Рендер кластерного маркера
  const renderClusterMarker = () => {
    return (
      <Animated.View
        style={[
          styles.clusterContainer,
          {
            backgroundColor: markerColor,
            width: sizeStyle.width + 8,
            height: sizeStyle.height + 8,
            borderRadius: (sizeStyle.width + 8) / 2,
          },
          animated && {
            transform: [
              { scale: bounceAnim }
            ],
          },
        ]}
      >
        <View style={styles.clusterContent}>
          <Text style={styles.clusterText}>{clusterCount}</Text>
        </View>
      </Animated.View>
    );
  };

  // Рендер callout (спливаюче вікно)
  const renderCallout = () => {
    if (!showCallout) return null;

    return (
      <View style={[styles.calloutContainer, { backgroundColor: colors.card }]}>
        <View style={styles.calloutContent}>
          <Text style={[styles.calloutTitle, { color: colors.text }]} numberOfLines={1}>
            {calloutTitle || title}
          </Text>
          {calloutDescription && (
            <Text style={[styles.calloutDescription, { color: colors.textSecondary }]} numberOfLines={2}>
              {calloutDescription}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.calloutButton, { backgroundColor: colors.primary }]}
          onPress={onCalloutPress}
          accessibilityLabel="Деталі правопорушення"
        >
          <Text style={styles.calloutButtonText}>Деталі</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Для Expo Maps ми використовуємо стандартний Marker з кастомним зображенням
  return (
    <Marker
      coordinate={coordinate}
      title={title}
      description={description}
      onPress={handlePress}
      {...restProps}
    >
      {isCluster ? renderClusterMarker() : renderCustomMarker()}
      {showCallout && renderCallout()}
    </Marker>
  );
};

const styles = StyleSheet.create({
  markerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 6,
    position: 'relative',
  },
  markerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerTriangle: {
    position: 'absolute',
    bottom: -6,
    left: '50%',
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  selectedMarker: {
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 12,
  },
  icon: {
    textAlign: 'center',
  },
  defaultIcon: {
    fontWeight: '600',
    textAlign: 'center',
  },
  clusterContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 6,
  },
  clusterContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clusterText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  calloutContainer: {
    position: 'absolute',
    bottom: 60,
    width: 200,
    borderRadius: 8,
    padding: 12,
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  calloutContent: {
    marginBottom: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  calloutButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  calloutButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MapMarker;