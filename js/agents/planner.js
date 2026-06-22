/**
 * @file planner.js
 * @description Task Planner Agent. Uses Gemini to take a user's natural language
 * input, parse it, identify categories, urgency, estimated effort, and split it
 * into actionable subtasks.
 * @module agents/planner
 */

import { generateText, SYSTEM_PROMPTS } from '../services/gemini.js';

/**
 * Parses natural language input to build a structured task.
 * @param {string} input - The user text describing a task (e.g. "Draft biology project report by Friday noon, priority high").
 * @returns {Promise<Object>} Structured task object with title, description, category, priority, estimatedMinutes, deadline, and subtasks list.
 */
export async function parseAndPlanTask(input) {
  try {
    const rawJson = await generateText(
      `Here is the user's task input:\n"${input}"\n\nCurrent date and time: ${new Date().toISOString()}`,
      SYSTEM_PROMPTS.PLANNER,
      true
    );

    const parsedTask = JSON.parse(rawJson);

    // Provide safe defaults if AI missed any keys
    return {
      title: parsedTask.title || input.substring(0, 50),
      description: parsedTask.description || '',
      category: parsedTask.category || 'Work',
      priority: parsedTask.priority || 'MEDIUM',
      estimatedMinutes: parsedTask.estimatedMinutes || 60,
      deadline: parsedTask.deadline || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      subtasks: (parsedTask.subtasks || []).map((sub, idx) => ({
        id: `sub-${Date.now()}-${idx}`,
        title: sub.title,
        estimatedMinutes: sub.estimatedMinutes || 15,
        completed: false
      }))
    };
  } catch (error) {
    console.error('[Planner Agent] Error parsing task with Gemini:', error);
    // Graceful fallback to avoid breaking the UI
    return {
      title: input.substring(0, 50),
      description: input,
      category: 'Work',
      priority: 'MEDIUM',
      estimatedMinutes: 60,
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      subtasks: []
    };
  }
}
