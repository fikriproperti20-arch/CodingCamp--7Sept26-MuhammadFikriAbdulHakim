# Technical Design Document

## Overview

The To-Do List Life Dashboard is a client-side web application that provides a minimal, elegant productivity dashboard combining personalized greetings, a Pomodoro focus timer, task management, quick access links, and theme customization. The application is implemented using vanilla web technologies (HTML5, CSS3, JavaScript) with no external dependencies, targeting beginner-friendly code that demonstrates core web development concepts.

### Design Philosophy

The design prioritizes:
- **Simplicity**: Single-page application with three files (HTML, CSS, JS)
- **Vanilla First**: No frameworks or libraries—pure browser APIs only
- **Progressive Enhancement**: Core functionality works even if Local Storage fails
- **Accessibility**: WCAG AA compliance with keyboard navigation and screen reader support
- **Performance**: Fast initial load (<2s on 5Mbps connection) and responsive interactions (<100ms feedback)
- **Responsive Design**: Fluid layouts from 320px to 1920px with 768px breakpoint

### Technology Stack

- **HTML5**: Semantic markup with ARIA attributes
- **CSS3**: CSS Grid and Flexbox for layout, CSS Custom Properties for theming
- **JavaScript (ES6+)**: Modern features (const/let, arrow functions, template literals, destructuring)
- **Local Storage API**: Client-side data persistence
- **Browser APIs**: Date, setInterval, setTimeout, DOM manipulation

## Architecture

### Component Architecture

The application follows a modular component pattern where each widget is self-contained with its own initialization, rendering, and state management logic:

```
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard (Main)                        │
│  - Initializes all components                                │
│  - Coordinates theme application                             │
│  - Handles global error notifications                        │
└─────────────────────────────────────────────────────────────┘
                              |
        ┌─────────────────────┼─────────────────────────┐
        |                     |                         |
        v                     v                         v
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Greeting     │    │  Timer Widget    │    │  Task Manager    │
│ Widget       │    │  - Timer state   │    │  - Task CRUD     │
│ - Clock      │    │  - Start/Stop    │    │  - Validation    │
│ - Greeting   │    │  - Progress bar  │    │  - Duplicate     │
│ - Name input │    │  - Notifications │    │    detection     │
└──────────────┘    └──────────────────┘    └──────────────────┘
        |                                             |
        v                                             v
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Quick Links  │    │  Theme Manager   │    │  Storage Manager │
│ Widget       │    │  - Light/Dark    │    │  - Save/Load     │
│ - 3 links    │    │  - CSS vars      │    │  - Error handling│
│ - URL config │    │  - Toggle        │    │  - Validation    │
└──────────────┘    └──────────────────┘    └──────────────────┘
```

### State Management

The application uses a simple centralized state object that holds all application data:

```javascript
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
```

Each component reads from and updates this central state object. After state changes that require persistence, the component calls the appropriate Storage Manager function to persist the data.

### Module Organization

The JavaScript file is organized into logical modules using IIFE (Immediately Invoked Function Expression) pattern or simple object namespacing:

1. **StorageManager**: Handles all Local Storage operations
2. **ThemeManager**: Manages theme switching and CSS variable updates
3. **GreetingWidget**: Displays greeting, date, clock, and handles name input
4. **TimerWidget**: Manages Pomodoro timer functionality
5. **TaskManager**: Handles task CRUD operations
6. **QuickLinksWidget**: Manages quick link display and configuration
7. **NotificationManager**: Displays error and success messages
8. **App**: Main initialization and coordination

## Components and Interfaces

### 1. Storage Manager

**Responsibility**: Centralized Local Storage operations with error handling

**Key Functions**:

