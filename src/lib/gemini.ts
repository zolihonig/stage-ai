import { GoogleGenAI } from "@google/genai";
import Anthropic from "@anthropic-ai/sdk";
import { buildDesignAnalysisPrompt } from "./interior-design-prompt";

// Image generation model — Flash 3.1 has best quality + fewer structural hallucinations
const IMAGE_MODEL = "gemini-3.1-flash-image-preview";

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
    max_tokens: 1500,
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
            text: buildDesignAnalysisPrompt(style, roomType, colorPreference, instructions),
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
  const prompt = `Using the provided image, make ONLY the following change to this staged room:

${instruction}

ABSOLUTE RULES — VIOLATION OF ANY OF THESE MAKES THE IMAGE UNUSABLE:
1. Do NOT add, remove, move, or modify any walls, doors, door frames, windows, window frames, ceilings, floors, light fixtures, ceiling fans, built-in shelving, closets, columns, archways, molding, baseboards, outlets, vents, or ANY structural/architectural element
2. Do NOT change wall colors, floor materials, ceiling texture, or any surface finish
3. Do NOT change the camera angle, perspective, field of view, or image dimensions
4. Do NOT change the lighting direction, color temperature, or ambient light levels
5. ONLY add, remove, rearrange, or modify FURNITURE and DECOR items (sofas, chairs, tables, rugs, art, pillows, plants, lamps, books, vases)

When rearranging furniture:
- Keep chairs at least 12 inches from walls for realistic spacing
- Ensure all furniture sits naturally on the floor with proper contact shadows
- Maintain at least 36 inches clearance from all doorways and openings
- Furniture should look lived-in and natural, not pushed against walls

Professional real estate listing photography quality. Photorealistic result. Generate the updated image now.`;

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
