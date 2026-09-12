// Node.js test for StorageManager
// This test simulates localStorage behavior for testing purposes

// ============================================================================
// LocalStorage Mock for Node.js
// ============================================================================
class LocalStorageMock {
  constructor() {
    this.store = {};
  }

  getItem(key) {
    return this.store[key] || null;
  }

  setItem(key, value) {
    // Simulate quota exceeded error if total storage > 5MB
    const totalSize = JSON.stringify(this.store).length + value.length;
    if (totalSize > 5 * 1024 * 1024) {
      const error = new Error('QuotaExceededError');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.store[key] = String(value);
  }

  removeItem(key) {
    delete this.store[key];
  }

  clear() {
    this.store = {};
  }
}

// Setup global localStorage
global.localStorage = new LocalStorageMock();

// ============================================================================
// Application State
// ============================================================================
const appState = {
  user: {
    name: ""
  },
  timer: {
    duration: 1500,
    remaining: 1500,
    isRunning: false,
    intervalId: null
  },
  tasks: [],
  quickLinks: {
    instagram: "",
    tiktok: "",
    linkedin: ""
  },
  theme: "light"
};

// ============================================================================
// Notification Manager Mock
// ============================================================================
const NotificationManager = {
  messages: [],
  show(message, type = 'info', duration = 3000) {
    this.messages.push({ message, type, duration });
    console.log(`[${type.toUpperCase()}] ${message}`);
  },
  clear() {
    this.messages = [];
  }
};

// ============================================================================
// Storage Manager (from script.js)
// ============================================================================
const StorageManager = {
  load(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      if (typeof NotificationManager !== 'undefined' && NotificationManager.show) {
        NotificationManager.show(`Failed to load ${key}`, 'error');
      }
      return defaultValue;
    }
  },
  
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
      
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
// Test Framework
// ============================================================================
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(name, testFn) {
  testCount++;
  try {
    // Clear storage and notifications before each test
    localStorage.clear();
    NotificationManager.clear();
    
    testFn();
    passCount++;
    console.log(`✓ ${name}`);
  } catch (error) {
    failCount++;
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message || 'Values not equal'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ============================================================================
// Test Suite
// ============================================================================

console.log('Running StorageManager Tests\n');
console.log('=' .repeat(60));

// Test 1: isAvailable()
test('isAvailable() returns true when storage is available', () => {
  const result = StorageManager.isAvailable();
  assert(typeof result === 'boolean', 'isAvailable should return a boolean');
  assert(result === true, 'Local Storage should be available');
});

// Test 2: Save and load string
test('save() and load() work with string values', () => {
  const key = 'test_string';
  const value = 'Hello, World!';
  
  const saveResult = StorageManager.save(key, value);
  assert(saveResult === true, 'save should return true on success');
  
  const loadedValue = StorageManager.load(key, null);
  assertEqual(loadedValue, value, 'Loaded value should match saved value');
});

// Test 3: Save and load number
test('save() and load() work with number values', () => {
  const key = 'test_number';
  const value = 42;
  
  const saveResult = StorageManager.save(key, value);
  assert(saveResult === true, 'save should return true on success');
  
  const loadedValue = StorageManager.load(key, null);
  assertEqual(loadedValue, value, 'Loaded value should match saved value');
  assert(typeof loadedValue === 'number', 'Loaded value should be a number');
});

// Test 4: Save and load object
test('save() and load() work with object values', () => {
  const key = 'test_object';
  const value = {
    name: 'John Doe',
    age: 30,
    tasks: ['task1', 'task2']
  };
  
  const saveResult = StorageManager.save(key, value);
  assert(saveResult === true, 'save should return true on success');
  
  const loadedValue = StorageManager.load(key, null);
  assertEqual(loadedValue, value, 'Loaded object should match saved object');
});

// Test 5: Save and load array
test('save() and load() work with array values', () => {
  const key = 'test_array';
  const value = [1, 2, 3, 'four', { five: 5 }];
  
  const saveResult = StorageManager.save(key, value);
  assert(saveResult === true, 'save should return true on success');
  
  const loadedValue = StorageManager.load(key, null);
  assertEqual(loadedValue, value, 'Loaded array should match saved array');
});

// Test 6: Load non-existent key returns default
test('load() returns default value when key does not exist', () => {
  const key = 'non_existent_key_12345';
  const defaultValue = 'default';
  
  const loadedValue = StorageManager.load(key, defaultValue);
  assertEqual(loadedValue, defaultValue, 'load should return default value for non-existent key');
});

// Test 7: Load with null returns default
test('load() returns default value when item is null', () => {
  const key = 'test_null_key';
  const defaultValue = { empty: true };
  
  const loadedValue = StorageManager.load(key, defaultValue);
  assertEqual(loadedValue, defaultValue, 'load should return default value when item is null');
});

// Test 8: Load corrupted JSON returns default
test('load() returns default value for corrupted JSON data', () => {
  const key = 'test_corrupted';
  const defaultValue = 'fallback';
  
  // Manually set corrupted JSON data
  localStorage.setItem(key, '{invalid json');
  
  const loadedValue = StorageManager.load(key, defaultValue);
  assertEqual(loadedValue, defaultValue, 'load should return default value for corrupted JSON');
});

// Test 9: Save and load boolean
test('save() and load() work with boolean values', () => {
  const key = 'test_boolean';
  const value = true;
  
  const saveResult = StorageManager.save(key, value);
  assert(saveResult === true, 'save should return true on success');
  
  const loadedValue = StorageManager.load(key, null);
  assertEqual(loadedValue, value, 'Loaded boolean should match saved boolean');
  assert(typeof loadedValue === 'boolean', 'Loaded value should be a boolean');
});

// Test 10: Save and load null
test('save() and load() work with null values', () => {
  const key = 'test_null';
  const value = null;
  
  const saveResult = StorageManager.save(key, value);
  assert(saveResult === true, 'save should return true on success');
  
  const loadedValue = StorageManager.load(key, 'default');
  assertEqual(loadedValue, value, 'Loaded null should be null');
});

// Test 11: Multiple keys
test('save() and load() work with multiple keys', () => {
  const keys = ['key1', 'key2', 'key3'];
  const values = ['value1', 123, { data: 'test' }];
  
  // Save all
  keys.forEach((key, index) => {
    const saveResult = StorageManager.save(key, values[index]);
    assert(saveResult === true, `save should return true for ${key}`);
  });
  
  // Load all and verify
  keys.forEach((key, index) => {
    const loadedValue = StorageManager.load(key, null);
    assertEqual(loadedValue, values[index], `Loaded value should match for ${key}`);
  });
});

// Test 12: Empty string
test('save() and load() work with empty string', () => {
  const key = 'test_empty_string';
  const value = '';
  
  const saveResult = StorageManager.save(key, value);
  assert(saveResult === true, 'save should return true on success');
  
  const loadedValue = StorageManager.load(key, 'default');
  assertEqual(loadedValue, value, 'Loaded value should be empty string');
});

// Test 13: Deeply nested objects
test('save() and load() work with deeply nested objects', () => {
  const key = 'test_nested';
  const value = {
    level1: {
      level2: {
        level3: {
          data: [1, 2, 3],
          flag: true
        }
      }
    }
  };
  
  const saveResult = StorageManager.save(key, value);
  assert(saveResult === true, 'save should return true on success');
  
  const loadedValue = StorageManager.load(key, null);
  assertEqual(loadedValue, value, 'Loaded nested object should match saved nested object');
});

// Test 14: Application-specific keys
test('Application-specific storage keys work correctly', () => {
  // Test user name
  const userName = 'John Doe';
  StorageManager.save('lifeDashboard_user', userName);
  const loadedName = StorageManager.load('lifeDashboard_user', '');
  assertEqual(loadedName, userName, 'User name should persist');
  
  // Test tasks
  const tasks = [
    { id: '1', description: 'Task 1', completed: false },
    { id: '2', description: 'Task 2', completed: true }
  ];
  StorageManager.save('lifeDashboard_tasks', tasks);
  const loadedTasks = StorageManager.load('lifeDashboard_tasks', []);
  assertEqual(loadedTasks, tasks, 'Tasks should persist');
  
  // Test quick links
  const quickLinks = {
    instagram: 'https://instagram.com/user',
    tiktok: 'https://tiktok.com/@user',
    linkedin: 'https://linkedin.com/in/user'
  };
  StorageManager.save('lifeDashboard_quickLinks', quickLinks);
  const loadedLinks = StorageManager.load('lifeDashboard_quickLinks', {});
  assertEqual(loadedLinks, quickLinks, 'Quick links should persist');
  
  // Test theme
  const theme = 'dark';
  StorageManager.save('lifeDashboard_theme', theme);
  const loadedTheme = StorageManager.load('lifeDashboard_theme', 'light');
  assertEqual(loadedTheme, theme, 'Theme should persist');
});

// Test 15: QuotaExceededError handling
test('save() returns false and shows notification on QuotaExceededError', () => {
  const key = 'test_quota';
  // Create a large string that exceeds the mock storage limit
  const largeValue = 'x'.repeat(6 * 1024 * 1024); // 6MB
  
  const saveResult = StorageManager.save(key, largeValue);
  assert(saveResult === false, 'save should return false on quota exceeded');
  
  // Check that notification was shown
  const quotaNotification = NotificationManager.messages.find(m => 
    m.message === 'Storage quota exceeded' && m.type === 'error'
  );
  assert(quotaNotification !== undefined, 'Should show quota exceeded notification');
});

// Test 16: Error notification on corrupted data load
test('load() shows error notification on corrupted data', () => {
  const key = 'test_corrupted_notification';
  const defaultValue = 'fallback';
  
  // Set corrupted data
  localStorage.setItem(key, '{invalid json');
  
  const loadedValue = StorageManager.load(key, defaultValue);
  assertEqual(loadedValue, defaultValue, 'Should return default value');
  
  // Check that error notification was shown
  const errorNotification = NotificationManager.messages.find(m => 
    m.message.includes('Failed to load') && m.type === 'error'
  );
  assert(errorNotification !== undefined, 'Should show error notification on corrupted data');
});

// ============================================================================
// Test Summary
// ============================================================================

console.log('=' .repeat(60));
console.log(`\nTest Results:`);
console.log(`  Total: ${testCount}`);
console.log(`  Passed: ${passCount}`);
console.log(`  Failed: ${failCount}`);
console.log(`  Success Rate: ${((passCount / testCount) * 100).toFixed(1)}%`);

if (failCount === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.log(`\n✗ ${failCount} test(s) failed`);
  process.exit(1);
}
