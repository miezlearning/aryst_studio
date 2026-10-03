import React, { useEffect, useRef, useState } from "react";
import {
  useProofingStore,
  DEFAULT_HERO_VIDEO_LOCAL,
  DEFAULT_HERO_POSTER,
  MAX_HERO_VIDEO_BYTES,
} from "@/lib/storage";
import { getR2Config } from "@/lib/r2Storage";
import { useAssuredPlayback } from "@/lib/useAssuredPlayback";
import {
  Clapperboard,
  Link2,
  Upload,
  RotateCcw,
  Check,
  Loader2,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCw,
} from "lucide-react";

/**
 * Decode-check the exact bytes before accepting them: metadata alone cannot
 * tell a playable file from one that only renders its first frame or crawls
 * at a fraction of real speed (which reads as frozen on screen). Accepting
 * blindly is how an upload "succeeds" while never moving.
 */
const probeVideoFile = (file: Blob): Promise<boolean> =>
  new Promise((resolve) => {
    if (file.type) {
      try {
        const sniff = document.createElement("video");
        if (sniff.canPlayType(file.type) === "") {
          resolve(false);
          return;
        }
      } catch {
        // Fall through to the decode probe below
      }
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.preload = "auto";
    video.playsInline = true;
    // Rendered in-viewport but near-invisible: only presented frames prove
    // the file really moves on screen (decode-only or offscreen checks miss
    // the exact crawl this probe must catch).
    video.style.position = "fixed";
    video.style.right = "8px";
    video.style.bottom = "8px";
    video.style.width = "160px";
    video.style.height = "90px";
    video.style.opacity = "0.02";
    video.style.pointerEvents = "none";
    video.style.zIndex = "1";
    document.body.appendChild(video);
    let done = false;

    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      video.remove();
      URL.revokeObjectURL(url);
      resolve(ok);
    };

    // 12s overall budget: metadata, then a 2.5s real-playback sample.
    const timer = setTimeout(() => finish(false), 12000);

    video.onerror = () => {
      finish(false);
    };

    video.onloadeddata = () => {
      if (video.readyState < 2) {
        finish(false);
        return;
      }
      // A hidden tab throttles decoding, so speed can only be measured
      // while visible; otherwise metadata alone is the check.
      if (document.visibilityState !== "visible") {
        finish(true);
        return;
      }
      const t0 = video.currentTime;
      let presented = 0;
      const countFrame = () => {
        if (done) return;
        presented += 1;
        if (typeof video.requestVideoFrameCallback === "function") {
          video.requestVideoFrameCallback(countFrame);
        }
      };
      if (typeof video.requestVideoFrameCallback === "function") {
        video.requestVideoFrameCallback(countFrame);
      }
      video.play().catch(() => finish(false));
      setTimeout(() => {
        const dt = video.currentTime - t0;
        // Must sustain at least half speed AND actually present frames;
        // slower reads as frozen even though bytes decode.
        const ok =
          dt > 1.2 &&
          (presented >= 15 || typeof video.requestVideoFrameCallback !== "function");
        (window as unknown as { __lastProbe?: unknown }).__lastProbe = {
          dt: +dt.toFixed(2),
          presented,
          dur: Number.isFinite(video.duration) ? +video.duration.toFixed(2) : 0,
        };
        finish(ok);
      }, 2500);
    };

    video.src = url;
  });

