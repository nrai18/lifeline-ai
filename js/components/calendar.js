/**
 * @file calendar.js
 * @description UI Component for the Calendar interface. Maps tasks and deadlines,
 * and handles quick event export.
 * @module components/calendar
 */

import { $, createElement, showToast } from '../utils/domUtils.js';
import * as Storage from '../services/storage.js';
import { formatDate } from '../utils/dateUtils.js';

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

/**
 * Renders the Calendar view container.
 * @returns {string} HTML string.
 */
export function renderCalendar() {
  return `
    <div class="view view--calendar fade-in">
      <div class="calendar-header-actions">
        <h1 class="page-title" id="calendar-title">Calendar</h1>
        <div class="calendar-nav-buttons">
          <button class="btn btn-secondary btn-sm" id="cal-prev-btn">
            <span class="material-symbols-rounded">chevron_left</span>
          </button>
          <button class="btn btn-secondary btn-sm" id="cal-today-btn">Today</button>
          <button class="btn btn-secondary btn-sm" id="cal-next-btn">
            <span class="material-symbols-rounded">chevron_right</span>
          </button>
        </div>
      </div>

      <div class="card calendar-card animate-fade-in-up">
        <div class="calendar-grid-header">
          <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
        </div>
        <div class="calendar-grid-days" id="calendar-days-container"></div>
      </div>
      
      <div class="calendar-details-card card animate-fade-in-up" id="calendar-selected-details" style="margin-top: 20px; display: none;">
        <div class="card-header">
          <h3 id="selected-date-header">Deadlines for Selected Date</h3>
        </div>
        <div class="card-body" id="selected-date-tasks"></div>
      </div>
    </div>
  `;
}

/**
 * Re-draws the calendar grid for the configured year and month.
 */
export function drawCalendarGrid() {
  const container = $('#calendar-days-container');
  const title = $('#calendar-title');
  if (!container) return;

  const tasks = Storage.getTasks();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  title.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  container.innerHTML = '';

  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Draw empty slots for preceding month overlap
  for (let i = 0; i < firstDayIndex; i++) {
    container.appendChild(createElement('div', { className: 'calendar-day calendar-day--empty' }));
  }

  // Draw days
  for (let day = 1; day <= totalDays; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTasks = tasks.filter(t => t.deadline.startsWith(dateStr));

    const isToday = new Date().toDateString() === new Date(currentYear, currentMonth, day).toDateString();
    
    const dayEl = createElement('div', {
      className: `calendar-day ${isToday ? 'calendar-day--today' : ''} ${dayTasks.length > 0 ? 'calendar-day--has-events' : ''}`,
      attributes: { 'data-date': dateStr },
      innerHTML: `
        <span class="day-number">${day}</span>
        ${dayTasks.length > 0 ? `
          <div class="day-dots">
            ${dayTasks.map(t => `<span class="dot dot-${t.priority.toLowerCase()}"></span>`).join('')}
          </div>
        ` : ''}
      `
    });

    dayEl.addEventListener('click', () => showSelectedDateDetails(dateStr, dayTasks));
    container.appendChild(dayEl);
  }
}

/**
 * Displays details and actions for deadlines due on a clicked calendar date.
 */
function showSelectedDateDetails(dateStr, dayTasks) {
  const detailsCard = $('#calendar-selected-details');
  const header = $('#selected-date-header');
  const body = $('#selected-date-tasks');

  if (!detailsCard || !body) return;

  detailsCard.style.display = 'block';
  header.textContent = `Deadlines for ${formatDate(new Date(dateStr), 'long')}`;

  if (dayTasks.length === 0) {
    body.innerHTML = `<p class="text-secondary">No deadlines scheduled for this day.</p>`;
    return;
  }

  body.innerHTML = dayTasks.map(task => `
    <div class="calendar-detail-item">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>${task.title}</strong>
        <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
      </div>
      <p class="text-secondary text-xs" style="margin-top: 4px;">Category: ${task.category} | Estimated Time: ${task.estimatedMinutes}m</p>
      <button class="btn btn-secondary btn-sm export-ics-btn" style="margin-top: 8px;" data-id="${task.id}">
        <span class="material-symbols-rounded">calendar_today</span> Export .ics
      </button>
    </div>
  `).join('');

  // Attach .ics export listeners
  body.querySelectorAll('.export-ics-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.target.closest('.export-ics-btn').dataset.id;
      const task = dayTasks.find(t => t.id === taskId);
      if (task) exportToICS(task);
    });
  });
}

/**
 * Creates and downloads a basic standard iCalendar (.ics) file for a task.
 */
function exportToICS(task) {
  const startDateStr = new Date(task.deadline).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//LifeLine AI//Scheduler//EN
BEGIN:VEVENT
UID:${task.id}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${startDateStr}
SUMMARY:${task.title}
DESCRIPTION:${task.description || 'Focus Block created by LifeLine AI.'}
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${task.title.replace(/\s+/g, '_')}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('ICS File downloaded. Open to import into Google Calendar!', 'success');
}

/**
 * Wires up navigation buttons.
 */
export function initCalendar() {
  const prevBtn = $('#cal-prev-btn');
  const nextBtn = $('#cal-next-btn');
  const todayBtn = $('#cal-today-btn');

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      drawCalendarGrid();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      drawCalendarGrid();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      currentYear = new Date().getFullYear();
      currentMonth = new Date().getMonth();
      drawCalendarGrid();
    });
  }

  drawCalendarGrid();
}
