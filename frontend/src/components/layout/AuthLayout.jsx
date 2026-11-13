import { Link } from "react-router-dom";

import { SonarGrid } from "@/components/ui/sonar-grid";

/**
 * Full-screen dark login layout with the pixel-art starfield background.
 *
 * Design decisions:
 *   - The left-side brand panel and 50/50 split have been removed in favour
 *     of a single centred login card. This keeps the layout minimal and
 *     mobile-friendly.
 *   - The theme toggle is intentionally absent from this layout. Login pages
 *     always use the dark pixel background; the dashboard retains its own
 *     ThemeMenu. This avoids broken light-mode rendering on login.
 *   - The logo sits at the top-left, understated.
 */

export function AuthLayout({ children, footer }) {
  return (
    <SonarGrid className="relative flex min-h-screen flex-col overflow-hidden bg-[#060510] text-white" spacing={30} dotRadius={1.15} baseOpacity={0.18} pingEvery={3.6} speed={190} ringWidth={110}>

      {/* Subtle radial vignette for readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, rgba(6,5,16,0.75) 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center px-5 pt-8 pb-5 text-center sm:pt-10">
        <div className="mb-4 flex size-[5.25rem] items-center justify-center rounded-[1.7rem] border border-violet-300/25 bg-gradient-to-br from-violet-500/25 via-indigo-500/15 to-cyan-400/10 shadow-[0_0_55px_rgba(139,92,246,0.22)]">
          <svg viewBox="0 0 72 72" className="size-[4.1rem]" fill="none" aria-hidden="true">
            <path d="M12 32 36 11l24 21" stroke="#c4b5fd" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M19 30v28h34V30" stroke="white" strokeWidth="2.8" strokeLinejoin="round"/>
            <path d="M27 58V38h18v20M27 38l18 20" stroke="white" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9 62h54" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" opacity=".8"/>
            <path d="M31 29h10M36 24v10" stroke="#67e8f9" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="56" cy="16" r="2" fill="#67e8f9"/><circle cx="16" cy="14" r="1.5" fill="#c4b5fd"/>
          </svg>
        </div>
        <p className="text-[1.7rem] font-black tracking-[0.28em] text-white sm:text-3xl">NIVASA</p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.34em] text-violet-200/80">Hostel Life, Organised</p>
        <p className="mt-3 max-w-sm text-xs leading-relaxed text-white/50 sm:text-sm">Your campus residence, connected — one secure place for students and hostel administrators.</p>
        <div className="mt-4 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/35"><span className="h-px w-8 bg-violet-300/30"/><span>SJBIT · Bengaluru</span><span className="h-px w-8 bg-violet-300/30"/></div>
      </div>

      <div className="relative z-10 flex flex-1 items-start justify-center px-5 pb-10 lg:px-6">
        <div
          className="w-full max-w-[420px] rounded-2xl border border-white/10 p-7 shadow-2xl"
          style={{
            background: "rgba(12, 10, 28, 0.75)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {children}
          {footer}
        </div>
      </div>

      {/* Bottom links */}
      <div className="relative z-10 pb-5 text-center text-xs text-white/35 lg:pb-6">
        <Link
          to="/admin/login"
          className="hover:text-white/80 transition-colors"
        >
          Admin
        </Link>
        <span className="px-2 opacity-50">|</span>
        <Link
          to="/student/login"
          className="hover:text-white/80 transition-colors"
        >
          Student
        </Link>
        <span className="px-2 opacity-50">|</span>
        <span className="text-white/25">
          {new Date().getFullYear()} SJBIT — NIVASA
        </span>
      </div>
    </SonarGrid>
  );
}
