"use client";

import { useState } from "react";
import { STYLES, COLOR_PREFERENCES } from "@/lib/constants";
import type { StyleId, ColorPreferenceId } from "@/lib/constants";
import { Check } from "lucide-react";

interface StyleSelectorProps {
  selected: StyleId[];
  onToggle: (styleId: StyleId) => void;
  colorPreference: ColorPreferenceId | null;
  onColorChange: (color: ColorPreferenceId | null) => void;
  max?: number;
}

export default function StyleSelector({
  selected,
  onToggle,
  colorPreference,
  onColorChange,
  max = 3,
}: StyleSelectorProps) {
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});

  return (
    <div className="space-y-6">
      {/* Style Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg text-navy">Select Style</h3>
          <span className="text-xs text-slate">
            {selected.length} selected {max > 1 ? `(up to ${max})` : ""}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {STYLES.map((style) => {
            const isSelected = selected.includes(style.id);
            const isDisabled = !isSelected && selected.length >= max;
            return (
              <button
                key={style.id}
                onClick={() => !isDisabled && onToggle(style.id)}
                disabled={isDisabled}
                className={`relative rounded-xl overflow-hidden text-left transition-all border-2 group ${
                  isSelected
                    ? "border-gold shadow-lg ring-1 ring-gold/20"
                    : isDisabled
                    ? "border-navy/5 opacity-40 cursor-not-allowed"
                    : "border-navy/10 hover:border-gold/40 hover:shadow-md cursor-pointer"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-gold rounded-full flex items-center justify-center shadow-md">
                    <Check size={14} className="text-white" />
                  </div>
                )}
                {/* Style preview image or gradient */}
                <div className="aspect-[4/3] relative overflow-hidden">
                  {previewImages[style.id] ? (
                    <img
                      src={previewImages[style.id]}
                      alt={style.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className={`w-full h-full bg-gradient-to-br ${style.gradient} flex items-center justify-center`}
                    >
                      <span className="font-serif text-navy/20 text-2xl">
                        {style.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/10 transition-colors" />
                </div>
                <div className="p-2.5">
                  <p className="font-medium text-sm text-navy leading-tight">
                    {style.name}
                  </p>
                  <p className="text-[11px] text-slate mt-0.5 leading-snug line-clamp-2">
                    {style.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Preference */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-lg text-navy">
            Color Preference{" "}
            <span className="text-xs font-sans text-slate font-normal">
              (optional)
            </span>
          </h3>
          {colorPreference && (
            <button
              onClick={() => onColorChange(null)}
              className="text-xs text-slate hover:text-navy"
            >
              Clear
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {COLOR_PREFERENCES.map((cp) => {
            const isSelected = colorPreference === cp.id;
            return (
              <button
                key={cp.id}
                onClick={() =>
                  onColorChange(isSelected ? null : cp.id)
                }
                className={`rounded-xl p-3 text-left transition-all border-2 ${
                  isSelected
                    ? "border-gold bg-gold/5 shadow-sm"
                    : "border-navy/10 hover:border-gold/30"
                }`}
              >
                <div className="flex gap-1 mb-2">
                  {cp.colors.map((color) => (
                    <div
                      key={color}
                      className="w-5 h-5 rounded-full border border-navy/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <p className="text-xs font-medium text-navy">{cp.name}</p>
                <p className="text-[10px] text-slate leading-snug mt-0.5">
                  {cp.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
