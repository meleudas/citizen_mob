// src/components/common/Card.js
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';

const Card = ({
  // Основні пропси
  children,
  onPress,
  disabled = false,
  
  // Стилізація
  elevation = 'medium', // none, small, medium, large
  rounded = 'medium', // none, small, medium, large, full
  padding = 'medium', // none, small, medium, large
  variant = 'filled', // filled, outlined, elevated
  
  // Бордери
  bordered = false,
  borderColor,
  
  // Фон
  backgroundColor,
  
  // Стилі
  style,
  contentContainerStyle,
  
  // Accessibility
  testID,
  accessibilityLabel,
  accessibilityRole = 'summary',
  ...restProps
}) => {
  const { colors } = useAppTheme();

  // Визначення елевації (тіні)
  const getElevationStyle = () => {
    if (variant === 'outlined' || variant === 'filled') {
      return {};
    }

    switch (elevation) {
      case 'none':
        return Platform.select({
          android: { elevation: 0 },
          ios: {
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
          },
        });
      case 'small':
        return Platform.select({
          android: { elevation: 2 },
          ios: {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.22,
            shadowRadius: 2.22,
          },
        });
      case 'large':
        return Platform.select({
          android: { elevation: 8 },
          ios: {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.30,
            shadowRadius: 4.65,
          },
        });
      case 'medium':
      default:
        return Platform.select({
          android: { elevation: 4 },
          ios: {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
          },
        });
    }
  };

  // Визначення заокруглених кутів
  const getBorderRadius = () => {
    switch (rounded) {
      case 'none':
        return 0;
      case 'small':
        return 4;
      case 'large':
        return 16;
      case 'full':
        return 999;
      case 'medium':
      default:
        return 8;
    }
  };

  // Визначення падінгу
  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'small':
        return 8;
      case 'large':
        return 24;
      case 'medium':
      default:
        return 16;
    }
  };

  // Визначення варіанту картки
  const getVariantStyle = () => {
    switch (variant) {
      case 'outlined':
        return {
          backgroundColor: backgroundColor || colors.card,
          borderColor: borderColor || colors.border,
          borderWidth: 1,
        };
      case 'elevated':
        return {
          backgroundColor: backgroundColor || colors.card,
          borderColor: 'transparent',
          borderWidth: 0,
        };
      case 'filled':
      default:
        return {
          backgroundColor: backgroundColor || colors.card,
          borderColor: 'transparent',
          borderWidth: 0,
        };
    }
  };

  // Основні стилі контейнера
  const containerStyles = [
    styles.container,
    getElevationStyle(),
    getVariantStyle(),
    {
      borderRadius: getBorderRadius(),
      padding: getPadding(),
      backgroundColor: backgroundColor || colors.card,
    },
    bordered && {
      borderColor: borderColor || colors.border,
      borderWidth: 1,
    },
    style,
  ];

  // Стилі контент контейнера
  const contentStyles = [styles.contentContainer, contentContainerStyle];

  // Якщо є onPress - робимо TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity
        style={containerStyles}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={{ disabled }}
        {...restProps}
      >
        <View style={contentStyles}>
          {children}
        </View>
      </TouchableOpacity>
    );
  }

  // Інакше - звичайний View
  return (
    <View
      style={containerStyles}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      {...restProps}
    >
      <View style={contentStyles}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 8,
    ...Platform.select({
      android: {
        overflow: 'hidden',
      },
    }),
  },
  contentContainer: {
    flex: 1,
  },
});

export default Card;