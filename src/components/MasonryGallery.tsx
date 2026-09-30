import React, { useMemo, useState } from "react";
import { useProofingStore } from "@/lib/storage";
import { PhotoMetadata } from "@/types";
import { EmptyState } from "./EmptyState";
import { formatBytes } from "@/lib/utils";
import {
  Check,
  Maximize2,
  MessageSquare,
  Search,
  Circle,
  Lock,
  MapPin,
  Layers,
} from "lucide-react";

export const MasonryGallery: React.FC = () => {
  const {
    photos,
    session,
    isLoading,
    error,
    config,
    activeFilter,
    searchQuery,
    clientProjects,
    activeProjectId,
    setActiveFilter,
    setSearchQuery,
    toggleSelectPhoto,
    isPhotoSelected,
    setLightboxPhotoId,
    loadPhotos,
  } = useProofingStore();

  const [activeSectionFilter, setActiveSectionFilter] = useState<string>("all");

  const selectedCount = session.selectedPhotoIds.length;
  const isFull = selectedCount >= session.maxQuota;

  const currentProject = clientProjects.find((p) => p.id === activeProjectId);

  // Discover all unique sections from project definition and photos
  const sectionsList = useMemo(() => {
    const defined = currentProject?.sections || [];
    const photoSections = Array.from(
      new Set(photos.map((p) => p.section).filter(Boolean) as string[])
    );

    const merged: { id: string; name: string; location?: string; description?: string }[] = [];
    const seen = new Set<string>();

    defined.forEach((s) => {
      merged.push(s);
      seen.add(s.name);
    });

    photoSections.forEach((sName) => {
      if (!seen.has(sName)) {
        const matchingPhoto = photos.find((p) => p.section === sName);
        merged.push({
          id: `sec-${sName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
          name: sName,
          location: matchingPhoto?.location || "",
        });
        seen.add(sName);
      }
    });

    return merged;
  }, [currentProject, photos]);

  // Filter photos based on status, section, and search query
  const filteredPhotos = useMemo(() => {
    return photos.filter((photo) => {
      // 1. Status filter
      const isSelected = session.selectedPhotoIds.includes(photo.id);
      if (activeFilter === "selected" && !isSelected) return false;
      if (activeFilter === "unselected" && isSelected) return false;

      // 2. Section filter
      if (activeSectionFilter !== "all") {
        const photoSec = photo.section || "Galeri Utama";
        if (photoSec !== activeSectionFilter) return false;
      }

      // 3. Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = photo.name.toLowerCase().includes(query);
        const matchesSec = photo.section?.toLowerCase().includes(query);
        const matchesLoc = photo.location?.toLowerCase().includes(query);
        return matchesName || matchesSec || matchesLoc;
      }

      return true;
    });
  }, [photos, session.selectedPhotoIds, activeFilter, activeSectionFilter, searchQuery]);

  // Group filtered photos by their section
  const groupedSections = useMemo(() => {
    const groups: {
      name: string;
      location?: string;
      description?: string;
      photos: PhotoMetadata[];
    }[] = [];

    sectionsList.forEach((sec) => {
      const secPhotos = filteredPhotos.filter((p) => p.section === sec.name);
      if (secPhotos.length > 0) {
        groups.push({
          name: sec.name,
          location: sec.location,
          description: sec.description,
          photos: secPhotos,
        });
      }
    });

    // Photos that don't match any declared section
    const otherPhotos = filteredPhotos.filter(
      (p) => !p.section || !sectionsList.some((s) => s.name === p.section)
    );
    if (otherPhotos.length > 0) {
      groups.push({
        name: "Galeri Utama",
        location: otherPhotos[0]?.location || "",
        photos: otherPhotos,
      });
    }

    return groups;
  }, [sectionsList, filteredPhotos]);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <div className="inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-zinc-400">Memuat foto galeri...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-rose-200">
          <h3 className="text-base font-semibold text-rose-300 mb-2">Gagal Memuat Galeri</h3>
          <p className="text-xs text-rose-400 mb-4">{error}</p>
          <button
            onClick={() => loadPhotos(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-36">
      {/* Controls Bar: Status Filter & Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800/80 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeFilter === "all"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Semua Foto ({photos.length})
          </button>
          <button
            onClick={() => setActiveFilter("selected")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
              activeFilter === "selected"
                ? "bg-amber-500 text-zinc-950 font-semibold shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span>Terpilih</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                activeFilter === "selected"
                  ? "bg-zinc-950/20 text-zinc-950 font-bold"
                  : "bg-zinc-800 text-zinc-300"
              }`}
            >
              {selectedCount}/{session.maxQuota}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("unselected")}
            className={`px-3.5 py-1.5 rounded-lg transition-all ${
              activeFilter === "unselected"
                ? "bg-zinc-800 text-zinc-100 shadow-sm"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Belum Dipilih ({Math.max(0, photos.length - selectedCount)})
          </button>
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px] md:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor, nama, atau lokasi foto..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-300"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Storyline Chapter / Location Bar */}
      {sectionsList.length > 0 && (
        <div className="mb-8 p-1.5 bg-zinc-900/60 border border-zinc-800/80 rounded-xl flex items-center gap-1.5 overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5 px-2.5 py-1 text-zinc-400 font-semibold text-[11px] shrink-0 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Bab & Lokasi:</span>
          </div>

          <button
            onClick={() => setActiveSectionFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors shrink-0 ${
              activeSectionFilter === "all"
                ? "bg-zinc-800 text-white font-semibold"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            Semua Bab ({photos.length})
          </button>

          {sectionsList.map((sec) => {
            const count = photos.filter((p) => p.section === sec.name).length;
            const isCurrent = activeSectionFilter === sec.name;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSectionFilter(sec.name)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors shrink-0 ${
                  isCurrent
                    ? "bg-amber-400 text-zinc-950 font-bold"
                    : "text-zinc-300 hover:text-white hover:bg-zinc-800/60 border border-zinc-800"
                }`}
              >
                <MapPin className={`w-3 h-3 ${isCurrent ? "text-zinc-950" : "text-amber-400"}`} />
                <span>{sec.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded ${isCurrent ? "bg-zinc-950/20 text-zinc-950" : "bg-zinc-800 text-zinc-400"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Storyline Grouped Sections Grid */}
      {photos.length === 0 && !searchQuery && activeFilter === "all" ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/40 p-8 sm:p-12 text-center">
          <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-zinc-900 border border-zinc-800 mb-4">
            <Layers className="w-5 h-5 text-zinc-600" />
          </div>
          {!config.folderId ? (
            <>
              <p className="text-sm font-semibold text-zinc-300">
                Galeri ini belum dihubungkan ke folder foto
              </p>
              <p className="text-xs text-zinc-400 mt-1.5 max-w-md mx-auto">
                Fotografer belum memasukkan tautan folder Google Drive untuk sesi ini. Foto akan
                muncul otomatis begitu sumber foto diatur.
              </p>
            </>
          ) : !config.apiKey ? (
            <>
              <p className="text-sm font-semibold text-zinc-300">
                Kunci API Drive belum diatur
              </p>
              <p className="text-xs text-zinc-400 mt-1.5 max-w-md mx-auto">
                Folder sudah terhubung, tetapi aplikasi belum bisa membaca isinya karena kunci API
                Google Drive belum diisi.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-zinc-300">
                Belum ada foto di folder sesi ini
              </p>
              <p className="text-xs text-zinc-400 mt-1.5 max-w-md mx-auto">
                Folder sudah terhubung namun belum berisi foto yang bisa dimuat. Pastikan foto sudah
                diunggah ke folder dan izinnya disetel ke{" "}
                <span className="text-zinc-400 font-medium">Siapa saja yang memiliki tautan</span>.
              </p>
            </>
          )}
        </div>
      ) : groupedSections.length === 0 ? (
        <EmptyState
          type={searchQuery ? "search" : activeFilter === "selected" ? "selected" : "general"}
          onReset={() => {
            setSearchQuery("");
            setActiveFilter("all");
            setActiveSectionFilter("all");
          }}
        />
      ) : (
        <div className="space-y-12">
          {groupedSections.map((group, groupIdx) => {
            const secSelectedCount = group.photos.filter((p) =>
              session.selectedPhotoIds.includes(p.id)
            ).length;

            return (
              <div
                key={group.name}
                id={`section-${groupIdx}`}
                className="space-y-4"
              >
                {/* Chapter Section Header Banner */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 font-bold text-sm shrink-0">
                      {String(groupIdx + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                          {group.name}
                        </h3>
                        {group.location && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-medium bg-amber-400/10 text-amber-400 border border-amber-400/20">
                            <MapPin className="w-3 h-3" />
                            <span>{group.location}</span>
                          </span>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-xs text-zinc-400 mt-1">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Section Photo Counter */}
                  <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-300 font-medium">
                      <span className="text-amber-400 font-bold">{secSelectedCount}</span> dari {group.photos.length} Foto Terpilih
                    </span>
                  </div>
                </div>

                {/* Photos Grid for this Section */}
                <div className="masonry-grid">
                  {group.photos.map((photo) => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      isSelected={isPhotoSelected(photo.id)}
                      hasNote={Boolean(session.revisionNotes[photo.id])}
                      isFull={isFull}
                      isLocked={session.isLocked}
                      onToggle={() => toggleSelectPhoto(photo.id)}
                      onInspect={() => setLightboxPhotoId(photo.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

interface PhotoCardProps {
  photo: PhotoMetadata;
  isSelected: boolean;
  hasNote: boolean;
  isFull: boolean;
  isLocked: boolean;
  onToggle: () => void;
  onInspect: () => void;
}

const PhotoCard: React.FC<PhotoCardProps> = ({
  photo,
  isSelected,
  hasNote,
  isFull,
  isLocked,
  onToggle,
  onInspect,
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const preloadPreview = React.useCallback(() => {
    const pre = new Image();
    pre.src = photo.previewUrl;
  }, [photo.previewUrl]);

  return (
    <div
      className={`masonry-item group relative rounded-2xl overflow-hidden bg-zinc-900/60 border select-none transition-all duration-300 ${
        isSelected
          ? "border-amber-500/80 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/40"
          : "border-zinc-800/80 hover:border-zinc-700"
      }`}
    >
      {/* Aspect ratio placeholder before image load to prevent Layout Shift (CLS < 0.05) */}
      <div
        className="relative w-full cursor-pointer overflow-hidden bg-zinc-900"
        style={{
          aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : "4 / 3",
        }}
        onClick={onInspect}
        onMouseEnter={preloadPreview}
      >
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-zinc-900 animate-pulse flex items-center justify-center text-zinc-700 text-xs font-medium">
            {photo.name}
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center p-4 text-center text-zinc-400">
            <span className="text-xs mb-1">Gagal memuat gambar</span>
            <span className="text-[10px] text-zinc-400 font-medium truncate max-w-full">
              {photo.name}
            </span>
          </div>
        ) : (
          <img
            src={photo.thumbnailUrl}
            alt={photo.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.02] ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Hover / Active Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

        {/* Quick select badge on top right */}
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            disabled={isLocked || (!isSelected && isFull)}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={isSelected ? `Hapus ${photo.name} dari seleksi` : `Pilih ${photo.name}`}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-md backdrop-blur-md ${
              isSelected
                ? "bg-amber-500 text-zinc-950 scale-105"
                : isLocked || isFull
                ? "bg-zinc-950/60 text-zinc-600 cursor-not-allowed border border-white/10"
                : "bg-zinc-950/70 text-zinc-300 hover:text-white hover:bg-zinc-900/90 border border-white/10 group-hover:scale-105"
            }`}
            title={
              isLocked
                ? "Seleksi telah dikunci"
                : !isSelected && isFull
                ? "Batas kuota tercapai"
                : isSelected
                ? "Hapus dari seleksi"
                : "Pilih foto ini"
            }
          >
            {isSelected ? (
              <Check className="w-5 h-5 stroke-[2.5]" />
            ) : isLocked || (!isSelected && isFull) ? (
              <Lock className="w-4 h-4 text-zinc-400" />
            ) : (
              <Circle className="w-4 h-4 text-zinc-400 group-hover:text-amber-400" />
            )}
          </button>
        </div>

        {/* Note indicator badge on top left */}
        {hasNote && (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/90 text-zinc-950 text-[11px] font-semibold shadow-md backdrop-blur-md">
            <MessageSquare className="w-3 h-3 fill-current" />
            <span>Ada Catatan</span>
          </div>
        )}

        {/* Bottom card info bar on hover */}
        <div className="absolute bottom-0 inset-x-0 p-3 flex items-center justify-between text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="truncate mr-2">
            <p className="text-xs font-semibold text-white truncate drop-shadow-md">
              {photo.name}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-300 drop-shadow-md">
              {photo.location ? (
                <span className="truncate flex items-center gap-1 text-amber-300">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">{photo.location}</span>
                </span>
              ) : (
                <span>{photo.width && photo.height ? `${photo.width} × ${photo.height}` : ""}</span>
              )}
              {photo.sizeBytes ? ` • ${formatBytes(photo.sizeBytes)}` : ""}
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onInspect();
            }}
            className="w-8 h-8 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition-colors shrink-0"
            title="Lihat resolusi penuh"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
