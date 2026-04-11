"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Image, Clock, Trash2 } from "lucide-react";
import { getListings, deleteListing, type Listing } from "@/lib/store";

export default function DashboardPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const loadListings = async () => {
    const data = await getListings();
    // Sort newest first
    data.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-navy/5 rounded w-48" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-[4/3] bg-navy/5 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-navy">
            Your Listings
          </h1>
          <p className="text-sm text-slate mt-1">
            {listings.length} listing{listings.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/listing/new"
          className="inline-flex items-center gap-2 bg-gold hover:bg-gold-dark text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
        >
          <Plus size={16} />
          New Listing
        </Link>
      </div>

      {/* Empty state */}
      {listings.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gold/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Image size={32} className="text-gold" />
          </div>
          <h2 className="font-serif text-xl text-navy mb-2">
            No listings yet
          </h2>
          <p className="text-slate text-sm max-w-sm mx-auto mb-6">
            Upload property photos, pick a style, and get photorealistic staged
            images in minutes.
          </p>
          <Link
            href="/listing/new"
            className="inline-flex items-center gap-2 bg-navy hover:bg-navy-dark text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Create Your First Listing
          </Link>
        </div>
      )}

      {/* Listings grid */}
      {listings.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {listings.map((listing) => {
            const coverPhoto =
              listing.stagedPhotos[0]?.dataUrl ||
              listing.photos[0]?.dataUrl;
            return (
              <Link
                key={listing.id}
                href={`/listing/${listing.id}`}
                className="group bg-white rounded-2xl border border-navy/10 overflow-hidden shadow-sm hover:shadow-lg transition-all"
              >
                <div className="aspect-[4/3] bg-ivory relative overflow-hidden">
                  {coverPhoto ? (
                    <img
                      src={coverPhoto}
                      alt={listing.name}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image size={32} className="text-navy/20" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(listing.id);
                      }}
                      className="w-8 h-8 bg-black/40 hover:bg-red-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-serif text-base text-navy font-medium truncate">
                    {listing.name}
                  </h3>
                  {listing.address && (
                    <p className="text-xs text-slate mt-0.5 truncate">
                      {listing.address}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate">
                    <span className="flex items-center gap-1">
                      <Image size={12} />
                      {listing.photos.length} photo
                      {listing.photos.length !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {listing.stagedPhotos.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] font-semibold tracking-wider uppercase text-gold">
                        {listing.stagedPhotos.length} staged
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
