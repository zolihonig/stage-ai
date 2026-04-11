export const STYLES = [
  {
    id: "modern_minimalist",
    name: "Modern Minimalist",
    description: "Clean lines, neutral palette, statement pieces",
    gradient: "from-zinc-200 to-zinc-400",
  },
  {
    id: "boho_chic",
    name: "Boho Chic",
    description: "Layered textures, warm tones, plants, natural materials",
    gradient: "from-amber-200 to-orange-300",
  },
  {
    id: "mid_century_modern",
    name: "Mid-Century Modern",
    description: "Retro-inspired, tapered legs, bold accents, organic curves",
    gradient: "from-teal-200 to-emerald-300",
  },
  {
    id: "scandinavian",
    name: "Scandinavian",
    description: "Light wood, white/grey palette, functional simplicity",
    gradient: "from-sky-100 to-blue-200",
  },
  {
    id: "industrial",
    name: "Industrial",
    description: "Exposed elements, metal + wood, Edison bulbs, leather",
    gradient: "from-stone-300 to-stone-500",
  },
  {
    id: "coastal",
    name: "Coastal",
    description: "Light blues, whites, natural fibers, nautical accents",
    gradient: "from-cyan-200 to-blue-300",
  },
  {
    id: "traditional",
    name: "Traditional / Classic",
    description: "Rich wood, formal arrangements, crown molding styling",
    gradient: "from-amber-300 to-yellow-600",
  },
  {
    id: "luxury_contemporary",
    name: "Luxury Contemporary",
    description: "High-end materials, designer pieces, art-forward",
    gradient: "from-violet-200 to-purple-400",
  },
  {
    id: "farmhouse",
    name: "Farmhouse",
    description: "Shiplap-friendly, distressed wood, cozy textiles",
    gradient: "from-lime-200 to-green-300",
  },
  {
    id: "art_deco",
    name: "Art Deco",
    description: "Geometric patterns, velvet, metallics, bold symmetry",
    gradient: "from-yellow-300 to-amber-500",
  },
] as const;

export const ROOM_TYPES = [
  { id: "living_room", name: "Living Room" },
  { id: "bedroom", name: "Bedroom" },
  { id: "kitchen", name: "Kitchen" },
  { id: "bathroom", name: "Bathroom" },
  { id: "dining_room", name: "Dining Room" },
  { id: "office", name: "Office" },
  { id: "outdoor", name: "Outdoor / Patio" },
] as const;

export const EXPORT_FORMATS = [
  { id: "mls_standard", name: "MLS Standard", width: 2048, height: 1536, ratio: "4:3" },
  { id: "mls_hd", name: "MLS HD", width: 3000, height: 2000, ratio: "3:2" },
  { id: "instagram_carousel", name: "Instagram Carousel", width: 1080, height: 1350, ratio: "4:5" },
  { id: "instagram_reels", name: "Instagram Reels", width: 1080, height: 1920, ratio: "9:16" },
  { id: "print_flyer", name: "Print Flyer", width: 4000, height: 2666, ratio: "3:2" },
  { id: "square_social", name: "Square Social", width: 1080, height: 1080, ratio: "1:1" },
  { id: "original", name: "Original Resolution", width: 0, height: 0, ratio: "original" },
] as const;

export type StyleId = (typeof STYLES)[number]["id"];
export type RoomType = (typeof ROOM_TYPES)[number]["id"];
export type ExportFormat = (typeof EXPORT_FORMATS)[number]["id"];
