"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import PhotoUploader from "@/components/PhotoUploader";
import StyleSelector from "@/components/StyleSelector";
import CloudImport from "@/components/CloudImport";
import RealtyImport from "@/components/RealtyImport";
import { type Photo, saveListing } from "@/lib/store";
import type { StyleId, ColorPreferenceId } from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";

export default function NewListingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<StyleId[]>([]);
  const [colorPreference, setColorPreference] = useState<ColorPreferenceId | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleStyle = (id: StyleId) => {
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const listingId = uuidv4();
      const listing = {
        id: listingId,
        name: name || `Listing ${new Date().toLocaleDateString()}`,
        address,
        photos: photos.map((p) => ({ ...p, file: null })),
        stagedPhotos: [],
        createdAt: new Date().toISOString(),
      };
      await saveListing(listing);

      const params = new URLSearchParams();
      params.set("styles", selectedStyles.join(","));
      if (colorPreference) params.set("color", colorPreference);
      if (customInstructions) params.set("instructions", customInstructions);
      params.set("autoStage", "true");

      router.push(`/listing/${listingId}?${params.toString()}`);
    } catch (error) {
      console.error("Failed to save listing:", error);
      alert("Failed to save listing. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Steps */}
      <div className="flex items-center gap-3 mb-6">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              s === step ? "bg-gold text-white" : s < step ? "bg-gold/20 text-gold" : "bg-navy/5 text-navy/30"
            }`}>
              {s}
            </div>
            <span className={`text-sm ${s === step ? "text-navy font-medium" : "text-slate"}`}>
              {s === 1 ? "Photos" : "Style"}
            </span>
            {s < 2 && <div className="w-6 h-px bg-navy/10" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload Photos */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h1 className="font-serif text-2xl text-navy">Upload Photos</h1>
            <p className="text-sm text-slate mt-1">
              Add your property photos. Room types are detected automatically.
            </p>
          </div>

          <PhotoUploader photos={photos} onPhotosChange={setPhotos} />

          {/* Cloud import */}
          <CloudImport
            onImport={(imported) => {
              const newPhotos = imported.map((img) => ({
                id: uuidv4(),
                file: null,
                dataUrl: img.dataUrl,
                roomType: "living_room" as const,
                fileName: img.fileName,
                width: 0,
                height: 0,
              }));
              setPhotos((prev) => [...prev, ...newPhotos]);
            }}
          />

          {/* MLS import via RealtyAPI */}
          <RealtyImport
            onImport={(imported, importedAddress) => {
              const newPhotos = imported.map((img) => ({
                id: uuidv4(),
                file: null,
                dataUrl: img.dataUrl,
                roomType: "living_room" as const,
                fileName: img.fileName,
                width: 0,
                height: 0,
              }));
              setPhotos((prev) => [...prev, ...newPhotos]);
              if (importedAddress && !address) {
                setAddress(importedAddress);
                if (!name) setName(importedAddress);
                setShowDetails(true);
              }
            }}
          />

          {/* Optional listing details — collapsed by default */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-1.5 text-xs text-slate hover:text-navy transition-colors"
          >
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showDetails ? "Hide" : "Add"} listing details (optional)
          </button>

          {showDetails && (
            <div className="space-y-3 bg-ivory-light/50 rounded-xl p-4 border border-navy/5">
              <div>
                <label className="block text-xs font-medium text-navy mb-1">Listing Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., 123 Ocean Drive"
                  className="w-full px-3 py-2 rounded-lg border border-navy/10 bg-white text-sm text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-navy mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Ocean Drive, Miami Beach, FL"
                  className="w-full px-3 py-2 rounded-lg border border-navy/10 bg-white text-sm text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
                />
              </div>
            </div>
          )}

          <button
            onClick={() => setStep(2)}
            disabled={photos.length === 0}
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Choose Style
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: Style */}
      {step === 2 && (
        <div className="space-y-5">
          <div>
            <h1 className="font-serif text-2xl text-navy">Choose Style</h1>
            <p className="text-sm text-slate mt-1">
              {photos.length > 1
                ? `We'll preview the first photo, then stage all ${photos.length} if you like it.`
                : "Pick a style and we'll stage your photo."}
            </p>
          </div>

          <StyleSelector
            selected={selectedStyles}
            onToggle={toggleStyle}
            colorPreference={colorPreference}
            onColorChange={setColorPreference}
          />

          <div>
            <label className="block text-xs font-medium text-navy mb-1">
              Custom Instructions (optional)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Keep it minimal. Warm wood tones. No plants."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-navy/10 bg-white text-sm text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold resize-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 border border-navy/10 text-navy px-4 py-2.5 rounded-xl text-sm transition-colors hover:bg-ivory-light"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={selectedStyles.length === 0 || saving}
              className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {photos.length > 1 ? "Preview & Stage" : `Stage ${photos.length} Photo`}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
