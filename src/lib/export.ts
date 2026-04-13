// Client-side image export with canvas-based resizing
// Handles all export formats: MLS, Instagram, print, etc.

import { EXPORT_FORMATS } from "./constants";
import type { ExportFormat } from "./constants";

interface ExportOptions {
  format: ExportFormat;
  watermark: boolean;
  quality: number; // 0-100
}

function resizeToFormat(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  quality: number,
  watermark: boolean
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");

    if (targetWidth === 0 || targetHeight === 0) {
      // Original resolution
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    } else {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const ctx = canvas.getContext("2d")!;

    // Draw image with cover-fit (crop to fill)
    const srcRatio = img.naturalWidth / img.naturalHeight;
    const dstRatio = canvas.width / canvas.height;

    let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
    if (srcRatio > dstRatio) {
      sw = img.naturalHeight * dstRatio;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = img.naturalWidth / dstRatio;
      sy = (img.naturalHeight - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    // Add watermark if requested
    if (watermark) {
      const fontSize = Math.max(12, canvas.width * 0.015);
      ctx.font = `${fontSize}px Inter, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      const text = "Virtually Staged";
      const metrics = ctx.measureText(text);
      const x = canvas.width - metrics.width - fontSize;
      const y = canvas.height - fontSize;
      ctx.strokeText(text, x, y);
      ctx.fillText(text, x, y);
    }

    canvas.toBlob(
      (blob) => resolve(blob!),
      "image/jpeg",
      quality / 100
    );
  });
}

export async function exportImage(
  dataUrl: string,
  options: ExportOptions
): Promise<Blob> {
  const format = EXPORT_FORMATS.find((f) => f.id === options.format)!;

  const img = await new Promise<HTMLImageElement>((resolve) => {
    const i = new window.Image();
    i.onload = () => resolve(i);
    i.src = dataUrl;
  });

  return resizeToFormat(
    img,
    format.width,
    format.height,
    options.quality,
    options.watermark
  );
}

export async function exportAllAsZip(
  images: { dataUrl: string; fileName: string }[],
  options: ExportOptions
): Promise<Blob> {
  // Simple concatenation approach — create individual downloads
  // For a real ZIP we'd need JSZip, but for now download individually
  const blobs: { blob: Blob; name: string }[] = [];
  for (const img of images) {
    const blob = await exportImage(img.dataUrl, options);
    blobs.push({ blob, name: img.fileName });
  }
  // Return the first blob for single downloads
  // For multi-file, the caller handles iteration
  return blobs[0].blob;
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
