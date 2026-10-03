import React, { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ShowcaseStripItem {
  id: string;
  thumbnailUrl: string;
}

interface ShowcaseStripProps {
  items: ShowcaseStripItem[];
  onPick: () => void;
}

interface Metrics {
  containerW: number;
  cardW: number;
  step: number;
  min: number;
}

const CLICK_TOLERANCE = 8;
const GAP = 20;

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Draggable photo strip: touch and mouse dragging with momentum,
 * edge rubber-banding, snap-to-card on release, and a center-focus
 * effect (the card nearest the middle lifts slightly). Cards stay
 * plain (no captions); clicking without dragging fires onPick.
 */
export const ShowcaseStrip: React.FC<ShowcaseStripProps> = ({
  items,
  onPick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [tx, setTx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Metrics>({
    containerW: 1,
    cardW: 1,
    step: 1,
    min: 0,
  });
  const txRef = useRef(0);
  const metricsRef = useRef(metrics);
  const draggingRef = useRef(false);
  const drag = useRef({
    startX: 0,
    startTx: 0,
    moved: false,
    lastX: 0,
    lastT: 0,
    velocity: 0,
  });
  const raf = useRef(0);

  metricsRef.current = metrics;

  const measure = useCallback(() => {
    const container = containerRef.current;
    const track = trackRef.current;
    if (!container || !track) return;
    const first = track.children[0] as HTMLElement | undefined;
    const cardW = first ? first.offsetWidth : 280;
    const step = cardW + GAP;
    const min = Math.min(0, container.clientWidth - track.scrollWidth);
    const next = { containerW: container.clientWidth, cardW, step, min };
    setMetrics(next);
    txRef.current = Math.max(min, Math.min(0, txRef.current));
    setTx(txRef.current);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, items.length]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const stop = () => cancelAnimationFrame(raf.current);

  const animateTo = useCallback((target: number) => {
    stop();
    const { min } = metricsRef.current;
    const clamped = Math.max(min, Math.min(0, target));
    if (prefersReducedMotion()) {
      txRef.current = clamped;
      setTx(clamped);
      return;
    }
    const from = txRef.current;
    if (from === clamped) return;
    const start = performance.now();
    const dur = 320;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      const val = from + (clamped - from) * eased;
      txRef.current = val;
      setTx(val);
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, []);

  const snapToNearest = useCallback(() => {
    const { step } = metricsRef.current;
    animateTo(-Math.round(-txRef.current / step) * step);
  }, [animateTo]);

  const startMomentum = useCallback(
    (v0: number) => {
      stop();
      if (prefersReducedMotion()) {
        snapToNearest();
        return;
      }
      let v = v0;
      const tick = () => {
        v *= 0.94;
        const { min } = metricsRef.current;
        let next = txRef.current + v;
        if (next >= 0) {
          next = 0;
          v = 0;
        } else if (next <= min) {
          next = min;
          v = 0;
        }
        txRef.current = next;
        setTx(next);
        if (Math.abs(v) > 0.5) {
          raf.current = requestAnimationFrame(tick);
        } else {
          snapToNearest();
        }
      };
      raf.current = requestAnimationFrame(tick);
    },
    [snapToNearest]
  );

  const onWindowMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current) return;
    const { min } = metricsRef.current;
    const raw = drag.current.startTx + (e.clientX - drag.current.startX);
    if (Math.abs(e.clientX - drag.current.startX) > CLICK_TOLERANCE) {
      drag.current.moved = true;
    }
    // Rubber-band past the edges
    let next = raw;
    if (raw > 0) next = raw * 0.35;
    else if (raw < min) next = min + (raw - min) * 0.35;
    const now = performance.now();
    const dt = Math.max(1, now - drag.current.lastT);
    drag.current.velocity = (e.clientX - drag.current.lastX) / dt;
    drag.current.lastX = e.clientX;
    drag.current.lastT = now;
    txRef.current = next;
    setTx(next);
  }, []);

  const onWindowUp = useCallback(() => {
    window.removeEventListener("pointermove", onWindowMove);
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (!drag.current.moved) return;
    const fling = drag.current.velocity * 16;
    if (Math.abs(fling) > 4) startMomentum(fling);
    else snapToNearest();
  }, [onWindowMove, startMomentum, snapToNearest]);

  useEffect(
    () => () => {
      window.removeEventListener("pointermove", onWindowMove);
      window.removeEventListener("pointerup", onWindowUp);
      window.removeEventListener("pointercancel", onWindowUp);
    },
    [onWindowMove, onWindowUp]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    stop();
    setHoveredId(null);
    drag.current = {
      startX: e.clientX,
      startTx: txRef.current,
      moved: false,
      lastX: e.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
    draggingRef.current = true;
    setDragging(true);
    window.addEventListener("pointermove", onWindowMove);
    window.addEventListener("pointerup", onWindowUp, { once: true });
    window.addEventListener("pointercancel", onWindowUp, { once: true });
  };

  const stepBy = (dir: 1 | -1) => {
    animateTo(txRef.current + dir * metrics.step);
  };

  const atStart = tx >= -1;
  const atEnd = tx <= metrics.min + 1;
  const canSlide = metrics.min < 0;
  const progress = metrics.min === 0 ? 1 : -txRef.current / -metrics.min;

  return (
    <div>
      <div
        ref={containerRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Koleksi galeri: seret untuk menjelajah"
        onPointerDown={onPointerDown}
        className={`strip-mask overflow-hidden py-3 select-none ${
          dragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ touchAction: "pan-y" }}
      >
        <div
          ref={trackRef}
          className="flex gap-5 w-max py-2 px-2"
          style={{
            transform: `translate3d(${tx}px, 0, 0)`,
          }}
        >
          {items.map((photo) => {
            const isHovered = hoveredId === photo.id;
            const isSibling = hoveredId !== null && !isHovered;

            const scale = isHovered ? 1.06 : isSibling ? 0.94 : 1.0;
            const opacity = isSibling ? 0.65 : 1.0;
            const zIndex = isHovered ? 30 : 5;

            return (
              <button
                key={photo.id}
                type="button"
                onMouseEnter={() => {
                  if (!draggingRef.current) setHoveredId(photo.id);
                }}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => {
                  if (!drag.current.moved) onPick();
                }}
                aria-label="Contoh hasil kurasi: buka form kode sesi galeri"
                className={`group relative rounded-2xl overflow-hidden bg-white dark:bg-[#141417] border w-[240px] sm:w-[280px] aspect-[4/5] shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F] will-change-transform ${
                  isHovered
                    ? "border-[#FF5A1F] ring-2 ring-[#FF5A1F]/30 shadow-[0_24px_48px_-8px_rgba(0,0,0,0.28)] dark:shadow-[0_24px_48px_-8px_rgba(0,0,0,0.85)]"
                    : "border-black/[0.08] dark:border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
                }`}
                style={{
                  transform: `scale(${scale})`,
                  opacity,
                  zIndex,
                  transition: dragging
                    ? "none"
                    : "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease, box-shadow 0.35s ease, border-color 0.25s ease",
                }}
              >
                <img
                  src={photo.thumbnailUrl}
                  alt="Contoh hasil kurasi foto"
                  loading="lazy"
                  draggable={false}
                  className={`w-full h-full object-cover pointer-events-none transition-transform duration-700 ease-out ${
                    isHovered ? "scale-110" : "scale-100"
                  }`}
                />

                {/* Hover Dark Gradient Scrim */}
                <div
                  className={`absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent pointer-events-none transition-opacity duration-300 ${
                    isHovered ? "opacity-100" : "opacity-0"
                  }`}
                />

                {/* Floating Interactive CTA Pill that glides up on hover */}
                <div
                  className={`absolute inset-x-3 bottom-3 p-2.5 rounded-xl bg-white/95 dark:bg-[#1C1C22]/95 backdrop-blur-md border border-black/10 dark:border-white/10 flex items-center justify-between shadow-lg pointer-events-none transition-all duration-300 ${
                    isHovered
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                >
                  <span className="text-[11px] font-bold text-[#121212] dark:text-white">
                    Lihat Contoh Foto
                  </span>
                  <span className="w-5 h-5 rounded-full bg-[#FF5A1F] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    →
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {canSlide && (
        <div className="mt-4 flex items-center gap-3">
          <div
            className="relative h-1 flex-1 rounded-full bg-black/[0.08] dark:bg-white/[0.1] overflow-hidden"
            role="progressbar"
            aria-label="Posisi galeri"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[#FF5A1F]"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepBy(1)}
              disabled={atStart}
              aria-label="Foto sebelumnya"
              className="w-9 h-9 rounded-full bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.1] shadow-sm flex items-center justify-center text-[#121212] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors disabled:opacity-35 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => stepBy(-1)}
              disabled={atEnd}
              aria-label="Foto berikutnya"
              className="w-9 h-9 rounded-full bg-white dark:bg-[#141417] border border-black/[0.08] dark:border-white/[0.1] shadow-sm flex items-center justify-center text-[#121212] dark:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors disabled:opacity-35 disabled:pointer-events-none"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
