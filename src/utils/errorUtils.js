// src/utils/errorUtils.js
export const isNetworkError = (error) => {
  // Перевірка на різні типи мережевих помилок
  return (
    // Немає відповіді від сервера
    !error.response ||
    // Timeout
    error.code === 'ECONNABORTED' ||
    // Axios network error
    error.message?.includes('Network Error') ||
    error.message?.includes('timeout') ||
    error.message?.includes('ECONNREFUSED') ||
    error.message?.includes('ENOTFOUND') ||
    // Серверні помилки (5xx)
    (error.response?.status >= 500 && error.response?.status <= 599) ||
    // Request Timeout
    error.response?.status === 408 ||
    // Service Unavailable
    error.response?.status === 503 ||
    // Gateway Timeout
    error.response?.status === 504
  );
};

export const isServerUnavailable = (error) => {
  return (
    error.response?.status === 503 || // Service Unavailable
    error.response?.status === 504 || // Gateway Timeout
    error.response?.status === 502 || // Bad Gateway
    (error.response?.status >= 500 && error.response?.status <= 599) // Інші серверні помилки
  );
};