import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Import photos from a shared Google Drive or Dropbox folder.
//
// Security notes:
// - The Google API key never leaves the server. The list step returns only
//   file names and ids; the download step takes a Drive file id (or a Dropbox
//   path) and the server builds the real URL itself.
// - The server only fetches fixed Google / Dropbox hosts. It never fetches a
//   URL the caller supplied, and it follows redirects only to those hosts.
// - The import UI lives on /listing/new, which the proxy only serves to
//   signed-in users, so this route requires a Supabase session too.

type ImportFile = {
  name: string;
  service: "gdrive" | "dropbox";
  fileId?: string; // Google Drive file id
  path?: string; // Dropbox path inside the shared folder (folder links only)
};

const DRIVE_ID = /^[a-zA-Z0-9_-]{1,200}$/;
const MAX_REDIRECTS = 3;

const isGoogleHost = (host: string) =>
  host === "www.googleapis.com" || host.endsWith(".googleusercontent.com");
const isDropboxHost = (host: string) =>
  host === "dropbox.com" ||
  host === "www.dropbox.com" ||
  host === "content.dropboxapi.com" ||
  host.endsWith(".dropboxusercontent.com");

class BadRequest extends Error {}

// fetch() that refuses to leave an allowlisted set of https hosts, including
// across redirects.
async function fetchAllowed(
  url: string,
  allowHost: (host: string) => boolean,
  init: RequestInit = {}
): Promise<Response> {
  let current = new URL(url);
  let options = init;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "https:" || !allowHost(current.hostname)) {
      throw new Error("Refusing to fetch from an unexpected host");
    }
    const res = await fetch(current, { ...options, redirect: "manual" });
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    if (!location) return res;
    current = new URL(location, current);
    // Follow a redirect as a plain GET, like the browser default does.
    options = { headers: options.headers };
  }
  throw new Error("Too many redirects");
}

// Parse a Dropbox share link the user pasted. It is only passed to the Dropbox
// API as an argument, or fetched after this check pins it to Dropbox.
function parseDropboxShareUrl(raw: unknown): URL {
  if (typeof raw !== "string") throw new BadRequest("Missing Dropbox link");
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BadRequest("Invalid Dropbox link");
  }
  if (url.protocol !== "https:" || (url.hostname !== "dropbox.com" && url.hostname !== "www.dropbox.com")) {
    throw new BadRequest("Invalid Dropbox link");
  }
  return url;
}

// Google Drive: list files in a shared folder using API key
async function listGoogleDriveFiles(folderId: string): Promise<ImportFile[]> {
  const apiKey = process.env.GEMINI_API_KEY; // Same Google API key works for Drive API
  if (!apiKey) throw new Error("Google Drive import is not configured");
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and (mimeType contains 'image/')`,
    key: apiKey,
    fields: "files(id,name,mimeType)",
    pageSize: "50",
  });
  const res = await fetchAllowed(`https://www.googleapis.com/drive/v3/files?${params}`, isGoogleHost);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Drive API error: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.files || [])
    .filter((f: { id?: unknown }) => typeof f.id === "string" && DRIVE_ID.test(f.id))
    .map((f: { id: string; name: string }) => ({ name: f.name, service: "gdrive", fileId: f.id }));
}

// Dropbox: extract files from a shared folder link
async function listDropboxFiles(shareUrl: URL): Promise<ImportFile[]> {
  // Try the Dropbox API with the shared link
  // For shared folders, we need an app token
  const token = process.env.DROPBOX_TOKEN;

  if (token) {
    const res = await fetchAllowed("https://api.dropboxapi.com/2/files/list_folder", (h) => h === "api.dropboxapi.com", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shared_link: { url: shareUrl.toString() },
        path: "",
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const imageFiles = (data.entries || []).filter(
        (e: { ".tag": string; name: string }) =>
          e[".tag"] === "file" &&
          /\.(jpe?g|png|webp|heic)$/i.test(e.name)
      );

      return imageFiles.map((f: { name: string; path_lower: string }) => ({
        name: f.name,
        service: "dropbox",
        path: f.path_lower,
      }));
    }
  }

  // Fallback: a single shared file link, downloaded directly in step 2
  if (shareUrl.toString().includes("dl=0")) {
    const fileName = shareUrl.pathname.split("/").pop() || "photo.jpg";
    return [{ name: fileName, service: "dropbox" }];
  }

  throw new Error("Dropbox import requires a DROPBOX_TOKEN for folder links. Individual file links work without it.");
}

async function toDataUrl(res: Response): Promise<string> {
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

// Download one Google Drive file by id. The server adds the key itself.
async function downloadDriveFile(fileId: unknown): Promise<string> {
  if (typeof fileId !== "string" || !DRIVE_ID.test(fileId)) throw new BadRequest("Invalid file id");
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Google Drive import is not configured");
  const params = new URLSearchParams({ alt: "media", key: apiKey });
  const res = await fetchAllowed(`https://www.googleapis.com/drive/v3/files/${fileId}?${params}`, isGoogleHost);
  return toDataUrl(res);
}

// Download one Dropbox file: by path inside a shared folder (Dropbox API), or
// the single shared file itself when no path is given.
async function downloadDropboxFile(rawShareUrl: unknown, path: unknown): Promise<string> {
  const shareUrl = parseDropboxShareUrl(rawShareUrl);

  if (path !== undefined && path !== null) {
    if (typeof path !== "string" || !path.startsWith("/")) throw new BadRequest("Invalid Dropbox path");
    const token = process.env.DROPBOX_TOKEN;
    if (!token) throw new Error("Dropbox import is not configured");
    const res = await fetchAllowed("https://content.dropboxapi.com/2/sharing/get_shared_link_file", isDropboxHost, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({ url: shareUrl.toString(), path }),
      },
    });
    return toDataUrl(res);
  }

  if (!shareUrl.toString().includes("dl=0")) throw new BadRequest("Unsupported Dropbox link");
  const directUrl = shareUrl.toString().replace("dl=0", "dl=1");
  return toDataUrl(await fetchAllowed(directUrl, isDropboxHost));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Please sign in to import photos." }, { status: 401 });
    }

    const body = await request.json();

    // Step 2: download a single image the list step returned
    if (body.download) {
      let dataUrl: string;
      if (body.service === "gdrive") {
        dataUrl = await downloadDriveFile(body.fileId);
      } else if (body.service === "dropbox") {
        dataUrl = await downloadDropboxFile(body.url, body.path);
      } else {
        return NextResponse.json({ error: "Unsupported service" }, { status: 400 });
      }
      return NextResponse.json({ dataUrl });
    }

    // Step 1: list files from a shared link
    const { url, service } = body;
    if (!url || !service || typeof url !== "string") {
      return NextResponse.json({ error: "Missing URL or service" }, { status: 400 });
    }

    let files: ImportFile[];

    if (service === "gdrive") {
      // Extract folder ID from URL
      const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (!match) {
        return NextResponse.json({ error: "Could not extract folder ID from Google Drive URL. Make sure it's a shared folder link." }, { status: 400 });
      }
      files = await listGoogleDriveFiles(match[1]);
    } else if (service === "dropbox") {
      files = await listDropboxFiles(parseDropboxShareUrl(url));
    } else {
      return NextResponse.json({ error: "Unsupported service" }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No image files found in the shared folder. Make sure it contains JPEG/PNG images and sharing is enabled." }, { status: 404 });
    }

    return NextResponse.json({ files });
  } catch (error) {
    if (error instanceof BadRequest) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
