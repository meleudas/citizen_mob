// src/screens/calendar/CalendarScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CalendarView from '../../components/calendar/CalendarView';
import { useAppTheme } from '../../hooks/useTheme';
import { useLanguage } from '../../hooks/useLanguage';
import { useViolations } from '../../hooks/useViolations';
import Icon from 'react-native-vector-icons/MaterialIcons';

const CalendarScreen = () => {
  const navigation = useNavigation();
  const { colors } = useAppTheme();
  const { t } = useLanguage();
  const { violations, loading, error, getViolations } = useViolations();
  
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [violationDates, setViolationDates] = useState([]);

  // Завантаження правопорушень при монтуванні
  useEffect(() => {
    loadViolations();
  }, []);

  // Обробка завантаження правопорушень
  const loadViolations = async () => {
    try {
      await getViolations();
    } catch (err) {
      console.error('Error loading violations:', err);
      Alert.alert(
        t('calendar.loadErrorTitle') || 'Помилка',
        t('calendar.loadErrorMessage') || 'Не вдалося завантажити правопорушення',
        [{ text: t('common.ok') || 'OK' }]
      );
    }
  };

  // Форматування дат для календаря
  useEffect(() => {
    if (violations && violations.length > 0) {
      const dates = violations.map(violation => {
        if (violation.dateTime) {
          const date = new Date(violation.dateTime);
          // Використовуємо той самий метод форматування
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        return '';
      }).filter(date => date !== '');
      
      setViolationDates(dates);
    }
  }, [violations]);

  // Обробка вибору дати в календарі
  const handleDateSelect = (dateString) => {
    setSelectedDate(dateString);
    
    // Знаходимо правопорушення для вибраної дати
    const selectedViolations = violations.filter(violation => {
      if (violation.dateTime) {
        const violationDate = new Date(violation.dateTime);
        const year = violationDate.getFullYear();
        const month = String(violationDate.getMonth() + 1).padStart(2, '0');
        const day = String(violationDate.getDate()).padStart(2, '0');
        const violationDateString = `${year}-${month}-${day}`;
        return violationDateString === dateString;
      }
      return false;
    });
    
    // Якщо є правопорушення, показуємо їх
    if (selectedViolations.length > 0) {
      showViolationsForDate(selectedViolations, dateString);
    }
  };

  // Показ правопорушень для вибраної дати
  const showViolationsForDate = (violationsList, dateString) => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('uk-UA', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    
  };

  // Отримання кількості правопорушень для дати
  const getViolationCountForDate = (dateString) => {
    return violationDates.filter(date => date === dateString).length;
  };

  // Обробка оновлення календаря
  const handleRefresh = () => {
    loadViolations();
  };

  // Обробка переходу до сьогодні
  const handleGoToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          {t('calendar.title') || 'Календар правопорушень'}
        </Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={loading}
          accessibilityLabel={t('calendar.refresh') || 'Оновити'}
        >
          <Icon 
            name={loading ? "hourglass-empty" : "refresh"} 
            size={24} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <CalendarView
          violationDates={violationDates}
          onDateSelect={handleDateSelect}
          selectedDate={selectedDate}
          currentDate={currentDate}
          onCurrentDateChange={setCurrentDate}
          style={styles.calendar}
        />
        
        {selectedDate && (
          <View style={[styles.selectedDateInfo, { backgroundColor: colors.card }]}>
            <View style={styles.selectedDateHeader}>
              <Text style={[styles.selectedDateTitle, { color: colors.text }]}>
                {t('calendar.selectedDate') || 'Вибрана дата'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedDate(null)}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.selectedDateText, { color: colors.text }]}>
              {new Date(selectedDate).toLocaleDateString('uk-UA', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                weekday: 'long'
              })}
            </Text>
            
            <Text style={[styles.violationCount, { color: colors.primary }]}>
              {getViolationCountForDate(selectedDate)} {t('calendar.violations') || 'правопорушень'}
            </Text>
            
            <TouchableOpacity
              style={[
                styles.viewButton,
                {
                  backgroundColor: getViolationCountForDate(selectedDate) === 0 ? colors.disabled : colors.primary,
                  opacity: getViolationCountForDate(selectedDate) === 0 ? 0.5 : 1,
                }
              ]}
              onPress={() => {
                // Фільтруємо правопорушення для вибраної дати
                const dateViolations = violations.filter(v => {
                  if (v.dateTime) {
                    const violationDate = new Date(v.dateTime);
                    const year = violationDate.getFullYear();
                    const month = String(violationDate.getMonth() + 1).padStart(2, '0');
                    const day = String(violationDate.getDate()).padStart(2, '0');
                    const violationDateString = `${year}-${month}-${day}`;
                    return violationDateString === selectedDate;
                  }
                  return false;
                });
                
                if (dateViolations.length > 0) {
                  // Якщо є правопорушення, переходимо до списку
                  navigation.navigate('ViolationsList', { 
                    date: selectedDate 
                  });
                }
              }}
              disabled={getViolationCountForDate(selectedDate) === 0}
            >
              <Text style={[styles.viewButtonText, { color: colors.white }]}>
                {t('calendar.viewViolations') || 'Переглянути правопорушення'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        
        {violationDates.length === 0 && !loading && (
          <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
            <Icon name="event" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              {t('calendar.noViolations') || 'Немає правопорушень для відображення'}
            </Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('MainTabs', { screen: 'add' })}
            >
              <Text style={[styles.addButtonText, { color: colors.white }]}>
                {t('calendar.addFirst') || 'Додати перше правопорушення'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  calendar: {
    marginBottom: 20,
  },
  selectedDateInfo: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  selectedDateText: {
    fontSize: 16,
    marginBottom: 8,
  },
  violationCount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  viewButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  addButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CalendarScreen;