/**
 * NIVASA logotype — a minimal geometric monogram combining a roof silhouette
 * with the letter N, paired with an optional wordmark.
 *
 * The mark uses two vertical pillars bridged by a diagonal stroke (the N),
 * capped by a peaked roofline. The overall shape reads as both a building
 * and the letter N at small and large sizes.
 *
 * Every path is hand-authored SVG geometry, no external assets.
 *
 * Usage:
 *   <NivasaLogo size={40} />              — emblem only (favicon/nav)
 *   <NivasaLogo size={40} wordmark />     — emblem + "NIVASA"
 *   <NivasaLogo size={40} wordmark full/> — emblem + "NIVASA" + subtitle
 */
export function NivasaLogo({
  size = 40,
  wordmark = false,
  full = false,
  className = "",
}) {
  return (
    <span
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
      aria-label="NIVASA"
    >
      {/* ── Emblem ─────────────────────────────────────────────────────── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Background rounded square */}
        <rect width="40" height="40" rx="10" fill="url(#nv-grad)" />

        {/* Roof peak */}
        <path
          d="M8 18 L20 8 L32 18"
          stroke="white"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* Left pillar of the N */}
        <rect
          x="11"
          y="18"
          width="3.5"
          height="14"
          rx="1"
          fill="white"
          fillOpacity="0.92"
        />

        {/* Right pillar of the N */}
        <rect
          x="25.5"
          y="18"
          width="3.5"
          height="14"
          rx="1"
          fill="white"
          fillOpacity="0.92"
        />

        {/* Diagonal crossbar — the defining stroke of the N */}
        <line
          x1="14.5"
          y1="18"
          x2="25.5"
          y2="32"
          stroke="white"
          strokeWidth="2.6"
          strokeLinecap="round"
        />

        {/* Subtle foundation line */}
        <line
          x1="9"
          y1="33"
          x2="31"
          y2="33"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeOpacity="0.35"
        />

        <defs>
          <linearGradient
            id="nv-grad"
            x1="0"
            y1="0"
            x2="40"
            y2="40"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor="#4f1d96" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Wordmark ───────────────────────────────────────────────────── */}
      {wordmark && (
        <span className="leading-none">
          <span
            className="block text-[1.15rem] font-black tracking-[0.18em] text-white"
            style={{ letterSpacing: "0.18em" }}
          >
            NIVASA
          </span>
          {full && (
            <span className="block text-[0.6rem] font-medium tracking-widest text-white/55 uppercase">
              Hostel Management
            </span>
          )}
        </span>
      )}
    </span>
  );
}

export default NivasaLogo;
