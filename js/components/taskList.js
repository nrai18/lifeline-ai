/**
 * @file taskList.js
 * @description UI Component for rendering the task list, subtasks, toggling progress, and deleting.
 * @module components/taskList
 */

import { $, $$, showToast } from '../utils/domUtils.js';
import * as Storage from '../services/storage.js';
import { formatRelative, getTimeRemaining } from '../utils/dateUtils.js';

/**
 * Renders the HTML markup for the task listing container.
 * @returns {string} HTML string.
 */
export function renderTaskList() {
  return `
    <div class="task-list-container">
      <div class="list-filters-header">
        <div class="search-box">
          <span class="material-symbols-rounded search-icon">search</span>
          <input type="text" id="task-search-input" class="input" placeholder="Search tasks...">
        </div>
        <div class="filter-controls">
          <select id="filter-status" class="select select-sm">
            <option value="all">All Status</option>
            <option value="pending" selected>Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select id="filter-category" class="select select-sm">
            <option value="all">All Categories</option>
            <option value="Work">Work</option>
            <option value="Study">Study</option>
            <option value="Personal">Personal</option>
            <option value="Health">Health</option>
            <option value="Finance">Finance</option>
            <option value="Social">Social</option>
          </select>
        </div>
      </div>

      <div class="tasks-grid" id="tasks-rendering-grid">
        <!-- Rendered task cards go here -->
      </div>
    </div>
  `;
}

/**
 * Generates the HTML for individual task cards.
 * @param {Array<Object>} tasks - Filtered list of tasks to render.
 */
