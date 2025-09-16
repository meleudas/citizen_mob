// src/components/navigation/DrawerNavigator.js
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch,
  Dimensions,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';
import Avatar from '../common/Avatar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

const DrawerNavigator = ({
  // Основні пропси
  isOpen = false,
  onClose,
  onNavigate,
  
  // Користувач
  user = {
    name: 'Гість',
    email: '',
    avatar: null,
  },
  isAuthenticated = false,
  
  // Пункти меню
  menuItems = [],
  
  // Тема
  isDarkTheme = false,
  onThemeToggle,
  
  // Вихід
  onLogout,
  
  // Стилі
  style,
  contentStyle,
  menuItemStyle,
  activeMenuItemStyle,
  
  // Accessibility
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const { colors } = useAppTheme();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  // Анімація відкриття/закриття
  React.useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isOpen ? 0 : -DRAWER_WIDTH,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  // Обробка натискання на пункт меню
  const handleMenuItemPress = (item) => {
    if (onNavigate) {
      onNavigate(item.key);
    }
    if (onClose) {
      onClose();
    }
  };

  // Обробка виходу
  const handleLogout = () => {
    if (onClose) onClose();
    setTimeout(() => {
      if (onLogout) onLogout();
    }, 300); // Затримка для анімації закриття
  };

  // Рендер пункту меню
  const renderMenuItem = (item, index) => {
    const isActive = item.isActive || false;
    
    return (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.menuItem,
          { borderBottomColor: colors.border },
          menuItemStyle,
          isActive && [styles.activeMenuItem, { backgroundColor: colors.primary + '20' }, activeMenuItemStyle],
          index === 0 && styles.firstMenuItem,
        ]}
        onPress={() => handleMenuItemPress(item)}
        accessibilityLabel={item.title}
        accessibilityRole="menuitem"
        accessibilityState={{ selected: isActive }}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemContent}>
          {item.icon && React.cloneElement(item.icon, {
            style: [
              item.icon.props.style,
              styles.menuIcon,
              { color: isActive ? colors.primary : colors.text },
            ],
          })}
          <Text style={[
            styles.menuText,
            { color: isActive ? colors.primary : colors.text },
          ]}>
            {item.title}
          </Text>
        </View>
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Рендер перемикача теми
  const renderThemeToggle = () => {
    return (
      <View style={[styles.themeToggleContainer, { borderTopColor: colors.border }]}>
        <Text style={[styles.themeToggleText, { color: colors.text }]}>
          {isDarkTheme ? 'Темна тема' : 'Світла тема'}
        </Text>
        <Switch
          value={isDarkTheme}
          onValueChange={onThemeToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={isDarkTheme ? colors.white : colors.white}
          accessibilityLabel="Перемикач теми"
        />
      </View>
    );
  };

  // Рендер інформації про користувача
  const renderUserInfo = () => {
    if (!isAuthenticated) {
      return (
        <View style={[styles.userContainer, { borderBottomColor: colors.border }]}>
          <Avatar
            name="Гість"
            size="large"
            style={styles.userAvatar}
          />
          <View style={styles.userTextContainer}>
            <Text style={[styles.userName, { color: colors.text }]}>
              Гість
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              Для повного функціоналу увійдіть
            </Text>
          </View>
        </View>
      );
    }

    return (
      <View style={[styles.userContainer, { borderBottomColor: colors.border }]}>
        <Avatar
          source={user.avatar ? { uri: user.avatar } : null}
          name={user.name}
          size="large"
          style={styles.userAvatar}
        />
        <View style={styles.userTextContainer}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user.name}
          </Text>
          {user.email ? (
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {user.email}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  // Рендер кнопки виходу
  const renderLogoutButton = () => {
    if (!isAuthenticated) return null;

    return (
      <TouchableOpacity
        style={[styles.logoutButton, { borderTopColor: colors.border }]}
        onPress={handleLogout}
        accessibilityLabel="Вийти з облікового запису"
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        <Text style={[styles.logoutText, { color: colors.error }]}>
          Вийти
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      {/* Overlay для закриття при кліку поза меню */}
      {isOpen && (
        <TouchableOpacity
          style={styles.overlay}
          onPress={onClose}
          accessibilityLabel="Закрити меню"
          accessibilityRole="button"
          activeOpacity={1}
        />
      )}

      {/* Бічне меню */}
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            width: DRAWER_WIDTH,
            transform: [{ translateX: slideAnim }],
          },
          style,
        ]}
        testID={testID}
        accessibilityLabel={accessibilityLabel || "Бічне навігаційне меню"}
        accessibilityRole="menu"
        accessibilityViewIsModal={isOpen}
        {...restProps}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            style={[styles.content, contentStyle]}
            showsVerticalScrollIndicator={false}
          >
            {/* Інформація про користувача */}
            {renderUserInfo()}

            {/* Пункти меню */}
            <View style={styles.menuContainer}>
              {menuItems.map((item, index) => renderMenuItem(item, index))}
            </View>

            {/* Перемикач теми */}
            {renderThemeToggle()}

            {/* Кнопка виходу */}
            {renderLogoutButton()}
          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  container: {
    ...StyleSheet.absoluteFillObject,
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 1001,
    elevation: 16,
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    ...Platform.select({
      android: {
        elevation: 16,
      },
    }),
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  userContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  userAvatar: {
    marginRight: 16,
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
  },
  menuContainer: {
    marginTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  firstMenuItem: {
    borderTopWidth: 1,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 16,
    fontSize: 20,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
  },
  activeMenuItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  themeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopWidth: 1,
    marginTop: 'auto',
  },
  themeToggleText: {
    fontSize: 16,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 20,
    borderTopWidth: 1,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DrawerNavigator;