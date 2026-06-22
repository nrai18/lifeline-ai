/**
 * @file focusMode.js
 * @description UI Component for the Deep Work Focus Mode Pomodoro timer.
 * Integrates visual countdown timer ring, custom interval configuration,
 * and handles focus session logs.
 * @module components/focusMode
 */

import { $, showToast } from '../utils/domUtils.js';
import * as Storage from '../services/storage.js';
import { CONFIG } from '../config.js';
import { getBreakSuggestion, getFocusCoachPrompt } from '../agents/coach.js';

let timerInterval = null;
let secondsRemaining = CONFIG.POMODORO_WORK;
let isRunning = false;
let currentMode = 'work'; // 'work', 'break', 'longBreak'
let selectedTaskId = null;

/**
 * Renders the Focus view markup.
 * @returns {string} HTML string.
 */
export function renderFocus() {
  const tasks = Storage.getTasks().filter(t => t.status !== 'completed');

  // Try to parse query parameters (e.g. #focus?task=123)
  const hashParts = window.location.hash.split('?');
  if (hashParts.length > 1) {
    const params = new URLSearchParams(hashParts[1]);
    selectedTaskId = params.get('task');
  }

  const selectedTask = tasks.find(t => t.id === selectedTaskId) || (tasks.length > 0 ? tasks[0] : null);
  if (selectedTask) selectedTaskId = selectedTask.id;

  return `
    <div class="view view--focus fade-in">
      <div class="view__header" style="padding: 24px;">
        <h1 class="page-title">Deep Focus Mode</h1>
        <p class="text-secondary">AI-assisted Pomodoro sessions & deep focus work zones.</p>
      </div>

      <div class="view-grid-two-col" style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 24px; padding: 24px;">
        
        <!-- Timer Controller Left -->
        <div class="card timer-card animate-fade-in">
          <div class="card-body" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px;">
            
            <div class="timer-mode-selector" style="margin-bottom: 20px; display: flex; gap: 8px;">
              <button class="chip ${currentMode === 'work' ? 'chip--active' : ''}" id="mode-work-btn">Work Block</button>
              <button class="chip ${currentMode === 'break' ? 'chip--active' : ''}" id="mode-break-btn">Short Break</button>
              <button class="chip ${currentMode === 'longBreak' ? 'chip--active' : ''}" id="mode-long-btn">Long Break</button>
            </div>

            <!-- Timer Circle -->
            <div class="timer-display-circle" style="position: relative; width: 240px; height: 240px; display: flex; align-items: center; justify-content: center; margin: 20px 0;">
              <svg style="position: absolute; top:0; left:0; width: 240px; height: 240px; transform: rotate(-90deg);">
                <circle cx="120" cy="120" r="100" stroke="rgba(255,255,255,0.05)" stroke-width="12" fill="transparent" />
                <circle id="timer-progress-ring" cx="120" cy="120" r="100" stroke="var(--accent-primary)" stroke-width="12" fill="transparent" 
                        stroke-dasharray="628" stroke-dashoffset="0" style="transition: stroke-dashoffset 1s linear;" />
              </svg>
              <div class="timer-digits" id="timer-time" style="font-size: 3rem; font-weight: 800; font-family: monospace;">25:00</div>
            </div>

            <div class="timer-controls" style="display: flex; gap: 16px; margin-top: 20px;">
              <button class="btn btn-primary btn-lg" id="timer-start-btn">
                <span class="material-symbols-rounded">play_arrow</span> Start
              </button>
              <button class="btn btn-secondary btn-lg" id="timer-pause-btn" style="display: none;">
                <span class="material-symbols-rounded">pause</span> Pause
              </button>
              <button class="btn btn-ghost btn-lg" id="timer-reset-btn">
                <span class="material-symbols-rounded">replay</span> Reset
              </button>
            </div>

          </div>
        </div>

        <!-- Task & Coaching Context Right -->
        <div class="card coaching-context-card animate-fade-in-up">
          <div class="card-header">
            <h3 class="card-title">
              <span class="material-symbols-rounded text-accent">psychology</span>
              Focus Coach
            </h3>
          </div>
          <div class="card-body">
            <div class="input-group">
              <label for="focus-task-select">Focus Target</label>
              <select id="focus-task-select" class="select">
                ${tasks.map(t => `<option value="${t.id}" ${t.id === selectedTaskId ? 'selected' : ''}>[${t.priority}] ${t.title}</option>`).join('')}
                ${tasks.length === 0 ? '<option value="">No pending tasks</option>' : ''}
              </select>
            </div>

            <div class="focus-coach-instruction-box" id="focus-coach-instruction" style="margin-top: 24px; padding: 16px; border-radius: 12px; background: rgba(255,255,255,0.03); min-height: 120px;">
              <p class="text-secondary italic">Select a task above and start the timer to receive tailored coaching guidance.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `;
}

/**
 * Redraws timer screen digits and sets progress circle ring offset.
 */
