import { NextRequest, NextResponse } from "next/server";

// Google Drive: list files in a shared folder using API key
async function listGoogleDriveFiles(folderId: string): Promise<{ name: string; downloadUrl: string }[]> {
  const apiKey = process.env.GEMINI_API_KEY; // Same Google API key works for Drive API
  const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+(mimeType+contains+'image/')&key=${apiKey}&fields=files(id,name,mimeType)&pageSize=50`;

  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Drive API error: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.files || []).map((f: { id: string; name: string }) => ({
    name: f.name,
    downloadUrl: `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media&key=${apiKey}`,
  }));
}

// Dropbox: extract files from a shared folder link
async function listDropboxFiles(shareUrl: string): Promise<{ name: string; downloadUrl: string }[]> {
  // Try the Dropbox API with the shared link
  // For shared folders, we need an app token
  const token = process.env.DROPBOX_TOKEN;

  if (token) {
    const res = await fetch("https://api.dropboxapi.com/2/files/list_folder", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shared_link: { url: shareUrl },
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
        downloadUrl: JSON.stringify({ shareUrl, path: f.path_lower }),
      }));
    }
  }

  // Fallback: for a single shared file, convert to direct download
  if (shareUrl.includes("dl=0")) {
    const directUrl = shareUrl.replace("dl=0", "dl=1");
    const fileName = shareUrl.split("/").pop()?.split("?")[0] || "photo.jpg";
    return [{ name: fileName, downloadUrl: directUrl }];
  }

  throw new Error("Dropbox import requires a DROPBOX_TOKEN for folder links. Individual file links work without it.");
}

// Download a single image and return as base64 data URL
async function downloadImage(downloadUrl: string, service: string): Promise<string> {
  let res: Response;

  if (service === "dropbox" && downloadUrl.startsWith("{")) {
    // Dropbox API download
    const { shareUrl, path } = JSON.parse(downloadUrl);
    const token = process.env.DROPBOX_TOKEN;
    res = await fetch("https://content.dropboxapi.com/2/sharing/get_shared_link_file", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Dropbox-API-Arg": JSON.stringify({ url: shareUrl, path }),
      },
    });
  } else {
    res = await fetch(downloadUrl);
  }

  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "image/jpeg";
  const base64 = buffer.toString("base64");
  return `data:${contentType};base64,${base64}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // If downloadUrl is provided, download a single image
    if (body.downloadUrl) {
      const dataUrl = await downloadImage(body.downloadUrl, body.service || "gdrive");
      return NextResponse.json({ dataUrl });
    }

    // Otherwise, list files from a shared link
    const { url, service } = body;
    if (!url || !service) {
      return NextResponse.json({ error: "Missing URL or service" }, { status: 400 });
    }

    let files: { name: string; downloadUrl: string }[];

    if (service === "gdrive") {
      // Extract folder ID from URL
      const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (!match) {
        return NextResponse.json({ error: "Could not extract folder ID from Google Drive URL. Make sure it's a shared folder link." }, { status: 400 });
      }
      files = await listGoogleDriveFiles(match[1]);
    } else if (service === "dropbox") {
      files = await listDropboxFiles(url);
    } else {
      return NextResponse.json({ error: "Unsupported service" }, { status: 400 });
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No image files found in the shared folder. Make sure it contains JPEG/PNG images and sharing is enabled." }, { status: 404 });
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import failed" },
      { status: 500 }
    );
  }
}
