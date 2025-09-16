// src/screens/map/MapScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import WebViewMap from '../../components/maps/WebViewMap';
import { useAppTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useViolations } from '../../hooks/useViolations';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const MapScreen = () => {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const { violations, loading, error, getViolations } = useViolations();
  
  const [userLocation, setUserLocation] = useState(null);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [initialRegion, setInitialRegion] = useState({
    latitude: 50.4501,
    longitude: 30.5234,
    zoom: 12
  });

  // Завантаження правопорушень при монтуванні
  useEffect(() => {
    loadViolations();
    requestLocationPermission();
  }, []);

  // Обробка завантаження правопорушень
  const loadViolations = async () => {
    try {
      await getViolations();
    } catch (err) {
      console.error('Error loading violations:', err);
      Alert.alert(
        t('map.loadErrorTitle') || 'Помилка',
        t('map.loadErrorMessage') || 'Не вдалося завантажити правопорушення',
        [{ text: t('common.ok') || 'OK' }]
      );
    }
  };

  // Запит дозволу на геолокацію
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (err) {
      console.error('Error requesting location permission:', err);
    }
  };

  // Отримання поточної позиції користувача
  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });
      
      // Центрування карти на поточній позиції
      setInitialRegion({
        latitude,
        longitude,
        zoom: 14
      });
    } catch (err) {
      console.error('Error getting current location:', err);
    }
  };

  // Форматування категорій для маркерів
  const getCategoryKey = (categoryName) => {
    const categoryMap = {
      'Паркування': 'parking',
      'Сміття': 'trash',
      'Шум': 'noise',
      'Порушення правил дорожнього руху': 'traffic',
      'Вандалізм': 'vandalism',
      'Інше': 'other'
    };
    
    return categoryMap[categoryName] || 'other';
  };

  // Підготовка маркерів для карти
  useEffect(() => {
    if (violations && violations.length > 0) {
      const markers = violations
        .filter(violation => 
          violation.location && 
          violation.location.latitude && 
          violation.location.longitude
        )
        .map(violation => ({
          id: violation.id,
          coordinate: {
            latitude: violation.location.latitude,
            longitude: violation.location.longitude,
          },
          title: violation.description || t('map.noDescription') || 'Без опису',
          description: violation.category || '',
          category: getCategoryKey(violation.category),
          violationData: violation,
        }));
      
      setMapMarkers(markers);
    }
  }, [violations]);

  // Обробка кліку по маркеру
  const handleMarkerPress = (marker) => {
    setSelectedMarker(marker);
    Alert.alert(
      marker.title,
      marker.description,
      [
        { text: t('common.cancel') || 'Скасувати', style: 'cancel' },
        {
          text: t('map.viewDetails') || 'Деталі',
          onPress: () => {
            if (marker.violationData) {
              navigation.navigate('ViolationDetail', { id: marker.violationData.id });
            }
          }
        }
      ]
    );
  };

  // Обробка оновлення даних
  const handleRefresh = () => {
    loadViolations();
  };

  // Обробка переходу до поточної позиції
  const handleGoToUserLocation = () => {
    if (userLocation) {
      setInitialRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        zoom: 14
      });
    } else {
      getCurrentLocation();
    }
  };

  // Обробка додавання нового правопорушення
  const handleAddViolation = () => {
    navigation.navigate('MainTabs', { screen: 'add' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('map.title') || 'Карта правопорушень'}
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={loading}
            accessibilityLabel={t('map.refresh') || 'Оновити'}
          >
            <Icon 
              name={loading ? "hourglass-empty" : "refresh"} 
              size={24} 
              color={colors.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Карта через WebView */}
      <View style={styles.mapContainer}>
        <WebViewMap
          markers={mapMarkers}
          onMarkerPress={handleMarkerPress}
          userLocation={userLocation}
          showsUserLocation={true}
          initialRegion={initialRegion}
          style={styles.map}
        />
        
        {/* Контрольні кнопки */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.card }]}
            onPress={handleGoToUserLocation}
            accessibilityLabel={t('map.goToMyLocation') || 'Перейти до моєї позиції'}
          >
            <Icon name="my-location" size={24} color={colors.primary} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.card }]}
            onPress={handleAddViolation}
            accessibilityLabel={t('map.addViolation') || 'Додати правопорушення'}
          >
            <Icon name="add-location" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading overlay */}
      <LoadingSpinner
        visible={loading}
        overlay={true}
        text={t('map.loading') || 'Завантаження даних...'}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
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
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
  },
  refreshButton: {
    padding: 8,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapControls: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 12,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});

export default MapScreen;