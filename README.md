# DTF Artwork Studio

A production-ready browser-only Next.js app for turning uploaded artwork into DTF-ready assets.

## Features
- Upload raster (`PNG/JPG/WebP`) and vector (`SVG`) artwork.
- Generate two transparent outputs:
  - **Dark Shirt Halftone** (black AM-style dots on alpha)
  - **White Knockout / Underbase Mask**
- Live t-shirt mockup with shirt color, placement, and white-ink simulation.
- Export as transparent PNG.
- For SVG input, optional SVG halftone export.
- Worker-based heavy pixel processing for responsive UI.

## Stack
- Next.js 14 + TypeScript + Tailwind
- Canvas 2D
- Web Worker (`src/workers/processor.worker.ts`)
- Browser-native SVG parsing/rasterization APIs

## Getting Started
```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## How Halftone Works
1. Decode source image and rasterize SVG at target print dimensions (`print width * DPI`).
2. Convert sRGB to linear luminance for more print-accurate thresholding.
3. Apply contrast and gamma.
4. Rotate sampling grid by user angle and evaluate luminance in each halftone cell.
5. Map luminance to dot radius and render black dots into a transparent RGBA buffer.
6. Preserve source transparency and optional highlight preservation.

## How Knockout / Underbase Works
1. Build alpha mask from source luminance + transparency.
2. Apply threshold and detail preservation weighting.
3. Apply choke/spread through morphological erosion/dilation.
4. Apply softness using blur.
5. Remove tiny islands with minimum dot/despeckle pass.
6. Output either:
   - **Underbase mode**: white alpha mask
   - **Knockout mode**: inverse transparency mask

## Recommended Settings
### Dark shirts (halftone)
- Dot size: 8–12 px
- Spacing: 10–16 px
- Angle: 22–35°
- Threshold: 120–160
- Gamma: 0.9–1.2

### White/light shirts (underbase)
- Mode: Underbase
- Strength: 65–90
- Choke: -2 to 1
- Softness: 1–3
- Detail: 70–90

## DTF Export Guidance
- Default to **300 DPI** for production.
- Keep transparent backgrounds for all exports.
- Use warning indicator if source resolution is below target print size.
- Export final halftone and underbase as separate PNG channels when needed by your RIP workflow.

## Project Structure
- `src/app/page.tsx`: main SPA orchestration and UI wiring
- `src/workers/processor.worker.ts`: halftone + knockout generation pipeline
- `src/components/`: reusable UI components
- `src/lib/`: utilities/types/default configuration
- `public/mockups/`: built-in mockup assets
