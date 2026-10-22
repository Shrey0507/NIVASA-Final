import { Link } from "react-router-dom";

import { BackgroundPixelStars } from "@/components/ui/background-pixel-stars";
import { NivasaLogo } from "@/components/ui/nivasa-logo";

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
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#060510] text-white">
      {/* Pixel-art Starfield — fills the viewport */}
      <BackgroundPixelStars />

      {/* Subtle radial vignette for readability */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, rgba(6,5,16,0.75) 100%)",
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-5 lg:p-6">
        <NivasaLogo size={34} wordmark />
      </div>

      {/* Centered card */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-10 lg:px-6">
        <div
          className="w-full max-w-[400px] rounded-2xl border border-white/10 p-7 shadow-2xl"
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
    </div>
  );
}
