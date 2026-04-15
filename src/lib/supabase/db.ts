import { SupabaseClient } from "@supabase/supabase-js";
import { getSignedUrl } from "./storage";

// Types matching the database schema
export interface DBListing {
  id: string;
  user_id: string;
  name: string;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface DBPhoto {
  id: string;
  listing_id: string;
  storage_path: string;
  room_type: string;
  display_order: number;
  file_name: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
  // Resolved at query time
  url?: string;
}

export interface DBStagedPhoto {
  id: string;
  photo_id: string;
  style: string;
  storage_path: string;
  prompt_used: string | null;
  model_used: string | null;
  generation_time_ms: number | null;
  created_at: string;
  // Resolved at query time
  url?: string;
}

export interface ListingWithPhotos extends DBListing {
  photos: DBPhoto[];
  staged_photos: DBStagedPhoto[];
}

// Get all listings for a user (with photo counts, cover image)
export async function getListings(
  supabase: SupabaseClient,
  userId: string
): Promise<ListingWithPhotos[]> {
  const { data, error } = await supabase
    .from("listings")
    .select(`
      *,
      photos (*),
      staged_photos:photos(staged_photos(*))
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Get listings failed: ${error.message}`);

  // Flatten staged_photos and resolve URLs for cover images
  const listings: ListingWithPhotos[] = [];
  for (const l of data || []) {
    const allStaged: DBStagedPhoto[] = [];
    for (const p of l.photos || []) {
      for (const sp of p.staged_photos || []) {
        allStaged.push(sp);
      }
    }

    // Get cover image URL (latest staged or first original)
    let coverUrl: string | undefined;
    if (allStaged.length > 0) {
      try {
        coverUrl = await getSignedUrl(supabase, "staged", allStaged[allStaged.length - 1].storage_path);
      } catch { /* skip */ }
    } else if (l.photos?.length > 0) {
      try {
        coverUrl = await getSignedUrl(supabase, "originals", l.photos[0].storage_path);
      } catch { /* skip */ }
    }

    listings.push({
      ...l,
      photos: (l.photos || []).map((p: DBPhoto) => ({ ...p, url: coverUrl })),
      staged_photos: allStaged,
    });
  }

  return listings;
}

// Get a single listing with all photos and staged photos (with signed URLs)
export async function getListing(
  supabase: SupabaseClient,
  listingId: string
): Promise<ListingWithPhotos | null> {
  const { data: listing, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", listingId)
    .single();

  if (error || !listing) return null;

  // Get photos
  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("listing_id", listingId)
    .order("display_order");

  // Get staged photos for all photos in this listing
  const photoIds = (photos || []).map((p: DBPhoto) => p.id);
  const { data: stagedPhotos } = await supabase
    .from("staged_photos")
    .select("*")
    .in("photo_id", photoIds.length > 0 ? photoIds : ["none"])
    .order("created_at");

  // Resolve signed URLs for all images
  const photosWithUrls = await Promise.all(
    (photos || []).map(async (p: DBPhoto) => {
      try {
        const url = await getSignedUrl(supabase, "originals", p.storage_path);
        return { ...p, url };
      } catch {
        return { ...p, url: "" };
      }
    })
  );

  const stagedWithUrls = await Promise.all(
    (stagedPhotos || []).map(async (sp: DBStagedPhoto) => {
      try {
        const url = await getSignedUrl(supabase, "staged", sp.storage_path);
        return { ...sp, url };
      } catch {
        return { ...sp, url: "" };
      }
    })
  );

  return {
    ...listing,
    photos: photosWithUrls,
    staged_photos: stagedWithUrls,
  };
}

// Create a new listing
export async function createListing(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  address?: string
): Promise<string> {
  const { data, error } = await supabase
    .from("listings")
    .insert({ user_id: userId, name, address: address || null })
    .select("id")
    .single();

  if (error) throw new Error(`Create listing failed: ${error.message}`);
  return data.id;
}

// Create a photo record
export async function createPhoto(
  supabase: SupabaseClient,
  listingId: string,
  storagePath: string,
  roomType: string,
  fileName: string,
  displayOrder: number,
  width?: number,
  height?: number
): Promise<string> {
  const { data, error } = await supabase
    .from("photos")
    .insert({
      listing_id: listingId,
      storage_path: storagePath,
      room_type: roomType,
      file_name: fileName,
      display_order: displayOrder,
      width: width || null,
      height: height || null,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Create photo failed: ${error.message}`);
  return data.id;
}

// Create a staged photo record
export async function createStagedPhoto(
  supabase: SupabaseClient,
  photoId: string,
  style: string,
  storagePath: string,
  generationTimeMs?: number,
  promptUsed?: string,
  modelUsed?: string
): Promise<string> {
  const { data, error } = await supabase
    .from("staged_photos")
    .insert({
      photo_id: photoId,
      style,
      storage_path: storagePath,
      generation_time_ms: generationTimeMs || null,
      prompt_used: promptUsed || null,
      model_used: modelUsed || "gemini-3.1-flash-image-preview",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Create staged photo failed: ${error.message}`);
  return data.id;
}

// Delete a listing (cascade deletes photos + staged)
export async function deleteListing(
  supabase: SupabaseClient,
  listingId: string
): Promise<void> {
  // Storage files need manual cleanup
  const { data: photos } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("listing_id", listingId);

  const { data: stagedPhotos } = await supabase
    .from("staged_photos")
    .select("storage_path, photo_id")
    .in("photo_id", (photos || []).map((p: { storage_path: string }) => p.storage_path).length > 0
      ? (await supabase.from("photos").select("id").eq("listing_id", listingId)).data?.map((p: { id: string }) => p.id) || []
      : ["none"]
    );

  // Delete from storage
  if (photos?.length) {
    await supabase.storage.from("originals").remove(photos.map((p: { storage_path: string }) => p.storage_path));
  }
  if (stagedPhotos?.length) {
    await supabase.storage.from("staged").remove(stagedPhotos.map((sp: { storage_path: string }) => sp.storage_path));
  }

  // Delete from DB (cascade handles photos + staged_photos)
  const { error } = await supabase.from("listings").delete().eq("id", listingId);
  if (error) throw new Error(`Delete listing failed: ${error.message}`);
}

// Delete a single staged photo
export async function deleteStagedPhoto(
  supabase: SupabaseClient,
  stagedPhotoId: string
): Promise<void> {
  const { data } = await supabase
    .from("staged_photos")
    .select("storage_path")
    .eq("id", stagedPhotoId)
    .single();

  if (data) {
    await supabase.storage.from("staged").remove([data.storage_path]);
  }

  await supabase.from("staged_photos").delete().eq("id", stagedPhotoId);
}
