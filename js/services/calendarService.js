/**
 * @file calendarService.js
 * @description Google Calendar API service layer. Manages client-side Google OAuth 2.0 flow
 * and handles reading free/busy slots and creating focus block events.
 * @module services/calendarService
 */

import { $, showToast } from '../utils/domUtils.js';

// Configuration details for Google OAuth 2.0 API Client
const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // User configures in settings
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

let accessToken = null;

/**
 * Initiates the implicit Google OAuth 2.0 flow in the browser.
 */
export function loginToGoogleCalendar() {
  const settings = JSON.parse(localStorage.getItem('lifeline_settings') || '{}');
  const clientId = settings.googleClientId || CLIENT_ID;

  if (clientId.includes('YOUR_GOOGLE_CLIENT_ID')) {
    showToast('Please configure a valid Google Client ID in Settings first.', 'warning');
    return;
  }

  const redirectUri = window.location.origin + window.location.pathname;
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=token&` +
    `scope=${encodeURIComponent(SCOPES)}`;

  window.location.href = authUrl;
}

/**
 * Handles checking URL hash fragments for an OAuth 2.0 access token.
 */
export function handleOAuthRedirect() {
  const hash = window.location.hash;
  if (hash && hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    accessToken = params.get('access_token');
    
    // Save to session memory
    sessionStorage.setItem('lifeline_google_token', accessToken);
    
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
    showToast('Successfully authenticated with Google Calendar! 📅', 'success');
  } else {
    accessToken = sessionStorage.getItem('lifeline_google_token');
  }
}

/**
 * Checks if the user is authenticated with Google Calendar.
 * @returns {boolean}
 */
export function isCalendarAuthenticated() {
  handleOAuthRedirect();
  return !!accessToken;
}

/**
 * Retrieves events for a specific time range to find conflicts.
 * @param {string} timeMin ISO string
 * @param {string} timeMax ISO string
 * @returns {Promise<Array<Object>>}
 */
export async function getCalendarEvents(timeMin, timeMax) {
  if (!isCalendarAuthenticated()) {
    throw new Error('Google Calendar not authenticated.');
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${encodeURIComponent(timeMin)}&` +
    `timeMax=${encodeURIComponent(timeMax)}&` +
    `singleEvents=true&` +
    `orderBy=startTime`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Failed to retrieve Google Calendar events.');
  }

  const data = await response.json();
  return data.items || [];
}

/**
 * Scans a day's calendar window (e.g., 9 AM to 6 PM) to find free focus slot durations.
 * @param {string} dateStr YYYY-MM-DD
 * @param {number} durationMinutes Target work block duration
 * @returns {Promise<Array<{start: Date, end: Date}>>} Available free time chunks
 */
export async function findFreeFocusSlots(dateStr, durationMinutes = 60) {
  const startOfDay = new Date(`${dateStr}T09:00:00`);
  const endOfDay = new Date(`${dateStr}T18:00:00`);

  const events = await getCalendarEvents(startOfDay.toISOString(), endOfDay.toISOString());

  // Simplify events to start & end bounds
  const busySlots = events.map(event => ({
    start: new Date(event.start.dateTime || event.start.date),
    end: new Date(event.end.dateTime || event.end.date)
  })).sort((a, b) => a.start - b.start);

  const freeSlots = [];
  let currentTime = startOfDay;

  for (const busy of busySlots) {
    if (busy.start > currentTime) {
      const diffMs = busy.start - currentTime;
      const diffMin = diffMs / (1000 * 60);
      if (diffMin >= durationMinutes) {
        freeSlots.push({ start: new Date(currentTime), end: new Date(busy.start) });
      }
    }
    if (busy.end > currentTime) {
      currentTime = busy.end;
    }
  }

  if (endOfDay > currentTime) {
    const diffMs = endOfDay - currentTime;
    const diffMin = diffMs / (1000 * 60);
    if (diffMin >= durationMinutes) {
      freeSlots.push({ start: new Date(currentTime), end: new Date(endOfDay) });
    }
  }

  return freeSlots;
}

/**
 * Creates a Focus Block event in the user's primary Google Calendar.
 * @param {string} summary Event title
 * @param {string} startISO ISO format
 * @param {string} endISO ISO format
 * @returns {Promise<Object>} Created Event
 */
export async function createFocusBlockEvent(summary, startISO, endISO) {
  if (!isCalendarAuthenticated()) {
    throw new Error('Google Calendar not authenticated.');
  }

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

  const requestBody = {
    summary: `🎯 Focus Block: ${summary}`,
    description: 'Focus Block automatically scheduled by LifeLine AI.',
    start: { dateTime: startISO },
    end: { dateTime: endISO },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 15 }
      ]
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error('Failed to create calendar event.');
  }

  return await response.json();
}