```javascript
StorageManager = {
  // Load data from Local Storage
  load(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error(`Failed to load ${key}:`, error);
      NotificationManager.show(`Failed to load ${key}`, 'error');
      return defaultValue;
    }
  },
  
  // Save data to Local Storage
  save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Failed to save ${key}:`, error);
      if (error.name === 'QuotaExceededError') {
        NotificationManager.show('Storage quota exceeded', 'error');
      } else {
        NotificationManager.show('Failed to save data', 'error');
      }
      return false;
    }
  },
  
  // Check if Local Storage is available
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
```

**Storage Keys**:
- `lifeDashboard_user`: User's name (string)
- `lifeDashboard_tasks`: Array of task objects
- `lifeDashboard_quickLinks`: Object with Instagram, TikTok, LinkedIn URLs
- `lifeDashboard_theme`: "light" or "dark"

**Error Handling**:
- Catches `QuotaExceededError` for full storage
- Catches JSON parse errors for corrupted data
- Falls back to default values on read failure
- Returns boolean success indicator on write operations

### 2. Theme Manager

**Responsibility**: Toggle between light and dark themes using CSS Custom Properties

**CSS Custom Properties**:

```css
:root {
  /* Light mode (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --border-color: #e0e0e0;
  --accent-color: #4a90e2;
  --accent-hover: #357abd;
  --success-color: #4caf50;
  --error-color: #f44336;
  --warning-color: #ff9800;
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --border-color: #404040;
  --accent-color: #5b9fd8;
  --accent-hover: #4a8fc7;
  --success-color: #66bb6a;
  --error-color: #ef5350;
  --warning-color: #ffa726;
}
```

**Key Functions**:

```javascript
ThemeManager = {
  init() {
    // Load saved theme or default to light
    const savedTheme = StorageManager.load('lifeDashboard_theme', 'light');
    this.applyTheme(savedTheme);
    this.attachEventListeners();
  },
  
  applyTheme(theme) {
    // Validate theme value
    if (theme !== 'light' && theme !== 'dark') {
      theme = 'light';
    }
    
    // Update DOM
    document.documentElement.setAttribute('data-theme', theme);
    appState.theme = theme;
    
    // Update toggle button state
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.setAttribute('aria-label', 
        theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
      toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
  },
  
  toggle() {
    const newTheme = appState.theme === 'light' ? 'dark' : 'light';
    this.applyTheme(newTheme);
    StorageManager.save('lifeDashboard_theme', newTheme);
  },
  
  attachEventListeners() {
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggle());
    }
  }
};
```

**Transition Timing**: Theme changes apply in a single frame (≤16ms) by updating CSS custom properties, with optional CSS transitions on individual elements (max 200ms).

### 3. Greeting Widget

**Responsibility**: Display time-based greeting, user name, date, and live clock

**Key Functions**:

```javascript
GreetingWidget = {
  init() {
    this.loadUserName();
    this.updateGreeting();
    this.updateDateTime();
    this.startClock();
    this.attachEventListeners();
  },
  
  getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  },
  
  formatUserName(name) {
    if (!name || name.trim() === '') return '';
    const trimmed = name.trim();
    if (trimmed.length > 50) {
      return trimmed.substring(0, 47) + '...';
    }
    return trimmed;
  },
  
  updateGreeting() {
    const greeting = this.getGreeting();
    const formattedName = this.formatUserName(appState.user.name);
    const greetingText = formattedName 
      ? `${greeting}, ${formattedName}!` 
      : `${greeting}!`;
    
    const greetingElement = document.getElementById('greeting-text');
    if (greetingElement) {
      greetingElement.textContent = greetingText;
    }
  },
  
  updateDateTime() {
    const now = new Date();
    
    // Format date: "January 15, 2024"
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', dateOptions);
    
    // Format time: "14:35:22"
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeString = `${hours}:${minutes}:${seconds}`;
    
    // Update DOM
    const dateElement = document.getElementById('current-date');
    const timeElement = document.getElementById('current-time');
    
    if (dateElement) dateElement.textContent = dateString;
    if (timeElement) timeElement.textContent = timeString;
  },
  
  startClock() {
    // Update every second
    setInterval(() => {
      const currentHour = new Date().getHours();
      const previousHour = appState.previousHour || currentHour;
      
      // Update time display
      this.updateDateTime();
      
      // Check if hour changed and update greeting
      if (currentHour !== previousHour) {
        this.updateGreeting();
        appState.previousHour = currentHour;
      }
    }, 1000);
  },
  
  handleNameSubmit(event) {
    event.preventDefault();
    const input = document.getElementById('user-name-input');
    const name = input.value;
    
    // Validation
    if (name.trim() === '') {
      NotificationManager.show('Name cannot be empty', 'error');
      return;
    }
    
    // Truncate if exceeds 50 characters
    const finalName = name.length > 50 ? name.substring(0, 50) : name;
    
    // Update state and persist
    appState.user.name = finalName.trim();
    StorageManager.save('lifeDashboard_user', appState.user.name);
    
    // Update display
    this.updateGreeting();
    
    // Clear input
    input.value = '';
    
    NotificationManager.show('Name saved successfully', 'success');
  },
  
  loadUserName() {
    const savedName = StorageManager.load('lifeDashboard_user', '');
    appState.user.name = savedName;
  },
  
  attachEventListeners() {
    const form = document.getElementById('name-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleNameSubmit(e));
    }
  }
};
```

**Update Intervals**:
- Clock: Every 1000ms
- Greeting: On hour change (detected during clock update)

### 4. Timer Widget

**Responsibility**: Pomodoro timer with 25-minute countdown and circular progress indicator

**Key Functions**:

```javascript
TimerWidget = {
  init() {
    this.render();
    this.attachEventListeners();
  },
  
  render() {
    const { remaining } = appState.timer;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Update time display
    const displayElement = document.getElementById('timer-display');
    if (displayElement) {
      displayElement.textContent = timeString;
      displayElement.setAttribute('aria-label', `${minutes} minutes ${seconds} seconds remaining`);
    }
    
    // Update progress indicator
    this.updateProgress();
  },
  
  updateProgress() {
    const { duration, remaining } = appState.timer;
    const percentage = ((duration - remaining) / duration) * 100;
    
    const progressCircle = document.getElementById('timer-progress');
    if (progressCircle) {
      // SVG circle with stroke-dasharray animation
      // Circumference calculation for progress
      const radius = 90; // SVG circle radius
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (percentage / 100) * circumference;
      
      progressCircle.style.strokeDasharray = `${circumference}`;
      progressCircle.style.strokeDashoffset = `${offset}`;
    }
  },
  
  start() {
    // Ignore if already running
    if (appState.timer.isRunning) return;
    
    // If timer completed, reset first
    if (appState.timer.remaining === 0) {
      this.reset();
    }
    
    appState.timer.isRunning = true;
    
    // Update button states
    this.updateButtonStates();
    
    // Start countdown
    appState.timer.intervalId = setInterval(() => {
      appState.timer.remaining -= 1;
      
      this.render();
      
      // Check for completion
      if (appState.timer.remaining <= 0) {
        this.complete();
      }
    }, 1000);
    
    // Announce to screen readers
    this.announceToScreenReader('Timer started');
  },
  
  stop() {
    // Ignore if not running
    if (!appState.timer.isRunning) return;
    
    appState.timer.isRunning = false;
    clearInterval(appState.timer.intervalId);
    appState.timer.intervalId = null;
    
    // Update button states
    this.updateButtonStates();
    
    // Announce to screen readers
    this.announceToScreenReader('Timer stopped');
  },
  
  reset() {
    // Stop timer if running
    if (appState.timer.isRunning) {
      this.stop();
    }
    
    // Reset to initial state
    appState.timer.remaining = appState.timer.duration;
    appState.timer.isRunning = false;
    
    // Update display
    this.render();
    
    // Update button states
    this.updateButtonStates();
    
    // Announce to screen readers
    this.announceToScreenReader('Timer reset');
  },
  
  complete() {
    this.stop();
    
    // Show completion notification
    NotificationManager.show('Pomodoro session completed! Great work!', 'success', 3000);
    
    // Announce to screen readers
    this.announceToScreenReader('Timer completed');
  },
  
  updateButtonStates() {
    const startBtn = document.getElementById('timer-start');
    const stopBtn = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');
    
    if (startBtn) {
      startBtn.disabled = appState.timer.isRunning;
      startBtn.setAttribute('aria-pressed', appState.timer.isRunning);
    }
    
    if (stopBtn) {
      stopBtn.disabled = !appState.timer.isRunning;
    }
  },
  
  announceToScreenReader(message) {
    const liveRegion = document.getElementById('timer-announcements');
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  },
  
  attachEventListeners() {
    const startBtn = document.getElementById('timer-start');
    const stopBtn = document.getElementById('timer-stop');
    const resetBtn = document.getElementById('timer-reset');
    
    if (startBtn) startBtn.addEventListener('click', () => this.start());
    if (stopBtn) stopBtn.addEventListener('click', () => this.stop());
    if (resetBtn) resetBtn.addEventListener('click', () => this.reset());
  }
};
```

**Timer Algorithm**:
1. Start: Begin interval that fires every 1000ms
2. Decrement: Reduce `remaining` by 1 second on each tick
3. Update: Re-render display and progress indicator
4. Complete: When `remaining` reaches 0, stop timer and show notification
5. Progress calculation: `(duration - remaining) / duration * 100`

**SVG Progress Indicator**: Uses `stroke-dasharray` and `stroke-dashoffset` to create circular progress animation.

### 5. Task Manager

**Responsibility**: CRUD operations for tasks with validation and duplicate detection

**Task Data Model**:

```javascript
{
  id: "1704067200000_abc123",  // timestamp_random
  description: "Complete project proposal",
  completed: false,
  createdAt: 1704067200000      // timestamp
}
```

**Key Functions**:

```javascript
TaskManager = {
  init() {
    this.loadTasks();
    this.render();
    this.attachEventListeners();
  },
  
  loadTasks() {
    const savedTasks = StorageManager.load('lifeDashboard_tasks', []);
    appState.tasks = Array.isArray(savedTasks) ? savedTasks : [];
  },
  
  saveTasks() {
    return StorageManager.save('lifeDashboard_tasks', appState.tasks);
  },
  
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  },
  
  validateDescription(description) {
    const trimmed = description.trim();
    
    if (trimmed.length === 0) {
      return { valid: false, error: 'Task description cannot be empty' };
    }
    
    if (trimmed.length > 500) {
      return { valid: false, error: 'Task description cannot exceed 500 characters' };
    }
    
    return { valid: true, trimmed };
  },
  
  isDuplicate(description, excludeId = null) {
    const normalized = description.toLowerCase().trim();
    return appState.tasks.some(task => 
      task.id !== excludeId && 
      task.description.toLowerCase().trim() === normalized
    );
  },
  
  addTask(description) {
    // Validate
    const validation = this.validateDescription(description);
    if (!validation.valid) {
      NotificationManager.show(validation.error, 'error');
      return false;
    }
    
    // Check for duplicates
    if (this.isDuplicate(validation.trimmed)) {
      NotificationManager.show('This task already exists', 'warning');
      return false;
    }
    
    // Create task
    const task = {
      id: this.generateId(),
      description: validation.trimmed,
      completed: false,
      createdAt: Date.now()
    };
    
    // Add to state
    appState.tasks.push(task);
    
    // Persist
    if (!this.saveTasks()) {
      // Rollback on save failure
      appState.tasks.pop();
      return false;
    }
    
    // Re-render
    this.render();
    
    // Announce
    this.announceToScreenReader('Task added');
    NotificationManager.show('Task added successfully', 'success');
    
    return true;
  },
  
  updateTask(id, newDescription) {
    // Find task
    const task = appState.tasks.find(t => t.id === id);
    if (!task) return false;
    
    // Validate
    const validation = this.validateDescription(newDescription);
    if (!validation.valid) {
      NotificationManager.show(validation.error, 'error');
      return false;
    }
    
    // Check for duplicates (excluding current task)
    if (this.isDuplicate(validation.trimmed, id)) {
      NotificationManager.show('This task already exists', 'warning');
      return false;
    }
    
    // Store old value for rollback
    const oldDescription = task.description;
    
    // Update
    task.description = validation.trimmed;
    
    // Persist
    if (!this.saveTasks()) {
      // Rollback
      task.description = oldDescription;
      return false;
    }
    
    // Re-render
    this.render();
    
    // Announce
    this.announceToScreenReader('Task updated');
    
    return true;
  },
  
  toggleComplete(id) {
    const task = appState.tasks.find(t => t.id === id);
    if (!task) return false;
    
    // Toggle
    task.completed = !task.completed;
    
    // Persist
    if (!this.saveTasks()) {
      // Rollback
      task.completed = !task.completed;
      return false;
    }
    
    // Re-render
    this.render();
    
    // Announce
    const status = task.completed ? 'completed' : 'uncompleted';
    this.announceToScreenReader(`Task marked as ${status}`);
    
    return true;
  },
  
  deleteTask(id) {
    const index = appState.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    
    // Remove
    const removed = appState.tasks.splice(index, 1);
    
    // Persist
    if (!this.saveTasks()) {
      // Rollback
      appState.tasks.splice(index, 0, removed[0]);
      return false;
    }
    
    // Re-render
    this.render();
    
    // Announce
    this.announceToScreenReader('Task deleted');
    
    return true;
  },
  
  render() {
    const container = document.getElementById('task-list');
    if (!container) return;
    
    // Empty state
    if (appState.tasks.length === 0) {
      container.innerHTML = '<p class="empty-state">No tasks yet. Add one to get started!</p>';
      return;
    }
    
    // Render tasks
    container.innerHTML = appState.tasks.map(task => `
      <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
        <input 
          type="checkbox" 
          id="task-${task.id}" 
          ${task.completed ? 'checked' : ''}
          aria-label="Mark task as ${task.completed ? 'incomplete' : 'complete'}"
        >
        <label for="task-${task.id}" class="task-description">
          ${this.escapeHtml(task.description)}
        </label>
        <div class="task-actions">
          <button 
            class="task-edit-btn" 
            aria-label="Edit task"
            data-task-id="${task.id}"
          >
            ✏️
          </button>
          <button 
            class="task-delete-btn" 
            aria-label="Delete task"
            data-task-id="${task.id}"
          >
            🗑️
          </button>
        </div>
      </div>
    `).join('');
    
    // Attach event listeners to rendered elements
    this.attachTaskItemListeners();
  },
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
  
  handleAddTask(event) {
    event.preventDefault();
    
    const input = document.getElementById('task-input');
    if (!input) return;
    
    const description = input.value;
    
    if (this.addTask(description)) {
      input.value = '';
      input.focus();
    }
  },
  
  announceToScreenReader(message) {
    const liveRegion = document.getElementById('task-announcements');
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  },
  
  attachEventListeners() {
    const form = document.getElementById('task-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleAddTask(e));
    }
  },
  
  attachTaskItemListeners() {
    // Checkboxes
    document.querySelectorAll('#task-list input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const taskItem = e.target.closest('.task-item');
        const taskId = taskItem.dataset.taskId;
        this.toggleComplete(taskId);
      });
    });
    
    // Edit buttons
    document.querySelectorAll('.task-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.target.dataset.taskId;
        this.startEdit(taskId);
      });
    });
    
    // Delete buttons
    document.querySelectorAll('.task-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskId = e.target.dataset.taskId;
        this.deleteTask(taskId);
      });
    });
  },
  
  startEdit(id) {
    const task = appState.tasks.find(t => t.id === id);
    if (!task) return;
    
    const taskItem = document.querySelector(`.task-item[data-task-id="${id}"]`);
    if (!taskItem) return;
    
    const label = taskItem.querySelector('.task-description');
    const originalText = task.description;
    
    // Create input
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'task-edit-input';
    
    // Replace label with input
    label.replaceWith(input);
    input.focus();
    input.select();
    
    // Handle save
    const save = () => {
      const newDescription = input.value;
      if (this.updateTask(id, newDescription)) {
        // Success handled by updateTask
      } else {
        // Revert on failure
        this.render();
      }
    };
    
    // Handle cancel
    const cancel = () => {
      this.render();
    };
    
    // Event listeners
    input.addEventListener('blur', save);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        save();
      } else if (e.key === 'Escape') {
        cancel();
      }
    });
  }
};
```

**Duplicate Detection Algorithm**:
1. Normalize input: lowercase and trim whitespace
2. Compare against all existing tasks (excluding current task for edits)
3. Match if normalized descriptions are identical

**Edit Mode Implementation**:
1. Replace label with input field
2. Pre-fill with current description
3. Auto-focus and select text
4. Save on Enter or blur
5. Cancel on Escape
6. Re-render task list after save/cancel

### 6. Quick Links Widget

**Responsibility**: Display and configure 3 fixed social media profile links

**Key Functions**:

```javascript
QuickLinksWidget = {
  init() {
    this.loadLinks();
    this.render();
    this.attachEventListeners();
  },
  
  loadLinks() {
    const savedLinks = StorageManager.load('lifeDashboard_quickLinks', {
      instagram: '',
      tiktok: '',
      linkedin: ''
    });
    appState.quickLinks = savedLinks;
  },
  
  saveLinks() {
    return StorageManager.save('lifeDashboard_quickLinks', appState.quickLinks);
  },
  
  validateUrl(url) {
    if (url.trim() === '') {
      return { valid: true, url: '' }; // Empty is valid (disabled state)
    }
    
    if (url.length > 2048) {
      return { valid: false, error: 'URL cannot exceed 2048 characters' };
    }
    
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { valid: false, error: 'URL must start with http:// or https://' };
    }
    
    return { valid: true, url: url.trim() };
  },
  
  updateLink(platform, url) {
    // Validate
    const validation = this.validateUrl(url);
    if (!validation.valid) {
      NotificationManager.show(validation.error, 'error');
      return false;
    }
    
    // Update state
    appState.quickLinks[platform] = validation.url;
    
    // Persist
    if (!this.saveLinks()) {
      return false;
    }
    
    // Re-render
    this.render();
    
    NotificationManager.show('Link updated successfully', 'success');
    return true;
  },
  
  openLink(platform) {
    const url = appState.quickLinks[platform];
    
    if (!url || url === '') {
      NotificationManager.show('Please configure this link first', 'warning');
      return;
    }
    
    // Open in new tab with security attributes
    window.open(url, '_blank', 'noopener,noreferrer');
  },
  
  render() {
    const links = [
      { id: 'instagram', label: 'Instagram', icon: '📷' },
      { id: 'tiktok', label: 'TikTok', icon: '🎵' },
      { id: 'linkedin', label: 'LinkedIn', icon: '💼' }
    ];
    
    const container = document.getElementById('quick-links-container');
    if (!container) return;
    
    container.innerHTML = links.map(link => {
      const url = appState.quickLinks[link.id];
      const hasUrl = url && url !== '';
      
      return `
        <div class="quick-link-item">
          <button 
            class="quick-link-btn ${!hasUrl ? 'disabled' : ''}" 
            data-platform="${link.id}"
            ${!hasUrl ? 'disabled' : ''}
            aria-label="${link.label}${!hasUrl ? ' (not configured)' : ''}"
          >
            <span class="link-icon">${link.icon}</span>
            <span class="link-label">${link.label}</span>
          </button>
          <button 
            class="link-config-btn" 
            data-platform="${link.id}"
            aria-label="Configure ${link.label} link"
          >
            ⚙️
          </button>
        </div>
      `;
    }).join('');
    
    this.attachLinkListeners();
  },
  
  showConfigModal(platform) {
    const currentUrl = appState.quickLinks[platform];
    const newUrl = prompt(`Enter ${platform} profile URL:`, currentUrl);
    
    if (newUrl !== null) {
      this.updateLink(platform, newUrl);
    }
  },
  
  attachEventListeners() {
    // Initial render handles this
  },
  
  attachLinkListeners() {
    // Link buttons
    document.querySelectorAll('.quick-link-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const platform = e.currentTarget.dataset.platform;
        this.openLink(platform);
      });
    });
    
    // Config buttons
    document.querySelectorAll('.link-config-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const platform = e.target.dataset.platform;
        this.showConfigModal(platform);
      });
    });
  }
};
```

**URL Validation**:
- Must be empty OR start with `http://` or `https://`
- Maximum length: 2048 characters
- Empty URLs result in disabled link state

**Security**: Links open with `noopener` and `noreferrer` attributes to prevent security vulnerabilities.

### 7. Notification Manager

**Responsibility**: Display temporary success, error, and warning messages

**Key Functions**:

```javascript
NotificationManager = {
  show(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notification-container');
    if (!container) return;
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
    notification.textContent = message;
    
    // Add to container
    container.appendChild(notification);
    
    // Trigger animation (add after DOM insertion for CSS transition)
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Auto-remove after duration
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300); // Match CSS transition duration
    }, duration);
  }
};
```

**Notification Types**:
- `success`: Green, checkmark icon
- `error`: Red, error icon
- `warning`: Orange, warning icon
- `info`: Blue, info icon

**Animation**: Slide in from top with fade (max 300ms), auto-dismiss after specified duration.

### 8. Main Application

**Responsibility**: Initialize all components and coordinate startup

```javascript
const App = {
  init() {
    // Check Local Storage availability
    if (!StorageManager.isAvailable()) {
      NotificationManager.show(
        'Local Storage is unavailable. Data will not be saved.', 
        'warning', 
        5000
      );
    }
    
    // Initialize components in order
    ThemeManager.init();
    GreetingWidget.init();
    TimerWidget.init();
    TaskManager.init();
    QuickLinksWidget.init();
    
    // Set up global error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      NotificationManager.show('An unexpected error occurred', 'error');
    });
    
    // Performance monitoring (optional)
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        const loadTime = window.performance.timing.loadEventEnd - 
                         window.performance.timing.navigationStart;
        console.log(`Page load time: ${loadTime}ms`);
      });
    }
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
```

## Data Models

### User Model

```javascript
{
  name: String  // 0-50 characters, trimmed
}
```

### Timer Model

```javascript
{
  duration: Number,      // Fixed at 1500 (25 minutes)
  remaining: Number,     // 0-1500 seconds
  isRunning: Boolean,
  intervalId: Number     // setInterval ID or null
}
```

### Task Model

```javascript
{
  id: String,            // Unique identifier: "timestamp_random"
  description: String,   // 1-500 characters, trimmed
  completed: Boolean,
  createdAt: Number      // Unix timestamp
}
```

### Quick Links Model

```javascript
{
  instagram: String,     // URL or empty string
  tiktok: String,        // URL or empty string
  linkedin: String       // URL or empty string
}
```

### Theme Model

```javascript
"light" | "dark"  // String enum
```

## Data Flow

### User Name Update Flow

```
User Input → Validation → Trim & Truncate → Update appState 
  → Save to Local Storage → Update Greeting Display → Show Notification
```

### Task Creation Flow

```
User Input → Validation (length, empty) → Duplicate Check 
  → Generate ID → Add to appState.tasks → Save to Local Storage 
  → Re-render Task List → Show Notification → Clear Input → Focus Input
```

### Timer Flow

```
Start Click → Check if running → Set isRunning = true 
  → Start setInterval → Decrement remaining every 1000ms 
  → Update Display & Progress → Check for completion 
  → On completion: Stop timer, Show notification
```

### Theme Toggle Flow

```
Toggle Click → Determine new theme → Update data-theme attribute 
  → CSS variables automatically update → Update appState 
  → Save to Local Storage
```

### Local Storage Read Flow (on page load)

```
Page Load → StorageManager.load() → Try localStorage.getItem() 
  → Try JSON.parse() → If success: return data 
  → If fail: Log error, Show notification, Return default value
```

### Local Storage Write Flow

```
State Change → StorageManager.save() → Try JSON.stringify() 
  → Try localStorage.setItem() → If success: return true 
  → If fail (QuotaExceeded): Show specific error 
  → If fail (other): Show generic error → Return false
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

While this application is heavily UI-focused and involves many side effects (DOM manipulation, Local Storage, timers), there are several core pure functions where property-based testing provides value. The following properties focus on validation logic, formatting functions, and business rules that can be tested independently of UI and side effects.

### Property 1: Time-Based Greeting Selection

*For any* hour value from 0 to 23, the greeting function SHALL return "Good Morning" for hours 0-11, "Good Afternoon" for hours 12-17, and "Good Evening" for hours 18-23.

**Validates: Requirements 1.1**

### Property 2: Name Length Normalization

*For any* string input as a user name:
- If the length after trimming is 50 characters or less, the result SHALL equal the trimmed string
- If the length after trimming exceeds 50 characters, the result SHALL equal the first 50 characters of the trimmed string

**Validates: Requirements 1.3, 2.4**

### Property 3: Name Truncation with Ellipsis for Display

*For any* string longer than 50 characters, when formatted for display, the result SHALL be exactly 47 characters from the original string followed by "..." (total length 50).

**Validates: Requirements 1.3**

### Property 4: Whitespace Trimming

*For any* string with leading or trailing whitespace characters, applying the trim operation SHALL remove all leading and trailing whitespace while preserving internal whitespace.

**Validates: Requirements 2.5, 4.2**

### Property 5: Timer Display Formatting

*For any* non-negative integer representing seconds from 0 to 1500, the timer display format SHALL be "MM:SS" where:
- MM is the number of complete minutes (padded to 2 digits)
- SS is the remaining seconds (padded to 2 digits)
- Both MM and SS are zero-padded

**Validates: Requirements 3.5**

### Property 6: Timer Progress Percentage Calculation

*For any* timer state with duration D and remaining time R where 0 ≤ R ≤ D, the progress percentage SHALL equal ((D - R) / D) × 100, representing the elapsed portion of the timer.

**Validates: Requirements 3.6**

### Property 7: Timer Start Idempotence

*For any* timer state where isRunning is true, calling the start function SHALL not modify the timer state (remaining time, duration, or isRunning flag).

**Validates: Requirements 3.3**

### Property 8: Timer Stop Idempotence

*For any* timer state where isRunning is false, calling the stop function SHALL not modify the timer state (remaining time, duration, or isRunning flag).

**Validates: Requirements 3.8**

### Property 9: Timer Reset State Restoration

*For any* timer state (regardless of remaining time or isRunning status), calling reset SHALL restore the timer to initial state with remaining = duration = 1500 and isRunning = false.

**Validates: Requirements 3.9**

### Property 10: Task Description Length Validation

*For any* string with length exceeding 500 characters after trimming, the task validation function SHALL return invalid status with appropriate error message.

**Validates: Requirements 4.4**

### Property 11: Task Duplicate Detection

*For any* task description and existing task list, the duplicate detection function SHALL identify a duplicate when:
- The normalized form (lowercase + trimmed) of the new description matches the normalized form of any existing task description
- Case variations and surrounding whitespace SHALL be ignored in comparison

**Validates: Requirements 4.5**

### Property 12: Task Edit Duplicate Detection with Exclusion

*For any* task being edited with ID X and new description D, the duplicate detection SHALL identify a duplicate when:
- The normalized form of D matches the normalized form of any existing task
- BUT the matching task has an ID different from X (current task is excluded from duplicate check)

**Validates: Requirements 4.15**

### Property 13: URL Validation

*For any* URL string, the validation function SHALL:
- Accept empty strings (representing unconfigured links)
- Reject strings exceeding 2048 characters
- Reject non-empty strings that do not begin with "http://" or "https://"
- Accept strings that begin with "http://" or "https://" and are ≤2048 characters

**Validates: Requirements 5.3, 5.4**

### Property 14: Theme Toggle Inversion

*For any* theme value in the set {"light", "dark"}, applying the toggle operation SHALL return the opposite theme value ("light" → "dark", "dark" → "light").

**Validates: Requirements 6.3**

### Property 15: Theme Validation and Default Recovery

*For any* theme value that is not "light" or "dark", the theme validation function SHALL return "light" as the default safe value.

**Validates: Requirements 6.8**

### Property 16: Corrupted JSON Recovery

*For any* string that cannot be parsed as valid JSON OR parses to a non-object value, the storage load function SHALL return the specified default value without throwing an exception.

**Validates: Requirements 8.6**

## Error Handling

### Error Categories

The application handles four categories of errors:

1. **Storage Errors**
   - Quota exceeded
   - Storage unavailable
   - Parse errors (corrupted data)
   
2. **Validation Errors**
   - Empty/whitespace input
   - Length violations
   - Format violations
   - Duplicate detection

3. **System Errors**
   - JavaScript runtime errors
   - DOM manipulation failures
   
4. **User Errors**
   - Invalid input formats
   - Attempting disabled actions

### Error Handling Strategy

**Storage Errors**:
```javascript
try {
  localStorage.setItem(key, value);
  return { success: true };
} catch (error) {
  if (error.name === 'QuotaExceededError') {
    NotificationManager.show('Storage quota exceeded. Please delete some data.', 'error');
  } else if (error.name === 'SecurityError') {
    NotificationManager.show('Storage unavailable in this browser mode.', 'warning');
  } else {
    NotificationManager.show('Failed to save data.', 'error');
  }
  console.error('Storage error:', error);
  return { success: false, error };
}
```

**Validation Errors**:
- Return structured validation result: `{ valid: boolean, error?: string, value?: any }`
- Display user-friendly error messages via NotificationManager
- Prevent invalid operations from executing
- Maintain current state on validation failure

**System Errors**:
```javascript
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error);
  NotificationManager.show('An unexpected error occurred', 'error');
  // Prevent default browser error handling for better UX
  event.preventDefault();
});
```

**Graceful Degradation**:
- If Local Storage unavailable: Continue with in-memory state only, show warning
- If data corrupted: Use default values, log error
- If UI element missing: Log error, skip operation (defensive checks with `if (element)`)

### Error Recovery

**Rollback Pattern for State Changes**:
```javascript
// Store old state
const oldValue = currentState.value;

// Apply change
currentState.value = newValue;

// Attempt persistence
if (!StorageManager.save('key', currentState)) {
  // Rollback on failure
  currentState.value = oldValue;
  return false;
}

return true;
```

**Default Value Pattern for Reads**:
```javascript
const loadData = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    const parsed = JSON.parse(item);
    // Validate structure
    if (!isValidStructure(parsed)) return defaultValue;
    return parsed;
  } catch (error) {
    console.error(`Load failed for ${key}:`, error);
    return defaultValue;
  }
};
```

## Testing Strategy

The To-Do List Life Dashboard requires a comprehensive testing strategy that combines property-based testing for pure logic functions, unit tests for specific examples and edge cases, and integration tests for UI interactions and side effects.

### Testing Approach

**1. Property-Based Testing (using fast-check for JavaScript)**

Property-based tests validate universal properties across randomly generated inputs. Each property test runs a minimum of 100 iterations to thoroughly explore the input space.

**Pure Functions to Test**:
- Greeting selection logic
- Name formatting and truncation
- Timer display formatting
- Progress percentage calculation
- Validation functions (task description, URL, theme)
- Duplicate detection logic
- String trimming and normalization
- Timer state idempotence checks
- JSON parsing error recovery

**Configuration**:
```javascript
// fast-check configuration
fc.configureGlobal({
  numRuns: 100,  // Minimum iterations per property
  verbose: true
});
```

**Property Test Structure**:
```javascript
// Example: Property 1 - Time-Based Greeting Selection
// Feature: to-do-list-lifeday, Property 1: Time-based greeting selection
test('greeting selection returns correct message for any hour', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 0, max: 23 }), // Generate hours 0-23
      (hour) => {
        const greeting = getGreeting(hour);
        
        if (hour >= 0 && hour < 12) {
          expect(greeting).toBe('Good Morning');
        } else if (hour >= 12 && hour < 18) {
          expect(greeting).toBe('Good Afternoon');
        } else {
          expect(greeting).toBe('Good Evening');
        }
      }
    )
  );
});
```

**Generator Strategy**:
- **Strings**: Include empty, whitespace-only, very long, special characters, unicode
- **Numbers**: Include boundaries (0, 1, max values), negatives, edge cases
- **Task lists**: Include empty lists, single item, duplicates with case variations
- **Timer states**: Include all combinations of remaining/duration/isRunning
- **URLs**: Include valid, invalid protocols, long URLs, empty strings

**2. Unit Tests (using Jest or similar)**

Unit tests cover specific examples, edge cases not easily expressed as properties, and component behavior that requires mocking.

**Focus Areas**:
- Specific UI interactions (button clicks, form submissions)
- Error handling scenarios (Local Storage failures)
- Edge cases explicitly called out in requirements (empty task list, completed timer)
- Integration points between components
- Event handler behavior

**Example Unit Tests**:
```javascript
describe('TaskManager', () => {
  test('adding empty task shows validation error', () => {
    const result = TaskManager.addTask('   ');
    expect(result).toBe(false);
    expect(NotificationManager.show).toHaveBeenCalledWith(
      expect.stringContaining('empty'),
      'error'
    );
  });
  
  test('Local Storage failure triggers error notification', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    
    const result = StorageManager.save('test', {});
    expect(result).toBe(false);
    expect(NotificationManager.show).toHaveBeenCalledWith(
      expect.stringContaining('quota'),
      'error'
    );
  });
});
```

**3. Integration Tests**

Integration tests verify that components work together correctly with real DOM and browser APIs.

**Testing Focus**:
- DOM rendering and updates
- Local Storage read/write cycles
- Timer intervals and timing behavior
- Theme switching visual updates
- Keyboard navigation flow
- Screen reader announcements

**Example Integration Test**:
```javascript
describe('Timer Integration', () => {
  test('timer countdown updates display every second', async () => {
    jest.useFakeTimers();
    
    TimerWidget.init();
    TimerWidget.start();
    
    expect(document.getElementById('timer-display').textContent).toBe('25:00');
    
    jest.advanceTimersByTime(1000);
    expect(document.getElementById('timer-display').textContent).toBe('24:59');
    
    jest.advanceTimersByTime(1000);
    expect(document.getElementById('timer-display').textContent).toBe('24:58');
    
    jest.useRealTimers();
  });
});
```

**4. Accessibility Testing**

Automated and manual accessibility testing to ensure WCAG AA compliance.

**Tools**:
- jest-axe for automated a11y testing
- Manual keyboard navigation testing
- Manual screen reader testing (NVDA, JAWS, VoiceOver)

**Test Coverage**:
- Color contrast ratios (automated with axe)
- ARIA attributes presence and correctness
- Keyboard navigation order and focus indicators
- Screen reader announcements for dynamic updates
- Focus management during interactions

**5. Visual Regression Testing (Optional but Recommended)**

Snapshot tests or visual regression tools to catch unintended visual changes.

**Coverage**:
- Light theme appearance
- Dark theme appearance
- Responsive layouts (320px, 768px, 1920px)
- Component states (empty, loading, error, success)

### Test Organization

```
tests/
├── unit/
│   ├── greeting.test.js
│   ├── timer.test.js
│   ├── tasks.test.js
│   ├── quicklinks.test.js
│   ├── theme.test.js
│   └── storage.test.js
├── properties/
│   ├── validation.properties.test.js
│   ├── formatting.properties.test.js
│   ├── timer.properties.test.js
│   └── duplicates.properties.test.js
├── integration/
│   ├── dashboard.integration.test.js
│   ├── storage.integration.test.js
│   └── keyboard-nav.integration.test.js
└── accessibility/
    └── a11y.test.js
```

### Testing Guidelines

1. **Property tests MUST run minimum 100 iterations**
2. **Each property test MUST include a comment referencing the design property**
   - Format: `// Feature: to-do-list-lifeday, Property {N}: {property text}`
3. **Unit tests SHOULD use descriptive test names following Given-When-Then or similar**
4. **Integration tests SHOULD clean up side effects (timers, DOM, Local Storage)**
5. **Mock browser APIs (Local Storage, Date, setInterval) for unit tests**
6. **Use real browser APIs for integration tests where possible**
7. **Accessibility tests MUST verify ARIA attributes and keyboard navigation**

### Coverage Goals

- **Property-based tests**: 100% coverage of pure validation/formatting functions
- **Unit tests**: 80%+ line coverage of component logic
- **Integration tests**: All user workflows (add task, start timer, toggle theme, etc.)
- **Accessibility tests**: All interactive elements and dynamic content

### Continuous Testing

- Run unit and property tests on every commit (fast feedback)
- Run integration tests before merge (comprehensive verification)
- Run accessibility tests as part of CI/CD pipeline
- Manual accessibility testing before releases



## HTML Structure

### Document Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Minimal productivity dashboard with Pomodoro timer and task management">
  <title>Life Dashboard</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Main container -->
  <div class="dashboard-container">
    
    <!-- Header with greeting and theme toggle -->
    <header class="dashboard-header">
      <div class="greeting-section">
        <h1 id="greeting-text">Good Morning!</h1>
        <p id="current-date">January 15, 2024</p>
        <p id="current-time" class="clock">14:35:22</p>
      </div>
      
      <button 
        id="theme-toggle" 
        class="theme-toggle-btn"
        aria-label="Switch to dark mode"
      >
        🌙
      </button>
    </header>
    
    <!-- Name input section -->
    <section class="name-section">
      <form id="name-form" class="name-form">
        <label for="user-name-input" class="sr-only">Enter your name</label>
        <input 
          type="text" 
          id="user-name-input" 
          placeholder="Enter your name"
          maxlength="60"
          autocomplete="name"
        >
        <button type="submit" aria-label="Save name">Save</button>
      </form>
    </section>
    
    <!-- Main content area with two-column layout -->
    <main class="dashboard-main">
      
      <!-- Left column: Tasks -->
      <section class="task-section">
        <h2>Tasks</h2>
        
        <!-- Task input form -->
        <form id="task-form" class="task-form">
          <label for="task-input" class="sr-only">New task description</label>
          <input 
            type="text" 
            id="task-input" 
            placeholder="What needs to be done?"
            maxlength="510"
          >
          <button type="submit" aria-label="Add task">
            <span aria-hidden="true">+</span>
            <span class="sr-only">Add</span>
          </button>
        </form>
        
        <!-- Task list -->
        <div id="task-list" class="task-list">
          <!-- Tasks will be rendered here dynamically -->
          <p class="empty-state">No tasks yet. Add one to get started!</p>
        </div>
        
        <!-- Screen reader announcements for task operations -->
        <div 
          id="task-announcements" 
          class="sr-only" 
          role="status" 
          aria-live="polite"
        ></div>
      </section>
      
      <!-- Right column: Timer and Quick Links -->
      <aside class="widgets-section">
        
        <!-- Pomodoro Timer -->
        <section class="timer-widget">
          <h2>Pomodoro Timer</h2>
          
          <div class="timer-display-container">
            <!-- SVG circular progress indicator -->
            <svg class="timer-progress-ring" width="200" height="200">
              <circle
                class="timer-progress-ring-bg"
                cx="100"
                cy="100"
                r="90"
                fill="transparent"
                stroke="var(--border-color)"
                stroke-width="8"
              />
              <circle
                id="timer-progress"
                class="timer-progress-ring-circle"
                cx="100"
                cy="100"
                r="90"
                fill="transparent"
                stroke="var(--accent-color)"
                stroke-width="8"
                stroke-dasharray="565.48"
                stroke-dashoffset="565.48"
                transform="rotate(-90 100 100)"
              />
            </svg>
            
            <!-- Timer display -->
            <div 
              id="timer-display" 
              class="timer-display"
              role="timer"
              aria-label="25 minutes 0 seconds remaining"
            >
              25:00
            </div>
          </div>
          
          <!-- Timer controls -->
          <div class="timer-controls">
            <button 
              id="timer-start" 
              class="timer-btn timer-start"
              aria-label="Start timer"
            >
              Start
            </button>
            <button 
              id="timer-stop" 
              class="timer-btn timer-stop"
              aria-label="Stop timer"
              disabled
            >
              Stop
            </button>
            <button 
              id="timer-reset" 
              class="timer-btn timer-reset"
              aria-label="Reset timer"
            >
              Reset
            </button>
          </div>
          
          <!-- Screen reader announcements for timer -->
          <div 
            id="timer-announcements" 
            class="sr-only" 
            role="status" 
            aria-live="polite"
          ></div>
        </section>
        
        <!-- Quick Links -->
        <section class="quick-links-widget">
          <h2>Quick Links</h2>
          <div id="quick-links-container" class="quick-links-container">
            <!-- Links will be rendered here dynamically -->
          </div>
        </section>
        
      </aside>
      
    </main>
    
  </div>
  
  <!-- Notification container for toasts -->
  <div 
    id="notification-container" 
    class="notification-container"
    aria-live="polite"
  ></div>
  
  <script src="js/script.js"></script>
</body>
</html>
```

### Semantic HTML Principles

1. **Proper heading hierarchy**: Single `<h1>` for greeting, `<h2>` for sections
2. **Semantic elements**: `<header>`, `<main>`, `<section>`, `<aside>`, `<form>`
3. **Form associations**: Labels properly associated with inputs (explicit or implicit)
4. **ARIA attributes**: 
   - `role="timer"`, `role="status"` for dynamic regions
   - `aria-live="polite"` for announcements
   - `aria-label` for icon-only buttons
   - `aria-pressed` for toggle buttons
5. **Screen reader only class**: `.sr-only` for visually hidden but screen-reader-accessible content

### Accessibility Features

**Keyboard Navigation**:
- All interactive elements are focusable in logical order
- Tab order follows visual layout: header → name form → task form → task list → timer → quick links
- Form submission via Enter key
- Escape key cancels task editing

**Screen Reader Support**:
- Descriptive labels for all inputs and buttons
- Live regions announce dynamic changes (timer state, task operations)
- Semantic HTML provides context and structure
- Alternative text and ARIA labels for icons

**Focus Management**:
- Visible focus indicators (outline with adequate contrast)
- Focus remains on input fields after form submission
- Focus restoration after modal dialogs (quick link config)

## CSS Layout and Styling

### CSS Architecture

The CSS is organized using a component-based approach with CSS Custom Properties for theming:

```
1. CSS Reset and Base Styles
2. CSS Custom Properties (Theme Variables)
3. Typography
4. Layout (Grid and Flexbox)
5. Component Styles
6. Utility Classes
7. Responsive Media Queries
8. Accessibility Utilities
```

### CSS Custom Properties

```css
:root {
  /* Light mode colors (default) */
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --bg-tertiary: #e8e8e8;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --text-tertiary: #999999;
  --border-color: #e0e0e0;
  --accent-color: #4a90e2;
  --accent-hover: #357abd;
  --accent-light: #e3f2fd;
  --success-color: #4caf50;
  --success-light: #e8f5e9;
  --error-color: #f44336;
  --error-light: #ffebee;
  --warning-color: #ff9800;
  --warning-light: #fff3e0;
  
  /* Spacing scale */
  --space-xs: 0.25rem;  /* 4px */
  --space-sm: 0.5rem;   /* 8px */
  --space-md: 1rem;     /* 16px */
  --space-lg: 1.5rem;   /* 24px */
  --space-xl: 2rem;     /* 32px */
  --space-2xl: 3rem;    /* 48px */
  
  /* Typography scale */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.5rem;     /* 24px */
  --font-size-2xl: 2rem;      /* 32px */
  --font-size-3xl: 2.5rem;    /* 40px */
  
  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-full: 9999px;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}

