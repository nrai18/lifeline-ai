# 🚀 LifeLine AI — The Last-Minute Life Saver

> An AI-powered productivity companion that proactively assists users in planning, prioritizing, and completing tasks before deadlines are missed.

![LifeLine AI](https://img.shields.io/badge/Powered%20by-Gemini%20AI-blue?style=for-the-badge&logo=google&logoColor=white)
![Status](https://img.shields.io/badge/Status-In%20Development-yellow?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

## 🎯 Problem Statement

Students, professionals, and entrepreneurs frequently miss deadlines, assignments, meetings, bill payments, interviews, and important commitments. Existing productivity tools often rely on passive reminders that are easy to ignore and do little to help users actually complete their tasks.

## 💡 Solution

**LifeLine AI** is more than a reminder app — it's an **intelligent productivity agent** that thinks, plans, and acts alongside you. Powered by Google's Gemini AI, it provides:

- **🧠 Intelligent Task Planning**: Natural language task input with AI-powered decomposition into actionable subtasks
- **📊 Smart Prioritization**: AI-calculated Deadline Risk Scores that predict which tasks you might miss
- **💬 Conversational AI Assistant**: Chat with your productivity coach for real-time guidance
- **🎯 AI Focus Mode**: Pomodoro sessions with AI-generated goals and motivation
- **🔔 Context-Aware Alerts**: Smart notifications that escalate as deadlines approach
- **🎤 Voice Input**: Hands-free task management via voice commands
- **📅 Visual Calendar**: Timeline view of all tasks and deadlines

## 🏗️ Architecture

### Multi-Agent System
LifeLine AI uses a **3-agent architecture** for deep agentic capabilities:

| Agent | Role | Capabilities |
|-------|------|-------------|
| **Planner Agent** | Task decomposition & scheduling | Extracts tasks from natural language, creates subtasks, estimates effort |
| **Prioritizer Agent** | Risk assessment & ranking | Calculates deadline risk scores, detects conflicts, creates recovery plans |
| **Coach Agent** | Motivation & guidance | Focus session recommendations, daily briefings, motivational coaching |

## 🛠️ Technologies Used

| Technology | Usage |
|-----------|-------|
| **Gemini API** | Core AI engine for all agents |
| **Google AI Studio** | Deployment platform |
| **Cloud Run** | Application hosting |
| **HTML/CSS/JS** | Frontend (no frameworks) |
| **Web Speech API** | Voice input |
| **localStorage** | Client-side data persistence |

## 🎨 Design

- Premium dark mode with glassmorphism effects
- Gradient accents (Electric Blue → Vibrant Purple)
- Smooth micro-animations throughout
- Fully responsive (desktop, tablet, mobile)

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Edge, Safari)
- A Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Running Locally
1. Clone this repository:
   ```bash
   git clone https://github.com/nrai18/lifeline-ai.git
   cd lifeline-ai
   ```
2. Open `index.html` in your browser, or use a local server:
   ```bash
   npx serve .
   ```
3. Enter your Gemini API key when prompted

### Deployed Version
🔗 [Live App](https://your-deployed-url.run.app) *(Coming soon)*

## 📁 Project Structure

```
├── index.html              # Main app shell
├── css/
│   ├── variables.css       # Design tokens & theme
│   ├── base.css            # Reset & typography
│   ├── components.css      # Reusable component styles
│   ├── layout.css          # Page layout & grid
│   ├── animations.css      # Micro-animations
│   └── responsive.css      # Mobile responsiveness
├── js/
│   ├── app.js              # Main initialization & routing
│   ├── config.js           # Configuration
│   ├── agents/             # AI Agent modules
│   │   ├── planner.js      # Task planning agent
│   │   ├── prioritizer.js  # Priority scoring agent
│   │   └── coach.js        # Focus coaching agent
│   ├── services/           # Service layer
│   │   ├── gemini.js       # Gemini API integration
│   │   ├── storage.js      # Data persistence
│   │   ├── notifications.js # Browser notifications
│   │   └── speech.js       # Voice input/output
│   ├── components/         # UI Components
│   │   ├── dashboard.js    # Dashboard view
│   │   ├── chat.js         # AI chat interface
│   │   ├── taskList.js     # Task list view
│   │   ├── calendar.js     # Calendar view
│   │   ├── focusMode.js    # Focus/pomodoro mode
│   │   ├── taskForm.js     # Task creation form
│   │   └── sidebar.js      # Navigation sidebar
│   └── utils/              # Utility functions
│       ├── dateUtils.js    # Date helpers
│       └── domUtils.js     # DOM helpers
└── README.md
```

## 👤 Author

**Naman Rai** — [GitHub](https://github.com/nrai18)

## 📄 License

This project is licensed under the MIT License.

---

*Built for the BlockseBlock Hackathon 2026 🏆*
