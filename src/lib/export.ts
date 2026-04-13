import JSZip from "jszip";
import { EXPORT_FORMATS } from "./constants";
import type { ExportFormat } from "./constants";

export interface ExportOptions {
  format: ExportFormat;
  watermark: boolean;
  quality: number;
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
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    } else {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    const ctx = canvas.getContext("2d")!;

    // Cover-fit crop
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

    // Watermark
    if (watermark) {
      const fontSize = Math.max(14, canvas.width * 0.018);
      ctx.font = `500 ${fontSize}px Inter, system-ui, sans-serif`;
      const text = "Virtually Staged";
      const metrics = ctx.measureText(text);
      const x = canvas.width - metrics.width - fontSize * 1.2;
      const y = canvas.height - fontSize * 1.2;
      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.fillText(text, x + 1, y + 1);
      // White text
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.fillText(text, x, y);
    }

    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", quality / 100);
  });
}

export async function exportImage(dataUrl: string, options: ExportOptions): Promise<Blob> {
  const format = EXPORT_FORMATS.find((f) => f.id === options.format)!;
  const img = await new Promise<HTMLImageElement>((resolve) => {
    const i = new window.Image();
    i.onload = () => resolve(i);
    i.src = dataUrl;
  });
  return resizeToFormat(img, format.width, format.height, options.quality, options.watermark);
}

export async function exportAllAsZip(
  images: { dataUrl: string; fileName: string; style: string; roomType: string }[],
  formats: ExportFormat[],
  watermark: boolean,
  quality: number,
  onProgress?: (done: number, total: number) => void
): Promise<Blob> {
  const zip = new JSZip();
  let done = 0;
  const total = images.length * formats.length;

  for (const format of formats) {
    const formatInfo = EXPORT_FORMATS.find((f) => f.id === format)!;
    const folderName = formatInfo.name.replace(/\s/g, "-");
    const folder = zip.folder(folderName)!;

    for (const img of images) {
      const blob = await exportImage(img.dataUrl, { format, watermark, quality });
      const fileName = `${img.fileName}-${img.style}-${folderName}.jpg`
        .replace(/[^a-zA-Z0-9._-]/g, "_");
      folder.file(fileName, blob);
      done++;
      onProgress?.(done, total);
    }
  }

  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
