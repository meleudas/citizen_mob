// src/components/common/LoadingSpinner.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Modal,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const LoadingSpinner = ({
  // Основні пропси
  visible = false,
  onDismiss,
  
  // Стилізація
  size = 'medium', // small, medium, large
  color,
  overlay = false,
  text,
  
  // Автоматичне приховування
  autoHide = false,
  hideDelay = 3000, // 3 секунди за замовчуванням
  
  // Анимація
  animationDuration = 300,
  
  // Стилі
  containerStyle,
  textStyle,
  overlayStyle,
  
  // Accessibility
  testID,
  accessibilityLabel,
}) => {
  const { colors } = useAppTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const timeoutRef = useRef(null);

  // Визначення розміру індикатора
  const getIndicatorSize = () => {
    switch (size) {
      case 'small':
        return 'small';
      case 'large':
        return 'large';
      default:
        return 'large';
    }
  };

  // Визначення кольору
  const indicatorColor = color || colors.primary;

  // Анімація появи/зникнення
  useEffect(() => {
    if (visible) {
      // Показати з анімацією
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: animationDuration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      // Автоматичне приховування
      if (autoHide) {
        timeoutRef.current = setTimeout(() => {
          hideSpinner();
        }, hideDelay);
      }
    } else {
      // Приховати з анімацією
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: animationDuration,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: animationDuration,
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
  }, [visible, autoHide, hideDelay, animationDuration]);

  const hideSpinner = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  // Стилі для контейнера
  const spinnerContainerStyle = [
    styles.spinnerContainer,
    overlay && styles.overlayContainer,
    containerStyle,
  ];

  // Стилі для тексту
  const textStyles = [
    styles.text,
    {
      color: overlay ? colors.white : colors.text,
    },
    textStyle,
  ];

  // Рендер у overlay (поверх всього контенту)
  if (overlay) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        hardwareAccelerated={true}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="alert"
        accessibilityState={{ busy: true }}
      >
        <View style={[styles.overlay, overlayStyle]}>
          <Animated.View
            style={[
              spinnerContainerStyle,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <ActivityIndicator
              size={getIndicatorSize()}
              color={indicatorColor}
              style={styles.indicator}
            />
            {text && (
              <Text style={textStyles} numberOfLines={2}>
                {text}
              </Text>
            )}
          </Animated.View>
        </View>
      </Modal>
    );
  }

  // Рендер як звичайний компонент
  if (!visible) return null;

  return (
    <Animated.View
      style={[
        spinnerContainerStyle,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        containerStyle,
      ]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="alert"
      accessibilityState={{ busy: true }}
    >
      <ActivityIndicator
        size={getIndicatorSize()}
        color={indicatorColor}
        style={styles.indicator}
      />
      {text && (
        <Text style={textStyles} numberOfLines={2}>
          {text}
        </Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  overlayContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 24,
    minWidth: 120,
    minHeight: 120,
  },
  spinnerContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  indicator: {
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 200,
  },
});

export default LoadingSpinner;