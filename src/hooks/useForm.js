// src/hooks/useForm.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useForm = (initialValues = {}, validationSchema = null) => {
  // Стани форми
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  
  // Refs для debounce
  const debounceTimers = useRef({});
  const fieldRefs = useRef({});

  // Перевірка валідності форми
  const validateForm = useCallback(async () => {
    if (!validationSchema) {
      setIsValid(true);
      return true;
    }

    try {
      await validationSchema.validate(values, { abortEarly: false });
      setErrors({});
      setIsValid(true);
      return true;
    } catch (err) {
      if (err.inner) {
        const newErrors = {};
        err.inner.forEach(error => {
          newErrors[error.path] = error.message;
        });
        setErrors(newErrors);
      }
      setIsValid(false);
      return false;
    }
  }, [values, validationSchema]);

  // Валідація окремого поля
  const validateField = useCallback(async (name, value) => {
    if (!validationSchema) return true;

    try {
      await validationSchema.validateAt(name, { ...values, [name]: value });
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
      return true;
    } catch (err) {
      setErrors(prev => ({
        ...prev,
        [name]: err.message
      }));
      return false;
    }
  }, [values, validationSchema]);

  // Оновлення значення поля
  const setValue = useCallback((name, value, shouldValidate = true) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Оновлення dirty стану
    if (JSON.stringify(initialValues[name]) !== JSON.stringify(value)) {
      setIsDirty(true);
    }
    
    // Валідація з debounce
    if (shouldValidate) {
      // Очищення попереднього таймера
      if (debounceTimers.current[name]) {
        clearTimeout(debounceTimers.current[name]);
      }
      
      // Встановлення нового таймера
      debounceTimers.current[name] = setTimeout(() => {
        validateField(name, value);
      }, 300); // 300ms debounce
    }
  }, [initialValues, validateField]);

  // Отримання значення поля
  const getValue = useCallback((name) => {
    return values[name];
  }, [values]);

  // Реєстрація поля - виправлення для кращої сумісності
  const registerField = useCallback((name, options = {}) => {
    const {
      defaultValue,
      validate,
      required = false,
      minLength,
      maxLength,
      pattern,
      ...rest
    } = options;

    // Встановлення початкового значення
    if (defaultValue !== undefined && values[name] === undefined) {
      setValues(prev => ({ ...prev, [name]: defaultValue }));
    }

    fieldRefs.current[name] = {
      validate,
      required,
      minLength,
      maxLength,
      pattern,
      ...rest
    };

    return {
      value: values[name] || '',
      error: errors[name],
      touched: !!touched[name],
      // Виправлення: забезпечуємо сумісність з TextInput
      onChange: (text) => {
        // Якщо передається об'єкт події, витягуємо текст
        const value = typeof text === 'object' && text?.nativeEvent?.text !== undefined 
          ? text.nativeEvent.text 
          : text;
        setValue(name, value);
      },
      onChangeText: (text) => setValue(name, text), // Для TextInput
      onBlur: () => setTouched(prev => ({ ...prev, [name]: true })),
      ...rest
    };
  }, [values, errors, touched, setValue]);

  // Встановлення помилки для поля
  const setError = useCallback((name, error) => {
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
  }, []);

  // Очищення помилки для поля
  const clearError = useCallback((name) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  }, []);

  // Обробка сабміту форми
  const handleSubmit = useCallback((onSubmit) => {
    return async (e) => {
      if (e && e.preventDefault) {
        e.preventDefault();
      }

      try {
        console.log('📤 [useForm.handleSubmit] === ПОЧАТОК САБМІТУ ===');
        console.log('📤 [useForm.handleSubmit] Поточні значення форми:', values);
        
        setIsSubmitting(true);
        setSubmitCount(prev => prev + 1);
        
        // Позначаємо всі поля як торкануті
        const allFields = Object.keys(values);
        console.log('📤 [useForm.handleSubmit] Всі поля:', allFields);
        setTouched(allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}));
        
        // Валідація форми
        console.log('📤 [useForm.handleSubmit] Валідація форми...');
        const isValidForm = await validateForm();
        console.log('📤 [useForm.handleSubmit] Результат валідації:', isValidForm);
        
        if (isValidForm) {
          console.log('📤 [useForm.handleSubmit] Виклик onSubmit з даними:', values);
          await onSubmit(values);
          console.log('📤 [useForm.handleSubmit] onSubmit завершено успішно');
          return { success: true };
        } else {
          console.log('📤 [useForm.handleSubmit] Форма не валідна, помилки:', errors);
          return { success: false, errors };
        }
      } catch (err) {
        console.error('💥 [useForm.handleSubmit] ПОМИЛКА САБМІТУ:', err);
        return { success: false, error: err.message };
      } finally {
        setIsSubmitting(false);
        console.log('📤 [useForm.handleSubmit] === ЗАВЕРШЕННЯ САБМІТУ ===');
      }
    };
  }, [values, errors, validateForm]);

  // Скидання форми
  const resetForm = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
    setIsValid(false);
    setIsDirty(false);
    setSubmitCount(0);
    
    // Очищення debounce таймерів
    Object.values(debounceTimers.current).forEach(timer => {
      clearTimeout(timer);
    });
    debounceTimers.current = {};
  }, [initialValues]);

  // Скидання конкретного поля
  const resetField = useCallback((name) => {
    setValues(prev => ({ ...prev, [name]: initialValues[name] || '' }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
    setTouched(prev => {
      const newTouched = { ...prev };
      delete newTouched[name];
      return newTouched;
    });
    
    if (debounceTimers.current[name]) {
      clearTimeout(debounceTimers.current[name]);
      delete debounceTimers.current[name];
    }
  }, [initialValues]);

  // Перевірка, чи поле має помилку
  const hasError = useCallback((name) => {
    return !!errors[name] && !!touched[name];
  }, [errors, touched]);

  // Отримання помилки поля
  const getFieldError = useCallback((name) => {
    return touched[name] ? errors[name] : null;
  }, [errors, touched]);

  // Встановлення всіх значень
  const setAllValues = useCallback((newValues) => {
    setValues(newValues);
    setIsDirty(true);
  }, []);

  // Очищення форми
  const clearForm = useCallback(() => {
    setValues({});
    setErrors({});
    setTouched({});
    setIsValid(false);
    setIsDirty(false);
  }, []);

  // Ефект для валідації при зміні значень
  useEffect(() => {
    if (Object.keys(values).length > 0) {
      validateForm();
    }
  }, [values, validateForm]);

  // Очищення таймерів при демонтажі
  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach(timer => {
        clearTimeout(timer);
      });
    };
  }, []);

  return {
    // Стани
    values,
    errors,
    touched,
    isValid,
    isSubmitting,
    isDirty,
    submitCount,
    
    // Основні функції
    registerField,
    setValue,
    getValue,
    validateField,
    validateForm,
    handleSubmit,
    resetForm,
    resetField,
    setError,
    clearError,
    hasError,
    getFieldError,
    setAllValues,
    clearForm,
    
    // Утиліти
    register: registerField, // Альтернативне ім'я для зручності
  };
};

