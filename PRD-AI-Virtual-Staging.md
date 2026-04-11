# PRD: StageAI — AI Virtual Staging for Real Estate

**Version:** 1.0
**Author:** Zoli Honig
**Date:** April 10, 2026
**Stack:** Next.js 14 (App Router) + Supabase + Gemini API (Nano Banana)
**Target:** Claude Code build

---

## 1. Product Overview

StageAI is a premium AI-powered virtual staging platform for real estate agents. Upload property photos of empty or furnished rooms. Select a design style. Get back photorealistic staged images instantly. Batch process an entire listing in one shot.

The AI must preserve the base image completely. Walls, windows, floors, architectural details, lighting, shadows, perspective. None of it changes. The AI only adds furniture, decor, and soft goods into the existing space.

### 1.1 Core Value Proposition

- Stage an entire listing (15-25 photos) in under 5 minutes
- Cost: fraction of physical staging ($2,000-5,000) or even human virtual staging ($50-150/photo)
- MLS-compliant exports with automatic "Virtually Staged" watermark
- Multi-format export for MLS, Instagram, Reels, and print

### 1.2 Target User

Real estate agents and brokers. Specifically:
- Residential agents listing vacant or poorly furnished properties
- Luxury agents who need Sotheby's-caliber presentation
- Property managers staging rental units for marketing
- Real estate photographers adding staging as an upsell

### 1.3 Brand & Design Language

