import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useProofingStore,
  DEFAULT_HERO_VIDEO_HD,
  DEFAULT_HERO_VIDEO_SD,
  DEFAULT_HERO_POSTER,
} from "@/lib/storage";

/**
 * Background Showcase Video for the Hero section.
 * - Displays studio showcase video in background with smooth autoplay & loop (muted)
 * - Fallback chain: uploaded video -> custom URL -> default studio clip -> poster
 * - Layered with warm gradient overlay for high contrast & legibility
 * - Precision studio grid overlay with radial gradient fade mask
 * - Pure & clean: no distracting control widgets in the hero
 * - Accessible: respects prefers-reduced-motion
 */
export const HeroVideo: React.FC = () => {
  const heroVideoUrl = useProofingStore((s) => s.heroVideoUrl);
  const hasHeroVideoUpload = useProofingStore((s) => s.hasHeroVideoUpload);
  const resolveHeroVideoUrl = useProofingStore((s) => s.resolveHeroVideoUrl);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [customSrc, setCustomSrc] = useState<string>("");
  const [broken, setBroken] = useState<string[]>([]);
  const [resolved, setResolved] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);

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
    };
  }, [heroVideoUrl, hasHeroVideoUpload, resolveHeroVideoUrl]);

  const markBroken = useCallback((src: string) => {
    setMediaReady(false);
    setBroken((prev) => (prev.includes(src) ? prev : [...prev, src]));
  }, []);

  // Safety net: never leave shimmer forever if autoplay is slow
  useEffect(() => {
    if (!resolved || mediaReady) return;
    const timer = window.setTimeout(() => setMediaReady(true), 6000);
    return () => window.clearTimeout(timer);
  }, [resolved, mediaReady]);

  const customBroken = Boolean(customSrc) && broken.includes(customSrc);
  const showCustom = resolved && Boolean(customSrc) && !customBroken;
  const showDefault = resolved && !showCustom && !broken.includes("default");
  const showVideo = !reducedMotion && (showCustom || showDefault);
  const showPoster = reducedMotion || (resolved && !showVideo);
  const showSkeleton = !resolved || (!reducedMotion && showVideo && !mediaReady);

  const attachVideo = useCallback(
    (el: HTMLVideoElement | null, sourceId: string) => {
      videoRef.current = el;
      if (!el) return;
      el.muted = true;
      el.defaultMuted = true;

      const attemptPlay = () => {
        if (videoRef.current !== el) return;
        el.muted = true;
        const p = el.play();
        if (p) {
          p.catch(() => undefined);
        }
      };

      attemptPlay();
      el.oncanplay = attemptPlay;

      // Fallback if media network error
      window.setTimeout(() => {
        if (
          videoRef.current === el &&
          el.readyState === 0 &&
          el.networkState === 3
        ) {
          markBroken(sourceId);
        }
      }, 7000);
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
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden select-none pointer-events-none"
    >
      {/* ── 1. Video & Poster Layer ────────────────────────────── */}
      <div className="absolute inset-0 will-change-transform">
        {showVideo ? (
          showCustom ? (
            <video
              ref={customRef}
              key={customSrc}
              className="w-full h-full object-cover scale-[1.03] transition-opacity duration-1000"
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
              className="w-full h-full object-cover scale-[1.03] transition-opacity duration-1000"
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
            className="w-full h-full object-cover scale-[1.02]"
            loading="eager"
          />
        ) : null}
      </div>

      {/* ── 2. Loading Shimmer Skeleton ───────────────────────── */}
      <div
        className={`absolute inset-0 bg-[#FAF8F5]/80 dark:bg-[#09090B]/80 backdrop-blur-sm transition-opacity duration-500 ${
          showSkeleton ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ── 3. Gradient Scrim Overlays ────────────────────────── */}
      {/* Base wash to let the video breathe while guaranteeing text legibility */}
      <div className="absolute inset-0 bg-[#FAF8F5]/55 dark:bg-[#09090B]/60 transition-colors duration-200" />

      {/* Radial ambient lighting: brighter at focal center, glowing softly */}
      <div
        className="absolute inset-0 transition-opacity duration-200 dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 38%, rgba(250, 248, 245, 0.72) 0%, rgba(250, 248, 245, 0.52) 55%, rgba(250, 248, 245, 0.88) 100%)",
        }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-200 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% 38%, rgba(9, 9, 11, 0.7) 0%, rgba(9, 9, 11, 0.45) 55%, rgba(9, 9, 11, 0.94) 100%)",
        }}
      />

      {/* Warm brand aura tint */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle 500px at 50% 32%, rgba(255, 90, 31, 0.08) 0%, transparent 70%)",
        }}
      />

      {/* Top subtle fade from header */}
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#FAF8F5]/90 via-[#FAF8F5]/40 to-transparent dark:from-[#09090B]/90 dark:via-[#09090B]/40 transition-colors duration-200" />

      {/* Bottom seamless blend into canvas paper (#FAF8F5 / #09090B) */}
      <div className="absolute bottom-0 inset-x-0 h-48 sm:h-64 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/85 to-transparent dark:from-[#09090B] dark:via-[#09090B]/85 to-transparent transition-colors duration-200" />

      {/* ── 4. Precision Studio Grid with Gradient Fade ───────── */}
      {/* High-tech creative studio grid with radial gradient mask */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--grid-hero, rgba(18, 18, 18, 0.06)) 1px, transparent 1px),
            linear-gradient(to bottom, var(--grid-hero, rgba(18, 18, 18, 0.06)) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
          backgroundPosition: "center top",
          maskImage:
            "radial-gradient(ellipse 75% 65% at 50% 42%, black 25%, rgba(0, 0, 0, 0.5) 60%, transparent 88%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 65% at 50% 42%, black 25%, rgba(0, 0, 0, 0.5) 60%, transparent 88%)",
        }}
      />

      {/* Viewfinder crosshair precision markers (subtle camera sensor marks) */}
      <div
        className="hidden sm:block absolute inset-0 pointer-events-none"
        style={{
          maskImage:
            "radial-gradient(ellipse 60% 50% at 50% 40%, black 15%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 60% 50% at 50% 40%, black 15%, transparent 70%)",
        }}
      >
        {/* Subtle center alignment ticks */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-2 h-[1px] bg-[#121212]/20 dark:bg-white/30" />
          <div className="absolute top-1/2 right-0 w-2 h-[1px] bg-[#121212]/20 dark:bg-white/30" />
          <div className="absolute top-0 left-1/2 h-2 w-[1px] bg-[#121212]/20 dark:bg-white/30" />
          <div className="absolute bottom-0 left-1/2 h-2 w-[1px] bg-[#121212]/20 dark:bg-white/30" />
        </div>
      </div>
    </div>
  );
};

export default HeroVideo;
