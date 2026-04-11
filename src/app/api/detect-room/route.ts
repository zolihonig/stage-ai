import { NextRequest, NextResponse } from "next/server";
import { detectRoomType } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, apiKey } = body;

    if (!imageBase64 || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const roomType = await detectRoomType(
      apiKey,
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
