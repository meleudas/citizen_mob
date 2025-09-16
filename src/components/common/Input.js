// src/components/common/Input.js
import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';

const Input = ({
  // Основні пропси
  value,
  onChangeText,
  placeholder,
  
  // Тип та валідація
  type = 'text', // text, password, email, numeric
  keyboardType = 'default',
  secureTextEntry = false,
  validation,
  showError = false,
  errorText,
  
  // Стилізація
  iconLeft,
  iconRight,
  multiline = false,
  numberOfLines = 1,
  
  // Обмеження
  maxLength,
  autoFocus = false,
  
  // Стан та контроль
  editable = true,
  onFocus,
  onBlur,
  
  // Стилі
  style,
  inputStyle,
  errorStyle,
  placeholderTextColor,
  
  // Accessibility
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const { colors } = useAppTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isValid, setIsValid] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Визначення типу клавіатури та secureTextEntry
  const getInputProps = () => {
    switch (type) {
      case 'email':
        return {
          keyboardType: 'email-address',
          autoCapitalize: 'none',
          autoCorrect: false,
        };
      case 'password':
        return {
          keyboardType: 'default',
          secureTextEntry: !showPassword,
          autoCapitalize: 'none',
          autoCorrect: false,
        };
      case 'numeric':
        return {
          keyboardType: 'numeric',
          autoCapitalize: 'none',
        };
      case 'phone':
        return {
          keyboardType: 'phone-pad',
        };
      default:
        return {
          keyboardType: keyboardType,
          secureTextEntry: secureTextEntry,
        };
    }
  };

  const inputProps = getInputProps();

  // Валідація в реальному часі
  useEffect(() => {
    if (validation && value) {
      const isValid = validation(value);
      setIsValid(isValid);
    } else {
      setIsValid(true);
    }
  }, [value, validation]);

  const handleFocus = (e) => {
    setIsFocused(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    if (onBlur) onBlur(e);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Визначення кольору бордера
  const getBorderColor = () => {
    if (!isValid || showError) return colors.error;
    if (isFocused) return colors.primary;
    return colors.border;
  };

  // Стилі для контейнера
  const containerStyles = [
    styles.container,
    {
      borderColor: getBorderColor(),
      backgroundColor: editable ? colors.inputBackground : colors.disabled,
    },
    style,
  ];

  // Стилі для input
  const inputStyles = [
    styles.input,
    {
      color: colors.text,
      minHeight: multiline ? 40 * numberOfLines : 40,
      textAlignVertical: multiline ? 'top' : 'center',
    },
    inputStyle,
  ];

  // Стилі для placeholder
  const placeholderColor = placeholderTextColor || colors.textSecondary;

  // Іконка для показу/приховування пароля
  const renderPasswordIcon = () => {
    if (type === 'password') {
      const IconComponent = iconRight;
      return (
        <TouchableOpacity
          onPress={togglePasswordVisibility}
          style={styles.iconButton}
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          accessibilityRole="button"
        >
          {IconComponent ? (
            React.cloneElement(IconComponent, {
              style: [
                IconComponent.props.style,
                { 
                  color: showPassword ? colors.primary : colors.textSecondary 
                }
              ],
            })
          ) : (
            <Text style={[styles.defaultEyeIcon, { color: showPassword ? colors.primary : colors.textSecondary }]}>
              {showPassword ? '👁' : '👁‍🗨'}
            </Text>
          )}
        </TouchableOpacity>
      );
    }
    return iconRight;
  };

  return (
    <View style={styles.wrapper}>
      <View style={containerStyles}>
        {/* Іконка зліва */}
        {iconLeft && (
          <View style={styles.iconLeft}>
            {React.cloneElement(iconLeft, {
              style: [
                iconLeft.props.style,
                { color: colors.textSecondary }
              ],
            })}
          </View>
        )}

        {/* Поле вводу */}
        <TextInput
          style={inputStyles}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          onFocus={handleFocus}
          onBlur={handleBlur}
          editable={editable}
          autoFocus={autoFocus}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          maxLength={maxLength}
          testID={testID}
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="text"
          {...inputProps}
          {...restProps}
        />

        {/* Іконка справа або перемикач пароля */}
        {(iconRight || type === 'password') && (
          <View style={styles.iconRight}>
            {renderPasswordIcon()}
          </View>
        )}
      </View>

      {/* Показ помилок */}
      {(showError || !isValid) && errorText && (
        <Text style={[styles.errorText, { color: colors.error }, errorStyle]}>
          {errorText}
        </Text>
      )}

      {/* Показ довжини тексту */}
      {maxLength && (
        <Text style={[styles.charCount, { color: colors.textSecondary }]}>
          {value?.length || 0}/{maxLength}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.05)',
        shadowOffset: {
          width: 0,
          height: 1,
        },
        shadowOpacity: 0.5,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    ...Platform.select({
      android: {
        includeFontPadding: false,
        textAlignVertical: 'center',
      },
    }),
  },
  iconLeft: {
    marginRight: 8,
  },
  iconRight: {
    marginLeft: 8,
  },
  iconButton: {
    padding: 4,
  },
  defaultEyeIcon: {
    fontSize: 18,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
    marginRight: 4,
  },
});

export default Input; 