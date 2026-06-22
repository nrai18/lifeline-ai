/**
 * @file domUtils.js
 * @description DOM manipulation helpers, toast / modal UI, and common
 * utility functions (debounce, throttle, XSS-safe escaping).
 * @module utils/domUtils
 */

// ── Selectors ──────────────────────────────────────────────────────────

/**
 * Shorthand for `document.querySelector`.
 * @param {string} selector — CSS selector
 * @param {ParentNode} [parent=document] — Scope to search within
 * @returns {Element|null}
 */
export function $(selector, parent = document) {
  return parent.querySelector(selector);
}

/**
 * Shorthand for `document.querySelectorAll`, returned as a real Array.
 * @param {string} selector — CSS selector
 * @param {ParentNode} [parent=document]
 * @returns {Element[]}
 */
export function $$(selector, parent = document) {
  return [...parent.querySelectorAll(selector)];
}

// ── Element factory ────────────────────────────────────────────────────

/**
 * Create a DOM element with optional class, id, content, attributes,
 * children, and event listeners — all in one call.
 *
 * @param {string} tag — HTML tag name (e.g. `'div'`, `'button'`)
 * @param {Object} [options]
 * @param {string}   [options.className]   — Space-separated class names
 * @param {string}   [options.id]          — Element id
 * @param {string}   [options.innerHTML]   — Raw HTML (use with caution)
 * @param {string}   [options.textContent] — Safe text content
 * @param {Object<string,string>} [options.attributes] — Attribute key/value map
 * @param {Element[]}             [options.children]   — Child elements to append
 * @param {Object<string,Function>} [options.events]   — Event listeners
 * @returns {HTMLElement}
 *
 * @example
 * const btn = createElement('button', {
 *   className: 'btn btn-primary',
 *   textContent: 'Save',
 *   attributes: { 'data-action': 'save' },
 *   events: { click: () => console.log('saved!') }
 * });
 */
export function createElement(tag, options = {}) {
  const el = document.createElement(tag);

  if (options.className)   el.className = options.className;
  if (options.id)          el.id = options.id;
  if (options.textContent) el.textContent = options.textContent;
  if (options.innerHTML)   el.innerHTML = options.innerHTML;

  if (options.attributes) {
    for (const [attr, val] of Object.entries(options.attributes)) {
      el.setAttribute(attr, val);
    }
  }

  if (options.children) {
    options.children.forEach((child) => el.appendChild(child));
  }

  if (options.events) {
    for (const [event, handler] of Object.entries(options.events)) {
      el.addEventListener(event, handler);
    }
  }

  return el;
}

// ── Toast notifications ────────────────────────────────────────────────

/**
 * Display a toast notification that auto-dismisses.
 *
 * Toast types map to CSS modifier classes:
 * `toast--info`, `toast--success`, `toast--warning`, `toast--error`
 *
 * @param {string} message  — Text to display
 * @param {'info'|'success'|'warning'|'error'} [type='info']
 * @param {number} [duration=3000] — Milliseconds before auto-dismiss
 */
export function showToast(message, type = 'info', duration = 3000) {
  // Ensure a container exists
  let container = $('#toast-container');
  if (!container) {
    container = createElement('div', { id: 'toast-container', className: 'toast-container' });
    document.body.appendChild(container);
  }

  const icons = {
    info:    'ℹ️',
    success: '✅',
    warning: '⚠️',
    error:   '❌'
  };

  const toast = createElement('div', {
    className: `toast toast--${type}`,
    innerHTML: `
      <span class="toast__icon">${icons[type] || icons.info}</span>
      <span class="toast__message">${escapeHtml(message)}</span>
      <button class="toast__close" aria-label="Close">&times;</button>
    `
  });

  // Allow manual dismiss
  const closeBtn = $('button.toast__close', toast);
  if (closeBtn) {
    closeBtn.addEventListener('click', () => dismissToast(toast));
  }

  container.appendChild(toast);

  // Trigger enter animation on next frame
  requestAnimationFrame(() => toast.classList.add('toast--visible'));

  // Auto dismiss
  setTimeout(() => dismissToast(toast), duration);
}

/**
 * Animate a toast out then remove it from the DOM.
 * @param {HTMLElement} toast
 */
function dismissToast(toast) {
  toast.classList.remove('toast--visible');
  toast.classList.add('toast--exit');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  // Safety fallback in case animationend never fires
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
}

