/**
 * @file app.js
 * @description Main application controller for LifeLine AI.
 * Bootstraps the SPA, owns the hash-based router, manages navigation
 * state, and orchestrates view rendering.
 * @module app
 */

import { CONFIG } from './config.js';
import * as Storage from './services/storage.js';
import { getGreeting, formatDate } from './utils/dateUtils.js';
import { $, $$, createElement, showToast, showModal, hideModal } from './utils/domUtils.js';

// ── Route registry ─────────────────────────────────────────────────────

/**
 * @typedef {Object} RouteDefinition
 * @property {string}   title  — Document title suffix
 * @property {string}   icon   — Sidebar icon (emoji for now; swap for SVG later)
 * @property {Function} render — Async function that returns the view HTML
 */

/** @type {Record<string, RouteDefinition>} */
const ROUTES = {
  dashboard: {
    title: 'Dashboard',
    icon: '📊',
    render: renderDashboard
  },
  tasks: {
    title: 'Tasks',
    icon: '✅',
    render: renderTasks
  },
  chat: {
    title: 'AI Chat',
    icon: '💬',
    render: renderChat
  },
  calendar: {
    title: 'Calendar',
    icon: '📅',
    render: renderCalendar
  },
  focus: {
    title: 'Focus Mode',
    icon: '🎯',
    render: renderFocus
  },
  settings: {
    title: 'Settings',
    icon: '⚙️',
    render: renderSettings
  }
};

/** Route to load when the hash is empty or unrecognised. */
const DEFAULT_ROUTE = 'dashboard';

// ── View Renderers & Component Imports ─────────────────────────────────
import { renderDashboard, initDashboard } from './components/dashboard.js';
import { renderChat, initChat } from './components/chat.js';
import { renderTaskList, initTaskListListeners } from './components/taskList.js';
import { renderTaskForm, initTaskFormListeners } from './components/taskForm.js';
import { renderCalendar, initCalendar } from './components/calendar.js';

/**
 * Tasks View Renderer
 */
function renderTasks() {
  return `
    <div class="view view--tasks fade-in">
      <div class="view-grid-two-col" style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 24px; padding: 24px;">
        <div class="tasks-left-pane">
          ${renderTaskForm()}
        </div>
        <div class="tasks-right-pane">
          ${renderTaskList()}
        </div>
      </div>
    </div>
  `;
}

/**
 * Focus View Renderer
 */
function renderFocus() {
  return `
    <div class="view view--focus fade-in">
      <div class="view__header">
        <h1>Focus Mode</h1>
        <p class="view__subtitle">Deep work blocks & Pomodoro coaching</p>
      </div>
      <div class="view__body placeholder">
        <p class="placeholder__note">Focus mode timer and coach integrations are coming next...</p>
      </div>
    </div>`;
}

/**
 * Settings View Renderer
 */
function renderSettings() {
  const settings = Storage.getSettings();
  const hasKey = Boolean(settings.geminiApiKey);
  return `
    <div class="view view--settings fade-in">
      <div class="view__header" style="padding: 24px;">
        <h1>Settings</h1>
      </div>
      <div style="padding: 24px;">
        <div class="card">
          <div class="card-body">
            <p style="margin-bottom: 12px;">Gemini API Configuration: ${hasKey ? '<strong>✅ Configured</strong>' : '<strong>❌ Not configured</strong>'}</p>
            <button class="btn btn-secondary" onclick="localStorage.removeItem('lifeline_settings'); window.location.reload();">
              Configure New Key
            </button>
          </div>
        </div>
      </div>
    </div>`;
}


// ── App controller ─────────────────────────────────────────────────────

/**
 * Core application singleton.
 * Handles routing, view rendering, navigation, and first-run setup.
 */
