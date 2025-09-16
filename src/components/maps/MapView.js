// src/components/maps/WebViewMap.js
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAppTheme } from '../../hooks/useTheme';

const WebViewMap = ({
  markers = [],
  onMarkerPress,
  userLocation = null,
  showsUserLocation = true,
  initialRegion = null,
  style,
}) => {
  const { colors } = useAppTheme();
  const [loading, setLoading] = useState(true);

  // Формування HTML для карти
  const generateMapHTML = () => {
    const defaultCenter = initialRegion || {
      latitude: 50.4501,
      longitude: 30.5234,
      zoom: 12
    };

    // Формування маркерів
    const markersHTML = markers.map((marker, index) => {
      const categoryColors = {
        parking: '#FF5722',
        trash: '#4CAF50',
        noise: '#FFC107',
        traffic: '#2196F3',
        vandalism: '#9C27B0',
        other: '#607D8B',
      };

      const color = categoryColors[marker.category] || categoryColors.other;
      
      return `
        var marker${index} = L.marker([${marker.coordinate.latitude}, ${marker.coordinate.longitude}], {
          title: "${marker.title || 'Правопорушення'}",
          icon: L.divIcon({
            className: 'custom-icon',
            html: '<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">${marker.isCluster ? marker.count : '!'}</div>',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(map);
        
        marker${index}.on('click', function(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'markerPress',
            marker: ${JSON.stringify({ ...marker, index })}
          }));
        });
      `;
    }).join('\n');

    // Формування маркера користувача
    const userLocationHTML = userLocation && showsUserLocation ? `
      var userMarker = L.marker([${userLocation.latitude}, ${userLocation.longitude}], {
        title: "Ваша позиція",
        icon: L.divIcon({
          className: 'user-icon',
          html: '<div style="background-color: #4CAF50; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        })
      }).addTo(map);
      
      userMarker.bindPopup("Ваша позиція").openPopup();
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <title>Карта правопорушень</title>
        
        <!-- Leaflet CSS -->
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        
        <!-- Leaflet JS -->
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        
        <style>
          body, html, #map {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          
          .custom-icon {
            background: transparent;
            border: none;
          }
          
          .leaflet-popup-content {
            margin: 10px;
            font-family: Arial, sans-serif;
          }
          
          .popup-title {
            font-weight: bold;
            margin-bottom: 5px;
            font-size: 14px;
          }
          
          .popup-description {
            font-size: 12px;
            color: #666;
          }
          
          .cluster-marker {
            background-color: #${colors.primary.replace('#', '')};
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            border: 2px solid white;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        
        <script>
          // Ініціалізація карти
          var map = L.map('map').setView([${defaultCenter.latitude}, ${defaultCenter.longitude}], ${defaultCenter.zoom || 12});
          
          // Додавання тайлів (OpenStreetMap)
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(map);
          
          // Додавання маркерів
          ${markersHTML}
          
          // Додавання маркера користувача
          ${userLocationHTML}
          
          // Обробка кліків по карті
          map.on('click', function(e) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapPress',
              coordinates: { lat: e.latlng.lat, lng: e.latlng.lng }
            }));
          });
          
          // Обробка завантаження карти
          map.on('load', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'mapLoad'
            }));
          });
        </script>
      </body>
      </html>
    `;
  };

  // Обробка повідомлень з WebView
  const handleMessage = (event) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      
      switch (message.type) {
        case 'mapLoad':
          setLoading(false);
          break;
          
        case 'markerPress':
          if (onMarkerPress) {
            onMarkerPress(message.marker);
          }
          break;
          
        case 'mapPress':
          // Обробка кліку по карті
          break;
          
        default:
          console.log('Невідоме повідомлення:', message);
      }
    } catch (error) {
      console.error('Помилка обробки повідомлення:', error);
    }
  };

  // Обробка помилок
  const handleError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('Помилка WebView:', nativeEvent);
    setLoading(false);
    Alert.alert(
      'Помилка',
      'Не вдалося завантажити карту. Перевірте підключення до інтернету.',
      [{ text: 'OK' }]
    );
  };

  // Обробка завантаження
  const handleLoad = (syntheticEvent) => {
    setLoading(false);
  };

  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Завантаження карти...
          </Text>
        </View>
      )}
      
      <WebView
        originWhitelist={['*']}
        source={{ html: generateMapHTML() }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        bounces={false}
        onLoad={handleLoad}
        onError={handleError}
        onMessage={handleMessage}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={[styles.loadingContainer, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
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
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default WebViewMap;