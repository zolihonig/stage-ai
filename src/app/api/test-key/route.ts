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

    // Minimal API call to verify the key works
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
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 }
    );
  }
}
