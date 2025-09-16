// src/components/common/Button.js
import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';

const Button = ({
  // Основні пропси
  title,
  onPress,
  disabled = false,
  loading = false,
  
  // Стилізація
  variant = 'primary', // primary, secondary, outline, ghost
  size = 'medium', // small, medium, large
  iconLeft,
  iconRight,
  
  // Додаткові пропси
  style,
  textStyle,
  activeOpacity = 0.7,
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const { colors } = useAppTheme();

  // Визначення стилів в залежності від варіанту
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          textColor: colors.white,
        };
      case 'secondary':
        return {
          backgroundColor: colors.secondary,
          borderColor: colors.secondary,
          textColor: colors.white,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderColor: colors.primary,
          textColor: colors.primary,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: colors.text,
        };
      default:
        return {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
          textColor: colors.white,
        };
    }
  };

  // Визначення розмірів в залежності від size
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          height: 32,
          paddingHorizontal: 12,
          fontSize: 14,
          iconSize: 16,
        };
      case 'medium':
        return {
          height: 40,
          paddingHorizontal: 16,
          fontSize: 16,
          iconSize: 20,
        };
      case 'large':
        return {
          height: 48,
          paddingHorizontal: 24,
          fontSize: 18,
          iconSize: 24,
        };
      default:
        return {
          height: 40,
          paddingHorizontal: 16,
          fontSize: 16,
          iconSize: 20,
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  // Стилі для контейнера кнопки
  const buttonStyles = [
    styles.baseButton,
    {
      backgroundColor: disabled || loading ? colors.disabled : variantStyles.backgroundColor,
      borderColor: variantStyles.borderColor,
      height: sizeStyles.height,
      paddingHorizontal: sizeStyles.paddingHorizontal,
    },
    style,
  ];

  // Стилі для тексту
  const textStyles = [
    styles.buttonText,
    {
      color: disabled || loading ? colors.textSecondary : variantStyles.textColor,
      fontSize: sizeStyles.fontSize,
    },
    textStyle,
  ];

  // Стилі для іконки
  const iconStyles = {
    color: disabled || loading ? colors.textSecondary : variantStyles.textColor,
    fontSize: sizeStyles.iconSize,
    marginHorizontal: iconLeft && iconRight ? 4 : iconLeft || iconRight ? 8 : 0,
  };

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={activeOpacity}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        disabled: disabled || loading,
        busy: loading,
      }}
      {...restProps}
    >
      <View style={styles.contentContainer}>
        {/* Іконка зліва */}
        {iconLeft && !loading && (
          <View style={[styles.icon, { marginRight: title ? 8 : 0 }]}>
            {React.cloneElement(iconLeft, {
              style: [iconLeft.props.style, iconStyles],
            })}
          </View>
        )}

        {/* Індикатор завантаження */}
        {loading && (
          <ActivityIndicator
            size="small"
            color={variantStyles.textColor}
            style={styles.loadingIndicator}
          />
        )}

        {/* Текст кнопки */}
        {title && !loading && (
          <Text style={textStyles} numberOfLines={1}>
            {title}
          </Text>
        )}

        {/* Іконка справа */}
        {iconRight && !loading && (
          <View style={[styles.icon, { marginLeft: title ? 8 : 0 }]}>
            {React.cloneElement(iconRight, {
              style: [iconRight.props.style, iconStyles],
            })}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 8,
    borderStyle: 'solid',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    marginRight: 8,
  },
});

export default Button;