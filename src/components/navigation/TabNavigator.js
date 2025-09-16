// src/components/navigation/TabNavigator.js
import React from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';

const TabNavigator = ({
  // Основні пропси
  activeTab,
  onTabPress,
  
  // Таби
  tabs = [
    { key: 'calendar', title: 'Календар', icon: null },
    { key: 'map', title: 'Карта', icon: null },
    { key: 'add', title: 'Додати', icon: null },
  ],
  
  // Стилізація
  style,
  tabStyle,
  activeTabStyle,
  textStyle,
  activeTextStyle,
  iconStyle,
  activeIconStyle,
  
  // Accessibility
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const { colors } = useAppTheme();

  // Рендер іконки табу
  const renderTabIcon = (tab, isActive) => {
    if (!tab.icon) {
      // Дефолтні іконки у вигляді емоджі (можна замінити на реальні іконки)
      const defaultIcons = {
        calendar: '📅',
        map: '🗺️',
        add: '➕',
      };
      
      return (
        <Text style={[
          styles.defaultIcon,
          isActive ? activeIconStyle : iconStyle,
          { color: isActive ? colors.primary : colors.textSecondary }
        ]}>
          {defaultIcons[tab.key] || '🔘'}
        </Text>
      );
    }
    
    // Кастомна іконка
    return React.cloneElement(tab.icon, {
      style: [
        tab.icon.props.style,
        styles.icon,
        isActive ? [activeIconStyle, { color: colors.primary }] : [iconStyle, { color: colors.textSecondary }]
      ],
    });
  };

  // Рендер табу
  const renderTab = (tab) => {
    const isActive = activeTab === tab.key;
    
    return (
      <TouchableOpacity
        key={tab.key}
        style={[
          styles.tab,
          tabStyle,
          isActive && [styles.activeTab, activeTabStyle],
        ]}
        onPress={() => onTabPress(tab.key)}
        accessibilityLabel={`${tab.title} таб`}
        accessibilityRole="tab"
        accessibilityState={{ selected: isActive }}
        activeOpacity={0.7}
      >
        {renderTabIcon(tab, isActive)}
        <Text style={[
          styles.tabText,
          { color: colors.textSecondary },
          textStyle,
          isActive && [{ color: colors.primary }, activeTextStyle],
        ]}>
          {tab.title}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card }, style]}>
      <View
        style={[styles.tabContainer, { borderTopColor: colors.border }]}
        testID={testID}
        accessibilityLabel={accessibilityLabel || "Нижня навігаційна панель"}
        accessibilityRole="tablist"
        {...restProps}
      >
        {tabs.map(renderTab)}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: {
          width: 0,
          height: -2,
        },
        shadowOpacity: 0.8,
        shadowRadius: 2,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8, // Додатковий падінг для Home Indicator на iOS
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  activeTab: {
    // Додаткові стилі для активного табу, якщо потрібно
  },
  icon: {
    marginBottom: 4,
    textAlign: 'center',
  },
  defaultIcon: {
    fontSize: 20,
    marginBottom: 4,
    textAlign: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default TabNavigator;