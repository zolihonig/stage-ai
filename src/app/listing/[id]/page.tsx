"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Eye,
  Loader2,
} from "lucide-react";
import { getListing, saveListing, getApiKey } from "@/lib/store";
import type { Listing, StagedPhoto } from "@/lib/store";
import { STYLES, ROOM_TYPES } from "@/lib/constants";
import type { StyleId } from "@/lib/constants";
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
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isStaging, setIsStaging] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "compare">("grid");

  useEffect(() => {
    const data = getListing(id);
    setListing(data);

    // Auto-start staging if styles are in URL
    const stylesParam = searchParams.get("styles");
    if (stylesParam && data && data.stagedPhotos.length === 0) {
      const styles = stylesParam.split(",") as StyleId[];
      const instructions = searchParams.get("instructions") || "";
      startStaging(data, styles, instructions);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startStaging = useCallback(
    async (
      currentListing: Listing,
      styles: StyleId[],
      instructions: string
    ) => {
      const apiKey = getApiKey();
      if (!apiKey) {
        alert("Please add your Gemini API key in Settings first.");
        return;
      }

      setIsStaging(true);

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

      // Process sequentially with delays for rate limiting
      const updatedListing = { ...currentListing };
      const newStagedPhotos: StagedPhoto[] = [...currentListing.stagedPhotos];

      for (let i = 0; i < queueItems.length; i++) {
        const item = queueItems[i];
        const photo = currentListing.photos.find(
          (p) => p.id === item.photoId
        );
        if (!photo) continue;

        // Update status to processing
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
              instructions,
              apiKey,
            }),
          });

          if (!res.ok) {
            throw new Error(`API error: ${res.status}`);
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

          // Update queue status
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, status: "complete" } : q
            )
          );

          // Save after each successful generation
          updatedListing.stagedPhotos = newStagedPhotos;
          saveListing(updatedListing);
          setListing({ ...updatedListing });
        } catch (error) {
          console.error("Staging failed:", error);
          setQueue((prev) =>
            prev.map((q, idx) =>
              idx === i ? { ...q, status: "failed" } : q
            )
          );
        }

        // Rate limit: wait between requests
        if (i < queueItems.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }

      setIsStaging(false);
    },
    []
  );

  const handleExport = async () => {
    if (!listing) return;
    // Download staged photos as individual files
    for (const staged of listing.stagedPhotos) {
      const link = document.createElement("a");
      link.href = staged.dataUrl;
      const photo = listing.photos.find((p) => p.id === staged.photoId);
      link.download = `${listing.name}-${photo?.roomType || "room"}-${staged.style}.jpg`;
      link.click();
    }
    setShowExport(false);
  };

  if (!listing) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={24} className="text-gold animate-spin" />
      </div>
    );
  }

  const getStyledPhotos = (photoId: string) =>
    listing.stagedPhotos.filter((sp) => sp.photoId === photoId);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-slate hover:text-navy mb-2"
          >
            <ArrowLeft size={14} />
            Back to Dashboard
          </Link>
          <h1 className="font-serif text-2xl text-navy">{listing.name}</h1>
          {listing.address && (
            <p className="text-sm text-slate">{listing.address}</p>
          )}
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
        <div className="space-y-6 mb-8">
          {listing.photos.map((photo) => {
            const staged = getStyledPhotos(photo.id);
            if (staged.length === 0) return null;
            return (
              <div key={photo.id} className="space-y-3">
                <h3 className="font-serif text-lg text-navy">
                  {ROOM_TYPES.find((r) => r.id === photo.roomType)?.name ||
                    photo.roomType}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {staged.map((sp) => (
                    <div key={sp.id}>
                      <BeforeAfterSlider
                        beforeSrc={photo.dataUrl}
                        afterSrc={sp.dataUrl}
                        beforeLabel="Original"
                        afterLabel={sp.style}
                        className="aspect-[4/3]"
                      />
                      <p className="text-xs text-slate mt-1.5 text-center">
                        {sp.style} — {(sp.generationTimeMs / 1000).toFixed(1)}s
                      </p>
                    </div>
                  ))}
                </div>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
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
                    <div
                      key={sp.id}
                      className="rounded-xl overflow-hidden border border-gold/20 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        setSelectedPhoto(photo.id);
                        setSelectedStyle(sp.id);
                        setViewMode("compare");
                      }}
                    >
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

      {/* No staged photos and not staging */}
      {listing.stagedPhotos.length === 0 && !isStaging && (
        <div className="text-center py-12 bg-white rounded-2xl border border-navy/10">
          <RefreshCw size={32} className="text-navy/20 mx-auto mb-3" />
          <p className="text-slate text-sm">
            No staged photos yet. Go to{" "}
            <Link href="/listing/new" className="text-gold underline">
              New Listing
            </Link>{" "}
            to start staging.
          </p>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        photoCount={listing.stagedPhotos.length}
        onExport={handleExport}
      />
    </div>
  );
}