The UI should feel like a Sotheby's International Realty digital experience. Think:
- Color palette: Deep navy (#1B2A4A), warm ivory (#F5F0E8), gold accent (#C4A265), white (#FFFFFF)
- Typography: Serif headers (Playfair Display or similar), clean sans-serif body (Inter)
- Minimal, generous whitespace, editorial layout
- Subtle animations, no gimmicks
- Dark mode support with inverted palette (ivory on navy)
- Photography-forward UI. Images are the hero, not chrome

---

## 2. Architecture

### 2.1 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Auth | Supabase Auth (magic link + Google OAuth) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage (original uploads + generated images) |
| AI Engine | Google Gemini API — Nano Banana 2 (`gemini-3.1-flash-image-preview`) for speed, Nano Banana Pro (`gemini-3-pro-image-preview`) for premium quality |
| Image Processing | Sharp (Node.js) for resizing, cropping, format conversion, watermarking |
| Payments | Stripe (subscription + per-image credits) |
| Deployment | Vercel |

### 2.2 Gemini API Integration

The user will provide their own Gemini API key. The app stores it encrypted in Supabase (AES-256) and uses it server-side for all image generation.

**Primary approach: Conversational image editing via Nano Banana**

The Gemini Nano Banana models support conversational image editing. You send the original photo plus a text prompt describing what to add. The model returns the edited image. This is the preferred approach because:

1. No manual mask creation needed. The model understands spatial context
2. The prompt can specify "add furniture to this room without changing the walls, windows, floors, or architectural elements"
3. Supports iterative refinement in a conversation thread

**API Call Pattern:**

```typescript
import { GoogleGenAI } from "@google/genai";

const client = new GoogleGenAI({ apiKey: userApiKey });

const response = await client.models.generateContent({
  model: "gemini-3.1-flash-image-preview", // or gemini-3-pro-image-preview for premium
  contents: [
    {
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/jpeg",
            data: base64ImageData
          }
        },
        {
          type: "text",
          text: buildStagingPrompt(style, roomType, instructions)
        }
      ]
    }
  ]
});
```

**Fallback approach: Imagen 3 inpainting**

If conversational editing doesn't preserve the base image well enough, fall back to Imagen 3 (`imagen-3.0-capability-001`) inpainting via Vertex AI:
1. Auto-detect empty floor/surface areas as mask regions
2. Use inpainting to insert furniture only in masked areas
3. This gives more precise control but requires mask generation

**Prompt Engineering (Critical):**

The staging prompt must be highly specific to prevent the model from altering the base image. Template:

```
You are a professional interior designer virtually staging a real estate listing photo.

ABSOLUTE RULES:
- Do NOT change, alter, modify, or replace any walls, windows, doors, floors, ceilings, light fixtures, or architectural elements
- Do NOT change the perspective, camera angle, lighting direction, or color temperature
- Do NOT add or remove any structural elements
- Do NOT change wall colors, flooring materials, or window treatments that already exist
- ONLY add furniture, decor, rugs, art, and soft goods

STYLE: {style_name}
ROOM TYPE: {room_type}
SPECIFIC INSTRUCTIONS: {user_instructions}

Add tasteful, proportionally correct {style_name} furniture appropriate for a {room_type}. 
Ensure furniture placement respects the room's geometry, doorways, and traffic flow.
Shadows and reflections must match the existing lighting in the photo.
The result must be photorealistic and indistinguishable from a real photograph.
```

### 2.3 Database Schema

```sql
-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  gemini_api_key_encrypted text,
  plan text default 'free', -- free, pro, enterprise
  credits_remaining int default 5,
  created_at timestamptz default now()
);

-- Listings (a group of photos for one property)
create table listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  address text,
  created_at timestamptz default now()
);

-- Original Photos
create table photos (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  storage_path text not null,
  room_type text, -- living_room, bedroom, kitchen, bathroom, dining, office, outdoor
  display_order int,
  width int,
  height int,
  created_at timestamptz default now()
);

-- Staged Versions
create table staged_photos (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid references photos(id) on delete cascade,
  style text not null, -- boho_chic, modern, mid_century, scandinavian, etc.
  storage_path text not null,
  prompt_used text,
  model_used text,
  generation_time_ms int,
  quality_score float, -- internal scoring if we add it
  created_at timestamptz default now()
);

-- Export Jobs
create table exports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id),
  format text not null, -- mls, instagram_carousel, instagram_reels, print
  status text default 'pending', -- pending, processing, complete, failed
  storage_path text,
  created_at timestamptz default now()
);
```

---

## 3. Features — V1

### 3.1 Photo Upload

- Drag-and-drop multi-file upload (up to 50 photos per listing)
- Accept JPEG, PNG, HEIC, WebP. Auto-convert to JPEG for processing
- Auto-detect room type using Gemini vision (living room, bedroom, kitchen, bathroom, dining room, office, outdoor/patio)
- Allow manual room type override
- Thumbnail grid view with drag-to-reorder
- Upload progress with individual file status indicators
- EXIF data preservation for original files

### 3.2 Style Selection

Predefined styles the user can pick from. Multiple styles can be selected per listing to generate variants.

| Style | Description |
|---|---|
| Modern Minimalist | Clean lines, neutral palette, statement pieces, minimal clutter |
| Boho Chic | Layered textures, warm tones, plants, macrame, natural materials |
| Mid-Century Modern | Retro-inspired, tapered legs, bold accent colors, organic curves |
| Scandinavian | Light wood, white/grey palette, hygge vibes, functional simplicity |
| Industrial | Exposed elements, metal + wood, Edison bulbs, leather, raw textures |
| Coastal | Light blues, whites, natural fibers, driftwood, nautical accents |
| Traditional / Classic | Rich wood furniture, crown molding styling, formal arrangements |
| Luxury Contemporary | High-end materials, designer pieces, art-forward, editorial feel |
| Farmhouse | Shiplap-friendly, distressed wood, cozy textiles, vintage accents |
| Art Deco | Geometric patterns, velvet, metallics, bold symmetry |

Users can also type custom style instructions (e.g., "Japanese wabi-sabi with low furniture and tatami-inspired textures").

### 3.3 Batch Processing

This is the killer feature. Stage an entire listing at once.

**Flow:**
1. Upload all photos for a listing
2. Confirm/edit room types
3. Select 1-3 styles
4. Click "Stage All"
5. System queues all photos and processes them in parallel (respecting Gemini API rate limits)
6. Real-time progress: each photo shows a spinner, then reveals the staged version
7. Side-by-side before/after comparison slider for each photo

**Rate limiting strategy:**
- Nano Banana 2: up to 10 requests per minute (RPM), 1500 requests per day (RPD)
- Process photos in batches of 5 with 6-second intervals
- Show estimated time remaining based on queue depth
- Allow user to prioritize specific photos (drag to top of queue)

### 3.4 Before/After Comparison

- Slider-based comparison (drag divider left/right)
- Toggle view (tap to switch between original and staged)
- Full-screen lightbox mode
- Side-by-side grid view for comparing multiple styles of the same room

### 3.5 Export System

Multi-format export engine. User selects which format(s) they need.

| Format | Dimensions | Aspect Ratio | Use Case |
|---|---|---|---|
| MLS Standard | 2048 x 1536 px | 4:3 | MLS upload (BeachesMLS, Bright, Stellar, etc.) |
| MLS HD | 3000 x 2000 px | 3:2 | High-res MLS / Zillow / Realtor.com |
| Instagram Carousel | 1080 x 1350 px | 4:5 | IG carousel posts |
| Instagram Reels / Stories | 1080 x 1920 px | 9:16 | IG Reels cover, Stories |
| Print Flyer | 4000 x 2666 px, 300 DPI | 3:2 | Brochures, postcards, mailers |
| Square Social | 1080 x 1080 px | 1:1 | Facebook, LinkedIn |
| Original Resolution | Match input | Match input | Full quality download |

**Export options:**
- Download as ZIP (all photos in selected format)
- Individual photo download
- Auto-apply "Virtually Staged" watermark (semi-transparent, bottom-right corner). Toggle on/off per MLS compliance
- JPEG quality slider (70-100%)
- Optional: add listing address text overlay
- Filename convention: `{address}-{room_type}-{style}-{format}.jpg`

### 3.6 Image Enhancement Filters

Post-staging filters that apply non-destructively:

- **Warm Glow**: Slight warm color temperature shift for inviting feel
- **Cool Crisp**: Slightly cooler tones for modern/luxury feel
- **HDR Boost**: Enhanced dynamic range, brighter shadows, controlled highlights
- **Twilight**: Simulated dusk lighting on exterior shots (window glow effect)
- **Brightness / Contrast / Saturation**: Manual sliders
- **Vignette**: Subtle edge darkening for editorial feel

Filters should preview in real-time and be applied at export time using Sharp.

### 3.7 API Key Management

- Settings page where user inputs their Gemini API key
- Key is encrypted before storage (AES-256-GCM with per-user IV)
- "Test Connection" button that makes a minimal API call to verify the key works
- Usage tracking: show API calls made this session and estimated cost
- Never display the full key after initial entry. Show masked version (sk-...xxxx)

---

## 4. User Flows

### 4.1 Onboarding

1. Landing page with hero section showing before/after staging demo
2. "Get Started Free" CTA. 5 free staging credits
3. Sign up via magic link or Google OAuth
4. Prompt to enter Gemini API key (with link to Google AI Studio to get one)
5. Quick tutorial overlay: Upload > Style > Stage > Export

### 4.2 New Listing Flow

1. Click "+ New Listing"
2. Enter listing name and optional address
3. Drag-and-drop photos (or click to browse)
4. AI auto-detects room types. User confirms/edits
5. Select style(s) from grid of visual swatches
6. Optional: add custom instructions per room or globally
7. Click "Stage Listing"
8. Processing screen with real-time progress
9. Review staged photos with before/after sliders
10. Select export format(s) and download

### 4.3 Re-staging / Style Change

- From any listing, user can select individual photos or "Select All"
- Choose a different style
- Re-stage only selected photos
- New versions are saved alongside originals (non-destructive)

---

## 5. Pages & Components

### 5.1 Pages

| Route | Page | Description |
|---|---|---|
| `/` | Landing | Hero, features, pricing, CTA |
| `/login` | Auth | Magic link + Google OAuth |
| `/dashboard` | Dashboard | Listing grid, stats, recent activity |
| `/listing/new` | New Listing | Upload + style selection wizard |
| `/listing/[id]` | Listing Detail | Photo grid, staging controls, export |
| `/listing/[id]/compare` | Compare View | Full-screen before/after |
| `/settings` | Settings | API key, account, billing |
| `/pricing` | Pricing | Plan comparison |

### 5.2 Key Components

- `PhotoUploader`: Multi-file drag-drop with preview grid
- `StyleSelector`: Visual swatch grid with style previews
- `StagingQueue`: Real-time processing status for batch jobs
- `BeforeAfterSlider`: Draggable comparison slider
- `ExportModal`: Format selection, watermark toggle, download
- `PhotoGrid`: Masonry or uniform grid with selection checkboxes
- `FilterPanel`: Enhancement controls with live preview
- `ApiKeyInput`: Secure input with test + mask functionality
- `RoomTypeSelector`: Dropdown with auto-detected suggestion
- `ListingCard`: Dashboard card showing listing thumbnail, photo count, date

---

## 6. Compliance & Legal

### 6.1 MLS Disclosure

- California AB 723 (effective 2026): Requires access to original unaltered photo alongside any virtually staged version. The app must store and make originals downloadable
- NAR Code of Ethics Articles 2 and 12: Agents must disclose use of digitally altered images
- Auto-watermark "Virtually Staged" on all exported images by default
- Option to include original (unstaged) photos in export ZIP alongside staged versions

### 6.2 Data Privacy

- API keys encrypted at rest
- Original photos stored in user-scoped Supabase Storage buckets
- No photos shared between users
- GDPR-compliant data deletion on account closure
- No training on user photos (Gemini API terms apply)

---

## 7. V2 Roadmap (Do Not Build Yet)

These are noted for architecture planning only. Do not implement in V1.

- **AI Video Walkthroughs**: Use Veo 3 to generate cinematic walkthrough videos from staged photos. Auto-stitch rooms into a smooth virtual tour with transitions
- **AR Preview**: Let buyers point their phone at an empty room and see staged furniture in AR
- **Style Transfer from Reference**: Upload a photo of a room you like. AI matches that exact style
- **Furniture Catalog Integration**: Partner with Wayfair / West Elm / RH APIs to show actual purchasable pieces
- **Team / Brokerage Accounts**: Multi-user with shared listing library
- **White Label**: Remove StageAI branding for enterprise brokerages
- **MLS Direct Integration**: Push staged photos directly to BeachesMLS, Bright MLS, etc. via RESO Web API
- **Listing Description Generator**: AI-generated property descriptions from staged photos

---

## 8. Pricing Model

| Plan | Price | Credits | Features |
|---|---|---|---|
| Free | $0 | 5 photos | Single style, MLS export only |
| Pro | $49/mo | 100 photos/mo | All styles, all exports, batch processing, filters |
| Enterprise | $149/mo | 500 photos/mo | Everything + priority processing, custom styles, API access |
| Pay-as-you-go | $0.50/photo | N/A | Available on any plan for overages |

---

## 9. Success Metrics

- Time to stage a full listing (target: under 3 minutes for 15 photos)
- Image quality score (internal: % of generations that don't alter base image)
- Export download rate (are users actually using the staged photos?)
- User retention at 30/60/90 days
- NPS from real estate agents
- Conversion: free to Pro

---

## 10. Technical Notes for Claude Code

### 10.1 Build Order

1. Supabase project setup (auth, database, storage)
2. Next.js app scaffold with Tailwind + design system (colors, typography, components)
3. Auth flow (magic link + Google)
4. Settings page with API key management
5. Photo upload system with Supabase Storage
6. Gemini API integration with prompt engineering
7. Batch processing queue with real-time status
8. Before/after comparison UI
9. Export system with Sharp
10. Filters
11. Landing page + pricing
12. Polish + responsive

### 10.2 Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY= # for API key encryption
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
```

User's Gemini API key is stored encrypted in DB, not in env vars.

### 10.3 Key Constraints

- All image processing happens server-side (API routes / server actions)
- Never expose user's Gemini API key to the client
- Implement retry logic with exponential backoff for Gemini API failures
- Queue system must handle graceful failure (mark individual photos as failed, don't block the batch)
- All staged images must be stored with a reference back to the original photo ID
- Original photos are never modified or deleted during staging
- Mobile-responsive. Many agents will use this on their phones at a property

### 10.4 Image Preservation Validation

After each staging generation, run a validation check:
1. Compare structural similarity (SSIM) between original and staged image for wall/window regions
2. If SSIM drops below threshold (< 0.85 in architectural regions), flag the image and offer regeneration
3. Use Gemini vision to verify: "Does this image show the exact same room structure, walls, and windows as the original? Answer yes or no."

This catches cases where the model hallucinated structural changes.
