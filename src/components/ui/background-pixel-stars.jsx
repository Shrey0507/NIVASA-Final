import { memo, useCallback, useEffect, useRef } from "react";

// Reduced 16-bit-style palette: desaturated whites + cool blue-purples for the
// NIVASA brand feel, no warm red/green that would fight the purple theme.
const STAR_COLORS = [
  "#FFFFFF",
  "#E8E8FF",
  "#C8C8FF",
  "#AAAAFF",
  "#CCCCFF",
  "#F0F0FF",
  "#DDDDFF",
];

const STAR_DENSITY     = 0.000045;
const TWINKLE_PROB     = 0.65;
const MIN_TWINKLE_SPD  = 1.5;
const MAX_TWINKLE_SPD  = 4.0;
const PIXEL_SIZE       = 4;
const REGEN_INTERVAL   = 5000;
const REGEN_PCT        = 0.12;
const SHOOT_PIXEL_SIZE = 2;
const TARGET_FPS       = 16;
const FRAME_INTERVAL   = 1000 / TARGET_FPS;

/** @returns {{ x: number, y: number, angle: number }} */
function randomStartPoint(w) {
  return {
    x: Math.random() * w,
    y: 0,
    angle: 50 + Math.random() * 80,
  };
}

/** @param {number} w */
function createShootingStar(w) {
  const { x, y, angle } = randomStartPoint(w);
  return {
    id: Date.now() + Math.random(),
    x,
    y,
    angle,
    speed: Math.random() * 5 + 7,
    distance: 0,
    trail: [],
  };
}

/**
 * Pixel-art background stars with occasional shooting stars.
 * Designed for the NIVASA dark login background.
 *
 * Props: none — fully self-contained.
 */