const formatTime = (sec: number): string => {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

/**
 * Dashboard panel to manage the landing hero background video:
 * default cinematic clip, custom URL, or uploaded file (max 30 MB).
 */
export const HeroVideoManager: React.FC = () => {
  const {
    heroVideoUrl,
    hasHeroVideoUpload,
    heroVideoRev,
    setHeroVideoUrl,
    saveHeroVideoUpload,
    clearHeroVideo,
    resolveHeroVideoUrl,
  } = useProofingStore();

  const [urlInput, setUrlInput] = useState(heroVideoUrl);
  const [previewSrc, setPreviewSrc] = useState(DEFAULT_HERO_VIDEO_LOCAL);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasR2, setHasR2] = useState<boolean | null>(null);
  // Explicit user pause (Jeda button) must stand: the watchdog below only
  // recovers unintentional pauses, it never overrides a deliberate one.
  const [userPausedIntent, setUserPausedIntent] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  // Playback watchdog for the preview element (idle while the user paused).
  useAssuredPlayback(previewRef, !userPausedIntent);

  useEffect(() => {
    let cancelled = false;
    getR2Config()
      .then((cfg) => {
        if (!cancelled) setHasR2(Boolean(cfg));
      })
      .catch(() => {
        if (!cancelled) setHasR2(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setUrlInput(heroVideoUrl);
  }, [heroVideoUrl]);

  // Load preview source from store or fallback
  useEffect(() => {
    let cancelled = false;
    setPreviewBroken(false);
    setIsBuffering(true);
    setUserPausedIntent(false);

    resolveHeroVideoUrl().then((url) => {
      if (cancelled) return;
      const nextSrc = url || DEFAULT_HERO_VIDEO_LOCAL;
      setPreviewSrc(nextSrc);
    });

    return () => {
      cancelled = true;
    };
  }, [heroVideoUrl, hasHeroVideoUpload, heroVideoRev, resolveHeroVideoUrl]);

  // Handle active playback when source or mute changes
  useEffect(() => {
    const v = previewRef.current;
    if (!v) return;

    v.muted = isMuted;
    v.defaultMuted = true;
    v.playsInline = true;

    const promise = v.play();
    if (promise !== undefined) {
      promise
        .then(() => {
          setIsPlaying(true);
          setPreviewBroken(false);
        })
        .catch(() => {
          setIsPlaying(false);
        });
    }
  }, [previewSrc, isMuted]);

  // Auto-unlock preview playback on first user gesture if blocked by Brave Shields
  useEffect(() => {
    if (isPlaying) return;
    const unlock = () => {
      const v = previewRef.current;
      if (v && v.paused) {
        v.muted = isMuted;
        v.play()
          .then(() => setIsPlaying(true))
          .catch(() => undefined);
      }
    };
    window.addEventListener("pointerdown", unlock, { passive: true, once: true });
    window.addEventListener("keydown", unlock, { passive: true, once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [isPlaying, isMuted]);

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const togglePlayPause = () => {
    const v = previewRef.current;
    if (!v) return;
    if (v.paused) {
      setUserPausedIntent(false);
      v.muted = isMuted;
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      setUserPausedIntent(true);
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = previewRef.current;
    if (!v) return;
    const next = !isMuted;
    v.muted = next;
    setIsMuted(next);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = previewRef.current;
    if (!v) return;
    const time = Number(e.target.value);
    v.currentTime = time;
    setCurrentTime(time);
  };

  const restartVideo = () => {
    const v = previewRef.current;
    if (!v) return;
    setUserPausedIntent(false);
    v.currentTime = 0;
    v.play()
      .then(() => setIsPlaying(true))
      .catch(() => undefined);
  };

  const toggleFullscreen = () => {
    const v = previewRef.current;
    if (!v) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    } else {
      v.requestFullscreen().catch(() => undefined);
    }
  };

  // Direct-file links validation
  const validateUrl = (raw: string): string | null => {
    const url = raw.trim();
    if (!url) return null;
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return "URL tidak valid. Harus diawali https://";
    }
    if (parsed.protocol !== "https:") {
      return "URL harus memakai https://";
    }
    if (
      /youtube\.com|youtu\.be|drive\.google\.com\/file|facebook\.com|instagram\.com|vimeo\.com|tiktok\.com/i.test(
        url
      )
    ) {
      return "Itu tautan halaman web/video, bukan file aslinya. Salin URL file langsung yang berakhiran .mp4 / .webm.";
    }
    if (!/\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i.test(url)) {
      return "URL sebaiknya menunjuk file video langsung (.mp4 / .webm).";
    }
    return null;
  };

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const problem = validateUrl(urlInput);
    if (problem) {
      setError(problem);
      return;
    }
    setIsSaving(true);
    try {
      await setHeroVideoUrl(urlInput);
      flashSaved();
    } catch {
      setError("Gagal menyimpan URL video.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("video/")) {
      setError("File harus berupa video (MP4/WebM).");
      return;
    }
    if (file.size > MAX_HERO_VIDEO_BYTES) {
      setError("Ukuran video maks 30 MB. Kompres dulu atau gunakan URL.");
      return;
    }
    setIsUploading(true);
    try {
      const playable = await probeVideoFile(file);
      if (!playable) {
        setError(
          "Video ini tidak dapat diputar lancar di browser (format atau codec tidak didukung, file rusak, atau terlalu berat). Simpan sebagai MP4 (H.264) lalu upload ulang."
        );
        return;
      }
      await saveHeroVideoUpload(file);
      flashSaved();
    } catch (err) {
      const detail = err instanceof Error && err.message ? ` (${err.message})` : "";
      setError(`Gagal menyimpan video${detail}.`);
    } finally {
      setIsUploading(false);
    }
  };

  const activeSource = hasHeroVideoUpload
    ? "File upload lokal"
    : heroVideoUrl
    ? "URL kustom (Cloud)"
    : "Default studio bawaan";

  return (
    <div className="bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl p-6 shadow-sm transition-colors">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Preview Player Card */}
        <div className="lg:w-80 shrink-0">
          <div className="group relative rounded-xl overflow-hidden bg-black/10 dark:bg-white/5 border border-black/[0.08] dark:border-white/[0.1] aspect-video flex items-center justify-center shadow-inner">
            <video
              ref={(el) => {
                previewRef.current = el;
                if (el) {
                  el.muted = isMuted;
                  el.defaultMuted = true;
                  el.playsInline = true;
                }
              }}
              key={previewSrc}
              className="w-full h-full object-cover cursor-pointer"
              src={previewSrc}
              poster={DEFAULT_HERO_POSTER}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              preload="auto"
              onClick={togglePlayPause}
              onLoadedData={() => {
                setIsBuffering(false);
                setPreviewBroken(false);
                if (previewRef.current) {
                  setDuration(previewRef.current.duration || 0);
                  previewRef.current
                    .play()
                    .then(() => setIsPlaying(true))
                    .catch(() => setIsPlaying(false));
                }
              }}
              onTimeUpdate={() => {
                if (previewRef.current) {
                  setCurrentTime(previewRef.current.currentTime);
                }
              }}
              onPlaying={() => {
                setIsPlaying(true);
                setIsBuffering(false);
                setPreviewBroken(false);
              }}
              onPause={() => {
                setIsPlaying(false);
              }}
              onWaiting={() => {
                setIsBuffering(true);
              }}
              onError={() => {
                setPreviewBroken(true);
                setIsPlaying(false);
                setIsBuffering(false);
              }}
            />

            {/* Top Badges */}
            <div className="absolute top-2 inset-x-2 flex items-center justify-between pointer-events-none z-10">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 text-white backdrop-blur-sm border border-white/20">
                {activeSource}
              </span>

              {previewBroken ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600/90 text-white backdrop-blur-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Gagal Memuat
                </span>
              ) : isBuffering ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-600/90 text-white backdrop-blur-sm flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Memuat...
                </span>
              ) : isPlaying ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/90 text-white backdrop-blur-sm flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Memutar
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/90 text-white backdrop-blur-sm flex items-center gap-1">
                  Dijeda
                </span>
              )}
            </div>

            {/* Big Center Play/Pause button on hover or pause */}
            {!isPlaying && !previewBroken && (
              <button
                type="button"
                onClick={togglePlayPause}
                className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-xl transition-all scale-100 hover:scale-110 active:scale-95 z-10 cursor-pointer"
                aria-label="Putar preview video"
              >
                <Play className="w-5 h-5 fill-current ml-0.5 text-[#FF5A1F]" />
              </button>
            )}

            {/* Bottom Controls Bar */}
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2.5 pt-6 flex flex-col gap-1.5 transition-opacity z-10">
              {/* Progress Scrubber Bar */}
              <input
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-[#FF5A1F] hover:h-1.5 transition-all"
                aria-label="Seek video"
              />

              {/* Bottom Control Actions */}
              <div className="flex items-center justify-between text-white text-[11px]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    className="p-1 rounded hover:bg-white/20 transition-colors cursor-pointer"
                    title={isPlaying ? "Jeda" : "Putar"}
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current text-[#FF5A1F]" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={restartVideo}
                    className="p-1 rounded hover:bg-white/20 transition-colors cursor-pointer"
                    title="Putar dari awal"
                  >
                    <RotateCw className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1 rounded hover:bg-white/20 transition-colors cursor-pointer"
                    title={isMuted ? "Bunyikan" : "Bisukan"}
                  >
                    {isMuted ? (
                      <VolumeX className="w-3.5 h-3.5 text-white/70" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5 text-[#FF5A1F]" />
                    )}
                  </button>

                  <span className="font-mono text-[10px] text-white/80">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-1 rounded hover:bg-white/20 transition-colors cursor-pointer"
                  title="Layar penuh"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-white/80" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Action Preview Buttons */}
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={togglePlayPause}
              className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#F5F2EB] dark:bg-white/[0.08] hover:bg-[#EDE9E0] dark:hover:bg-white/[0.12] text-[#121212] dark:text-white transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3 h-3" />
                  <span>Jeda Preview</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-[#FF5A1F] fill-current" />
                  <span>Uji Putar Preview</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={restartVideo}
              className="py-1.5 px-3 rounded-lg text-xs font-semibold bg-[#F5F2EB] dark:bg-white/[0.08] hover:bg-[#EDE9E0] dark:hover:bg-white/[0.12] text-[#121212] dark:text-white transition-colors flex items-center justify-center gap-1 cursor-pointer"
              title="Putar ulang dari awal"
            >
              <RotateCw className="w-3 h-3" />
              <span>Ulang</span>
            </button>
          </div>

          <p className="mt-2 text-[11px] text-[#71717A] dark:text-zinc-400">
            {previewBroken
              ? "Video tidak bisa dimuat. Periksa URL file atau upload ulang video MP4."
              : isPlaying
              ? "Preview berjalan normal seperti di landing page."
              : "Preview dijeda. Klik tombol di atas atau klik video untuk memutar."}
          </p>

          {hasHeroVideoUpload && hasR2 === false && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#C2410C] dark:text-orange-300">
              Cloudflare R2 belum diisi: video ini hanya tersimpan di browser ini. Isi konfigurasi R2 di tab Integrasi agar sinkron ke semua perangkat klien.
            </p>
          )}
          {hasHeroVideoUpload && hasR2 && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-emerald-700 dark:text-emerald-400">
              R2 terhubung: video ikut diunggah ke Cloudflare R2 dan tampil di semua perangkat.
            </p>
          )}
        </div>

        {/* Video Source Controls */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h2 className="text-base font-bold text-[#121212] dark:text-white flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-[#FF5A1F]" />
              <span>Video Latar Hero</span>
            </h2>
          </div>
          <p className="text-xs text-[#52525B] dark:text-zinc-400 mb-3">
            Video sinematik berulang otomatis (autoplay loop, tanpa suara) di latar hero landing page.
          </p>

          <div className="mb-4 p-3 rounded-xl bg-[#F5F2EB]/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-[11px] text-[#71717A] dark:text-zinc-400 leading-relaxed">
            <span className="font-semibold text-[#121212] dark:text-zinc-200">Tips Sinkronisasi:</span> Upload file video di bawah (maks 30 MB) tersimpan lokal dan ke Cloudflare R2. Atau gunakan link langsung file video (.mp4) yang tersimpan di <strong>Firestore</strong> untuk semua pengunjung.
          </div>

          {error && (
            <p className="mb-3 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
          )}
          {saved && !error && (
            <p className="mb-3 text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Tersimpan! Buka landing page untuk melihat hasilnya.</span>
            </p>
          )}

          {/* Form URL */}
          <form onSubmit={handleSaveUrl} className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Link2 className="w-3.5 h-3.5 text-[#71717A] dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://.../video.mp4 (URL langsung file video)"
                className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-[#202026] border border-black/15 dark:border-white/10 rounded-xl text-xs text-[#121212] dark:text-[#F4F4F6] placeholder-[#A1A1AA] dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[#F5F2EB] dark:bg-white/[0.08] hover:bg-[#EDE9E0] dark:hover:bg-white/[0.12] text-[#121212] dark:text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isSaving ? "Menyimpan..." : "Simpan URL"}
            </button>
          </form>

          {/* File Upload and Reset */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3.5 py-2 btn-mtioon-primary text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isUploading ? "Memproses video..." : "Upload Video Lokal (maks 30 MB)"}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleUpload}
            />

            {(heroVideoUrl || hasHeroVideoUpload) && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  clearHeroVideo().then(() => {
                    flashSaved();
                    setPreviewSrc(DEFAULT_HERO_VIDEO_LOCAL);
                  });
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.1] border border-black/10 dark:border-white/10 text-[#71717A] dark:text-zinc-300 hover:text-[#121212] dark:hover:text-white text-xs font-medium transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset ke Video Bawaan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroVideoManager;
