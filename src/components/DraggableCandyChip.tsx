import React, { useState, useRef, useCallback } from "react";

interface DraggableCandyChipProps {
  text: string;
  colorClass: string;
  wrapperClassName: string;
  textColor?: string;
}

export const DraggableCandyChip: React.FC<DraggableCandyChipProps> = ({
  text,
  colorClass,
  wrapperClassName,
  textColor,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const startRef = useRef({ pointerX: 0, pointerY: 0, startOffsetX: 0, startOffsetY: 0 });

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
    // Only accept primary button (left click) or touch
    if (e.button !== 0) return;

    setIsDragging(true);
    startRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
    };

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if setPointerCapture is unsupported
    }
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - startRef.current.pointerX;
    const deltaY = e.clientY - startRef.current.pointerY;

    setOffset({
      x: startRef.current.startOffsetX + deltaX,
      y: startRef.current.startOffsetY + deltaY,
    });
  }, [isDragging]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLSpanElement>) => {
    if (!isDragging) return;

    setIsDragging(false);
    // Smooth elastic spring back to original position (0, 0)
    setOffset({ x: 0, y: 0 });

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }
  }, [isDragging]);

  // Tilt dynamically based on horizontal drag distance, clamped to +/-14 degrees
  const tilt = isDragging ? Math.max(-14, Math.min(14, offset.x * 0.08)) : 0;

  return (
    <div
      className={wrapperClassName}
      style={{
        animationPlayState: isDragging ? "paused" : "running",
        zIndex: isDragging ? 50 : 20,
      }}
    >
      <span
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`badge-3d ${colorClass} ${textColor || ""} px-3.5 py-1.5 text-[11px] sm:text-xs select-none touch-none transition-shadow ${
          isDragging ? "!cursor-grabbing" : "cursor-grab"
        }`}
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) rotate(${tilt}deg) scale(${
            isDragging ? 1.08 : 1
          })`,
          transition: isDragging
            ? "none"
            : "transform 0.65s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease",
          boxShadow: isDragging
            ? "0 10px 0 rgba(0, 0, 0, 0.28), 0 20px 32px -2px rgba(0, 0, 0, 0.35)"
            : undefined,
        }}
        title="Tarik chip ini ke mana saja, lalu lepas untuk kembali memantul!"
      >
        &ldquo;{text}&rdquo;
      </span>
    </div>
  );
};
