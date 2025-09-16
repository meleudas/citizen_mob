// src/screens/main/HomeScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  SafeAreaView,
  Platform,
  Modal as RNModal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Custom hooks
import { useAuth } from '../../hooks/useAuth';
import { useViolations } from '../../hooks/useViolations';
import { useAppTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';

// Common components
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Avatar from '../../components/common/Avatar';
import Icon from 'react-native-vector-icons/MaterialIcons';

const HomeScreen = () => {
  const navigation = useNavigation();
  const { user, logout, isAuthenticated } = useAuth();
  const {
    violations,
    loading,
    error,
    getViolations,
    getStatistics,
  } = useViolations();
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    monthly: 0,
    weekly: 0,
  });
  const [recentViolations, setRecentViolations] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({
    title: '',
    message: '',
    actions: []
  });
  
  // Load data on mount and refresh
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      // Load violations
      await getViolations();
      
      // Calculate statistics
      const statistics = getStatistics();
      setStats({
        total: statistics.total,
        monthly: calculateMonthlyViolations(statistics.byDate),
        weekly: calculateWeeklyViolations(statistics.byDate),
      });
      
      // Get recent violations (last 5)
      const recent = violations.slice(0, 5);
      setRecentViolations(recent);
    } catch (err) {
      console.error('Error loading home data:', err);
    }
  };
  
  const calculateMonthlyViolations = (violationsByDate) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return Object.entries(violationsByDate).reduce((count, [date, countForDate]) => {
      const violationDate = new Date(date);
      if (violationDate.getMonth() === currentMonth && 
          violationDate.getFullYear() === currentYear) {
        return count + countForDate;
      }
      return count;
    }, 0);
  };
  
  const calculateWeeklyViolations = (violationsByDate) => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return Object.entries(violationsByDate).reduce((count, [date, countForDate]) => {
      const violationDate = new Date(date);
      if (violationDate >= oneWeekAgo && violationDate <= now) {
        return count + countForDate;
      }
      return count;
    }, 0);
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  // Show modal helper
  const showModal = (title, message, actions = []) => {
    setModalContent({ title, message, actions });
    setModalVisible(true);
  };
  
  // Hide modal helper
  const hideModal = () => {
    setModalVisible(false);
  };
  
  // Navigation actions
  const onAddViolation = () => {
    // Якщо користувач - гість, показуємо повідомлення
    if (!isAuthenticated) {
      showModal(
        t('home.guestAccess') || 'Обмежений доступ',
        t('home.guestAddViolationMessage') || 'Для додавання правопорушень потрібно увійти в обліковий запис',
        [
          {
            text: t('common.ok') || 'OK',
            onPress: hideModal,
          },
          {
            text: t('auth.login') || 'Увійти',
            onPress: () => {
              hideModal();
              logout();
            },
          },
        ]
      );
      return;
    }
    // Для авторизованих користувачів - перехід до вкладки додавання
    navigation.navigate('MainTabs', { screen: 'add' });
  };
  
  const onViewMap = () => {
    // Перехід до вкладки карти
    navigation.navigate('MainTabs', { screen: 'map' });
  };
  
  const onViewCalendar = () => {
    // Перехід до вкладки календаря
    navigation.navigate('MainTabs', { screen: 'calendar' });
  };
  
  const onViewProfile = () => {
    // Якщо користувач - гість, показуємо повідомлення
    if (!isAuthenticated) {
      showModal(
        t('home.guestAccess') || 'Обмежений доступ',
        t('home.guestProfileMessage') || 'Для перегляду профілю потрібно увійти в обліковий запис',
        [
          {
            text: t('common.ok') || 'OK',
            onPress: hideModal,
          },
          {
            text: t('auth.login') || 'Увійти',
            onPress: () => {
              hideModal();
              logout();
            },
          },
        ]
      );
      return;
    }
    // Перехід до вкладки профілю
    navigation.navigate('MainTabs', { screen: 'profile' });
  };
  
  const onLogout = () => {
    // Якщо користувач - гість, просто перенаправляємо на WelcomeScreen
    if (!isAuthenticated) {
      logout();
      return;
    }
    
    showModal(
      t('auth.logoutConfirm') || 'Вихід',
      t('auth.logoutConfirmMessage') || 'Ви впевнені, що хочете вийти?',
      [
        {
          text: t('common.cancel') || 'Скасувати',
          style: 'cancel',
          onPress: hideModal,
        },
        {
          text: t('auth.logout') || 'Вийти',
          style: 'destructive',
          onPress: () => {
            hideModal();
            logout();
          },
        },
      ]
    );
  };
  
  // Quick action component
  const QuickAction = ({ icon, title, onPress, color, style }) => (
    <TouchableOpacity
      style={[styles.quickAction, { backgroundColor: colors.card }, style]}
      onPress={onPress}
      accessibilityLabel={title}
      accessibilityRole="button"
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.quickActionText, { color: colors.text }]} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
  
  // Recent violation item
  const RecentViolationItem = ({ violation }) => (
    <TouchableOpacity
      style={[styles.recentItem, { borderBottomColor: colors.border }]}
      onPress={() => {
        // Для гостя - перехід на WelcomeScreen
        if (!isAuthenticated) {
          logout();
          return;
        }
        // Для авторизованих - перехід до деталей порушення
        navigation.navigate('ViolationDetail', { id: violation.id });
      }}
      accessibilityLabel={`${violation.category}: ${violation.description}`}
      accessibilityRole="button"
    >
      <View style={styles.recentItemContent}>
        <View style={styles.recentItemIcon}>
          <Icon 
            name={getCategoryIcon(violation.category)} 
            size={20} 
            color={getCategoryColor(violation.category)} 
          />
        </View>
        <View style={styles.recentItemText}>
          <Text style={[styles.recentItemTitle, { color: colors.text }]} numberOfLines={1}>
            {violation.description}
          </Text>
          <Text style={[styles.recentItemDate, { color: colors.textSecondary }]} numberOfLines={1}>
            {formatViolationDate(violation.dateTime)}
          </Text>
        </View>
      </View>
      <Icon name="chevron-right" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );
  
  // Helper functions
  const getCategoryIcon = (category) => {
    const icons = {
      parking: 'local-parking',
      trash: 'delete',
      noise: 'volume-up',
      traffic: 'directions-car',
      vandalism: 'brush',
      other: 'warning',
    };
    return icons[category] || icons.other;
  };
  
  const getCategoryColor = (category) => {
    const colorsMap = {
      parking: '#FF5722',
      trash: '#4CAF50',
      noise: '#FFC107',
      traffic: '#2196F3',
      vandalism: '#9C27B0',
      other: '#607D8B',
    };
    return colorsMap[category] || colorsMap.other;
  };
  
  const formatViolationDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };
  
  // Render welcome section
  const renderWelcomeSection = () => (
    <View style={[styles.welcomeCard, { backgroundColor: colors.card }]}>
      <View style={styles.welcomeHeader}>
        <Avatar
          name={user?.firstName || (isAuthenticated ? 'Користувач' : 'Гість')}
          size="large"
          style={styles.userAvatar}
        />
        <View style={styles.welcomeText}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            {t('home.welcome') || 'Вітаємо'}
            {user?.firstName ? `, ${user.firstName}` : ''}!
          </Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
            {isAuthenticated 
              ? (t('home.welcomeSubtitle') || 'Раді бачити вас знову')
              : (t('home.welcomeGuest') || 'Вітаємо, гість. Ви можете переглядати правопорушення')
            }
          </Text>
        </View>
      </View>
      
      <View style={styles.profileActions}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={onViewProfile}
          accessibilityLabel={isAuthenticated ? (t('home.viewProfile') || 'Переглянути профіль') : (t('auth.login') || 'Увійти')}
        >
          <Icon name="person" size={20} color={colors.primary} />
          <Text style={[styles.profileButtonText, { color: colors.primary }]}>
            {isAuthenticated ? (t('home.profile') || 'Профіль') : (t('auth.login') || 'Увійти')}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={onLogout}
          accessibilityLabel={isAuthenticated ? (t('auth.logout') || 'Вийти') : (t('home.goBack') || 'Назад')}
        >
          <Icon name={isAuthenticated ? "logout" : "arrow-back"} size={20} color={colors.error} />
          <Text style={[styles.logoutButtonText, { color: colors.error }]}>
            {isAuthenticated ? (t('auth.logout') || 'Вийти') : (t('home.goBack') || 'Назад')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Render statistics section
  const renderStatisticsSection = () => (
    <View style={styles.statsSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('home.statistics') || 'Статистика'}
      </Text>
      
      <View style={styles.statsGrid}>
        <Card
          style={[styles.statCard, { backgroundColor: colors.card }]}
          elevation="small"
        >
          <Text style={[styles.statNumber, { color: colors.primary }]}>
            {stats.total}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('home.totalViolations') || 'Всього'}
          </Text>
        </Card>
        
        <Card
          style={[styles.statCard, { backgroundColor: colors.card }]}
          elevation="small"
        >
          <Text style={[styles.statNumber, { color: '#4CAF50' }]}>
            {stats.monthly}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('home.monthlyViolations') || 'Цього місяця'}
          </Text>
        </Card>
        
        <Card
          style={[styles.statCard, { backgroundColor: colors.card }]}
          elevation="small"
        >
          <Text style={[styles.statNumber, { color: '#2196F3' }]}>
            {stats.weekly}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
            {t('home.weeklyViolations') || 'Цього тижня'}
          </Text>
        </Card>
      </View>
    </View>
  );
  
  // Render quick actions section
  const renderQuickActionsSection = () => (
    <View style={styles.quickActionsSection}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('home.quickActions') || 'Швидкі дії'}
      </Text>
      
      <View style={styles.quickActionsGrid}>
        <QuickAction
          icon="add-circle"
          title={t('home.addViolation') || 'Додати\nправопорушення'}
          onPress={onAddViolation}
          color={colors.primary}
        />
        
        <QuickAction
          icon="map"
          title={t('home.viewMap') || 'Переглянути\nкарту'}
          onPress={onViewMap}
          color="#2196F3"
        />
        
        <QuickAction
          icon="calendar-today"
          title={t('home.viewCalendar') || 'Переглянути\nкалендар'}
          onPress={onViewCalendar}
          color="#FF9800"
        />
      </View>
    </View>
  );
  
  // Render recent violations section
  const renderRecentViolationsSection = () => (
    <View style={styles.recentSection}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('home.recentViolations') || 'Останні правопорушення'}
        </Text>
        {recentViolations.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              // Для гостя - перехід на WelcomeScreen
              if (!isAuthenticated) {
                logout();
                return;
              }
              // Для авторизованих - перехід до списку порушень
              navigation.navigate('ViolationsList');
            }}
            accessibilityLabel={t('home.viewAll') || 'Переглянути всі'}
          >
            <Text style={[styles.viewAllText, { color: colors.primary }]}>
              {t('home.viewAll') || 'Всі'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <Card style={[styles.recentCard, { backgroundColor: colors.card }]}>
        {recentViolations.length > 0 ? (
          recentViolations.map((violation, index) => (
            <RecentViolationItem key={violation.id} violation={violation} />
          ))
        ) : (
          <View style={styles.emptyRecent}>
            <Icon name="error-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyRecentText, { color: colors.textSecondary }]}>
              {t('home.noRecentViolations') || 'Немає недавніх правопорушень'}
            </Text>
            <Button
              title={t('home.addFirstViolation') || 'Додати перше правопорушення'}
              onPress={onAddViolation}
              variant="primary"
              size="small"
              style={styles.addFirstButton}
            />
          </View>
        )}
      </Card>
    </View>
  );
  
  // Render custom modal
  const renderCustomModal = () => (
    <RNModal
      visible={modalVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={hideModal}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
          {modalContent.title && (
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{modalContent.title}</Text>
            </View>
          )}
          <View style={styles.modalContent}>
            <Text style={[styles.modalMessage, { color: colors.text }]}>
              {modalContent.message}
            </Text>
            <View style={styles.modalActions}>
              {modalContent.actions.map((action, index) => (
                <View key={index} style={styles.modalButtonWrapper}>
                  <Button
                    title={action.text}
                    onPress={action.onPress}
                    variant={action.style === 'destructive' ? 'error' : 'primary'}
                    style={styles.modalButton}
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </RNModal>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        {renderWelcomeSection()}
        
        {/* Statistics Section */}
        {renderStatisticsSection()}
        
        {/* Quick Actions Section */}
        {renderQuickActionsSection()}
        
        {/* Recent Violations Section */}
        {renderRecentViolationsSection()}
        
        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            {t('home.appVersion') || 'Версія додатку'} 1.0.0
          </Text>
        </View>
      </ScrollView>
      
      {/* Custom Modal */}
      {renderCustomModal()}
      
      {/* Loading overlay */}
      <LoadingSpinner
        visible={loading && !refreshing}
        overlay={true}
        text={t('home.loading') || 'Завантаження...'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  welcomeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
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
  welcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userAvatar: {
    marginRight: 16,
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 16,
  },
  profileActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  profileButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  statsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  quickActionsSection: {
    marginBottom: 20,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
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
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  recentSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 16,
    fontWeight: '600',
  },
  recentCard: {
    borderRadius: 12,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  recentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentItemIcon: {
    marginRight: 12,
  },
  recentItemText: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  recentItemDate: {
    fontSize: 14,
  },
  emptyRecent: {
    alignItems: 'center',
    padding: 32,
  },
  emptyRecentText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  addFirstButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    fontSize: 12,
  },
  // Custom Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.25)',
        shadowOffset: {
          width: 0,
          height: 10,
        },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: {
        elevation: 24,
      },
    }),
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalContent: {
    padding: 16,
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'column',
  },
  modalButtonWrapper: {
    marginBottom: 8,
  },
  modalButton: {
    width: '100%',
  },
});

export default HomeScreen;