[data-theme="dark"] {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --bg-tertiary: #404040;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --text-tertiary: #808080;
  --border-color: #404040;
  --accent-color: #5b9fd8;
  --accent-hover: #4a8fc7;
  --accent-light: #1e3a5f;
  --success-color: #66bb6a;
  --success-light: #1b3a1c;
  --error-color: #ef5350;
  --error-light: #3d1a19;
  --warning-color: #ffa726;
  --warning-light: #3d2a14;
  
  /* Adjust shadows for dark mode */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
}
```

### Layout System

**Desktop Layout (≥768px)**: CSS Grid two-column layout

```css
.dashboard-main {
  display: grid;
  grid-template-columns: 1fr 400px;  /* Tasks take available space, widgets fixed */
  gap: var(--space-xl);
  max-width: 1400px;
  margin: 0 auto;
  padding: var(--space-xl);
}

.task-section {
  grid-column: 1;
}

.widgets-section {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
}
```

**Mobile Layout (<768px)**: Single column stack

```css
@media (max-width: 767px) {
  .dashboard-main {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    padding: var(--space-md);
  }
  
  .task-section {
    order: 1;
  }
  
  .widgets-section {
    order: 2;
  }
}
```

### Component Styling Patterns

**Card Pattern**: Consistent card style for widgets

```css
.task-section,
.timer-widget,
.quick-links-widget {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-lg);
  box-shadow: var(--shadow-sm);
}
```

**Button Pattern**: Consistent button styling

```css
button {
  font-family: inherit;
  font-size: var(--font-size-base);
  padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md);
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
  background: var(--accent-color);
  color: white;
  
  /* Minimum touch target size for mobile */
  min-width: 44px;
  min-height: 44px;
}

button:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

button:active:not(:disabled) {
  transform: translateY(0);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}
```

**Input Pattern**: Form input styling

```css
input[type="text"] {
  font-family: inherit;
  font-size: var(--font-size-base);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color var(--transition-fast);
  
  /* Minimum size for mobile */
  min-height: 44px;
}

input[type="text"]:focus {
  outline: none;
  border-color: var(--accent-color);
  box-shadow: 0 0 0 3px var(--accent-light);
}
```

### Timer Widget Styling

**SVG Progress Ring**:

```css
.timer-progress-ring {
  width: 200px;
  height: 200px;
}

.timer-progress-ring-circle {
  transition: stroke-dashoffset var(--transition-base);
  stroke-linecap: round;
}

.timer-display-container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: var(--space-lg) auto;
}

.timer-display {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: var(--font-size-3xl);
  font-weight: 600;
  font-variant-numeric: tabular-nums; /* Monospace numbers prevent jumping */
  color: var(--text-primary);
}
```

### Task Item Styling

```css
.task-item {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm);
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
}

.task-item:hover {
  background: var(--bg-secondary);
}

.task-item.completed .task-description {
  text-decoration: line-through;
  color: var(--text-tertiary);
}

.task-item input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.task-description {
  flex: 1;
  color: var(--text-primary);
  word-break: break-word;
}

