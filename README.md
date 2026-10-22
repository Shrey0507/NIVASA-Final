# NIVASA - Smart Hostel Management System

A modern, smart hostel management platform featuring resident management, separate boys' and girls' hostel dashboards, movements tracking, fee collection, grievances, and secure role-based access control, powered by React and Supabase.

## Tech Stack
- **Framework**: React 19 + Vite
- **Styling**: Tailwind CSS / Vanilla CSS Variables & Design System, Lucide Icons, Radix UI primitives
- **Backend / Auth**: Supabase

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```
