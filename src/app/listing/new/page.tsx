"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import PhotoUploader from "@/components/PhotoUploader";
import StyleSelector from "@/components/StyleSelector";
import { type Photo, saveListing } from "@/lib/store";
import { getApiKey } from "@/lib/store";
import type { StyleId, ColorPreferenceId } from "@/lib/constants";
import { v4 as uuidv4 } from "uuid";

export default function NewListingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<StyleId[]>([]);
  const [colorPreference, setColorPreference] =
    useState<ColorPreferenceId | null>(null);
  const [customInstructions, setCustomInstructions] = useState("");
  const [saving, setSaving] = useState(false);
  const apiKey = typeof window !== "undefined" ? getApiKey() : "";

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
        name: name || "Untitled Listing",
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s === step
                  ? "bg-gold text-white"
                  : s < step
                  ? "bg-gold/20 text-gold"
                  : "bg-navy/5 text-navy/30"
              }`}
            >
              {s}
            </div>
            <span
              className={`text-sm hidden sm:block ${
                s === step ? "text-navy font-medium" : "text-slate"
              }`}
            >
              {s === 1 ? "Details" : s === 2 ? "Photos" : "Style"}
            </span>
            {s < 3 && <div className="w-8 h-px bg-navy/10" />}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-2xl text-navy">New Listing</h1>
            <p className="text-sm text-slate mt-1">
              Give your listing a name and optional address.
            </p>
          </div>
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">
                Listing Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., 123 Ocean Drive — Living Spaces"
                className="w-full px-4 py-2.5 rounded-xl border border-navy/15 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy mb-1.5">
                Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Ocean Drive, Miami Beach, FL"
                className="w-full px-4 py-2.5 rounded-xl border border-navy/15 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold"
              />
            </div>
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!name.trim()}
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next: Upload Photos
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {/* Step 2: Photos */}
      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-2xl text-navy">Upload Photos</h1>
            <p className="text-sm text-slate mt-1">
              Add property photos. Room types are auto-detected.
            </p>
          </div>
          <PhotoUploader
            photos={photos}
            onPhotosChange={setPhotos}
            apiKey={apiKey}
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 border border-navy/15 text-navy px-5 py-2.5 rounded-xl font-medium text-sm transition-colors hover:bg-ivory-light"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={photos.length === 0}
              className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Choose Style
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Style */}
      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-2xl text-navy">Choose Style</h1>
            <p className="text-sm text-slate mt-1">
              Pick a style for your staging. Select up to 3 to compare.
            </p>
          </div>
          <StyleSelector
            selected={selectedStyles}
            onToggle={toggleStyle}
            colorPreference={colorPreference}
            onColorChange={setColorPreference}
          />
          <div>
            <label className="block text-sm font-medium text-navy mb-1.5">
              Custom Instructions (optional)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Keep it minimal with a focus on warm wood tones. No plants."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-navy/15 bg-white text-navy placeholder:text-navy/30 focus:outline-none focus:ring-2 focus:ring-gold/30 focus:border-gold resize-none text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 border border-navy/15 text-navy px-5 py-2.5 rounded-xl font-medium text-sm transition-colors hover:bg-ivory-light"
            >
              <ArrowLeft size={16} />
              Back
            </button>
            <button
              onClick={handleCreate}
              disabled={selectedStyles.length === 0 || saving}
              className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  Stage {photos.length} Photo{photos.length !== 1 ? "s" : ""}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
          {!apiKey && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
              <strong>Note:</strong> Add your Gemini API key in{" "}
              <a href="/settings" className="underline font-medium">
                Settings
              </a>{" "}
              before staging.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