.task-actions {
  display: flex;
  gap: var(--space-xs);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.task-item:hover .task-actions,
.task-item:focus-within .task-actions {
  opacity: 1;
}

.task-edit-btn,
.task-delete-btn {
  min-width: 32px;
  min-height: 32px;
  padding: var(--space-xs);
  font-size: var(--font-size-lg);
  background: transparent;
  border: 1px solid var(--border-color);
}

.task-edit-btn:hover {
  background: var(--accent-light);
  border-color: var(--accent-color);
}

.task-delete-btn:hover {
  background: var(--error-light);
  border-color: var(--error-color);
}
```

### Notification System

```css
.notification-container {
  position: fixed;
  top: var(--space-lg);
  right: var(--space-lg);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  max-width: 400px;
}

.notification {
  padding: var(--space-md);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  display: flex;
  align-items: center;
  gap: var(--space-sm);
  font-size: var(--font-size-sm);
  
  /* Animation */
  opacity: 0;
  transform: translateX(100%);
  transition: all var(--transition-base);
}

.notification.show {
  opacity: 1;
  transform: translateX(0);
}

.notification-success {
  background: var(--success-light);
  color: var(--success-color);
  border-left: 4px solid var(--success-color);
}

.notification-error {
  background: var(--error-light);
  color: var(--error-color);
  border-left: 4px solid var(--error-color);
}

.notification-warning {
  background: var(--warning-light);
  color: var(--warning-color);
  border-left: 4px solid var(--warning-color);
}
```

### Responsive Design Strategy

**Breakpoints**:
- Mobile: 320px - 767px
- Desktop: 768px+

**Mobile-Specific Adjustments**:

```css
@media (max-width: 767px) {
  /* Increase font sizes for readability */
  :root {
    --font-size-base: 1rem;    /* Stays 16px minimum */
    --font-size-lg: 1.125rem;
  }
  
  /* Reduce spacing */
  .dashboard-container {
    padding: var(--space-md);
  }
  
  /* Stack forms vertically */
  .name-form,
  .task-form {
    flex-direction: column;
  }
  
  .name-form input,
  .task-form input {
    width: 100%;
  }
  
  /* Adjust timer size */
  .timer-progress-ring {
    width: 180px;
    height: 180px;
  }
  
  .timer-display {
    font-size: var(--font-size-2xl);
  }
  
  /* Ensure touch targets */
  button,
  input,
  .task-item input[type="checkbox"] {
    min-width: 44px;
    min-height: 44px;
  }
  
  /* Move notifications to bottom on mobile */
  .notification-container {
    bottom: var(--space-lg);
    top: auto;
    left: var(--space-md);
    right: var(--space-md);
    max-width: none;
  }
}
```

### Accessibility Utilities

**Screen Reader Only Class**:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Focus Indicators**:

```css
*:focus-visible {
  outline: 2px solid var(--accent-color);
  outline-offset: 2px;
}

/* Ensure adequate contrast in both themes */
[data-theme="dark"] *:focus-visible {
  outline-color: var(--accent-color);
}
```

**Reduced Motion Preference**:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Performance Optimizations

**CSS Performance**:
1. **Avoid expensive properties**: No CSS filters, minimal box-shadows
2. **Hardware acceleration**: Use `transform` and `opacity` for animations
3. **Limit repaints**: Transitions on individual properties, not `all` where possible
4. **Efficient selectors**: Avoid deep nesting, prefer class selectors

**Animation Performance**:
```css
/* Good: Uses transform (GPU accelerated) */
button:hover {
  transform: translateY(-1px);
}

/* Avoid: Uses top (triggers layout) */
/* button:hover {
  top: -1px;
} */
```

**Font Loading**:
```css
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
               'Helvetica Neue', Arial, sans-serif;
  /* System fonts = no loading delay */
}
```

## Implementation Notes

### File Organization

```
project-root/
├── index.html           (Single HTML file)
├── css/
│   └── style.css        (Single CSS file, ~500-800 lines)
└── js/
    └── script.js        (Single JS file, ~800-1200 lines)
