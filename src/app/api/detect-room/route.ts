import { NextRequest, NextResponse } from "next/server";
import { detectRoomType } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Missing image data" },
        { status: 400 }
      );
    }

    // Uses server-side Claude — no user API key needed
    const roomType = await detectRoomType(
      "",
      imageBase64,
      mimeType || "image/jpeg"
    );

    return NextResponse.json({ roomType });
  } catch (error) {
    console.error("Room detection error:", error);
    return NextResponse.json(
      { error: "Failed to detect room type" },
      { status: 500 }
    );
  }
}
