export const STYLES = [
  {
    id: "transitional",
    name: "Transitional",
    description: "The best of classic and contemporary — traditional comfort with modern clean lines",
    gradient: "from-stone-200 to-warm-300",
    imagePrompt: "A beautifully staged transitional living room with a neutral sofa, classic wingback chair, modern coffee table, and warm layered lighting",
  },
  {
    id: "modern_minimalist",
    name: "Modern Minimalist",
    description: "Sleek lines, open space, and a restrained neutral palette where every piece earns its place",
    gradient: "from-zinc-200 to-zinc-400",
    imagePrompt: "A sleek modern minimalist living room with a low-profile white sofa, geometric coffee table, and single statement art piece",
  },
  {
    id: "japandi",
    name: "Japandi",
    description: "Japanese minimalism meets Scandinavian warmth — clean lines, natural wood, intentional imperfection",
    gradient: "from-amber-100 to-stone-300",
    imagePrompt: "A serene Japandi living room with low wooden platform furniture, wabi-sabi pottery, shoji-inspired screens, and warm neutral tones",
  },
  {
    id: "organic_modern",
    name: "Organic Modern",
    description: "Earthy textures, raw wood, linen, and clay in a clean contemporary framework",
    gradient: "from-amber-200 to-stone-400",
    imagePrompt: "An organic modern living room with a curved boucle sofa, raw wood coffee table, clay vases, and linen curtains",
  },
  {
    id: "quiet_luxury",
    name: "Quiet Luxury",
    description: "Understated elegance with premium materials, matte finishes, and rich neutral tones",
    gradient: "from-stone-300 to-neutral-500",
    imagePrompt: "A quiet luxury living room with cashmere throws, marble side tables, rich cream upholstery, and soft ambient lighting",
  },
  {
    id: "scandinavian",
    name: "Scandinavian",
    description: "Light, bright, and functional with blonde wood and cozy textiles for effortless livability",
    gradient: "from-sky-100 to-blue-200",
    imagePrompt: "A bright Scandinavian living room with a light grey sofa, blonde oak furniture, white walls, and sheepskin throws",
  },
  {
    id: "mid_century_modern",
    name: "Mid-Century Modern",
    description: "Retro-inspired with tapered legs, warm wood tones, and iconic 1950s-60s silhouettes",
    gradient: "from-teal-200 to-emerald-300",
    imagePrompt: "A mid-century modern living room with an Eames-style lounge chair, walnut credenza, sunburst clock, and mustard accent pillows",
  },
  {
    id: "modern_heritage",
    name: "Modern Heritage",
    description: "Curated vintage character pieces with contemporary furnishings for layered sophistication",
    gradient: "from-rose-200 to-amber-300",
    imagePrompt: "A modern heritage living room mixing an antique Persian rug with a contemporary sofa, brass floor lamp, and collected art",
  },
  {
    id: "coastal",
    name: "Coastal",
    description: "Light and airy with ocean-inspired blues, sandy neutrals, and natural textures like rattan",
    gradient: "from-cyan-200 to-blue-300",
    imagePrompt: "A coastal living room with a white linen sofa, rattan armchairs, driftwood accents, and light blue throw pillows",
  },
  {
    id: "boho_chic",
    name: "Boho Chic",
    description: "Layered textiles, global patterns, and warm earth tones for a relaxed, well-traveled feel",
    gradient: "from-amber-200 to-orange-300",
    imagePrompt: "A boho chic living room with a kilim rug, macrame wall hanging, rattan peacock chair, and layered throw pillows",
  },
  {
    id: "traditional",
    name: "Traditional / Classic",
    description: "Timeless elegance with rich wood, symmetrical layouts, and refined fabrics",
    gradient: "from-amber-300 to-yellow-600",
    imagePrompt: "A traditional living room with a tufted Chesterfield sofa, dark wood console, crystal table lamps, and damask curtains",
  },
  {
    id: "luxury_contemporary",
    name: "Luxury Contemporary",
    description: "High-end modern living with statement lighting, premium materials, and bold details",
    gradient: "from-violet-200 to-purple-400",
    imagePrompt: "A luxury contemporary living room with a velvet sectional, sculptural lighting, marble fireplace, and oversized abstract art",
  },
  {
    id: "art_deco",
    name: "Art Deco",
    description: "Geometric patterns, jewel tones, polished brass, and glamorous symmetry",
    gradient: "from-yellow-300 to-amber-500",
    imagePrompt: "An art deco living room with a green velvet sofa, geometric gold mirror, brass side tables, and chevron area rug",
  },
] as const;

