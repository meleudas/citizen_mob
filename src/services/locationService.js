// locationService.js

class LocationService {
  constructor() {
    this.watchId = null;
    this.isWatching = false;
  }

  // 1. Перевірка та запит дозволів
  async checkPermissions() {
    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      // Для сучасних браузерів з Permissions API
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        return {
          success: true,
          state: permission.state,
          message: `Permission state: ${permission.state}`
        };
      }

      return {
        success: true,
        state: 'unknown',
        message: 'Permissions API not available'
      };
    } catch (error) {
      return {
        success: false,
        state: 'denied',
        error: error.message || 'Failed to check permissions'
      };
    }
  }

  async requestPermissions() {
    try {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve({
            success: false,
            error: 'Geolocation is not supported'
          });
          return;
        }

        // Простий запит позиції для отримання дозволу
        navigator.geolocation.getCurrentPosition(
          () => {
            resolve({
              success: true,
              message: 'Permission granted'
            });
          },
          (error) => {
            resolve({
              success: false,
              error: this.getPermissionErrorMessage(error)
            });
          },
          { timeout: 10000 }
        );
      });
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to request permissions'
      };
    }
  }

  // 2. Отримання поточної локації
  getCurrentPosition(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000,
      ...options
    };

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({
          success: false,
          error: 'Geolocation is not supported by this browser'
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const standardizedPosition = this.standardizePosition(position);
          resolve({
            success: true,
            data: standardizedPosition,
            message: 'Current position retrieved successfully'
          });
        },
        (error) => {
          resolve({
            success: false,
            error: this.getErrorMessage(error),
            code: error.code
          });
        },
        defaultOptions
      );
    });
  }

  // 3. Watch позиції (відстеження переміщень)
  watchPosition(callback, options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 60000,
      ...options
    };

    if (!navigator.geolocation) {
      callback({
        success: false,
        error: 'Geolocation is not supported by this browser'
      });
      return null;
    }

    if (this.isWatching) {
      this.clearWatch();
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const standardizedPosition = this.standardizePosition(position);
        callback({
          success: true,
          data: standardizedPosition,
          message: 'Position updated'
        });
      },
      (error) => {
        callback({
          success: false,
          error: this.getErrorMessage(error),
          code: error.code
        });
      },
      defaultOptions
    );

    this.isWatching = true;
    return this.watchId;
  }

  clearWatch() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
      this.isWatching = false;
    }
  }

  isWatchingPosition() {
    return this.isWatching;
  }

  // 4. Reverse geocode (координати → адреса)
  async reverseGeocode(latitude, longitude, options = {}) {
    try {
      // Якщо є API для геокодування (наприклад, Google Maps, OpenStreetMap)
      // Це приклад для OpenStreetMap Nominatim
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'YourApp/1.0' // Деякі API вимагають User-Agent
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        data: {
          address: data.display_name,
          components: data.address,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        },
        message: 'Reverse geocoding successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to reverse geocode',
        data: {
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        }
      };
    }
  }

  // 5. Geocode (адреса → координати)
  async geocode(address) {
    try {
      // Приклад для OpenStreetMap Nominatim
      const encodedAddress = encodeURIComponent(address);
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'YourApp/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.length === 0) {
        throw new Error('No results found');
      }

      const result = data[0];
      
      return {
        success: true,
        data: {
          address: result.display_name,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
          boundingBox: result.boundingbox
        },
        message: 'Geocoding successful'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to geocode address'
      };
    }
  }

  // 6. Обчислення відстаней
  calculateDistance(lat1, lon1, lat2, lon2, unit = 'km') {
    try {
      const R = unit === 'km' ? 6371 : unit === 'mi' ? 3959 : 6371; // Радіус Землі
      const dLat = this.toRadians(lat2 - lat1);
      const dLon = this.toRadians(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return {
        success: true,
        data: {
          distance: distance,
          unit: unit,
          from: { latitude: lat1, longitude: lon1 },
          to: { latitude: lat2, longitude: lon2 }
        },
        message: 'Distance calculated successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to calculate distance'
      };
    }
  }

  // Допоміжні методи
  standardizePosition(position) {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    };
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  getErrorMessage(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'User denied the request for Geolocation';
      case error.POSITION_UNAVAILABLE:
        return 'Location information is unavailable';
      case error.TIMEOUT:
        return 'The request to get user location timed out';
      default:
        return 'An unknown error occurred';
    }
  }

  getPermissionErrorMessage(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied';
      case error.POSITION_UNAVAILABLE:
        return 'Location unavailable';
      case error.TIMEOUT:
        return 'Location request timeout';
      default:
        return 'Location permission error';
    }
  }

  // Форматування координат
  formatCoordinates(latitude, longitude, precision = 6) {
    return {
      latitude: parseFloat(latitude.toFixed(precision)),
      longitude: parseFloat(longitude.toFixed(precision))
    };
  }

  // Перевірка валідності координат
  isValidCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }
}

// Експортуємо екземпляр сервісу
const locationService = new LocationService();

export default locationService;

// Експортуємо окремі функції для зручності
export const {
  checkPermissions,
  requestPermissions,
  getCurrentPosition,
  watchPosition,
  clearWatch,
  isWatchingPosition,
  reverseGeocode,
  geocode,
  calculateDistance,
  formatCoordinates,
  isValidCoordinates
} = locationService;