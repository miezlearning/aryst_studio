import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useProofingStore,
  DEFAULT_HERO_VIDEO_LOCAL,
  DEFAULT_HERO_VIDEO_HD,
  DEFAULT_HERO_VIDEO_SD,
  DEFAULT_HERO_POSTER,
} from "@/lib/storage";

/**
 * Background Showcase Video for the Hero section.
 * - Displays studio showcase video in background with smooth autoplay & loop (muted)
 * - Fallback chain: uploaded video blob -> custom URL -> local /hero-video.mp4 -> Mixkit HD -> poster
 * - Dynamic autoplay recovery: starts playback immediately on user interaction if initial autoplay policy restricts it
 * - Layered with subtle gradient overlay for high contrast & legibility without hiding the video
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
      setBroken([]);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [heroVideoUrl, hasHeroVideoUpload, resolveHeroVideoUrl]);

  const markBroken = useCallback((src: string) => {
    if (!src) return;
    setBroken((prev) => (prev.includes(src) ? prev : [...prev, src]));
  }, []);

  // Multi-tier fallback chain
  const activeSrc =
    customSrc && !broken.includes(customSrc)
      ? customSrc
      : !broken.includes(DEFAULT_HERO_VIDEO_LOCAL)
      ? DEFAULT_HERO_VIDEO_LOCAL
      : !broken.includes(DEFAULT_HERO_VIDEO_HD)
      ? DEFAULT_HERO_VIDEO_HD
      : !broken.includes(DEFAULT_HERO_VIDEO_SD)
      ? DEFAULT_HERO_VIDEO_SD
      : "";

  const showVideo = !reducedMotion && Boolean(activeSrc);
  const showPoster = reducedMotion || !showVideo;
  const showSkeleton = !resolved || (!reducedMotion && showVideo && !mediaReady);

  // Safety net: never leave shimmer forever if autoplay is slow
  useEffect(() => {
    if (!resolved || mediaReady) return;
    const timer = window.setTimeout(() => setMediaReady(true), 3500);
    return () => window.clearTimeout(timer);
  }, [resolved, mediaReady]);

  // Robust Autoplay Handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playVideo = () => {
      if (!videoRef.current) return;
      videoRef.current.muted = true;
      const promise = videoRef.current.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            setMediaReady(true);
          })
          .catch(() => {
            // Browser autoplay policy prevented automatic playback without interaction.
            // Bind single-use interaction listeners so video moves immediately
            const unlockPlayback = () => {
              if (!videoRef.current) return;
              videoRef.current.muted = true;
              videoRef.current
                .play()
                .then(() => setMediaReady(true))
                .catch(() => undefined);
              window.removeEventListener("pointerdown", unlockPlayback);
              window.removeEventListener("touchstart", unlockPlayback);
              window.removeEventListener("scroll", unlockPlayback);
              window.removeEventListener("wheel", unlockPlayback);
              window.removeEventListener("keydown", unlockPlayback);
            };
            window.addEventListener("pointerdown", unlockPlayback, { passive: true, once: true });
            window.addEventListener("touchstart", unlockPlayback, { passive: true, once: true });
            window.addEventListener("scroll", unlockPlayback, { passive: true, once: true });
            window.addEventListener("wheel", unlockPlayback, { passive: true, once: true });
            window.addEventListener("keydown", unlockPlayback, { passive: true, once: true });
          });
      }
    };

    playVideo();

    const handleLoaded = () => {
      setMediaReady(true);
      playVideo();
    };
    const handlePlaying = () => {
      setMediaReady(true);
    };

    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("canplay", handleLoaded);
    video.addEventListener("playing", handlePlaying);

    return () => {
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("canplay", handleLoaded);
      video.removeEventListener("playing", handlePlaying);
    };
  }, [activeSrc]);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden select-none pointer-events-none"
    >
      {/* ── 1. Video & Poster Layer ────────────────────────────── */}
      <div className="absolute inset-0 will-change-transform">
        {showVideo ? (
          <video
            ref={videoRef}
            key={activeSrc}
            className="w-full h-full object-cover scale-[1.03] transition-opacity duration-700"
            src={activeSrc}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onCanPlay={() => setMediaReady(true)}
            onPlaying={() => setMediaReady(true)}
            onError={() => markBroken(activeSrc)}
          />
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
        className={`absolute inset-0 bg-[#FAF8F5]/60 dark:bg-[#09090B]/60 backdrop-blur-sm transition-opacity duration-500 ${
          showSkeleton ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* ── 3. Gradient Scrim Overlays ────────────────────────── */}
      {/* Base wash to let the video breathe while guaranteeing text legibility */}
      <div className="absolute inset-0 bg-[#FAF8F5]/25 dark:bg-[#09090B]/35 transition-colors duration-200" />

      {/* Radial ambient lighting: brighter at focal center, glowing softly */}
      <div
        className="absolute inset-0 transition-opacity duration-200 dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse 90% 75% at 50% 38%, rgba(250, 248, 245, 0.20) 0%, rgba(250, 248, 245, 0.45) 55%, rgba(250, 248, 245, 0.88) 100%)",
        }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-200 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse 90% 75% at 50% 38%, rgba(9, 9, 11, 0.20) 0%, rgba(9, 9, 11, 0.45) 55%, rgba(9, 9, 11, 0.90) 100%)",
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
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-[#FAF8F5]/85 via-[#FAF8F5]/30 to-transparent dark:from-[#09090B]/85 dark:via-[#09090B]/30 to-transparent transition-colors duration-200" />

      {/* Bottom seamless blend into canvas paper (#FAF8F5 / #09090B) */}
      <div className="absolute bottom-0 inset-x-0 h-44 sm:h-60 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/80 to-transparent dark:from-[#09090B] dark:via-[#09090B]/80 to-transparent transition-colors duration-200" />

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
