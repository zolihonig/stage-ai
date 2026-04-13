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
  AlertCircle,
  RefreshCw,
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
import { resizeImageForApi } from "@/lib/resize";

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
  // Track failed photos for retry
  const [failedPhotos, setFailedPhotos] = useState<Map<string, { style: string; error: string }>>(new Map());
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

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
          // Resize to max 2048px and normalize to JPEG to avoid payload limits
          const { base64, mimeType } = await resizeImageForApi(photo.dataUrl);
          const roomTypeName =
            ROOM_TYPES.find((r) => r.id === photo.roomType)?.name || photo.roomType;

          const startTime = Date.now();
          const res = await fetch("/api/stage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imageBase64: base64,
              mimeType,
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
          const errMsg = error instanceof Error ? error.message : "Unknown error";
          setQueue((prev) =>
            prev.map((q, idx) => (idx === i ? { ...q, status: "failed" } : q))
          );
          setFailedPhotos((prev) => {
            const next = new Map(prev);
            next.set(item.photoId, { style: item.style, error: errMsg });
            return next;
          });
        }

        if (i < queueItems.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      setIsStaging(false);
    },
    []
  );

  const retryPhoto = useCallback(
    async (photoId: string) => {
      if (!listing) return;
      const apiKey = getApiKey();
      if (!apiKey) { alert("Add your Gemini API key in Settings."); return; }

      const photo = listing.photos.find((p) => p.id === photoId);
      if (!photo) return;

      const failInfo = failedPhotos.get(photoId);
      const style = failInfo?.style || searchParams.get("styles")?.split(",")[0] || "Modern Minimalist";
      const colorPref = searchParams.get("color") as ColorPreferenceId | null;
      const colorName = colorPref ? COLOR_PREFERENCES.find((c) => c.id === colorPref)?.description || "" : "";

      setRetrying((prev) => new Set(prev).add(photoId));
      setFailedPhotos((prev) => { const next = new Map(prev); next.delete(photoId); return next; });

      try {
        const { base64, mimeType } = await resizeImageForApi(photo.dataUrl);
        const roomTypeName = ROOM_TYPES.find((r) => r.id === photo.roomType)?.name || photo.roomType;

        const startTime = Date.now();
        const res = await fetch("/api/stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType, style, roomType: roomTypeName, colorPreference: colorName, apiKey }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `API error: ${res.status}`);
        }

        const data = await res.json();
        const updatedListing = {
          ...listing,
          stagedPhotos: [
            ...listing.stagedPhotos,
            {
              id: uuidv4(),
              photoId,
              style,
              dataUrl: `data:${data.mimeType};base64,${data.imageBase64}`,
              generationTimeMs: Date.now() - startTime,
              createdAt: new Date().toISOString(),
            },
          ],
        };
        await saveListing(updatedListing);
        setListing(updatedListing);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        setFailedPhotos((prev) => { const next = new Map(prev); next.set(photoId, { style, error: errMsg }); return next; });
      } finally {
        setRetrying((prev) => { const next = new Set(prev); next.delete(photoId); return next; });
      }
    },
    [listing, failedPhotos, searchParams]
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

      {/* Photo Results — side by side grid */}
      <div className="space-y-6">
        {listing.photos.map((photo) => {
          const staged = getStyledPhotos(photo.id);
          const isProcessing =
            isStaging &&
            queue.some(
              (q) => q.photoId === photo.id && (q.status === "pending" || q.status === "processing")
            );
          return (
            <div key={photo.id}>
              <h3 className="font-serif text-base text-navy mb-2 flex items-center gap-2">
                {ROOM_TYPES.find((r) => r.id === photo.roomType)?.name || photo.roomType}
                {staged.length > 0 && (
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                    {staged.length} style{staged.length !== 1 ? "s" : ""}
                  </span>
                )}
              </h3>

              {/* Side-by-side: Original | Staged (or spinner) */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2">
                {/* Original */}
                <div className="rounded-xl overflow-hidden border border-navy/10 shadow-sm">
                  <div className="aspect-[4/3] relative">
                    <img src={photo.dataUrl} alt="Original" className="w-full h-full object-cover" />
                    <div className="absolute top-1.5 left-1.5 bg-navy/70 text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">
                      Original
                    </div>
                  </div>
                </div>

                {/* Staged or loading */}
                {staged.length > 0 ? (
                  <div className="rounded-xl overflow-hidden border border-gold/20 shadow-sm relative group">
                    <div className="aspect-[4/3] relative">
                      <img
                        src={staged[0].dataUrl}
                        alt={staged[0].style}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1.5 left-1.5 bg-gold/90 text-navy text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur-sm">
                        {staged[0].style}
                      </div>
                      <button
                        onClick={() => toggleSlider(staged[0].id)}
                        className="absolute top-1.5 right-1.5 bg-navy/70 hover:bg-navy text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1"
                      >
                        <SlidersHorizontal size={10} />
                        Compare
                      </button>
                    </div>
                  </div>
                ) : isProcessing ? (
                  <div className="rounded-xl overflow-hidden border border-navy/10 bg-ivory-light">
                    <div className="aspect-[4/3] flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 size={20} className="text-gold animate-spin mx-auto mb-1" />
                        <p className="text-[10px] text-slate">Staging...</p>
                      </div>
                    </div>
                  </div>
                ) : failedPhotos.has(photo.id) ? (
                  <div className="rounded-xl overflow-hidden border border-red-200 bg-red-50/50">
                    <div className="aspect-[4/3] flex items-center justify-center">
                      <div className="text-center px-3">
                        <AlertCircle size={20} className="text-red-400 mx-auto mb-1.5" />
                        <p className="text-[10px] text-red-500 font-medium mb-0.5">Staging failed</p>
                        <p className="text-[9px] text-red-400 mb-2 line-clamp-2">
                          {failedPhotos.get(photo.id)?.error}
                        </p>
                        <button
                          onClick={() => retryPhoto(photo.id)}
                          className="inline-flex items-center gap-1 text-[11px] font-medium bg-gold hover:bg-gold-dark text-white px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <RefreshCw size={11} />
                          Retry
                        </button>
                      </div>
                    </div>
                  </div>
                ) : retrying.has(photo.id) ? (
                  <div className="rounded-xl overflow-hidden border border-navy/10 bg-ivory-light">
                    <div className="aspect-[4/3] flex items-center justify-center">
                      <div className="text-center">
                        <Loader2 size={20} className="text-gold animate-spin mx-auto mb-1" />
                        <p className="text-[10px] text-slate">Retrying...</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-dashed border-navy/10 bg-ivory-light/50">
                    <div className="aspect-[4/3] flex items-center justify-center">
                      <p className="text-[10px] text-slate/50">Not staged</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Slider mode overlay */}
              {staged.length > 0 && sliderMode.has(staged[0].id) && (
                <div className="relative mb-2">
                  <BeforeAfterSlider
                    beforeSrc={photo.dataUrl}
                    afterSrc={staged[0].dataUrl}
                    beforeLabel="Original"
                    afterLabel={staged[0].style}
                    className="aspect-[4/3] rounded-xl"
                  />
                  <button
                    onClick={() => toggleSlider(staged[0].id)}
                    className="absolute top-2 right-2 z-20 bg-navy/70 hover:bg-navy text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1"
                  >
                    <Grid3X3 size={10} />
                    Close
                  </button>
                </div>
              )}

              {/* Edit / Reprompt bar for first staged image */}
              {staged.length > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate">
                      {staged[0].style} · {(staged[0].generationTimeMs / 1000).toFixed(1)}s
                    </span>
                    {refiningId !== staged[0].id && (
                      <button
                        onClick={() => setRefiningId(staged[0].id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-gold bg-gold/10 hover:bg-gold/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Wand2 size={12} />
                        Edit / Reprompt
                      </button>
                    )}
                  </div>
                  {refiningId === staged[0].id && (
                    <RefinementPanel
                      loading={refinementLoading}
                      input={refinementInput}
                      onInputChange={setRefinementInput}
                      onRefine={(instruction) => handleRefine(staged[0], instruction)}
                      onClose={() => {
                        setRefiningId(null);
                        setRefinementInput("");
                      }}
                    />
                  )}
                </div>
              )}

              {/* Additional styles (2nd, 3rd) shown below */}
              {staged.length > 1 &&
                staged.slice(1).map((sp) => (
                  <div key={sp.id} className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
                    <div />
                    <div>
                      <div className="rounded-xl overflow-hidden border border-gold/20 shadow-sm relative group">
                        <div className="aspect-[4/3] relative">
                          <img src={sp.dataUrl} alt={sp.style} className="w-full h-full object-cover" />
                          <div className="absolute top-1.5 left-1.5 bg-gold/90 text-navy text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur-sm">
                            {sp.style}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-slate">{sp.style}</span>
                        <button
                          onClick={() => setRefiningId(sp.id)}
                          className="text-[10px] text-gold hover:text-gold-dark flex items-center gap-1"
                        >
                          <Wand2 size={10} />
                          Edit
                        </button>
                      </div>
                      {refiningId === sp.id && (
                        <RefinementPanel
                          loading={refinementLoading}
                          input={refinementInput}
                          onInputChange={setRefinementInput}
                          onRefine={(instruction) => handleRefine(sp, instruction)}
                          onClose={() => { setRefiningId(null); setRefinementInput(""); }}
                        />
                      )}
                    </div>
                  </div>
                ))}
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
