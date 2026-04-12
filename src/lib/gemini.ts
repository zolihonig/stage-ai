import { GoogleGenAI } from "@google/genai";

// Image generation models (must support responseModalities: IMAGE)
const IMAGE_MODEL = "gemini-2.5-flash-image";
const PREMIUM_IMAGE_MODEL = "gemini-3-pro-image-preview";
// Text-only model (room detection, key testing)
const TEXT_MODEL = "gemini-2.5-flash";

export function buildStagingPrompt(
  style: string,
  roomType: string,
  colorPreference?: string,
  instructions?: string,
  isFirstInBatch?: boolean,
  styleReference?: string
): string {
  const colorLine = colorPreference
    ? `Use a ${colorPreference} color palette for all furniture, upholstery, textiles, and decor.`
    : "";

  const consistencyLine =
    !isFirstInBatch && styleReference
      ? `Use the exact same furniture family, color palette, wood tones, fabric textures, and lighting temperature as the other rooms in this listing. Style reference: ${styleReference}.`
      : "";

  return `Using the provided image of a ${roomType}, virtually stage this room with ${style} furniture and decor.

Add tasteful, proportionally correct furniture appropriate for a ${roomType}: sofas, chairs, tables, rugs, wall art, throw pillows, plants, lamps, books, and soft goods placed naturally throughout the space. ${colorLine}

Keep the original layout, walls, windows, doors, flooring, ceilings, countertops, cabinetry, light fixtures, outlets, vents, molding, trim, baseboards, and every architectural detail EXACTLY the same. Preserve the exact camera angle, lens perspective, field of view, lighting direction, color temperature, shadow angles, and ambient light levels from the original photo.

Match the existing lighting and physics perfectly. All added furniture must physically rest on the existing floor surfaces with accurate contact shadows. Shadows and reflections from every added item must match the existing lighting direction and intensity. Materials must show realistic texture — fabric weave, wood grain, leather patina, and surface reflections.

Professional real estate listing photography style, shot on a medium-format camera with natural grain, subtle depth of field, accurate fabric folds, and realistic material reflections. Hyper-realistic, market-ready, warm and inviting. The result must be completely indistinguishable from a real photograph.

${consistencyLine}
${instructions ? `Additional instructions: ${instructions}` : ""}
Generate the staged version of this room now.`;
}

export function buildRefinementPrompt(instruction: string): string {
  return `Using the provided image, make the following change to this staged room:

${instruction}

Keep the original layout, walls, windows, flooring, and every architectural detail EXACTLY the same. Only modify the furniture and decor as instructed. Preserve the camera angle, lighting, and physics. Professional real estate listing photography quality. Generate the updated image now.`;
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
  premium: boolean = false,
  isFirstInBatch?: boolean,
  styleReference?: string
): Promise<{ imageBase64: string; mimeType: string }> {
  const client = new GoogleGenAI({ apiKey });
  const model = premium ? PREMIUM_IMAGE_MODEL : IMAGE_MODEL;

  const prompt = buildStagingPrompt(
    style,
    roomType,
    colorPreference,
    instructions,
    isFirstInBatch,
    styleReference
  );

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
    model: IMAGE_MODEL,
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
    model: TEXT_MODEL,
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
