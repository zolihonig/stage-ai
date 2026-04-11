"use client";

import { Check, Loader2, AlertCircle, Clock } from "lucide-react";

export type PhotoStatus = "pending" | "processing" | "complete" | "failed";

export interface QueueItem {
  photoId: string;
  photoName: string;
  style: string;
  status: PhotoStatus;
  progress?: number;
}

interface StagingQueueProps {
  items: QueueItem[];
  totalTime?: number;
}

export default function StagingQueue({ items, totalTime }: StagingQueueProps) {
  const completed = items.filter((i) => i.status === "complete").length;
  const failed = items.filter((i) => i.status === "failed").length;
  const processing = items.filter((i) => i.status === "processing").length;
  const progress = items.length > 0 ? (completed / items.length) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl border border-navy/10 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg text-navy">Staging Progress</h3>
        <span className="text-sm text-slate">
          {completed}/{items.length} complete
          {failed > 0 && (
            <span className="text-red-500 ml-1">({failed} failed)</span>
          )}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-ivory rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold to-gold-light rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {totalTime && processing > 0 && (
        <p className="text-xs text-slate flex items-center gap-1">
          <Clock size={12} />
          Estimated time remaining: ~{Math.ceil(totalTime / 60)} min
        </p>
      )}

      {/* Queue items */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.map((item) => (
          <div
            key={`${item.photoId}-${item.style}`}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-ivory-light/50"
          >
            {item.status === "complete" && (
              <Check size={16} className="text-green-500 shrink-0" />
            )}
            {item.status === "processing" && (
              <Loader2 size={16} className="text-gold animate-spin shrink-0" />
            )}
            {item.status === "failed" && (
              <AlertCircle size={16} className="text-red-500 shrink-0" />
            )}
            {item.status === "pending" && (
              <Clock size={16} className="text-slate/40 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-navy truncate">{item.photoName}</p>
              <p className="text-[11px] text-slate">{item.style}</p>
            </div>
            {item.status === "processing" && (
              <div className="w-16 h-1.5 bg-navy/10 rounded-full overflow-hidden">
                <div className="h-full bg-gold rounded-full animate-pulse w-2/3" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
