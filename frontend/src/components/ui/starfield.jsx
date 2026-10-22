import { useEffect, useRef } from "react";

/**
 * Orbital Starfield — a premium animated particle background.
 *
 * Stars orbit around the viewport centre with configurable wave-based wobble.
 * The animation uses a flat Uint32Array pixel buffer for maximum throughput
 * and renders at CSS-pixel resolution (no devicePixelRatio scaling) since each
 * star is a single pixel anyway.
 *
 * Performance features:
 *   - Pauses when the browser tab is hidden (visibilitychange)
 *   - Renders a single static frame for prefers-reduced-motion users
 *   - Uses ResizeObserver instead of window.resize for layout accuracy
 *   - Hard-caps star count to prevent main-thread lockup
 *   - Clears buffer with .fill(0) per frame (no stale pixels)
 */

/** @typedef {{ r: number, g: number, b: number }} RGB */
/** @typedef {{ x: number, y: number }} Point */

/**
 * @typedef {Object} Star
 * @property {number} orbital    — distance from centre
 * @property {number} opacity    — current alpha (0-255)
 * @property {Point}  position   — initial rotated position (frozen)
 * @property {Point}  realPosition — current animated position
 * @property {number} rSpeed     — per-star rotation speed
 * @property {number} waveSpeed1 — wobble frequency 1
 * @property {number} waveSpeed2 — wobble frequency 2
 * @property {number} wave1      — current wobble offset 1
 * @property {number} wave2      — current wobble offset 2
 */

// Sensible defaults for a background effect on ordinary hardware.
const DEFAULT_STAR_COUNT = 5000;
const DEFAULT_STAR_COLOR = { r: 168, g: 85, b: 247 };
const MAX_STAR_COUNT = 15000;
const MIN_ORBITAL_RATIO = 0.05;

/**
 * @param {Object} props
 * @param {number}  [props.starCount]       — number of particles
 * @param {number}  [props.waveFrequency]   — wobble amplitude
 * @param {number}  [props.starEscapeWidth] — orbital radius
 * @param {number}  [props.voidWidth]       — clear zone around centre
 * @param {RGB}     [props.starColor]       — particle colour {r,g,b}
 * @param {number}  [props.maxOpacity]      — max alpha 0-255
 * @param {number}  [props.rotationSpeed]   — base angular velocity
 * @param {number}  [props.waveSpeed]       — base wobble speed
 */
