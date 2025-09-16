// src/screens/profile/EditProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Avatar from '../../components/common/Avatar';
import ErrorMessage from '../../components/common/ErrorMessage';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Icon from 'react-native-vector-icons/MaterialIcons';

const EditProfileScreen = () => {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const { user, updateUser, loading, error: authError } = useAuth();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);

  // Ініціалізація форми даними користувача
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Валідація форми
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = t('profile.firstNameRequired') || 'Ім\'я обов\'язкове';
    } else if (formData.firstName.trim().length < 2) {
      newErrors.firstName = t('profile.firstNameMinLength') || 'Ім\'я має містити мінімум 2 символи';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = t('profile.lastNameRequired') || 'Прізвище обов\'язкове';
    } else if (formData.lastName.trim().length < 2) {
      newErrors.lastName = t('profile.lastNameMinLength') || 'Прізвище має містити мінімум 2 символи';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t('profile.emailRequired') || 'Email обов\'язковий';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('profile.emailInvalid') || 'Невірний формат email';
    }
    
    if (formData.phone && formData.phone.trim().length < 10) {
      newErrors.phone = t('profile.phoneMinLength') || 'Телефон має містити мінімум 10 символів';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Обробка зміни полів
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Очищення помилки при зміні поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Обробка сабміту форми
  const handleSubmit = async () => {
    if (loading) return;
    
    setFormError(null);
    
    if (validateForm()) {
      try {
        const result = await updateUser(formData);
        
        if (result?.success) {
          Alert.alert(
            t('profile.updateSuccessTitle') || 'Успіх',
            t('profile.updateSuccessMessage') || 'Профіль успішно оновлено',
            [
              {
                text: t('common.ok') || 'OK',
                onPress: () => navigation.goBack()
              }
            ]
          );
        } else {
          setFormError(result?.error || t('profile.updateErrorMessage') || 'Помилка при оновленні профілю');
        }
      } catch (error) {
        console.error('Error updating profile:', error);
        setFormError(t('profile.updateErrorMessage') || 'Помилка при оновленні профілю');
      }
    }
  };

  // Обробка скасування
  const handleCancel = () => {
    Alert.alert(
      t('profile.cancelConfirmTitle') || 'Скасувати редагування',
      t('profile.cancelConfirmMessage') || 'Ви впевнені, що хочете скасувати редагування? Всі зміни будуть втрачені.',
      [
        {
          text: t('common.no') || 'Ні',
          style: 'cancel'
        },
        {
          text: t('common.yes') || 'Так',
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  // Обробка зміни аватара
  const handleChangeAvatar = () => {
    Alert.alert(
      t('profile.changeAvatar') || 'Змінити аватар',
      t('profile.changeAvatarMessage') || 'Функція зміни аватара буде доступна у наступному оновленні',
      [{ text: t('common.ok') || 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <TouchableOpacity 
            style={styles.avatarContainer}
            onPress={handleChangeAvatar}
            disabled={loading}
          >
            <Avatar
              name={formData.firstName || user?.firstName || 'Користувач'}
              size="xlarge"
              style={styles.avatar}
            />
            <View style={[styles.editAvatarOverlay, { backgroundColor: colors.primary + '80' }]}>
              <Icon name="edit" size={24} color={colors.white} />
            </View>
          </TouchableOpacity>
          
          <Text style={[styles.name, { color: colors.text }]}>
            {formData.firstName ? `${formData.firstName} ${formData.lastName}` : 
             (user?.firstName ? `${user.firstName} ${user.lastName}` : 'Користувач')}
          </Text>
        </View>

        <View style={[styles.form, { backgroundColor: colors.card }]}>
          <Text style={[styles.formTitle, { color: colors.text }]}>
            {t('profile.editProfile') || 'Редагувати профіль'}
          </Text>
          
          <ErrorMessage
            message={formError || authError}
            visible={!!formError || !!authError}
            type="error"
            style={styles.formError}
          />

          <Input
            label={t('profile.firstName') || 'Ім\'я *'}
            value={formData.firstName}
            onChangeText={(value) => handleInputChange('firstName', value)}
            placeholder={t('profile.firstNamePlaceholder') || 'Введіть ваше ім\'я'}
            showError={!!errors.firstName}
            errorText={errors.firstName}
            style={styles.input}
            editable={!loading}
            accessibilityLabel={t('profile.firstName') || 'Ім\'я'}
          />

          <Input
            label={t('profile.lastName') || 'Прізвище *'}
            value={formData.lastName}
            onChangeText={(value) => handleInputChange('lastName', value)}
            placeholder={t('profile.lastNamePlaceholder') || 'Введіть ваше прізвище'}
            showError={!!errors.lastName}
            errorText={errors.lastName}
            style={styles.input}
            editable={!loading}
            accessibilityLabel={t('profile.lastName') || 'Прізвище'}
          />

          <Input
            label={t('profile.email') || 'Email *'}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder={t('profile.emailPlaceholder') || 'Введіть ваш email'}
            keyboardType="email-address"
            autoCapitalize="none"
            showError={!!errors.email}
            errorText={errors.email}
            style={styles.input}
            editable={!loading}
            accessibilityLabel={t('profile.email') || 'Email'}
          />

          <Input
            label={t('profile.phone') || 'Телефон'}
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
            placeholder={t('profile.phonePlaceholder') || 'Введіть ваш номер телефону'}
            keyboardType="phone-pad"
            showError={!!errors.phone}
            errorText={errors.phone}
            style={styles.input}
            editable={!loading}
            accessibilityLabel={t('profile.phone') || 'Телефон'}
          />

          <View style={styles.buttonContainer}>
            <Button
              title={t('common.cancel') || 'Скасувати'}
              onPress={handleCancel}
              variant="ghost"
              disabled={loading}
              style={[styles.button, styles.cancelButton]}
            />
            <Button
              title={t('common.save') || 'Зберегти'}
              onPress={handleSubmit}
              variant="primary"
              loading={loading}
              disabled={loading}
              style={[styles.button, styles.saveButton]}
              iconLeft={<Icon name="save" size={20} color={colors.white} />}
            />
          </View>
        </View>
      </ScrollView>

      <LoadingSpinner
        visible={loading}
        overlay={true}
        text={t('profile.updating') || 'Оновлення профілю...'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    padding: 30,
    borderRadius: 12,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    marginBottom: 16,
  },
  editAvatarOverlay: {
    position: 'absolute',
    bottom: 16,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  formError: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  button: {
    flex: 1,
  },
  cancelButton: {
    marginRight: 8,
  },
  saveButton: {
    marginLeft: 8,
  },
});

export default EditProfileScreen;