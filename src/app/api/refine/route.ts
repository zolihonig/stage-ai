import { NextRequest, NextResponse } from "next/server";
import { refineImage } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, instruction } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Server Gemini API key not configured" }, { status: 500 });
    }

    if (!imageBase64 || !instruction) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await refineImage(apiKey, imageBase64, mimeType || "image/png", instruction);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Refinement error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
