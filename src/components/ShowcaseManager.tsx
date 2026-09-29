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
  Search,
  Images,
  Loader2,
  Eye,
} from "lucide-react";

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
  } = useProofingStore();

  const [candidates, setCandidates] = useState<ShowcaseCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
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

  const handlePick = async (candidate: ShowcaseCandidate) => {
    setError(null);
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
    setIsUploading(true);
    try {
      for (const file of files) {
        if (useProofingStore.getState().showcaseItems.length >= MAX_SHOWCASE) {
          setError(`Showcase penuh (maks ${MAX_SHOWCASE} foto).`);
          break;
        }
        const { dataUrl } = await downscaleImageFile(file);
        const ok = await addShowcaseUpload({
          id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: file.name,
          thumbnailUrl: dataUrl,
          previewUrl: dataUrl,
          source: "upload",
        });
        if (!ok) break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah gambar.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Current showcase slots */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Images className="w-4 h-4 text-amber-400" />
              <span>Tampil di Halaman Utama</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Maks {MAX_SHOWCASE} foto • tersimpan otomatis & langsung tampil di landing.{" "}
              {showcaseItems.length === 0 && (
                <span className="text-zinc-500">
                  Saat kosong, landing memakai 4 foto pertama otomatis.
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-zinc-500 tabular-nums">
              {showcaseItems.length}/{MAX_SHOWCASE}
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isUploading || showcaseItems.length >= MAX_SHOWCASE}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold transition-colors disabled:opacity-50"
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
                title="Kembalikan ke otomatis"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Otomatis</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode("landing")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
              title="Lihat hasil di halaman utama"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Pratinjau</span>
            </button>
          </div>
        </div>

        {error && (
          <p className="mb-3 text-xs text-rose-400 font-medium">{error}</p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: MAX_SHOWCASE }).map((_, idx) => {
            const item = showcaseItems[idx];
            if (!item) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="aspect-[4/5] rounded-xl border border-dashed border-zinc-700 bg-zinc-950/50 flex flex-col items-center justify-center gap-1.5 text-zinc-600"
                >
                  <Images className="w-5 h-5" />
                  <span className="text-[11px] font-medium">Slot {idx + 1} kosong</span>
                </div>
              );
            }
            return (
              <div
                key={item.id}
                className="relative rounded-xl overflow-hidden bg-zinc-950 border border-zinc-700/60 aspect-[4/5] group"
              >
                <img
                  src={item.thumbnailUrl}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/70 text-amber-400 border border-amber-400/30">
                  {idx + 1} • {item.source === "upload" ? "Upload" : "Sesi"}
                </span>
                <button
                  type="button"
                  onClick={() => removeShowcaseItem(item.id)}
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-rose-500 text-zinc-300 hover:text-white border border-zinc-700 transition-colors"
                  title="Hapus dari showcase"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 to-transparent">
                  <p className="text-[10px] font-medium text-zinc-300 truncate mb-1.5">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveShowcaseItem(item.id, -1)}
                      disabled={idx === 0}
                      className="flex-1 flex items-center justify-center p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30"
                      title="Geser ke kiri"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveShowcaseItem(item.id, 1)}
                      disabled={idx === showcaseItems.length - 1}
                      className="flex-1 flex items-center justify-center p-1 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-30"
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
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white">Pilih dari Semua Foto Sesi</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Klik foto untuk menambahkannya ke showcase halaman utama.
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama / sesi..."
              className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="py-10 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Memuat foto dari semua sesi...</span>
          </div>
        ) : grouped.length === 0 ? (
          <p className="py-10 text-center text-xs text-zinc-500">
            {search ? `Tidak ada foto yang cocok dengan "${search}".` : "Belum ada foto sesi."}
          </p>
        ) : (
          <div className="space-y-5 max-h-[520px] overflow-y-auto pr-1">
            {grouped.map(([group, list]) => (
              <div key={group}>
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  {group} <span className="text-zinc-600">• {list.length}</span>
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
                        className={`relative rounded-lg overflow-hidden bg-zinc-950 border aspect-square group text-left transition-colors ${
                          isSelected
                            ? "border-emerald-500/60 opacity-70 cursor-default"
                            : "border-zinc-800 hover:border-amber-400/70 cursor-pointer"
                        }`}
                      >
                        <img
                          src={photo.thumbnailUrl}
                          alt={photo.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 px-1.5 py-1 bg-gradient-to-t from-black/85 to-transparent text-[9px] font-medium text-zinc-300 truncate">
                          {photo.name}
                        </span>
                        <span
                          className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center border ${
                            isSelected
                              ? "bg-emerald-500 border-emerald-400 text-zinc-950"
                              : "bg-black/70 border-zinc-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
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
