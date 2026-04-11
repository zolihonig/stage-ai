// IndexedDB-based storage for listings and images
// localStorage is only 5MB — base64 photos blow past that instantly
// IndexedDB has virtually unlimited storage

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

const DB_NAME = "stageai";
const DB_VERSION = 1;
const STORE_NAME = "listings";
const API_KEY_KEY = "stageai_gemini_key";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getListings(): Promise<Listing[]> {
  if (typeof window === "undefined") return [];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveListing(listing: Listing): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    // Strip File objects before saving (not serializable to IndexedDB structured clone)
    const cleaned = {
      ...listing,
      photos: listing.photos.map((p) => ({ ...p, file: null })),
    };
    const request = store.put(cleaned);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getListing(id: string): Promise<Listing | null> {
  if (typeof window === "undefined") return null;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteListing(id: string): Promise<void> {
  if (typeof window === "undefined") return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// API key stays in localStorage — it's tiny
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
