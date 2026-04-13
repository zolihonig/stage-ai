"use client";

import { useState, useRef, useCallback } from "react";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
  className = "",
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleMove(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    handleMove(e.clientX);
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl select-none touch-none ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ cursor: "ew-resize" }}
    >
      {/* After image — full, sits as the base layer */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="block w-full h-full object-cover"
        draggable={false}
      />

      {/* Before image — same size, same position, clipped with clip-path */}
      <img
        src={beforeSrc}
        alt={beforeLabel}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none"
        style={{ left: `${position}%`, boxShadow: "0 0 8px rgba(0,0,0,0.3)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-navy/50">
            <path d="M5 3L2 8L5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M11 3L14 8L11 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Labels */}
      {position > 12 && (
        <div className="absolute top-3 left-3 bg-navy/70 text-white text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none font-medium tracking-wide">
          {beforeLabel}
        </div>
      )}
      {position < 88 && (
        <div className="absolute top-3 right-3 bg-gold/90 text-navy text-[10px] px-2.5 py-1 rounded-lg backdrop-blur-sm pointer-events-none font-medium tracking-wide">
          {afterLabel}
        </div>
      )}
    </div>
  );
}
