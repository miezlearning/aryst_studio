import React, { useMemo } from "react";
import { useProofingStore } from "@/lib/storage";
import { PhotoMetadata } from "@/types";
import { EmptyState } from "./EmptyState";
import { formatBytes } from "@/lib/utils";
import {
  Check,
  Maximize2,
  MessageSquare,
  Search,
  Lock,
  MapPin,
  Layers,
  ArrowUpDown,
  Plus,
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
    gallerySortOrder,
    clientProjects,
    activeProjectId,
    setActiveFilter,
    activeSectionFilter,
    setActiveSectionFilter,
    setSearchQuery,
    setGallerySortOrder,
    toggleSelectPhoto,
    setLightboxPhotoId,
    loadPhotos,
    isAdminAuthenticated,
    setViewMode,
  } = useProofingStore();

  const selectedCount = session.selectedPhotoIds.length;
  const isFull = selectedCount >= session.maxQuota;

  const currentProject = clientProjects.find((p) => p.id === activeProjectId);

  // Per-chapter stats (total vs selected) to guide client progression
  const sectionStats = useMemo(() => {
    const stats: Record<string, { total: number; selected: number }> = {};
    photos.forEach((p) => {
      const secName = p.section || "Galeri Utama";
      if (!stats[secName]) stats[secName] = { total: 0, selected: 0 };
      stats[secName].total++;
      if (session.selectedPhotoIds.includes(p.id)) {
        stats[secName].selected++;
      }
    });
    return stats;
  }, [photos, session.selectedPhotoIds]);

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
        <div className="inline-block w-8 h-8 border-2 border-[#FF5A1F] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-zinc-400">Memuat foto galeri...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">
          <h3 className="text-base font-semibold text-rose-700 mb-2">Gagal Memuat Galeri</h3>
          <p className="text-xs text-rose-600 mb-4">{error}</p>
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
        <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-[#141417] rounded-full border border-black/[0.08] dark:border-white/[0.1] shadow-sm overflow-x-auto text-xs font-semibold transition-colors">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeFilter === "all"
                ? "bg-[#121212] dark:bg-white text-white dark:text-[#09090B] shadow-sm font-bold"
                : "text-[#71717A] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white"
            }`}
          >
            Semua ({photos.length})
          </button>
          <button
            onClick={() => setActiveFilter("selected")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${
              activeFilter === "selected"
                ? "bg-[#FF5A1F] text-white shadow-sm font-bold"
                : "text-[#71717A] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white"
            }`}
          >
            <span>Terpilih</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeFilter === "selected"
                  ? "bg-white/20 text-white"
                  : "bg-black/[0.05] dark:bg-white/[0.08] text-[#52525B] dark:text-[#A1A1AA]"
              }`}
            >
              {selectedCount}/{session.maxQuota}
            </span>
          </button>
          <button
            onClick={() => setActiveFilter("unselected")}
            className={`px-4 py-1.5 rounded-full transition-all ${
              activeFilter === "unselected"
                ? "bg-[#121212] dark:bg-white text-white dark:text-[#09090B] shadow-sm font-bold"
                : "text-[#71717A] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white"
            }`}
          >
            Belum Dipilih ({Math.max(0, photos.length - selectedCount)})
          </button>
        </div>

        {/* Sort & Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <ArrowUpDown className="w-3.5 h-3.5 text-[#FF5A1F] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={gallerySortOrder}
              onChange={(e) => setGallerySortOrder(e.target.value as "name" | "date")}
              aria-label="Urutan foto"
              className="appearance-none pl-9 pr-8 py-2 bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.1] shadow-sm rounded-full text-xs font-semibold text-[#121212] dark:text-[#F4F4F6] focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-all cursor-pointer"
            >
              <option value="name">Nomor nama file</option>
              <option value="date">Tanggal upload</option>
            </select>
          </div>

          <div className="relative min-w-[200px] md:w-64">
            <Search className="w-4 h-4 text-[#71717A] dark:text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nomor, nama, lokasi..."
              className="w-full pl-10 pr-8 py-2 bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.1] shadow-sm rounded-full text-xs font-medium text-[#121212] dark:text-[#F4F4F6] placeholder-[#A1A1AA] dark:placeholder-zinc-500 focus:outline-none focus:border-black/30 dark:focus:border-white/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#71717A] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Storyline Chapter Floating Island Bar (Isolated component to prevent whole gallery re-renders) */}
      <StorylineChapterBar
        sectionsList={sectionsList}
        sectionStats={sectionStats}
        photosCount={photos.length}
      />

      {/* Storyline Grouped Sections Grid */}
      {photos.length === 0 && !searchQuery && activeFilter === "all" ? (
        <div className="mtioon-card p-8 sm:p-12 text-center max-w-lg mx-auto">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#FFF0EB] dark:bg-[#FF5A1F]/15 border border-[#FF5A1F]/20 dark:border-[#FF5A1F]/30 text-[#FF5A1F] mb-4">
            <Layers className="w-6 h-6" />
          </div>
          {isAdminAuthenticated ? (
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-[#121212] dark:text-white mb-1.5">
                {!config.folderId
                  ? "Sesi Ini Belum Memiliki Folder Google Drive"
                  : !config.apiKey
                    ? "Kunci API Google Drive Belum Diisi"
                    : "Folder Drive Terhubung Tapi Belum Berisi Foto"}
              </h3>
              <p className="text-xs text-[#71717A] dark:text-zinc-400 max-w-md mx-auto leading-relaxed mb-5">
                {!config.folderId
                  ? "Hubungkan tautan folder Google Drive publik pada pengaturan sesi di Dashboard Admin agar galeri foto ini dapat diakses oleh klien."
                  : !config.apiKey
                    ? "Kunci API Google Drive diperlukan untuk memuat foto dari cloud. Masukkan kunci API di menu Pengaturan Studio."
                    : "Pastikan foto telah diunggah ke folder Google Drive dan izin akses folder disetel ke 'Anyone with the link can view'."}
              </p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setViewMode("admin")}
                  className="btn-mtioon-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Buka Dashboard Admin</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-[#121212] dark:text-white mb-1.5">
                Koleksi Foto Sedang Dipersiapkan
              </h3>
              <p className="text-xs text-[#71717A] dark:text-zinc-400 max-w-md mx-auto leading-relaxed mb-5">
                Foto sesi Anda saat ini sedang dalam proses kurasi dan pengunggahan oleh studio. Silakan periksa kembali dalam beberapa saat atau hubungi kami jika Anda memiliki pertanyaan.
              </p>
              {config.clientContact && (
                <a
                  href={`https://wa.me/${config.clientContact.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                    `Halo, saya ingin menanyakan progres kurasi foto untuk sesi "${config.clientName || config.projectId}".`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-mtioon-primary px-4 py-2 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Hubungi Studio di WhatsApp</span>
                </a>
              )}
            </div>
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
                <div className="mtioon-card p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] flex items-center justify-center text-[#121212] dark:text-white font-display font-black text-sm shrink-0">
                      {String(groupIdx + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display font-[900] text-base sm:text-lg text-[#121212] dark:text-white tracking-tight">
                          {group.name}
                        </h3>
                        {group.location && (
                          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-semibold bg-[#FF5A1F]/10 text-[#FF5A1F] border border-[#FF5A1F]/20">
                            <MapPin className="w-3 h-3" />
                            <span>{group.location}</span>
                          </span>
                        )}
                      </div>
                      {group.description && (
                        <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] mt-1 font-normal">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Section Photo Counter */}
                  <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-semibold">
                    <span className="px-3 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-[#52525B] dark:text-[#A1A1AA]">
                      <span className="text-[#FF5A1F] font-bold">{secSelectedCount}</span> dari {group.photos.length} Terpilih
                    </span>
                  </div>
                </div>

                {/* Photos Grid for this Section */}
                <div className="masonry-grid">
                  {group.photos.map((photo) => {
                    const selectionIndex = session.selectedPhotoIds.indexOf(photo.id);
                    const selectionOrder = selectionIndex >= 0 ? selectionIndex + 1 : undefined;
                    const noteText = session.revisionNotes[photo.id];
                    return (
                      <PhotoCard
                        key={photo.id}
                        photo={photo}
                        isSelected={selectionIndex >= 0}
                        selectionOrder={selectionOrder}
                        hasNote={Boolean(noteText)}
                        noteText={noteText}
                        isFull={isFull}
                        isLocked={session.isLocked}
                        onToggle={() => toggleSelectPhoto(photo.id)}
                        onInspect={() => setLightboxPhotoId(photo.id)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

interface StorylineChapterBarProps {
  sectionsList: { id: string; name: string; location?: string; description?: string }[];
  sectionStats: Record<string, { total: number; selected: number }>;
  photosCount: number;
}

const StorylineChapterBar: React.FC<StorylineChapterBarProps> = ({
  sectionsList,
  sectionStats,
  photosCount,
}) => {
  const isSidebarActive = useProofingStore((s) => s.isSidebarActive);
  const activeSectionFilter = useProofingStore((s) => s.activeSectionFilter);
  const setActiveSectionFilter = useProofingStore((s) => s.setActiveSectionFilter);

  if (sectionsList.length === 0) return null;

  return (
    <div
      className={`sticky top-20 z-20 mb-8 p-1.5 bg-white/90 dark:bg-[#141417]/90 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.1] shadow-[0_8px_30px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.5)] rounded-full flex items-center gap-1.5 overflow-x-auto transition-all duration-300 ${
        isSidebarActive ? "lg:hidden" : ""
      }`}
    >
      <div className="flex items-center gap-1.5 px-3.5 py-1 text-[#71717A] dark:text-[#A1A1AA] font-bold text-[11px] shrink-0 uppercase tracking-wider">
        <Layers className="w-3.5 h-3.5 text-[#FF5A1F]" />
        <span>Bab:</span>
      </div>

      <button
        onClick={() => setActiveSectionFilter("all")}
        className={`px-4 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all shrink-0 flex items-center gap-1.5 ${
          activeSectionFilter === "all"
            ? "bg-[#121212] dark:bg-white text-white dark:text-[#09090B] shadow-sm"
            : "text-[#52525B] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        }`}
      >
        <span>Semua Bab</span>
        <span
          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
            activeSectionFilter === "all"
              ? "bg-white/20 dark:bg-black/15 text-white dark:text-[#09090B]"
              : "bg-black/[0.05] dark:bg-white/[0.08] text-[#71717A] dark:text-[#A1A1AA]"
          }`}
        >
          {photosCount}
        </span>
      </button>

      {sectionsList.map((sec) => {
        const stats = sectionStats[sec.name] || { total: 0, selected: 0 };
        const isCurrent = activeSectionFilter === sec.name;
        return (
          <button
            key={sec.id}
            onClick={() => setActiveSectionFilter(sec.name)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all shrink-0 ${
              isCurrent
                ? "bg-[#FF5A1F] text-white shadow-sm"
                : "text-[#52525B] dark:text-[#A1A1AA] hover:text-[#121212] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08]"
            }`}
          >
            <MapPin className={`w-3 h-3 ${isCurrent ? "text-white" : "text-[#FF5A1F]"}`} />
            <span>{sec.name}</span>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                isCurrent
                  ? "bg-white/20 text-white"
                  : stats.selected > 0
                  ? "bg-[#FF5A1F]/15 text-[#FF5A1F]"
                  : "bg-black/[0.05] text-[#71717A]"
              }`}
            >
              {stats.selected}/{stats.total}
            </span>
          </button>
        );
      })}
    </div>
  );
};

interface PhotoCardProps {
  photo: PhotoMetadata;
  isSelected: boolean;
  selectionOrder?: number;
  hasNote: boolean;
  noteText?: string;
  isFull: boolean;
  isLocked: boolean;
  onToggle: () => void;
  onInspect: () => void;
}

const PhotoCard = React.memo<PhotoCardProps>(({
  photo,
  isSelected,
  selectionOrder,
  hasNote,
  noteText,
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
      className={`masonry-item group relative rounded-[26px] overflow-hidden bg-white dark:bg-[#141417] border select-none transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.03)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.09)] dark:hover:shadow-[0_16px_36px_-6px_rgba(0,0,0,0.7)] ${
        isSelected
          ? "border-[#FF5A1F] ring-2 ring-[#FF5A1F]/30 shadow-[0_8px_24px_rgba(255,90,31,0.18)]"
          : "border-black/[0.08] dark:border-white/[0.08] hover:border-black/20 dark:hover:border-white/20"
      }`}
    >
      {/* Aspect ratio placeholder before image load to prevent Layout Shift */}
      <div
        className="relative w-full cursor-pointer overflow-hidden bg-black/[0.03] dark:bg-white/[0.04]"
        style={{
          aspectRatio: photo.width && photo.height ? `${photo.width} / ${photo.height}` : "4 / 3",
        }}
        onClick={onInspect}
        onMouseEnter={preloadPreview}
      >
        {!isLoaded && !hasError && (
          <div className="absolute inset-0 bg-black/[0.04] dark:bg-white/[0.06] animate-pulse flex items-center justify-center text-[#A1A1AA] dark:text-zinc-500 text-xs font-medium">
            {photo.name}
          </div>
        )}

        {hasError ? (
          <div className="absolute inset-0 bg-black/[0.03] dark:bg-white/[0.04] flex flex-col items-center justify-center p-4 text-center text-[#71717A] dark:text-[#A1A1AA]">
            <span className="text-xs mb-1">Gagal memuat gambar</span>
            <span className="text-[10px] text-[#A1A1AA] truncate max-w-full font-medium">
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
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.03] ${
              isLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
        )}

        {/* Hover Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

        {/* Top-Right Tactile 3D Action Pill */}
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            disabled={isLocked || (!isSelected && isFull)}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            aria-label={isSelected ? `Hapus ${photo.name} dari seleksi` : `Pilih ${photo.name}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all select-none ${
              isSelected
                ? "btn-mtioon-primary text-white scale-100 shadow-[0_4px_0_#C2410C,0_8px_20px_rgba(255,90,31,0.35)]"
                : isLocked || isFull
                ? "bg-black/60 text-white/70 backdrop-blur-md cursor-not-allowed text-[11px]"
                : "bg-white/95 dark:bg-[#1C1C22]/95 hover:bg-white dark:hover:bg-[#25252E] text-[#121212] dark:text-white border border-black/[0.08] dark:border-white/[0.1] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:scale-105 active:scale-95"
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
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Terpilih #{String(selectionOrder).padStart(2, "0")}</span>
              </>
            ) : isLocked || (!isSelected && isFull) ? (
              <>
                <Lock className="w-3 h-3 text-[#FF5A1F]" />
                <span>Penuh</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 text-[#FF5A1F]" />
                <span className="hidden sm:inline">Pilih Foto</span>
                <span className="sm:hidden">Pilih</span>
              </>
            )}
          </button>
        </div>

        {/* Top-Left Note Badge / Direct Trigger */}
        <div className="absolute top-3 left-3 z-10">
          {hasNote ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF0EB] border border-[#FF5A1F]/30 text-[#FF5A1F] text-[11px] font-bold shadow-sm backdrop-blur-md hover:bg-[#FFE5DC] transition-colors"
              title={`Catatan: ${noteText}. Klik untuk periksa atau edit.`}
            >
              <MessageSquare className="w-3 h-3 fill-current shrink-0" />
              <span className="max-w-[110px] truncate">{noteText}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect();
              }}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 hover:bg-black/80 text-white text-[10px] font-bold shadow-sm backdrop-blur-md transition-all"
              title="Tambah instruksi retouching untuk foto ini"
            >
              <MessageSquare className="w-3 h-3" />
              <span className="hidden sm:inline">Catatan</span>
            </button>
          )}
        </div>

        {/* Bottom card info bar on hover */}
        <div className="absolute bottom-0 inset-x-0 p-3.5 flex items-center justify-between text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="truncate mr-2">
            <p className="text-xs font-bold text-white truncate drop-shadow-md">
              {photo.name}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-200 drop-shadow-md">
              {photo.location ? (
                <span className="truncate flex items-center gap-1 text-[#FF5A1F]">
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
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white text-white hover:text-[#121212] flex items-center justify-center backdrop-blur-md border border-white/20 transition-all shrink-0"
            title="Lihat resolusi penuh"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
});
PhotoCard.displayName = "PhotoCard";
