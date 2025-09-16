// src/navigation/MainNavigator.js
import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useThemeColors } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import MainTabScreen from '../screens/main/MainTabScreen'; 
import ViolationsListScreen from '../screens/violations/ViolationsListScreen';
import ViolationDetailScreen from '../screens/violations/ViolationDetailScreen';
import AddViolationScreen from '../screens/violations/AddViolationScreen';
import CalendarScreen from '../screens/calendar/CalendarScreen';
import DrawerNavigator from '../components/navigation/DrawerNavigator';
import SettingsScreen from '../screens/main/SettingsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';

// Створення Drawer навігатора
const Drawer = createDrawerNavigator();

const MainNavigator = () => {
  const { colors, isDark } = useThemeColors();
  const { user, logout } = useAuth();

  // Стан для drawer (він залишається тут)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  // Налаштування теми для drawer
  const drawerTheme = {
    drawerStyle: {
      backgroundColor: colors.card,
      width: '80%',
    },
    drawerActiveBackgroundColor: colors.primary + '20',
    drawerActiveTintColor: colors.primary,
    drawerInactiveTintColor: colors.text,
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <DrawerNavigator 
          {...props}
          user={user}
          onLogout={logout}
          isDarkTheme={isDark}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
        />
      )}
      screenOptions={{
        ...drawerTheme,
        headerShown: false,
        swipeEnabled: true,
        drawerType: 'front',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        sceneContainerStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      {/* Головний екран з табами */}
      <Drawer.Screen
        name="MainTabs"
        component={MainTabScreen}
        options={{
          title: 'Головна',
          drawerIcon: ({ color, size }) => (
            <Icon name="home" size={size} color={color} />
          ),
        }}
      />

      {/* Екрани порушень */}
      <Drawer.Screen
        name="ViolationsList"
        component={ViolationsListScreen}
        options={{
          title: 'Список правопорушень',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="ViolationDetail"
        component={ViolationDetailScreen}
        options={{
          title: 'Деталі порушення',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="AddViolation"
        component={AddViolationScreen}
        options={{
          title: 'Додати порушення',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: 'Календар',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: 'Календар',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Профіль',
          drawerItemStyle: { display: 'none' },
        }}
      />

      <Drawer.Screen
        name="ProfileEdit"
        component={EditProfileScreen}
        options={{
          title: 'Профіль',
          drawerItemStyle: { display: 'none' },
        }}
      />
      
    </Drawer.Navigator>
  );
};

export default MainNavigator;