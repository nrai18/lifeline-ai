/**
 * @file dashboard.js
 * @description UI Component for the Smart Dashboard. Displays the daily briefing,
 * priority task queue with risk indicators, stats summaries, and timeline view.
 * @module components/dashboard
 */

import { $, showToast } from '../utils/domUtils.js';
import * as Storage from '../services/storage.js';
import { getDailyBriefing } from '../agents/coach.js';
import { analyzePriorities } from '../agents/prioritizer.js';
import { formatRelative, getTimeRemaining } from '../utils/dateUtils.js';

/**
 * Renders the full Dashboard view template.
 * @returns {Promise<string>} HTML string.
 */
export async function renderDashboard() {
  const tasks = Storage.getTasks();
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const stats = Storage.getStats();

  // Sort tasks by priority weight & risk score
  const priorityMap = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const sortedTasks = [...pendingTasks].sort((a, b) => {
    const scoreA = (a.riskScore || 0) * 1.5 + (priorityMap[a.priority] || 2);
    const scoreB = (b.riskScore || 0) * 1.5 + (priorityMap[b.priority] || 2);
    return scoreB - scoreA; // Highest score first
  });

  return `
    <div class="view view--dashboard fade-in">
      <div class="dashboard-header animate-fade-in-down">
        <h1 class="page-title">LifeLine Command Center</h1>
        <p class="text-secondary">AI-prioritized schedule &amp; risk assessment dashboard.</p>
      </div>

      <div class="dashboard-grid">
        
        <!-- COLUMN 1: Briefing & Focus -->
        <div class="dashboard-col-left">
          
          <!-- Daily Briefing Card -->
          <div class="card briefing-card animate-fade-in">
            <div class="card-header">
              <h3 class="card-title">
                <span class="material-symbols-rounded text-accent">chat_bubble</span>
                Your Proactive Daily Briefing
              </h3>
              <button class="btn btn-ghost btn-sm" id="refresh-briefing-btn">
                <span class="material-symbols-rounded">sync</span>
              </button>
            </div>
            <div class="card-body" id="daily-briefing-content">
              <div class="skeleton-line" style="width: 100%;"></div>
              <div class="skeleton-line" style="width: 90%;"></div>
              <div class="skeleton-line" style="width: 95%;"></div>
            </div>
          </div>

          <!-- Quick Action / Focus Suggestion -->
          <div class="card focus-suggest-card animate-fade-in-up">
            <div class="card-header">
              <h3 class="card-title">
                <span class="material-symbols-rounded text-accent">alarm</span>
                Next Focus Block
              </h3>
            </div>
            <div class="card-body">
              ${sortedTasks.length > 0 ? `
                <p class="text-secondary">AI recommends addressing this critical task next:</p>
                <div class="focus-recommendation-box">
                  <h4>${sortedTasks[0].title}</h4>
                  <div class="task-tags" style="margin-top: 8px;">
                    <span class="badge badge-${sortedTasks[0].priority.toLowerCase()}">${sortedTasks[0].priority}</span>
                    <span class="chip chip-sm">${sortedTasks[0].category}</span>
                  </div>
                </div>
                <button class="btn btn-primary" style="width: 100%; margin-top: 16px;" id="dashboard-start-focus-btn" data-id="${sortedTasks[0].id}">
                  <span class="material-symbols-rounded">play_circle</span>
                  Start Focus Timer
                </button>
              ` : `
                <div class="empty-state">
                  <span class="material-symbols-rounded">celebration</span>
                  <p>All clean! No pending tasks to focus on.</p>
                </div>
              `}
            </div>
          </div>

        </div>

        <!-- COLUMN 2: Priority Queue -->
        <div class="dashboard-col-right">
          
          <!-- AI Priority Queue -->
          <div class="card queue-card animate-fade-in">
            <div class="card-header">
              <h3 class="card-title">
                <span class="material-symbols-rounded text-accent">checklist</span>
                Priority Queue
              </h3>
              <span class="badge badge-info">${pendingTasks.length} Pending</span>
            </div>
            <div class="card-body">
              <div class="priority-queue-list" id="dashboard-queue-list">
                ${sortedTasks.slice(0, 5).map(task => {
                  const remaining = getTimeRemaining(task.deadline);
                  const isHighRisk = (task.riskScore || 0) >= 0.7;
                  const isMediumRisk = (task.riskScore || 0) >= 0.4 && (task.riskScore || 0) < 0.7;
                  const riskBadge = isHighRisk ? 'badge-danger' : (isMediumRisk ? 'badge-warning' : 'badge-success');
                  const riskLabel = isHighRisk ? 'High Risk' : (isMediumRisk ? 'Medium Risk' : 'On Track');

                  return `
                    <div class="queue-item" data-id="${task.id}">
                      <div class="queue-item-main">
                        <div class="queue-item-title-row">
                          <span class="queue-item-title">${task.title}</span>
                          <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
                        </div>
                        <span class="queue-item-sub text-muted">
                          Due: ${formatRelative(task.deadline)} (${task.category})
                        </span>
                      </div>
                      <div class="queue-item-risk">
                        <span class="badge ${riskBadge}">${riskLabel}</span>
                      </div>
                    </div>
                  `;
                }).join('')}
                ${sortedTasks.length === 0 ? `
                  <div class="empty-state">
                    <span class="material-symbols-rounded">check_circle</span>
                    <p class="text-secondary">No pending tasks. Add some to build your queue!</p>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  `;
}

/**
 * Initializes and wires up listeners for the dashboard.
 */
export function initDashboard() {
  const refreshBtn = $('#refresh-briefing-btn');
  const briefingContainer = $('#daily-briefing-content');
  const startFocusBtn = $('#dashboard-start-focus-btn');

  const loadBriefing = async (forceRefresh = false) => {
    if (!briefingContainer) return;
    
    // Check cache
    const cached = localStorage.getItem('lifeline_daily_briefing');
    if (cached && !forceRefresh) {
      briefingContainer.innerHTML = cached;
      return;
    }

    if (briefingContainer) {
      briefingContainer.innerHTML = `
        <div class="skeleton-line" style="width: 100%;"></div>
        <div class="skeleton-line" style="width: 90%;"></div>
        <div class="skeleton-line" style="width: 95%;"></div>
      `;
    }

    try {
      const tasks = Storage.getTasks();
      const briefing = await getDailyBriefing(tasks);
      
      // Parse markdown to crude HTML safely
      const cleanHtml = briefing
        .replace(/### (.*)/g, '<h4>$1</h4>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\* (.*)/g, '<li>$1</li>')
        .replace(/\n/g, '<br>');

      localStorage.setItem('lifeline_daily_briefing', cleanHtml);
      if (briefingContainer) briefingContainer.innerHTML = cleanHtml;
    } catch (err) {
      if (briefingContainer) {
        briefingContainer.innerHTML = `<p class="text-danger">Failed to generate AI Briefing. Verify your API key.</p>`;
      }
    }
  };

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => loadBriefing(true));
  }

  if (startFocusBtn) {
    startFocusBtn.addEventListener('click', () => {
      const taskId = startFocusBtn.dataset.id;
      // Redirect to Focus route and preselect task
      window.location.hash = `#focus?task=${taskId}`;
    });
  }

  // Load briefing initially
  loadBriefing();
}
