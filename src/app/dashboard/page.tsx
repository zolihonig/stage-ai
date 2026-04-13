"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Image, Clock, Trash2, ArrowRight, Sparkles } from "lucide-react";
import { getListings, deleteListing, type Listing } from "@/lib/store";

export default function DashboardPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListings = async () => {
    const data = await getListings();
    data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setListings(data);
    setLoading(false);
  };

  useEffect(() => {
    loadListings();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing and all its staged photos?")) return;
    await deleteListing(id);
    loadListings();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-40 bg-navy/5 rounded-lg animate-pulse" />
            <div className="h-4 w-24 bg-navy/5 rounded mt-2 animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-navy/5 rounded-xl animate-pulse" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-navy/5 overflow-hidden">
              <div className="aspect-[4/3] bg-navy/[0.03] animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 bg-navy/5 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-navy/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-navy">Your Listings</h1>
          <p className="text-sm text-slate mt-1">
            {listings.length === 0
              ? "No listings yet"
              : `${listings.length} listing${listings.length !== 1 ? "s" : ""} · ${listings.reduce((sum, l) => sum + l.stagedPhotos.length, 0)} staged photos`}
          </p>
        </div>
        <Link
          href="/listing/new"
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-sm shadow-gold/10"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">New Listing</span>
        </Link>
      </div>

      {/* Empty state */}
      {listings.length === 0 && (
        <div className="text-center py-16 sm:py-24">
          <div className="w-20 h-20 bg-gold/[0.07] rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Sparkles size={36} className="text-gold/60" />
          </div>
          <h2 className="font-serif text-2xl text-navy mb-2">Stage your first listing</h2>
          <p className="text-slate text-sm max-w-sm mx-auto mb-8 leading-relaxed">
            Upload property photos, choose a designer style, and get
            photorealistic staged images in seconds.
          </p>
          <Link
            href="/listing/new"
            className="inline-flex items-center gap-2 bg-navy hover:bg-navy-dark text-white px-6 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Upload Photos
            <ArrowRight size={16} />
          </Link>
        </div>
      )}

      {/* Listings grid */}
      {listings.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((listing) => {
            const coverPhoto = listing.stagedPhotos[listing.stagedPhotos.length - 1]?.dataUrl || listing.photos[0]?.dataUrl;
            const stagedCount = listing.stagedPhotos.length;
            return (
              <Link
                key={listing.id}
                href={`/listing/${listing.id}`}
                className="group bg-white rounded-2xl border border-navy/[0.06] overflow-hidden shadow-sm hover:shadow-lg hover:border-navy/10 transition-all duration-300"
              >
                <div className="aspect-[4/3] bg-ivory relative overflow-hidden img-hover-zoom">
                  {coverPhoto ? (
                    <img
                      src={coverPhoto}
                      alt={listing.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={32} className="text-navy/10" />
                    </div>
                  )}
                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-navy/0 group-hover:bg-navy/10 transition-colors duration-300" />
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDelete(listing.id);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <Trash2 size={14} />
                  </button>
                  {/* Staged badge */}
                  {stagedCount > 0 && (
                    <div className="absolute bottom-3 left-3 bg-gold/90 text-white text-[10px] font-semibold tracking-wide px-2.5 py-1 rounded-lg backdrop-blur-sm">
                      {stagedCount} STAGED
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-base text-navy font-medium truncate">
                    {listing.name}
                  </h3>
                  {listing.address && (
                    <p className="text-xs text-slate mt-0.5 truncate">{listing.address}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2.5 text-xs text-slate">
                    <span className="flex items-center gap-1">
                      <Image size={11} />
                      {listing.photos.length} photo{listing.photos.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
