/**
 * @file notifications.js
 * @description Local notification dispatcher. Requests user permission and registers background
 * Service Worker hooks to trigger desktop deadline alerts.
 * @module services/notifications
 */

import { showToast } from '../utils/domUtils.js';

let serviceWorkerRegistration = null;

/**
 * Initializes and registers the service worker file.
 */
export async function initNotifications() {
  if (!('Notification' in window)) {
    console.warn('Notifications not supported in browser.');
    return;
  }

  // Request browser notification permissions
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if ('serviceWorker' in navigator) {
    try {
      serviceWorkerRegistration = await navigator.serviceWorker.register('/serviceWorker.js');
      console.log('[Notification Service] ServiceWorker registered.');
    } catch (err) {
      console.warn('[Notification Service] ServiceWorker registration failed:', err);
    }
  }
}

/**
 * Dispatches a desktop notification immediately.
 * @param {string} title
 * @param {string} body
 */
export function sendDesktopNotification(title, body) {
  if (Notification.permission !== 'granted') {
    // Fallback to in-app toast
    showToast(`${title}: ${body}`, 'info');
    return;
  }

  if (serviceWorkerRegistration && serviceWorkerRegistration.showNotification) {
    serviceWorkerRegistration.showNotification(title, {
      body,
      tag: 'lifeline-deadline'
    });
  } else {
    new Notification(title, { body });
  }
}

/**
 * Schedules dynamic local alarms for pending deadlines.
 * Checks list and triggers warnings at 60m, 30m, and 15m left.
 * @param {Array<Object>} tasks - List of active tasks
 */
export function monitorDeadlinesAndAlert(tasks) {
  const pending = tasks.filter(t => t.status !== 'completed');
  const now = Date.now();

  pending.forEach(task => {
    const deadlineTime = new Date(task.deadline).getTime();
    const diffMs = deadlineTime - now;
    const diffMin = Math.round(diffMs / (1000 * 60));

    // Alarm thresholds matching critical limits
    if (diffMin === 60) {
      sendDesktopNotification('Deadline Warning (1 Hour Left)', `"${task.title}" is due soon. Open LifeLine to start focus sessions!`);
    } else if (diffMin === 30) {
      sendDesktopNotification('Deadline Urgency (30 Mins Left)', `"${task.title}" due in 30 minutes. Schedule time now.`);
    } else if (diffMin === 15) {
      sendDesktopNotification('🚨 Critical Collision (15 Mins Left)', `"${task.title}" is almost due! Auto-block calendar immediately.`);
    }
  });
}
