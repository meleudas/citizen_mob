// src/screens/main/MainTabScreen.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAppTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import your tab screens
import HomeScreen from './HomeScreen';
import MapScreen from '../map/MapScreen';
import CalendarScreen from '../calendar/CalendarScreen';
import AddViolationScreen from '../violations/AddViolationScreen';
import ProfileScreen from '../profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const MainTabScreen = ({ navigation, route }) => {
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const { isGuest } = useAuth();

  // Handle deep linking and initial route
  React.useEffect(() => {
    if (route.params?.openAddViolation) {
      navigation.navigate('add');
    }
  }, [route.params?.openAddViolation]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* Home Tab */}
      <Tab.Screen
        name="home"
        component={HomeScreen}
        options={{
          title: t('tabs.home') || 'Головна',
          tabBarIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Map Tab */}
      <Tab.Screen
        name="map"
        component={MapScreen}
        options={{
          title: t('tabs.map') || 'Карта',
          tabBarIcon: ({ color, size }) => (
            <Icon name="map" size={size} color={color} />
          ),
        }}
      />

      {/* Add Violation Tab - відображається тільки для зареєстрованих користувачів */}
      {!isGuest && (
        <Tab.Screen
          name="add"
          component={AddViolationScreen}
          options={{
            title: t('tabs.add') || 'Додати',
            tabBarIcon: ({ color, size }) => (
              <Icon name="add-circle" size={size} color={color} />
            ),
          }}
        />
      )}

      {/* Calendar Tab */}
      <Tab.Screen
        name="calendar"
        component={CalendarScreen}
        options={{
          title: t('tabs.calendar') || 'Календар',
          tabBarIcon: ({ color, size }) => (
            <Icon name="calendar-today" size={size} color={color} />
          ),
        }}
      />

      {/* Profile Tab */}
      <Tab.Screen
        name="profile"
        component={ProfileScreen}
        options={{
          title: t('tabs.profile') || 'Профіль',
          tabBarIcon: ({ color, size }) => (
            <Icon name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabScreen;