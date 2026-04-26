"use client";

import { useState } from "react";
import { Loader2, Building2, X, Search } from "lucide-react";

interface ImportedPhoto {
  dataUrl: string;
  fileName: string;
}

interface ListingResult {
  id: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  mlsId?: string;
  photoCount?: number;
  thumbnailUrl?: string;
}

interface RealtyImportProps {
  onImport: (photos: ImportedPhoto[], address?: string) => void;
}

export default function RealtyImport({ onImport }: RealtyImportProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ListingResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const reset = () => {
    setQuery("");
    setResults([]);
    setStatus("");
    setError("");
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/realty-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "search", query: query.trim() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Search failed");
      }
      const data = await res.json();
      const found: ListingResult[] = data.results || [];
      if (found.length === 0) setError("No matching listings found");
      setResults(found);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (listing: ListingResult) => {
    setImporting(listing.id);
    setError("");

    try {
      setStatus("Fetching listing photos...");
      const photosRes = await fetch("/api/realty-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "photos", listingId: listing.id }),
      });
      if (!photosRes.ok) {
        const err = await photosRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load photos");
      }
      const { listing: detail } = await photosRes.json();
      const photoUrls: string[] = detail.photoUrls || [];

      if (photoUrls.length === 0) {
        throw new Error("This listing has no photos");
      }

      const photos: ImportedPhoto[] = [];
      for (let i = 0; i < photoUrls.length; i++) {
        setStatus(`Downloading ${i + 1}/${photoUrls.length}...`);
        try {
          const dlRes = await fetch("/api/realty-import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "download",
              photoUrl: photoUrls[i],
            }),
          });
          if (dlRes.ok) {
            const { dataUrl } = await dlRes.json();
            const fileName = `${listing.mlsId || listing.id}-${i + 1}.jpg`;
            photos.push({ dataUrl, fileName });
          }
        } catch {
          // Skip failed downloads, keep the rest.
        }
      }

      if (photos.length === 0) {
        throw new Error("All photo downloads failed");
      }

      const fullAddress = [
        listing.address,
        listing.city,
        listing.state,
        listing.zip,
      ]
        .filter(Boolean)
        .join(", ");

      onImport(photos, fullAddress);
      setOpen(false);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(null);
      setStatus("");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-slate hover:text-navy transition-colors"
      >
        <Building2 size={13} />
        Import from MLS (RealtyAPI)
      </button>
    );
  }

  return (
    <div className="bg-ivory-light/60 rounded-xl p-3 border border-navy/5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-navy flex items-center gap-1.5">
          <Building2 size={13} />
          Import from MLS
        </span>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-slate hover:text-navy"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) handleSearch();
          }}
          placeholder="Address or MLS number..."
          className="flex-1 text-sm px-3 py-2 rounded-lg border border-navy/10 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-1 focus:ring-gold/30"
          disabled={searching || !!importing}
        />
        <button
          onClick={handleSearch}
          disabled={!query.trim() || searching || !!importing}
          className="px-4 py-2 bg-gold hover:bg-gold-dark text-white text-sm rounded-lg disabled:opacity-40 transition-colors flex items-center gap-1.5"
        >
          {searching ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          {searching ? "Searching" : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="divide-y divide-navy/5 bg-white rounded-lg border border-navy/10 max-h-60 overflow-y-auto">
          {results.map((r) => {
            const busy = importing === r.id;
            return (
              <li
                key={r.id}
                className="p-2.5 flex items-center gap-2.5 hover:bg-ivory-light/50 transition-colors"
              >
                {r.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.thumbnailUrl}
                    alt=""
                    className="w-12 h-12 rounded object-cover bg-navy/5 flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-navy/5 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-navy/30" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-navy truncate">{r.address}</p>
                  <p className="text-[11px] text-slate truncate">
                    {[r.city, r.state, r.zip].filter(Boolean).join(", ")}
                    {r.mlsId ? ` · MLS ${r.mlsId}` : ""}
                    {typeof r.photoCount === "number"
                      ? ` · ${r.photoCount} photos`
                      : ""}
                  </p>
                </div>
                <button
                  onClick={() => handleSelect(r)}
                  disabled={!!importing}
                  className="px-3 py-1.5 text-xs bg-navy hover:bg-navy/90 text-white rounded-md disabled:opacity-40 flex items-center gap-1.5"
                >
                  {busy ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : null}
                  {busy ? "Importing" : "Import"}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {status && <p className="text-[11px] text-gold animate-pulse">{status}</p>}
      <p className="text-[10px] text-slate/60">
        Search by full address or MLS number. Photos import directly into your
        listing.
      </p>
    </div>
  );
}
