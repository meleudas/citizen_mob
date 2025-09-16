// src/screens/violations/ViolationsListScreen.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  RefreshControl,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

// Custom hooks
import { useViolations } from '../../hooks/useViolations';
import { useThemeColors } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';

// Common components
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Custom components
import ViolationCard from '../../components/violations/ViolationCard';
import Button from '../../components/common/Button';

const ViolationsListScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const {
    violations,
    loading,
    error,
    getViolations,
    deleteViolation,
    syncViolations,
  } = useViolations();
  const { colors, isDark } = useThemeColors();
  const { t, formatDate } = useLanguage();
  
  // Route params for filters
  const routeFilters = route.params?.filters || {};
  
  // Local state
  const [filters, setFilters] = useState({
    category: routeFilters.category || 'all',
    search: routeFilters.search || '',
    sortBy: routeFilters.sortBy || 'dateTime',
    sortOrder: routeFilters.sortOrder || 'desc',
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  });
  
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedViolations, setSelectedViolations] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Load violations on mount and when filters change
  useEffect(() => {
    loadViolations();
  }, [filters, pagination.page]);
  
  const loadViolations = async (refresh = false) => {
    try {
      const params = {
        page: refresh ? 1 : pagination.page,
        limit: pagination.limit,
        filters: {
          category: filters.category !== 'all' ? filters.category : undefined,
          search: filters.search || undefined,
        },
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };
      
      const result = await getViolations(params);
      
      if (result.success) {
        setPagination(prev => ({
          ...prev,
          total: result.total,
          hasMore: result.hasMore,
          page: refresh ? 1 : prev.page,
        }));
      }
    } catch (err) {
      console.error('Error loading violations:', err);
      Alert.alert(
        t('error.title') || 'Помилка',
        err.message || t('violations.loadError') || 'Не вдалося завантажити правопорушення'
      );
    }
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    await loadViolations(true);
    setRefreshing(false);
  };
  
  const onLoadMore = async () => {
    if (loadingMore || !pagination.hasMore) return;
    
    setLoadingMore(true);
    setPagination(prev => ({
      ...prev,
      page: prev.page + 1,
    }));
    setLoadingMore(false);
  };
  
  // Filter actions
  const onFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value,
    }));
    setPagination(prev => ({
      ...prev,
      page: 1,
    }));
  };
  
  const onSearch = (query) => {
    onFilterChange('search', query);
  };
  
  const onSortChange = (sortBy, sortOrder = 'desc') => {
    onFilterChange('sortBy', sortBy);
    onFilterChange('sortOrder', sortOrder);
  };
  
  // Navigation actions
  const onViolationPress = (violation) => {
    if (isSelectionMode) {
      toggleSelection(violation.id);
    } else {
      navigation.navigate('ViolationDetail', { id: violation.id });
    }
  };
  
  // Selection actions
  const toggleSelection = (id) => {
    setSelectedViolations(prev => 
      prev.includes(id) 
        ? prev.filter(selectedId => selectedId !== id)
        : [...prev, id]
    );
  };
  
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (isSelectionMode) {
      setSelectedViolations([]);
    }
  };
  
  const selectAll = () => {
    if (selectedViolations.length === filteredViolations.length) {
      setSelectedViolations([]);
    } else {
      setSelectedViolations(filteredViolations.map(v => v.id));
    }
  };
  
  // Batch actions
  const onDeleteSelected = () => {
    if (selectedViolations.length === 0) return;
    
    Alert.alert(
      t('violations.deleteSelected') || 'Видалення правопорушень',
      `${t('violations.deleteSelectedConfirm') || 'Ви впевнені, що хочете видалити'} ${selectedViolations.length} ${t('violations.items') || 'елементів'}?`,
      [
        {
          text: t('common.cancel') || 'Скасувати',
          style: 'cancel',
        },
        {
          text: t('violations.delete') || 'Видалити',
          style: 'destructive',
          onPress: async () => {
            try {
              const results = await Promise.all(
                selectedViolations.map(id => deleteViolation(id))
              );
              
              const successCount = results.filter(r => r.success).length;
              const failCount = results.length - successCount;
              
              Alert.alert(
                t('violations.deleted') || 'Видалено',
                `${t('violations.deletedSuccessfully') || 'Успішно видалено'}: ${successCount}\n${t('violations.deleteFailed') || 'Помилок'}: ${failCount}`,
                [{ text: 'OK' }]
              );
              
              setSelectedViolations([]);
              setIsSelectionMode(false);
              await loadViolations(true);
            } catch (err) {
              Alert.alert(
                t('error.title') || 'Помилка',
                err.message || t('violations.deleteError') || 'Не вдалося видалити правопорушення'
              );
            }
          },
        },
      ]
    );
  };
  
  const onSyncSelected = async () => {
    if (selectedViolations.length === 0) return;
    
    try {
      const result = await syncViolations();
      if (result.success) {
        Alert.alert(
          t('violations.synced') || 'Синхронізовано',
          `${t('violations.syncedSuccessfully') || 'Успішно синхронізовано'}: ${result.synced}\n${t('violations.syncFailed') || 'Помилок'}: ${result.failed}`,
          [{ text: 'OK' }]
        );
        await loadViolations(true);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      Alert.alert(
        t('error.title') || 'Помилка',
        err.message || t('violations.syncError') || 'Не вдалося синхронізувати правопорушення'
      );
    }
  };
  
  // Filtered and sorted violations
  const filteredViolations = useMemo(() => {
    let filtered = [...violations];
    
    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(v => v.category === filters.category);
    }
    
    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(v => 
        v.description?.toLowerCase().includes(searchLower) ||
        v.location?.address?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[filters.sortBy];
      let bValue = b[filters.sortBy];
      
      if (filters.sortBy === 'dateTime') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }
      
      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  }, [violations, filters]);
  
  // Category options
  const categories = [
    { key: 'all', label: t('violations.allCategories') || 'Всі категорії', icon: 'filter-list' },
    { key: 'parking', label: t('category.parking') || 'Паркування', icon: 'local-parking' },
    { key: 'trash', label: t('category.trash') || 'Сміття', icon: 'delete' },
    { key: 'noise', label: t('category.noise') || 'Шум', icon: 'volume-up' },
    { key: 'traffic', label: t('category.traffic') || 'Порушення ПДР', icon: 'directions-car' },
    { key: 'vandalism', label: t('category.vandalism') || 'Вандалізм', icon: 'brush' },
    { key: 'other', label: t('category.other') || 'Інше', icon: 'warning' },
  ];
  
  // Sort options
  const sortOptions = [
    { key: 'dateTime', label: t('violations.sortBy.date') || 'Дата', icon: 'schedule' },
    { key: 'category', label: t('violations.sortBy.category') || 'Категорія', icon: 'category' },
    { key: 'description', label: t('violations.sortBy.description') || 'Опис', icon: 'description' },
  ];
  
  // Render header with search and filters
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.card }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
        <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t('violations.searchPlaceholder') || 'Пошук правопорушень...'}
          placeholderTextColor={colors.textSecondary}
          value={filters.search}
          onChangeText={onSearch}
          accessibilityLabel={t('violations.searchPlaceholder') || 'Пошук правопорушень'}
        />
        {filters.search.length > 0 && (
          <TouchableOpacity onPress={() => onSearch('')}>
            <Icon name="clear" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* Filter Controls */}
      <View style={styles.filterControls}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterButtons}>
            {/* Category Filter */}
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                {t('violations.category') || 'Категорія'}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryButtons}>
                  {categories.map(category => (
                    <TouchableOpacity
                      key={category.key}
                      style={[
                        styles.categoryButton,
                        { 
                          backgroundColor: filters.category === category.key 
                            ? colors.primary + '20' 
                            : colors.inputBackground,
                          borderColor: filters.category === category.key 
                            ? colors.primary 
                            : colors.border,
                        }
                      ]}
                      onPress={() => onFilterChange('category', category.key)}
                      accessibilityLabel={category.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected: filters.category === category.key }}
                    >
                      <Icon 
                        name={category.icon} 
                        size={16} 
                        color={filters.category === category.key ? colors.primary : colors.text} 
                      />
                      <Text style={[
                        styles.categoryButtonText,
                        { 
                          color: filters.category === category.key 
                            ? colors.primary 
                            : colors.text 
                        }
                      ]}>
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            
            {/* Sort Filter */}
            <View style={styles.filterGroup}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>
                {t('violations.sortBy') || 'Сортування'}
              </Text>
              <View style={styles.sortButtons}>
                {sortOptions.map(sort => (
                  <TouchableOpacity
                    key={sort.key}
                    style={[
                      styles.sortButton,
                      { 
                        backgroundColor: filters.sortBy === sort.key 
                          ? colors.primary + '20' 
                          : colors.inputBackground,
                        borderColor: filters.sortBy === sort.key 
                          ? colors.primary 
                          : colors.border,
                      }
                    ]}
                    onPress={() => onSortChange(
                      sort.key, 
                      filters.sortBy === sort.key && filters.sortOrder === 'desc' ? 'asc' : 'desc'
                    )}
                    accessibilityLabel={sort.label}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filters.sortBy === sort.key }}
                  >
                    <Icon 
                      name={sort.icon} 
                      size={16} 
                      color={filters.sortBy === sort.key ? colors.primary : colors.text} 
                    />
                    <Text style={[
                      styles.sortButtonText,
                      { 
                        color: filters.sortBy === sort.key 
                          ? colors.primary 
                          : colors.text 
                      }
                    ]}>
                      {sort.label}
                    </Text>
                    {filters.sortBy === sort.key && (
                      <Icon 
                        name={filters.sortOrder === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
                        size={16} 
                        color={colors.primary} 
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
      
      {/* Selection Mode Toolbar */}
      {isSelectionMode && (
        <View style={[styles.selectionToolbar, { backgroundColor: colors.primary + '20' }]}>
          <View style={styles.selectionInfo}>
            <Text style={[styles.selectionText, { color: colors.primary }]}>
              {selectedViolations.length} {t('violations.selected') || 'вибрано'}
            </Text>
            <TouchableOpacity onPress={selectAll}>
              <Text style={[styles.selectAllText, { color: colors.primary }]}>
                {selectedViolations.length === filteredViolations.length 
                  ? t('violations.deselectAll') || 'Зняти виділення' 
                  : t('violations.selectAll') || 'Виділити все'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.selectionActions}>
            <Button
              title={t('violations.delete') || 'Видалити'}
              onPress={onDeleteSelected}
              variant="danger"
              size="small"
              iconLeft={<Icon name="delete" size={16} />}
              style={styles.selectionActionButton}
              disabled={selectedViolations.length === 0}
            />
            
            <Button
              title={t('violations.sync') || 'Синхронізувати'}
              onPress={onSyncSelected}
              variant="secondary"
              size="small"
              iconLeft={<Icon name="sync" size={16} />}
              style={styles.selectionActionButton}
              disabled={selectedViolations.length === 0}
            />
            
            <Button
              title={t('violations.cancel') || 'Скасувати'}
              onPress={toggleSelectionMode}
              variant="outline"
              size="small"
              style={styles.selectionActionButton}
            />
          </View>
        </View>
      )}
    </View>
  );
  
  // Render violation card
  const renderViolationCard = ({ item: violation }) => (
    <ViolationCard
      violation={violation}
      onPress={() => onViolationPress(violation)}
      onEdit={(id) => {
        Alert.alert(
          t('violations.edit') || 'Редагування',
          t('violations.editComingSoon') || 'Функція редагування скоро буде доступна',
          [{ text: 'OK' }]
        );
      }}
      onDelete={(id) => {
        Alert.alert(
          t('violations.deleteConfirm') || 'Видалення правопорушення',
          t('violations.deleteConfirmMessage') || 'Ви впевнені, що хочете видалити це правопорушення?',
          [
            {
              text: t('common.cancel') || 'Скасувати',
              style: 'cancel',
            },
            {
              text: t('violations.delete') || 'Видалити',
              style: 'destructive',
              onPress: async () => {
                try {
                  const result = await deleteViolation(id);
                  if (result.success) {
                    Alert.alert(
                      t('violations.deleted') || 'Видалено',
                      t('violations.deletedMessage') || 'Правопорушення успішно видалено'
                    );
                    await loadViolations(true);
                  } else {
                    throw new Error(result.error);
                  }
                } catch (err) {
                  Alert.alert(
                    t('error.title') || 'Помилка',
                    err.message || t('violations.deleteError') || 'Не вдалося видалити правопорушення'
                  );
                }
              },
            },
          ]
        );
      }}
      isSynced={violation.isSynced}
      isLocal={!violation.isSynced}
      isSelected={selectedViolations.includes(violation.id)}
      style={styles.violationCard}
      accessibilityLabel={`${violation.description} - ${t(`category.${violation.category}`) || violation.category} - ${formatDate(violation.dateTime)}`}
    />
  );
  
  // Render empty state
  const renderEmptyState = () => (
    <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
      <Icon name="error-outline" size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
        {filters.search || filters.category !== 'all' 
          ? t('violations.noResults') || 'Нічого не знайдено' 
          : t('violations.noViolations') || 'Немає правопорушень'}
      </Text>
      <Text style={[styles.emptyStateDescription, { color: colors.textSecondary }]}>
        {filters.search || filters.category !== 'all' 
          ? `${t('violations.tryDifferentSearch') || 'Спробуйте інший пошук або фільтри'}`
          : `${t('violations.addFirstViolation') || 'Додайте перше правопорушення'}`}
      </Text>
      
      {!filters.search && filters.category === 'all' && (
        <Button
          title={t('violations.addViolation') || 'Додати правопорушення'}
          onPress={() => navigation.navigate('AddViolation')}
          variant="primary"
          style={styles.emptyStateButton}
        />
      )}
      
      {(filters.search || filters.category !== 'all') && (
        <Button
          title={t('violations.clearFilters') || 'Очистити фільтри'}
          onPress={() => {
            setFilters({
              category: 'all',
              search: '',
              sortBy: 'dateTime',
              sortOrder: 'desc',
            });
          }}
          variant="secondary"
          style={styles.emptyStateButton}
        />
      )}
    </View>
  );
  
  // Render footer (loading more indicator)
  const renderFooter = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.footer}>
        <LoadingSpinner visible={true} size="small" />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          {t('violations.loadingMore') || 'Завантаження...'}
        </Text>
      </View>
    );
  };
  
  // Render statistics
  const renderStatistics = () => (
    <View style={[styles.statistics, { backgroundColor: colors.card }]}>
      <Text style={[styles.statisticsText, { color: colors.text }]}>
        {t('violations.total') || 'Всього'}: {pagination.total} • {t('violations.filtered') || 'Відфільтровано'}: {filteredViolations.length}
      </Text>
      
      <TouchableOpacity onPress={toggleSelectionMode}>
        <Text style={[styles.selectionModeText, { color: colors.primary }]}>
          {isSelectionMode 
            ? t('violations.exitSelectionMode') || 'Вийти з режиму виділення' 
            : t('violations.enterSelectionMode') || 'Режим виділення'}
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header with search and filters */}
      {renderHeader()}
      
      {/* Statistics */}
      {renderStatistics()}
      
      {/* Violations List */}
      <FlatList
        data={filteredViolations}
        renderItem={renderViolationCard}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        contentContainerStyle={filteredViolations.length === 0 ? styles.emptyList : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            title={t('violations.refreshing') || 'Оновлення...'}
            titleColor={colors.textSecondary}
          />
        }
        onEndReached={onLoadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
      />
      
      {/* Global Error Message */}
      <ErrorMessage
        message={error}
        visible={!!error}
        type="error"
        style={styles.globalError}
        onDismiss={() => {
          // Clear error
        }}
      />
      
      {/* Loading overlay */}
      <LoadingSpinner
        visible={loading.initial && !refreshing}
        overlay={true}
        text={t('violations.loading') || 'Завантаження правопорушень...'}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  filterControls: {
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  filterGroup: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  selectionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  selectionActionButton: {
    minWidth: 80,
  },
  statistics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  statisticsText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectionModeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  emptyList: {
    flexGrow: 1,
    padding: 16,
  },
  violationCard: {
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
    marginVertical: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyStateButton: {
    minWidth: 200,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    marginLeft: 8,
    fontSize: 14,
  },
  globalError: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
});

export default ViolationsListScreen;