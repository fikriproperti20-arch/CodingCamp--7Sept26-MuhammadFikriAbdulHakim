// To-Do List Life Dashboard - Main JavaScript File

// ============================================================================
// Application State
// ============================================================================
const appState = {
  user: {
    name: ""
  },
  timer: {
    duration: 1500,        // 25 minutes in seconds
    remaining: 1500,
    isRunning: false,
    intervalId: null
  },
  tasks: [],               // Array of task objects
  quickLinks: {
    instagram: "",
    tiktok: "",
    linkedin: ""
  },
  theme: "light"          // "light" or "dark"
};

// ============================================================================
// Storage Manager
// ============================================================================
const StorageManager = {
  /**
   * Load data from Local Storage
   * @param {string} key - The storage key to load from
   * @param {*} defaultValue - Default value to return if key doesn't exist or parsing fails
   * @returns {*} The parsed value or defaultValue
   */
  load(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      // Call NotificationManager if available, otherwise just log
      if (typeof NotificationManager !== 'undefined' && NotificationManager.show) {
        NotificationManager.show(`Failed to load ${key}`, 'error');
      }
      return defaultValue;
    }
  },
  
  /**
   * Save data to Local Storage
   * @param {string} key - The storage key to save to
   * @param {*} value - The value to save (will be JSON stringified)
   * @returns {boolean} True if save succeeded, false otherwise
   */
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
      
      // Handle specific error types
      if (error.name === 'QuotaExceededError') {
        if (typeof NotificationManager !== 'undefined' && NotificationManager.show) {
          NotificationManager.show('Storage quota exceeded', 'error');
        }
      } else {
        if (typeof NotificationManager !== 'undefined' && NotificationManager.show) {
          NotificationManager.show('Failed to save data', 'error');
        }
      }
      return false;
    }
  },
  
  /**
   * Check if Local Storage is available
   * @returns {boolean} True if Local Storage is available and working
   */
  isAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }
};

// ============================================================================
// Notification Manager
// ============================================================================
const NotificationManager = {
  /**
   * Show a notification to the user
   * @param {string} message - The message to display
   * @param {string} type - The type of notification ('success', 'error', 'warning', 'info')
   * @param {number} duration - How long to display the notification in milliseconds (default: 3000)
   */
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notification-container');
    if (!container) {
      console.warn('Notification container not found. Message:', message);
      return;
    }
    
    // Validate type
    const validTypes = ['success', 'error', 'warning', 'info'];
    if (!validTypes.includes(type)) {
      console.warn(`Invalid notification type: ${type}. Using 'info' instead.`);
      type = 'info';
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Set ARIA role based on type
    notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
    
    // Set the message text
    notification.textContent = message;
    
    // Add to container
    container.appendChild(notification);
    
    // Trigger animation (add after DOM insertion for CSS transition)
    // Use setTimeout to ensure the initial state is rendered before adding 'show' class
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Auto-remove after duration
    setTimeout(() => {
      // Start fade-out animation
      notification.classList.remove('show');
      
      // Remove from DOM after animation completes (300ms matches CSS transition)
      setTimeout(() => {
        if (notification.parentNode === container) {
          container.removeChild(notification);
        }
      }, 300);
    }, duration);
  }
};

// ============================================================================
// Theme Manager
// ============================================================================
const ThemeManager = {
  /**
   * Initialize the Theme Manager
   * Load saved theme and attach event listeners
   */
  init() {
    // Load saved theme or default to light
    const savedTheme = StorageManager.load('lifeDashboard_theme', 'light');
    this.applyTheme(savedTheme);
    this.attachEventListeners();
  },
  
  /**
   * Apply a theme to the document
   * @param {string} theme - The theme to apply ('light' or 'dark')
   */
  applyTheme(theme) {
    // Validate theme value
    if (theme !== 'light' && theme !== 'dark') {
      console.warn(`Invalid theme value: ${theme}. Defaulting to light mode.`);
      theme = 'light';
    }
    
    // Update DOM attribute
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update application state
    appState.theme = theme;
    
    // Update toggle button state
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      // Update aria-label for screen readers
      toggleBtn.setAttribute('aria-label', 
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      
      // Update icon
      toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  },
  
  /**
   * Toggle between light and dark themes
   */
  toggle() {
    const newTheme = appState.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    
    // Persist to Local Storage
    const saved = StorageManager.save('lifeDashboard_theme', newTheme);
    
    // Show warning if save failed
    if (!saved) {
      console.warn('Failed to save theme preference');
      NotificationManager.show('Theme changed but could not be saved', 'warning');
    }
  },
  
  /**
   * Attach event listeners to theme toggle button
   */
  attachEventListeners() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    } else {
      console.warn('Theme toggle button not found in DOM');
    }
  }
};

// ============================================================================
// Application Initialization
// ============================================================================
// This will be expanded as more components are implemented
document.addEventListener('DOMContentLoaded', () => {
  console.log('To-Do List Life Dashboard initialized');
  
  // Check if Local Storage is available
  if (!StorageManager.isAvailable()) {
    console.warn('Local Storage is not available. Data will not persist.');
    NotificationManager.show('Local Storage is not available. Your data will not be saved.', 'warning');
  }
  
  // Initialize Theme Manager
  ThemeManager.init();
});
