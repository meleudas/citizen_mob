// src/screens/auth/RegisterScreen.js
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  SafeAreaView,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as yup from 'yup';

// Hooks
import { useAuth } from '../../hooks/useAuth';
import { useForm } from '../../hooks/useForm';
import { useThemeColors } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';

// Common components
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Icon from 'react-native-vector-icons/MaterialIcons';

const RegisterScreen = () => {
  const navigation = useNavigation();
  const { register: registerUser, loading, error: authError, clearError } = useAuth();
  const { colors, isDark } = useThemeColors();
  const { t } = useLanguage();
  
  // Local state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState(null);
  
  // Refs for auto-focus
  const lastNameInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  
  // Password strength calculation
  const calculatePasswordStrength = (password) => {
    let strength = 0;
    
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (/[A-Z]/.test(password)) strength += 1;
    if (/[0-9]/.test(password)) strength += 1;
    if (/[^A-Za-z0-9]/.test(password)) strength += 1;
    
    return Math.min(strength, 5);
  };
  
  // Validation schema
  const validationSchema = yup.object().shape({
    firstName: yup
      .string()
      .min(2, t('auth.firstNameMinLength') || 'Ім\'я має містити мінімум 2 символи')
      .required(t('auth.firstNameRequired') || 'Ім\'я обов\'язкове'),
    lastName: yup
      .string()
      .min(2, t('auth.lastNameMinLength') || 'Прізвище має містити мінімум 2 символи')
      .required(t('auth.lastNameRequired') || 'Прізвище обов\'язкове'),
    email: yup
      .string()
      .email(t('auth.emailInvalid') || 'Невірний формат email')
      .required(t('auth.emailRequired') || 'Email обов\'язковий'),
    password: yup
      .string()
      .min(6, t('auth.passwordMinLength') || 'Пароль має містити мінімум 6 символів')
      .required(t('auth.passwordRequired') || 'Пароль обов\'язковий'),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref('password'), null], t('auth.passwordsMustMatch') || 'Паролі мають співпадати')
      .required(t('auth.confirmPasswordRequired') || 'Підтвердження пароля обов\'язкове'),
  });
  
  // Form hooks
  const {
    register,
    handleSubmit,
    errors,
    isValid,
    isSubmitting,
    setError: setFormError,
    clearError: clearFormError,
    setValue,
    values,
  } = useForm(
    {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema
  );
  
  // Register form fields
  const firstNameField = register('firstName', {
    required: true,
    minLength: 2,
  });
  
  const lastNameField = register('lastName', {
    required: true,
    minLength: 2,
  });
  
  const emailField = register('email', {
    required: true,
  });
  
  const passwordField = register('password', {
    required: true,
    minLength: 6,
  });
  
  const confirmPasswordField = register('confirmPassword', {
    required: true,
  });
  
  // Update password strength when password changes
  useEffect(() => {
    if (values.password) {
      setPasswordStrength(calculatePasswordStrength(values.password));
    } else {
      setPasswordStrength(0);
    }
  }, [values.password]);
  
  // Auto-focus on first name field
  useEffect(() => {
    setTimeout(() => {
      // Auto-focus handled by Input component
    }, 300);
  }, []);
  
  // Clear errors
  const clearAllErrors = () => {
    setError(null);
    clearError();
    clearFormError();
  };

  const onSubmit = async (data) => {
    console.log('📤 [RegisterScreen.onSubmit] === ПОЧАТОК ВІДПРАВКИ ФОРМИ ===');
    console.log('📤 [RegisterScreen.onSubmit] Дані з форми:', data);
    
    try {
      clearAllErrors();
      
      // Перевірка даних
      if (!data.firstName || !data.lastName || !data.email || !data.password) {
        setError('Всі поля обов\'язкові');
        return;
      }
      
      // Реєстрація
      const registerResult = await registerUser(
        data.firstName,
        data.lastName,
        data.email,
        data.password
      );
      
      console.log('📥 [RegisterScreen.onSubmit] Результат реєстрації:', registerResult);
      
      if (registerResult.success) {
        // Автоматичний вхід після реєстрації
        console.log('✅ [RegisterScreen.onSubmit] Реєстрація успішна, виконую вхід...');
        
        // Виправлення: передаємо об'єкт замість окремих параметрів
        const loginResult = await login({
          email: data.email,
          password: data.password,
          rememberMe: false // або використовуйте значення з форми, якщо є
        });
        
        if (loginResult.success) {
          console.log('🎉 [RegisterScreen.onSubmit] Автоматичний вхід успішний');
          // Навігація до головного екрану
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        } else {
          // Якщо автоматичний вхід не вдався, перенаправляємо на Login
          console.log('⚠️ [RegisterScreen.onSubmit] Автоматичний вхід не вдався, перенаправлення на Login');
          navigation.navigate('Login');
        }
      } else {
        // Обробка помилок реєстрації
        if (registerResult.error?.toLowerCase().includes('email')) {
          setFormError('email', t('auth.emailExists') || 'Користувач з таким email вже існує');
        } else {
          setError(registerResult.error || t('auth.registrationFailed') || 'Помилка реєстрації');
        }
      }
    } catch (err) {
      console.error('💥 [RegisterScreen.onSubmit] КРИТИЧНА ПОМИЛКА:', err);
      setError(t('auth.registrationFailed') || 'Помилка реєстрації');
    }
  };
  // Handle login navigation
  const handleLogin = () => {
    navigation.navigate('Login');
  };
  
  // Handle error dismissal
  const handleDismissError = () => {
    clearAllErrors();
  };
  
  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  
  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };
  
  // Get password strength label
  const getPasswordStrengthLabel = () => {
    switch (passwordStrength) {
      case 0: return t('auth.passwordStrength0') || 'Дуже слабкий';
      case 1: return t('auth.passwordStrength1') || 'Слабкий';
      case 2: return t('auth.passwordStrength2') || 'Середній';
      case 3: return t('auth.passwordStrength3') || 'Надійний';
      case 4: return t('auth.passwordStrength4') || 'Дуже надійний';
      case 5: return t('auth.passwordStrength5') || 'Найкращий';
      default: return '';
    }
  };
  
  // Get password strength color
  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case 0: case 1: return colors.error;
      case 2: return colors.warning;
      case 3: case 4: return colors.success;
      case 5: return '#34C759';
      default: return colors.border;
    }
  };
  
  // Combine errors from different sources
  const combinedError = error || authError || errors.general;
  
  // Додаткове налагодження
  useEffect(() => {
    console.log('📊 [RegisterScreen] Поточні значення форми:', values);
  }, [values]);
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={[styles.logo, { color: colors.primary }]}>🛡️</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('auth.register')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('auth.registerSubtitle') || 'Створіть новий обліковий запис'}
            </Text>
          </View>
          
          {/* Error message */}
          <ErrorMessage
            message={combinedError}
            visible={!!combinedError}
            type="error"
            onDismiss={handleDismissError}
            style={styles.errorMessage}
            accessibilityLabel={combinedError}
          />
          
          {/* Registration form */}
          <View style={[styles.form, { backgroundColor: colors.card }]}>
            {/* First Name input */}
            <Input
              label={t('auth.firstName') || 'Ім\'я'}
              placeholder={t('auth.firstNamePlaceholder') || 'Введіть ваше ім\'я'}
              value={firstNameField.value}
              onChangeText={firstNameField.onChangeText || firstNameField.onChange}
              onBlur={firstNameField.onBlur}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => lastNameInputRef.current?.focus()}
              showError={!!errors.firstName}
              errorText={errors.firstName}
              style={styles.input}
              accessibilityLabel={t('auth.firstName') || 'Ім\'я'}
              accessibilityHint={t('auth.firstNameHint') || 'Введіть ваше ім\'я'}
            />
            
            {/* Last Name input */}
            <Input
              ref={lastNameInputRef}
              label={t('auth.lastName') || 'Прізвище'}
              placeholder={t('auth.lastNamePlaceholder') || 'Введіть ваше прізвище'}
              value={lastNameField.value}
              onChangeText={lastNameField.onChangeText || lastNameField.onChange}
              onBlur={lastNameField.onBlur}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailInputRef.current?.focus()}
              showError={!!errors.lastName}
              errorText={errors.lastName}
              style={styles.input}
              accessibilityLabel={t('auth.lastName') || 'Прізвище'}
              accessibilityHint={t('auth.lastNameHint') || 'Введіть ваше прізвище'}
            />
            
            {/* Email input */}
            <Input
              ref={emailInputRef}
              label={t('auth.email') || 'Email'}
              placeholder={t('auth.emailPlaceholder') || 'Введіть ваш email'}
              value={emailField.value}
              onChangeText={emailField.onChangeText || emailField.onChange}
              onBlur={emailField.onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              showError={!!errors.email}
              errorText={errors.email}
              style={styles.input}
              accessibilityLabel={t('auth.email') || 'Email'}
              accessibilityHint={t('auth.emailHint') || 'Введіть ваш email адрес'}
            />
            
            {/* Password input */}
            <Input
              ref={passwordInputRef}
              label={t('auth.password') || 'Пароль'}
              placeholder={t('auth.passwordPlaceholder') || 'Введіть ваш пароль'}
              value={passwordField.value}
              onChangeText={(text) => {
                passwordField.onChangeText ? passwordField.onChangeText(text) : passwordField.onChange(text);
                setValue('password', text);
              }}
              onBlur={passwordField.onBlur}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              showError={!!errors.password}
              errorText={errors.password}
              iconRight={
                <TouchableOpacity onPress={togglePasswordVisibility}>
                  <Icon 
                    name={showPassword ? "visibility-off" : "visibility"} 
                    size={24} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              }
              style={styles.input}
              accessibilityLabel={t('auth.password') || 'Пароль'}
              accessibilityHint={t('auth.passwordHint') || 'Введіть надійний пароль'}
            />
            
            {/* Password strength indicator */}
            {values.password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <View style={styles.passwordStrengthBar}>
                  {[...Array(5)].map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.passwordStrengthSegment,
                        {
                          backgroundColor: index < passwordStrength 
                            ? getPasswordStrengthColor() 
                            : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.passwordStrengthText, { color: getPasswordStrengthColor() }]}>
                  {getPasswordStrengthLabel()}
                </Text>
              </View>
            )}
            
            {/* Confirm Password input */}
            <Input
              ref={confirmPasswordInputRef}
              label={t('auth.confirmPassword') || 'Підтвердження пароля'}
              placeholder={t('auth.confirmPasswordPlaceholder') || 'Введіть пароль ще раз'}
              value={confirmPasswordField.value}
              onChangeText={confirmPasswordField.onChangeText || confirmPasswordField.onChange}
              onBlur={confirmPasswordField.onBlur}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
              showError={!!errors.confirmPassword}
              errorText={errors.confirmPassword}
              iconRight={
                <TouchableOpacity onPress={toggleConfirmPasswordVisibility}>
                  <Icon 
                    name={showConfirmPassword ? "visibility-off" : "visibility"} 
                    size={24} 
                    color={colors.textSecondary} 
                  />
                </TouchableOpacity>
              }
              style={styles.input}
              accessibilityLabel={t('auth.confirmPassword') || 'Підтвердження пароля'}
              accessibilityHint={t('auth.confirmPasswordHint') || 'Введіть пароль ще раз для підтвердження'}
            />
            
            {/* Register button */}
            <Button
              title={t('auth.registerButton') || 'Зареєструватися'}
              onPress={handleSubmit(onSubmit)}
              variant="primary"
              size="large"
              loading={loading || isSubmitting}
              disabled={loading || isSubmitting || !isValid}
              style={styles.registerButton}
              accessibilityLabel={t('auth.registerButton') || 'Зареєструватися'}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading || isSubmitting || !isValid }}
            />
          </View>
          
          {/* Login link */}
          <View style={styles.loginContainer}>
            <Text style={[styles.loginText, { color: colors.textSecondary }]}>
              {t('auth.hasAccount') || 'Вже маєте обліковий запис?'}{' '}
            </Text>
            <TouchableOpacity
              onPress={handleLogin}
              accessibilityLabel={t('auth.login') || 'Увійти'}
              accessibilityRole="button"
            >
              <Text style={[styles.loginLink, { color: colors.primary }]}>
                {t('auth.login') || 'Увійти'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {/* Terms and Privacy */}
          <View style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              {t('auth.byRegistering') || 'Реєструючись, ви погоджуєтесь з'}{' '}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://example.com/terms')}>
              <Text style={[styles.termsLink, { color: colors.primary }]}>
                {t('auth.terms') || 'Умовами використання'}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.termsText, { color: colors.textSecondary }]}>
              {' '}{t('auth.and') || 'та'}{' '}
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL('https://example.com/privacy')}>
              <Text style={[styles.termsLink, { color: colors.primary }]}>
                {t('auth.privacy') || 'Політикою конфіденційності'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        {/* Loading overlay */}
        <LoadingSpinner
          visible={loading || isSubmitting}
          overlay={true}
          text={t('auth.registering') || 'Реєстрація...'}
          accessibilityLabel={t('auth.registering') || 'Виконується реєстрація'}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorMessage: {
    marginBottom: 16,
  },
  form: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  input: {
    marginBottom: 20,
  },
  passwordStrengthContainer: {
    marginBottom: 20,
  },
  passwordStrengthBar: {
    flexDirection: 'row',
    height: 4,
    marginBottom: 8,
  },
  passwordStrengthSegment: {
    flex: 1,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '500',
  },
  registerButton: {
    marginTop: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginText: {
    fontSize: 16,
  },
  loginLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  termsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    textAlign: 'center',
  },
  termsLink: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RegisterScreen;