// ── Modal ──────────────────────────────────────────────────────────────

/**
 * Show a modal dialog.
 *
 * @param {string|HTMLElement} content — HTML string or DOM element
 * @param {Object}  [options]
 * @param {string}  [options.title]        — Modal heading
 * @param {boolean} [options.closable=true] — Show the × button
 * @param {string}  [options.size='medium'] — 'small' | 'medium' | 'large'
 * @param {Function} [options.onClose]     — Callback fired on close
 */
export function showModal(content, options = {}) {
  const { title = '', closable = true, size = 'medium', onClose } = options;

  // Remove any existing modal
  hideModal();

  const overlay = createElement('div', {
    className: 'modal-overlay modal-overlay--visible',
    attributes: { role: 'dialog', 'aria-modal': 'true' }
  });

  const modalContent = typeof content === 'string'
    ? content
    : '';

  const modal = createElement('div', {
    className: `modal modal--${size}`,
    innerHTML: `
      ${title ? `<div class="modal__header">
        <h2 class="modal__title">${escapeHtml(title)}</h2>
        ${closable ? '<button class="modal__close" aria-label="Close">&times;</button>' : ''}
      </div>` : ''}
      <div class="modal__body">${modalContent}</div>
    `
  });

  // If content is a DOM element, append it into .modal__body
  if (typeof content !== 'string') {
    const body = $(' .modal__body', modal);
    if (body) body.appendChild(content);
  }

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close handlers
  if (closable) {
    const closeBtn = $('.modal__close', modal);
    if (closeBtn) closeBtn.addEventListener('click', () => { hideModal(); onClose?.(); });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) { hideModal(); onClose?.(); }
    });

    // Escape key
    const escHandler = (e) => {
      if (e.key === 'Escape') { hideModal(); onClose?.(); document.removeEventListener('keydown', escHandler); }
    };
    document.addEventListener('keydown', escHandler);
  }

  // Entrance animation
  requestAnimationFrame(() => modal.classList.add('modal--visible'));
}

/**
 * Close and remove the currently-visible modal.
 */
export function hideModal() {
  const overlay = $('.modal-overlay');
  if (overlay) overlay.remove();
}

// ── Animations ─────────────────────────────────────────────────────────

/**
 * Add a CSS animation class to an element and automatically remove it
 * when the animation completes.
 *
 * @param {HTMLElement} element
 * @param {string} animationClass — e.g. `'fade-in'`, `'slide-up'`
 * @returns {Promise<void>} Resolves when the animation ends
 */
export function animate(element, animationClass) {
  return new Promise((resolve) => {
    element.classList.add(animationClass);

    const handler = () => {
      element.classList.remove(animationClass);
      element.removeEventListener('animationend', handler);
      resolve();
    };

    element.addEventListener('animationend', handler, { once: true });

    // Fallback if animationend never fires (e.g. display:none)
    setTimeout(() => {
      if (element.classList.contains(animationClass)) {
        element.classList.remove(animationClass);
        resolve();
      }
    }, 2000);
  });
}

// ── Utility functions ──────────────────────────────────────────────────

/**
 * Create a debounced version of `fn` that delays invocation until
 * `delay` ms have elapsed since the last call.
 *
 * @template {Function} T
 * @param {T} fn
 * @param {number} delay — Milliseconds
 * @returns {T & { cancel(): void }}
 */
export function debounce(fn, delay) {
  /** @type {ReturnType<typeof setTimeout>|null} */
  let timer = null;

  /** @type {any} */
  const debounced = (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { fn(...args); timer = null; }, delay);
  };

  debounced.cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  return debounced;
}

/**
 * Create a throttled version of `fn` that fires at most once every
 * `limit` ms.
 *
 * @template {Function} T
 * @param {T} fn
 * @param {number} limit — Milliseconds
 * @returns {T}
 */
export function throttle(fn, limit) {
  let waiting = false;

  /** @type {any} */
  const throttled = (...args) => {
    if (waiting) return;
    fn(...args);
    waiting = true;
    setTimeout(() => { waiting = false; }, limit);
  };

  return throttled;
}

/**
 * Escape a string for safe insertion into HTML, preventing XSS.
 *
 * @param {string} str — Untrusted input
 * @returns {string} Escaped string safe for innerHTML
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
