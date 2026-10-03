import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  useProofingStore,
  DEFAULT_HERO_VIDEO_LOCAL,
  DEFAULT_HERO_VIDEO_HD,
  DEFAULT_HERO_VIDEO_SD,
  DEFAULT_HERO_POSTER,
} from "@/lib/storage";
import { useAssuredPlayback } from "@/lib/useAssuredPlayback";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";

/**
 * Background Showcase Video for the Hero section.
 * - Displays studio showcase video in background with smooth autoplay & loop
 * - Immediate fallback chain: uploaded video blob -> custom URL -> local /hero-video.mp4 -> Mixkit HD -> poster
 * - Auto-unlocks on first user gesture if blocked by strict browser policy (e.g. Brave Shields)
 * - Balanced scrim overlays ensure crisp text readability without washing out the video
 * - Sleek ambient control pill (Play/Pause & Mute/Unmute)
 * - Accessible: respects prefers-reduced-motion
 */
export const HeroVideo: React.FC = () => {
  const heroVideoUrl = useProofingStore((s) => s.heroVideoUrl);
  const hasHeroVideoUpload = useProofingStore((s) => s.hasHeroVideoUpload);
  const heroVideoRev = useProofingStore((s) => s.heroVideoRev);
  const resolveHeroVideoUrl = useProofingStore((s) => s.resolveHeroVideoUrl);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [customSrc, setCustomSrc] = useState<string>(DEFAULT_HERO_VIDEO_LOCAL);
  const srcRef = useRef(DEFAULT_HERO_VIDEO_LOCAL);
  const [broken, setBroken] = useState<string[]>([]);
  const [resolved, setResolved] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  // On-screen diagnostics (?debug=1): proves which source plays, whether it
  // advances, and why not, with no DevTools needed.
  const [debugMode] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("debug") === "1"
  );
  const [debugTick, setDebugTick] = useState(0);

  // Re-resolve whenever the admin changes the hero video setting, on any tab
  const applySource = useCallback(async () => {
    const url = await resolveHeroVideoUrl();
    const effectiveUrl = url || DEFAULT_HERO_VIDEO_LOCAL;
    if (effectiveUrl === srcRef.current) {
      setResolved(true);
      return;
    }
    srcRef.current = effectiveUrl;
    setCustomSrc(effectiveUrl);
    setResolved(true);
  }, [resolveHeroVideoUrl]);

  useEffect(() => {
    void applySource();
  }, [applySource, heroVideoUrl, hasHeroVideoUpload, heroVideoRev]);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void applySource();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [applySource]);

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
  const allSourcesFailed =
    broken.includes(DEFAULT_HERO_VIDEO_LOCAL) &&
    broken.includes(DEFAULT_HERO_VIDEO_HD) &&
    broken.includes(DEFAULT_HERO_VIDEO_SD);

  // Safety net: never leave shimmer forever
  useEffect(() => {
    if (!resolved || mediaReady) return;
    const timer = window.setTimeout(() => setMediaReady(true), 2500);
    return () => window.clearTimeout(timer);
  }, [resolved, mediaReady]);

  // Persistent watchdog: ensures autoplay resumes if paused unintentionally
  const playbackBlocked = useAssuredPlayback(videoRef, showVideo);

  // Debug badge ticker (only with ?debug=1)
  useEffect(() => {
    if (!debugMode) return;
    const timer = window.setInterval(() => setDebugTick((t) => t + 1), 750);
    return () => window.clearInterval(timer);
  }, [debugMode]);

  // Active Playback Management
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeSrc) return;

    video.muted = isMuted;
    video.defaultMuted = true;
    video.playsInline = true;

    const playVideo = () => {
      if (!video) return;
      video.muted = isMuted;
      const promise = video.play();
      if (promise !== undefined) {
        promise
          .then(() => {
            setIsPlaying(true);
            setMediaReady(true);
            setAutoplayBlocked(false);
          })
          .catch(() => {
            setIsPlaying(false);
            setAutoplayBlocked(true);
          });
      }
    };

    playVideo();

    const handleLoaded = () => {
      setMediaReady(true);
      playVideo();
    };
    const handlePlaying = () => {
      setIsPlaying(true);
      setMediaReady(true);
      setAutoplayBlocked(false);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };

    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("canplay", handleLoaded);
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("loadeddata", handleLoaded);
      video.removeEventListener("canplay", handleLoaded);
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("pause", handlePause);
    };
  }, [activeSrc, isMuted]);

  // Auto-unlock playback on first user gesture if blocked by strict browser policy (e.g. Brave Shields)
  useEffect(() => {
    if (isPlaying) return;

    const unlockPlayback = () => {
      const v = videoRef.current;
      if (v && v.paused) {
        v.muted = isMuted;
        v.play()
          .then(() => {
            setIsPlaying(true);
            setMediaReady(true);
            setAutoplayBlocked(false);
          })
          .catch(() => undefined);
      }
    };

    window.addEventListener("pointerdown", unlockPlayback, { passive: true, once: true });
    window.addEventListener("touchstart", unlockPlayback, { passive: true, once: true });
    window.addEventListener("keydown", unlockPlayback, { passive: true, once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockPlayback);
      window.removeEventListener("touchstart", unlockPlayback);
      window.removeEventListener("keydown", unlockPlayback);
    };
  }, [isPlaying, isMuted]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.muted = isMuted;
      v.play()
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => setIsPlaying(false));
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !isMuted;
    v.muted = next;
    setIsMuted(next);
  };

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
            ref={(el) => {
              videoRef.current = el;
              if (el) {
                el.muted = isMuted;
                el.defaultMuted = true;
                el.playsInline = true;
              }
            }}
            key={activeSrc}
            className="w-full h-full object-cover scale-[1.03] transition-opacity duration-700"
            src={activeSrc}
            autoPlay
            muted={isMuted}
            loop
            playsInline
            preload="auto"
            disablePictureInPicture
            onCanPlay={() => setMediaReady(true)}
            onPlaying={() => {
              setIsPlaying(true);
              setMediaReady(true);
              setAutoplayBlocked(false);
            }}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(e) => {
              if (e.currentTarget.currentTime > 0) setMediaReady(true);
            }}
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

      {/* ── 3. Gradient Scrim Overlays (Balanced Contrast) ───── */}
      {/* Base wash to give the video contrast without hiding it */}
      <div className="absolute inset-0 bg-[#FAF8F5]/30 dark:bg-[#09090B]/40 transition-colors duration-200" />

      {/* Radial soft ambient lighting: subtle contrast under text while keeping video vibrant */}
      <div
        className="absolute inset-0 transition-opacity duration-200 dark:hidden"
        style={{
          background:
            "radial-gradient(ellipse 90% 75% at 50% 38%, rgba(250, 248, 245, 0.35) 0%, rgba(250, 248, 245, 0.65) 60%, rgba(250, 248, 245, 0.92) 100%)",
        }}
      />
      <div
        className="absolute inset-0 transition-opacity duration-200 hidden dark:block"
        style={{
          background:
            "radial-gradient(ellipse 90% 75% at 50% 38%, rgba(9, 9, 11, 0.30) 0%, rgba(9, 9, 11, 0.60) 60%, rgba(9, 9, 11, 0.92) 100%)",
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
      <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-[#FAF8F5]/90 via-[#FAF8F5]/40 to-transparent dark:from-[#09090B]/90 dark:via-[#09090B]/40 to-transparent transition-colors duration-200" />

      {/* Bottom seamless blend into canvas paper (#FAF8F5 / #09090B) */}
      <div className="absolute bottom-0 inset-x-0 h-36 sm:h-48 bg-gradient-to-t from-[#FAF8F5] via-[#FAF8F5]/80 to-transparent dark:from-[#09090B] dark:via-[#09090B]/80 to-transparent transition-colors duration-200" />

      {/* ── 4. Precision Studio Grid with Gradient Fade ───────── */}
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage: `
            linear-gradient(to right, var(--grid-hero, rgba(18, 18, 18, 0.05)) 1px, transparent 1px),
            linear-gradient(to bottom, var(--grid-hero, rgba(18, 18, 18, 0.05)) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
          backgroundPosition: "center top",
          maskImage:
            "radial-gradient(ellipse 75% 65% at 50% 42%, black 25%, rgba(0, 0, 0, 0.5) 60%, transparent 88%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 65% at 50% 42%, black 25%, rgba(0, 0, 0, 0.5) 60%, transparent 88%)",
        }}
      />

      {/* ── 5. Ambient Hero Video Controller (Pill) ────────────── */}
      {showVideo && (
        <div className="absolute bottom-6 right-6 z-20 pointer-events-auto flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-[#141417]/85 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-lg text-[11px] font-semibold text-[#121212] dark:text-white transition-all hover:bg-white/95 dark:hover:bg-[#141417]">
            <button
              type="button"
              onClick={togglePlay}
              className={`p-1 rounded-full transition-all flex items-center justify-center cursor-pointer ${
                !isPlaying
                  ? "bg-[#FF5A1F] text-white hover:bg-[#E04B14] shadow-sm animate-pulse"
                  : "hover:bg-black/10 dark:hover:bg-white/10"
              }`}
              title={isPlaying ? "Jeda video latar" : "Putar video latar (Brave/Browser Policy)"}
              aria-label={isPlaying ? "Jeda video latar" : "Putar video latar"}
            >
              {isPlaying ? (
                <Pause className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleMute}
              className="p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex items-center justify-center cursor-pointer"
              title={isMuted ? "Bunyikan video" : "Bisukan video"}
              aria-label={isMuted ? "Bunyikan video" : "Bisukan video"}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-black/60 dark:text-white/60" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-[#FF5A1F]" />
              )}
            </button>

            <span className="hidden sm:inline-flex items-center gap-1.5 pl-1.5 pr-1 text-[10px] text-black/60 dark:text-white/60 border-l border-black/10 dark:border-white/10">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPlaying ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                }`}
              />
              <span>{isPlaying ? "Showcase Live" : "Klik untuk putar"}</span>
            </span>
          </div>
        </div>
      )}

      {/* ── 6. Playback Notices (Brave Shields / Autoplay Blocked) ── */}
      {showVideo && (playbackBlocked || autoplayBlocked) && !isPlaying ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-20">
          <button
            type="button"
            onClick={() => {
              const v = videoRef.current;
              if (v) {
                v.muted = isMuted;
                v.play()
                  .then(() => {
                    setIsPlaying(true);
                    setMediaReady(true);
                    setAutoplayBlocked(false);
                  })
                  .catch(() => undefined);
              }
            }}
            className="group flex items-center gap-2.5 rounded-full bg-black/85 hover:bg-black text-white text-xs font-semibold px-6 py-3 backdrop-blur-md border border-white/20 shadow-2xl transition-all scale-100 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-full bg-[#FF5A1F] flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform">
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            </div>
            <span>Putar Video Showcase</span>
          </button>
        </div>
      ) : null}

      {!showVideo && !reducedMotion && allSourcesFailed ? (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-20">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-full bg-black/80 text-white text-xs font-medium px-4 py-2 backdrop-blur-sm hover:bg-black/95 border border-white/15 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Video gagal dimuat. Muat ulang halaman</span>
          </button>
        </div>
      ) : null}

      {debugMode ? (
        <div className="absolute bottom-1 left-1 z-50 pointer-events-none rounded bg-black/85 px-2 py-1 font-mono text-[10px] leading-tight text-lime-300">
          {(() => {
            const v = videoRef.current;
            const src = (v?.currentSrc || activeSrc || "").slice(-42);
            return `n=${debugTick} src=${src || "(none)"} t=${v ? v.currentTime.toFixed(1) : "-"} paused=${v ? String(v.paused) : "-"} ready=${v ? v.readyState : "-"} show=${String(showVideo)} rm=${String(reducedMotion)} blocked=${String(playbackBlocked)} failed=${String(allSourcesFailed)}`;
          })()}
        </div>
      ) : null}
    </div>
  );
};

export default HeroVideo;
