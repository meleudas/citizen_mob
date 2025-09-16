// src/screens/map/MapScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MapViewComponent from '../../components/maps/MapView';
import MapMarker from '../../components/maps/MapMarker';
import { useAppTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useViolations } from '../../hooks/useViolations';
import * as Location from 'expo-location';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';

const MapScreen = () => {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const { violations, loading, error, getViolations } = useViolations();
  
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [mapMarkers, setMapMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: 50.4501,
    longitude: 30.5234,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  
  const mapViewRef = useRef(null);

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
        setLocationPermission(true);
        getCurrentLocation();
      } else {
        setLocationPermission(false);
        Alert.alert(
          t('map.locationPermissionTitle') || 'Доступ до геолокації',
          t('map.locationPermissionMessage') || 'Для повноцінної роботи карти необхідний доступ до геолокації',
          [
            { text: t('common.ok') || 'OK' },
            {
              text: t('map.openSettings') || 'Налаштування',
              onPress: () => Location.openSettingsAsync()
            }
          ]
        );
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
      setMapRegion({
        latitude,
        longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (err) {
      console.error('Error getting current location:', err);
      Alert.alert(
        t('map.locationErrorTitle') || 'Помилка геолокації',
        t('map.locationErrorMessage') || 'Не вдалося отримати вашу поточну позицію',
        [{ text: t('common.ok') || 'OK' }]
      );
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
    
    // Анімація карти до маркера
    if (mapViewRef.current) {
       mapViewRef.current.animateToRegion({
        ...marker.coordinate,
         latitudeDelta: mapRegion.latitudeDelta,
        longitudeDelta: mapRegion.longitudeDelta,
       }, 500);
    }
  };

  // Обробка кліку по карті
  const handleMapPress = () => {
    setSelectedMarker(null);
  };

  // Обробка зміни регіону карти
  const handleRegionChange = (region) => {
    setMapRegion(region);
  };

  // Обробка кліку по callout
  const handleCalloutPress = (marker) => {
    if (marker.violationData) {
      navigation.navigate('ViolationDetail', { id: marker.violationData.id });
    }
  };

  // Обробка оновлення даних
  const handleRefresh = () => {
    loadViolations();
  };

  // Обробка переходу до поточної позиції
  const handleGoToUserLocation = () => {
    if (userLocation) {
      setMapRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
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

      {/* Карта */}
      <View style={styles.mapContainer}>
        <MapViewComponent
          ref={mapViewRef}
          markers={mapMarkers}
          onMarkerPress={handleMarkerPress}
          onMapPress={handleMapPress}
          onRegionChange={handleRegionChange}
          userLocation={userLocation}
          showsUserLocation={true}
          region={mapRegion}
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

      {/* Інформація про вибраний маркер */}
      {selectedMarker && (
        <View style={[styles.markerInfo, { backgroundColor: colors.card }]}>
          <View style={styles.markerInfoHeader}>
            <Text style={[styles.markerInfoTitle, { color: colors.text }]} numberOfLines={1}>
              {selectedMarker.title}
            </Text>
            <TouchableOpacity onPress={() => setSelectedMarker(null)}>
              <Icon name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.markerInfoCategory, { color: colors.textSecondary }]}>
            {selectedMarker.description}
          </Text>
          
          <View style={styles.markerInfoActions}>
            <Button
              title={t('map.viewDetails') || 'Деталі'}
              onPress={() => handleCalloutPress(selectedMarker)}
              variant="primary"
              size="small"
            />
          </View>
        </View>
      )}

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
  markerInfo: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 12,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.25)',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  markerInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  markerInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  markerInfoCategory: {
    fontSize: 14,
    marginBottom: 16,
  },
  markerInfoActions: {
    alignSelf: 'flex-start',
  },
});

export default MapScreen;