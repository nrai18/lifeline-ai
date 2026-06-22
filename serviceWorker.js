/**
 * @file serviceWorker.js
 * @description Background Service Worker for managing push notifications
 * and local alarm loops for task deadlines.
 */

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('push', (e) => {
  const data = e.data ? e.data.json() : { title: 'LifeLine AI Alarm', body: 'A deadline is approaching.' };
  
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/assets/icons/logo.png', // Fallback path
      badge: '/assets/icons/logo.png',
      tag: 'deadline-alert',
      requireInteraction: true
    })
  );
});
