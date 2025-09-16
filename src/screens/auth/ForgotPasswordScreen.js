// src/screens/auth/ForgotPasswordScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Валідація email
  const validateEmail = (emailValue) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  const handleSendResetLink = async () => {
    try {
      setError(null);
      
      // Валідація
      if (!email.trim()) {
        setError('Введіть ваш email');
        return;
      }
      
      if (!validateEmail(email)) {
        setError('Введіть коректний email');
        return;
      }

      setLoading(true);
      
      // Імітація API запиту для відновлення пароля
      // В реальному додатку тут буде:
      // const response = await api.forgotPassword({ email });
      
      // Симуляція мережевого запиту
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Симуляція успішного відправлення
      setSuccess(true);
      setEmailSent(true);
      
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Помилка відправки посилання для відновлення пароля');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigation.navigate('Login');
  };

  const handleResendEmail = () => {
    setEmailSent(false);
    setSuccess(false);
  };

  if (success && emailSent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.successContainer}>
          <Text style={[styles.successIcon, { color: colors.success }]}>
            ✅
          </Text>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Посилання надіслано!
          </Text>
          <Text style={[styles.successMessage, { color: colors.textSecondary }]}>
            Ми надіслали посилання для відновлення пароля на ваш email:
          </Text>
          <Text style={[styles.emailText, { color: colors.primary }]}>
            {email}
          </Text>
          <Text style={[styles.instructions, { color: colors.textSecondary }]}>
            Перевірте вашу пошту та дотримуйтесь інструкцій для відновлення пароля.
          </Text>
          
          <View style={styles.successActions}>
            <Button
              title="Надіслати ще раз"
              onPress={handleResendEmail}
              variant="outline"
              style={styles.secondaryButton}
            />
            <Button
              title="Повернутися до входу"
              onPress={handleBackToLogin}
              variant="primary"
              style={styles.primaryButton}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Відновлення пароля
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Введіть ваш email для отримання посилання на відновлення пароля
          </Text>
        </View>

        <ErrorMessage
          message={error}
          visible={!!error}
          type="error"
          style={styles.errorContainer}
        />

        <View style={styles.form}>
          <Input
            label="Email *"
            value={email}
            onChangeText={setEmail}
            placeholder="Введіть ваш email"
            type="email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            showError={!!error && !email.trim()}
            errorText="Email обов'язковий"
            style={styles.input}
            accessibilityLabel="Email для відновлення пароля"
          />
        </View>

        <Button
          title="Надіслати посилання"
          onPress={handleSendResetLink}
          variant="primary"
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
          accessibilityLabel="Надіслати посилання для відновлення пароля"
        />

        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToLogin}
          disabled={loading}
          accessibilityLabel="Повернутися до екрану входу"
          accessibilityRole="button"
        >
          <Text style={[styles.backButtonText, { color: colors.primary }]}>
            ← Назад до входу
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <LoadingSpinner visible={loading} overlay={true} text="Відправка посилання..." />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorContainer: {
    marginBottom: 20,
  },
  form: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 20,
  },
  submitButton: {
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'center',
    padding: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 22,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  instructions: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    marginTop: 8,
  },
  secondaryButton: {
    marginBottom: 8,
  },
});

export default ForgotPasswordScreen;

