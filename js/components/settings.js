/**
 * @file settings.js
 * @description UI Component for the settings view. Manages Google API credentials,
 * Gemini configurations, and OAuth connectivity widgets.
 * @module components/settings
 */

import { $, showToast } from '../utils/domUtils.js';
import * as Storage from '../services/storage.js';
import { loginToGoogleCalendar, isCalendarAuthenticated } from '../services/calendarService.js';

/**
 * Renders settings panel.
 * @returns {string}
 */
export function renderSettings() {
  const settings = Storage.getSettings();
  const hasGeminiKey = Boolean(settings.geminiApiKey);
  const isCalAuthed = isCalendarAuthenticated();

  return `
    <div class="view view--settings fade-in" style="padding: 24px;">
      <div class="view__header" style="margin-bottom: 24px;">
        <h1 class="page-title">Settings</h1>
        <p class="text-secondary">Manage integrations, API access keys, and project credentials.</p>
      </div>

      <div class="settings-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
        
        <!-- Gemini Key card -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <span class="material-symbols-rounded text-accent">key</span>
              Gemini API Setup
            </h3>
          </div>
          <div class="card-body">
            <div class="input-group" style="margin-bottom: 16px;">
              <label for="settings-gemini-key">API Key</label>
              <input 
                type="password" 
                id="settings-gemini-key" 
                class="input" 
                placeholder="AIzaSy..." 
                value="${settings.geminiApiKey || ''}"
              >
            </div>
            <button class="btn btn-primary" id="save-gemini-settings-btn" style="width:100%;">
              Save Gemini API Key
            </button>
          </div>
        </div>

        <!-- Google Calendar Integration -->
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">
              <span class="material-symbols-rounded text-accent">calendar_today</span>
              Google Calendar API
            </h3>
          </div>
          <div class="card-body">
            <div class="input-group" style="margin-bottom: 16px;">
              <label for="settings-google-client-id">Google Client ID</label>
              <input 
                type="text" 
                id="settings-google-client-id" 
                class="input" 
                placeholder="YOUR_CLIENT_ID.apps.googleusercontent.com" 
                value="${settings.googleClientId || ''}"
              >
            </div>
            
            <div style="margin-bottom: 16px;">
              <p class="text-secondary text-xs" style="margin-bottom: 8px;">OAuth Status:</p>
              <span class="badge ${isCalAuthed ? 'badge-success' : 'badge-danger'}">
                ${isCalAuthed ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            <div style="display: flex; gap: 12px;">
              <button class="btn btn-secondary" id="google-auth-btn" style="flex: 1;">
                ${isCalAuthed ? 'Reconnect' : 'Authorize OAuth'}
              </button>
              <button class="btn btn-ghost" id="save-google-client-btn">Save ID</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

/**
 * Event triggers for settings panel.
 */
export function initSettings() {
  const saveGeminiBtn = $('#save-gemini-settings-btn');
  const geminiInput = $('#settings-gemini-key');
  const saveGoogleBtn = $('#save-google-client-btn');
  const googleInput = $('#settings-google-client-id');
  const authBtn = $('#google-auth-btn');

  if (saveGeminiBtn && geminiInput) {
    saveGeminiBtn.addEventListener('click', () => {
      const key = geminiInput.value.trim();
      if (!key) {
        showToast('Please enter an API Key.', 'warning');
        return;
      }
      Storage.saveSettings({ geminiApiKey: key });
      showToast('Gemini API key saved! 🚀', 'success');
    });
  }

  if (saveGoogleBtn && googleInput) {
    saveGoogleBtn.addEventListener('click', () => {
      const clientId = googleInput.value.trim();
      if (!clientId) {
        showToast('Please enter a Google Client ID.', 'warning');
        return;
      }
      Storage.saveSettings({ googleClientId: clientId });
      showToast('Google Client ID saved!', 'success');
    });
  }

  if (authBtn) {
    authBtn.addEventListener('click', () => {
      // First save Google Client ID if entered
      if (googleInput) {
        const clientId = googleInput.value.trim();
        if (clientId) {
          Storage.saveSettings({ googleClientId: clientId });
        }
      }
      loginToGoogleCalendar();
    });
  }
}