const App = {
  // ── Lifecycle ────────────────────────────────────────────────────────

  /**
   * Bootstrap the application.
   * Called once on DOMContentLoaded.
   */
  init() {
    console.log(`[${CONFIG.APP_NAME}] v${CONFIG.APP_VERSION} — initialising…`);

    // Wire up hash-based routing
    window.addEventListener('hashchange', () => this.onRouteChange());

    // Set up sidebar nav clicks
    this.setupNavigation();

    // Set up global keyboard shortcuts
    this.setupGlobalListeners();

    // First-run: prompt for API key if missing
    this.checkFirstRun();

    // Navigate to the current hash (or default)
    this.onRouteChange();

    // Update last-active stat
    Storage.updateStats({ lastActiveDate: new Date().toISOString() });

    console.log(`[${CONFIG.APP_NAME}] Ready.`);
  },

  // ── Routing ──────────────────────────────────────────────────────────

  /**
   * Navigate to a named route by updating the hash.
   * @param {string} route — Route key (e.g. `'tasks'`)
   */
  navigate(route) {
    window.location.hash = `#${route}`;
  },

  /**
   * Handle hash change: resolve the route, update UI, render the view.
   * @private
   */
  onRouteChange() {
    const route = this.getCurrentRoute();
    this.updateActiveNav(route);
    this.renderView(route);
  },

  /**
   * Extract the current route name from `location.hash`.
   * Falls back to DEFAULT_ROUTE.
   * @returns {string}
   */
  getCurrentRoute() {
    const hash = window.location.hash.replace('#', '').trim();
    return ROUTES[hash] ? hash : DEFAULT_ROUTE;
  },

  /**
   * Render a view into the main content area.
   * @param {string} viewName — Key in ROUTES
   */
  async renderView(viewName) {
    const route = ROUTES[viewName];
    if (!route) {
      console.warn(`[Router] Unknown view: ${viewName}`);
      this.navigate(DEFAULT_ROUTE);
      return;
    }

    // Update document title
    document.title = `${route.title} — ${CONFIG.APP_NAME}`;

    // Get view container (inside main-content)
    const container = $('#view-container') || $('#main-content') || $('main');
    if (!container) {
      console.error('[App] No #view-container element found.');
      return;
    }

    try {
      const html = await route.render();
      container.innerHTML = html;

      // Initialize view-specific behavior
      if (viewName === 'dashboard') {
        initDashboard();
      } else if (viewName === 'chat') {
        initChat();
      } else if (viewName === 'tasks') {
        initTaskFormListeners(() => {
          initTaskListListeners(); // Reload list on update
        });
        initTaskListListeners();
      } else if (viewName === 'calendar') {
        initCalendar();
      }
    } catch (err) {
      console.error(`[App] Failed to render "${viewName}":`, err);
      container.innerHTML = `
        <div class="view view--error">
          <h1>Something went wrong</h1>
          <p>${err.message}</p>
        </div>`;
    }
  },

  // ── Navigation ───────────────────────────────────────────────────────

  /**
   * Attach click handlers to all navigation items (sidebar + mobile nav).
   * Expected markup: `<a data-view="…">` inside sidebar and mobile nav.
   * @private
   */
  setupNavigation() {
    // Handle both sidebar and mobile nav clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('[data-view]');
      if (!link) return;
      e.preventDefault();
      const route = link.dataset.view;
      this.navigate(route);
    });

    // Mobile sidebar toggle
    const sidebarToggle = $('#sidebar-toggle');
    const sidebar = $('#sidebar');
    if (sidebarToggle && sidebar) {
      sidebarToggle.addEventListener('click', () => {
        sidebar.classList.toggle('sidebar--open');
      });
      // Close sidebar when clicking outside on mobile
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('sidebar--open') &&
            !sidebar.contains(e.target) &&
            e.target !== sidebarToggle &&
            !sidebarToggle.contains(e.target)) {
          sidebar.classList.remove('sidebar--open');
        }
      });
    }

    // Mobile quick-add button
    const quickAdd = $('#mobile-quick-add');
    if (quickAdd) {
      quickAdd.addEventListener('click', () => {
        this.navigate('tasks');
        // TODO: open task creation form
      });
    }
  },

  /**
   * Highlight the active nav link in both sidebar and mobile nav.
   * @param {string} activeRoute
   * @private
   */
  updateActiveNav(activeRoute) {
    $$('[data-view]').forEach((link) => {
      const isActive = link.dataset.view === activeRoute;
      link.classList.toggle('active', isActive);
    });
  },

  // ── Global listeners ─────────────────────────────────────────────────

  /**
   * Register application-wide keyboard shortcuts.
   * @private
   */
  setupGlobalListeners() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K → focus search (future)
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        showToast('Search coming soon!', 'info');
      }

      // Quick-nav shortcuts: Alt + 1–6
      if (e.altKey && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const routeKeys = Object.keys(ROUTES);
        const idx = parseInt(e.key, 10) - 1;
        if (routeKeys[idx]) this.navigate(routeKeys[idx]);
      }
    });
  },

  // ── First-run / API key setup ────────────────────────────────────────

  /**
   * Check whether the Gemini API key is configured.
   * If not, show a modal prompting the user to enter one.
   * @private
   */
  checkFirstRun() {
    const settings = Storage.getSettings();
    if (settings.geminiApiKey) return;

    // Use the setup modal already in the HTML
    const setupOverlay = $('#setup-overlay');
    if (!setupOverlay) return;

    setupOverlay.style.display = 'flex';

    const saveBtn = $('#save-api-key');
    const apiInput = $('#api-key-input');
    const toggleBtn = $('#toggle-key-visibility');

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const key = apiInput?.value?.trim();
        if (!key) {
          showToast('Please enter a valid API key.', 'warning');
          return;
        }
        Storage.saveSettings({ geminiApiKey: key });
        setupOverlay.style.display = 'none';
        showToast('API key saved! AI features are now enabled. 🚀', 'success');
        this.renderView(this.getCurrentRoute());
      });
    }

    // Toggle password visibility
    if (toggleBtn && apiInput) {
      toggleBtn.addEventListener('click', () => {
        const isPassword = apiInput.type === 'password';
        apiInput.type = isPassword ? 'text' : 'password';
        toggleBtn.querySelector('.material-symbols-rounded').textContent =
          isPassword ? 'visibility_off' : 'visibility';
      });
    }
  }
};

// ── Bootstrap ──────────────────────────────────────────────────────────

/** Expose App globally so inline handlers / devtools can reach it. */
window.App = App;

/** Kick things off once the DOM is ready. */
document.addEventListener('DOMContentLoaded', () => App.init());

export default App;
