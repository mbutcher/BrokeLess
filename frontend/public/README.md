# Frontend Public Assets

This directory contains static assets served directly by the web server.

## Required Assets

### Favicon
- **File**: `favicon.ico`
- **Size**: 32x32 or 16x16 pixels (ICO format supports multiple sizes)
- **Format**: ICO
- **Description**: Browser tab icon

### PWA Icons
All icons should be PNG format with transparent or solid background. Create icons in the following sizes:

#### Standard Icons (any purpose)
- `icons/icon-72.png` - 72x72px
- `icons/icon-96.png` - 96x96px
- `icons/icon-128.png` - 128x128px
- `icons/icon-144.png` - 144x144px
- `icons/icon-152.png` - 152x152px
- `icons/icon-192.png` - 192x192px
- `icons/icon-384.png` - 384x384px
- `icons/icon-512.png` - 512x512px

#### Maskable Icons (adaptive icons for Android)
- `icons/icon-192-maskable.png` - 192x192px
- `icons/icon-512-maskable.png` - 512x512px

**Maskable icon guidelines:**
- Add 10% safe zone padding around important content
- Icon should look good when cropped to various shapes (circle, square, rounded square)
- Use online tool: https://maskable.app/ to preview

## Generating Icons

### Option 1: Design Tool (Recommended for production)
1. Create a 512x512px icon in Figma/Adobe Illustrator/Inkscape
2. Use a tool like [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator) to generate all sizes:
   ```bash
   npx pwa-asset-generator logo.svg ./public/icons --manifest ./public/manifest.json
   ```

### Option 2: Online Generators
- [RealFaviconGenerator](https://realfavicongenerator.net/) - Comprehensive favicon and PWA icon generator
- [Favicon.io](https://favicon.io/) - Simple favicon generator from text, image, or emoji

### Option 3: ImageMagick (Quick placeholders)
If you have ImageMagick installed:

```bash
#!/bin/bash
# Create a simple placeholder icon (blue square with white text)
mkdir -p public/icons

# Generate base 512x512 icon
convert -size 512x512 xc:#3b82f6 -gravity center \
  -font Arial-Bold -pointsize 240 -fill white \
  -annotate +0+0 'B' public/icons/icon-512.png

# Generate other sizes
for size in 72 96 128 144 152 192 384; do
  convert public/icons/icon-512.png -resize ${size}x${size} public/icons/icon-${size}.png
done

# Generate maskable icons (with padding)
convert -size 512x512 xc:#3b82f6 -gravity center \
  -font Arial-Bold -pointsize 200 -fill white \
  -annotate +0+0 'B' public/icons/icon-512-maskable.png

convert -size 192x192 xc:#3b82f6 -gravity center \
  -font Arial-Bold -pointsize 80 -fill white \
  -annotate +0+0 'B' public/icons/icon-192-maskable.png

# Generate favicon.ico
convert public/icons/icon-32.png public/favicon.ico
```

### Option 4: Temporary SVG Placeholder
For development, you can use an SVG favicon:

```html
<!-- Replace in index.html temporarily -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
```

Create `public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#3b82f6"/>
  <text x="16" y="24" font-family="Arial" font-weight="bold"
        font-size="20" fill="white" text-anchor="middle">B</text>
</svg>
```

## Design Recommendations

### Color Scheme
- Primary: `#3b82f6` (blue-500 from Tailwind)
- Background: `#ffffff` (white)
- Text/Icon: Choose a recognizable symbol for budgeting (e.g., dollar sign, wallet, chart)

### Icon Content Ideas
- **B** letter (Budget)
- **$** dollar sign with stylized design
- **📊** Chart/graph icon
- **💰** Wallet or money bag
- **📈** Trending up graph (representing budget growth)

### Best Practices
1. Keep it simple - icons should be recognizable at small sizes
2. Use high contrast for visibility
3. Avoid fine details that won't render well at 16x16 or 32x32
4. Test on multiple devices and platforms
5. Ensure maskable icons work when cropped to circle

## Current Status
- ✅ manifest.json created
- ⏳ Icons need to be generated (see options above)
- ⏳ favicon.ico needs to be created

## References
- [Web.dev: Add a web app manifest](https://web.dev/add-manifest/)
- [MDN: Web app manifests](https://developer.mozilla.org/en-US/docs/Web/Manifest)
- [Maskable Icons](https://web.dev/maskable-icon/)
