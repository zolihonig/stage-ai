import { NextRequest, NextResponse } from "next/server";
import { stageImage } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, style, roomType, colorPreference, instructions } = body;

    // Use server-side Gemini key — no user key needed
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server Gemini API key not configured" }, { status: 500 });
    }

    if (!imageBase64 || !style || !roomType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await stageImage(apiKey, imageBase64, mimeType || "image/jpeg", style, roomType, colorPreference, instructions);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Staging error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
