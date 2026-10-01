import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useProofingStore,
  DEFAULT_HERO_VIDEO_HD,
  DEFAULT_HERO_VIDEO_SD,
  DEFAULT_HERO_POSTER,
} from "@/lib/storage";

interface Ripple {
  id: number;
  x: number; // percent
  y: number; // percent
}

let rippleId = 0;

const INTERACTIVE_SELECTOR =
  "button, a, input, select, textarea, label, [role='button'], [contenteditable='true']";

/**
 * Full-bleed interactive hero background video.
 * - Cursor move: parallax drift + spotlight glow + speed-reactive playback rate
 * - Click/tap: expanding ripple ring + brief slow-motion pulse
 * - Source chain: uploaded blob / custom URL -> default studio clip -> poster
 * - Pointer tracking is bound to the window so the hero copy overlay
 *   (z-10) does not swallow the effects.
 */
export const HeroVideo: React.FC = () => {
  const heroVideoUrl = useProofingStore((s) => s.heroVideoUrl);
  const hasHeroVideoUpload = useProofingStore((s) => s.hasHeroVideoUpload);
  const resolveHeroVideoUrl = useProofingStore((s) => s.resolveHeroVideoUrl);

  const containerRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);
  const lastMoveRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const lastRateRef = useRef(0);
  const slowUntilRef = useRef(0);
  const slowTimerRef = useRef<number | null>(null);

  const [customSrc, setCustomSrc] = useState<string>("");
  // src values that failed to load ("default" marks the built-in clip)
  const [broken, setBroken] = useState<string[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  // Skeleton states: no media rendered until the source is resolved,
  // and the shimmer stays up until the active video actually plays.
  const [resolved, setResolved] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const zoomRef = useRef(1.12);
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // Re-resolve whenever the admin changes the hero video setting
  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    resolveHeroVideoUrl().then((url) => {
      if (cancelled) return;
      if (url.startsWith("blob:")) objectUrl = url;
      setCustomSrc(url);
      setMediaReady(false);
      setResolved(true);
      setBroken((prev) => prev.filter((s) => s !== url && s !== "default"));
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroVideoUrl, hasHeroVideoUpload]);

  const markBroken = useCallback((src: string) => {
    setMediaReady(false);
    setBroken((prev) => (prev.includes(src) ? prev : [...prev, src]));
  }, []);

  const applyParallax = useCallback((nx: number, ny: number) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const media = mediaRef.current;
      const container = containerRef.current;
      if (!media || !container) return;
      const px = (0.5 - nx) * 26;
      const py = (0.5 - ny) * 18;
      media.style.transform = `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) scale(${zoomRef.current})`;
      container.style.setProperty("--hx", `${(nx * 100).toFixed(1)}%`);
      container.style.setProperty("--hy", `${(ny * 100).toFixed(1)}%`);
    });
  }, []);

  const pointerToNormalized = useCallback((clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const inside =
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom;
    if (!inside) return null;
    const nx = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const ny = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    return { nx, ny, rect };
  }, []);

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (reducedMotion) return;
      const pos = pointerToNormalized(e.clientX, e.clientY);
      if (!pos) return;
      applyParallax(pos.nx, pos.ny);

      // Speed-reactive playback rate (skipped during click slow-motion)
      const now = performance.now();
      const last = lastMoveRef.current;
      lastMoveRef.current = { x: e.clientX, y: e.clientY, t: now };
      if (!last || now < slowUntilRef.current) return;
      if (now - lastRateRef.current < 120) return;
      const dt = Math.max(1, now - last.t);
      const dist = Math.hypot(e.clientX - last.x, e.clientY - last.y);
      const speed = dist / dt; // px per ms
      const target = Math.min(1.7, 1 + speed * 0.55);
      const video = videoRef.current;
      if (video && Math.abs(video.playbackRate - target) > 0.08) {
        video.playbackRate = target;
        lastRateRef.current = now;
      }
    },
    [applyParallax, pointerToNormalized, reducedMotion]
  );

  const handlePointerDown = useCallback(
    (e: PointerEvent) => {
      if (reducedMotion) return;
      const target = e.target as HTMLElement | null;
      if (target && target.closest(INTERACTIVE_SELECTOR)) return;
      const pos = pointerToNormalized(e.clientX, e.clientY);
      if (!pos) return;

      const x = pos.nx * 100;
      const y = pos.ny * 100;
      const id = ++rippleId;
      setRipples((prev) => [...prev.slice(-4), { id, x, y }]);
      window.setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 950);

      // Slow-motion pulse + zoom kick
      const video = videoRef.current;
      const media = mediaRef.current;
      if (video) {
        slowUntilRef.current = performance.now() + 1000;
        video.playbackRate = 0.45;
        if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
        slowTimerRef.current = window.setTimeout(() => {
          if (videoRef.current) videoRef.current.playbackRate = 1;
        }, 1000);
      }
      if (media) {
        zoomRef.current = 1.2;
        media.style.transform = `translate3d(${((0.5 - pos.nx) * 26).toFixed(1)}px, ${((0.5 - pos.ny) * 18).toFixed(1)}px, 0) scale(1.2)`;
        window.setTimeout(() => {
          zoomRef.current = 1.12;
        }, 650);
      }
    },
    [pointerToNormalized, reducedMotion]
  );

  // Window-level listeners: the hero copy overlay sits above this section,
  // so section-level handlers miss most of the movement.
  useEffect(() => {
    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      cancelAnimationFrame(rafRef.current);
      if (slowTimerRef.current) window.clearTimeout(slowTimerRef.current);
    };
  }, [handlePointerMove, handlePointerDown]);

  // Safety net: never leave the shimmer up forever if the browser
  // refuses to autoplay (frame visible is better than an endless skeleton).
  useEffect(() => {
    if (!resolved || mediaReady) return;
    const timer = window.setTimeout(() => setMediaReady(true), 8000);
    return () => window.clearTimeout(timer);
  }, [resolved, mediaReady]);

  const customBroken = Boolean(customSrc) && broken.includes(customSrc);  const showCustom = resolved && Boolean(customSrc) && !customBroken;
  const showDefault = resolved && !showCustom && !broken.includes("default");
  const showVideo = showCustom || showDefault;
  const showPoster = resolved && !showVideo; // both sources failed
  const showSkeleton = !resolved || (showVideo && !mediaReady);

  // Force-muted + explicit play: React's `muted` prop alone is not
  // always honored for autoplay, so set it imperatively and retry.
  const attachVideo = useCallback(
    (el: HTMLVideoElement | null, sourceId: string) => {
      videoRef.current = el;
      if (!el) return;
      el.muted = true;
      el.defaultMuted = true;
      const attempt = () => {
        if (videoRef.current !== el) return;
        el.muted = true;
        const p = el.play();
        if (p) p.catch(() => undefined);
      };
      attempt();
      el.oncanplay = attempt;
      // Fallback: if no source could be loaded at all, drop this source
      window.setTimeout(() => {
        if (
          videoRef.current === el &&
          el.readyState === 0 &&
          el.networkState === 3
        ) {
          markBroken(sourceId);
        }
      }, 6000);
    },
    [markBroken]
  );

  const customRef = useCallback(
    (el: HTMLVideoElement | null) => attachVideo(el, customSrc || "custom"),
    [attachVideo, customSrc]
  );
  const defaultRef = useCallback(
    (el: HTMLVideoElement | null) => attachVideo(el, "default"),
    [attachVideo]
  );

  return (
    <section
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{ "--hx": "50%", "--hy": "35%" } as React.CSSProperties}
    >
      {/* Media layer (parallax target) */}
      <div
        ref={mediaRef}
        className="absolute -inset-6 will-change-transform transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(0,0,0) scale(1.12)" }}
      >
        {showVideo ? (
          showCustom ? (
            <video
              ref={customRef}
              key={customSrc}
              className="w-full h-full object-cover"
              src={customSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              onCanPlay={() => setMediaReady(true)}
              onPlaying={() => setMediaReady(true)}
              onError={() => markBroken(customSrc)}
            />
          ) : (
            <video
              ref={defaultRef}
              key="default"
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              onCanPlay={() => setMediaReady(true)}
              onPlaying={() => setMediaReady(true)}
              onError={() => markBroken("default")}
            >
              <source
                src={DEFAULT_HERO_VIDEO_SD}
                media="(max-width: 640px)"
                type="video/mp4"
              />
              <source src={DEFAULT_HERO_VIDEO_HD} type="video/mp4" />
            </video>
          )
        ) : showPoster ? (
          <img
            src={DEFAULT_HERO_POSTER}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
          />
        ) : null}
      </div>

      {/* Skeleton shimmer: covers the hero until the real video is playing */}
      <div
        className={`absolute inset-0 skeleton transition-opacity duration-700 ${
          showSkeleton ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Readability overlays */}
      <div className="absolute inset-0 bg-zinc-950/55" />
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/80 via-zinc-950/35 to-zinc-950" />

      {/* Cursor spotlight */}
      {!reducedMotion && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(560px circle at var(--hx) var(--hy), rgba(245,158,11,0.14), transparent 65%)",
          }}
        />
      )}

      {/* Click ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          className="absolute w-44 h-44 rounded-full border-2 border-[#FF5A1F]/70 pointer-events-none animate-hero-ripple"
          style={{ left: `${r.x}%`, top: `${r.y}%` }}
        />
      ))}
    </section>
  );
};

export default HeroVideo;
