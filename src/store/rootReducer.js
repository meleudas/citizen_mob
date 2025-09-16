// Головний reducer - комбінує всі slices
import { combineReducers } from 'redux';
import authReducer from './authSlice';
import violationsReducer from './violationsSlice';
import settingsReducer from './settingsSlice';
import syncReducer from './syncSlice';

// Combine all reducers
const appReducer = combineReducers({
  auth: authReducer,
  violations: violationsReducer,
  settings: settingsReducer,
  sync: syncReducer,
});

// Root reducer with reset functionality
const rootReducer = (state, action) => {
  // Reset app state when user logs out
  if (action.type === 'auth/logout/fulfilled' || action.type === 'RESET_APP') {
    // Keep settings and other persistent data
    const { settings } = state;
    state = { settings };
  }
  
  return appReducer(state, action);
};

export default rootReducer;