```

### JavaScript Code Organization

The single `script.js` file is organized top-to-bottom:

1. **Constants and Configuration** (lines 1-50)
2. **Utility Functions** (lines 51-150)
3. **StorageManager** (lines 151-250)
4. **NotificationManager** (lines 251-300)
5. **ThemeManager** (lines 301-400)
6. **GreetingWidget** (lines 401-550)
7. **TimerWidget** (lines 551-750)
8. **TaskManager** (lines 751-1000)
9. **QuickLinksWidget** (lines 1001-1150)
10. **App Initialization** (lines 1151-1200)

### Browser Compatibility

**Target Browsers**:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

**Required JavaScript Features**:
- ES6+ (const, let, arrow functions, template literals, destructuring)
- DOM APIs (querySelector, addEventListener, classList, dataset)
- Local Storage API
- Date object
- setInterval/setTimeout

**No Polyfills Required**: All features are well-supported in modern browsers (2020+)

### Development Workflow

1. **Structure First**: Create HTML with proper semantic elements
2. **Style Second**: Implement CSS with light theme, then add dark theme
3. **Functionality Third**: Implement JavaScript modules one at a time
4. **Test Continuously**: Manual testing in browser during development
5. **Accessibility Last**: Add ARIA attributes and test keyboard navigation

### Deployment

**No Build Process Required**:
- Vanilla HTML/CSS/JS files served directly
- No transpilation, bundling, or minification necessary for development
- Optional for production: Minify CSS/JS, enable gzip compression on server

**Hosting Options**:
- Static file hosting (GitHub Pages, Netlify, Vercel)
- Any web server (nginx, Apache)
- Local file:// protocol works for testing

## Summary

This design document provides a comprehensive technical specification for the To-Do List Life Dashboard. The application leverages vanilla web technologies to create a beginner-friendly, accessible, and performant productivity tool. Key design decisions include:

- **Simplicity**: Three files (HTML, CSS, JS) with no external dependencies
- **State Management**: Centralized state object with component-specific managers
- **Storage**: Local Storage with comprehensive error handling and graceful degradation
- **Theming**: CSS Custom Properties for light/dark mode
- **Layout**: CSS Grid for desktop two-column, Flexbox for mobile single-column
- **Accessibility**: WCAG AA compliance with keyboard navigation and screen reader support
- **Testing**: Dual approach with property-based tests for pure logic and unit/integration tests for UI interactions
- **Performance**: Lightweight CSS animations (≤300ms), efficient DOM updates, system fonts

The design prioritizes correctness through property-based testing of core validation and formatting logic, while acknowledging that much of the application's behavior (UI interactions, Local Storage, timers) requires integration testing with real browser APIs.