export const ROOM_TYPES = [
  { id: "living_room", name: "Living Room" },
  { id: "bedroom", name: "Bedroom" },
  { id: "kitchen", name: "Kitchen" },
  { id: "bathroom", name: "Bathroom" },
  { id: "dining_room", name: "Dining Room" },
  { id: "office", name: "Office" },
  { id: "closet", name: "Closet" },
  { id: "outdoor", name: "Outdoor / Patio" },
  { id: "laundry", name: "Laundry Room" },
  { id: "entryway", name: "Entryway / Foyer" },
  { id: "garage", name: "Garage" },
] as const;

export const COLOR_PREFERENCES = [
  { id: "warm_neutral", name: "Warm Neutrals", description: "Creams, beiges, warm whites, camel", colors: ["#F5F0E8", "#D4C5A9", "#C4A265", "#8B7355"] },
  { id: "cool_neutral", name: "Cool Neutrals", description: "Greys, silvers, cool whites, charcoal", colors: ["#E8E8E8", "#B0B0B0", "#6B7280", "#374151"] },
  { id: "earth_tones", name: "Earth Tones", description: "Terracotta, olive, rust, clay, moss", colors: ["#C67D4A", "#8B6F47", "#6B7F3E", "#A0522D"] },
  { id: "soft_pastels", name: "Soft Pastels", description: "Blush pink, sage green, powder blue, lavender", colors: ["#F0C4C4", "#B8C9A3", "#A8C8E8", "#C4B0D4"] },
  { id: "bold_jewel", name: "Bold & Jewel Tones", description: "Emerald, navy, burgundy, sapphire", colors: ["#1B5E3B", "#1B2A4A", "#722F37", "#1E3A5F"] },
  { id: "monochrome", name: "Monochrome", description: "Black, white, and shades of grey", colors: ["#FFFFFF", "#D1D1D1", "#666666", "#1A1A1A"] },
] as const;

export const REFINEMENT_SUGGESTIONS = [
  { label: "Rearrange furniture", prompt: "Rearrange the furniture layout to create a more open and inviting flow through the room" },
  { label: "Remove the couch", prompt: "Remove the sofa/couch and replace it with two accent armchairs" },
  { label: "Change the artwork", prompt: "Replace all wall art with different pieces that better match the style" },
  { label: "Add more plants", prompt: "Add several indoor plants — a large fiddle leaf fig, trailing pothos, and small succulents" },
  { label: "Make it cozier", prompt: "Add more throw pillows, a soft area rug, and warm ambient lighting to make it cozier" },
  { label: "Add a dining set", prompt: "Add a dining table with chairs appropriate for this space" },
  { label: "Simplify / less furniture", prompt: "Remove some furniture pieces to create a more minimal, open feel with fewer items" },
  { label: "Change rug", prompt: "Replace the area rug with a different style that better complements the room" },
  { label: "Add lighting", prompt: "Add a floor lamp, table lamp, or pendant light to improve the lighting ambiance" },
  { label: "Stage for kids", prompt: "Add kid-friendly elements — toy storage, a small play area, and family-oriented decor" },
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
export type ColorPreferenceId = (typeof COLOR_PREFERENCES)[number]["id"];
