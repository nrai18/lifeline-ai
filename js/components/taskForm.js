/**
 * @file taskForm.js
 * @description UI Component for creating and editing tasks.
 * Connects to the Task Planner Agent to parse natural language or voice inputs.
 * @module components/taskForm
 */

import { $, showToast } from '../utils/domUtils.js';
import { parseAndPlanTask } from '../agents/planner.js';
import * as Storage from '../services/storage.js';
import { analyzePriorities } from '../agents/prioritizer.js';

/**
 * Renders the HTML structure for the Task Form component (both NLP task input and standard manual input).
 * @returns {string} HTML string.
 */
export function renderTaskForm() {
  return `
    <div class="card animate-fade-in-up" id="task-creator-card">
      <div class="card-header">
        <h3 class="card-title">
          <span class="material-symbols-rounded text-accent">insights</span>
          AI Task Creator
        </h3>
        <p class="text-secondary">Type naturally (e.g., "Prep biochemistry presentation by Friday at 4pm, high priority") or input details manually.</p>
      </div>
      <div class="card-body">
        <!-- Natural Language Input -->
        <div class="input-group">
          <label for="nlp-task-input">Quick AI Add</label>
          <div class="input-with-action">
            <input 
              type="text" 
              id="nlp-task-input" 
              class="input" 
              placeholder="What do you need to do? AI will estimate time and split it into steps..."
            >
            <button class="btn btn-primary" id="nlp-submit-btn">
              <span class="material-symbols-rounded btn-icon-only">send</span>
            </button>
          </div>
        </div>

        <div class="divider text-muted">OR</div>

        <!-- Manual Form Grid -->
        <form id="manual-task-form" class="form-grid">
          <div class="input-group">
            <label for="task-title">Task Title</label>
            <input type="text" id="task-title" class="input" required placeholder="e.g., Study Biology Module 3">
          </div>

          <div class="form-row-2">
            <div class="input-group">
              <label for="task-category">Category</label>
              <select id="task-category" class="select">
                <option value="Work">Work</option>
                <option value="Study" selected>Study</option>
                <option value="Personal">Personal</option>
                <option value="Health">Health</option>
                <option value="Finance">Finance</option>
                <option value="Social">Social</option>
              </select>
            </div>
            <div class="input-group">
              <label for="task-priority">Priority</label>
              <select id="task-priority" class="select">
                <option value="LOW">Low</option>
                <option value="MEDIUM" selected>Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
          </div>

          <div class="form-row-2">
            <div class="input-group">
              <label for="task-deadline">Deadline</label>
              <input type="datetime-local" id="task-deadline" class="input" required>
            </div>
            <div class="input-group">
              <label for="task-duration">Estimated Work Time (minutes)</label>
              <input type="number" id="task-duration" class="input" min="5" value="60">
            </div>
          </div>

          <div class="input-group">
            <label for="task-desc">Description</label>
            <textarea id="task-desc" class="textarea" rows="2" placeholder="Describe the goal..."></textarea>
          </div>

          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="save-manual-btn" style="width: 100%;">
              <span class="material-symbols-rounded">add_task</span>
              Add Task Manually
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

/**
 * Binds event listeners to the task form elements.
 * @param {Function} onTaskAdded - Callback executed after a task is added.
 */
export function initTaskFormListeners(onTaskAdded) {
  const nlpInput = $('#nlp-task-input');
  const nlpBtn = $('#nlp-submit-btn');
  const manualForm = $('#manual-task-form');

  if (nlpBtn && nlpInput) {
    const handleNlpAdd = async () => {
      const text = nlpInput.value.trim();
      if (!text) {
        showToast('Please type a task description.', 'warning');
        return;
      }

      nlpBtn.disabled = true;
      nlpBtn.innerHTML = `<span class="material-symbols-rounded spinner">sync</span>`;
      showToast('AI is planning your task steps...', 'info');

      try {
        const planned = await parseAndPlanTask(text);
        
        // Save the AI task
        const newTask = Storage.addTask(planned);
        
        // Re-analyze priorities & risk scores
        const allTasks = Storage.getTasks();
        const analysis = await analyzePriorities(allTasks);
        
        if (analysis && analysis.taskUpdates) {
          analysis.taskUpdates.forEach(upd => {
            Storage.updateTask(upd.id, {
              riskScore: upd.riskScore,
              aiNotes: upd.aiNotes
            });
          });
        }

        showToast(`AI created task: "${newTask.title}" with ${newTask.subtasks.length} steps! 🚀`, 'success');
        nlpInput.value = '';
        if (onTaskAdded) onTaskAdded();
      } catch (err) {
        showToast(`Failed to parse task: ${err.message}`, 'danger');
      } finally {
        nlpBtn.disabled = false;
        nlpBtn.innerHTML = `<span class="material-symbols-rounded btn-icon-only">send</span>`;
      }
    };

    nlpBtn.addEventListener('click', handleNlpAdd);
    nlpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleNlpAdd();
    });
  }

  if (manualForm) {
    manualForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const title = $('#task-title').value.trim();
      const category = $('#task-category').value;
      const priority = $('#task-priority').value;
      const deadline = $('#task-deadline').value;
      const estimatedMinutes = parseInt($('#task-duration').value, 10) || 60;
      const description = $('#task-desc').value.trim();

      if (!title || !deadline) {
        showToast('Please provide a title and deadline.', 'warning');
        return;
      }

      const taskData = {
        title,
        category,
        priority,
        deadline: new Date(deadline).toISOString(),
        estimatedMinutes,
        description,
        subtasks: []
      };

      try {
        Storage.addTask(taskData);
        
        // Run Prioritizer update
        const allTasks = Storage.getTasks();
        const analysis = await analyzePriorities(allTasks);
        if (analysis && analysis.taskUpdates) {
          analysis.taskUpdates.forEach(upd => {
            Storage.updateTask(upd.id, {
              riskScore: upd.riskScore,
              aiNotes: upd.aiNotes
            });
          });
        }

        showToast('Task added successfully!', 'success');
        manualForm.reset();
        if (onTaskAdded) onTaskAdded();
      } catch (err) {
        showToast(`Error adding task: ${err.message}`, 'danger');
      }
    });
  }
}
