import React, { useEffect, useState, useCallback, useRef } from "react";
import { useProofingStore } from "@/lib/storage";
import { formatBytes } from "@/lib/utils";
import { getDriveImageFallbackUrl } from "@/lib/googleDrive";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Circle,
  ZoomIn,
  ZoomOut,
  Minimize2,
  MessageSquare,
  Lock,
  MapPin,
  Loader2,
  ImageOff,
} from "lucide-react";

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const CLICK_ZOOM = 3;

interface View {
  scale: number;
  tx: number;
  ty: number;
}

interface Gesture {
  kind: "none" | "drag" | "pinch";
  startX: number;
  startY: number;
  startView: View;
  startDist: number;
  startMidX: number;
  startMidY: number;
}

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

  const [view, setView] = useState<View>({ scale: 1, tx: 0, ty: 0 });
  const [smooth, setSmooth] = useState(false);
  const [localNote, setLocalNote] = useState("");
  const touchStartX = useRef<number | null>(null);

  const [imgSrc, setImgSrc] = useState("");
  const [imgStatus, setImgStatus] = useState<"loading" | "loaded" | "error">("loading");

  const currentIndex = photos.findIndex((p) => p.id === lightboxPhotoId);
  const currentPhoto = currentIndex !== -1 ? photos[currentIndex] : null;

  const viewRef = useRef<View>(view);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const movedRef = useRef(false);
  const gestureRef = useRef<Gesture>({
    kind: "none",
    startX: 0,
    startY: 0,
    startView: { scale: 1, tx: 0, ty: 0 },
    startDist: 0,
    startMidX: 0,
    startMidY: 0,
  });

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  // Note + loading + zoom all reset only when the photo changes
  useEffect(() => {
    if (!currentPhoto) return;
    setLocalNote(session.revisionNotes[currentPhoto.id] || "");
    setSmooth(false);
    setView({ scale: 1, tx: 0, ty: 0 });
    setImgSrc(currentPhoto.previewUrl);
    setImgStatus("loading");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhoto?.id]);

  // Preload neighbours so prev/next feels instant
  useEffect(() => {
    if (currentIndex === -1) return;
    [currentIndex - 1, currentIndex + 1].forEach((i) => {
      const neighbour = photos[(i + photos.length) % photos.length];
      if (neighbour && neighbour.id !== lightboxPhotoId) {
        const pre = new Image();
        pre.src = neighbour.previewUrl;
      }
    });
  }, [currentIndex, photos, lightboxPhotoId]);

  const clampView = useCallback((v: View): View => {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale));
    const stage = stageRef.current;
    const img = imageRef.current;
    let tx = v.tx;
    let ty = v.ty;
    if (stage && img) {
      const maxX = Math.abs(stage.clientWidth - img.clientWidth * scale) / 2;
      const maxY = Math.abs(stage.clientHeight - img.clientHeight * scale) / 2;
      tx = Math.min(maxX, Math.max(-maxX, tx));
      ty = Math.min(maxY, Math.max(-maxY, ty));
    }
    return { scale, tx, ty };
  }, []);

  const zoomAround = useCallback(
    (factor: number, px = 0, py = 0, animate = false) => {
      setSmooth(animate);
      setView((v) => {
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
        const k = scale / (v.scale || 1);
        return clampView({
          scale,
          tx: px * (1 - k) + v.tx * k,
          ty: py * (1 - k) + v.ty * k,
        });
      });
    },
    [clampView]
  );

  const resetView = useCallback(() => {
    setSmooth(true);
    setView({ scale: 1, tx: 0, ty: 0 });
  }, []);

  // Wheel zoom (non-passive so the page behind never scrolls)
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !lightboxPhotoId) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = stage.getBoundingClientRect();
      const px = e.clientX - rect.left - rect.width / 2;
      const py = e.clientY - rect.top - rect.height / 2;
      zoomAround(e.deltaY < 0 ? 1.15 : 1 / 1.15, px, py, false);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [lightboxPhotoId, zoomAround]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const pointers = pointersRef.current;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    movedRef.current = false;
    setSmooth(false);

    const img = imageRef.current;
    const onImage = !!img && (e.target === img || img.contains(e.target as Node));
    const base: Gesture = {
      kind: "none",
      startX: e.clientX,
      startY: e.clientY,
      startView: { ...viewRef.current },
      startDist: 0,
      startMidX: 0,
      startMidY: 0,
    };

    if (pointers.size === 2) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      gestureRef.current = {
        ...base,
        kind: "pinch",
        startDist: dist || 1,
        startMidX: (pts[0].x + pts[1].x) / 2,
        startMidY: (pts[0].y + pts[1].y) / 2,
      };
      movedRef.current = true;
      try {
        img?.setPointerCapture(e.pointerId);
      } catch {
        // synthetic pointers (tests) cannot be captured
      }
    } else if (onImage) {
      gestureRef.current = { ...base, kind: "drag" };
      try {
        img?.setPointerCapture(e.pointerId);
      } catch {
        // synthetic pointers (tests) cannot be captured
      }
    } else {
      gestureRef.current = base;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pointers = pointersRef.current;
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current;

    if (g.kind === "drag") {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) movedRef.current = true;
      setView(clampView({ ...g.startView, tx: g.startView.tx + dx, ty: g.startView.ty + dy }));
    } else if (g.kind === "pinch" && pointers.size >= 2) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      movedRef.current = true;

      const stage = stageRef.current;
      const cx = stage ? stage.getBoundingClientRect().left + stage.clientWidth / 2 : 0;
      const cy = stage ? stage.getBoundingClientRect().top + stage.clientHeight / 2 : 0;
      const scale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, g.startView.scale * (dist / (g.startDist || 1)))
      );
      const k = scale / (g.startView.scale || 1);
      setView(
        clampView({
          scale,
          tx: midX - cx - k * (g.startMidX - cx - g.startView.tx),
          ty: midY - cy - k * (g.startMidY - cy - g.startView.ty),
        })
      );
    } else {
      if (Math.abs(e.clientX - g.startX) > 5 || Math.abs(e.clientY - g.startY) > 5) {
        movedRef.current = true;
      }
    }
  };

  const handlePointerEnd = (e: React.PointerEvent) => {
    const pointers = pointersRef.current;
    pointers.delete(e.pointerId);
    const g = gestureRef.current;

    if (g.kind === "pinch" && pointers.size === 1) {
      const [pt] = [...pointers.values()];
      gestureRef.current = {
        kind: "drag",
        startX: pt.x,
        startY: pt.y,
        startView: { ...viewRef.current },
        startDist: 0,
        startMidX: 0,
        startMidY: 0,
      };
      setSmooth(false);
    } else if (g.kind !== "none" && pointers.size === 0) {
      gestureRef.current = { ...g, kind: "none" };
      setSmooth(true);
    }
  };

  const handleStageClick = (e: React.MouseEvent) => {
    if (movedRef.current) {
      movedRef.current = false;
      return;
    }
    const target = e.target as HTMLElement;
    if (target === e.currentTarget) {
      setLightboxPhotoId(null);
      return;
    }
    const img = imageRef.current;
    if (!img || (target !== img && !img.contains(target))) return;
    if (imgStatus !== "loaded") return;

    if (viewRef.current.scale > 1.01) {
      resetView();
    } else {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return;
      zoomAround(
        CLICK_ZOOM,
        e.clientX - rect.left - rect.width / 2,
        e.clientY - rect.top - rect.height / 2,
        true
      );
    }
  };

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
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomAround(1.25, 0, 0, true);
      } else if (e.key === "-") {
        e.preventDefault();
        zoomAround(1 / 1.25, 0, 0, true);
      } else if (e.key === "0") {
        e.preventDefault();
        resetView();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxPhotoId, currentPhoto, handlePrev, handleNext, setLightboxPhotoId, toggleSelectPhoto, zoomAround, resetView]);

  // Touch gesture swipe for mobile (only at fit zoom, one finger)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (viewRef.current.scale > 1.01 || e.touches.length !== 1) {
      touchStartX.current = null;
      return;
    }
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
  const isZoomed = view.scale > 1.01;
  const zoomPercent = Math.round(view.scale * 100);

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
          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 rounded-xl bg-zinc-900 border border-zinc-800 p-1">
            <button
              onClick={() => zoomAround(1 / 1.25, 0, 0, true)}
              disabled={!isZoomed}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 transition-colors disabled:opacity-35 disabled:hover:bg-transparent"
              title="Perkecil (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="min-w-[2.75rem] text-center text-[11px] font-semibold text-zinc-300 tabular-nums">
              {zoomPercent}%
            </span>
            <button
              onClick={() => zoomAround(1.25, 0, 0, true)}
              disabled={view.scale >= MAX_SCALE}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 transition-colors disabled:opacity-35 disabled:hover:bg-transparent"
              title="Perbesar (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            {isZoomed && (
              <button
                onClick={resetView}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-amber-400 transition-colors"
                title="Kembali ke ukuran asli (0)"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick select in lightbox */}
          <button
            disabled={session.isLocked || (!isSelected && isFull)}
            onClick={() => toggleSelectPhoto(currentPhoto.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              isSelected
                ? "bg-amber-500 text-zinc-950"
                : session.isLocked || isFull
                ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
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
      <div
        ref={stageRef}
        data-testid="lb-stage"
        className="flex-1 relative flex items-center justify-center p-2 sm:p-4 overflow-hidden"
        style={{ touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={handleStageClick}
      >
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
          ref={imageRef}
          data-testid="lb-image"
          className={`relative max-w-full max-h-full flex items-center justify-center ${
            isZoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"
          }`}
          style={{
            transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
            transition: smooth ? "transform 200ms ease" : undefined,
            willChange: "transform",
          }}
        >
          {imgStatus === "error" ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <ImageOff className="w-8 h-8 text-zinc-500" />
              <p className="text-sm text-zinc-300">Foto gagal dimuat</p>
              <p className="text-xs text-zinc-400 truncate max-w-xs">{currentPhoto.name}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setImgSrc(currentPhoto.previewUrl);
                  setImgStatus("loading");
                }}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
              >
                Coba Lagi
              </button>
            </div>
          ) : (
            <img
              src={imgSrc || currentPhoto.previewUrl}
              alt={currentPhoto.name}
              decoding="async"
              onLoad={() => setImgStatus("loaded")}
              onError={() => {
                // Drive previews fail occasionally: retry once via thumbnail endpoint
                const canFallback = imgSrc.includes("lh3.googleusercontent.com");
                const fallback = getDriveImageFallbackUrl(currentPhoto.id, 1600);
                if (canFallback && fallback !== imgSrc) {
                  setImgSrc(fallback);
                  setImgStatus("loading");
                } else {
                  setImgStatus("error");
                }
              }}
              className={`max-h-[calc(100vh-180px)] max-w-full object-contain select-none rounded-lg shadow-2xl transition-opacity duration-300 ${
                imgStatus === "loaded" ? "opacity-100" : "opacity-0"
              }`}
            />
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          className="absolute right-2 sm:right-4 z-20 w-11 h-11 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 flex items-center justify-center backdrop-blur-md transition-all shadow-xl hover:scale-105"
          title="Foto Berikutnya (Panah Kanan)"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Loading layer: ambient blurred thumbnail + spinner, sized by the stage */}
        {imgStatus === "loading" && (
          <>
            <div className="absolute inset-0 z-10" aria-hidden="true" />
            {currentPhoto.thumbnailUrl && (
              <img
                src={currentPhoto.thumbnailUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-3xl opacity-25 scale-110 pointer-events-none select-none"
              />
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              <span className="text-xs text-zinc-400 whitespace-nowrap">Memuat foto...</span>
            </div>
          </>
        )}
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
              className="w-full px-3.5 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-400 focus:outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 transition-all"
            />
          </div>

          {localNote && (
            <span className="text-[11px] text-amber-400/90 font-medium shrink-0 self-end sm:self-center">
              ✓ Tersimpan
            </span>
          )}
        </div>

        <p className="mt-2 text-center text-[11px] text-zinc-500">
          Klik foto untuk perbesar, geser untuk menggeser, klik area gelap untuk menutup
        </p>
      </div>
    </div>
  );
};