// Хелпер для кастомної валідації
export const useValidation = () => {
  // Валідація email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };



  // Валідація пароля
  const validatePassword = (password) => {
    return password.length >= 6;
  };

  // Валідація довжини
  const validateLength = (value, min, max) => {
    const length = value ? value.length : 0;
    return length >= min && (max === undefined || length <= max);
  };

  // Валідація обов'язкового поля
  const validateRequired = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  };

  return {
    validateEmail,
    validatePhone,
    validatePassword,
    validateLength,
    validateRequired,
  };
};

// Хелпер для роботи з масивами в формах
export const useArrayField = (fieldName, useFormReturn) => {
  const { values, setValue } = useFormReturn;
  
  const arrayValue = values[fieldName] || [];
  
  const push = useCallback((item) => {
    setValue(fieldName, [...arrayValue, item]);
  }, [arrayValue, fieldName, setValue]);
  
  const remove = useCallback((index) => {
    setValue(fieldName, arrayValue.filter((_, i) => i !== index));
  }, [arrayValue, fieldName, setValue]);
  
  const insert = useCallback((index, item) => {
    const newArray = [...arrayValue];
    newArray.splice(index, 0, item);
    setValue(fieldName, newArray);
  }, [arrayValue, fieldName, setValue]);
  
  const replace = useCallback((index, item) => {
    const newArray = [...arrayValue];
    newArray[index] = item;
    setValue(fieldName, newArray);
  }, [arrayValue, fieldName, setValue]);
  
  const move = useCallback((from, to) => {
    const newArray = [...arrayValue];
    const [item] = newArray.splice(from, 1);
    newArray.splice(to, 0, item);
    setValue(fieldName, newArray);
  }, [arrayValue, fieldName, setValue]);
  
  return {
    value: arrayValue,
    push,
    remove,
    insert,
    replace,
    move,
    length: arrayValue.length,
  };
};

// Хелпер для асинхронної валідації
export const useAsyncValidation = () => {
  const [validating, setValidating] = useState({});
  
  const validateAsync = useCallback(async (fieldName, value, validator) => {
    try {
      setValidating(prev => ({ ...prev, [fieldName]: true }));
      const result = await validator(value);
      setValidating(prev => ({ ...prev, [fieldName]: false }));
      return result;
    } catch (error) {
      setValidating(prev => ({ ...prev, [fieldName]: false }));
      throw error;
    }
  }, []);
  
  return {
    validating,
    validateAsync,
  };
};