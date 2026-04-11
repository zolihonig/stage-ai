import { GoogleGenAI } from "@google/genai";

export function buildStagingPrompt(
  style: string,
  roomType: string,
  instructions?: string
): string {
  return `You are a professional interior designer virtually staging a real estate listing photo.

ABSOLUTE RULES:
- Do NOT change, alter, modify, or replace any walls, windows, doors, floors, ceilings, light fixtures, or architectural elements
- Do NOT change the perspective, camera angle, lighting direction, or color temperature
- Do NOT add or remove any structural elements
- Do NOT change wall colors, flooring materials, or window treatments that already exist
- ONLY add furniture, decor, rugs, art, and soft goods

STYLE: ${style}
ROOM TYPE: ${roomType}
${instructions ? `SPECIFIC INSTRUCTIONS: ${instructions}` : ""}

Add tasteful, proportionally correct ${style} furniture appropriate for a ${roomType}.
Ensure furniture placement respects the room's geometry, doorways, and traffic flow.
Shadows and reflections must match the existing lighting in the photo.
The result must be photorealistic and indistinguishable from a real photograph.
Return ONLY the staged image.`;
}

export function buildRoomDetectionPrompt(): string {
  return `Analyze this real estate photo and determine the room type.
Respond with ONLY one of these exact values: living_room, bedroom, kitchen, bathroom, dining_room, office, outdoor
Do not include any other text.`;
}

export async function stageImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  style: string,
  roomType: string,
  instructions?: string,
  premium: boolean = false
): Promise<{ imageBase64: string; mimeType: string }> {
  const client = new GoogleGenAI({ apiKey });

  const model = premium
    ? "gemini-2.0-flash-exp"
    : "gemini-2.0-flash-exp";

  const response = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: buildStagingPrompt(style, roomType, instructions),
          },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts) {
    throw new Error("No response from Gemini API");
  }

  for (const part of parts) {
    if (part.inlineData) {
      return {
        imageBase64: part.inlineData.data!,
        mimeType: part.inlineData.mimeType || "image/jpeg",
      };
    }
  }

  throw new Error("No image in Gemini response");
}

export async function detectRoomType(
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType,
              data: imageBase64,
            },
          },
          {
            text: buildRoomDetectionPrompt(),
          },
        ],
      },
    ],
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase() || "living_room";
  const validTypes = ["living_room", "bedroom", "kitchen", "bathroom", "dining_room", "office", "outdoor"];
  return validTypes.includes(text) ? text : "living_room";
}
