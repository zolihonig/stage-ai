import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing API key" },
        { status: 400 }
      );
    }

    const client = new GoogleGenAI({ apiKey });

    // Test with the image model since that's what staging uses
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "Say OK" }] }],
    });

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      return NextResponse.json({ valid: true });
    }

    return NextResponse.json({ error: "No response" }, { status: 500 });
  } catch (error) {
    console.error("Key test error:", error);
    const message = error instanceof Error ? error.message : "Invalid API key";
    return NextResponse.json(
      { error: message },
      { status: 401 }
    );
  }
}
