// src/components/common/Picker.js
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { useThemeColors } from '../../hooks/useTheme';

// Іконка стрілки вниз (можна замінити на реальну іконку, наприклад з react-native-vector-icons)
const ChevronDownIcon = ({ color, size = 16 }) => (
  <Text style={[styles.chevron, { color, fontSize: size }]}>▼</Text>
);

// Іконка галочки (можна замінити на реальну іконку)
const CheckIcon = ({ color, size = 16 }) => (
  <Text style={[styles.check, { color, fontSize: size }]}>✓</Text>
);

const Picker = ({
  selectedValue,
  onValueChange,
  items,
  placeholder = "Оберіть значення",
  disabled = false,
  style,
  accessibilityLabel,
}) => {
  const { colors } = useThemeColors();
  const [isVisible, setIsVisible] = useState(false);

  // Знаходимо обраний елемент
  const selectedItem = items.find(item => item.value === selectedValue);

  // Обробка вибору елемента
  const handleSelect = (value) => {
    onValueChange(value);
    setIsVisible(false);
  };

  return (
    <View style={style}>
      {/* Кнопка для відкриття піckerа */}
      <TouchableOpacity
        style={[styles.pickerButton, { 
          backgroundColor: colors.card,
          borderColor: colors.border,
        }]}
        onPress={() => !disabled && setIsVisible(true)}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="combobox"
        accessibilityState={{ disabled }}
      >
        <Text 
          style={[
            styles.pickerText, 
            { 
              color: selectedItem ? colors.text : colors.textSecondary,
            },
            !selectedItem && styles.placeholderText
          ]}
          numberOfLines={1}
        >
          {selectedItem ? selectedItem.label : placeholder}
        </Text>
        <ChevronDownIcon color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Модальне вікно зі списком варіантів */}
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsVisible(false)}
        >
          <View 
            style={[styles.modalContent, { 
              backgroundColor: colors.card,
              borderColor: colors.border,
            }]}
          >
            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={styles.scrollView}
            >
              {items.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.option, { borderBottomColor: colors.border }]}
                  onPress={() => handleSelect(item.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.value === selectedValue }}
                >
                  <Text 
                    style={[
                      styles.optionText, 
                      { 
                        color: item.value === selectedValue ? colors.primary : colors.text,
                        fontWeight: item.value === selectedValue ? '600' : 'normal',
                      }
                    ]}
                  >
                    {item.label}
                  </Text>
                  {item.value === selectedValue && (
                    <CheckIcon color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 48,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    marginRight: 8,
  },
  placeholderText: {
    fontStyle: 'italic',
  },
  chevron: {
    // Стилі для іконки стрілки
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '50%',
    borderRadius: 12,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  scrollView: {
    // paddingVertical: 8, // Додати відступи, якщо потрібно
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  },
  check: {
    marginLeft: 12,
    // Стилі для іконки галочки
  },
});

export default Picker;