export const BackgroundPixelStars = memo(
  function BackgroundPixelStars() {
    const canvasRef    = useRef(/** @type {HTMLCanvasElement|null} */ (null));
    const frameRef     = useRef(/** @type {number|null} */ (null));
    const bgStarsRef   = useRef(/** @type {Array} */ ([]));
    const shootRef     = useRef(/** @type {Array} */ ([]));
    const lastRenderRef = useRef(0);
    const runningRef   = useRef(true);

    // ── build / rebuild background star array ──────────────────────────────
    const initBgStars = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const area     = canvas.width * canvas.height;
      const numStars = Math.floor(area * STAR_DENSITY);
      const stars    = [];

      for (let i = 0; i < numStars; i++) {
        const base = Math.random() * 0.45 + 0.45;
        stars.push({
          x: Math.floor(Math.random() * (canvas.width  / PIXEL_SIZE)) * PIXEL_SIZE,
          y: Math.floor(Math.random() * (canvas.height / PIXEL_SIZE)) * PIXEL_SIZE,
          color:           STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
          baseOpacity:     base,
          currentOpacity:  base,
          twinkle:         Math.random() < TWINKLE_PROB,
          twinkleSpeed:    MIN_TWINKLE_SPD + Math.random() * (MAX_TWINKLE_SPD - MIN_TWINKLE_SPD),
          twinkleDir:      -1,
          twinkleTimer:    0,
        });
      }

      bgStarsRef.current = stars;
    }, []);

    // ── replace a fraction of stars to keep the field feeling alive ────────
    const regenBgStars = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas || bgStarsRef.current.length === 0) return;

      const n = Math.max(1, Math.floor(bgStarsRef.current.length * REGEN_PCT));

      for (let i = 0; i < n; i++) {
        const idx  = Math.floor(Math.random() * bgStarsRef.current.length);
        const base = Math.random() * 0.45 + 0.45;
        bgStarsRef.current[idx] = {
          x: Math.floor(Math.random() * (canvas.width  / PIXEL_SIZE)) * PIXEL_SIZE,
          y: Math.floor(Math.random() * (canvas.height / PIXEL_SIZE)) * PIXEL_SIZE,
          color:           STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)],
          baseOpacity:     base,
          currentOpacity:  base,
          twinkle:         Math.random() < TWINKLE_PROB,
          twinkleSpeed:    MIN_TWINKLE_SPD + Math.random() * (MAX_TWINKLE_SPD - MIN_TWINKLE_SPD),
          twinkleDir:      -1,
          twinkleTimer:    0,
        };
      }
    }, []);

    // ── main render loop ───────────────────────────────────────────────────
    const loop = useCallback((ts) => {
      if (!runningRef.current) return;
      frameRef.current = requestAnimationFrame(loop);

      if (ts - lastRenderRef.current < FRAME_INTERVAL) return;
      lastRenderRef.current = ts;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;

      ctx.clearRect(0, 0, W, H);

      // 1. Background stars
      for (const star of bgStarsRef.current) {
        ctx.globalAlpha = star.currentOpacity;
        ctx.fillStyle   = star.color;
        ctx.fillRect(star.x, star.y, PIXEL_SIZE, PIXEL_SIZE);

        if (star.twinkle) {
          star.twinkleTimer += 1 / TARGET_FPS;
          if (star.twinkleTimer >= star.twinkleSpeed) {
            star.twinkleTimer = 0;
            star.twinkleDir  *= -1;
          }
          const progress = star.twinkleTimer / star.twinkleSpeed;
          star.currentOpacity =
            progress < 0.5
              ? (star.twinkleDir < 0 ? star.baseOpacity : star.baseOpacity * 0.25)
              : (star.twinkleDir < 0 ? star.baseOpacity * 0.25 : star.baseOpacity);
        }
      }

      // 2. Update + draw shooting stars
      shootRef.current = shootRef.current
        .map((s) => {
          const rad  = (s.angle * Math.PI) / 180;
          const newX = s.x + s.speed * Math.cos(rad);
          const newY = s.y + s.speed * Math.sin(rad);
          const dist = s.distance + s.speed;

          const trail = [...s.trail];
          if (dist % 8 < s.speed) {
            trail.push({ x: s.x, y: s.y, opacity: 1.0 });
          }

          return {
            ...s,
            x: newX,
            y: newY,
            distance: dist,
            trail: trail
              .map((p) => ({ ...p, opacity: p.opacity - 0.1 }))
              .filter((p) => p.opacity > 0),
          };
        })
        .filter((s) => s.x >= -30 && s.x <= W + 30 && s.y >= -30 && s.y <= H + 30);

      for (const s of shootRef.current) {
        const rad = (s.angle * Math.PI) / 180;

        // Trail
        for (const p of s.trail) {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(rad);
          ctx.translate(-p.x, -p.y);
          ctx.fillStyle  = `rgba(200, 210, 255, ${p.opacity})`;
          ctx.globalAlpha = 1;
          ctx.fillRect(p.x, p.y, SHOOT_PIXEL_SIZE, SHOOT_PIXEL_SIZE);
          ctx.restore();
        }

        // Head
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(rad);
        ctx.translate(-s.x, -s.y);
        ctx.fillStyle   = "#ffffff";
        ctx.globalAlpha = 1;
        const sw = 4, sh = 2;
        for (let row = 0; row < sh; row++) {
          for (let col = 0; col < sw; col++) {
            if ((col === 0 && row === 1) || (col === 3 && row === 0)) continue;
            ctx.fillRect(
              s.x + col * SHOOT_PIXEL_SIZE,
              s.y + row * SHOOT_PIXEL_SIZE,
              SHOOT_PIXEL_SIZE,
              SHOOT_PIXEL_SIZE,
            );
          }
        }
        ctx.restore();
      }

      ctx.globalAlpha = 1;
    }, []);

    // ── lifecycle ──────────────────────────────────────────────────────────
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      runningRef.current = true;

      const setSize = () => {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
        initBgStars();
      };

      setSize();
      frameRef.current = requestAnimationFrame(loop);

      // Shooting stars — recursive random delay, cleaned up on unmount.
      let shootTimer = /** @type {ReturnType<typeof setTimeout>|null} */ (null);
      const scheduleNext = () => {
        shootTimer = setTimeout(() => {
          if (!runningRef.current) return;
          shootRef.current = [
            ...shootRef.current,
            createShootingStar(window.innerWidth),
          ];
          scheduleNext();
        }, Math.random() * 4000 + 2000);
      };
      scheduleNext();

      const regenTimer = setInterval(regenBgStars, REGEN_INTERVAL);

      // Pause when tab is hidden to save CPU.
      const onVisibility = () => {
        if (document.hidden) {
          runningRef.current = false;
          if (frameRef.current) cancelAnimationFrame(frameRef.current);
        } else {
          runningRef.current = true;
          frameRef.current = requestAnimationFrame(loop);
        }
      };
      document.addEventListener("visibilitychange", onVisibility);

      // Respect prefers-reduced-motion.
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mq.matches) {
        runningRef.current = false;
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        // Draw one static frame.
        const ctx = canvas.getContext("2d");
        if (ctx) {
          for (const star of bgStarsRef.current) {
            ctx.globalAlpha = star.baseOpacity;
            ctx.fillStyle   = star.color;
            ctx.fillRect(star.x, star.y, PIXEL_SIZE, PIXEL_SIZE);
          }
          ctx.globalAlpha = 1;
        }
      }

      const observer = new ResizeObserver(setSize);
      observer.observe(document.documentElement);

      return () => {
        runningRef.current = false;
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        if (shootTimer) clearTimeout(shootTimer);
        clearInterval(regenTimer);
        document.removeEventListener("visibilitychange", onVisibility);
        observer.disconnect();
      };
    }, [initBgStars, regenBgStars, loop]);

    return (
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
      />
    );
  },
  () => true, // never re-render from outside
);

export default BackgroundPixelStars;
