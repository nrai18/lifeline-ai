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

          <!-- Google Calendar Free Slot Finder -->
          <div class="card calendar-slots-card animate-fade-in-up">
            <div class="card-header">
              <h3 class="card-title">
                <span class="material-symbols-rounded text-accent">calendar_month</span>
                Google Calendar Slots
              </h3>
            </div>
            <div class="card-body" id="calendar-slots-body">
              <p class="text-secondary text-xs">Verify free slots today and auto-block time.</p>
              <div id="slots-loader-area" style="margin-top: 12px;">
                <button class="btn btn-secondary btn-sm" id="dashboard-check-slots-btn">Scan Today's Slots</button>
              </div>
            </div>
          </div>

        </div>

        <!-- COLUMN 2: Priority Queue -->
        <div class="dashboard-col-right">
          
          <!-- AI Priority Queue -->
          <div class="card queue-card animate-fade-in" style="margin-bottom: 24px;">
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

          <!-- Schedule Collision Warnings & Negotiations -->
          <div class="card collision-card animate-fade-in-up">
            <div class="card-header" style="background: rgba(239, 68, 68, 0.1); border-bottom: 1px solid rgba(239, 68, 68, 0.2);">
              <h3 class="card-title text-danger">
                <span class="material-symbols-rounded">warning</span>
                Collision &amp; Overload Alerts
              </h3>
            </div>
            <div class="card-body" id="collision-warnings-container" style="min-height: 80px; padding: 16px;">
              <p class="text-secondary text-xs">AI is scanning deadlines against workload allocation bounds...</p>
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

  // Hook Scan Free Slots button
  const checkSlotsBtn = $('#dashboard-check-slots-btn');
  const slotsBody = $('#calendar-slots-body');

  if (checkSlotsBtn && slotsBody) {
    checkSlotsBtn.addEventListener('click', async () => {
      const { isCalendarAuthenticated, findFreeFocusSlots, createFocusBlockEvent } = await import('../services/calendarService.js');
      
      if (!isCalendarAuthenticated()) {
        slotsBody.innerHTML = `
          <p class="text-warning text-xs" style="margin-bottom:12px;">Google Calendar is not authorized.</p>
          <button class="btn btn-primary btn-sm" onclick="window.location.hash = '#settings'">Connect Google Calendar</button>
        `;
        return;
      }

      slotsBody.innerHTML = `<p class="text-secondary text-xs">Scanning Calendar Events...</p>`;

      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const freeSlots = await findFreeFocusSlots(todayStr, 30); // scan for 30m slots

        if (freeSlots.length === 0) {
          slotsBody.innerHTML = `<p class="text-secondary text-xs">No free slots remaining in today's work hours (9 AM - 6 PM).</p>`;
          return;
        }

        const tasks = Storage.getTasks().filter(t => t.status !== 'completed');
        const nextTaskTitle = tasks.length > 0 ? tasks[0].title : 'Productivity Session';

        slotsBody.innerHTML = `
          <p class="text-secondary text-xs" style="margin-bottom:12px;">Found ${freeSlots.length} slot(s) today. Click to auto-block focus time:</p>
          <div style="display:flex; flex-direction:column; gap:8px;">
            ${freeSlots.map((slot, index) => {
              const startStr = slot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const endStr = slot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              return `
                <button class="btn btn-secondary btn-sm block-slot-btn" style="text-align:left;"
                        data-start="${slot.start.toISOString()}" data-end="${slot.end.toISOString()}">
                  <span class="material-symbols-rounded" style="font-size:1rem; margin-right:6px;">event_available</span>
                  Block ${startStr} - ${endStr}
                </button>
              `;
            }).join('')}
          </div>
        `;

        // Add booking listeners
        slotsBody.querySelectorAll('.block-slot-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const blockBtn = e.currentTarget;
            const startIso = blockBtn.dataset.start;
            const endIso = blockBtn.dataset.end;
            
            blockBtn.disabled = true;
            blockBtn.innerHTML = `<span class="material-symbols-rounded spinner">sync</span> Booking...`;

            try {
              await createFocusBlockEvent(nextTaskTitle, startIso, endIso);
              showToast('Focus block reserved on Google Calendar! 📅', 'success');
              blockBtn.innerHTML = `✅ Focus Blocked`;
              blockBtn.classList.remove('btn-secondary');
              blockBtn.classList.add('btn-success');
            } catch (err) {
              showToast(`Failed to book slot: ${err.message}`, 'danger');
              blockBtn.disabled = false;
              blockBtn.innerHTML = `Block Slot`;
            }
          });
        });

      } catch (err) {
        slotsBody.innerHTML = `<p class="text-danger text-xs">Error scanning calendar: ${err.message}</p>`;
      }
    });
  }

  // Hook Schedule Collisions Warnings
  const loadCollisions = async () => {
    const warningsContainer = $('#collision-warnings-container');
    if (!warningsContainer) return;

    try {
      const tasks = Storage.getTasks();
      const analysis = await analyzePriorities(tasks);

      if (analysis && analysis.conflicts && analysis.conflicts.length > 0) {
        warningsContainer.innerHTML = `
          <ul style="padding-left: 20px; display:flex; flex-direction:column; gap:8px;">
            ${analysis.conflicts.map(conflict => `
              <li class="text-xs text-secondary" style="list-style:disc;">
                <strong class="text-danger">Collision:</strong> ${conflict}
              </li>
            `).join('')}
          </ul>
        `;
      } else {
        warningsContainer.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="material-symbols-rounded text-success" style="font-size:1.2rem;">check_circle</span>
            <span class="text-xs text-secondary">No current calendar conflicts or scheduling bottlenecks detected.</span>
          </div>
        `;
      }
    } catch (e) {
      warningsContainer.innerHTML = `<p class="text-muted text-xs">Offline locally or failed to fetch prioritizer metrics.</p>`;
    }
  };

  // Load briefing & alerts initially
  loadBriefing();
  loadCollisions();
}
