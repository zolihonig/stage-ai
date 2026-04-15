import { SupabaseClient } from "@supabase/supabase-js";

// Upload an original photo to Supabase Storage
export async function uploadOriginal(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
  photoId: string,
  base64Data: string,
  mimeType: string = "image/jpeg"
): Promise<string> {
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const path = `${userId}/${listingId}/${photoId}.${ext}`;

  const buffer = Buffer.from(base64Data, "base64");

  const { error } = await supabase.storage
    .from("originals")
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw new Error(`Upload original failed: ${error.message}`);
  return path;
}

// Upload a staged photo to Supabase Storage
export async function uploadStaged(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
  stagedPhotoId: string,
  base64Data: string,
  mimeType: string = "image/png"
): Promise<string> {
  const ext = mimeType.includes("png") ? "png" : "jpg";
  const path = `${userId}/${listingId}/${stagedPhotoId}.${ext}`;

  const buffer = Buffer.from(base64Data, "base64");

  const { error } = await supabase.storage
    .from("staged")
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw new Error(`Upload staged failed: ${error.message}`);
  return path;
}

// Get a signed URL for viewing (60 min TTL)
export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: "originals" | "staged",
  path: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hour

  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}

// Delete a file from storage
export async function deleteFile(
  supabase: SupabaseClient,
  bucket: "originals" | "staged",
  path: string
): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}
