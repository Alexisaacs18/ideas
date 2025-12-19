# Prosey Logo Setup

## Files Created
- `logo.svg` - High-resolution SVG logo (512x512 viewBox)
- Logo features a minimalist, geometric design combining:
  - Stylized 'P' letterform
  - Feather/wing elements (inspired by Osprey)
  - Digital Garden color palette (deep forest greens, slate grays)

## Generate PNG Version

To create the PNG version (512x512) needed for favicons and social media:

### Option 1: Using Node.js (sharp)
```bash
npm install sharp --save-dev
node generate-logo-png.js
```

### Option 2: Using ImageMagick
```bash
convert logo.svg -resize 512x512 -background none public/logo.png
```

### Option 3: Online Converter
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `logo.svg` (from project root)
3. Set size to 512x512
4. Download and save as `logo.png` in the `public/` folder

## Current Status
✅ SVG logo created
✅ HTML updated with all favicon and social media meta tags
✅ vite.svg removed
⏳ PNG version needs to be generated (use one of the methods above)

## Meta Tags Included
- Standard favicon (SVG + PNG fallback)
- Apple Touch Icon
- Open Graph tags (Facebook, LinkedIn)
- Twitter Card tags
- All pointing to `/logo.png` for social sharing

