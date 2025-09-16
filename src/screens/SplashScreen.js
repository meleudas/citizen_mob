// src/screens/SplashScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Custom hooks
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useLanguage } from '../hooks/useLanguage';
import { useSync } from '../hooks/useSync';
import { useNetwork } from '../hooks/useNetwork';

// Common components
import LoadingSpinner from '../components/common/LoadingSpinner';

const SplashScreen = () => {
  const navigation = useNavigation();
  const { checkAuthStatus, isAuthenticated, user, loading: authLoading } = useAuth();
  const { initializeTheme, colors, isDark } = useTheme();
  const { initializeLanguage, language } = useLanguage();
  const { checkSyncStatus, syncStatus } = useSync();
  const { isOnline, connectionType } = useNetwork();
  
  // Local state
  const [loading, setLoading] = useState(true);
  const [initializationProgress, setInitializationProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // Animation refs
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  
  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);
  
  const initializeApp = async () => {
    try {
      // Minimum splash screen time (1-2 seconds)
      const minimumSplashTime = 1500;
      const startTime = Date.now();
      
      // Animate logo entrance
      animateLogoEntrance();
      
      // Step 1: Initialize theme and language (20%)
      await updateProgress(20, 'Initializing theme and language...');
      await Promise.all([
        initializeTheme(),
        initializeLanguage(),
      ]);
      
      // Step 2: Check authentication status (40%)
      await updateProgress(40, 'Checking authentication...');
      await checkAuthStatus();
      
      // Step 3: Load settings and preferences (60%)
      await updateProgress(60, 'Loading settings...');
      await loadSettings();
      
      // Step 4: Check network and sync status (80%)
      await updateProgress(80, 'Checking network and sync status...');
      await Promise.all([
        checkSyncStatus(),
        checkNetworkStatus(),
      ]);
      
      // Ensure minimum splash time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minimumSplashTime - elapsedTime);
      
      if (remainingTime > 0) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      // Final step: Navigate (100%)
      await updateProgress(100, 'Ready...');
      
      // Navigate to appropriate screen
      setTimeout(navigateToAppropriateScreen, 300);
      
    } catch (err) {
      console.error('App initialization error:', err);
      setError(err.message || 'Failed to initialize application');
      
      Alert.alert(
        'Initialization Error',
        err.message || 'Failed to initialize application. Please restart the app.',
        [
          {
            text: 'Retry',
            onPress: initializeApp,
          },
          {
            text: 'Exit',
            onPress: () => {
              // Exit app (platform specific)
              Alert.alert('Please restart the application');
            },
          },
        ]
      );
    }
  };
  
  const updateProgress = async (percentage, message) => {
    setInitializationProgress(percentage);
    
    // Animate progress bar
    Animated.timing(progressWidth, {
      toValue: percentage,
      duration: 300,
      useNativeDriver: false,
    }).start();
    
    // Update loading message
    if (message) {
      console.log(`Initialization: ${message}`);
    }
  };
  
  const animateLogoEntrance = () => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animate text entrance after logo
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    });
  };
  
  const loadSettings = async () => {
    // Load user preferences, theme settings, etc.
    // This could include:
    // - Last used filters
    // - Notification preferences
    // - Accessibility settings
    // - Cache cleanup
    
    console.log('Loading user settings...');
    
    // Simulate settings loading
    await new Promise(resolve => setTimeout(resolve, 200));
  };
  
  const checkNetworkStatus = async () => {
    // Check network connectivity and prepare for offline mode
    console.log('Checking network status...');
    
    if (!isOnline) {
      console.log('Offline mode detected');
    }
  };
  
  const navigateToAppropriateScreen = () => {
    if (isAuthenticated && user) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      });
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }
  };
  
  // Format progress percentage for accessibility
  const getProgressText = () => {
    return `Application initialization progress: ${initializationProgress}%`;
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Animated Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoScale }],
            opacity: logoOpacity,
          },
        ]}
        accessibilityLabel="App logo"
        accessibilityRole="image"
      >
        <Text style={[styles.logo, { color: colors.primary }]}>
          🛡️
        </Text>
      </Animated.View>
      
      {/* App Name */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: textOpacity,
          },
        ]}
      >
        <Text 
          style={[styles.appName, { color: colors.text }]}
          accessibilityLabel="Законослухняний громадянин"
        >
          Законослухняний громадянин
        </Text>
        <Text 
          style={[styles.subtitle, { color: colors.textSecondary }]}
          accessibilityLabel="Додаток для фіксації правопорушень"
        >
          Додаток для фіксації правопорушень
        </Text>
      </Animated.View>
      
      {/* Progress Section */}
      <View style={styles.progressContainer}>
        {/* Progress Bar */}
        <View style={[styles.progressBarBackground, { backgroundColor: colors.inputBackground }]}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: progressWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
        
        {/* Progress Text */}
        <Text 
          style={[styles.progressText, { color: colors.textSecondary }]}
          accessibilityLabel={getProgressText()}
        >
          {initializationProgress}%
        </Text>
      </View>
      
      {/* Loading Spinner */}
      <View style={styles.spinnerContainer}>
        <LoadingSpinner 
          visible={true} 
          size="large" 
          color={colors.primary}
          accessibilityLabel="Loading application"
        />
      </View>
      
      {/* Status Messages */}
      {error && (
        <View style={[styles.statusContainer, { backgroundColor: colors.error + '20' }]}>
          <Text style={[styles.statusText, { color: colors.error }]}>
            {error}
          </Text>
        </View>
      )}
      
      {/* Accessibility Announcement */}
      <View 
        accessible={true}
        accessibilityLabel={`Welcome to Law-Abiding Citizen app. ${getProgressText()}`}
        accessibilityRole="header"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  logoContainer: {
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 20,
    textAlign: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
    // Видалено Platform.select - залишив стандартний шрифт
    fontFamily: 'System',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    // Видалено Platform.select - залишив стандартний шрифт
    fontFamily: 'System',
  },
  progressContainer: {
    width: '80%',
    marginBottom: 30,
    alignItems: 'center',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  spinnerContainer: {
    marginBottom: 20,
  },
  statusContainer: {
    padding: 16,
    borderRadius: 8,
    marginHorizontal: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  versionText: {
    position: 'absolute',
    bottom: 30,
    fontSize: 12,
    // Видалено Platform.select - залишив стандартний шрифт
    fontFamily: 'System',
  },
});

export default SplashScreen;