export function renderTaskCards(tasks) {
  const container = $('#tasks-rendering-grid');
  if (!container) return;

  if (tasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state animate-fade-in">
        <span class="material-symbols-rounded empty-state-icon">task</span>
        <h4>No tasks found</h4>
        <p class="text-secondary">Try changing filters or add a new task to get started.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = tasks.map(task => {
    const isCompleted = task.status === 'completed';
    const remaining = getTimeRemaining(task.deadline);
    const relativeTime = formatRelative(task.deadline);
    
    // Risk band styling
    let riskClass = 'risk-low';
    let riskLabel = 'Low Risk';
    if ((task.riskScore || 0) >= 0.7) {
      riskClass = 'risk-high';
      riskLabel = 'High Deadline Risk';
    } else if ((task.riskScore || 0) >= 0.4) {
      riskClass = 'risk-medium';
      riskLabel = 'Medium Deadline Risk';
    }

    // Subtask progress
    const subtasks = task.subtasks || [];
    const completedSubs = subtasks.filter(s => s.completed).length;
    const progressPercent = subtasks.length > 0 ? Math.round((completedSubs / subtasks.length) * 100) : 0;

    return `
      <div class="card task-card ${isCompleted ? 'task-card--completed' : ''} animate-fade-in-up" data-id="${task.id}">
        <div class="task-card__border-stripe ${riskClass}"></div>
        <div class="task-card__header">
          <div class="task-card__title-row">
            <input 
              type="checkbox" 
              class="task-checkbox" 
              ${isCompleted ? 'checked' : ''} 
              aria-label="Mark task as complete"
            >
            <h4 class="task-card__title">${task.title}</h4>
          </div>
          <button class="btn-icon btn-danger delete-task-btn" aria-label="Delete Task">
            <span class="material-symbols-rounded">delete</span>
          </button>
        </div>

        <p class="task-card__desc">${task.description || 'No description provided.'}</p>

        <!-- Subtask Progress -->
        ${subtasks.length > 0 ? `
          <div class="task-card__subtasks-section">
            <div class="subtask-progress-meta">
              <span class="text-secondary text-xs">Subtasks: ${completedSubs}/${subtasks.length}</span>
              <span class="text-accent text-xs font-semibold">${progressPercent}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-bar-fill" style="width: ${progressPercent}%;"></div>
            </div>
            <ul class="subtasks-list">
              ${subtasks.map(sub => `
                <li class="subtask-item ${sub.completed ? 'subtask-item--completed' : ''}" data-sub-id="${sub.id}">
                  <input type="checkbox" class="subtask-checkbox" ${sub.completed ? 'checked' : ''}>
                  <span class="subtask-title">${sub.title}</span>
                  <span class="subtask-duration text-muted text-xs">${sub.estimatedMinutes}m</span>
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <!-- Task Footer Details -->
        <div class="task-card__footer">
          <div class="task-tags">
            <span class="chip chip-sm">${task.category}</span>
            <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
          </div>
          
          <div class="task-meta-row">
            <span class="task-deadline ${remaining.isOverdue && !isCompleted ? 'text-danger' : 'text-secondary'}">
              <span class="material-symbols-rounded text-xs">alarm</span>
              ${relativeTime}
            </span>
            ${!isCompleted ? `
              <span class="badge ${riskClass}">
                <span class="risk-indicator"></span>
                ${riskLabel}
              </span>
            ` : ''}
          </div>
        </div>

        <!-- AI Coach Insight Note -->
        ${task.aiNotes && !isCompleted ? `
          <div class="task-card__ai-tip">
            <span class="material-symbols-rounded text-accent">smart_toy</span>
            <p class="text-xs text-secondary italic">${task.aiNotes}</p>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

/**
 * Filters the list of tasks based on UI inputs.
 */
export function applyFiltersAndRender() {
  const query = ($('#task-search-input')?.value || '').toLowerCase();
  const status = $('#filter-status')?.value || 'all';
  const category = $('#filter-category')?.value || 'all';

  let tasks = Storage.getTasks();

  // Search filter
  if (query) {
    tasks = tasks.filter(t => t.title.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query));
  }

  // Status filter
  if (status !== 'all') {
    tasks = tasks.filter(t => t.status === status);
  }

  // Category filter
  if (category !== 'all') {
    tasks = tasks.filter(t => t.category === category);
  }

  renderTaskCards(tasks);
}

/**
 * Initializes listeners for the task list filters and actions.
 * @param {Function} onListUpdated - Callback invoked when a status, progress update, or deletion changes.
 */
export function initTaskListListeners(onListUpdated) {
  const container = $('#tasks-rendering-grid');
  const searchInput = $('#task-search-input');
  const filterStatus = $('#filter-status');
  const filterCategory = $('#filter-category');

  if (searchInput) searchInput.addEventListener('input', applyFiltersAndRender);
  if (filterStatus) filterStatus.addEventListener('change', applyFiltersAndRender);
  if (filterCategory) filterCategory.addEventListener('change', applyFiltersAndRender);

  if (container) {
    container.addEventListener('click', (e) => {
      const card = e.target.closest('.task-card');
      if (!card) return;
      const taskId = card.dataset.id;

      // Handle Task Complete Checkbox
      if (e.target.classList.contains('task-checkbox')) {
        const isChecked = e.target.checked;
        const newStatus = isChecked ? 'completed' : 'pending';
        Storage.updateTask(taskId, {
          status: newStatus,
          completedAt: isChecked ? new Date().toISOString() : null
        });
        
        // Update total stats if completed
        if (isChecked) {
          const currentStats = Storage.getStats();
          Storage.saveStats({
            tasksCompleted: currentStats.tasksCompleted + 1,
            xp: currentStats.xp + 100
          });
        }
        
        showToast(isChecked ? 'Task completed! Keep it up! 🏆' : 'Task reopened.', isChecked ? 'success' : 'info');
        applyFiltersAndRender();
        if (onListUpdated) onListUpdated();
      }

      // Handle Subtask Checkbox
      if (e.target.classList.contains('subtask-checkbox')) {
        const subItem = e.target.closest('.subtask-item');
        const subId = subItem.dataset.subId;
        const isChecked = e.target.checked;
        
        const task = Storage.getTasks().find(t => t.id === taskId);
        if (task) {
          const updatedSubs = (task.subtasks || []).map(s => {
            if (s.id === subId) return { ...s, completed: isChecked };
            return s;
          });
          
          Storage.updateTask(taskId, { subtasks: updatedSubs });
          applyFiltersAndRender();
          if (onListUpdated) onListUpdated();
        }
      }

      // Handle Delete Button
      if (e.target.closest('.delete-task-btn')) {
        Storage.deleteTask(taskId);
        showToast('Task deleted successfully.', 'info');
        applyFiltersAndRender();
        if (onListUpdated) onListUpdated();
      }
    });
  }

  // Draw initial list
  applyFiltersAndRender();
}
