// src/components/calendar/CalendarView.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CALENDAR_WIDTH = SCREEN_WIDTH * 0.9;
const DAY_SIZE = (CALENDAR_WIDTH - 48) / 7;

const CalendarView = ({
  violationDates = [],
  onDateSelect,
  selectedDate,
  currentDate: propCurrentDate,
  locale = 'uk-UA',
  showWeekNumbers = false,
  minDate,
  maxDate,
  style,
  dayStyle,
  selectedDayStyle,
  violationDayStyle,
  testID,
  accessibilityLabel,
  ...restProps
}) => {
  const { colors } = useAppTheme();

  const [currentDate, setCurrentDate] = useState(
    propCurrentDate ? new Date(propCurrentDate) : new Date()
  );
  const [selected, setSelected] = useState(
    selectedDate ? new Date(selectedDate) : null
  );

  useEffect(() => {
    if (propCurrentDate) {
      setCurrentDate(new Date(propCurrentDate));
    }
  }, [propCurrentDate]);

  useEffect(() => {
    if (selectedDate) {
      setSelected(new Date(selectedDate));
    } else {
      setSelected(null);
    }
  }, [selectedDate]);

  const formatDate = (date) => {
    // Використовуємо toLocaleDateString для отримання дати в локальному часовому поясі
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const hasViolation = (date) => {
    const dateStr = formatDate(date);
    return violationDates.includes(dateStr);
  };

  const isSelected = (date) => {
    if (!selected) return false;
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  };

  const isToday = (date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isDateDisabled = (date) => {
    if (minDate && date < new Date(minDate)) return true;
    if (maxDate && date > new Date(maxDate)) return true;
    return false;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    handleDateSelect(today);
  };

  const handleDateSelect = (date) => {
    if (isDateDisabled(date)) return;
    setSelected(date);
    if (onDateSelect) {
      onDateSelect(formatDate(date));
    }
  };

  const getWeekDays = () => {
    const weekdays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return weekdays;
  };

  const getMonthNames = () => {
    const months = [
      'Січень', 'Лютий', 'Березень', 'Квітень', 'Травень', 'Червень',
      'Липень', 'Серпень', 'Вересень', 'Жовтень', 'Листопад', 'Грудень'
    ];
    return months;
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0).getDate();

    const firstDayOfWeek = firstDay.getDay();
    const lastDayOfWeek = lastDay.getDay();

    const days = [];

    for (let i = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1; i > 0; i--) {
      const date = new Date(year, month - 1, prevLastDay - i + 1);
      days.push({
        date,
        isCurrentMonth: false,
        isDisabled: isDateDisabled(date),
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isDisabled: isDateDisabled(date),
      });
    }

    const nextDays = 6 - (lastDayOfWeek === 0 ? 6 : lastDayOfWeek - 1);
    for (let i = 1; i <= nextDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isDisabled: isDateDisabled(date),
      });
    }

    return days;
  };

  const renderHeader = () => {
    const monthNames = getMonthNames();
    const currentMonth = monthNames[currentDate.getMonth()];
    const currentYear = currentDate.getFullYear();
    const colors = useAppTheme();
    return (
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={goToPreviousMonth}
          accessibilityLabel="Попередній місяць"
          accessibilityRole="button"
        >
          <Text style={[styles.navButtonText, { color: colors.primary }]}>
            ←
          </Text>
        </TouchableOpacity>
        
        <View style={styles.monthYearContainer}>
          <Text style={[styles.monthYearText, { color: colors.text }]}>
            {currentMonth} {currentYear}
          </Text>
          <TouchableOpacity
            style={styles.todayButton}
            onPress={goToToday}
            accessibilityLabel="Перейти до сьогодні"
            accessibilityRole="button"
          >
            <Text style={[styles.todayButtonText, { color: colors.primary }]}>
              Сьогодні
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={goToNextMonth}
          accessibilityLabel="Наступний місяць"
          accessibilityRole="button"
        >
          <Text style={[styles.navButtonText, { color: colors.primary }]}>
            → 
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderWeekDays = () => {
    const weekdays = getWeekDays();
    return (
      <View style={styles.weekDaysContainer}>
        {weekdays.map((day, index) => (
          <View 
            key={index} 
            style={[styles.weekDay, { width: DAY_SIZE }]}
          >
            <Text style={[styles.weekDayText, { color: colors.textSecondary }]}>
              {day}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderDays = () => {
    const days = getMonthDays();
    return (
      <View style={styles.daysContainer}>
        {days.map((dayObj, index) => {
          const { date, isCurrentMonth, isDisabled } = dayObj;
          const dayHasViolation = hasViolation(date);
          const dayIsSelected = isSelected(date);
          const dayIsToday = isToday(date);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.day,
                {
                  width: DAY_SIZE,
                  height: DAY_SIZE,
                },
                dayStyle,
                !isCurrentMonth && styles.otherMonthDay,
                dayIsSelected && [styles.selectedDay, selectedDayStyle],
                dayHasViolation && [styles.violationDay, violationDayStyle],
                isDisabled && styles.disabledDay,
                dayIsToday && styles.today,
              ]}
              onPress={() => handleDateSelect(date)}
              disabled={isDisabled}
              accessibilityLabel={`Дата ${date.getDate()} ${getMonthNames()[date.getMonth()]} ${date.getFullYear()} ${dayHasViolation ? 'з правопорушеннями' : ''}`}
              accessibilityRole="button"
              accessibilityState={{ 
                selected: dayIsSelected,
                disabled: isDisabled 
              }}
            >
              <Text style={[
                styles.dayText,
                {
                  color: dayIsSelected 
                    ? colors.white 
                    : dayHasViolation 
                      ? colors.primary 
                      : isCurrentMonth 
                        ? colors.text 
                        : colors.textSecondary,
                },
                dayIsToday && styles.todayText,
                isDisabled && { color: colors.textSecondary },
              ]}>
                {date.getDate()}
              </Text>
              {dayHasViolation && !dayIsSelected && (
                <View style={[styles.violationIndicator, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderLegend = () => {
    return (
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColorBox, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>
            З правопорушеннями
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColorBox, styles.selectedLegendBox, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>
            Вибрана дата
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColorBox, styles.todayLegendBox, { borderColor: colors.primary }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>
            Сьогодні
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View 
      style={[styles.container, { backgroundColor: colors.card }, style]}
      testID={testID}
      accessibilityLabel={accessibilityLabel || "Календар правопорушень"}
      accessibilityRole="grid"
      {...restProps}
    >
      {renderHeader()}
      {renderWeekDays()}
      <ScrollView 
        style={styles.daysScrollView}
        showsVerticalScrollIndicator={false}
      >
        {renderDays()}
        {renderLegend()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CALENDAR_WIDTH,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'center',
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
        elevation: 4,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: 8,
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  monthYearContainer: {
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  todayButton: {
    padding: 4,
  },
  todayButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  weekDaysContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  weekDay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  daysScrollView: {
    maxHeight: 350,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  day: {
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
    borderRadius: DAY_SIZE / 2,
    position: 'relative',
  },
  otherMonthDay: {
    opacity: 0.5,
  },
  selectedDay: {
    borderRadius: DAY_SIZE / 2,
  },
  violationDay: {
    backgroundColor: 'transparent',
  },
  disabledDay: {
    opacity: 0.3,
  },
  today: {
    borderWidth: 1,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  todayText: {
    fontWeight: '700',
  },
  violationIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColorBox: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  selectedLegendBox: {
    backgroundColor: 'white',
  },
  todayLegendBox: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  legendText: {
    fontSize: 12,
  },
});

export default CalendarView;