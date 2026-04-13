"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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
  const [containerWidth, setContainerWidth] = useState(0);

  // Track container width for proper image sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.offsetWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      {/* After image — full width, sits behind everything */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="block w-full h-full object-cover"
        draggable={false}
      />

      {/* Before image — absolutely positioned, full size, clipped by parent div */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        {/* The image must be full container width so it doesn't scale/move */}
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="block h-full object-cover"
          style={{
            width: containerWidth > 0 ? `${containerWidth}px` : "100vw",
            maxWidth: "none",
          }}
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none"
        style={{ left: `${position}%`, boxShadow: "0 0 6px rgba(0,0,0,0.3)" }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center pointer-events-none">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3.5 bg-navy/40 rounded-full" />
            <div className="w-0.5 h-3.5 bg-navy/40 rounded-full" />
          </div>
        </div>
      </div>

      {/* Labels */}
      {position > 10 && (
        <div className="absolute top-2.5 left-2.5 bg-navy/70 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
          {beforeLabel}
        </div>
      )}
      {position < 90 && (
        <div className="absolute top-2.5 right-2.5 bg-gold/90 text-navy text-[10px] px-2 py-0.5 rounded backdrop-blur-sm font-medium pointer-events-none">
          {afterLabel}
        </div>
      )}
    </div>
  );
}
