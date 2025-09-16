// src/components/navigation/StackNavigator.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  StatusBar,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';

const StackNavigator = ({
  // Основні пропси
  screens = [],
  currentScreen,
  onNavigate,
  onGoBack,
  
  // Header налаштування
  showHeader = true,
  headerStyle,
  headerTitleStyle,
  headerTintColor,
  headerBackTitle = 'Назад',
  
  // Accessibility
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const { colors } = useAppTheme();
  const currentScreenData = screens.find(screen => screen.key === currentScreen);

  // Рендер кнопки назад
  const renderBackButton = () => {
    if (!onGoBack || !currentScreenData?.canGoBack) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.backButton}
        onPress={onGoBack}
        accessibilityLabel="Повернутися назад"
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <Text style={[
          styles.backButtonText,
          { color: headerTintColor || colors.primary }
        ]}>
          ←
        </Text>
      </TouchableOpacity>
    );
  };

  // Рендер header
  const renderHeader = () => {
    if (!showHeader) return null;

    const headerTitle = currentScreenData?.headerTitle || currentScreenData?.title || '';

    return (
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={[
          styles.header,
          { 
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
          headerStyle,
        ]}>
          {renderBackButton()}
          
          <Text style={[
            styles.headerTitle,
            { color: colors.text },
            headerTitleStyle,
          ]} 
          numberOfLines={1}>
            {headerTitle}
          </Text>
          
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>
    );
  };

  // Рендер контенту екрану
  const renderScreenContent = () => {
    if (!currentScreenData) {
      return (
        <View style={styles.screenContainer}>
          <Text style={{ color: colors.text }}>
            Екран не знайдено
          </Text>
        </View>
      );
    }

    return currentScreenData.component;
  };

  return (
    <View 
      style={styles.container}
      testID={testID}
      accessibilityLabel={accessibilityLabel || "Стекова навігація"}
      accessibilityRole="navigation"
      {...restProps}
    >
      {renderHeader()}
      
      <View style={styles.content}>
        {renderScreenContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSafeArea: {
    ...Platform.select({
      android: {
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
    }),
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerRight: {
    width: 40, // Для балансу з кнопкою назад
  },
  content: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default StackNavigator; 