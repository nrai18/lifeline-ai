/**
 * @file prioritizer.js
 * @description Prioritizer Agent. Computes deadline risk scores, sequences tasks,
 * and detects scheduling conflicts.
 * @module agents/prioritizer
 */

import { generateText, SYSTEM_PROMPTS } from '../services/gemini.js';
import { getTimeRemaining } from '../utils/dateUtils.js';

/**
 * Computes a local algorithmic risk score based on deadline urgency and estimated time.
 * This is used as a fast, offline fallback or component of the prioritizing system.
 * @param {Object} task
 * @returns {number} Float between 0 and 1.
 */
export function calculateLocalRiskScore(task) {
  if (task.status === 'completed') return 0;
  
  const remaining = getTimeRemaining(task.deadline);
  if (remaining.isOverdue) return 1.0;

  const remainingMinutes = remaining.total / (1000 * 60);
  if (remainingMinutes <= 0) return 1.0;

  const estimatedMinutes = task.estimatedMinutes || 30;

  // Ratio of work time to available time.
  // E.g., if work takes 2 hours (120 min) and we have 4 hours left (240 min), ratio is 0.5.
  // If work takes 3 hours (180 min) and we have 2 hours left (120 min), ratio is 1.5 (highest risk).
  const ratio = estimatedMinutes / remainingMinutes;

  // Scale score to a maximum of 1.0
  return Math.min(Math.max(ratio, 0), 1.0);
}

/**
 * Invokes Gemini to evaluate task list priorities, risk factors, and sequence recommendations.
 * @param {Array<Object>} tasks - List of active tasks.
 * @returns {Promise<Object>} Object containing taskUpdates (id, riskScore, aiNotes), conflicts list, and recommendedSequence IDs.
 */
export async function analyzePriorities(tasks) {
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  if (pendingTasks.length === 0) {
    return { taskUpdates: [], conflicts: [], recommendedSequence: [] };
  }

  // Format list for Gemini input to save tokens
  const tasksContext = pendingTasks.map(t => ({
    id: t.id,
    title: t.title,
    category: t.category,
    priority: t.priority,
    estimatedMinutes: t.estimatedMinutes,
    deadline: t.deadline
  }));

  try {
    const rawJson = await generateText(
      `Here is the current task list:\n${JSON.stringify(tasksContext)}\n\nCurrent date and time: ${new Date().toISOString()}`,
      SYSTEM_PROMPTS.PRIORITIZER,
      true
    );

    const parsed = JSON.parse(rawJson);
    return {
      taskUpdates: parsed.taskUpdates || [],
      conflicts: parsed.conflicts || [],
      recommendedSequence: parsed.recommendedSequence || []
    };
  } catch (error) {
    console.error('[Prioritizer Agent] Error analyzing priorities via Gemini:', error);
    
    // Algorithmic local fallback
    const localUpdates = pendingTasks.map(t => ({
      id: t.id,
      riskScore: calculateLocalRiskScore(t),
      aiNotes: `Urgency calculated locally. Deadline: ${new Date(t.deadline).toLocaleDateString()}`
    }));

    return {
      taskUpdates: localUpdates,
      conflicts: [],
      recommendedSequence: pendingTasks.map(t => t.id)
    };
  }
}
