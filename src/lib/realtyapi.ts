// RealtyAPI (realtyapi.io) client.
//
// The integration assumes a REST API with Bearer-token auth — the standard
// shape for keys prefixed `rt_`. If realtyapi.io's actual paths or response
// fields differ, override via the env vars below; no code changes needed:
//
//   REALTYAPI_KEY            (required) — server-side API key
//   REALTYAPI_BASE_URL       default: https://api.realtyapi.io
//   REALTYAPI_SEARCH_PATH    default: /v1/listings/search   ?q=<address>
//   REALTYAPI_LISTING_PATH   default: /v1/listings/{id}
//
// Response normalization is lenient: we look for photos at common key
// names (photos, images, media, Media) and pick whichever shape is present.
// Each photo can be a string URL or an object containing a URL field.
//
// Never call this from the browser — it would expose the key.

const BASE_URL = process.env.REALTYAPI_BASE_URL || "https://api.realtyapi.io";
const SEARCH_PATH = process.env.REALTYAPI_SEARCH_PATH || "/v1/listings/search";
const LISTING_PATH = process.env.REALTYAPI_LISTING_PATH || "/v1/listings/{id}";

export interface RealtyListingSummary {
  id: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  mlsId?: string;
  photoCount?: number;
  thumbnailUrl?: string;
}

export interface RealtyListingDetail extends RealtyListingSummary {
  photoUrls: string[];
}

class RealtyApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function getKey(): string {
  const key = process.env.REALTYAPI_KEY;
  if (!key) {
    throw new RealtyApiError(
      "REALTYAPI_KEY is not configured on the server",
      500
    );
  }
  return key;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${getKey()}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new RealtyApiError(
      `RealtyAPI ${res.status}: ${text.slice(0, 300) || res.statusText}`,
      res.status
    );
  }

  return (await res.json()) as T;
}

// Pick the first defined value among a list of candidate keys on an object.
function pick<T = unknown>(obj: Record<string, unknown>, keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function normalizeListing(raw: Record<string, unknown>): RealtyListingSummary {
  const address = pick<string>(raw, [
    "address",
    "fullAddress",
    "UnparsedAddress",
    "streetAddress",
  ]);
  const id = pick<string | number>(raw, ["id", "ListingKey", "ListingId"]);
  const mlsId = pick<string>(raw, ["mlsNumber", "ListingId", "MlsNumber"]);
  const photos = pick<unknown[]>(raw, ["photos", "images", "Media", "media"]);
  const thumbnail = pick<string>(raw, ["thumbnailUrl", "primaryPhoto"]);

  return {
    id: String(id ?? mlsId ?? address ?? ""),
    address: String(address ?? ""),
    city: pick<string>(raw, ["city", "City"]),
    state: pick<string>(raw, ["state", "StateOrProvince"]),
    zip: pick<string>(raw, ["zip", "PostalCode", "zipCode"]),
    mlsId: mlsId ? String(mlsId) : undefined,
    photoCount: Array.isArray(photos) ? photos.length : undefined,
    thumbnailUrl:
      thumbnail ??
      (Array.isArray(photos) && photos.length > 0
        ? extractPhotoUrl(photos[0])
        : undefined),
  };
}

function extractPhotoUrl(photo: unknown): string | undefined {
  if (typeof photo === "string") return photo;
  if (photo && typeof photo === "object") {
    const o = photo as Record<string, unknown>;
    const url = pick<string>(o, [
      "url",
      "Url",
      "MediaURL",
      "mediaUrl",
      "src",
      "href",
    ]);
    return url;
  }
  return undefined;
}

export async function searchListings(
  query: string
): Promise<RealtyListingSummary[]> {
  const url = `${SEARCH_PATH}?q=${encodeURIComponent(query)}`;
  const data = await request<unknown>(url);

  // Common envelope shapes: array, {results}, {listings}, {data}, {value} (OData/RESO).
  const items = Array.isArray(data)
    ? data
    : (pick<unknown[]>(data as Record<string, unknown>, [
        "results",
        "listings",
        "data",
        "value",
        "items",
      ]) ?? []);

  return items
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map(normalizeListing);
}

export async function getListingPhotos(
  listingId: string
): Promise<RealtyListingDetail> {
  const path = LISTING_PATH.replace("{id}", encodeURIComponent(listingId));
  const data = await request<Record<string, unknown>>(path);

  const summary = normalizeListing(data);
  const rawPhotos =
    pick<unknown[]>(data, ["photos", "images", "Media", "media"]) ?? [];

  const photoUrls = rawPhotos
    .map(extractPhotoUrl)
    .filter((u): u is string => typeof u === "string" && u.length > 0);

  return { ...summary, photoUrls };
}

// Server-side download of a photo URL → base64 data URL, so the browser can
// drop it into the same Photo[] state the manual uploader feeds.
export async function fetchPhotoAsDataUrl(photoUrl: string): Promise<string> {
  const res = await fetch(photoUrl, {
    headers: { Authorization: `Bearer ${getKey()}` },
  });

  // Many CDNs serve photos publicly without auth — retry without the header
  // if the authed request was rejected.
  const final = res.ok
    ? res
    : await fetch(photoUrl).catch(() => res);

  if (!final.ok) {
    throw new RealtyApiError(
      `Photo download failed: ${final.status}`,
      final.status
    );
  }

  const buffer = Buffer.from(await final.arrayBuffer());
  const contentType = final.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

export { RealtyApiError };
