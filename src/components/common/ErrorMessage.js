// src/components/common/ErrorMessage.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';

const ErrorMessage = ({
  // Основні пропси
  message,
  visible = false,
  onDismiss,
  
  // Тип повідомлення
  type = 'error', // error, warning, info
  
  // Автоматичне приховування
  autoHide = false,
  hideDelay = 5000, // 5 секунд за замовчуванням
  
  // Іконки
  icon,
  showIcon = true,
  
  // Стилізація
  style,
  textStyle,
  containerStyle,
  
  // Кастомізація
  allowDismiss = true,
  dismissIcon,
  
  // Accessibility
  testID,
  accessibilityLabel,
  accessibilityLiveRegion = 'assertive',
}) => {
  const { colors } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const timeoutRef = useRef(null);

  // Визначення стилів для різних типів
  const getTypeStyles = () => {
    switch (type) {
      case 'warning':
        return {
          backgroundColor: colors.warning + '20', // 20% opacity
          borderColor: colors.warning,
          textColor: colors.warning,
          iconColor: colors.warning,
        };
      case 'info':
        return {
          backgroundColor: colors.info + '20',
          borderColor: colors.info,
          textColor: colors.info,
          iconColor: colors.info,
        };
      case 'error':
      default:
        return {
          backgroundColor: colors.error + '20',
          borderColor: colors.error,
          textColor: colors.error,
          iconColor: colors.error,
        };
    }
  };

  const typeStyles = getTypeStyles();

  // Визначення іконок за замовчуванням
  const getDefaultIcon = () => {
    if (!showIcon) return null;
    
    const iconProps = {
      size: 18,
      color: typeStyles.iconColor,
    };

    // Якщо передана кастомна іконка
    if (icon) {
      return React.cloneElement(icon, {
        style: [icon.props.style, { color: typeStyles.iconColor }],
      });
    }

    // Іконки за замовчуванням
    switch (type) {
      case 'warning':
        return (
          <Text style={[styles.defaultIcon, { color: typeStyles.iconColor }]}>
            ⚠️
          </Text>
        );
      case 'info':
        return (
          <Text style={[styles.defaultIcon, { color: typeStyles.iconColor }]}>
            ℹ️
          </Text>
        );
      case 'error':
      default:
        return (
          <Text style={[styles.defaultIcon, { color: typeStyles.iconColor }]}>
            ❌
          </Text>
        );
    }
  };

  // Анімація появи/зникнення
  useEffect(() => {
    if (visible) {
      // Показати з анімацією
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      // Accessibility announcement
      if (message && Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(message);
      }

      // Автоматичне приховування
      if (autoHide) {
        timeoutRef.current = setTimeout(() => {
          hideMessage();
        }, hideDelay);
      }
    } else {
      // Приховати з анімацією
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();

      // Очистити таймаут
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, autoHide, hideDelay]);

  const hideMessage = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  // Якщо не видимий - не рендерити
  if (!visible || !message) return null;

  // Стилі для контейнера
  const containerStyles = [
    styles.container,
    {
      backgroundColor: typeStyles.backgroundColor,
      borderColor: typeStyles.borderColor,
    },
    containerStyle,
  ];

  // Стилі для тексту
  const textStyles = [
    styles.text,
    {
      color: typeStyles.textColor,
    },
    textStyle,
  ];

  return (
    <Animated.View
      style={[
        containerStyles,
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || message}
      accessibilityRole={type === 'error' ? 'alert' : 'status'}
      accessibilityLiveRegion={accessibilityLiveRegion}
    >
      <View style={styles.contentContainer}>
        {/* Іконка */}
        {getDefaultIcon() && (
          <View style={styles.iconContainer}>
            {getDefaultIcon()}
          </View>
        )}

        {/* Текст повідомлення */}
        <Text style={textStyles} numberOfLines={5}>
          {message}
        </Text>

        {/* Кнопка закриття */}
        {allowDismiss && (
          <TouchableOpacity
            onPress={hideMessage}
            style={styles.dismissButton}
            accessibilityLabel="Закрити повідомлення"
            accessibilityRole="button"
          >
            {dismissIcon ? (
              React.cloneElement(dismissIcon, {
                style: [
                  dismissIcon.props.style,
                  { color: typeStyles.textColor },
                ],
              })
            ) : (
              <Text style={[styles.dismissIcon, { color: typeStyles.textColor }]}>
                ✕
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 4,
    marginHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
  },
  iconContainer: {
    marginRight: 8,
    marginTop: 2,
  },
  defaultIcon: {
    fontSize: 18,
  },
  text: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  dismissIcon: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorMessage; 