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
      setError(
        `Gagal mengunggah video ke cloud${detail}. Periksa konfigurasi Cloudflare R2 di kartu Pengaturan (atau aktifkan Firebase Storage di Firebase Console), atau gunakan URL video.`
      );
    } finally {
      setIsUploading(false);
    }
  };

  const activeSource = hasHeroVideoUpload
    ? "File upload"
    : heroVideoUrl
      ? "URL kustom"
      : "Default studio";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Preview */}
        <div className="lg:w-64 shrink-0">
          <div className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 aspect-video">
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
            <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-amber-400 border border-amber-400/30">
              {activeSource}
            </span>
          </div>
          <p className="mt-1.5 text-[11px] text-zinc-400">
            {previewBroken
              ? "Video tidak bisa dimuat di browser ini (host diblokir / bukan file mp4). Coba URL lain atau upload file."
              : "Arahkan kursor ke preview untuk memutar."}
          </p>
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-amber-400" />
            <span>Video Latar Hero</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 mb-4">
            Video autoplay tanpa suara di latar hero halaman utama. Upload mendapat
            prioritas, lalu URL kustom, lalu default studio.
          </p>

          {error && (
            <p className="mb-3 text-xs text-rose-400 font-medium">{error}</p>
          )}
          {saved && !error && (
            <p className="mb-3 text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="w-3.5 h-3.5" />
              <span>Tersimpan. Buka halaman utama untuk melihat.</span>
            </p>
          )}

          <form onSubmit={handleSaveUrl} className="flex items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Link2 className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://.../video.mp4 (opsional)"
                className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-semibold transition-colors disabled:opacity-50 shrink-0"
            >
              {isSaving ? "Menyimpan..." : "Simpan URL"}
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isUploading ? "Mengunggah..." : "Upload Video (maks 30 MB)"}</span>
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
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kembalikan Default</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroVideoManager;
