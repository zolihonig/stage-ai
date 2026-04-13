"use client";

import { useState, useEffect } from "react";
import { User, Trash2, HardDrive } from "lucide-react";
import { getListings, type Listing } from "@/lib/store";

export default function SettingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [storageUsed, setStorageUsed] = useState("Calculating...");

  useEffect(() => {
    getListings().then((l) => {
      setListings(l);
      // Estimate storage from data URLs
      let bytes = 0;
      for (const listing of l) {
        for (const p of listing.photos) bytes += p.dataUrl?.length || 0;
        for (const s of listing.stagedPhotos) bytes += s.dataUrl?.length || 0;
      }
      const mb = (bytes / 1024 / 1024).toFixed(1);
      setStorageUsed(`${mb} MB`);
    });
  }, []);

  const clearAllData = () => {
    if (!confirm("Delete all listings and staged photos? This cannot be undone.")) return;
    indexedDB.deleteDatabase("stageai");
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-serif text-2xl sm:text-3xl text-navy mb-8">Settings</h1>

      {/* Account */}
      <div className="bg-white rounded-2xl border border-navy/10 p-6 space-y-5 mb-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-navy/5 rounded-xl flex items-center justify-center shrink-0">
            <User size={20} className="text-navy/40" />
          </div>
          <div>
            <h2 className="font-serif text-lg text-navy">Account</h2>
            <p className="text-sm text-slate mt-0.5">
              StageAI beta — all features unlocked. Staging is powered by
              Claude AI + Gemini.
            </p>
          </div>
        </div>
        <div className="bg-gold/5 border border-gold/20 rounded-xl p-4">
          <p className="text-sm text-navy font-medium">Beta Access</p>
          <p className="text-xs text-slate mt-0.5">
            You have unlimited access during the beta period. No API key needed.
          </p>
        </div>
      </div>

      {/* Storage */}
      <div className="bg-white rounded-2xl border border-navy/10 p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-navy/5 rounded-xl flex items-center justify-center shrink-0">
            <HardDrive size={20} className="text-navy/40" />
          </div>
          <div>
            <h2 className="font-serif text-lg text-navy">Local Storage</h2>
            <p className="text-sm text-slate mt-0.5">
              Photos and staged images are stored in your browser.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate">
            {listings.length} listing{listings.length !== 1 ? "s" : ""} · {storageUsed} used
          </span>
        </div>
        <button
          onClick={clearAllData}
          className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 transition-colors"
        >
          <Trash2 size={14} />
          Clear All Data
        </button>
      </div>
    </div>
  );
}
