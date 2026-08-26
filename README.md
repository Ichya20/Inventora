# Inventora - Enterprise Command Center

![Inventora](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB) ![Express](https://img.shields.io/badge/Express.js-404D59?logo=express)

Inventora is a modern, full-stack Enterprise Resource Planning (ERP) and Command Center prototype. It provides a sleek, highly responsive interface for managing procurement, human resources, and high-level analytics, augmented with live AI capabilities and seamless Google Workspace integrations.

## ✨ Key Features

- **Google Workspace Authentication:** Secure login using Firebase Authentication and Google Sign-In.
- **Procurement & Inventory Management:** 
  - Real-time Kanban board for tracking Purchase Orders.
  - Persistent state management backed by Firebase Firestore.
  - **One-Click Export:** Generate dynamic Google Sheets directly into your Google Drive populated with active PO data.
- **Human Resources Module:** 
  - Employee directory and detailed profile views.
  - **Automated Onboarding:** Schedule onboarding meetings instantly using the Google Calendar API.
- **AI-Powered Data Analyst:** Integrated Gemini 3.1 Pro backend endpoint allows users to chat with their dashboard data for real-time insights and automated drafting.
- **Advanced UI/UX:** 
  - Omni-search Command Palette (Cmd + K).
  - Responsive layout with elegant Dark/Light mode switching.
  - Interactive charts via Recharts and fluid layout transitions via Framer Motion.
- **Role-Based Simulation:** Switch between Super Admin, HR Manager, and Procurement Officer views to see dynamic UI adaptations.

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Animations:** Framer Motion (`motion/react`)
- **Data Visualization:** Recharts

### Backend & Cloud Services
- **Server:** Express.js (Node.js) custom backend serving both APIs and the SPA.
- **Database:** Firebase Firestore (Cloud persistence).
- **Authentication:** Firebase Auth (Google Provider).
- **AI Integration:** Google GenAI SDK (Gemini API).
- **External Integrations:** Google Workspace APIs (Sheets API, Calendar API).

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- A Firebase Project (with Firestore and Authentication enabled)
- A Google Cloud Project (with Sheets API and Calendar API enabled)
- A Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/inventora.git
   cd inventora
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   
   Ensure your Firebase configuration is present in `firebase-applet-config.json` at the root directory:
   ```json
   {
     "apiKey": "...",
     "authDomain": "...",
     "projectId": "...",
     "storageBucket": "...",
     "messagingSenderId": "...",
     "appId": "..."
   }
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   This will boot up the full-stack environment using `tsx` on `http://localhost:3000`.

### Building for Production

To compile the TypeScript Express server and bundle the React frontend:

```bash
npm run build
npm run start
```

## 🏗️ Architecture Note

This project utilizes a **Full-Stack Express + Vite** architecture. 
- In development mode, Express uses Vite's middleware to provide Hot Module Replacement (HMR) and serve frontend assets.
- In production, Express serves the static files bundled by Vite in the `dist` folder, alongside the active `/api/*` endpoints (like the Gemini Analyst).

## 📄 License

This project is licensed under the MIT License.
