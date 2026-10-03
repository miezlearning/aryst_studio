import React, { useEffect, useRef, useState } from "react";
import {
  useProofingStore,
  DEFAULT_HERO_VIDEO_HD,
  DEFAULT_HERO_POSTER,
  MAX_HERO_VIDEO_BYTES,
} from "@/lib/storage";
import {
  Clapperboard,
  Link2,
  Upload,
  RotateCcw,
  Check,
  Loader2,
} from "lucide-react";

/**
 * Dashboard panel to manage the landing hero background video:
 * default cinematic clip, custom URL, or uploaded file (max 30 MB).
 */
export const HeroVideoManager: React.FC = () => {
  const {
    heroVideoUrl,
    hasHeroVideoUpload,
    setHeroVideoUrl,
    saveHeroVideoUpload,
    clearHeroVideo,
    resolveHeroVideoUrl,
  } = useProofingStore();

  const [urlInput, setUrlInput] = useState(heroVideoUrl);
  const [previewSrc, setPreviewSrc] = useState(DEFAULT_HERO_VIDEO_HD);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUrlInput(heroVideoUrl);
  }, [heroVideoUrl]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = "";
    setPreviewBroken(false);
    resolveHeroVideoUrl().then((url) => {
      if (cancelled) return;
      if (url.startsWith("blob:")) objectUrl = url;
      setPreviewSrc(url || DEFAULT_HERO_VIDEO_HD);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heroVideoUrl, hasHeroVideoUpload]);

  const flashSaved = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  // Direct-file links only: page URLs (YouTube/Drive/Facebook...) never play
  const validateUrl = (raw: string): string | null => {
    const url = raw.trim();
    if (!url) return null; // empty = back to default, handled by save flow
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
      return "Itu tautan halaman video, bukan file-nya. Salin tautan langsung yang berakhiran .mp4 / .webm.";
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
      setError("Ukuran video maks 30 MB. Kompres dulu atau pakai URL.");
      return;
    }
    setIsUploading(true);
    try {
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
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Preview */}
        <div className="lg:w-64 shrink-0">
          <div className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/[0.08] dark:border-white/[0.1] aspect-video">
            <video
              key={previewSrc}
              className="w-full h-full object-cover"
              src={previewSrc}
              poster={DEFAULT_HERO_POSTER}
              muted
              loop
              playsInline
              preload="metadata"
              onError={() => setPreviewBroken(true)}
              onPlaying={() => setPreviewBroken(false)}
              onMouseEnter={(e) => e.currentTarget.play().catch(() => undefined)}
              onMouseLeave={(e) => e.currentTarget.pause()}
            />
            <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/80 text-white backdrop-blur-sm border border-white/20">
              {activeSource}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#71717A] dark:text-zinc-400">
            {previewBroken
              ? "Video tidak bisa dimuat di browser ini. Periksa URL atau coba upload file video."
              : "Arahkan kursor ke preview untuk memutar cepat."}
          </p>
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-[#121212] dark:text-white flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-[#FF5A1F]" />
            <span>Video Latar Hero</span>
          </h2>
          <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1 mb-3">
            Video sinematik berulang otomatis (autoplay loop, tanpa suara) di latar hero landing page.
          </p>

          <div className="mb-4 p-3 rounded-xl bg-[#F5F2EB]/60 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] text-[11px] text-[#71717A] dark:text-zinc-400 leading-relaxed">
            <span className="font-semibold text-[#121212] dark:text-zinc-200">Tips Sinkronisasi:</span> Jika sudah mengunggah video ke Firebase Storage, Google Drive, atau CDN, salin URL langsung file tersebut (.mp4) lalu tempel ke kolom di bawah. URL akan otomatis tersimpan di <strong>Firestore</strong> dan langsung tampil di semua perangkat klien.
          </div>

          {error && (
            <p className="mb-3 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
          )}
          {saved && !error && (
            <p className="mb-3 text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Tersimpan! Buka landing page untuk melihat hasilnya.</span>
            </p>
          )}

          <form onSubmit={handleSaveUrl} className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Link2 className="w-3.5 h-3.5 text-[#71717A] dark:text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://.../video.mp4 (URL Firebase Storage / CDN / Drive)"
                className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-[#202026] border border-black/15 dark:border-white/10 rounded-xl text-xs text-[#121212] dark:text-[#F4F4F6] placeholder-[#A1A1AA] dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[#F5F2EB] dark:bg-white/[0.08] hover:bg-[#EDE9E0] dark:hover:bg-white/[0.12] text-[#121212] dark:text-white text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
            >
              {isSaving ? "Menyimpan..." : "Simpan URL"}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3.5 py-2 btn-mtioon-primary text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isUploading ? "Menyimpan..." : "Upload Video Lokal (maks 30 MB)"}</span>
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
                  clearHeroVideo().then(flashSaved);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-white/[0.06] hover:bg-black/[0.04] dark:hover:bg-white/[0.1] border border-black/10 dark:border-white/10 text-[#71717A] dark:text-zinc-300 hover:text-[#121212] dark:hover:text-white text-xs font-medium transition-colors"
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
