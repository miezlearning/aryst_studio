import React, { useEffect, useMemo, useRef, useState } from "react";
import { useProofingStore, MAX_SHOWCASE } from "@/lib/storage";
import { downscaleImageFile } from "@/lib/image";
import { ShowcaseCandidate } from "@/types";
import {
  Plus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Upload,
  RotateCcw,
  RefreshCw,
  Clock,
  Search,
  Images,
  Loader2,
  Eye,
} from "lucide-react";

type UploadRowStatus = "queued" | "working" | "done" | "error";

interface UploadRow {
  id: string;
  name: string;
  size: number;
  status: UploadRowStatus;
  error?: string;
  thumb: string;
}

const formatBytes = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const uploadStatusText: Record<UploadRowStatus, string> = {
  queued: "Antre",
  working: "Memproses…",
  done: "Selesai",
  error: "Gagal",
};

export const ShowcaseManager: React.FC = () => {
  const {
    showcaseItems,
    fetchShowcaseCandidates,
    addShowcasePhoto,
    addShowcaseUpload,
    removeShowcaseItem,
    moveShowcaseItem,
    resetShowcase,
    setViewMode,
    loadPhotos,
  } = useProofingStore();

  const [candidates, setCandidates] = useState<ShowcaseCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadRow[]>([]);
  const [uploadDone, setUploadDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const list = await fetchShowcaseCandidates();
        if (!cancelled) setCandidates(list);
      } catch {
        if (!cancelled) setError("Gagal memuat daftar foto sesi.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedIds = useMemo(
    () => new Set(showcaseItems.map((item) => item.id)),
    [showcaseItems]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.groupLabel.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, ShowcaseCandidate[]>();
    filtered.forEach((c) => {
      if (!map.has(c.groupLabel)) map.set(c.groupLabel, []);
      map.get(c.groupLabel)!.push(c);
    });
    return Array.from(map.entries());
  }, [filtered]);

  // Re-read Drive photos for the active session, then rebuild the picker
  // from caches: new files added to Drive appear without a page refresh.
  // Without a Drive config this just re-reads local caches (never wipes).
  // Warn before leaving mid-upload: a refresh kills in-flight files, which
  // is exactly the "must refresh to see it" confusion. Finished files are
  // already safe in local storage + cloud the moment their row says done.
  useEffect(() => {
    if (!isUploading) return;
    const guard = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [isUploading]);

  const handleReloadCandidates = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const st = useProofingStore.getState();
      if (st.config.folderId && st.config.apiKey) {
        await loadPhotos(true);
      }
      const list = await fetchShowcaseCandidates();
      setCandidates(list);
    } catch {
      setError("Gagal memuat ulang daftar foto.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePick = async (candidate: ShowcaseCandidate) => {    setError(null);
    if (showcaseItems.length >= MAX_SHOWCASE) {
      setError(`Showcase penuh (maks ${MAX_SHOWCASE} foto). Hapus salah satu dulu.`);
      return;
    }
    const ok = await addShowcasePhoto(candidate);
    if (!ok) setError("Foto ini sudah ada di showcase.");
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    e.target.value = "";
    if (files.length === 0) return;

    setError(null);
    setUploadDone(null);
    // Release previous thumbnails, then publish one row per file so every
    // file is visible while queued, processing, done, or failed.
    uploadQueue.forEach((r) => {
      if (r.thumb.startsWith("blob:")) URL.revokeObjectURL(r.thumb);
    });
    const rows: UploadRow[] = files.map((f, i) => ({
      id: `uq-${Date.now()}-${i}`,
      name: f.name,
      size: f.size,
      status: "queued",
      thumb: URL.createObjectURL(f),
    }));
    setUploadQueue(rows);
    setIsUploading(true);
    const setRow = (id: string, patch: Partial<UploadRow>) =>
      setUploadQueue((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const markRemainingSkipped = (reason: string) =>
      setUploadQueue((prev) =>
        prev.map((r) =>
          r.status === "queued" || r.status === "working"
            ? { ...r, status: "error" as const, error: reason }
            : r
        )
      );
    try {
      let added = 0;
      // Sequential on purpose: bounded memory, ordered writes, one clear story.
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const row = rows[i];
        if (useProofingStore.getState().showcaseItems.length >= MAX_SHOWCASE) {
          setError(`Showcase penuh (maks ${MAX_SHOWCASE} foto).`);
          markRemainingSkipped("Dilewati (penuh)");
          break;
        }
        setRow(row.id, { status: "working" });
        try {
          const { dataUrl } = await downscaleImageFile(file);
          const ok = await addShowcaseUpload({
            id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: file.name,
            thumbnailUrl: dataUrl,
            previewUrl: dataUrl,
            source: "upload",
          });
          if (row.thumb.startsWith("blob:")) URL.revokeObjectURL(row.thumb);
          if (!ok) {
            setRow(row.id, { status: "error", error: "Ditolak", thumb: dataUrl });
            markRemainingSkipped("Dilewati");
            break;
          }
          added += 1;
          setRow(row.id, { status: "done", thumb: dataUrl });
        } catch (err) {
          if (row.thumb.startsWith("blob:")) URL.revokeObjectURL(row.thumb);
          setRow(row.id, {
            status: "error",
            thumb: "",
            error: err instanceof Error ? err.message : "Gagal",
          });
        }
      }
      if (added > 0) {
        setUploadDone(
          added === 1
            ? "1 foto ditambahkan ke showcase dan langsung tampil di landing."
            : `${added} foto ditambahkan ke showcase dan langsung tampil di landing.`
        );
        window.setTimeout(() => setUploadDone(null), 3000);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Current showcase slots */}
      <div className="bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-[#121212] dark:text-white flex items-center gap-2">
              <Images className="w-4 h-4 text-[#FF5A1F]" />
              <span>Tampil di Halaman Utama</span>
            </h2>
            <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-1">
              Maks {MAX_SHOWCASE} foto • tersimpan otomatis & langsung tampil di landing.{" "}
              {showcaseItems.length === 0 && (
                <span className="text-[#71717A] dark:text-zinc-500">
                  Saat kosong, landing melengkapi foto otomatis dari sesi sampel.
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-[#71717A] dark:text-zinc-400 tabular-nums font-semibold">
              {showcaseItems.length}/{MAX_SHOWCASE}
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading || showcaseItems.length >= MAX_SHOWCASE}
              className="flex items-center gap-1.5 px-3.5 py-2 btn-mtioon-primary text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isUploading ? "Mengunggah..." : "Upload Foto"}</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleUpload}
            />
            {showcaseItems.length > 0 && (
              <button
                type="button"
                onClick={() => resetShowcase()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F2EB] dark:bg-white/[0.06] hover:bg-[#EDE9E0] dark:hover:bg-white/[0.1] text-[#121212] dark:text-zinc-200 text-xs font-medium transition-colors"
                title="Kembalikan ke otomatis"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Otomatis</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode("landing")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F2EB] dark:bg-white/[0.06] hover:bg-[#EDE9E0] dark:hover:bg-white/[0.1] text-[#121212] dark:text-zinc-200 text-xs font-medium transition-colors"
              title="Lihat hasil di halaman utama"
            >
              <Eye className="w-3.5 h-3.5 text-[#FF5A1F]" />
              <span>Pratinjau</span>
            </button>
          </div>
        </div>

        {uploadQueue.length > 0 && (
          <ul className="mb-3 space-y-1.5" aria-live="polite">
            {uploadQueue.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-2.5 py-1.5"
              >
                {row.thumb ? (
                  <img
                    src={row.thumb}
                    alt=""
                    className="w-9 h-9 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <span className="w-9 h-9 rounded-lg bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
                    <Images className="w-4 h-4 text-[#A1A1AA] dark:text-zinc-500" />
                  </span>
                )}
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] font-medium text-[#121212] dark:text-zinc-200 truncate">
                    {row.name}
                  </span>
                  <span className="block text-[10px] text-[#71717A] dark:text-zinc-400">
                    {formatBytes(row.size)} •{" "}
                    {row.status === "error" && row.error ? row.error : uploadStatusText[row.status]}
                  </span>
                </span>
                {row.status === "working" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#FF5A1F] shrink-0" />
                ) : row.status === "done" ? (
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : row.status === "error" ? (
                  <X className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-[#A1A1AA] dark:text-zinc-500 shrink-0" />
                )}
              </li>
            ))}
          </ul>
        )}
        {error && (
          <p className="mb-3 text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>
        )}
        {uploadDone && !error && (
          <p className="mb-3 text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>{uploadDone}</span>
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: MAX_SHOWCASE }).map((_, idx) => {
            const item = showcaseItems[idx];
            if (!item) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="aspect-[4/5] rounded-xl border border-dashed border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.02] flex flex-col items-center justify-center gap-1.5 text-[#71717A] dark:text-zinc-400"
                >
                  <Images className="w-5 h-5 text-[#A1A1AA] dark:text-zinc-500" />
                  <span className="text-[11px] font-medium">Slot {idx + 1} kosong</span>
                </div>
              );
            }
            return (
              <div
                key={item.id}
                className="relative rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 aspect-[4/5] group shadow-xs"
              >
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 text-white backdrop-blur-sm border border-white/20">
                  {idx + 1} • {item.source === "upload" ? "Upload" : "Sesi"}
                </span>
                <button
                  type="button"
                  onClick={() => removeShowcaseItem(item.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-500 text-white transition-colors"
                  title="Hapus dari showcase"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/85 via-black/50 to-transparent">
                  <p className="text-[10px] font-medium text-white truncate mb-1.5">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveShowcaseItem(item.id, -1)}
                      disabled={idx === 0}
                      className="flex-1 flex items-center justify-center p-1 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors disabled:opacity-30"
                      title="Geser ke kiri"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveShowcaseItem(item.id, 1)}
                      disabled={idx === showcaseItems.length - 1}
                      className="flex-1 flex items-center justify-center p-1 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors disabled:opacity-30"
                      title="Geser ke kanan"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate picker */}
      <div className="bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.1] rounded-2xl p-6 shadow-sm transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#121212] dark:text-white">Pilih dari Semua Foto Sesi</h3>
            <p className="text-xs text-[#52525B] dark:text-zinc-400 mt-0.5">
              Klik foto untuk menambahkannya ke showcase halaman utama.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReloadCandidates}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F5F2EB] dark:bg-white/[0.06] hover:bg-[#EDE9E0] dark:hover:bg-white/[0.1] text-[#121212] dark:text-zinc-200 text-xs font-medium transition-colors disabled:opacity-50 shrink-0"
              title="Muat ulang foto dari Drive untuk sesi aktif"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Muat ulang</span>
            </button>
            <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A] dark:text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / sesi..."
              className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-[#202026] border border-black/15 dark:border-white/10 rounded-xl text-xs text-[#121212] dark:text-[#F4F4F6] placeholder-[#A1A1AA] dark:placeholder-zinc-500 focus:outline-none focus:border-[#FF5A1F] focus:ring-1 focus:ring-[#FF5A1F] transition-colors"
            />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-xs text-[#71717A] dark:text-zinc-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#FF5A1F]" />
            <span>Memuat foto dari semua sesi...</span>
          </div>
        ) : grouped.length === 0 ? (
          <p className="py-10 text-center text-xs text-[#71717A] dark:text-zinc-400">
            {search ? `Tidak ada foto yang cocok dengan "${search}".` : "Belum ada foto sesi."}
          </p>
        ) : (
          <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
            {grouped.map(([group, list]) => (
              <div key={group}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#71717A] dark:text-zinc-400 mb-2">
                  {group} <span className="text-[#A1A1AA] dark:text-zinc-500">• {list.length}</span>
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                  {list.map((photo) => {
                    const isSelected = selectedIds.has(photo.id);
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => !isSelected && handlePick(photo)}
                        disabled={isSelected}
                        title={photo.name}
                        className={`relative rounded-xl overflow-hidden bg-black/5 dark:bg-white/5 border aspect-square group text-left transition-all ${
                          isSelected
                            ? "border-emerald-500/80 ring-2 ring-emerald-500/20 opacity-80 cursor-default"
                            : "border-black/10 dark:border-white/10 hover:border-[#FF5A1F] hover:shadow-sm cursor-pointer"
                        }`}
                      >
                        <img
                          src={photo.thumbnailUrl}
                          alt={photo.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/85 to-transparent text-[9px] font-medium text-white truncate">
                          {photo.name}
                        </span>
                        <span
                          className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                            isSelected
                              ? "bg-emerald-500 border-emerald-400 text-white"
                              : "bg-black/70 border-white/20 text-white opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          ) : (
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShowcaseManager;