export function Starfield({
  starCount = DEFAULT_STAR_COUNT,
  waveFrequency = 20,
  starEscapeWidth = 255,
  voidWidth = 100,
  starColor = DEFAULT_STAR_COLOR,
  maxOpacity = 255,
  rotationSpeed = 0.0005,
  waveSpeed = 0.01,
}) {
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const containerRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  // Destructure colour once to stabilise the dependency array.
  const { r: colorR, g: colorG, b: colorB } = starColor;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const count = Math.max(0, Math.min(Math.round(starCount), MAX_STAR_COUNT));

    let width = 0;
    let height = 0;
    /** @type {ImageData | null} */
    let imageData = null;
    /** @type {Uint32Array | null} */
    let pixels = null;
    /** @type {Star[]} */
    let stars = [];
    let startTime = performance.now();
    let currentTime = 0;
    let running = false;
    /** @type {number | null} */
    let frameId = null;

    // Pre-compute the packed colour value (without alpha) once.
    const packedRGB =
      (Math.min(255, Math.max(0, colorB)) << 16) |
      (Math.min(255, Math.max(0, colorG)) << 8) |
      Math.min(255, Math.max(0, colorR));

    const clampByte = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

    const rotate = (cx, cy, x, y, radians) => {
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      return {
        x: cos * (x - cx) + sin * (y - cy) + cx,
        y: cos * (y - cy) - sin * (x - cx) + cy,
      };
    };

    /** @returns {Star} */
    const createStar = () => {
      const orbital =
        Math.random() * (starEscapeWidth * (1 - MIN_ORBITAL_RATIO)) +
        starEscapeWidth * MIN_ORBITAL_RATIO;

      const opacity = clampByte(
        (1 - orbital / starEscapeWidth) * maxOpacity + Math.random() * 80,
      );

      const origin = { x: width / 2, y: height / 2 + orbital };
      const rotation = Math.PI * Math.random() * 2;

      return {
        orbital,
        opacity,
        position: rotate(width / 2, height / 2, origin.x, origin.y, rotation),
        realPosition: { ...origin },
        rSpeed: Math.random() * rotationSpeed + opacity / 20000,
        waveSpeed1: Math.random() * waveSpeed,
        waveSpeed2: Math.random() * waveSpeed,
        wave1: 0,
        wave2: 0,
      };
    };

    /**
     * Size the canvas and rebuild the pixel buffer + stars.
     * We render at CSS-pixel resolution: every star is one pixel, so DPR
     * scaling would cost 4× the memory for zero visual benefit.
     */
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const nextW = Math.max(0, Math.floor(rect.width));
      const nextH = Math.max(0, Math.floor(rect.height));

      if (nextW === width && nextH === height) return;

      width = nextW;
      height = nextH;

      if (width === 0 || height === 0) {
        canvas.width = 0;
        canvas.height = 0;
        imageData = null;
        pixels = null;
        stars = [];
        return;
      }

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      imageData = context.createImageData(width, height);
      pixels = new Uint32Array(imageData.data.buffer);

      stars = [];
      for (let i = 0; i < count; i += 1) {
        stars.push(createStar());
      }
    };

    /** @param {Star} star */
    const drawStar = (star) => {
      if (!pixels) return;

      star.wave1 = Math.sin(currentTime * star.waveSpeed1) * waveFrequency;
      star.wave2 = Math.sin(currentTime * star.waveSpeed2) * waveFrequency;

      star.realPosition = rotate(
        width / 2,
        height / 2,
        star.position.x,
        star.position.y,
        star.rSpeed * currentTime,
      );

      // Gentle opacity shimmer.
      star.opacity = clampByte(
        (1 - star.orbital / starEscapeWidth) * maxOpacity + Math.random() * 80,
      );

      const x = Math.floor(star.realPosition.x + star.wave2);
      const y = Math.floor(star.realPosition.y + star.wave1);
      if (x < 0 || y < 0 || x >= width || y >= height) return;

      // Keep the centre readable for any overlaid content.
      const dx = x - width / 2;
      const dy = y - height / 2;
      if (dx * dx + dy * dy < voidWidth * voidWidth) return;

      const index = y * width + x;
      pixels[index] = (star.opacity << 24) | packedRGB;
    };

    const renderFrame = () => {
      if (!pixels || !imageData) return;
      pixels.fill(0);
      for (let i = 0; i < stars.length; i += 1) {
        drawStar(stars[i]);
      }
      context.putImageData(imageData, 0, 0);
    };

    /** @param {number} now */
    const loop = (now) => {
      currentTime = (now - startTime) / 10;
      renderFrame();
      frameId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      running = true;
      startTime = performance.now() - currentTime * 10;
      frameId = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    resize();

    if (reduceMotion) {
      // Draw one static frame and never animate.
      currentTime = 400;
      renderFrame();
    } else {
      start();
    }

    const observer = new ResizeObserver(() => {
      resize();
      if (reduceMotion) renderFrame();
    });
    observer.observe(container);

    // Pause when tab is hidden to save CPU / battery.
    const onVisibility = () => {
      if (reduceMotion) return;
      if (document.hidden) {
        stop();
      } else {
        start();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [
    starCount,
    waveFrequency,
    starEscapeWidth,
    voidWidth,
    colorR,
    colorG,
    colorB,
    maxOpacity,
    rotationSpeed,
    waveSpeed,
  ]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}

export default Starfield;
