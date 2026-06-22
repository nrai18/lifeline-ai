/**
 * @file gemini.js
 * @description Service layer for interfacing with the Google Gemini API.
 * Uses direct fetch calls to the Gemini API to avoid dependency/bundling overhead in client-side ES modules.
 * Implements prompts and parameters for Task Planner, Prioritizer, and Coach personas.
 * @module services/gemini
 */

import * as Storage from './storage.js';

// Base endpoint for Gemini API
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Gets the configured API key from settings.
 * @returns {string|null} The API key or null if not configured.
 */
function getApiKey() {
  const settings = Storage.getSettings();
  return settings.geminiApiKey || null;
}

/**
 * Common system prompts for different agent roles.
 */
export const SYSTEM_PROMPTS = {
  PLANNER: `You are the Task Planner Agent for LifeLine AI.
Your job is to take a natural language task description (possibly with deadlines, priority hints, or categories) and:
1. Parse it into structured task details: title, description, category, deadline (ISO format if date specified, or relative/best guess), priority ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW'), estimatedMinutes.
2. Break it down into 3-6 actionable subtasks. Each subtask must have a title and estimatedMinutes.
3. Keep estimations realistic.

You MUST respond strictly with a JSON object. No Markdown formatting block wrappers, no explanation. Just the raw JSON.
Output JSON schema:
{
  "title": "Task title",
  "description": "Brief description",
  "category": "Work|Study|Personal|Health|Finance|Social",
  "priority": "CRITICAL|HIGH|MEDIUM|LOW",
  "estimatedMinutes": 120,
  "deadline": "YYYY-MM-DDTHH:MM:SSZ",
  "subtasks": [
    { "title": "Subtask title 1", "estimatedMinutes": 30 },
    { "title": "Subtask title 2", "estimatedMinutes": 90 }
  ]
}`,

  PRIORITIZER: `You are the Prioritizer Agent for LifeLine AI.
Your job is to analyze the user's task list and deadlines to compute risk scores, identify scheduling conflicts, and generate recovery plans for at-risk tasks.
For each pending task, you will calculate:
1. "riskScore": A float between 0.0 and 1.0. (Remaining time vs. estimatedMinutes required).
2. "aiNotes": Tailored advice on when to do it or why it is at risk.

You will receive the list of all tasks as JSON.
You MUST return a JSON object containing updates for the tasks and an overall summary of conflicts or recommended sequence.
Output JSON schema:
{
  "taskUpdates": [
    { "id": "task-uuid-here", "riskScore": 0.45, "aiNotes": "Highly recommended to start today because..." }
  ],
  "conflicts": ["Conflict description 1"],
  "recommendedSequence": ["task-uuid-1", "task-uuid-2"]
}`,

  COACH: `You are the Coach Agent for LifeLine AI.
Your job is to provide encouraging, proactive, and strategic advice to the user.
You will generate:
1. Daily Briefing: A quick motivating summary of the day's targets, high-risk items, and estimated time commit.
2. Focus Prompts: Tailored motivational messages or mini-goals for a specific task focus session.
3. Break Suggestions: Short, healthy activities to do during pomodoro breaks based on current stress or work volume.

Keep your tone inspiring, focused, empathetic, and highly actionable. No fluff. Use clean formatting.`
};

/**
 * Sends a text prompt to Gemini API.
 * @param {string} prompt - User instruction.
 * @param {string} systemInstruction - Developer/System instruction.
 * @param {boolean} [jsonMode=false] - Whether to request application/json response.
 * @returns {Promise<string>} The text response from Gemini.
 */
export async function generateText(prompt, systemInstruction, jsonMode = false) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add it in Settings.');
  }

  const model = 'gemini-2.0-flash';
  const url = `${BASE_URL}/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {}
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  if (jsonMode) {
    requestBody.generationConfig.responseMimeType = 'application/json';
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || response.statusText;
    throw new Error(`Gemini API Error: ${message}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text.trim();
}

/**
 * Streams chat responses from Gemini API.
 * @param {Array<{role: string, parts: Array<{text: string}>}>} contents - Full message history.
 * @param {string} systemInstruction - System rules.
 * @param {Function} onChunk - Callback triggered on each text segment.
 * @returns {Promise<string>} Complete accumulated response.
 */
export async function generateStream(contents, systemInstruction, onChunk) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured. Please add it in Settings.');
  }

  const model = 'gemini-2.0-flash';
  const url = `${BASE_URL}/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;

  const requestBody = {
    contents: contents,
    generationConfig: {}
  };

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || response.statusText;
    throw new Error(`Gemini Streaming API Error: ${message}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let accumulatedText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Keep last incomplete line

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunkText = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (chunkText) {
            accumulatedText += chunkText;
            onChunk(chunkText);
          }
        } catch (e) {
          // Keep decoding line parts if formatting splits them
        }
      }
    }
  }

  return accumulatedText;
}
