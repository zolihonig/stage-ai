"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Loader2,
  Wand2,
  Send,
  RotateCcw,
  SlidersHorizontal,
  Grid3X3,
} from "lucide-react";
import { getListing, saveListing, getApiKey } from "@/lib/store";
import type { Listing, StagedPhoto } from "@/lib/store";
import {
  STYLES,
  ROOM_TYPES,
  COLOR_PREFERENCES,
  REFINEMENT_SUGGESTIONS,
} from "@/lib/constants";
import type { StyleId, ColorPreferenceId } from "@/lib/constants";
import StagingQueue, { type QueueItem } from "@/components/StagingQueue";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import ExportModal from "@/components/ExportModal";
import { v4 as uuidv4 } from "uuid";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isStaging, setIsStaging] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [stagingStarted, setStagingStarted] = useState(false);

  // Per-image state
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [refinementInput, setRefinementInput] = useState("");
  const [refinementLoading, setRefinementLoading] = useState(false);
  // Track which images are in slider mode vs static
  const [sliderMode, setSliderMode] = useState<Set<string>>(new Set());

  const toggleSlider = (id: string) => {
    setSliderMode((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startStaging = useCallback(
    async (
      currentListing: Listing,
      styles: StyleId[],
      colorPref: ColorPreferenceId | null,
      instructions: string
    ) => {
      const apiKey = getApiKey();
      if (!apiKey) {
        alert("Please add your Gemini API key in Settings first.");
        return;
      }

      setIsStaging(true);

      const colorName = colorPref
        ? COLOR_PREFERENCES.find((c) => c.id === colorPref)?.description || ""
        : "";

      const queueItems: QueueItem[] = [];
      for (const photo of currentListing.photos) {
        for (const style of styles) {
          const styleName = STYLES.find((s) => s.id === style)?.name || style;
          queueItems.push({
            photoId: photo.id,
            photoName: photo.fileName,
            style: styleName,
            status: "pending",
          });
        }
      }
      setQueue(queueItems);

      const updatedListing = { ...currentListing };
      const newStagedPhotos: StagedPhoto[] = [...currentListing.stagedPhotos];

      for (let i = 0; i < queueItems.length; i++) {
        const item = queueItems[i];
        const photo = currentListing.photos.find((p) => p.id === item.photoId);
        if (!photo) continue;

        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: "processing" } : q))
        );

        try {
          const base64 = photo.dataUrl.split(",")[1];
          const roomTypeName =
            ROOM_TYPES.find((r) => r.id === photo.roomType)?.name || photo.roomType;

          const startTime = Date.now();
          const res = await fetch("/api/stage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType: "image/jpeg",
              style: item.style,
              roomType: roomTypeName,
              colorPreference: colorName,
              instructions,
              apiKey,
            }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `API error: ${res.status}`);
          }

          const data = await res.json();
          const generationTime = Date.now() - startTime;

          newStagedPhotos.push({
            id: uuidv4(),
            photoId: item.photoId,
            style: item.style,
            dataUrl: `data:${data.mimeType};base64,${data.imageBase64}`,
            generationTimeMs: generationTime,
            createdAt: new Date().toISOString(),
          });

          setQueue((prev) =>
            prev.map((q, idx) => (idx === i ? { ...q, status: "complete" } : q))
          );

          updatedListing.stagedPhotos = newStagedPhotos;
          await saveListing(updatedListing);
          setListing({ ...updatedListing });
        } catch (error) {
          console.error("Staging failed:", error);
          setQueue((prev) =>
            prev.map((q, idx) => (idx === i ? { ...q, status: "failed" } : q))
          );
        }

        if (i < queueItems.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      setIsStaging(false);
    },
    []
  );

  useEffect(() => {
    const loadAndStage = async () => {
      const data = await getListing(id);
      setListing(data);
      setLoading(false);

      if (!stagingStarted) {
        const autoStage = searchParams.get("autoStage");
        const stylesParam = searchParams.get("styles");
        if (autoStage === "true" && stylesParam && data && data.stagedPhotos.length === 0) {
          setStagingStarted(true);
          const styles = stylesParam.split(",") as StyleId[];
          const colorPref = searchParams.get("color") as ColorPreferenceId | null;
          const instructions = searchParams.get("instructions") || "";
          startStaging(data, styles, colorPref, instructions);
        }
      }
    };
    loadAndStage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleRefine = async (stagedPhoto: StagedPhoto, instruction: string) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      alert("Please add your Gemini API key in Settings first.");
      return;
    }

    setRefinementLoading(true);
    try {
      const base64 = stagedPhoto.dataUrl.split(",")[1];
      const mimeType = stagedPhoto.dataUrl.split(";")[0].split(":")[1];

      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, instruction, apiKey }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Refinement failed");
      }

      const data = await res.json();

      if (listing) {
        const updatedListing = {
          ...listing,
          stagedPhotos: listing.stagedPhotos.map((sp) =>
            sp.id === stagedPhoto.id
              ? { ...sp, dataUrl: `data:${data.mimeType};base64,${data.imageBase64}`, createdAt: new Date().toISOString() }
              : sp
          ),
        };
        await saveListing(updatedListing);
        setListing(updatedListing);
      }

      setRefiningId(null);
      setRefinementInput("");
    } catch (error) {
      console.error("Refinement failed:", error);
      alert(`Refinement failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setRefinementLoading(false);
    }
  };

  const handleExport = async () => {
    if (!listing) return;
    for (const staged of listing.stagedPhotos) {
      const link = document.createElement("a");
      link.href = staged.dataUrl;
      const photo = listing.photos.find((p) => p.id === staged.photoId);
      link.download = `${listing.name}-${photo?.roomType || "room"}-${staged.style}.jpg`;
      link.click();
      await new Promise((r) => setTimeout(r, 200));
    }
    setShowExport(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="text-gold animate-spin" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center">
        <p className="text-slate">Listing not found.</p>
        <Link href="/dashboard" className="text-gold underline text-sm mt-2 inline-block">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  const getStyledPhotos = (photoId: string) =>
    listing.stagedPhotos.filter((sp) => sp.photoId === photoId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-slate hover:text-navy mb-1"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
          <h1 className="font-serif text-xl sm:text-2xl text-navy">{listing.name}</h1>
          {listing.address && <p className="text-xs sm:text-sm text-slate">{listing.address}</p>}
          <p className="text-xs text-slate mt-0.5">
            {listing.photos.length} photo{listing.photos.length !== 1 ? "s" : ""}
            {listing.stagedPhotos.length > 0 && ` · ${listing.stagedPhotos.length} staged`}
          </p>
        </div>
        {listing.stagedPhotos.length > 0 && (
          <button
            onClick={() => setShowExport(true)}
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors self-start"
          >
            <Download size={14} />
            Export
          </button>
        )}
      </div>

      {/* Staging Queue */}
      {queue.length > 0 && isStaging && (
        <div className="mb-5">
          <StagingQueue items={queue} />
        </div>
      )}

      {/* Photo Results */}
      <div className="space-y-8">
        {listing.photos.map((photo) => {
          const staged = getStyledPhotos(photo.id);
          return (
            <div key={photo.id}>
              <h3 className="font-serif text-base text-navy mb-3 flex items-center gap-2">
                {ROOM_TYPES.find((r) => r.id === photo.roomType)?.name || photo.roomType}
                {staged.length > 0 && (
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                    {staged.length} style{staged.length !== 1 ? "s" : ""}
                  </span>
                )}
              </h3>

              {/* Original photo */}
              <div className="mb-3">
                <div className="rounded-xl overflow-hidden border border-navy/10 shadow-sm inline-block w-full sm:w-auto sm:max-w-sm">
                  <div className="aspect-[4/3] relative">
                    <img src={photo.dataUrl} alt="Original" className="w-full h-full object-cover" />
                    <div className="absolute top-2 left-2 bg-navy/70 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">
                      Original
                    </div>
                  </div>
                </div>
              </div>

              {/* Staged versions */}
              {staged.map((sp) => (
                <div key={sp.id} className="mb-4">
                  {/* Slider vs static toggle */}
                  {sliderMode.has(sp.id) ? (
                    <div className="relative">
                      <BeforeAfterSlider
                        beforeSrc={photo.dataUrl}
                        afterSrc={sp.dataUrl}
                        beforeLabel="Original"
                        afterLabel={sp.style}
                        className="aspect-[4/3] rounded-xl max-w-2xl"
                      />
                      <button
                        onClick={() => toggleSlider(sp.id)}
                        className="absolute top-2 right-2 z-20 bg-navy/70 hover:bg-navy text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1"
                      >
                        <Grid3X3 size={10} />
                        Static
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-gold/20 shadow-sm max-w-2xl relative group">
                      <div className="aspect-[4/3] relative">
                        <img src={sp.dataUrl} alt={sp.style} className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-gold/90 text-navy text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-sm">
                          {sp.style}
                        </div>
                        <button
                          onClick={() => toggleSlider(sp.id)}
                          className="absolute top-2 right-2 bg-navy/70 hover:bg-navy text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity"
                        >
                          <SlidersHorizontal size={10} />
                          Compare
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Info + actions bar — always visible, mobile-friendly */}
                  <div className="max-w-2xl mt-2 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate">
                        {sp.style} · {(sp.generationTimeMs / 1000).toFixed(1)}s
                      </span>
                      {!refiningId && (
                        <button
                          onClick={() => setRefiningId(sp.id)}
                          className="flex items-center gap-1.5 text-xs font-medium text-gold bg-gold/10 hover:bg-gold/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Wand2 size={12} />
                          Edit / Reprompt
                        </button>
                      )}
                    </div>

                    {/* Refinement panel */}
                    {refiningId === sp.id && (
                      <RefinementPanel
                        loading={refinementLoading}
                        input={refinementInput}
                        onInputChange={setRefinementInput}
                        onRefine={(instruction) => handleRefine(sp, instruction)}
                        onClose={() => {
                          setRefiningId(null);
                          setRefinementInput("");
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}

              {/* Processing placeholder */}
              {isStaging &&
                queue.some(
                  (q) => q.photoId === photo.id && (q.status === "pending" || q.status === "processing")
                ) && (
                  <div className="rounded-xl overflow-hidden border border-navy/10 bg-ivory-light max-w-2xl mb-4">
                    <div className="aspect-[4/3] flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 size={24} className="text-gold animate-spin mx-auto mb-2" />
                        <p className="text-xs text-slate">Staging...</p>
                      </div>
                    </div>
                  </div>
                )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {listing.stagedPhotos.length === 0 && !isStaging && queue.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-navy/10">
          <RotateCcw size={32} className="text-navy/20 mx-auto mb-3" />
          <p className="text-slate text-sm">
            No staged photos yet.{" "}
            <Link href="/listing/new" className="text-gold underline">
              Create a new listing
            </Link>{" "}
            to start staging.
          </p>
        </div>
      )}

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        photoCount={listing.stagedPhotos.length}
        onExport={handleExport}
      />
    </div>
  );
}

function RefinementPanel({
  loading,
  input,
  onInputChange,
  onRefine,
  onClose,
}: {
  loading: boolean;
  input: string;
  onInputChange: (val: string) => void;
  onRefine: (instruction: string) => void;
  onClose: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gold animate-pulse py-2 bg-gold/5 rounded-xl px-3">
        <Loader2 size={14} className="animate-spin" />
        Refining image...
      </div>
    );
  }

  return (
    <div className="space-y-2.5 bg-ivory-light rounded-xl p-3 border border-navy/5">
      {/* Suggestion chips — scrollable on mobile */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {REFINEMENT_SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion.label}
            onClick={() => onRefine(suggestion.prompt)}
            className="text-xs px-3 py-1.5 rounded-full border border-navy/10 bg-white text-navy hover:border-gold hover:text-gold transition-colors whitespace-nowrap shrink-0"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) onRefine(input.trim());
          }}
          placeholder="Describe a change..."
          className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-navy/10 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-1 focus:ring-gold/30"
          autoFocus
        />
        <button
          onClick={() => input.trim() && onRefine(input.trim())}
          disabled={!input.trim()}
          className="px-4 py-2.5 bg-gold hover:bg-gold-dark text-white rounded-lg text-sm disabled:opacity-40 transition-colors"
        >
          <Send size={14} />
        </button>
      </div>
      <button onClick={onClose} className="text-xs text-slate hover:text-navy w-full text-center py-1">
        Cancel
      </button>
    </div>
  );
}
