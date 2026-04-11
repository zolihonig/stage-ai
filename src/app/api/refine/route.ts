import { NextRequest, NextResponse } from "next/server";
import { refineImage } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageBase64, mimeType, instruction, apiKey } = body;

    if (!imageBase64 || !instruction || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await refineImage(
      apiKey,
      imageBase64,
      mimeType || "image/png",
      instruction
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Refinement error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
