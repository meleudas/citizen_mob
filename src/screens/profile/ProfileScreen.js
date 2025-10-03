// src/screens/main/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Custom hooks
import { useAuth } from '../../hooks/useAuth';
import { useViolations } from '../../hooks/useViolations';
import { useThemeColors } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';

// Common components
import Card from '../../components/common/Card';
import Avatar from '../../components/common/Avatar';
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, logout, loading: authLoading, isGuest } = useAuth();
  const { violations, loading: violationsLoading, getViolations } = useViolations();
  const { colors, isDark } = useThemeColors();
  const { t } = useLanguage();
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    byCategory: {},
  });
  const [activityHistory, setActivityHistory] = useState([]);
  const [joinedDate, setJoinedDate] = useState(null);
  
  // Load data on mount
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    try {
      // Load violations for statistics
      await getViolations();
      
      // Calculate statistics
      const calculatedStats = calculateStatistics(violations);
      setStats(calculatedStats);
      
      // Generate activity history
      const history = generateActivityHistory(violations);
      setActivityHistory(history);
      
      // Set joined date (from user registration date or first violation)
      if (user?.createdAt) {
        setJoinedDate(new Date(user.createdAt));
      } else if (violations.length > 0) {
        const firstViolation = violations[violations.length - 1];
        setJoinedDate(new Date(firstViolation.createdAt));
      }
    } catch (err) {
      console.error('Error loading profile data:', err);
    }
  };
  
  const calculateStatistics = (violationsArray) => {
    const total = violationsArray.length;
    const byCategory = {};
    
    violationsArray.forEach(violation => {
      const category = violation.category || 'other';
      byCategory[category] = (byCategory[category] || 0) + 1;
    });
    
    return { total, byCategory };
  };
  
  const generateActivityHistory = (violationsArray) => {
    // Sort violations by date (newest first)
    const sortedViolations = [...violationsArray].sort((a, b) => 
      new Date(b.dateTime) - new Date(a.dateTime)
    );
    
    // Take last 10 violations for history
    return sortedViolations.slice(0, 10).map(violation => ({
      id: violation.id,
      type: 'violation_added',
      title: violation.description,
      category: violation.category,
      date: new Date(violation.dateTime),
      location: violation.location?.address || 'Адреса не вказана',
    }));
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  // Navigation actions
  const onViewSettings = () => {
    navigation.navigate('Settings');
  };
  
  const onLogout = () => {
    Alert.alert(
      t('auth.logoutConfirm') || 'Вихід',
      t('auth.logoutConfirmMessage') || 'Ви впевнені, що хочете вийти?',
      [
        {
          text: t('common.cancel') || 'Скасувати',
          style: 'cancel',
        },
        {
          text: t('auth.logout') || 'Вийти',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };
  
  const onEditProfile = () => {
    // Переходимо до екрану редагування профілю
    navigation.navigate('ProfileEdit');
  };
  
  const onExportData = () => {
    Alert.alert(
      t('profile.exportData') || 'Експорт даних',
      t('profile.exportDataComingSoon') || 'Функція експорту даних скоро буде доступна',
      [{ text: 'OK' }]
    );
  };
  
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
  
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('uk-UA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatTimeAgo = (date) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} ${t('profile.daysAgo') || 'днів тому'}`;
    } else if (diffHours > 0) {
      return `${diffHours} ${t('profile.hoursAgo') || 'годин тому'}`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} ${t('profile.minutesAgo') || 'хвилин тому'}`;
    } else {
      return t('profile.justNow') || 'щойно';
    }
  };
  
  // Render user info section
  const renderUserInfo = () => (
    <Card 
      style={[styles.userInfoCard, { backgroundColor: colors.card }]}
      elevation="medium"
    >
      <View style={styles.userInfoHeader}>
        <Avatar
          name={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Користувач'}
          size="xlarge"
          style={styles.userAvatar}
          source={user?.avatar ? { uri: user.avatar } : null}
        />
        
        <View style={styles.userInfoText}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || t('profile.anonymous') || 'Анонімний користувач'}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user?.email || t('profile.emailNotProvided') || 'Email не вказано'}
          </Text>
          {joinedDate && (
            <Text style={[styles.joinedDate, { color: colors.textSecondary }]}>
              {t('profile.memberSince') || 'Учасник з'} {formatDate(joinedDate)}
            </Text>
          )}
        </View>
      </View>
      
      {/* Кнопка редагування профілю відображається тільки для зареєстрованих користувачів */}
      {!isGuest && (
        <View style={styles.userInfoActions}>
          <Button
            title={t('profile.editProfile') || 'Редагувати профіль'}
            onPress={onEditProfile}
            variant="outline"
            size="small"
            iconLeft={<Icon name="edit" size={16} />}
            style={styles.editButton}
          />
        </View>
      )}
    </Card>
  );
  
  // Render statistics section
  const renderStatistics = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('profile.statistics') || 'Статистика'}
      </Text>
      
      <Card 
        style={[styles.statsCard, { backgroundColor: colors.card }]}
        elevation="small"
      >
        {/* Total violations */}
        <View style={[styles.statItem, { borderBottomColor: colors.border }]}>
          <View style={styles.statIconContainer}>
            <Icon name="assignment" size={24} color={colors.primary} />
          </View>
          <View style={styles.statTextContainer}>
            <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
              {t('profile.totalViolations') || 'Всього правопорушень'}
            </Text>
          </View>
        </View>
        
        {/* By categories */}
        {Object.entries(stats.byCategory).map(([category, count]) => (
          <View 
            key={category} 
            style={[styles.statItem, { borderBottomColor: colors.border }]}
          >
            <View style={styles.statIconContainer}>
              <Icon 
                name={getCategoryIcon(category)} 
                size={24} 
                color={getCategoryColor(category)} 
              />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={[styles.statValue, { color: colors.text }]}>{count}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {t(`category.${category}`) || category}
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </View>
  );
  
  // Render activity history section
  const renderActivityHistory = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('profile.activityHistory') || 'Історія активності'}
        </Text>
        {activityHistory.length > 0 && (
          <Text style={[styles.historyCount, { color: colors.textSecondary }]}>
            {activityHistory.length} {t('profile.items') || 'елементів'}
          </Text>
        )}
      </View>
      
      <Card 
        style={[styles.historyCard, { backgroundColor: colors.card }]}
        elevation="small"
      >
        {activityHistory.length > 0 ? (
          activityHistory.map((activity, index) => (
            <TouchableOpacity
              key={activity.id}
              style={[
                styles.activityItem,
                { 
                  borderBottomColor: colors.border,
                  borderBottomWidth: index < activityHistory.length - 1 ? 1 : 0,
                }
              ]}
              onPress={() => navigation.navigate('ViolationDetail', { id: activity.id })}
              accessibilityLabel={`${activity.title} - ${formatTimeAgo(activity.date)}`}
              accessibilityRole="button"
            >
              <View style={styles.activityIcon}>
                <Icon 
                  name={getCategoryIcon(activity.category)} 
                  size={20} 
                  color={getCategoryColor(activity.category)} 
                />
              </View>
              
              <View style={styles.activityContent}>
                <Text 
                  style={[styles.activityTitle, { color: colors.text }]} 
                  numberOfLines={2}
                >
                  {activity.title}
                </Text>
                <Text 
                  style={[styles.activityLocation, { color: colors.textSecondary }]} 
                  numberOfLines={1}
                >
                  {activity.location}
                </Text>
                <Text style={[styles.activityDate, { color: colors.textSecondary }]}>
                  {formatTimeAgo(activity.date)}
                </Text>
              </View>
              
              <Icon 
                name="chevron-right" 
                size={24} 
                color={colors.textSecondary} 
              />
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyHistory}>
            <Icon name="history" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyHistoryText, { color: colors.textSecondary }]}>
              {t('profile.noActivity') || 'Немає історії активності'}
            </Text>
          </View>
        )}
      </Card>
    </View>
  );
  
  // Render additional actions section
  const renderAdditionalActions = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        {t('profile.additionalActions') || 'Додаткові дії'}
      </Text>
      
      <Card 
        style={[styles.actionsCard, { backgroundColor: colors.card }]}
        elevation="small"
      >
        <TouchableOpacity
          style={[styles.actionItem, { borderBottomColor: colors.border }]}
          onPress={onViewSettings}
          accessibilityLabel={t('profile.settings') || 'Налаштування'}
          accessibilityRole="button"
        >
          <View style={styles.actionContent}>
            <Icon name="settings" size={24} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              {t('profile.settings') || 'Налаштування'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionItem, { borderBottomColor: colors.border }]}
          onPress={onExportData}
          accessibilityLabel={t('profile.exportData') || 'Експорт даних'}
          accessibilityRole="button"
        >
          <View style={styles.actionContent}>
            <Icon name="file-download" size={24} color="#4CAF50" />
            <Text style={[styles.actionText, { color: colors.text }]}>
              {t('profile.exportData') || 'Експорт даних'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionItem}
          onPress={onLogout}
          accessibilityLabel={t('auth.logout') || 'Вийти'}
          accessibilityRole="button"
        >
          <View style={styles.actionContent}>
            <Icon name="logout" size={24} color={colors.error} />
            <Text style={[styles.actionText, { color: colors.text }]}>
              {t('auth.logout') || 'Вийти'}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </Card>
    </View>
  );
  
  // Get loading state
  const isLoading = authLoading || violationsLoading;
  
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
        {/* User Info Section */}
        {renderUserInfo()}
        
        {/* Statistics Section */}
        {renderStatistics()}
        
        {/* Activity History Section */}
        {renderActivityHistory()}
        
        {/* Additional Actions Section */}
        {renderAdditionalActions()}
        
        {/* App Version */}
        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: colors.textSecondary }]}>
            {t('profile.appVersion') || 'Версія додатку'} 1.0.0
          </Text>
        </View>
      </ScrollView>
      
      {/* Loading overlay */}
      <LoadingSpinner
        visible={isLoading && !refreshing}
        overlay={true}
        text={t('profile.loading') || 'Завантаження...'}
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
  userInfoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  userAvatar: {
    marginRight: 16,
  },
  userInfoText: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 4,
  },
  joinedDate: {
    fontSize: 14,
  },
  userInfoActions: {
    alignItems: 'flex-start',
  },
  editButton: {
    minWidth: 180,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  historyCount: {
    fontSize: 14,
  },
  statsCard: {
    borderRadius: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  statTextContainer: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  historyCard: {
    borderRadius: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  activityIcon: {
    marginRight: 16,
  },
  activityContent: {
    flex: 1,
    marginRight: 16,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  activityLocation: {
    fontSize: 14,
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
  },
  emptyHistory: {
    alignItems: 'center',
    padding: 32,
  },
  emptyHistoryText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  actionsCard: {
    borderRadius: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 16,
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  versionText: {
    fontSize: 12,
  },
});

export default ProfileScreen;