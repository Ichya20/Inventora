# Inventora - Enterprise ERP & Command Center

![Inventora](https://img.shields.io/badge/Status-Active-success) ![License](https://img.shields.io/badge/License-MIT-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white) ![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB) ![Express](https://img.shields.io/badge/Express.js-404D59?logo=express) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?logo=tailwind-css&logoColor=white)

Inventora is a modern, production-ready Enterprise Resource Planning (ERP) platform and executive command center. Built with a full-stack Express + Vite architecture, it delivers real-time procurement management, inventory tracking, accounts receivable finance, human resources operations, and an integrated Gemini-powered AI Copilot.

---

## 🔒 GitHub & Security Audit Status

- **Status:** **Safe to Push to Public & Private Repositories**
- **Secrets Protection:** Private keys (e.g., `GEMINI_API_KEY`) are managed strictly server-side through environment variables (`.env`) and excluded via `.gitignore`.
- **Firebase Web Config:** Client-side credentials in `firebase-applet-config.json` are public web identifiers protected by server-side Firebase Security Rules (`firestore.rules`).
- **Build & Quality:** All TypeScript typechecks, linting passes (`tsc --noEmit`), and Vite bundle optimizations pass with zero errors.

---

## ✨ Key Capabilities & Recent Updates

### 1. 🤖 Executive AI Copilot & Analyst (Clutter-Free)
- **Natural Language Executive Assistant:** Chat with your live enterprise metrics via the floating AI Copilot drawer (`Cmd+J` or `Ctrl+J`) or the embedded Analytics Analyst.
- **Sanitized Plain-Text Output:** Automatically strips raw markdown clutter (hashes, asterisks, bullet junk) through dedicated sanitizers and the `<CleanAiText />` component for crisp, executive-ready presentations.
- **Sliding-Window Rate Limiting:** In-memory sliding window rate limiter protects `/api/analyst` and `/api/copilot` endpoints against abuse (30 requests/min per IP).

### 2. 📊 Universal Data Export Engine
- **Excel-Compatible CSV Export:** Integrated UTF-8 BOM (`\uFEFF`) export utility across all modules:
  - **Inventory Stock:** Live SKU quantities, categories, and audit verification reports.
  - **Procurement:** Complete Purchase Order (PO) ledger.
  - **Finance:** Accounts receivable, overdue alerts, and printable payment settlement vouchers.
  - **Human Resources:** Corporate team directory with department roles.
  - **Analytics:** Department budget breakdowns and vendor procurement volume.
- **Full System Backup (JSON):** Export a complete JSON snapshot of all system records from Settings.

### 3. 💾 Client Persistence & Offline Resilience
- **Persistent Local State:** Instant state retention across browser sessions and reloads for inventory changes, purchase orders, invoices, and employee records.
- **Offline Mutation Queue:** Queues actions when connectivity drops, with a visual network status indicator and auto-sync on reconnection.
- **Demo Data Management:** One-click "Reset Demo Data" option in Workspace Settings to return to default seed records.

### 4. 🌐 Enterprise Bilingual Localization (i18n)
- **English (US) & Bahasa Indonesia:** Full bilingual localization supporting localized currency formats (`Rp` and `$`), date conventions (`DD/MM/YYYY`), and business nomenclature.
- **Dynamic Switcher:** Instant language toggle in the header and detailed localization previews in Settings.

### 5. 💼 Core Business Modules
- **Overview & KPI Dashboard:** High-level executive summaries with real-time trend charts.
- **Inventory Management:** Stock monitoring, health indicators, SKU deployment actions, and restock forecast cards.
- **Procurement & POs:** Kanban-style PO status tracking, Google Sheets export, and vendor management.
- **Finance & Accounts Receivable:** Invoices, overdue tracking, payment receipt modal, and automated warning email dispatch simulation.
- **Human Resources:** Team roster, employee profiles, and automated Google Calendar onboarding event creation.

### 6. 📄 Direct PDF & Document Generation
- **Client-Side PDF Engine:** Direct `.pdf` file downloads for commercial tax invoices, official payment settlement receipts, and procurement purchase orders.
- **Corporate Ready:** Automatically generates letterheads, NPWP tax IDs, PPN 11% tax assessment breakdowns, banking remittance instructions, and digital verification seals without relying solely on print dialogs.

### 7. 🎨 Polished Design System
- **Responsive Mobile Layouts:** Responsive table containers with horizontal scroll support and mobile swipe guidance.
- **Dark & Light Mode:** High-contrast, clean theme switching with Tailwind CSS.
- **Keyboard Shortcuts Modal:** Interactive shortcut modal (`?` or `Cmd+/`) documenting all hotkeys.
- **Command Palette:** Omni-search palette (`Cmd+K`) for instant module navigation.

---

## 🛠️ Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide React, Framer Motion (`motion/react`), Recharts.
- **Backend Server:** Express.js, TypeScript (`tsx` in dev, `esbuild` bundled CommonJS in production), compression.
- **AI Integration:** Google GenAI SDK (`@google/genai`) running securely on Node.js backend.
- **Persistence & Cloud:** Firebase Firestore, Firebase Authentication, Google Workspace APIs (Sheets & Calendar).

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/your-username/inventora.git
cd inventora
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and set your Gemini API key:
```bash
cp .env.example .env
```
Inside `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 📄 License
MIT License. Open for enterprise prototyping and deployment.

