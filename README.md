# NIVASA - Smart Hostel Management System

A modern, comprehensive full-stack hostel management platform designed for universities and institutions. NIVASA streamlines resident admissions, room allocations, boys' and girls' hostel dashboards, movement tracking, fee collections, mess menus, notices, and grievance management with role-based access control.

---

## 📁 Repository Structure

```
NIVASA/
├── backend/          # Node.js & Express API server with Supabase integration
│   ├── src/          # API routes, middleware, controllers
│   ├── .env.example  # Backend environment variables template
│   ├── package.json  # Backend dependencies and scripts
│   └── ...
└── frontend/         # React 19 + Vite modern client application
    ├── src/          # Pages, components, hooks, design system
    ├── public/       # Static assets & icons
    ├── .env.example  # Frontend environment variables template
    ├── package.json  # Frontend dependencies and scripts
    └── ...
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- A [Supabase](https://supabase.com/) project

---

### 1. Setting Up the Backend

Navigate to the `backend` directory:
```bash
cd backend
npm install
```

Configure environment variables:
```bash
cp .env.example .env
```
Fill in your Supabase server credentials and port:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
SUPABASE_SECRET_KEY=your_supabase_secret_key
SUPABASE_JWKS_URL=https://your-project.supabase.co/auth/v1/.well-known/jwks.json
PORT=5000
```

Start the backend server in development mode:
```bash
npm run dev
```

---

### 2. Setting Up the Frontend

Navigate to the `frontend` directory:
```bash
cd frontend
npm install
```

Configure environment variables:
```bash
cp .env.example .env
```
Fill in your Supabase frontend client credentials:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:5000/api
```

Start the Vite development server:
```bash
npm run dev
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS, CSS Variables & Design System
- **Components & Icons**: Lucide React, Radix UI Primitives, Recharts
- **State & Auth**: Supabase Auth Client

### Backend
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express 5
- **Database & Auth**: Supabase (@supabase/server, JWT verification)
- **Security & Utilities**: CORS, Dotenv

---

## 📜 License
ISC License
