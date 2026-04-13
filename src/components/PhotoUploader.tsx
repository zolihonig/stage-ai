"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, GripVertical, AlertCircle } from "lucide-react";
import { ROOM_TYPES } from "@/lib/constants";
import type { Photo } from "@/lib/store";
import { v4 as uuidv4 } from "uuid";

interface PhotoUploaderProps {
  photos: Photo[];
  onPhotosChange: React.Dispatch<React.SetStateAction<Photo[]>>;
}

export default function PhotoUploader({
  photos,
  onPhotosChange,
}: PhotoUploaderProps) {
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

        const dimensions = await new Promise<{
          width: number;
          height: number;
        }>((resolve) => {
          const img = new window.Image();
          img.onload = () =>
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
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

      // Add all photos to state at once
      onPhotosChange((prev) => [...prev, ...newPhotos]);

      // Auto-detect room types using server-side Claude (no API key needed)
      {
        for (const photo of newPhotos) {
          setDetecting((prev) => new Set(prev).add(photo.id));
          try {
            const mimeType =
              photo.dataUrl.split(";")[0].split(":")[1] || "image/jpeg";
            const base64 = photo.dataUrl.split(",")[1];

            const res = await fetch("/api/detect-room", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageBase64: base64,
                mimeType,
              }),
            });

            if (res.ok) {
              const { roomType } = await res.json();
              // Use functional updater to always get latest state
              onPhotosChange((prev) =>
                prev.map((p) =>
                  p.id === photo.id ? { ...p, roomType } : p
                )
              );
            } else {
              setDetectFailed((prev) => new Set(prev).add(photo.id));
            }
          } catch {
            setDetectFailed((prev) => new Set(prev).add(photo.id));
          } finally {
            setDetecting((prev) => {
              const next = new Set(prev);
              next.delete(photo.id);
              return next;
            });
          }
        }
      }
    },
    [onPhotosChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles]
  );

  const removePhoto = (id: string) => {
    onPhotosChange((prev) => prev.filter((p) => p.id !== id));
  };

  const updateRoomType = (id: string, roomType: string) => {
    onPhotosChange((prev) =>
      prev.map((p) => (p.id === id ? { ...p, roomType } : p))
    );
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? "border-gold bg-gold/5 dropzone-active"
            : "border-navy/20 hover:border-gold/50 hover:bg-ivory-light/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/heic"
          onChange={(e) => e.target.files && processFiles(e.target.files)}
          className="hidden"
        />
        <Upload
          size={40}
          className={`mx-auto mb-4 ${isDragging ? "text-gold" : "text-navy/30"}`}
        />
        <p className="text-lg font-medium text-navy">
          {isDragging ? "Drop photos here" : "Drag & drop property photos"}
        </p>
        <p className="text-sm text-slate mt-1">
          or click to browse. JPEG, PNG, WebP, HEIC — up to 50 photos
        </p>
      </div>

      {/* Detection error banner */}
      {detectFailed.size > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              Room detection failed for {detectFailed.size} photo
              {detectFailed.size !== 1 ? "s" : ""}
            </p>
            <p className="text-xs mt-0.5 text-amber-600">
              Check your Gemini API key in Settings. You can set room types
              manually below.
            </p>
          </div>
        </div>
      )}

      {/* Photo grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-white rounded-xl border border-navy/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="aspect-[4/3] relative">
                <img
                  src={photo.dataUrl}
                  alt={photo.fileName}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removePhoto(photo.id);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/50 hover:bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical size={16} className="text-white drop-shadow" />
                </div>
              </div>
              <div className="p-2">
                <select
                  value={photo.roomType}
                  onChange={(e) => updateRoomType(photo.id, e.target.value)}
                  className="w-full text-xs bg-ivory-light border border-navy/10 rounded-lg px-2 py-1.5 text-navy font-medium appearance-none cursor-pointer"
                >
                  {ROOM_TYPES.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                    </option>
                  ))}
                </select>
                {detecting.has(photo.id) && (
                  <p className="text-[10px] text-gold mt-1 animate-pulse">
                    Detecting room type...
                  </p>
                )}
                {detectFailed.has(photo.id) && !detecting.has(photo.id) && (
                  <p className="text-[10px] text-amber-500 mt-1">
                    Detection failed — select manually
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
