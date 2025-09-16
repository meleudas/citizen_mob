// src/components/common/Avatar.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';

const Avatar = ({
  // Основні пропси
  source,
  name,
  onPress,
  disabled = false,
  
  // Стилізація
  size = 'medium', // xsmall, small, medium, large, xlarge
  shape = 'circle', // circle, square, rounded
  variant = 'image', // image, initials, icon
  
  // Placeholder та fallback
  placeholderIcon,
  fallbackText = '?',
  
  // Стилі
  style,
  imageStyle,
  textStyle,
  
  // Accessibility
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const { colors } = useAppTheme();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Визначення розмірів
  const getSizeStyle = () => {
    switch (size) {
      case 'xsmall':
        return 24;
      case 'small':
        return 32;
      case 'large':
        return 64;
      case 'xlarge':
        return 96;
      case 'medium':
      default:
        return 48;
    }
  };

  const avatarSize = getSizeStyle();

  // Визначення форми
  const getShapeStyle = () => {
    switch (shape) {
      case 'square':
        return { borderRadius: 0 };
      case 'rounded':
        return { borderRadius: 8 };
      case 'circle':
      default:
        return { borderRadius: avatarSize / 2 };
    }
  };

  const shapeStyle = getShapeStyle();

  // Генерація кольору для текстового аватара
  const generateColorFromName = (nameString) => {
    if (!nameString) return colors.primary;
    
    let hash = 0;
    for (let i = 0; i < nameString.length; i++) {
      hash = nameString.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colorsArray = [
      colors.primary,
      colors.secondary,
      colors.success,
      colors.warning,
      colors.error,
      colors.info,
    ];
    
    return colorsArray[Math.abs(hash) % colorsArray.length];
  };

  // Отримання ініціалів
  const getInitials = (fullName) => {
    if (!fullName) return fallbackText;
    
    const names = fullName.trim().split(' ');
    if (names.length === 0) return fallbackText;
    
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  // Обробка завантаження зображення
  const handleImageLoadStart = useCallback(() => {
    setImageLoading(true);
  }, []);

  const handleImageLoadEnd = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  // Визначення текстового розміру
  const getTextSize = () => {
    switch (size) {
      case 'xsmall':
        return 12;
      case 'small':
        return 14;
      case 'large':
        return 24;
      case 'xlarge':
        return 36;
      case 'medium':
      default:
        return 18;
    }
  };

  // Стилі для контейнера
  const containerStyles = [
    styles.container,
    {
      width: avatarSize,
      height: avatarSize,
      backgroundColor: generateColorFromName(name),
    },
    shapeStyle,
    style,
  ];

  // Стилі для тексту
  const textStyles = [
    styles.text,
    {
      fontSize: getTextSize(),
      color: colors.white,
    },
    textStyle,
  ];

  // Рендер зображення
  const renderImage = () => {
    if (variant !== 'image' || imageError || !source) {
      return null;
    }

    return (
      <Image
        source={source}
        style={[styles.image, shapeStyle, imageStyle]}
        onLoadStart={handleImageLoadStart}
        onLoadEnd={handleImageLoadEnd}
        onError={handleImageError}
        accessibilityIgnoresInvertColors
        resizeMode="cover"
      />
    );
  };

  // Рендер текстового аватара
  const renderInitials = () => {
    if (variant === 'image' && !imageError && source && !imageLoading) {
      return null;
    }

    if (variant === 'initials' || imageError || !source) {
      return (
        <Text style={textStyles} numberOfLines={1}>
          {getInitials(name)}
        </Text>
      );
    }

    return null;
  };

  // Рендер placeholder
  const renderPlaceholder = () => {
    if (variant === 'image' && source && !imageError && !imageLoading) {
      return null;
    }

    if (variant === 'icon' || (imageError && !name)) {
      const placeholderColor = colors.textSecondary;
      
      if (placeholderIcon) {
        return React.cloneElement(placeholderIcon, {
          style: [
            placeholderIcon.props.style,
            {
              color: placeholderColor,
              fontSize: avatarSize * 0.5,
            },
            styles.placeholderIcon,
          ],
        });
      }

      return (
        <Text style={[styles.placeholderText, { color: placeholderColor, fontSize: avatarSize * 0.5 }]}>
          {fallbackText}
        </Text>
      );
    }

    return null;
  };

  // Обгортка для рендеру
  const renderContent = () => {
    return (
      <View style={containerStyles}>
        {renderImage()}
        {renderInitials()}
        {renderPlaceholder()}
      </View>
    );
  };

  // Якщо є onPress - робимо TouchableOpacity
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        testID={testID}
        accessibilityLabel={accessibilityLabel || `Аватар користувача ${name || ''}`}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        {...restProps}
      >
        {renderContent()}
      </TouchableOpacity>
    );
  }

  // Інакше - звичайний View
  return (
    <View
      testID={testID}
      accessibilityLabel={accessibilityLabel || `Аватар користувача ${name || ''}`}
      accessibilityRole="image"
      {...restProps}
    >
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  placeholderIcon: {
    textAlign: 'center',
  },
  placeholderText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default Avatar;