// Local state management for the app (no Supabase dependency for V1 demo)
// Uses localStorage for persistence across sessions

export interface Photo {
  id: string;
  file: File | null;
  dataUrl: string;
  roomType: string;
  fileName: string;
  width: number;
  height: number;
}

export interface StagedPhoto {
  id: string;
  photoId: string;
  style: string;
  dataUrl: string;
  generationTimeMs: number;
  createdAt: string;
}

export interface Listing {
  id: string;
  name: string;
  address: string;
  photos: Photo[];
  stagedPhotos: StagedPhoto[];
  createdAt: string;
}

const LISTINGS_KEY = "stageai_listings";
const API_KEY_KEY = "stageai_gemini_key";

export function getListings(): Listing[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(LISTINGS_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveListing(listing: Listing): void {
  const listings = getListings();
  const index = listings.findIndex((l) => l.id === listing.id);
  if (index >= 0) {
    listings[index] = listing;
  } else {
    listings.push(listing);
  }
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

export function getListing(id: string): Listing | null {
  const listings = getListings();
  return listings.find((l) => l.id === id) || null;
}

export function deleteListing(id: string): void {
  const listings = getListings().filter((l) => l.id !== id);
  localStorage.setItem(LISTINGS_KEY, JSON.stringify(listings));
}

export function getApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_KEY_KEY) || "";
}

export function saveApiKey(key: string): void {
  localStorage.setItem(API_KEY_KEY, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_KEY);
}
