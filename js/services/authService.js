/**
 * @file authService.js
 * @description Authentication service managing simulated users, OTP deliveries,
 * transactional welcome emails, and device-local DB verification loops.
 * @module services/authService
 */

import { showToast } from '../utils/domUtils.js';

let generatedOTP = null;
let targetEmail = '';

/**
 * Sends a transactional welcome email & OTP (simulated via standard Web Console API logging).
 * In production, this targets endpoints connected to SMTP services.
 * @param {string} email
 */
export async function sendEmailOTP(email) {
  targetEmail = email;
  // Generate random 6 digit OTP
  generatedOTP = String(Math.floor(100000 + Math.random() * 900000));
  
  console.log(`%c[EMAIL CLIENT] To: ${email}\nSubject: LifeLine AI Login OTP\nBody: Your OTP code is ${generatedOTP}. Use this code to complete access verification.`, "color: #4ade80; font-weight: bold; font-size: 1.1em;");
  
  // Return simulated delay
  return new Promise((resolve) => setTimeout(resolve, 800));
}

/**
 * Verifies the OTP code.
 * @param {string} enteredOTP
 * @returns {boolean}
 */
export function verifyOTP(enteredOTP) {
  if (enteredOTP === generatedOTP) {
    // Save to user storage session
    localStorage.setItem('lifeline_auth_user', JSON.stringify({
      email: targetEmail,
      loggedInAt: new Date().toISOString()
    }));
    
    sendWelcomeEmail(targetEmail);
    return true;
  }
  return false;
}

/**
 * Simulates sending a transactional onboarding welcome email.
 * @param {string} email
 */
function sendWelcomeEmail(email) {
  console.log(`%c[EMAIL CLIENT] To: ${email}\nSubject: Welcome to LifeLine AI!\nBody: Account successfully configured! Welcome to your new intelligent productivity assistant. Get started by organizing your tasks now.`, "color: #38bdf8; font-weight: bold; font-size: 1.1em;");
}

/**
 * Checks if a valid login exists.
 * @returns {boolean}
 */
export function isUserAuthenticated() {
  return !!localStorage.getItem('lifeline_auth_user');
}
