"use client";

import { Check, Loader2, AlertCircle, Clock, Brain, Sparkles } from "lucide-react";

export type PhotoStatus = "pending" | "processing" | "complete" | "failed";

export interface QueueItem {
  photoId: string;
  photoName: string;
  style: string;
  status: PhotoStatus;
}

interface StagingQueueProps {
  items: QueueItem[];
}

export default function StagingQueue({ items }: StagingQueueProps) {
  const completed = items.filter((i) => i.status === "complete").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const processing = items.filter((i) => i.status === "processing").length;
  const pending = items.filter((i) => i.status === "pending").length;
  const progress = items.length > 0 ? (completed / items.length) * 100 : 0;

  // Estimate remaining time: ~20s per image (Claude + Gemini) + 8s delay
  const remaining = (processing + pending) * 28;

  return (
    <div className="bg-white rounded-2xl border border-navy/10 p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {processing > 0 && <Loader2 size={16} className="text-gold animate-spin" />}
          <h3 className="font-serif text-base sm:text-lg text-navy">
            {completed === items.length
              ? "Staging Complete"
              : processing > 0
              ? "Staging in Progress"
              : "Starting..."}
          </h3>
        </div>
        <span className="text-xs sm:text-sm text-slate">
          {completed}/{items.length}
          {failed > 0 && <span className="text-red-500 ml-1">({failed} failed)</span>}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-ivory rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status line */}
      {processing > 0 && (
        <div className="flex items-center gap-4 text-[11px] text-slate">
          <span className="flex items-center gap-1">
            <Brain size={11} className="text-navy/40" />
            Claude analyzing room...
          </span>
          <span className="flex items-center gap-1">
            <Sparkles size={11} className="text-gold/60" />
            Gemini generating...
          </span>
          {remaining > 0 && (
            <span className="flex items-center gap-1 ml-auto">
              <Clock size={11} />
              ~{remaining < 60 ? `${remaining}s` : `${Math.ceil(remaining / 60)}m`} left
            </span>
          )}
        </div>
      )}

      {/* Queue items — collapsed on mobile, expanded on desktop */}
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {items.map((item) => (
          <div
            key={`${item.photoId}-${item.style}`}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
              item.status === "processing"
                ? "bg-gold/5 border border-gold/10"
                : item.status === "complete"
                ? "bg-green-50/50"
                : item.status === "failed"
                ? "bg-red-50/50"
                : "bg-ivory-light/30"
            }`}
          >
            {item.status === "complete" && <Check size={13} className="text-green-500 shrink-0" />}
            {item.status === "processing" && <Loader2 size={13} className="text-gold animate-spin shrink-0" />}
            {item.status === "failed" && <AlertCircle size={13} className="text-red-500 shrink-0" />}
            {item.status === "pending" && <Clock size={13} className="text-slate/30 shrink-0" />}
            <span className="text-navy truncate flex-1">{item.photoName}</span>
            <span className="text-slate/60 shrink-0">{item.style}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
