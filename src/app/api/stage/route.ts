import { NextRequest, NextResponse } from "next/server";
import { stageImage } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import { uploadStaged } from "@/lib/supabase/storage";
import { createStagedPhoto } from "@/lib/supabase/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, style, roomType, colorPreference, instructions, photoId, listingId } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server Gemini API key not configured" }, { status: 500 });
    }

    if (!imageBase64 || !style || !roomType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Generate the staged image
    const result = await stageImage(apiKey, imageBase64, mimeType || "image/jpeg", style, roomType, colorPreference, instructions);

    // If photoId + listingId provided, save to Supabase (new flow)
    if (photoId && listingId) {
      try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const stagedId = crypto.randomUUID();
          const storagePath = await uploadStaged(supabase, user.id, listingId, stagedId, result.imageBase64, result.mimeType);
          const dbId = await createStagedPhoto(supabase, photoId, style, storagePath);

          // Return the DB ID and a signed URL
          const { data: signedData } = await supabase.storage.from("staged").createSignedUrl(storagePath, 3600);

          return NextResponse.json({
            stagedPhotoId: dbId,
            storagePath,
            signedUrl: signedData?.signedUrl,
            // Also return base64 for backwards compat with IndexedDB flow
            imageBase64: result.imageBase64,
            mimeType: result.mimeType,
          });
        }
      } catch (e) {
        // Supabase save failed — still return the image for IndexedDB fallback
        console.error("Supabase save failed:", e);
      }
    }

    // Fallback: return base64 for IndexedDB flow (no auth or no photoId)
    return NextResponse.json(result);
  } catch (error) {
    console.error("Staging error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
