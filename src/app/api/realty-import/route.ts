import { NextRequest, NextResponse } from "next/server";
import {
  searchListings,
  getListingPhotos,
  fetchPhotoAsDataUrl,
  RealtyApiError,
} from "@/lib/realtyapi";

// POST /api/realty-import
//
// Three-mode endpoint, matching the import-link pattern:
//
//   { action: "search", query: "123 Ocean Dr, Miami" }
//     → { results: RealtyListingSummary[] }
//
//   { action: "photos", listingId: "..." }
//     → { listing: RealtyListingDetail }
//       (returns photo URLs only — the browser then asks for each one)
//
//   { action: "download", photoUrl: "https://..." }
//     → { dataUrl: "data:image/jpeg;base64,..." }
//       (downloads server-side so the API key isn't exposed and so we
//        sidestep CORS on the photo CDN)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action as string | undefined;

    if (action === "search") {
      const query = (body.query as string | undefined)?.trim();
      if (!query) {
        return NextResponse.json({ error: "Missing query" }, { status: 400 });
      }
      const results = await searchListings(query);
      return NextResponse.json({ results });
    }

    if (action === "photos") {
      const listingId = body.listingId as string | undefined;
      if (!listingId) {
        return NextResponse.json(
          { error: "Missing listingId" },
          { status: 400 }
        );
      }
      const listing = await getListingPhotos(listingId);
      return NextResponse.json({ listing });
    }

    if (action === "download") {
      const photoUrl = body.photoUrl as string | undefined;
      if (!photoUrl) {
        return NextResponse.json(
          { error: "Missing photoUrl" },
          { status: 400 }
        );
      }
      const dataUrl = await fetchPhotoAsDataUrl(photoUrl);
      return NextResponse.json({ dataUrl });
    }

    return NextResponse.json(
      { error: "Unknown action. Expected: search | photos | download" },
      { status: 400 }
    );
  } catch (error) {
    const status = error instanceof RealtyApiError ? error.status : 500;
    const message =
      error instanceof Error ? error.message : "RealtyAPI request failed";
    console.error("RealtyAPI import error:", message);
    return NextResponse.json({ error: message }, { status });
  }
}
