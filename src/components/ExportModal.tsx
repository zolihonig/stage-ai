"use client";

import { useState } from "react";
import { X, Download, Check, Loader2, FileArchive } from "lucide-react";
import { EXPORT_FORMATS } from "@/lib/constants";
import type { ExportFormat } from "@/lib/constants";
import { exportAllAsZip, downloadBlob } from "@/lib/export";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: { dataUrl: string; fileName: string; style: string; roomType: string }[];
  listingName?: string;
}

export default function ExportModal({ isOpen, onClose, images, listingName }: ExportModalProps) {
  const [selectedFormats, setSelectedFormats] = useState<ExportFormat[]>(["mls_standard"]);
  const [watermark, setWatermark] = useState(true);
  const [quality, setQuality] = useState(90);
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  if (!isOpen) return null;

  const toggleFormat = (id: ExportFormat) => {
    setSelectedFormats((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  };

  const totalExports = images.length * selectedFormats.length;

  const handleExport = async () => {
    setExporting(true);
    setProgress({ done: 0, total: totalExports });

    try {
      const zipBlob = await exportAllAsZip(
        images,
        selectedFormats,
        watermark,
        quality,
        (done, total) => setProgress({ done, total })
      );

      const zipName = `${(listingName || "StageAI-Export").replace(/[^a-zA-Z0-9]/g, "-")}.zip`;
      downloadBlob(zipBlob, zipName);
    } catch (e) {
      console.error("Export failed:", e);
      alert("Export failed. Please try again.");
    }

    setExporting(false);
    setProgress({ done: 0, total: 0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-lg sm:text-xl text-navy">Export Photos</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-ivory rounded-lg transition-colors">
              <X size={18} className="text-slate" />
            </button>
          </div>

          <p className="text-sm text-slate">
            {images.length} photo{images.length !== 1 ? "s" : ""} &middot; Downloads as ZIP
          </p>

          {/* Formats */}
          <div className="space-y-1.5">
            {EXPORT_FORMATS.map((format) => {
              const isSelected = selectedFormats.includes(format.id);
              return (
                <button
                  key={format.id}
                  onClick={() => toggleFormat(format.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all border ${
                    isSelected ? "border-gold bg-gold/5" : "border-navy/[0.06] hover:border-gold/30"
                  }`}
                >
                  <div className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-gold border-gold" : "border-navy/20"
                  }`}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy">{format.name}</p>
                    <p className="text-[10px] text-slate">
                      {format.ratio === "original" ? "Original resolution" : `${format.width}×${format.height} — ${format.ratio}`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Watermark */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-medium text-navy">&quot;Virtually Staged&quot; Watermark</p>
              <p className="text-[10px] text-slate">Required for MLS compliance</p>
            </div>
            <button
              onClick={() => setWatermark(!watermark)}
              className={`w-10 h-5.5 rounded-full transition-colors relative ${watermark ? "bg-gold" : "bg-navy/15"}`}
            >
              <div className={`w-4.5 h-4.5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${watermark ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Quality */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-navy shrink-0">Quality</span>
            <input type="range" min={70} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="flex-1 accent-gold" />
            <span className="text-sm text-gold font-medium w-10 text-right">{quality}%</span>
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={selectedFormats.length === 0 || exporting}
            className="w-full py-3 bg-gold hover:bg-gold-dark text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {exporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing {progress.done}/{progress.total}...
              </>
            ) : (
              <>
                <FileArchive size={16} />
                Download ZIP ({totalExports} file{totalExports !== 1 ? "s" : ""})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
