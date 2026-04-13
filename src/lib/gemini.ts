import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";

// Image generation model
const IMAGE_MODEL = "gemini-2.5-flash-image";

// Claude model for image analysis + prompt crafting
const CLAUDE_MODEL = "claude-sonnet-4-20250514";

function getAnthropicClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

// ---------------------------------------------------------------------------
// Claude-powered room detection — much more accurate than Gemini text models
// ---------------------------------------------------------------------------
export async function detectRoomType(
  _apiKey: string, // kept for interface compat, uses server-side Claude
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const claude = getAnthropicClient();

  const mediaType = mimeType === "image/png" ? "image/png"
    : mimeType === "image/webp" ? "image/webp"
    : mimeType === "image/gif" ? "image/gif"
    : "image/jpeg";

  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 50,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: `What type of room is this? Respond with ONLY one of these exact values (nothing else): living_room, bedroom, kitchen, bathroom, dining_room, office, closet, outdoor, laundry, entryway, garage`,
          },
        ],
      },
    ],
  });

  const text = (response.content[0] as { type: string; text: string }).text
    .trim()
    .toLowerCase()
    .replace(/[^a-z_]/g, "");

  const valid = [
    "living_room", "bedroom", "kitchen", "bathroom", "dining_room",
    "office", "closet", "outdoor", "laundry", "entryway", "garage",
  ];
  return valid.includes(text) ? text : "living_room";
}

// ---------------------------------------------------------------------------
// Claude analyzes the photo and crafts an optimized Gemini prompt
// ---------------------------------------------------------------------------
async function craftStagingPrompt(
  imageBase64: string,
  mimeType: string,
  style: string,
  roomType: string,
  colorPreference?: string,
  instructions?: string
): Promise<string> {
  const claude = getAnthropicClient();

  const mediaType = mimeType === "image/png" ? "image/png"
    : mimeType === "image/webp" ? "image/webp"
    : mimeType === "image/gif" ? "image/gif"
    : "image/jpeg";

  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: `You are the world's best prompt engineer for Google Gemini image editing (Nano Banana). Analyze this real estate photo and write a single, optimized prompt to virtually stage it.

ROOM TYPE: ${roomType}
DESIRED STYLE: ${style}
${colorPreference ? `COLOR PALETTE: ${colorPreference}` : ""}
${instructions ? `ADDITIONAL INSTRUCTIONS: ${instructions}` : ""}

STEP 1 — Analyze the photo carefully:
1. The exact lighting — direction, color temperature, intensity, shadow angles
2. The floor material and color
3. The wall color and finish
4. Window placement and natural light sources
5. The room dimensions and proportions (estimate in feet)
6. Any existing fixtures, built-ins, or appliances that must remain
7. ALL doorways, closet openings, hallway entrances — their exact positions
8. Traffic flow paths — how a person would walk through this room

STEP 2 — Plan furniture layout with these CRITICAL RULES:
- NEVER place furniture blocking or partially blocking ANY doorway, closet opening, or hallway entrance
- NEVER place a bed, sofa, or table in front of a door — leave at minimum 3 feet clearance
- NEVER block windows — keep furniture below window sill height
- Place the primary furniture piece (bed/sofa) on the LARGEST open wall, AWAY from doors
- Ensure at least 2-3 feet of walking space around all sides of major furniture
- For bedrooms: bed goes on wall OPPOSITE the door, or the longest wall without a door/closet
- For living rooms: sofa faces the focal point (window/fireplace), not blocking entries

STEP 3 — Write the prompt:
- Start with "Using the provided image of this ${roomType}..."
- Specify EXACT furniture pieces with materials, colors, and specific placement (e.g., "place the bed centered on the far wall, between the two windows, with nightstands on each side")
- Explicitly state "leave the doorway at [position] completely clear and unblocked"
- Describe shadows and reflections matching the EXISTING lighting
- Use: "professional real estate photography, medium-format camera, natural grain"
- Force preservation of all architectural elements

Output ONLY the prompt text. No explanation, no JSON wrapper.`,
          },
        ],
      },
    ],
  });

  return (response.content[0] as { type: string; text: string }).text.trim();
}

// ---------------------------------------------------------------------------
// Retry wrapper for Gemini API calls (handles 429 rate limits)
// ---------------------------------------------------------------------------
async function callGeminiWithRetry(
  fn: () => Promise<{ imageBase64: string; mimeType: string }>,
  maxRetries = 3
): Promise<{ imageBase64: string; mimeType: string }> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isRateLimit = msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota");

      if (isRateLimit && attempt < maxRetries) {
        // Parse retry delay from error or use exponential backoff
        const match = msg.match(/retry in ([\d.]+)s/i);
        const delay = match ? Math.ceil(parseFloat(match[1]) * 1000) : (attempt + 1) * 20000;
        console.log(`Rate limited. Retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      throw error;
    }
  }
  throw new Error("Max retries exceeded");
}

// ---------------------------------------------------------------------------
// Stage image: Claude crafts the prompt → Gemini generates the image
// ---------------------------------------------------------------------------
export async function stageImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  style: string,
  roomType: string,
  colorPreference?: string,
  instructions?: string,
  _premium: boolean = false
): Promise<{ imageBase64: string; mimeType: string }> {
  // Step 1: Claude analyzes the image and crafts the perfect prompt
  const prompt = await craftStagingPrompt(
    imageBase64,
    mimeType,
    style,
    roomType,
    colorPreference,
    instructions
  );

  // Step 2: Send image + Claude's prompt to Gemini with retry for rate limits
  return callGeminiWithRetry(async () => {
    const client = new GoogleGenAI({ apiKey });

    const response = await client.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No response from Gemini API");

    for (const part of parts) {
      if (part.inlineData) {
        return {
          imageBase64: part.inlineData.data!,
          mimeType: part.inlineData.mimeType || "image/png",
        };
      }
    }

    const textPart = parts.find((p) => p.text);
    throw new Error(`Gemini returned no image: ${textPart?.text?.slice(0, 200) || "Unknown"}`);
  });
}

// ---------------------------------------------------------------------------
// Refine a staged image
// ---------------------------------------------------------------------------
export async function refineImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  instruction: string
): Promise<{ imageBase64: string; mimeType: string }> {
  const prompt = `Using the provided image, make the following change to this staged room:

${instruction}

Keep the original layout, walls, windows, flooring, and every architectural detail EXACTLY the same. Only modify the furniture and decor as instructed. Preserve the camera angle, lighting, and physics. Professional real estate listing photography quality. Generate the updated image now.`;

  return callGeminiWithRetry(async () => {
    const client = new GoogleGenAI({ apiKey });

    const response = await client.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: imageBase64 } },
            { text: prompt },
          ],
        },
      ],
      config: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) throw new Error("No response from Gemini API");

    for (const part of parts) {
      if (part.inlineData) {
        return {
          imageBase64: part.inlineData.data!,
          mimeType: part.inlineData.mimeType || "image/png",
        };
      }
    }

    const textPart = parts.find((p) => p.text);
    throw new Error(
      `Gemini returned no image: ${textPart?.text?.slice(0, 200) || "Unknown"}`
    );
  });
}
