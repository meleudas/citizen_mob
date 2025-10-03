// src/screens/violations/ViolationDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Linking,
  Share,
  RefreshControl,
  Platform,
  Image,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

import { useViolations } from '../../hooks/useViolations';
import { useThemeColors } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';

import Card from '../../components/common/Card';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Button from '../../components/common/Button';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ViolationDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { id } = route.params || {};
  
  const {
    getViolationById,
    deleteViolation,
    loading,
    error,
  } = useViolations();
  const { colors, isDark } = useThemeColors();
  const { t, formatDate } = useLanguage();
  
  const [violation, setViolation] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [address, setAddress] = useState('');
  
  useEffect(() => {
    console.log('🔧 ViolationDetailScreen mounted with id:', id);
    if (id) {
      loadViolation();
    }
  }, [id]);
  
  const loadViolation = async () => {
    try {
      console.log('🔍 Loading violation with id:', id);
      const result = await getViolationById(id);
      console.log('📊 getViolationById result:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log('✅ Success response received');
        
        // Витягуємо реальні дані з result.data.data
        const rawData = result.data?.data || result.data;
        console.log('📄 Raw ', JSON.stringify(rawData, null, 2));
        
        // Адаптація структури даних з сервера
        const adaptedViolation = {
          ...rawData,
          photo: rawData.photoUrl || rawData.photo,
          location: rawData.location ? {
            latitude: Array.isArray(rawData.location.coordinates) 
              ? rawData.location.coordinates[1] 
              : rawData.location.latitude,
            longitude: Array.isArray(rawData.location.coordinates) 
              ? rawData.location.coordinates[0] 
              : rawData.location.longitude,
            address: rawData.location.address,
          } : null,
        };
        
        console.log('🔄 Adapted violation ', JSON.stringify(adaptedViolation, null, 2));
        
        setViolation(adaptedViolation);
        
        if (adaptedViolation.location && adaptedViolation.location.address) {
          setAddress(adaptedViolation.location.address);
        }
        
        navigation.setOptions({
          title: adaptedViolation.description?.substring(0, 20) + '...' || t('violation.detail') || 'Деталі',
        });
      } else {
        console.log('❌ Error response:', result.error);
        throw new Error(result.error || t('violation.notFound') || 'Правопорушення не знайдено');
      }
    } catch (err) {
      console.error('💥 Error loading violation:', err);
      Alert.alert(
        t('error.title') || 'Помилка',
        err.message,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };
  
  const onRefresh = async () => {
    console.log('🔄 Refreshing violation data');
    setRefreshing(true);
    await loadViolation();
    setRefreshing(false);
  };
  
  // Action handlers
  const onEdit = () => {
    Alert.alert(
      t('violations.edit') || 'Редагування',
      t('violations.editComingSoon') || 'Функція редагування скоро буде доступна',
      [{ text: 'OK' }]
    );
  };
  
  const onDelete = () => {
    Alert.alert(
      t('violations.deleteConfirm') || 'Видалення правопорушення',
      t('violations.deleteConfirmMessage') || 'Ви впевнені, що хочете видалити це правопорушення?',
      [
        {
          text: t('common.cancel') || 'Скасувати',
          style: 'cancel',
        },
        {
          text: t('violation.delete') || 'Видалити',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteViolation(id);
              if (result.success) {
                Alert.alert(
                  t('violation.deleted') || 'Видалено',
                  t('violation.deletedMessage') || 'Правопорушення успішно видалено',
                  [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
              } else {
                throw new Error(result.error);
              }
            } catch (err) {
              Alert.alert(
                t('error.title') || 'Помилка',
                err.message || t('violation.deleteError') || 'Не вдалося видалити правопорушення'
              );
            }
          },
        },
      ]
    );
  };
  
  const onShare = async () => {
    try {
      const message = `${t('violations.sharedMessage') || 'Правопорушення'}:\n\n${violation.description}\n${t('category.' + violation.category) || violation.category}\n${formatDate(violation.dateTime)}`;
      
      await Share.share({
        message: message,
        title: t('violations.shareTitle') || 'Правопорушення',
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert(
        t('error.title') || 'Помилка',
        t('violations.shareError') || 'Не вдалося поділитися правопорушенням'
      );
    }
  };
  
  const onOpenInMaps = () => {
    if (!violation?.location) return;
    
    const { latitude, longitude } = violation.location;
    
    // Використовуємо координати замість назви
    const urls = {
      ios: `maps://?ll=${latitude},${longitude}`,
      android: `geo:${latitude},${longitude}?q=${latitude},${longitude}`,
    };
    
    const url = Platform.OS === 'ios' ? urls.ios : urls.android;
    
    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert(
            t('error.title') || 'Помилка',
            t('violations.mapsError') || 'Не вдалося відкрити карту'
          );
        }
      })
      .catch((err) => {
        console.error('Open maps error:', err);
        Alert.alert(
          t('error.title') || 'Помилка',
          t('violations.mapsError') || 'Не вдалося відкрити карту'
        );
      });
  };
  
  const getCategoryIcon = (category) => {
    const icons = {
      parking: 'local-parking',
      trash: 'delete',
      noise: 'volume-up',
      traffic: 'directions-car',
      vandalism: 'brush',
      other: 'warning',
    };
    return icons[category] || icons.other;
  };
  
  const getCategoryColor = (category) => {
    const colorsMap = {
      parking: '#FF5722',
      trash: '#4CAF50',
      noise: '#FFC107',
      traffic: '#2196F3',
      vandalism: '#9C27B0',
      other: '#607D8B',
    };
    return colorsMap[category] || colorsMap.other;
  };
  
  const getStatusColor = (isSynced) => {
    return isSynced ? colors.success : colors.warning;
  };
  
  const getStatusText = (isSynced) => {
    return isSynced 
      ? t('status.synced') || 'Синхронізовано' 
      : t('status.pending') || 'Очікує синхронізації';
  };
  
  const renderPhotoSection = () => {
    console.log('🖼️ Rendering photo section, violation photo:', violation?.photo);
    if (!violation?.photo) {
      return (
        <Card 
          style={[styles.photoCard, { backgroundColor: colors.card }]}
          elevation="medium"
        >
          <View style={styles.noPhotoContainer}>
            <Icon name="photo" size={64} color={colors.textSecondary} />
            <Text style={[styles.noPhotoText, { color: colors.textSecondary }]}>
              {t('violation.noPhoto') || 'Фото відсутнє'}
            </Text>
          </View>
        </Card>
      );
    }
    
    return (
      <Card 
        style={[styles.photoCard, { backgroundColor: colors.card }]}
        elevation="medium"
      >
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: typeof violation.photo === 'string' ? violation.photo.trim() : violation.photo.uri }}
            style={styles.photo}
            resizeMode="contain"
            accessibilityLabel={t('violations.photoDescription') || 'Фото правопорушення'}
          />
        </View>
      </Card>
    );
  };
  
  const renderBasicInfoSection = () => {
    console.log('📋 Rendering basic info section, violation:', violation);
    return (
      <Card 
        style={[styles.infoCard, { backgroundColor: colors.card }]}
        elevation="small"
      >
        {/* Description */}
        <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
          <View style={styles.infoHeader}>
            <Icon name="description" size={24} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.text }]}>
              {t('violation.description') || 'Опис'}
            </Text>
          </View>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {violation?.description || t('violations.noDescription') || 'Опис відсутній'}
          </Text>
        </View>
        
        {/* Category */}
        <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
          <View style={styles.infoHeader}>
            <Icon 
              name={getCategoryIcon(violation?.category)} 
              size={24} 
              color={getCategoryColor(violation?.category)} 
            />
            <Text style={[styles.infoLabel, { color: colors.text }]}>
              {t('violations.category') || 'Категорія'}
            </Text>
          </View>
          <Text style={[styles.infoValue, { color: getCategoryColor(violation?.category) }]}>
            {t(`category.${violation?.category}`) || violation?.category || t('category.other') || 'Інше'}
          </Text>
        </View>
        
        {/* Date and Time */}
        <View style={[styles.infoItem, { borderBottomColor: colors.border }]}>
          <View style={styles.infoHeader}>
            <Icon name="schedule" size={24} color={colors.textSecondary} />
            <Text style={[styles.infoLabel, { color: colors.text }]}>
              {t('violations.dateTime') || 'Дата та час'}
            </Text>
          </View>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {violation?.dateTime ? formatDate(violation.dateTime) : t('violations.noDateTime') || 'Дата не вказана'}
          </Text>
        </View>
        
        {/* Status */}
        <View style={styles.infoItem}>
          <View style={styles.infoHeader}>
            <Icon 
              name={violation?.isSynced ? 'check-circle' : 'sync'} 
              size={24} 
              color={getStatusColor(violation?.isSynced)} 
            />
            <Text style={[styles.infoLabel, { color: colors.text }]}>
              {t('violations.status') || 'Статус'}
            </Text>
          </View>
          <Text style={[styles.infoValue, { color: getStatusColor(violation?.isSynced) }]}>
            {getStatusText(violation?.isSynced)}
          </Text>
        </View>
      </Card>
    );
  };
  
  // Render location section
  const renderLocationSection = () => {
    console.log('📍 Rendering location section, violation location:', violation?.location);
    
    if (!violation?.location) {
      console.log('📍 No location data available');
      return null;
    }
    
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('violations.location') || 'Місце'}
        </Text>
        
        <Card 
          style={[styles.locationCard, { backgroundColor: colors.card }]}
          elevation="small"
        >
          {/* Address */}
          {address ? (
            <View style={[styles.locationItem, { borderBottomColor: colors.border }]}>
              <View style={styles.locationHeader}>
                <Icon name="location-on" size={24} color={colors.textSecondary} />
                <Text style={[styles.locationLabel, { color: colors.text }]}>
                  {t('violations.address') || 'Адреса'}
                </Text>
              </View>
              <Text style={[styles.locationValue, { color: colors.text }]}>
                {address}
              </Text>
            </View>
          ) : null}
          
          {/* Coordinates */}
          <View style={[styles.locationItem, { borderBottomColor: colors.border }]}>
            <View style={styles.locationHeader}>
              <Icon name="gps-fixed" size={24} color={colors.textSecondary} />
              <Text style={[styles.locationLabel, { color: colors.text }]}>
                {t('violations.coordinates') || 'Координати'}
              </Text>
            </View>
            <Text style={[styles.locationValue, { color: colors.text }]}>
              {`${violation.location.latitude.toFixed(6)}, ${violation.location.longitude.toFixed(6)}`}
            </Text>
          </View>
          
          {/* Open in Maps Button */}
          <Button
            title={t('violations.openInMaps') || 'Відкрити в картах'}
            onPress={onOpenInMaps}
            variant="outline"
            size="small"
            iconLeft={<Icon name="map" size={20} />}
            style={styles.openMapsButton}
            accessibilityLabel={t('violations.openInMaps') || 'Відкрити в картах'}
          />
        </Card>
      </View>
    );
  };
  
  const renderActionButtons = () => {
    console.log('🔘 Rendering action buttons');
    return (
      <View style={styles.actionsContainer}>
        <View style={styles.mainActions}>
          <Button
            title={t('violations.edit') || 'Редагувати'}
            onPress={onEdit}
            variant="secondary"
            size="large"
            iconLeft={<Icon name="edit" size={20} />}
            style={styles.actionButton}
            accessibilityLabel={t('violations.edit') || 'Редагувати правопорушення'}
          />
          
          <Button
            title={t('violations.delete') || 'Видалити'}
            onPress={onDelete}
            variant="danger"
            size="large"
            iconLeft={<Icon name="delete" size={20} />}
            style={styles.actionButton}
            accessibilityLabel={t('violations.delete') || 'Видалити правопорушення'}
          />
        </View>
        
        <Button
          title={t('violations.share') || 'Поділитися'}
          onPress={onShare}
          variant="primary"
          size="large"
          iconLeft={<Icon name="share" size={20} />}
          style={styles.shareButton}
          accessibilityLabel={t('violations.share') || 'Поділитися правопорушенням'}
        />
      </View>
    );
  };
  
  // Render loading state
  if (loading && !refreshing) {
    console.log('⏳ Loading state active');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <LoadingSpinner
          visible={true}
          text={t('violations.loading') || 'Завантаження...'}
        />
      </SafeAreaView>
    );
  }
  
  if (error) {
    console.log('⚠️ Error state:', error);
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <ErrorMessage
          message={error}
          visible={true}
          type="error"
          style={styles.errorContainer}
          onDismiss={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }
  
  if (!violation && !loading) {
    console.log('📭 No violation data and not loading');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Icon name="error-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t('violations.notFound') || 'Правопорушення не знайдено'}
          </Text>
          <Button
            title={t('common.goBack') || 'Назад'}
            onPress={() => navigation.goBack()}
            variant="primary"
            style={styles.emptyButton}
          />
        </View>
      </SafeAreaView>
    );
  }
  
  console.log('✅ Rendering main content, violation data present');
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Photo Section */}
        {renderPhotoSection()}
        
        {/* Basic Info Section */}
        {renderBasicInfoSection()}
        
        {/* Location Section */}
        {renderLocationSection()}
        
        {/* Action Buttons */}
        {renderActionButtons()}
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {t('violations.id') || 'ID'}: {violation?.id}
          </Text>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {t('violations.createdAt') || 'Створено'}: {violation?.createdAt ? formatDate(violation.createdAt) : ''}
          </Text>
        </View>
      </ScrollView>
      
      {/* Loading overlay */}
      <LoadingSpinner
        visible={loading && refreshing}
        overlay={true}
        text={t('violations.updating') || 'Оновлення...'}
      />
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
  scrollContent: {
    padding: 16,
  },
  photoCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.2)',
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
  photoContainer: {
    height: 300,
    backgroundColor: '#f0f0f0',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  noPhotoContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  noPhotoText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: '500',
  },
  infoCard: {
    borderRadius: 16,
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
  infoItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  infoValue: {
    fontSize: 16,
    lineHeight: 22,
    paddingLeft: 36,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  locationCard: {
    borderRadius: 16,
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
  locationItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  locationValue: {
    fontSize: 16,
    lineHeight: 22,
    paddingLeft: 36,
  },
  openMapsButton: {
    margin: 16,
    marginTop: 8,
  },
  actionsContainer: {
    marginBottom: 20,
  },
  mainActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
  },
  shareButton: {
    width: '100%',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 12,
    marginBottom: 4,
  },
  errorContainer: {
    margin: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginVertical: 20,
  },
  emptyButton: {
    marginTop: 20,
    minWidth: 200,
  },
});

export default ViolationDetailScreen;