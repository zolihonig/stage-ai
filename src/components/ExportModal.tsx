"use client";

import { useState } from "react";
import { X, Download, Check } from "lucide-react";
import { EXPORT_FORMATS } from "@/lib/constants";
import type { ExportFormat } from "@/lib/constants";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  photoCount: number;
  onExport: (formats: ExportFormat[], watermark: boolean, quality: number) => void;
  exporting?: boolean;
}

export default function ExportModal({
  isOpen,
  onClose,
  photoCount,
  onExport,
  exporting = false,
}: ExportModalProps) {
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>([
    "mls_standard",
  ]);
  const [watermark, setWatermark] = useState(true);
  const [quality, setQuality] = useState(90);

  if (!isOpen) return null;

  const toggleFormat = (id: ExportFormat) => {
    setSelectedFormats((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl text-navy">Export Photos</h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-ivory rounded-lg transition-colors"
            >
              <X size={18} className="text-slate" />
            </button>
          </div>

          <p className="text-sm text-slate">
            {photoCount} staged photo{photoCount !== 1 ? "s" : ""} ready to
            export
          </p>

          {/* Format selection */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-navy">Format</h3>
            <div className="space-y-1.5">
              {EXPORT_FORMATS.map((format) => {
                const isSelected = selectedFormats.includes(format.id);
                return (
                  <button
                    key={format.id}
                    onClick={() => toggleFormat(format.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border ${
                      isSelected
                        ? "border-gold bg-gold/5"
                        : "border-navy/10 hover:border-gold/30"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-gold border-gold"
                          : "border-navy/20"
                      }`}
                    >
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-navy">
                        {format.name}
                      </p>
                      <p className="text-[11px] text-slate">
                        {format.ratio === "original"
                          ? "Match input resolution"
                          : `${format.width} x ${format.height} — ${format.ratio}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Watermark toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-navy">
                &quot;Virtually Staged&quot; Watermark
              </p>
              <p className="text-[11px] text-slate">
                Required for MLS compliance
              </p>
            </div>
            <button
              onClick={() => setWatermark(!watermark)}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                watermark ? "bg-gold" : "bg-navy/20"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                  watermark ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Quality slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-navy">JPEG Quality</p>
              <span className="text-sm text-gold font-medium">{quality}%</span>
            </div>
            <input
              type="range"
              min={70}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-gold"
            />
          </div>

          {/* Export button */}
          <button
            onClick={() => onExport(selectedFormats, watermark, quality)}
            disabled={selectedFormats.length === 0 || exporting}
            className="w-full py-3 bg-gold hover:bg-gold-dark text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export {selectedFormats.length} Format
                {selectedFormats.length !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
