import { NextRequest, NextResponse } from "next/server";
import { stageImage } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, style, roomType, instructions, apiKey } =
      body;

    if (!imageBase64 || !style || !roomType || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await stageImage(
      apiKey,
      imageBase64,
      mimeType || "image/jpeg",
      style,
      roomType,
      instructions
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Staging error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
