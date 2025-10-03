// src/screens/violations/AddViolationScreen.js 
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ViolationForm from '../../components/forms/ViolationForm';
import { useAppTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useViolations } from '../../hooks/useViolations';
import { useCloudinary } from '../../hooks/useCloudinary';
import { useSync } from '../../hooks/useSync';
import { useNetwork } from '../../hooks/useNetwork';

const AddViolationScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const { addViolation, loading, error: violationsError } = useViolations();
  const { uploadPhoto, uploading, error: cloudinaryError } = useCloudinary();
  const { 
    saveOfflineViolation, 
    syncData, 
    pendingCount, 
    isSyncing,
    clearSyncState 
  } = useSync();
  const network = useNetwork();
  
  const [formError, setFormError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isOnline, setIsOnline] = useState(network.isOnline() && network.isInternetReachable);
  const [syncInProgress, setSyncInProgress] = useState(false);
  
  const formRef = useRef();

  useEffect(() => {
    const updateNetworkStatus = () => {
      const onlineStatus = network.isOnline() && network.isInternetReachable;
      setIsOnline(onlineStatus);

      if (onlineStatus && pendingCount > 0 && !isSyncing && !syncInProgress) {
        handleAutoSync();
      }
    };
    
    updateNetworkStatus();
  }, [network, pendingCount, isSyncing, syncInProgress]);

  const handleAutoSync = useCallback(async () => {
    if (syncInProgress) {
      console.log('Auto sync skipped - already in progress');
      return;
    }
    
    setSyncInProgress(true);
    try {
      await syncData();
    } catch (error) {
      console.error('Auto sync error:', error);
      await clearSyncState();
    } finally {
      setSyncInProgress(false);
    }
  }, [syncInProgress, syncData, clearSyncState]);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        e.preventDefault();
        setPendingAction(e.data.action);
        setShowCancelModal(true);
      });

      return unsubscribe;
    }, [navigation])
  );

  const validateViolationData = (formData) => {
    const errors = [];

    if (!formData.description || formData.description.trim().length < 10) {
      errors.push(t('violations.validation.descriptionMinLength') || t('violations.validation.descriptionMinLength_default') || 'Опис має містити принаймні 10 символів');
    }
    
    // ВАЖЛИВО: Змінено відповідно до існуючих ключів категорій
    const validCategories = [
        t('category.traffic').toLowerCase().replace(/\s+/g, '_'), // 'Порушення ПДР' -> 'порушення_пдр' -> 'traffic'
        t('category.parking').toLowerCase().replace(/\s+/g, '_'), // 'Паркування' -> 'паркування' -> 'parking'
        t('category.trash').toLowerCase().replace(/\s+/g, '_'), // 'Сміття' -> 'сміття' -> 'trash'
        t('category.environment').toLowerCase().replace(/\s+/g, '_'), // 'Екологія' -> 'екологія' -> 'environment'
        t('category.public_safety').toLowerCase().replace(/\s+/g, '_'), // 'Громадська безпека' -> 'громадська_безпека' -> 'public_safety'
        t('category.infrastructure').toLowerCase().replace(/\s+/g, '_'), // 'Інфраструктура' -> 'інфраструктура' -> 'infrastructure'
        t('category.vandalism').toLowerCase().replace(/\s+/g, '_'), // 'Вандалізм' -> 'вандалізм' -> 'vandalism'
        t('category.noise').toLowerCase().replace(/\s+/g, '_'), // 'Шум' -> 'шум' -> 'noise'
        t('category.other').toLowerCase().replace(/\s+/g, '_') // 'Інше' -> 'інше' -> 'other'
    ].filter(cat => cat !== ''); // Відфільтрувати порожні, якщо переклади не знайдено

    // Порівнюємо з очікуваними значеннями, а не з перекладеними рядками
    const expectedValidCategories = ['traffic', 'parking', 'trash', 'vandalism', 'noise', 'other', 'environment', 'public_safety', 'infrastructure'];
    if (!formData.category || !expectedValidCategories.includes(formData.category)) {
      errors.push(t('violations.validation.invalidCategory') || t('violations.validation.invalidCategory_default') || 'Невірна категорія правопорушення');
    }
    
    if (!formData.dateTime) {
      errors.push(t('violations.validation.dateTimeRequired') || t('violations.validation.dateTimeRequired_default') || 'Дата та час є обов\'язковими');
    } else {
      const date = new Date(formData.dateTime);
      if (isNaN(date.getTime())) {
        errors.push(t('violations.validation.invalidDateTime') || t('violations.validation.invalidDateTime_default') || 'Невірний формат дати');
      }
    }
    
    if (!formData.location) {
      errors.push(t('violations.validation.locationRequired') || t('violations.validation.locationRequired_default') || 'Локація є обов\'язковою');
    } else {
      if (!formData.location.latitude || !formData.location.longitude) {
        errors.push(t('violations.validation.coordinatesRequired') || t('violations.validation.coordinatesRequired_default') || 'Координати є обов\'язковими');
      }
      if (typeof formData.location.latitude !== 'number' || typeof formData.location.longitude !== 'number') {
        errors.push(t('violations.validation.invalidCoordinates') || t('violations.validation.invalidCoordinates_default') || 'Координати мають бути числами');
      }
    }
    
    return errors;
  };

  const handleSubmit = async (formData) => {
    try {
      setFormError(null);
      
      const validationErrors = validateViolationData(formData);
      if (validationErrors.length > 0) {
        setFormError(validationErrors.join('\n'));
        return;
      }

      if (isOnline) {
        let photoUrl = null;
        if (formData.photo) {
          try {
            console.log('📸 Завантаження фото на Cloudinary...');
            const uploadResult = await uploadPhoto(formData.photo);
            
            if (uploadResult.success) {
              console.log('✅ Фото успішно завантажено:', uploadResult.secureUrl);
              photoUrl = uploadResult.secureUrl;
            } else {
              console.warn('⚠️ Помилка завантаження фото:', uploadResult.error);
              throw new Error(uploadResult.error || 'Помилка завантаження фото');
            }
          } catch (uploadError) {
            console.error('❌ Помилка завантаження фото:', uploadError);
            setFormError(t('violations.photoUploadError') || t('violations.photoUploadError_default') || 'Помилка завантаження фото');
            return;
          }
        }

        const violationData = {
          description: formData.description.trim(),
          category: formData.category,
          location: {
            type: 'Point',
            coordinates: [formData.location.longitude, formData.location.latitude]
          },
          dateTime: formData.dateTime,
          ...(photoUrl && { photoUrl: photoUrl.trim() })
        };

        console.log('🔍 [AddViolationScreen] Відправка даних на сервер:', violationData);

        const validationResult = await addViolation(violationData);
        
        if (validationResult?.success) {
          console.log('✅ Правопорушення успішно додано, ID:', validationResult.data?.id);
          
          Alert.alert(
            t('common.success') || t('common.success_default') || 'Успіх', 
            t('violations.addSuccessMessage') || t('violations.addSuccessMessage_default') || 'Правопорушення успішно додано',
            [{ text: t('common.ok') || t('common.ok_default') || 'OK', onPress: () => navigation.goBack() }], 
            { cancelable: false }
          );
        } else {
          const errorMessage = validationResult?.error || t('violations.addErrorMessage') || t('violations.addErrorMessage_default') || 'Помилка додавання правопорушення';
          console.error('❌ Помилка додавання:', errorMessage);
          setFormError(errorMessage);
        }
      } else {
        const offlineResult = await saveOfflineViolation({
          data: {
            description: formData.description.trim(),
            category: formData.category,
            location: {
              type: 'Point',
              coordinates: [formData.location.longitude, formData.location.latitude],
            },
            dateTime: formData.dateTime,
            photo: formData.photo, 
          },
          isNew: true,
          synced: false,
        });
        
        if (offlineResult.success) {
          Alert.alert(
            t('violations.offlineSaveTitle') || t('violations.offlineSaveTitle_default') || 'Збережено офлайн',
            t('violations.offlineSaveMessage') || t('violations.offlineSaveMessage_default') || 'Правопорушення збережено. Воно буде синхронізоване коли з\'явиться інтернет.',
            [{ text: t('common.ok') || t('common.ok_default') || 'OK', onPress: () => navigation.goBack() }], 
            { cancelable: false }
          );
        } else {
          const errorMessage = offlineResult?.error || t('violations.offlineSaveError') || t('violations.offlineSaveError_default') || 'Помилка збереження офлайн';
          setFormError(errorMessage);
        }
      }
    } catch (error) {
      console.error('💥 Критична помилка:', error);
      setFormError(t('violations.addErrorMessage') || t('violations.addErrorMessage_default') || 'Помилка при додаванні правопорушення');
    }
  };

  const handleCancel = () => {
    setPendingAction({ type: 'GO_BACK' });
    setShowCancelModal(true);
  };

  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    
    if (formRef.current && formRef.current.resetForm) {
      formRef.current.resetForm();
    }
    
    if (pendingAction) {
      navigation.dispatch(pendingAction);
    } else {
      navigation.goBack();
    }
  };

  const handleDismissCancel = () => {
    setShowCancelModal(false);
    setPendingAction(null);
  };

  const renderCancelModal = () => (
    <Modal
      visible={showCancelModal}
      transparent={true}
      animationType="fade"
      onRequestClose={handleDismissCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {t('violations.form.cancelTitle') || t('violations.form.cancelTitle_default') || 'Скасувати форму?'}
            </Text>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={[styles.modalMessage, { color: colors.text }]}>
              {t('violations.form.cancelMessage') || t('violations.form.cancelMessage_default') || 'Всі внесені зміни будуть втрачені. Ви впевнені, що хочете скасувати?'}
            </Text>
            
            <View style={styles.modalActions}>
              <View style={styles.modalButtonWrapper}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.card }]}
                  onPress={handleDismissCancel}
                  accessibilityLabel={t('common.no') || t('common.no_default') || "Ні"} 
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>
                    {t('common.no') || t('common.no_default') || "Ні"} 
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalButtonWrapper}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleConfirmCancel}
                  accessibilityLabel={t('common.yes') || t('common.yes_default') || "Так"} 
                >
                  <Text style={[styles.modalButtonText, { color: colors.white }]}>
                    {t('common.yes') || t('common.yes_default') || "Так"} 
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ViolationForm
        ref={formRef}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading || uploading || syncInProgress}
        error={formError || violationsError || cloudinaryError}
        accessibilityLabel={t('addViolation.title') || t('addViolation.title_default') || "Форма додавання правопорушення"} // Змінено на існуючий ключ
      />
      
      {renderCancelModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.25)',
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flex: 1,
  },
  modalContent: {
    padding: 16,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'column',
  },
  modalButtonWrapper: {
    marginBottom: 8,
  },
  modalButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AddViolationScreen;
