// src/components/violations/ViolationList.js
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';
import ViolationCard from './ViolationCard';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ViolationList = ({
  // Основні пропси
  violations = [],
  onRefresh,
  onLoadMore,
  onViolationPress,
  onViolationEdit,
  onViolationDelete,
  
  // Стан
  refreshing = false,
  loadingMore = false,
  hasMore = true,
  
  // Фільтрація та пошук
  searchable = true,
  filterable = true,
  initialSearchQuery = '',
  initialCategoryFilter = 'all',
  
  // Пагінація
  pageSize = 10,
  
  // Стилі
  style,
  contentContainerStyle,
  searchInputStyle,
  filterButtonStyle,
  
  // Accessibility
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const { colors } = useAppTheme();
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [categoryFilter, setCategoryFilter] = useState(initialCategoryFilter);
  const [page, setPage] = useState(1);

  // Категорії для фільтрації
  const categories = [
    { key: 'all', label: 'Всі', icon: 'filter-list' },
    { key: 'parking', label: 'Паркування', icon: 'local-parking' },
    { key: 'trash', label: 'Сміття', icon: 'delete' },
    { key: 'noise', label: 'Шум', icon: 'volume-up' },
    { key: 'traffic', label: 'ПДР', icon: 'directions-car' },
    { key: 'vandalism', label: 'Вандалізм', icon: 'brush' },
    { key: 'other', label: 'Інше', icon: 'warning' },
  ];

  // Фільтрація та пошук
  const filteredViolations = useMemo(() => {
    let filtered = [...violations];

    // Фільтрація по категорії
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(violation => violation.category === categoryFilter);
    }

    // Пошук по опису
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(violation =>
        violation.description?.toLowerCase().includes(query) ||
        violation.location?.address?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [violations, searchQuery, categoryFilter]);

  // Пагінація
  const paginatedViolations = useMemo(() => {
    const startIndex = 0;
    const endIndex = page * pageSize;
    return filteredViolations.slice(startIndex, endIndex);
  }, [filteredViolations, page, pageSize]);

  // Обробка оновлення
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  // Обробка завантаження більше
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || filteredViolations.length <= page * pageSize) {
      return;
    }

    if (onLoadMore) {
      onLoadMore(page + 1);
      setPage(prev => prev + 1);
    }
  }, [loadingMore, hasMore, filteredViolations.length, page, pageSize, onLoadMore]);

  // Обробка зміни пошуку
  const handleSearchChange = useCallback((text) => {
    setSearchQuery(text);
    setPage(1); // Скидаємо пагінацію при новому пошуку
  }, []);

  // Обробка зміни фільтра
  const handleCategoryFilter = useCallback((categoryKey) => {
    setCategoryFilter(categoryKey);
    setPage(1); // Скидаємо пагінацію при новому фільтрі
  }, []);

  // Рендер елементу списку
  const renderItem = useCallback(({ item }) => {
    const isLocal = item.isLocal || !item.id.includes('-'); // Припущення для локальних записів
    const isSynced = item.isSynced !== undefined ? item.isSynced : !isLocal;

    return (
      <ViolationCard
        violation={item}
        onPress={onViolationPress}
        onEdit={onViolationEdit}
        onDelete={onViolationDelete}
        isLocal={isLocal}
        isSynced={isSynced}
        swipeEnabled={true}
        style={styles.card}
      />
    );
  }, [onViolationPress, onViolationEdit, onViolationDelete]);

  // Рендер футера списку (індикатор завантаження)
  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Завантаження...
        </Text>
      </View>
    );
  }, [loadingMore, colors]);

  // Рендер empty state
  const renderEmptyState = useCallback(() => {
    if (refreshing) return null;

    let title = 'Немає правопорушень';
    let description = 'Список правопорушень порожній';

    if (searchQuery) {
      title = 'Нічого не знайдено';
      description = `Немає правопорушень за запитом "${searchQuery}"`;
    } else if (categoryFilter !== 'all') {
      const categoryLabel = categories.find(c => c.key === categoryFilter)?.label || '';
      title = 'Немає правопорушень';
      description = `Немає правопорушень у категорії "${categoryLabel}"`;
    }

    return (
      <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
        <Icon name="error-outline" size={64} color={colors.textSecondary} />
        <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.emptyStateDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
        {!searchQuery && categoryFilter === 'all' && (
          <TouchableOpacity
            style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
            onPress={() => console.log('Додати правопорушення')}
          >
            <Text style={styles.emptyStateButtonText}>Додати правопорушення</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [refreshing, searchQuery, categoryFilter, categories, colors]);

  // Рендер пошуку
  const renderSearch = () => {
    if (!searchable) return null;

    return (
      <View style={[styles.searchContainer, { backgroundColor: colors.inputBackground }]}>
        <Icon name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }, searchInputStyle]}
          placeholder="Пошук правопорушень..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearchChange}
          accessibilityLabel="Пошук правопорушень"
          accessibilityRole="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => handleSearchChange('')}
            style={styles.clearButton}
            accessibilityLabel="Очистити пошук"
          >
            <Icon name="clear" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Рендер фільтрів
  const renderFilters = () => {
    if (!filterable) return null;

    return (
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.key}
              style={[
                styles.filterButton,
                { 
                  backgroundColor: categoryFilter === category.key 
                    ? colors.primary 
                    : colors.inputBackground,
                  borderColor: categoryFilter === category.key 
                    ? colors.primary 
                    : colors.border,
                },
                filterButtonStyle,
                categoryFilter === category.key && styles.activeFilterButton,
              ]}
              onPress={() => handleCategoryFilter(category.key)}
              accessibilityLabel={`Фільтр: ${category.label}`}
              accessibilityRole="button"
              accessibilityState={{ selected: categoryFilter === category.key }}
            >
              <Icon 
                name={category.icon} 
                size={16} 
                color={categoryFilter === category.key ? colors.white : colors.text} 
              />
              <Text style={[
                styles.filterButtonText,
                { 
                  color: categoryFilter === category.key 
                    ? colors.white 
                    : colors.text 
                }
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Ключ для FlatList
  const keyExtractor = useCallback((item) => item.id.toString(), []);

  return (
    <View 
      style={[styles.container, style]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || "Список правопорушень"}
      accessibilityRole="list"
      {...restProps}
    >
      {/* Пошук */}
      {renderSearch()}

      {/* Фільтри */}
      {renderFilters()}

      {/* Список правопорушень */}
      <FlatList
        data={paginatedViolations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          paginatedViolations.length === 0 && styles.emptyContent,
          contentContainerStyle,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
            title="Оновлення..."
            titleColor={colors.textSecondary}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        removeClippedSubviews={true}
        {...restProps}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginVertical: 8,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  filtersContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  activeFilterButton: {
    borderWidth: 0,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  emptyContent: {
    flexGrow: 1,
  },
  card: {
    marginBottom: 12,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ViolationList;