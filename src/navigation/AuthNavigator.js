// src/navigation/AuthNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppTheme } from '../hooks/useTheme';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';

// Створення Stack навігатора
const Stack = createStackNavigator();

// Налаштування анімацій для плавних переходів
const screenOptions = {
  headerShown: false,
  cardStyle: { 
    backgroundColor: 'transparent',
    opacity: 1,
  },
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  animationEnabled: true,
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: 300,
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: 300,
      },
    },
  },
  cardStyleInterpolator: ({ current, layouts }) => {
    return {
      cardStyle: {
        transform: [
          {
            translateX: current.progress.interpolate({
              inputRange: [0, 1],
              outputRange: [layouts.screen.width, 0],
            }),
          },
        ],
      },
    };
  },
};

// Accessibility налаштування
const accessibilityOptions = {
  animationTypeForReplace: 'push',
  detachPreviousScreen: false,
};

const AuthNavigator = () => {
  const { colors } = useAppTheme();

  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        ...screenOptions,
        cardStyle: { 
          backgroundColor: colors.background,
        },
      }}
      accessibilityState={accessibilityOptions}
    >
      {/* Welcome Screen */}
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
        options={{
          headerShown: false,
          accessibilityLabel: "Екран привітання",
          accessibilityHint: "Ласкаво просимо до додатку Законослухняний громадянин",
        }}
      />
      
      {/* Login Screen */}
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{
          headerShown: false,
          accessibilityLabel: "Екран входу",
          accessibilityHint: "Введіть ваші облікові дані для входу",
        }}
      />
      
      {/* Register Screen */}
      <Stack.Screen 
        name="Register" 
        component={RegisterScreen}
        options={{
          headerShown: false,
          accessibilityLabel: "Екран реєстрації",
          accessibilityHint: "Створіть новий обліковий запис",
        }}
      />
      
      {/* Forgot Password Screen */}
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{
          headerShown: false,
          accessibilityLabel: "Екран відновлення пароля",
          accessibilityHint: "Введіть ваш email для відновлення пароля",
        }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;