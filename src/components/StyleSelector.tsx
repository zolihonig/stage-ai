"use client";

import { STYLES } from "@/lib/constants";
import type { StyleId } from "@/lib/constants";
import { Check } from "lucide-react";

interface StyleSelectorProps {
  selected: StyleId[];
  onToggle: (styleId: StyleId) => void;
  max?: number;
}

export default function StyleSelector({
  selected,
  onToggle,
  max = 3,
}: StyleSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-navy">Select Style</h3>
        <span className="text-xs text-slate">
          {selected.length}/{max} selected
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {STYLES.map((style) => {
          const isSelected = selected.includes(style.id);
          const isDisabled = !isSelected && selected.length >= max;
          return (
            <button
              key={style.id}
              onClick={() => !isDisabled && onToggle(style.id)}
              disabled={isDisabled}
              className={`relative rounded-xl p-3 text-left transition-all border-2 ${
                isSelected
                  ? "border-gold bg-gold/5 shadow-md"
                  : isDisabled
                  ? "border-navy/5 bg-navy/[0.02] opacity-50 cursor-not-allowed"
                  : "border-navy/10 hover:border-gold/30 hover:shadow-sm cursor-pointer"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-gold rounded-full flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
              <div
                className={`w-full h-12 rounded-lg bg-gradient-to-br ${style.gradient} mb-2`}
              />
              <p className="font-medium text-sm text-navy leading-tight">
                {style.name}
              </p>
              <p className="text-[11px] text-slate mt-0.5 leading-snug">
                {style.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
