import React, { useEffect, useState, useCallback, useRef } from "react";
import { useProofingStore } from "@/lib/storage";
import { formatBytes } from "@/lib/utils";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  ZoomIn,
  ZoomOut,
  MessageSquare,
  Lock,
  MapPin,
} from "lucide-react";

export const LightboxModal: React.FC = () => {
  const {
    photos,
    lightboxPhotoId,
    session,
    setLightboxPhotoId,
    toggleSelectPhoto,
    isPhotoSelected,
    setRevisionNote,
  } = useProofingStore();

  const [isZoomed, setIsZoomed] = useState(false);
  const [localNote, setLocalNote] = useState("");
  const touchStartX = useRef<number | null>(null);

  const currentIndex = photos.findIndex((p) => p.id === lightboxPhotoId);
  const currentPhoto = currentIndex !== -1 ? photos[currentIndex] : null;

  // Sync current photo's note to local state
  useEffect(() => {
    if (currentPhoto) {
      setLocalNote(session.revisionNotes[currentPhoto.id] || "");
      setIsZoomed(false);
    }
  }, [currentPhoto, session.revisionNotes]);

  // Handle note change with immediate persistence
  const handleNoteChange = (text: string) => {
    setLocalNote(text);
    if (currentPhoto) {
      setRevisionNote(currentPhoto.id, text);
    }
  };

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setLightboxPhotoId(photos[currentIndex - 1].id);
    } else {
      setLightboxPhotoId(photos[photos.length - 1].id);
    }
  }, [currentIndex, photos, setLightboxPhotoId]);

  const handleNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setLightboxPhotoId(photos[currentIndex + 1].id);
    } else {
      setLightboxPhotoId(photos[0].id);
    }
  }, [currentIndex, photos, setLightboxPhotoId]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxPhotoId) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing inside the note textarea
      if (document.activeElement?.tagName === "TEXTAREA" || document.activeElement?.tagName === "INPUT") {
        if (e.key === "Escape") {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (e.key === "Escape") {
        setLightboxPhotoId(null);
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === " " && currentPhoto) {
        e.preventDefault();
        toggleSelectPhoto(currentPhoto.id);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxPhotoId, currentPhoto, handlePrev, handleNext, setLightboxPhotoId, toggleSelectPhoto]);

  // Touch gesture swipe for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchEndX - touchStartX.current;
    if (diff > 50) {
      handlePrev();
    } else if (diff < -50) {
      handleNext();
    }
    touchStartX.current = null;
  };

  if (!currentPhoto) return null;

  const isSelected = isPhotoSelected(currentPhoto.id);
  const isFull = session.selectedPhotoIds.length >= session.maxQuota;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Pratinjau foto ${currentPhoto.name}`}
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between animate-fade-in select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Bar: Filename, counter, section badge, action icons */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-zinc-800/80 bg-zinc-950/70 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="truncate">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-semibold text-zinc-100 truncate">
                {currentPhoto.name}
              </h2>
              {currentPhoto.section && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                  <MapPin className="w-2.5 h-2.5" />
                  <span>{currentPhoto.section}</span>
                  {currentPhoto.location && (
                    <span className="text-zinc-400">• {currentPhoto.location}</span>
                  )}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              {currentIndex + 1} dari {photos.length}
              {currentPhoto.width && currentPhoto.height && (
                <span className="hidden sm:inline"> • {currentPhoto.width} × {currentPhoto.height} px</span>
              )}
              {currentPhoto.sizeBytes && (
                <span className="hidden sm:inline"> • {formatBytes(currentPhoto.sizeBytes)}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Zoom toggle */}
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
            title={isZoomed ? "Perkecil (1x)" : "Perbesar (2x)"}
          >
            {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
          </button>

          {/* Quick select in lightbox */}
          <button
            disabled={session.isLocked || (!isSelected && isFull)}
            onClick={() => toggleSelectPhoto(currentPhoto.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isSelected
                ? "bg-amber-500 text-zinc-950"
                : session.isLocked || isFull
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Terpilih</span>
              </>
            ) : session.isLocked || isFull ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>Kuota Penuh</span>
              </>
            ) : (
              <>
                <Circle className="w-4 h-4 text-zinc-400" />
                <span>Pilih Foto</span>
              </>
            )}
          </button>

          {/* Close lightbox */}
          <button
            onClick={() => setLightboxPhotoId(null)}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800 transition-colors"
            title="Tutup (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="flex-1 relative flex items-center justify-center p-2 sm:p-4 overflow-hidden">
        {/* Previous Button */}
        <button
          onClick={handlePrev}
          className="absolute left-2 sm:left-4 z-20 w-11 h-11 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 flex items-center justify-center backdrop-blur-md transition-all shadow-xl hover:scale-105"
          title="Foto Sebelumnya (Panah Kiri)"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* The Image */}
        <div
          className={`relative max-w-full max-h-full flex items-center justify-center transition-transform duration-200 ${
            isZoomed ? "scale-150 cursor-grab" : "cursor-zoom-in"
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <img
            src={currentPhoto.previewUrl}
            alt={currentPhoto.name}
            className="max-h-[calc(100vh-180px)] max-w-full object-contain select-none rounded-lg shadow-2xl transition-opacity duration-150"
          />
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 flex items-center justify-center backdrop-blur-md transition-all shadow-xl hover:scale-105"
          title="Foto Berikutnya (Panah Kanan)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      {/* Bottom Control Bar & Revision Notes Editor */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md z-10">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-2 text-zinc-400 text-xs shrink-0">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <span className="font-medium text-zinc-200">Instruksi Revisi / Retouch:</span>
          </div>

          <div className="flex-1">
            <input
              type="text"
              value={localNote}
              onChange={(e) => handleNoteChange(e.target.value)}
              placeholder="Contoh: Tolong hilangkan orang di background, ratakan warna kulit..."
              className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 transition-all"
            />
          </div>

          {localNote && (
            <span className="text-[11px] text-amber-400/90 font-medium shrink-0 self-end sm:self-center">
              ✓ Tersimpan
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
