/**
 * @file chat.js
 * @description UI Component for the conversational AI assistant.
 * Handles streaming chat interactions, task negotiation, and Voice synthesis hooks.
 * @module components/chat
 */

import { $, createElement, showToast } from '../utils/domUtils.js';
import { generateStream, SYSTEM_PROMPTS } from '../services/gemini.js';
import * as Storage from '../services/storage.js';
import { parseAndPlanTask } from '../agents/planner.js';
import { analyzePriorities } from '../agents/prioritizer.js';

let conversationHistory = [];

/**
 * Renders the full Chat view markup.
 * @returns {string} HTML string.
 */
export function renderChat() {
  // Load cached chat history if present
  const cached = Storage.getChatHistory();
  conversationHistory = cached.length > 0 ? cached : [
    { role: 'model', parts: [{ text: "Hello! I am your LifeLine AI companion. Tell me what tasks you need to get done, or ask me to analyze your current schedule and suggest a focus strategy." }] }
  ];

  return `
    <div class="view view--chat fade-in">
      <div class="chat-container">
        
        <!-- Chat History -->
        <div class="chat-messages-area" id="chat-messages-container">
          ${conversationHistory.map(msg => {
            const isUser = msg.role === 'user';
            const bubbleClass = isUser ? 'user-message' : 'ai-message';
            const icon = isUser ? 'person' : 'smart_toy';
            const label = isUser ? 'You' : 'LifeLine AI';

            return `
              <div class="chat-row ${isUser ? 'chat-row--user' : 'chat-row--ai'}">
                <div class="chat-avatar">
                  <span class="material-symbols-rounded">${icon}</span>
                </div>
                <div class="chat-bubble ${bubbleClass}">
                  <div class="chat-bubble-sender">${label}</div>
                  <div class="chat-bubble-text">${formatMessageText(msg.parts[0].text)}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Chat Input Fixed Bottom -->
        <div class="chat-input-panel">
          <div class="chat-suggestions">
            <button class="chip chip-suggestion" data-prompt="Analyze my schedule risk and make suggestions">📊 Risk Check</button>
            <button class="chip chip-suggestion" data-prompt="What should I work on first today?">🎯 What first?</button>
            <button class="chip chip-suggestion" data-prompt="Help me schedule a focus block for my critical task">⏱️ Focus Helper</button>
          </div>
          
          <div class="chat-input-bar">
            <button class="btn-icon" id="chat-voice-btn" aria-label="Voice input dictation">
              <span class="material-symbols-rounded">mic</span>
            </button>
            <input 
              type="text" 
              id="chat-text-input" 
              class="input" 
              placeholder="Ask AI, negotiate schedule, or write a task..."
            >
            <button class="btn btn-primary" id="chat-send-btn">
              <span class="material-symbols-rounded">send</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  `;
}

/**
 * Parses markdown-like styling within message text.
 * @param {string} text 
 * @returns {string} Safe HTML.
 */
function formatMessageText(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\* (.*)/g, '<li>$1</li>')
    .replace(/\n/g, '<br>');
}

/**
 * Initializes listeners for the Chat view.
 */
export function initChat() {
  const container = $('#chat-messages-container');
  const input = $('#chat-text-input');
  const sendBtn = $('#chat-send-btn');
  const voiceBtn = $('#chat-voice-btn');
  const suggestions = $('.chat-suggestions');

  if (container) {
    container.scrollTop = container.scrollHeight;
  }

  const sendMessage = async (customText = '') => {
    const text = customText || input.value.trim();
    if (!text) return;

    if (!customText) input.value = '';

    // Append user message to UI
    appendMessageHTML('user', text);
    
    // Save state
    conversationHistory.push({ role: 'user', parts: [{ text }] });
    Storage.saveChatHistory(conversationHistory.slice(-50));

    // Create placeholder for AI response
    const aiBubbleId = `ai-msg-${Date.now()}`;
    appendMessageHTML('model', '', aiBubbleId);

    const bubbleTextContainer = $(`#${aiBubbleId} .chat-bubble-text`);
    const scrollContainer = $('#chat-messages-container');

    try {
      let accumulatedText = '';

      // Prepare context: attach current task summaries so Gemini remains context-aware
      const activeTasks = Storage.getTasks().filter(t => t.status !== 'completed');
      const taskSummary = activeTasks.map(t => `- [${t.priority}] ${t.title} (due: ${t.deadline}, estimate: ${t.estimatedMinutes}m, risk: ${Math.round((t.riskScore || 0)*100)}%)`).join('\n');
      
      const enrichedSystemPrompt = `${SYSTEM_PROMPTS.COACH}\n\nHere are the user's active tasks for scheduling context:\n${taskSummary || 'No active tasks.'}`;

      await generateStream(
        conversationHistory,
        enrichedSystemPrompt,
        (chunk) => {
          accumulatedText += chunk;
          if (bubbleTextContainer) {
            bubbleTextContainer.innerHTML = formatMessageText(accumulatedText);
          }
          if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
          }
        }
      );

      // Save AI message to history
      conversationHistory.push({ role: 'model', parts: [{ text: accumulatedText }] });
      Storage.saveChatHistory(conversationHistory.slice(-50));

      // Check if AI text suggests creating a task or rescheduling
      // (Future extension: execute function calls here if Gemini outputs structural commands)
    } catch (err) {
      if (bubbleTextContainer) {
        bubbleTextContainer.innerHTML = `<span class="text-danger">Error: ${err.message}</span>`;
      }
    }
  };

  const appendMessageHTML = (role, text, id = '') => {
    const isUser = role === 'user';
    const bubbleClass = isUser ? 'user-message' : 'ai-message';
    const icon = isUser ? 'person' : 'smart_toy';
    const label = isUser ? 'You' : 'LifeLine AI';

    const row = createElement('div', {
      className: `chat-row ${isUser ? 'chat-row--user' : 'chat-row--ai'}`,
      id: id,
      innerHTML: `
        <div class="chat-avatar">
          <span class="material-symbols-rounded">${icon}</span>
        </div>
        <div class="chat-bubble ${bubbleClass}">
          <div class="chat-bubble-sender">${label}</div>
          <div class="chat-bubble-text">${formatMessageText(text)}</div>
        </div>
      `
    });

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  };

  if (sendBtn) {
    sendBtn.addEventListener('click', () => sendMessage());
  }

  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
  }

  // Handle Quick Action chips
  if (suggestions) {
    suggestions.addEventListener('click', (e) => {
      const chip = e.target.closest('.chip-suggestion');
      if (chip) {
        const text = chip.dataset.prompt;
        sendMessage(text);
      }
    });
  }

  // Hook Speech Dictation (Web Speech API)
  if (voiceBtn) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.lang = 'en-US';
      recognition.interimResults = false;

      recognition.onstart = () => {
        voiceBtn.classList.add('btn-voice--active');
        showToast('Listening...', 'info');
      };

      recognition.onerror = (e) => {
        console.error('Speech error:', e);
        voiceBtn.classList.remove('btn-voice--active');
        showToast('Speech recognition failed.', 'danger');
      };

      recognition.onend = () => {
        voiceBtn.classList.remove('btn-voice--active');
      };

      recognition.onresult = (event) => {
        const resultText = event.results[0][0].transcript;
        if (input) {
          input.value = resultText;
          input.focus();
        }
      };

      voiceBtn.addEventListener('click', () => {
        recognition.start();
      });
    } else {
      voiceBtn.style.display = 'none'; // hide if browser doesn't support
    }
  }
}
