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
// ДОДАНО нові хуки
import { useCloudinary } from '../../hooks/useCloudinary';
import { useSync } from '../../hooks/useSync';
import { useNetwork } from '../../hooks/useNetwork';

const AddViolationScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const { addViolation, loading, error: violationsError } = useViolations();
  // Використання нових хуків
  const { uploadPhoto, uploading, error: cloudinaryError } = useCloudinary();
  const { saveOfflineViolation, syncData, pendingCount } = useSync();
  const network = useNetwork();
  
  const [formError, setFormError] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [isOnline, setIsOnline] = useState(network.isOnline() && network.isInternetReachable);
  
  // Ref для доступу до методів форми
  const formRef = useRef();

  // Відстеження статусу мережі
  useEffect(() => {
    const updateNetworkStatus = () => {
      const onlineStatus = network.isOnline() && network.isInternetReachable;
      setIsOnline(onlineStatus);
      
      // Якщо мережа з'явилася і є офлайн дані - запускаємо синхронізацію
      if (onlineStatus && pendingCount > 0) {
        syncData();
      }
    };
    
    updateNetworkStatus();
  }, [network, pendingCount, syncData]);

  // Обробка всіх спроб виходу з екрану
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        // Перешкоджаємо дефолтній поведінці
        e.preventDefault();
        
        // Зберігаємо дію, яку потрібно виконати
        setPendingAction(e.data.action);
        
        // Показуємо модальне вікно підтвердження
        setShowCancelModal(true);
      });

      return unsubscribe;
    }, [navigation])
  );

  // Обробка сабміту форми
  const handleSubmit = async (formData) => {
    try {
      setFormError(null);
      
      // Підготовка даних для збереження
      const violationData = {
        description: formData.description,
        category: formData.category,
        location: {
          type: 'Point',
          coordinates: [formData.location.longitude, formData.location.latitude], // [довгота, широта]
        },
        dateTime: formData.dateTime,
      };

      console.log('📤 [AddViolationScreen] Відправка даних правопорушення:', violationData);

      if (isOnline) {
        // Онлайн режим - відправляємо прямо на сервер
        const result = await addViolation(violationData);
        
        if (result?.success) {
          // Якщо є фото - завантажуємо його на Cloudinary
          if (formData.photo) {
            try {
              const uploadResult = await uploadPhoto(formData.photo);
              if (uploadResult.success) {
                // Оновлюємо правопорушення з URL фото
                // Це можна зробити додатковим API викликом
                console.log('📸 Фото завантажено:', uploadResult.secureUrl);
              }
            } catch (uploadError) {
              console.error('❌ Помилка завантаження фото:', uploadError);
            }
          }
          
          // Показ повідомлення про успіх
          Alert.alert(
            t('violations.addSuccessTitle') || 'Успіх',
            t('violations.addSuccessMessage') || 'Правопорушення успішно додано',
            [
              {
                text: t('common.ok') || 'OK',
                onPress: () => {
                  navigation.goBack();
                }
              }
            ],
            { cancelable: false }
          );
        } else {
          const errorMessage = result?.error || t('violations.addErrorMessage') || 'Помилка при додаванні правопорушення';
          console.error('❌ [AddViolationScreen] Помилка додавання:', errorMessage);
          setFormError(errorMessage);
        }
      } else {
        // Офлайн режим - зберігаємо локально
        const offlineResult = await saveOfflineViolation({
          data: {
            ...violationData,
            photo: formData.photo, // Зберігаємо фото для подальшого завантаження
          },
          isNew: true,
          synced: false,
        });
        
        if (offlineResult.success) {
          Alert.alert(
            t('violations.offlineSaveTitle') || 'Збережено офлайн',
            t('violations.offlineSaveMessage') || 'Правопорушення збережено. Воно буде синхронізоване коли з\'явиться інтернет.',
            [
              {
                text: t('common.ok') || 'OK',
                onPress: () => {
                  navigation.goBack();
                }
              }
            ],
            { cancelable: false }
          );
        } else {
          const errorMessage = offlineResult?.error || t('violations.offlineSaveError') || 'Помилка збереження офлайн';
          setFormError(errorMessage);
        }
      }
    } catch (error) {
      console.error('💥 [AddViolationScreen] Критична помилка:', error);
      const errorMessage = t('violations.addErrorMessage') || 'Помилка при додаванні правопорушення';
      setFormError(errorMessage);
    }
  };

  // Обробка скасування - очищення форми
  const handleCancel = () => {
    // Імітуємо дію "назад" для показу модального вікна
    setPendingAction({ type: 'GO_BACK' });
    setShowCancelModal(true);
  };

  // Обробка підтвердження скасування - очищення форми
  const handleConfirmCancel = () => {
    setShowCancelModal(false);
    
    // Очищуємо форму
    if (formRef.current && formRef.current.resetForm) {
      formRef.current.resetForm();
    }
    
    // Якщо є збережена дія, виконуємо її
    if (pendingAction) {
      navigation.dispatch(pendingAction);
    } else {
      // Інакше повертаємося назад
      navigation.goBack();
    }
  };

  // Обробка відміни скасування
  const handleDismissCancel = () => {
    setShowCancelModal(false);
    setPendingAction(null);
  };

  // Рендер модального вікна підтвердження скасування
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
              {t('violations.form.cancelTitle') || 'Скасувати форму?'}
            </Text>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={[styles.modalMessage, { color: colors.text }]}>
              {t('violations.form.cancelMessage') || 'Всі внесені зміни будуть втрачені. Ви впевнені, що хочете скасувати?'}
            </Text>
            
            <View style={styles.modalActions}>
              <View style={styles.modalButtonWrapper}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.card }]}
                  onPress={handleDismissCancel}
                  accessibilityLabel={t('common.no') || "Ні"}
                >
                  <Text style={[styles.modalButtonText, { color: colors.text }]}>
                    {t('common.no') || "Ні"}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.modalButtonWrapper}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: colors.primary }]}
                  onPress={handleConfirmCancel}
                  accessibilityLabel={t('common.yes') || "Так"}
                >
                  <Text style={[styles.modalButtonText, { color: colors.white }]}>
                    {t('common.yes') || "Так"}
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
        loading={loading || uploading}
        error={formError || violationsError || cloudinaryError}
        accessibilityLabel={t('violations.form.title') || "Форма додавання правопорушення"}
      />
      
      {/* Модальне вікно підтвердження скасування */}
      {renderCancelModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Стилі для модальних вікон
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
  modalCloseButton: {
    padding: 4,
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