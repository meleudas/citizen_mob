// src/screens/map/MapScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MapViewComponent from '../../components/maps/MapView';
import MapMarker from '../../components/maps/MapMarker';
import { useAppTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useViolations } from '../../hooks/useViolations';
import { useLocation } from '../../hooks/useLocation';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Button from '../../components/common/Button';

const MapScreen = () => {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const { violations, loading: violationsLoading, error: violationsError, getViolations } = useViolations();
  const { 
    location: userLocation, 
    loading: locationLoading, 
    error: locationError, 
    permission,
    getCurrentLocation,
    requestPermission 
  } = useLocation();
  
  const [mapMarkers, setMapMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [clusterMarkers, setClusterMarkers] = useState([]); // Для зберігання маркерів в кластері
  const [showClusterModal, setShowClusterModal] = useState(false); // Для показу модального вікна кластера
  const [mapRegion, setMapRegion] = useState({
    latitude: 50.4501,
    longitude: 30.5234,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });
  
  const mapViewRef = useRef(null);
  const loading = violationsLoading || locationLoading;

  // Завантаження правопорушень при монтуванні
  useEffect(() => {
    loadViolations();
    requestLocationPermission();
  }, []);

  // Налагодження - вивід даних
  useEffect(() => {
    console.log('Violations ', violations);
    console.log('Violations count:', violations?.length);
  }, [violations]);

  useEffect(() => {
    console.log('Map markers:', mapMarkers);
    console.log('Map markers count:', mapMarkers.length);
  }, [mapMarkers]);

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
      const result = await requestPermission();
      
      if (result.success) {
        getCurrentLocationWithCentering();
      } 
    } catch (err) {
      console.error('Error requesting location permission:', err);
    }
  };

  // Отримання поточної позиції з центруванням карти
  const getCurrentLocationWithCentering = async () => {
    try {
      const result = await getCurrentLocation({
        accuracy: 6, // High accuracy
        timeout: 10000,
        maximumAge: 60000
      });
      
      if (result.success && result.data) {
        // Центрування карти на поточній позиції
        setMapRegion({
          latitude: result.data.latitude,
          longitude: result.data.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (err) {
      console.error('Error getting current location:', err);
      Alert.alert(
        t('map.locationErrorTitle') || 'Помилка геолокації',
        t('map.locationErrorMessage') || 'Не вдалося отримати вашу поточну позицію',
        [{ text: t('common.ok') || 'OK' }]
      );
    }
  };

  // Функція для отримання координат з різних форматів
  const getLocationFromViolation = (violation) => {
    console.log('Parsing location for violation:', violation);
    
    try {
      // Формат GeoJSON: location.coordinates = [longitude, latitude]
      if (violation.location && 
          violation.location.coordinates && 
          Array.isArray(violation.location.coordinates) && 
          violation.location.coordinates.length >= 2) {
        const latitude = parseFloat(violation.location.coordinates[1]);
        const longitude = parseFloat(violation.location.coordinates[0]);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          return { latitude, longitude };
        }
      }
      
      // Формат 1: location object
      if (violation.location && violation.location.latitude && violation.location.longitude) {
        const latitude = parseFloat(violation.location.latitude);
        const longitude = parseFloat(violation.location.longitude);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          return { latitude, longitude };
        }
      }
      
      // Формат 2: окремі поля latitude/longitude
      if (violation.latitude && violation.longitude) {
        const latitude = parseFloat(violation.latitude);
        const longitude = parseFloat(violation.longitude);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          return { latitude, longitude };
        }
      }
      
      // Формат 3: координати в полі location як масив [longitude, latitude]
      if (violation.location && Array.isArray(violation.location) && violation.location.length === 2) {
        const latitude = parseFloat(violation.location[1]);
        const longitude = parseFloat(violation.location[0]);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          return { latitude, longitude };
        }
      }
      
      // Формат 4: координати в полі coordinates
      if (violation.coordinates && violation.coordinates.latitude && violation.coordinates.longitude) {
        const latitude = parseFloat(violation.coordinates.latitude);
        const longitude = parseFloat(violation.coordinates.longitude);
        
        if (!isNaN(latitude) && !isNaN(longitude)) {
          return { latitude, longitude };
        }
      }
    } catch (error) {
      console.error('Error parsing location:', error);
    }
    
    console.log('No valid location found for violation');
    return null;
  };

  // Функція для кластеризації маркерів
  const performClustering = (markers, radius = 0.0005) => { // ~50 метрів
    if (!markers || markers.length === 0) return [];
    
    const clustered = [];
    const processed = new Set();
    
    markers.forEach((marker, index) => {
      if (processed.has(index)) return;
      
      const nearbyMarkers = [marker];
      
      // Знаходимо маркери в радіусі
      markers.forEach((otherMarker, otherIndex) => {
        if (processed.has(otherIndex) || index === otherIndex) return;
        
        // Розрахунок відстані між маркерами (проста евклідова відстань)
        const distance = Math.sqrt(
          Math.pow(marker.coordinate.latitude - otherMarker.coordinate.latitude, 2) +
          Math.pow(marker.coordinate.longitude - otherMarker.coordinate.longitude, 2)
        );
        
        if (distance <= radius) {
          nearbyMarkers.push(otherMarker);
          processed.add(otherIndex);
        }
      });
      
      processed.add(index);
      
      // Якщо знайдено кілька маркерів, створюємо кластер
      if (nearbyMarkers.length > 1) {
        const avgLat = nearbyMarkers.reduce((sum, m) => sum + m.coordinate.latitude, 0) / nearbyMarkers.length;
        const avgLng = nearbyMarkers.reduce((sum, m) => sum + m.coordinate.longitude, 0) / nearbyMarkers.length;
        
        clustered.push({
          id: `cluster_${index}`,
          coordinate: { latitude: avgLat, longitude: avgLng },
          title: `${nearbyMarkers.length} правопорушень`,
          description: 'Група правопорушень',
          category: 'cluster',
          isCluster: true,
          markers: nearbyMarkers,
          count: nearbyMarkers.length
        });
      } else {
        clustered.push(marker);
      }
    });
    
    return clustered;
  };

  // Форматування категорій для маркерів
  const getCategoryKey = (categoryName) => {
    if (!categoryName) return 'other';
    
    const categoryMap = {
      'Паркування': 'parking',
      'Сміття': 'trash',
      'Шум': 'noise',
      'Порушення правил дорожнього руху': 'traffic',
      'Вандалізм': 'vandalism',
      'Безпека громадських місць': 'public_safety',
      'Інфраструктура': 'infrastructure',
      'Навколишнє середовище': 'environment',
      'Інше': 'other',
      'Parking': 'parking',
      'Trash': 'trash',
      'Noise': 'noise',
      'Traffic violation': 'traffic',
      'Vandalism': 'vandalism',
      'Public safety': 'public_safety',
      'Infrastructure': 'infrastructure',
      'Environment': 'environment',
      'Other': 'other'
    };
    
    // Спробуємо знайти категорію в мапі
    const foundKey = categoryMap[categoryName];
    if (foundKey) {
      return foundKey;
    }
    
    // Якщо не знайшли, перевіряємо чи вже є ключем
    const validKeys = ['parking', 'trash', 'noise', 'traffic', 'vandalism', 'public_safety', 'infrastructure', 'environment', 'other'];
    if (validKeys.includes(categoryName.toLowerCase())) {
      return categoryName.toLowerCase();
    }
    
    // За замовчуванням
    return 'other';
  };

  // Підготовка маркерів для карти у форматі, сумісному з WebView
  const prepareMarkersForWebView = () => {
    if (!mapMarkers || mapMarkers.length === 0) return [];
    
    return mapMarkers
      .filter(marker => marker && marker.coordinate) // Додаткова перевірка
      .map(marker => ({
        id: marker.id,
        latitude: marker.coordinate.latitude,
        longitude: marker.coordinate.longitude,
        title: marker.title,
        description: marker.description,
        category: marker.category,
        isCluster: marker.isCluster,
        count: marker.count,
        // Додаємо markers для кластерів
        markers: marker.isCluster ? marker.markers : undefined
      }));
  };

  // Підготовка маркерів для карти
  useEffect(() => {
    if (violations && Array.isArray(violations) && violations.length > 0) {
      console.log('Processing violations:', violations);
      
      const markers = violations
        .map((violation, index) => {
          const location = getLocationFromViolation(violation);
          
          if (!location) {
            console.log('Invalid location for violation:', violation);
            return null;
          }
          
          const marker = {
            id: violation.id || violation._id || `marker_${index}`,
            coordinate: location,
            title: violation.description || violation.title || t('map.noDescription') || 'Без опису',
            description: violation.category || '',
            category: getCategoryKey(violation.category),
            violationData: violation,
          };
          
          console.log('Created marker:', marker);
          return marker;
        })
        .filter(marker => marker !== null && marker.coordinate); // Додаткова перевірка на coordinate
      
      // Застосовуємо кластеризацію
      const clusteredMarkersResult = performClustering(markers);
      console.log('Final clustered markers array:', clusteredMarkersResult);
      setMapMarkers(clusteredMarkersResult);
    } else {
      console.log('No valid violations data or empty array');
      setMapMarkers([]);
    }
  }, [violations]);

  // Обробка кліку по маркеру
  const handleMarkerPress = (marker) => {
    console.log('Marker pressed:', marker);
    
    if (marker.isCluster) {
      // Якщо це кластер, показуємо модальне вікно зі списком
      // Використовуємо markers з переданих даних
      const markersToShow = marker.markers || [];
      setClusterMarkers(markersToShow);
      setShowClusterModal(true);
      console.log('Cluster markers to show:', markersToShow);
    } else {
      // Якщо це окремий маркер, переходимо до деталей
      setSelectedMarker(marker);
      if (marker.id) {
        navigation.navigate('ViolationDetail', { id: marker.id});;
      } else {
        console.error('No violation data found in marker for navigation');
      }
    }
    
    // Анімація карти до маркера
    if (mapViewRef.current && marker && marker.coordinate) {
       mapViewRef.current.animateToRegion({
        latitude: marker.coordinate.latitude,
        longitude: marker.coordinate.longitude,
        latitudeDelta: mapRegion.latitudeDelta,
        longitudeDelta: mapRegion.longitudeDelta,
       }, 500);
    }
  };

  // Обробка кліку по карті
  const handleMapPress = () => {
    setSelectedMarker(null);
    setShowClusterModal(false);
  };

  // Обробка зміни регіону карти
  const handleRegionChange = (region) => {
    setMapRegion(region);
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
      getCurrentLocationWithCentering();
    }
  };

  // Обробка додавання нового правопорушення
  const handleAddViolation = () => {
    navigation.navigate('MainTabs', { screen: 'add' });
  };

  // Обробка кліку по елементу в модальному вікні кластера
  const handleClusterItemPress = (marker) => {
    setShowClusterModal(false);
    if (marker.violationData) {
      navigation.navigate('ViolationDetail', { id: marker.violationData.id });
    }
  };

  // Підготовка маркерів для WebView
  const webViewMarkers = prepareMarkersForWebView();


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
          markers={webViewMarkers} // Передаємо маркери у форматі для WebView
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

      {/* Модальне вікно для кластера */}
      <Modal
        visible={showClusterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowClusterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Правопорушення в цій зоні ({clusterMarkers.length})
              </Text>
              <TouchableOpacity onPress={() => setShowClusterModal(false)}>
                <Icon name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.clusterList}>
              {clusterMarkers.length > 0 ? (
                clusterMarkers.map((marker, index) => (
                  <TouchableOpacity
                    key={marker.id}
                    style={[styles.clusterItem, { borderBottomColor: colors.border }]}
                    onPress={() => handleClusterItemPress(marker)}
                  >
                    <Text style={[styles.clusterItemTitle, { color: colors.text }]} numberOfLines={1}>
                      {marker.title}
                    </Text>
                    <Text style={[styles.clusterItemCategory, { color: colors.textSecondary }]}>
                      {marker.description}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCluster}>
                  <Text style={[styles.emptyClusterText, { color: colors.textSecondary }]}>
                    Немає правопорушень
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    minHeight: 200,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  clusterList: {
    flex: 1,
  },
  clusterItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  clusterItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  clusterItemCategory: {
    fontSize: 14,
  },
  emptyCluster: {
    padding: 20,
    alignItems: 'center',
  },
  emptyClusterText: {
    fontSize: 16,
  },
});

export default MapScreen;