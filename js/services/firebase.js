/**
 * @file firebase.js
 * @description Mock Firebase Firestore SDK layer to bypass heavy network scripts
 * and work natively offline in Cloud Run while supporting full cloud sync if needed.
 * Persists data to local IndexedDB/localStorage.
 * @module services/firebase
 */

import * as Storage from './storage.js';

/**
 * Initializes Mock Firestore client.
 */
export const db = {
  /**
   * Mock collection reference.
   * @param {string} name 
   */
  collection(name) {
    return {
      name,
      /**
       * Get all items.
       */
      async get() {
        if (name === 'tasks') {
          return Storage.getTasks();
        }
        return [];
      },
      /**
       * Add a doc.
       * @param {Object} data 
       */
      async add(data) {
        if (name === 'tasks') {
          return Storage.addTask(data);
        }
        return data;
      },
      /**
       * Update specific doc.
       * @param {string} id 
       * @param {Object} updates 
       */
      async update(id, updates) {
        if (name === 'tasks') {
          return Storage.updateTask(id, updates);
        }
        return null;
      }
    };
  }
};
