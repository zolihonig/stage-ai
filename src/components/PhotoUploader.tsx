"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Camera, AlertCircle, Loader2 } from "lucide-react";
import { ROOM_TYPES } from "@/lib/constants";
import type { Photo } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";

interface PhotoUploaderProps {
  photos: Photo[];
  onPhotosChange: React.Dispatch<React.SetStateAction<Photo[]>>;
}

export default function PhotoUploader({ photos, onPhotosChange }: PhotoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [detecting, setDetecting] = useState<Set<string>>(new Set());
  const [detectFailed, setDetectFailed] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const newPhotos: Photo[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;

        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.src = dataUrl;
        });

        newPhotos.push({
          id: uuidv4(),
          file,
          dataUrl,
          roomType: "living_room",
          fileName: file.name,
          width: dimensions.width,
          height: dimensions.height,
        });
      }

      onPhotosChange((prev) => [...prev, ...newPhotos]);

      // Auto-detect room types using server-side Claude
      for (const photo of newPhotos) {
        setDetecting((prev) => new Set(prev).add(photo.id));
        try {
          const mimeType = photo.dataUrl.split(";")[0].split(":")[1] || "image/jpeg";
          const base64 = photo.dataUrl.split(",")[1];

          const res = await fetch("/api/detect-room", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64, mimeType }),
          });

          if (res.ok) {
            const { roomType } = await res.json();
            onPhotosChange((prev) => prev.map((p) => (p.id === photo.id ? { ...p, roomType } : p)));
          } else {
            setDetectFailed((prev) => new Set(prev).add(photo.id));
          }
        } catch {
          setDetectFailed((prev) => new Set(prev).add(photo.id));
        } finally {
          setDetecting((prev) => { const n = new Set(prev); n.delete(photo.id); return n; });
        }
      }
    },
    [onPhotosChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
    },
    [processFiles]
  );

  return (
    <div className="space-y-3">
      {/* Dropzone — compact when photos exist */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
          photos.length > 0 ? "p-4 sm:p-6" : "p-8 sm:p-12"
        } ${isDragging ? "border-gold bg-gold/5 dropzone-active" : "border-navy/15 hover:border-gold/40 hover:bg-ivory-light/50"}`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
          capture={undefined}
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          className="hidden"
        />
        {photos.length === 0 ? (
          <>
            <div className="w-14 h-14 bg-navy/[0.03] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Upload size={28} className={isDragging ? "text-gold" : "text-navy/25"} />
            </div>
            <p className="text-base font-medium text-navy">
              {isDragging ? "Drop photos here" : "Drag & drop property photos"}
            </p>
            <p className="text-sm text-slate mt-1">or tap to browse</p>
            <p className="text-[11px] text-slate/60 mt-2">JPEG, PNG, WebP, HEIC — up to 50 photos</p>
          </>
        ) : (
          <div className="flex items-center justify-center gap-2 text-sm">
            <Camera size={16} className="text-navy/30" />
            <span className="text-navy/60">Add more photos</span>
          </div>
        )}
      </div>

      {/* Error banner */}
      {detectFailed.size > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <p>Room detection failed for {detectFailed.size} photo{detectFailed.size !== 1 ? "s" : ""}. Set room types manually.</p>
        </div>
      )}

      {/* Photo count */}
      {photos.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate">
            {photos.length} photo{photos.length !== 1 ? "s" : ""}
            {detecting.size > 0 && (
              <span className="text-gold ml-2 animate-pulse">
                Detecting {detecting.size} room{detecting.size !== 1 ? "s" : ""}...
              </span>
            )}
          </p>
          {photos.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); onPhotosChange([]); }}
              className="text-[11px] text-red-400 hover:text-red-500"
            >
              Remove all
            </button>
          )}
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative rounded-lg overflow-hidden border border-navy/[0.06] bg-white shadow-sm">
              <div className="aspect-[4/3] relative">
                <img src={photo.dataUrl} alt={photo.fileName} className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); onPhotosChange((prev) => prev.filter((p) => p.id !== photo.id)); }}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={10} />
                </button>
                {detecting.has(photo.id) && (
                  <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                    <Loader2 size={16} className="text-gold animate-spin" />
                  </div>
                )}
              </div>
              <select
                value={photo.roomType}
                onChange={(e) => onPhotosChange((prev) => prev.map((p) => (p.id === photo.id ? { ...p, roomType: e.target.value } : p)))}
                onClick={(e) => e.stopPropagation()}
                className="w-full text-[10px] sm:text-xs bg-white border-t border-navy/[0.06] px-1.5 py-1 text-navy font-medium appearance-none cursor-pointer truncate"
              >
                {ROOM_TYPES.map((rt) => (
                  <option key={rt.id} value={rt.id}>{rt.name}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
