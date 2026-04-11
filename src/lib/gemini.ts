import { GoogleGenAI } from "@google/genai";

const STANDARD_MODEL = "gemini-2.0-flash-exp";
const PREMIUM_MODEL = "gemini-2.0-flash-exp";

export function buildStagingPrompt(
  style: string,
  roomType: string,
  colorPreference?: string,
  instructions?: string
): string {
  const colorLine = colorPreference
    ? `\nCOLOR PALETTE PREFERENCE: Use a ${colorPreference} color palette for all added furniture and decor. Fabrics, upholstery, and textiles should lean toward ${colorPreference} tones.`
    : "";

  return `You are a world-class interior designer virtually staging this real estate listing photo. Your single task is to add ${style} furniture and decor into this ${roomType}.

PRESERVATION — THESE ARE ABSOLUTE AND NON-NEGOTIABLE:
Preserve every single pixel of the existing walls, floors, ceilings, windows, doors, light fixtures, outlets, vents, molding, trim, baseboards, and all architectural elements exactly as they appear. Preserve the exact camera angle, lens perspective, and field of view. Preserve the existing lighting direction, color temperature, shadow angles, and ambient light levels. Preserve all existing wall colors, paint finishes, flooring materials, countertops, backsplashes, cabinetry, and any window treatments already present. Do not move, resize, recolor, blur, sharpen, or modify any part of the existing room structure.

WHAT TO ADD:
Place tasteful, proportionally correct ${style} furniture appropriate for a ${roomType}. Include complementary decor: area rugs, wall art, throw pillows, plants, books, and soft goods. Position all furniture respecting doorways, windows, traffic flow, and room geometry. Every piece must be at the correct scale relative to the room dimensions shown in the photo.${colorLine}

PHOTOREALISM REQUIREMENTS:
All added furniture must appear to physically rest on the existing floor surfaces with proper contact shadows. Shadows and reflections from every added item must perfectly match the existing lighting direction and intensity in the photo. Materials must show realistic texture, fabric weave, wood grain, and surface reflections. The final image must be completely indistinguishable from a real photograph taken by a professional real estate photographer.
${instructions ? `\nADDITIONAL INSTRUCTIONS: ${instructions}` : ""}
Generate the staged version of this room now.`;
}

export function buildRefinementPrompt(instruction: string): string {
  return `Make the following change to this staged room photo:

${instruction}

CRITICAL: Preserve all walls, floors, windows, ceilings, doors, and architectural elements exactly as they are. Only modify the furniture and decor as instructed. Maintain photorealistic quality. Generate the updated image now.`;
}

export function buildRoomDetectionPrompt(): string {
  return `You are analyzing a real estate listing photo to determine the room type.

Look at the architectural features, fixtures, and spatial layout:
- Kitchen: cabinets, countertops, sink, stove/oven, refrigerator
- Bathroom: toilet, bathtub/shower, bathroom vanity, tile
- Bedroom: bed or space clearly meant for a bed, closet doors, nightstand area
- Living Room: open living space, fireplace, large windows, entertainment wall
- Dining Room: dining table area, chandelier, connected to kitchen
- Office: desk area, bookshelves, smaller enclosed room
- Closet: built-in shelving, hanging rods, narrow enclosed space
- Outdoor/Patio: exterior space, deck, patio, balcony, yard
- Laundry: washer/dryer, utility sink, laundry fixtures
- Entryway/Foyer: front door area, coat closet, entry hall
- Garage: garage door, concrete floor, utility space

Respond with ONLY one of these exact values (nothing else):
living_room, bedroom, kitchen, bathroom, dining_room, office, closet, outdoor, laundry, entryway, garage`;
}

export async function stageImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  style: string,
  roomType: string,
  colorPreference?: string,
  instructions?: string,
  premium: boolean = false
): Promise<{ imageBase64: string; mimeType: string }> {
  const client = new GoogleGenAI({ apiKey });
  const model = premium ? PREMIUM_MODEL : STANDARD_MODEL;

  const prompt = buildStagingPrompt(style, roomType, colorPreference, instructions);

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
            text: prompt,
          },
        ],
      },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
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
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error(
    "No image in Gemini response. The model returned text only. Try again."
  );
}

export async function refineImage(
  apiKey: string,
  imageBase64: string,
  mimeType: string,
  instruction: string
): Promise<{ imageBase64: string; mimeType: string }> {
  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: STANDARD_MODEL,
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
            text: buildRefinementPrompt(instruction),
          },
        ],
      },
    ],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
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
        mimeType: part.inlineData.mimeType || "image/png",
      };
    }
  }

  throw new Error("No image in Gemini refinement response. Try again.");
}

export async function detectRoomType(
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const client = new GoogleGenAI({ apiKey });

  const response = await client.models.generateContent({
    model: STANDARD_MODEL,
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

  const text =
    response.candidates?.[0]?.content?.parts?.[0]?.text
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z_]/g, "") || "living_room";

  const validTypes = [
    "living_room",
    "bedroom",
    "kitchen",
    "bathroom",
    "dining_room",
    "office",
    "closet",
    "outdoor",
    "laundry",
    "entryway",
    "garage",
  ];
  return validTypes.includes(text) ? text : "living_room";
}
