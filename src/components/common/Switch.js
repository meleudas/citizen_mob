// src/components/common/Switch.js
import React from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { useThemeColors } from '../../hooks/useTheme';

const Switch = ({
  value,
  onValueChange,
  disabled = false,
  trackColor = {},
  thumbColor = {},
  style,
  accessibilityLabel,
}) => {
  const { colors } = useThemeColors();
  
  // Анімація перемикання
  const switchAnimation = React.useRef(new Animated.Value(value ? 1 : 0)).current;

  // Оновлення анімації при зміні значення
  React.useEffect(() => {
    Animated.timing(switchAnimation, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [value, switchAnimation]);

  // Обробка перемикання
  const handlePress = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  // Кольори за замовчуванням
  const defaultTrackColor = {
    false: colors.border,
    true: colors.primary,
  };

  const defaultThumbColor = {
    false: colors.background,
    true: colors.background,
  };

  // Об'єднання кольорів користувача з кольорами за замовчуванням
  const mergedTrackColor = { ...defaultTrackColor, ...trackColor };
  const mergedThumbColor = { ...defaultThumbColor, ...thumbColor };

  // Інтерполяція для анімації позиції thumb
  const translateX = switchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 22], // Значення залежать від розмірів switch
  });

  // Інтерполяція для анімації кольору треку
  const trackBackgroundColor = switchAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [mergedTrackColor.false, mergedTrackColor.true],
  });

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.container, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
    >
      <Animated.View
        style={[
          styles.track,
          {
            backgroundColor: trackBackgroundColor,
            opacity: disabled ? 0.5 : 1,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            {
              backgroundColor: value ? mergedThumbColor.true : mergedThumbColor.false,
              transform: [{ translateX }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 50,
    height: 30,
    justifyContent: 'center',
  },
  track: {
    width: '100%',
    height: '60%',
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.5,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 3,
      },
    }),
  },
});

export default Switch;