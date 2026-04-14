"use client";

import { useState } from "react";
import { Link2, Loader2, Cloud, X } from "lucide-react";

interface CloudImportProps {
  onImport: (photos: { dataUrl: string; fileName: string }[]) => void;
}

export default function CloudImport({ onImport }: CloudImportProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const detectService = (url: string): "dropbox" | "gdrive" | null => {
    if (url.includes("dropbox.com")) return "dropbox";
    if (url.includes("drive.google.com")) return "gdrive";
    return null;
  };

  const handleImport = async () => {
    const service = detectService(url);
    if (!service) {
      setError("Paste a Dropbox or Google Drive shared folder link");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("Fetching files...");

    try {
      const res = await fetch("/api/import-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, service }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to import");
      }

      const data = await res.json();
      const photos: { dataUrl: string; fileName: string }[] = [];

      setStatus(`Downloading ${data.files.length} photos...`);

      for (let i = 0; i < data.files.length; i++) {
        const file = data.files[i];
        setStatus(`Downloading ${i + 1}/${data.files.length}: ${file.name}`);

        try {
          const imgRes = await fetch("/api/import-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ downloadUrl: file.downloadUrl, service }),
          });

          if (imgRes.ok) {
            const imgData = await imgRes.json();
            photos.push({ dataUrl: imgData.dataUrl, fileName: file.name });
          }
        } catch {
          // Skip failed downloads
        }
      }

      if (photos.length === 0) {
        throw new Error("No images found in the shared folder");
      }

      onImport(photos);
      setOpen(false);
      setUrl("");
      setStatus("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
      setStatus("");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-slate hover:text-navy transition-colors"
      >
        <Cloud size={13} />
        Import from Dropbox / Google Drive
      </button>
    );
  }

  return (
    <div className="bg-ivory-light/60 rounded-xl p-3 border border-navy/5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-navy flex items-center gap-1.5">
          <Link2 size={13} />
          Import from cloud
        </span>
        <button onClick={() => { setOpen(false); setError(""); }} className="text-slate hover:text-navy">
          <X size={14} />
        </button>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter" && url.trim()) handleImport(); }}
          placeholder="Paste Dropbox or Google Drive shared link..."
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-navy/10 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-1 focus:ring-gold/30"
          disabled={loading}
        />
        <button
          onClick={handleImport}
          disabled={!url.trim() || loading}
          className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded-lg disabled:opacity-40 transition-colors flex items-center gap-1.5"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Cloud size={14} />}
          {loading ? "Importing" : "Import"}
        </button>
      </div>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {status && <p className="text-[11px] text-gold animate-pulse">{status}</p>}
      <p className="text-[10px] text-slate/60">
        Share a folder link containing property photos. We&apos;ll import all JPEG/PNG images.
      </p>
    </div>
  );
}
