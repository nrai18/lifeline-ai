/**
 * @file coach.js
 * @description Coach Agent. Tailors briefings, motivation, focus sessions, and break advice.
 * @module agents/coach
 */

import { generateText, SYSTEM_PROMPTS } from '../services/gemini.js';

/**
 * Generates a comprehensive daily briefing based on the user's task list.
 * @param {Array<Object>} tasks - List of tasks.
 * @returns {Promise<string>} Markdown-formatted daily briefing.
 */
export async function getDailyBriefing(tasks) {
  const pending = tasks.filter(t => t.status !== 'completed');
  const highRisk = pending.filter(t => (t.riskScore || 0) >= 0.7);
  const totalMinutes = pending.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0);

  const prompt = `
User has:
- Total pending tasks: ${pending.length}
- High-risk / urgent tasks: ${highRisk.map(t => `"${t.title}" (deadline: ${t.deadline})`).join(', ') || 'None'}
- Estimated workload: ${totalMinutes} minutes remaining.

Generate a warm, professional, motivational daily briefing. Tell the user what to focus on first, offer encouragement, and highlight critical deadliness. Make it look neat with emojis. Keep it under 250 words.
`;

  try {
    return await generateText(prompt, SYSTEM_PROMPTS.COACH);
  } catch (error) {
    console.error('[Coach Agent] Error generating briefing:', error);
    return `### Hello! 🚀
Here is your quick briefing: You have **${pending.length}** tasks pending. 
${highRisk.length > 0 ? `⚠️ **${highRisk.length}** are at high risk of missing their deadlines. Focus on these first.` : '✅ All your deadlines look manageable for now! Keep up the great momentum.'}
*Make today count!*`;
  }
}

/**
 * Generates tailored session notes or goals for a focus session.
 * @param {Object} task - The task to focus on.
 * @param {number} durationMinutes - Focus duration.
 * @returns {Promise<string>} Coaching prompt for the focus session.
 */
export async function getFocusCoachPrompt(task, durationMinutes) {
  const prompt = `
Generate a quick motivation & guide for a focus session:
- Task: "${task.title}" (Category: ${task.category}, Priority: ${task.priority})
- Duration: ${durationMinutes} minutes.

Provide 2-3 brief bullet points of advice on how to split this ${durationMinutes} min block to tackle this task efficiently, followed by a one-sentence encouraging quote. Keep it extremely short and direct.
`;

  try {
    return await generateText(prompt, SYSTEM_PROMPTS.COACH);
  } catch (error) {
    console.error('[Coach Agent] Error generating focus coaching:', error);
    return `Focus on **${task.title}** for the next ${durationMinutes} minutes. Turn off notifications and make incremental progress!`;
  }
}

/**
 * Generates a healthy recommendation for a pomodoro break.
 * @param {'short'|'long'} breakType
 * @returns {Promise<string>} A quick break suggestion.
 */
export async function getBreakSuggestion(breakType) {
  const isLong = breakType === 'long';
  const prompt = `Suggest a healthy, quick activity to do during a ${isLong ? '15-minute' : '5-minute'} screen break from intensive mental work. Give a one-sentence instruction.`;
  
  try {
    return await generateText(prompt, SYSTEM_PROMPTS.COACH);
  } catch (error) {
    console.error('[Coach Agent] Error generating break suggestion:', error);
    return isLong ? 'Step away, grab a glass of water, and do some light stretching.' : 'Close your eyes and take 5 deep, slow breaths.';
  }
}
