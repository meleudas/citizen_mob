// src/screens/auth/LoginScreen.js
import React, { useRef, useEffect } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as yup from 'yup';

// Custom hooks
import { useAuth } from '../../hooks/useAuth';
import { useForm } from '../../hooks/useForm';
import { useThemeColors } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';

// Common components
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const LoginScreen = () => {
  const navigation = useNavigation();
  const { login, loading, error, clearError } = useAuth();
  const { colors, isDark } = useThemeColors();
  const { t, formatDate } = useLanguage();
  
  // Refs for auto-focus
  const passwordInputRef = useRef(null);
  
  // Validation schema
  const validationSchema = yup.object().shape({
    email: yup
      .string()
      .email(t('auth.emailInvalid'))
      .required(t('auth.emailRequired')),
    password: yup
      .string()
      .min(6, t('auth.passwordMinLength'))
      .required(t('auth.passwordRequired')),
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
    values,
  } = useForm(
    {
      email: '',
      password: '',
      rememberMe: false,
    },
    validationSchema
  );
  
  // Register form fields
  const emailField = register('email', {
    required: true,
  });
  
  const passwordField = register('password', {
    required: true,
    minLength: 6,
  });
  
  const rememberMeField = register('rememberMe');
  
  // Auto-focus on email field
  useEffect(() => {
    // Auto-focus handled by Input component
  }, []);
  
  // Handle form submission
 
  const onSubmit = async (data) => {
    try {
      clearError();
      clearFormError();
      
      console.log('🔐 [LoginScreen] Відправка даних для входу:', data);
      
      // Тепер передаємо весь об'єкт data
      const result = await login(data); // Замість login(data.email, data.password, data.rememberMe)
      
      console.log('📥 [LoginScreen] Результат входу:', result);
      
      if (result.success) {
        console.log('✅ [LoginScreen] Успішний вхід, перенаправлення до MainTabs');
        // Успішний вхід - навігація до головного екрану
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }],
        });
      } else {
        // Handle specific error types
        console.log('❌ [LoginScreen] Помилка входу:', result.error);
        if (result.error?.toLowerCase().includes('email')) {
          setFormError('email', t('auth.emailNotFound') || 'Користувача не знайдено');
        } else if (result.error?.toLowerCase().includes('password')) {
          setFormError('password', t('auth.invalidPassword') || 'Невірний пароль');
        } else {
          setFormError('general', result.error || t('auth.loginFailed') || 'Помилка входу');
        }
      }
    } catch (err) {
      console.error('💥 [LoginScreen] Критична помилка входу:', err);
      setFormError('general', t('auth.loginFailed') || 'Помилка входу');
    }
  };
  
  // Handle forgot password navigation
  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };
  
  // Handle register navigation
  const handleRegister = () => {
    navigation.navigate('Register');
  };
  
  // Handle error dismissal
  const handleDismissError = () => {
    clearError();
    clearFormError();
  };
  
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
            <Text style={[styles.title, { color: colors.text }]}>
              {t('auth.login')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('auth.loginSubtitle')}
            </Text>
          </View>
          
          {/* Error message */}
          <ErrorMessage
            message={error || errors.general}
            visible={!!(error || errors.general)}
            type="error"
            onDismiss={handleDismissError}
            style={styles.errorMessage}
          />
          
          {/* Login form */}
          <View style={[styles.form, { backgroundColor: colors.card }]}>
            {/* Email input */}
            <Input
              label={t('auth.email')}
              placeholder={t('auth.emailPlaceholder')}
              value={emailField.value}
              onChangeText={emailField.onChange}
              onBlur={emailField.onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              showError={!!errors.email}
              errorText={errors.email}
              style={styles.input}
              accessibilityLabel={t('auth.email')}
              accessibilityHint={t('auth.emailHint')}
            />
            
            {/* Password input */}
            <Input
              ref={passwordInputRef}
              label={t('auth.password')}
              placeholder={t('auth.passwordPlaceholder')}
              value={passwordField.value}
              onChangeText={passwordField.onChange}
              onBlur={passwordField.onBlur}
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleSubmit(onSubmit)}
              showError={!!errors.password}
              errorText={errors.password}
              style={styles.input}
              accessibilityLabel={t('auth.password')}
              accessibilityHint={t('auth.passwordHint')}
            />
            
            {/* Remember me and Forgot password row */}
            <View style={styles.optionsRow}>
              {/* Remember me checkbox */}
              <TouchableOpacity
                onPress={() => rememberMeField.onChange(!rememberMeField.value)}
                accessibilityLabel={t('auth.rememberMe')}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMeField.value }}
              >
                <View style={styles.rememberMeContainer}>
                  <View style={[
                    styles.checkbox,
                    { 
                      borderColor: rememberMeField.value ? colors.primary : colors.border,
                      backgroundColor: rememberMeField.value ? colors.primary : 'transparent'
                    }
                  ]}>
                    {rememberMeField.value && (
                      <Text style={styles.checkboxCheck}>✓</Text>
                    )}
                  </View>
                  <Text style={[styles.rememberMeText, { color: colors.text }]}>
                    {t('auth.rememberMe')}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {/* Forgot password link */}
              <TouchableOpacity
                onPress={handleForgotPassword}
                accessibilityLabel={t('auth.forgotPassword')}
                accessibilityRole="button"
              >
                <Text style={[styles.forgotPasswordText, { color: colors.primary }]}>
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Login button */}
            <Button
              title={t('auth.loginButton')}
              onPress={handleSubmit(onSubmit)}
              variant="primary"
              size="large"
              loading={loading || isSubmitting}
              disabled={loading || isSubmitting || !isValid}
              style={styles.loginButton}
              accessibilityLabel={t('auth.loginButton')}
              accessibilityRole="button"
              accessibilityState={{ disabled: loading || isSubmitting || !isValid }}
            />
          </View>
          
          {/* Register link */}
          <View style={styles.registerContainer}>
            <Text style={[styles.registerText, { color: colors.textSecondary }]}>
              {t('auth.noAccount')}{' '}
            </Text>
            <TouchableOpacity
              onPress={handleRegister}
              accessibilityLabel={t('auth.register')}
              accessibilityRole="button"
            >
              <Text style={[styles.registerLink, { color: colors.primary }]}>
                {t('auth.register')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        {/* Loading overlay */}
        <LoadingSpinner
          visible={loading || isSubmitting}
          overlay={true}
          text={t('auth.loggingIn') || 'Вхід...'}
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCheck: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 16,
  },
  forgotPasswordText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loginButton: {
    marginTop: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 16,
  },
  registerLink: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LoginScreen;