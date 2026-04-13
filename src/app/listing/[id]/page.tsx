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
  History,
  ChevronLeft,
  ChevronRight,
  Palette,
  X,
  Sparkles,
} from "lucide-react";
import { getListing, saveListing } from "@/lib/store";
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
import { showToast } from "@/components/Toast";

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

  // Per-image UI state
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [refinementInput, setRefinementInput] = useState("");
  const [refinementLoading, setRefinementLoading] = useState(false);
  const [sliderMode, setSliderMode] = useState<Set<string>>(new Set());
  const [failedPhotos, setFailedPhotos] = useState<Map<string, { style: string; error: string }>>(new Map());
  const [retrying, setRetrying] = useState<Set<string>>(new Set());
  // Which version is currently shown for each photo (index into staged array)
  const [activeVersion, setActiveVersion] = useState<Record<string, number>>({});
  // Show history panel for a photo
  const [historyOpen, setHistoryOpen] = useState<string | null>(null);
  // Show style picker for re-staging
  const [stylePickerOpen, setStylePickerOpen] = useState<string | null>(null);
  // Preview mode: stage first photo, ask for approval before batch
  const [previewMode, setPreviewMode] = useState(false);
  const [previewApproved, setPreviewApproved] = useState(false);
  const [pendingBatchArgs, setPendingBatchArgs] = useState<{ listing: Listing; styles: StyleId[]; colorPref: ColorPreferenceId | null; instructions: string } | null>(null);

  const toggleSlider = (id: string) => {
    setSliderMode((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const stagePhotos = useCallback(
    async (
      currentListing: Listing,
      photosToStage: typeof currentListing.photos,
      styles: StyleId[],
      colorPref: ColorPreferenceId | null,
      instructions: string
    ) => {
      setIsStaging(true);
      const colorName = colorPref
        ? COLOR_PREFERENCES.find((c) => c.id === colorPref)?.description || ""
        : "";

      const queueItems: QueueItem[] = [];
      for (const photo of photosToStage) {
        for (const style of styles) {
          const styleName = STYLES.find((s) => s.id === style)?.name || style;
          queueItems.push({ photoId: photo.id, photoName: photo.fileName, style: styleName, status: "pending" });
        }
      }
      setQueue((prev) => [...prev, ...queueItems]);

      const updatedListing = { ...currentListing };
      const newStagedPhotos: StagedPhoto[] = [...currentListing.stagedPhotos];

      for (let i = 0; i < queueItems.length; i++) {
        const item = queueItems[i];
        const photo = currentListing.photos.find((p) => p.id === item.photoId);
        if (!photo) continue;

        setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: "processing" } : q)));

        try {
          const { base64, mimeType } = await resizeImageForApi(photo.dataUrl);
          const roomTypeName = ROOM_TYPES.find((r) => r.id === photo.roomType)?.name || photo.roomType;
          const startTime = Date.now();

          const res = await fetch("/api/stage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageBase64: base64, mimeType, style: item.style, roomType: roomTypeName, colorPreference: colorName, instructions }),
          });

          if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `API error: ${res.status}`); }

          const data = await res.json();
          newStagedPhotos.push({
            id: uuidv4(), photoId: item.photoId, style: item.style,
            dataUrl: `data:${data.mimeType};base64,${data.imageBase64}`,
            generationTimeMs: Date.now() - startTime, createdAt: new Date().toISOString(),
          });

          setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: "complete" } : q)));
          updatedListing.stagedPhotos = newStagedPhotos;
          await saveListing(updatedListing);
          setListing({ ...updatedListing });
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : "Unknown error";
          setQueue((prev) => prev.map((q, idx) => (idx === i ? { ...q, status: "failed" } : q)));
          setFailedPhotos((prev) => { const n = new Map(prev); n.set(item.photoId, { style: item.style, error: errMsg }); return n; });
        }

        if (i < queueItems.length - 1) await new Promise((r) => setTimeout(r, 8000));
      }
      setIsStaging(false);
      const successCount = queueItems.filter((_, idx) => {
        const q = document.querySelector(`[data-queue-idx="${idx}"]`);
        return !q; // fallback
      }).length;
      // Count from state
      showToast(`Staging complete! ${newStagedPhotos.length - (currentListing.stagedPhotos?.length || 0)} photos staged.`, "success");
    },
    []
  );

  // Preview-first staging: stage first photo, wait for approval, then batch the rest
  const startStaging = useCallback(
    async (
      currentListing: Listing,
      styles: StyleId[],
      colorPref: ColorPreferenceId | null,
      instructions: string
    ) => {
      if (currentListing.photos.length > 1) {
        // Preview mode: stage just the first photo
        setPreviewMode(true);
        setPendingBatchArgs({ listing: currentListing, styles, colorPref, instructions });
        await stagePhotos(currentListing, [currentListing.photos[0]], styles, colorPref, instructions);
      } else {
        // Single photo, just stage it
        await stagePhotos(currentListing, currentListing.photos, styles, colorPref, instructions);
      }
    },
    [stagePhotos]
  );

  // Called when user approves the preview
  const approveAndStageAll = useCallback(async () => {
    if (!pendingBatchArgs || !listing) return;
    const { styles, colorPref, instructions } = pendingBatchArgs;
    setPreviewMode(false);
    setPreviewApproved(true);
    // Stage remaining photos (skip the first one, already done)
    const remaining = listing.photos.slice(1);
    if (remaining.length > 0) {
      await stagePhotos(listing, remaining, styles, colorPref, instructions);
    }
    setPendingBatchArgs(null);
  }, [pendingBatchArgs, listing, stagePhotos]);

  // Re-stage a single photo with a new style
  const restageWithStyle = useCallback(
    async (photoId: string, styleName: string) => {
      if (!listing) return;
      // API key is server-side now

      const photo = listing.photos.find((p) => p.id === photoId);
      if (!photo) return;

      setStylePickerOpen(null);
      setRetrying((prev) => new Set(prev).add(photoId));

      try {
        const { base64, mimeType } = await resizeImageForApi(photo.dataUrl);
        const roomTypeName = ROOM_TYPES.find((r) => r.id === photo.roomType)?.name || photo.roomType;
        const startTime = Date.now();

        const res = await fetch("/api/stage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, mimeType, style: styleName, roomType: roomTypeName }),
        });

        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || `API error`); }
        const data = await res.json();

        const newStaged: StagedPhoto = {
          id: uuidv4(), photoId, style: styleName,
          dataUrl: `data:${data.mimeType};base64,${data.imageBase64}`,
          generationTimeMs: Date.now() - startTime, createdAt: new Date().toISOString(),
        };

        const updatedListing = { ...listing, stagedPhotos: [...listing.stagedPhotos, newStaged] };
        await saveListing(updatedListing);
        setListing(updatedListing);
        // Show the new version
        const allForPhoto = updatedListing.stagedPhotos.filter((s) => s.photoId === photoId);
        setActiveVersion((prev) => ({ ...prev, [photoId]: allForPhoto.length - 1 }));
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : "Unknown error";
        setFailedPhotos((prev) => { const n = new Map(prev); n.set(photoId, { style: styleName, error: errMsg }); return n; });
      } finally {
        setRetrying((prev) => { const n = new Set(prev); n.delete(photoId); return n; });
      }
    },
    [listing]
  );

  const retryPhoto = useCallback(
    async (photoId: string) => {
      const failInfo = failedPhotos.get(photoId);
      const style = failInfo?.style || "Modern Minimalist";
      setFailedPhotos((prev) => { const n = new Map(prev); n.delete(photoId); return n; });
      await restageWithStyle(photoId, style);
    },
    [failedPhotos, restageWithStyle]
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
    setRefinementLoading(true);
    try {
      const base64 = stagedPhoto.dataUrl.split(",")[1];
      const mimeType = stagedPhoto.dataUrl.split(";")[0].split(":")[1];
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType, instruction }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || "Refinement failed"); }
      const data = await res.json();

      if (listing) {
        // Keep old version, add new one
        const newVersion: StagedPhoto = {
          id: uuidv4(), photoId: stagedPhoto.photoId, style: stagedPhoto.style + " (edited)",
          dataUrl: `data:${data.mimeType};base64,${data.imageBase64}`,
          generationTimeMs: 0, createdAt: new Date().toISOString(),
        };
        const updatedListing = { ...listing, stagedPhotos: [...listing.stagedPhotos, newVersion] };
        await saveListing(updatedListing);
        setListing(updatedListing);
        const allForPhoto = updatedListing.stagedPhotos.filter((s) => s.photoId === stagedPhoto.photoId);
        setActiveVersion((prev) => ({ ...prev, [stagedPhoto.photoId]: allForPhoto.length - 1 }));
      }
      setRefiningId(null);
      setRefinementInput("");
      showToast("Image refined successfully!", "success");
    } catch (error) {
      showToast(`Refinement failed: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
    } finally {
      setRefinementLoading(false);
    }
  };

  // Export is handled by ExportModal component

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 size={24} className="text-gold animate-spin" /></div>;
  if (!listing) return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 text-center"><p className="text-slate">Listing not found.</p><Link href="/dashboard" className="text-gold underline text-sm mt-2 inline-block">Back to Dashboard</Link></div>;

  const getStyledPhotos = (photoId: string) => listing.stagedPhotos.filter((sp) => sp.photoId === photoId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-5">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate hover:text-navy mb-1"><ArrowLeft size={14} />Dashboard</Link>
          <h1 className="font-serif text-xl sm:text-2xl text-navy">{listing.name}</h1>
          {listing.address && <p className="text-xs sm:text-sm text-slate">{listing.address}</p>}
          <p className="text-xs text-slate mt-0.5">
            {listing.photos.length} photo{listing.photos.length !== 1 ? "s" : ""}
            {listing.stagedPhotos.length > 0 && ` · ${listing.stagedPhotos.length} version${listing.stagedPhotos.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {listing.stagedPhotos.length > 0 && (
          <button onClick={() => setShowExport(true)} className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors self-start">
            <Download size={14} />Export
          </button>
        )}
      </div>

      {queue.length > 0 && isStaging && <div className="mb-5"><StagingQueue items={queue} /></div>}

      {/* Preview approval banner */}
      {previewMode && !isStaging && listing.stagedPhotos.length > 0 && !previewApproved && (
        <div className="mb-5 bg-gold/5 border-2 border-gold/30 rounded-2xl p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-serif text-base text-navy">Preview ready</p>
              <p className="text-sm text-slate mt-0.5">
                Here&apos;s the first photo staged. Happy with it? Stage the remaining {(listing?.photos.length || 1) - 1} photos, or try a different style.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setPreviewMode(false);
                  setStylePickerOpen(listing.photos[0]?.id || null);
                }}
                className="text-sm border border-navy/15 text-navy px-4 py-2 rounded-xl hover:bg-ivory-light transition-colors"
              >
                Try Different Style
              </button>
              <button
                onClick={approveAndStageAll}
                className="text-sm bg-gold hover:bg-gold-dark text-white px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                Stage All {(listing?.photos.length || 1) - 1} Remaining
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Results */}
      <div className="space-y-6">
        {listing.photos.map((photo) => {
          const allVersions = getStyledPhotos(photo.id);
          const versionIdx = activeVersion[photo.id] ?? (allVersions.length - 1);
          const current = allVersions[versionIdx] || null;
          const isProcessing = isStaging && queue.some((q) => q.photoId === photo.id && (q.status === "pending" || q.status === "processing"));
          const isFailed = failedPhotos.has(photo.id);
          const isRetryingThis = retrying.has(photo.id);

          return (
            <div key={photo.id}>
              <h3 className="font-serif text-base text-navy mb-2 flex items-center gap-2">
                {ROOM_TYPES.find((r) => r.id === photo.roomType)?.name || photo.roomType}
                {allVersions.length > 0 && (
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                    {allVersions.length} version{allVersions.length !== 1 ? "s" : ""}
                  </span>
                )}
              </h3>

              {/* Slider mode */}
              {current && sliderMode.has(current.id) ? (
                <div className="relative mb-2">
                  <BeforeAfterSlider beforeSrc={photo.dataUrl} afterSrc={current.dataUrl} beforeLabel="Original" afterLabel={current.style} className="aspect-[4/3] rounded-xl" />
                  <button onClick={() => toggleSlider(current.id)} className="absolute top-2 right-2 z-20 bg-navy/70 hover:bg-navy text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm flex items-center gap-1"><Grid3X3 size={10} />Close</button>
                </div>
              ) : (
                /* Side-by-side grid */
                <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-2">
                  {/* Original */}
                  <div className="rounded-xl overflow-hidden border border-navy/10 shadow-sm">
                    <div className="aspect-[4/3] relative">
                      <img src={photo.dataUrl} alt="Original" className="w-full h-full object-cover" />
                      <div className="absolute top-1.5 left-1.5 bg-navy/70 text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm">Original</div>
                    </div>
                  </div>

                  {/* Staged / Loading / Failed / Empty */}
                  {current ? (
                    <div className="rounded-xl overflow-hidden border border-gold/20 shadow-sm relative group">
                      <div className="aspect-[4/3] relative">
                        <img src={current.dataUrl} alt={current.style} className="w-full h-full object-cover" />
                        <div className="absolute top-1.5 left-1.5 bg-gold/90 text-navy text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded backdrop-blur-sm">{current.style}</div>
                        <button onClick={() => toggleSlider(current.id)} className="absolute top-1.5 right-1.5 bg-navy/70 hover:bg-navy text-white text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded backdrop-blur-sm flex items-center gap-1">
                          <SlidersHorizontal size={10} />Compare
                        </button>
                      </div>
                    </div>
                  ) : isProcessing || isRetryingThis ? (
                    <div className="rounded-xl overflow-hidden border border-navy/10 bg-ivory-light">
                      <div className="aspect-[4/3] flex items-center justify-center">
                        <div className="text-center"><Loader2 size={20} className="text-gold animate-spin mx-auto mb-1" /><p className="text-[10px] text-slate">{isRetryingThis ? "Retrying..." : "Staging..."}</p></div>
                      </div>
                    </div>
                  ) : isFailed ? (
                    <div className="rounded-xl overflow-hidden border border-red-200 bg-red-50/50">
                      <div className="aspect-[4/3] flex items-center justify-center">
                        <div className="text-center px-3">
                          <AlertCircle size={20} className="text-red-400 mx-auto mb-1.5" />
                          <p className="text-[10px] text-red-500 font-medium mb-0.5">Failed</p>
                          <p className="text-[9px] text-red-400 mb-2 line-clamp-2">{failedPhotos.get(photo.id)?.error}</p>
                          <button onClick={() => retryPhoto(photo.id)} className="inline-flex items-center gap-1 text-[11px] font-medium bg-gold hover:bg-gold-dark text-white px-3 py-1.5 rounded-lg"><RefreshCw size={11} />Retry</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-dashed border-navy/10 bg-ivory-light/50">
                      <div className="aspect-[4/3] flex items-center justify-center"><p className="text-[10px] text-slate/50">Not staged</p></div>
                    </div>
                  )}
                </div>
              )}

              {/* Action bar */}
              {(current || allVersions.length > 0) && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    {/* Version navigation */}
                    {allVersions.length > 1 && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setActiveVersion((p) => ({ ...p, [photo.id]: Math.max(0, versionIdx - 1) }))}
                          disabled={versionIdx === 0}
                          className="p-1 rounded text-slate hover:text-navy disabled:opacity-30"
                        ><ChevronLeft size={14} /></button>
                        <span className="text-[10px] text-slate font-medium">{versionIdx + 1} / {allVersions.length}</span>
                        <button
                          onClick={() => setActiveVersion((p) => ({ ...p, [photo.id]: Math.min(allVersions.length - 1, versionIdx + 1) }))}
                          disabled={versionIdx === allVersions.length - 1}
                          className="p-1 rounded text-slate hover:text-navy disabled:opacity-30"
                        ><ChevronRight size={14} /></button>
                        <button
                          onClick={() => setHistoryOpen(historyOpen === photo.id ? null : photo.id)}
                          className="text-[10px] text-slate hover:text-navy flex items-center gap-0.5 ml-1"
                        ><History size={11} />History</button>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setStylePickerOpen(stylePickerOpen === photo.id ? null : photo.id)}
                        className="flex items-center gap-1 text-[11px] font-medium text-navy bg-navy/5 hover:bg-navy/10 px-2.5 py-1.5 rounded-lg transition-colors"
                      ><Palette size={11} />Change Style</button>
                      {current && refiningId !== current.id && (
                        <button
                          onClick={() => setRefiningId(current.id)}
                          className="flex items-center gap-1 text-[11px] font-medium text-gold bg-gold/10 hover:bg-gold/20 px-2.5 py-1.5 rounded-lg transition-colors"
                        ><Wand2 size={11} />Edit / Reprompt</button>
                      )}
                    </div>
                  </div>

                  {current && <span className="text-[10px] text-slate">{current.style} · {(current.generationTimeMs / 1000).toFixed(1)}s · {new Date(current.createdAt).toLocaleTimeString()}</span>}

                  {/* History panel */}
                  {historyOpen === photo.id && allVersions.length > 1 && (
                    <div className="bg-ivory-light rounded-xl p-3 border border-navy/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-navy">Generation History</span>
                        <button onClick={() => setHistoryOpen(null)} className="text-slate hover:text-navy"><X size={14} /></button>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {allVersions.map((v, i) => (
                          <button
                            key={v.id}
                            onClick={() => { setActiveVersion((p) => ({ ...p, [photo.id]: i })); setHistoryOpen(null); }}
                            className={`shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${i === versionIdx ? "border-gold" : "border-transparent hover:border-gold/30"}`}
                          >
                            <img src={v.dataUrl} alt={v.style} className="w-16 h-12 sm:w-20 sm:h-14 object-cover" />
                            <p className="text-[8px] text-center text-slate py-0.5 truncate max-w-16 sm:max-w-20">{v.style}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Style picker for re-staging */}
                  {stylePickerOpen === photo.id && (
                    <div className="bg-ivory-light rounded-xl p-3 border border-navy/5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-navy">Choose a new style</span>
                        <button onClick={() => setStylePickerOpen(null)} className="text-slate hover:text-navy"><X size={14} /></button>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                        {STYLES.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => restageWithStyle(photo.id, s.name)}
                            className="rounded-lg overflow-hidden border border-navy/10 hover:border-gold transition-colors"
                          >
                            <img src={`/styles/${s.id}.png`} alt={s.name} className="w-full aspect-[4/3] object-cover" />
                            <p className="text-[8px] sm:text-[9px] text-center text-navy py-0.5 truncate px-0.5">{s.name}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Refinement panel */}
                  {current && refiningId === current.id && (
                    <RefinementPanel
                      loading={refinementLoading}
                      input={refinementInput}
                      onInputChange={setRefinementInput}
                      onRefine={(instruction) => handleRefine(current, instruction)}
                      onClose={() => { setRefiningId(null); setRefinementInput(""); }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {listing.stagedPhotos.length === 0 && !isStaging && queue.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-navy/10">
          <RotateCcw size={32} className="text-navy/20 mx-auto mb-3" />
          <p className="text-slate text-sm">No staged photos yet. <Link href="/listing/new" className="text-gold underline">Create a new listing</Link> to start.</p>
        </div>
      )}

      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        listingName={listing.name}
        images={listing.stagedPhotos.map((sp) => {
          const photo = listing.photos.find((p) => p.id === sp.photoId);
          return {
            dataUrl: sp.dataUrl,
            fileName: listing.name + "-" + (photo?.roomType || "room"),
            style: sp.style,
            roomType: photo?.roomType || "room",
          };
        })}
      />
    </div>
  );
}

function RefinementPanel({ loading, input, onInputChange, onRefine, onClose }: {
  loading: boolean; input: string; onInputChange: (v: string) => void; onRefine: (i: string) => void; onClose: () => void;
}) {
  if (loading) return <div className="flex items-center gap-2 text-sm text-gold animate-pulse py-2 bg-gold/5 rounded-xl px-3"><Loader2 size={14} className="animate-spin" />Refining...</div>;
  return (
    <div className="space-y-2.5 bg-ivory-light rounded-xl p-3 border border-navy/5">
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {REFINEMENT_SUGGESTIONS.map((s) => (
          <button key={s.label} onClick={() => onRefine(s.prompt)} className="text-xs px-3 py-1.5 rounded-full border border-navy/10 bg-white text-navy hover:border-gold hover:text-gold transition-colors whitespace-nowrap shrink-0">{s.label}</button>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="text" value={input} onChange={(e) => onInputChange(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && input.trim()) onRefine(input.trim()); }} placeholder="Describe a change..." className="flex-1 text-sm px-3 py-2.5 rounded-lg border border-navy/10 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-1 focus:ring-gold/30" autoFocus />
        <button onClick={() => input.trim() && onRefine(input.trim())} disabled={!input.trim()} className="px-4 py-2.5 bg-gold hover:bg-gold-dark text-white rounded-lg text-sm disabled:opacity-40 transition-colors"><Send size={14} /></button>
      </div>
      <button onClick={onClose} className="text-xs text-slate hover:text-navy w-full text-center py-1">Cancel</button>
    </div>
  );
}
