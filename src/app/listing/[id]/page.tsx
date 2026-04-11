"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Eye,
  Loader2,
  Wand2,
  Send,
  RotateCcw,
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
  const [viewMode, setViewMode] = useState<"grid" | "compare">("grid");
  const [stagingStarted, setStagingStarted] = useState(false);

  // Per-image refinement state
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [refinementInput, setRefinementInput] = useState("");
  const [refinementLoading, setRefinementLoading] = useState(false);

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

      // Build queue
      const queueItems: QueueItem[] = [];
      for (const photo of currentListing.photos) {
        for (const style of styles) {
          const styleName =
            STYLES.find((s) => s.id === style)?.name || style;
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
        const photo = currentListing.photos.find(
          (p) => p.id === item.photoId
        );
        if (!photo) continue;

        setQueue((prev) =>
          prev.map((q, idx) =>
            idx === i ? { ...q, status: "processing" } : q
          )
        );

        try {
          const base64 = photo.dataUrl.split(",")[1];
          const roomTypeName =
            ROOM_TYPES.find((r) => r.id === photo.roomType)?.name ||
            photo.roomType;

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

          const stagedPhoto: StagedPhoto = {
            id: uuidv4(),
            photoId: item.photoId,
            style: item.style,
            dataUrl: `data:${data.mimeType};base64,${data.imageBase64}`,
            generationTimeMs: generationTime,
            createdAt: new Date().toISOString(),
          };
          newStagedPhotos.push(stagedPhoto);

          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, status: "complete" } : q
            )
          );

          // Save after each successful generation
          updatedListing.stagedPhotos = newStagedPhotos;
          await saveListing(updatedListing);
          setListing({ ...updatedListing });
        } catch (error) {
          console.error("Staging failed:", error);
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, status: "failed" } : q
            )
          );
        }

        // Rate limit delay
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

      // Auto-start staging if autoStage flag is set and we haven't started yet
      if (!stagingStarted) {
        const autoStage = searchParams.get("autoStage");
        const stylesParam = searchParams.get("styles");
        if (
          autoStage === "true" &&
          stylesParam &&
          data &&
          data.stagedPhotos.length === 0
        ) {
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

  const handleRefine = async (
    stagedPhoto: StagedPhoto,
    instruction: string
  ) => {
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
        body: JSON.stringify({
          imageBase64: base64,
          mimeType,
          instruction,
          apiKey,
        }),
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
              ? {
                  ...sp,
                  dataUrl: `data:${data.mimeType};base64,${data.imageBase64}`,
                  createdAt: new Date().toISOString(),
                }
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
      alert(
        `Refinement failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
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
      // Small delay between downloads so browser doesn't block them
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-slate hover:text-navy mb-2"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
          <h1 className="font-serif text-2xl text-navy">{listing.name}</h1>
          {listing.address && (
            <p className="text-sm text-slate">{listing.address}</p>
          )}
          <p className="text-xs text-slate mt-1">
            {listing.photos.length} photo{listing.photos.length !== 1 ? "s" : ""}
            {listing.stagedPhotos.length > 0 &&
              ` · ${listing.stagedPhotos.length} staged`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {listing.stagedPhotos.length > 0 && (
            <>
              <button
                onClick={() =>
                  setViewMode(viewMode === "grid" ? "compare" : "grid")
                }
                className="inline-flex items-center gap-2 border border-navy/15 text-navy px-3 py-2 rounded-xl text-sm hover:bg-ivory-light transition-colors"
              >
                <Eye size={14} />
                {viewMode === "grid" ? "Compare" : "Grid"}
              </button>
              <button
                onClick={() => setShowExport(true)}
                className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                <Download size={14} />
                Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* Staging Queue */}
      {queue.length > 0 && isStaging && (
        <div className="mb-6">
          <StagingQueue items={queue} />
        </div>
      )}

      {/* Compare View */}
      {viewMode === "compare" && listing.stagedPhotos.length > 0 && (
        <div className="space-y-8 mb-8">
          {listing.photos.map((photo) => {
            const staged = getStyledPhotos(photo.id);
            if (staged.length === 0) return null;
            return (
              <div key={photo.id} className="space-y-4">
                <h3 className="font-serif text-lg text-navy">
                  {ROOM_TYPES.find((r) => r.id === photo.roomType)?.name ||
                    photo.roomType}
                </h3>
                {staged.map((sp) => (
                  <div key={sp.id} className="space-y-2">
                    <BeforeAfterSlider
                      beforeSrc={photo.dataUrl}
                      afterSrc={sp.dataUrl}
                      beforeLabel="Original"
                      afterLabel={sp.style}
                      className="aspect-[4/3] max-w-3xl"
                    />
                    <div className="max-w-3xl">
                      <div className="flex items-center gap-2 text-xs text-slate">
                        <span>{sp.style}</span>
                        <span>&middot;</span>
                        <span>
                          {(sp.generationTimeMs / 1000).toFixed(1)}s
                        </span>
                      </div>
                      <RefinementControls
                        stagedPhoto={sp}
                        isActive={refiningId === sp.id}
                        onActivate={() => setRefiningId(sp.id)}
                        onClose={() => {
                          setRefiningId(null);
                          setRefinementInput("");
                        }}
                        input={refiningId === sp.id ? refinementInput : ""}
                        onInputChange={setRefinementInput}
                        onRefine={(instruction) =>
                          handleRefine(sp, instruction)
                        }
                        loading={refinementLoading && refiningId === sp.id}
                      />
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Grid View */}
      {viewMode === "grid" && (
        <div className="space-y-8">
          {listing.photos.map((photo) => {
            const staged = getStyledPhotos(photo.id);
            return (
              <div key={photo.id}>
                <h3 className="font-serif text-base text-navy mb-3 flex items-center gap-2">
                  {ROOM_TYPES.find((r) => r.id === photo.roomType)?.name ||
                    photo.roomType}
                  {staged.length > 0 && (
                    <span className="text-[10px] font-semibold tracking-wider uppercase text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                      {staged.length} style{staged.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Original */}
                  <div className="rounded-xl overflow-hidden border border-navy/10 shadow-sm">
                    <div className="aspect-[4/3] relative">
                      <img
                        src={photo.dataUrl}
                        alt="Original"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-navy/70 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">
                        Original
                      </div>
                    </div>
                  </div>
                  {/* Staged versions */}
                  {staged.map((sp) => (
                    <div key={sp.id} className="space-y-2">
                      <div className="rounded-xl overflow-hidden border border-gold/20 shadow-sm hover:shadow-md transition-shadow">
                        <div className="aspect-[4/3] relative">
                          <img
                            src={sp.dataUrl}
                            alt={sp.style}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-gold/90 text-navy text-[10px] font-medium px-2 py-0.5 rounded backdrop-blur-sm">
                            {sp.style}
                          </div>
                        </div>
                      </div>
                      <RefinementControls
                        stagedPhoto={sp}
                        isActive={refiningId === sp.id}
                        onActivate={() => setRefiningId(sp.id)}
                        onClose={() => {
                          setRefiningId(null);
                          setRefinementInput("");
                        }}
                        input={refiningId === sp.id ? refinementInput : ""}
                        onInputChange={setRefinementInput}
                        onRefine={(instruction) =>
                          handleRefine(sp, instruction)
                        }
                        loading={refinementLoading && refiningId === sp.id}
                      />
                    </div>
                  ))}
                  {/* Processing placeholder */}
                  {isStaging &&
                    queue.some(
                      (q) =>
                        q.photoId === photo.id &&
                        (q.status === "pending" || q.status === "processing")
                    ) && (
                      <div className="rounded-xl overflow-hidden border border-navy/10 bg-ivory-light">
                        <div className="aspect-[4/3] flex items-center justify-center">
                          <div className="text-center">
                            <Loader2
                              size={24}
                              className="text-gold animate-spin mx-auto mb-2"
                            />
                            <p className="text-xs text-slate">Staging...</p>
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {listing.stagedPhotos.length === 0 &&
        !isStaging &&
        queue.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-navy/10">
            <RotateCcw size={32} className="text-navy/20 mx-auto mb-3" />
            <p className="text-slate text-sm">
              No staged photos yet. Go to{" "}
              <Link href="/listing/new" className="text-gold underline">
                New Listing
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

function RefinementControls({
  stagedPhoto,
  isActive,
  onActivate,
  onClose,
  input,
  onInputChange,
  onRefine,
  loading,
}: {
  stagedPhoto: StagedPhoto;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  input: string;
  onInputChange: (val: string) => void;
  onRefine: (instruction: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-gold animate-pulse py-1">
        <Loader2 size={12} className="animate-spin" />
        Refining image...
      </div>
    );
  }

  if (!isActive) {
    return (
      <button
        onClick={onActivate}
        className="flex items-center gap-1.5 text-xs text-slate hover:text-gold transition-colors py-1"
      >
        <Wand2 size={12} />
        Edit this image
      </button>
    );
  }

  return (
    <div className="space-y-2 bg-ivory-light rounded-xl p-3 border border-navy/5">
      <div className="flex flex-wrap gap-1.5">
        {REFINEMENT_SUGGESTIONS.slice(0, 6).map((suggestion) => (
          <button
            key={suggestion.label}
            onClick={() => onRefine(suggestion.prompt)}
            className="text-[11px] px-2.5 py-1 rounded-full border border-navy/10 bg-white text-navy hover:border-gold hover:text-gold transition-colors"
          >
            {suggestion.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) onRefine(input.trim());
          }}
          placeholder="Describe a change..."
          className="flex-1 text-xs px-3 py-2 rounded-lg border border-navy/10 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-1 focus:ring-gold/30"
        />
        <button
          onClick={() => input.trim() && onRefine(input.trim())}
          disabled={!input.trim()}
          className="px-3 py-2 bg-gold hover:bg-gold-dark text-white rounded-lg text-xs disabled:opacity-40 transition-colors"
        >
          <Send size={12} />
        </button>
        <button
          onClick={onClose}
          className="px-2 py-2 text-slate hover:text-navy text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
