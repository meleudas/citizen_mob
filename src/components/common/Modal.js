// src/components/common/Modal.js
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Modal as RNModal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useAppTheme } from '../../hooks/useTheme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const Modal = ({
  // Основні пропси
  visible = false,
  onClose,
  children,
  
  // Стилізація
  size = 'medium', // small, medium, large, fullscreen
  title,
  showCloseButton = true,
  closeIcon,
  
  // Анімація
  animationType = 'slide', // fade, slide, none
  animationDuration = 300,
  
  // Скролл
  scrollable = false,
  showsVerticalScrollIndicator = true,
  
  // Accessibility
  testID,
  accessibilityLabel,
  accessibilityViewIsModal = true,
  
  // Стилі
  style,
  contentStyle,
  titleStyle,
  overlayStyle,
  closeButtonStyle,
  
  // Події
  onShow,
  onDismiss,
  ...restProps
}) => {
  const { colors } = useAppTheme();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const scrollViewRef = useRef(null);

  // Визначення розмірів модального вікна
  const getSizeStyle = () => {
    const maxWidth = SCREEN_WIDTH - 32;
    const maxHeight = SCREEN_HEIGHT * 0.8;
    
    switch (size) {
      case 'small':
        return {
          width: Math.min(300, maxWidth),
          maxHeight: maxHeight * 0.6,
        };
      case 'large':
        return {
          width: Math.min(500, maxWidth),
          maxHeight: maxHeight * 1.2,
        };
      case 'fullscreen':
        return {
          width: SCREEN_WIDTH,
          height: SCREEN_HEIGHT,
          maxWidth: '100%',
          maxHeight: '100%',
          margin: 0,
          borderRadius: 0,
        };
      case 'medium':
      default:
        return {
          width: Math.min(400, maxWidth),
          maxHeight: maxHeight,
        };
    }
  };

  const sizeStyle = getSizeStyle();

  // Анімація появи/зникнення
  useEffect(() => {
    if (visible) {
      // Показати з анімацією
      const animations = [];
      
      if (animationType === 'fade' || animationType === 'slide') {
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: animationDuration,
            useNativeDriver: true,
          })
        );
      }
      
      if (animationType === 'slide') {
        animations.push(
          Animated.spring(slideAnim, {
            toValue: 0,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
          })
        );
      } else {
        animations.push(
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
          })
        );
      }
      
      Animated.parallel(animations).start();
      
      // Accessibility focus
      if (Platform.OS === 'ios') {
        // Тут можна додати фокус на перший елемент
      }
    } else {
      // Приховати з анімацією
      const animations = [];
      
      if (animationType === 'fade' || animationType === 'slide') {
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: animationDuration,
            useNativeDriver: true,
          })
        );
      }
      
      if (animationType === 'slide') {
        animations.push(
          Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: animationDuration,
            useNativeDriver: true,
          })
        );
      } else {
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: animationDuration,
            useNativeDriver: true,
          })
        );
      }
      
      Animated.parallel(animations).start();
    }
  }, [visible, animationType, animationDuration]);

  // Обробка закриття модального вікна
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  // Рендер кнопки закриття
  const renderCloseButton = () => {
    if (!showCloseButton) return null;

    return (
      <TouchableOpacity
        style={[styles.closeButton, { backgroundColor: colors.card }, closeButtonStyle]}
        onPress={handleClose}
        accessibilityLabel="Закрити модальне вікно"
        accessibilityRole="button"
        activeOpacity={0.7}
      >
        {closeIcon ? (
          React.cloneElement(closeIcon, {
            style: [
              closeIcon.props.style,
              { color: colors.text },
            ],
          })
        ) : (
          <Text style={[styles.closeIcon, { color: colors.text }]}>✕</Text>
        )}
      </TouchableOpacity>
    );
  };

  // Рендер заголовка
  const renderTitle = () => {
    if (!title) return null;

    return (
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }, titleStyle]}>
          {title}
        </Text>
        {renderCloseButton()}
      </View>
    );
  };

  // Стилі для контейнера модального вікна
  const modalContainerStyle = [
    styles.modalContainer,
    {
      backgroundColor: colors.card,
      ...sizeStyle,
    },
    style,
  ];

  // Стилі для контенту
  const contentContainerStyle = [
    styles.contentContainer,
    !title && showCloseButton && styles.contentWithCloseButton,
    contentStyle,
  ];

  // Рендер контенту
  const renderContent = () => {
    const content = (
      <View style={contentContainerStyle}>
        {children}
      </View>
    );

    if (scrollable) {
      return (
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      );
    }

    return content;
  };

  // Визначення типу анімації для RNModal
  const getModalAnimationType = () => {
    if (animationType === 'none') return 'none';
    return 'none'; // Ми використовуємо кастомні анімації
  };

  return (
    <RNModal
      visible={visible}
      transparent={true}
      animationType={getModalAnimationType()}
      onRequestClose={handleClose}
      onShow={onShow}
      onDismiss={onDismiss}
      statusBarTranslucent={true}
      hardwareAccelerated={true}
      testID={testID}
      accessibilityViewIsModal={accessibilityViewIsModal}
      accessibilityLabel={accessibilityLabel}
      {...restProps}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Фонове затемнення */}
        <Animated.View
          style={[
            styles.overlay,
            overlayStyle,
            animationType !== 'none' && {
              opacity: fadeAnim,
            },
          ]}
          onTouchEnd={handleClose}
        >
          {/* Контент модального вікна */}
          <Animated.View
            style={[
              modalContainerStyle,
              animationType === 'slide' && {
                transform: [{ translateY: slideAnim }],
              },
              animationType !== 'slide' && animationType !== 'none' && {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
            accessibilityViewIsModal={true}
          >
            {renderTitle()}
            {!title && showCloseButton && (
              <View style={styles.closeButtonContainer}>
                {renderCloseButton()}
              </View>
            )}
            {renderContent()}
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    borderRadius: 12,
    maxHeight: SCREEN_HEIGHT * 0.8,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButtonContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 1,
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  closeIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    flex: 1,
  },
  contentWithCloseButton: {
    paddingTop: 40,
  },
});

export default Modal;