function updateTimerUI() {
  const timeEl = $('#timer-time');
  const ring = $('#timer-progress-ring');
  if (!timeEl) return;

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  if (ring) {
    let total = CONFIG.POMODORO_WORK;
    if (currentMode === 'break') total = CONFIG.POMODORO_BREAK;
    if (currentMode === 'longBreak') total = CONFIG.POMODORO_LONG_BREAK;
    const progress = (total - secondsRemaining) / total;
    const offset = 628 * (1 - progress);
    ring.style.strokeDashoffset = offset;
  }
}

/**
 * Switches timer interval configuration states.
 */
function switchMode(mode) {
  currentMode = mode;
  isRunning = false;
  clearInterval(timerInterval);
  
  if (mode === 'work') secondsRemaining = CONFIG.POMODORO_WORK;
  if (mode === 'break') secondsRemaining = CONFIG.POMODORO_BREAK;
  if (mode === 'longBreak') secondsRemaining = CONFIG.POMODORO_LONG_BREAK;

  // Toggle active chip classes
  const chips = [$('#mode-work-btn'), $('#mode-break-btn'), $('#mode-long-btn')];
  chips.forEach(c => {
    if (c) c.classList.toggle('chip--active', c.id === `mode-${mode === 'longBreak' ? 'long' : mode}-btn`);
  });

  // Toggle buttons
  const startBtn = $('#timer-start-btn');
  const pauseBtn = $('#timer-pause-btn');
  if (startBtn) startBtn.style.display = 'inline-flex';
  if (pauseBtn) pauseBtn.style.display = 'none';

  updateTimerUI();
}

/**
 * Wires up Pomodoro timer triggers, coaching responses, and dropdown switches.
 */
export function initFocus() {
  const startBtn = $('#timer-start-btn');
  const pauseBtn = $('#timer-pause-btn');
  const resetBtn = $('#timer-reset-btn');
  const taskSelect = $('#focus-task-select');
  const instructionBox = $('#focus-coach-instruction');

  // Modes triggers
  const workBtn = $('#mode-work-btn');
  const breakBtn = $('#mode-break-btn');
  const longBtn = $('#mode-long-btn');

  if (workBtn) workBtn.addEventListener('click', () => switchMode('work'));
  if (breakBtn) breakBtn.addEventListener('click', () => switchMode('break'));
  if (longBtn) longBtn.addEventListener('click', () => switchMode('longBreak'));

  if (taskSelect) {
    taskSelect.addEventListener('change', () => {
      selectedTaskId = taskSelect.value;
      if (selectedTaskId) {
        window.location.hash = `#focus?task=${selectedTaskId}`;
      }
    });
  }

  const triggerCoachingPrompt = async () => {
    if (!instructionBox) return;
    
    instructionBox.innerHTML = `
      <div class="skeleton-line" style="width: 100%;"></div>
      <div class="skeleton-line" style="width: 90%;"></div>
    `;

    try {
      if (currentMode === 'work' && selectedTaskId) {
        const task = Storage.getTasks().find(t => t.id === selectedTaskId);
        if (task) {
          const coachText = await getFocusCoachPrompt(task, Math.floor(secondsRemaining / 60));
          instructionBox.innerHTML = `<p class="text-secondary">${coachText.replace(/\n/g, '<br>')}</p>`;
        }
      } else if (currentMode !== 'work') {
        const breakText = await getBreakSuggestion(currentMode === 'break' ? 'short' : 'long');
        instructionBox.innerHTML = `<p class="text-secondary"><strong>Coach break advice:</strong><br>${breakText}</p>`;
      }
    } catch (err) {
      instructionBox.innerHTML = `<p class="text-muted">Coach suggests focus state: clear all external notifications and make progress step-by-step.</p>`;
    }
  };

  if (startBtn && pauseBtn) {
    startBtn.addEventListener('click', () => {
      if (isRunning) return;
      isRunning = true;
      startBtn.style.display = 'none';
      pauseBtn.style.display = 'inline-flex';

      triggerCoachingPrompt();

      timerInterval = setInterval(() => {
        secondsRemaining--;
        updateTimerUI();

        if (secondsRemaining <= 0) {
          clearInterval(timerInterval);
          isRunning = false;
          startBtn.style.display = 'inline-flex';
          pauseBtn.style.display = 'none';

          if (currentMode === 'work') {
            showToast('Pomodoro session completed! Take a break. 🌟', 'success');
            const currentStats = Storage.getStats();
            Storage.saveStats({
              pomodorosDone: currentStats.pomodorosDone + 1,
              xp: currentStats.xp + 150
            });
            switchMode('break');
          } else {
            showToast('Break finished! Ready to focus?', 'info');
            switchMode('work');
          }
        }
      }, 1000);
    });

    pauseBtn.addEventListener('click', () => {
      isRunning = false;
      clearInterval(timerInterval);
      startBtn.style.display = 'inline-flex';
      pauseBtn.style.display = 'none';
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      switchMode(currentMode);
    });
  }

  // Draw first update
  switchMode('work');
}
