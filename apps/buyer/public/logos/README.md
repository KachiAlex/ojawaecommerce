# OJAWA Logo Files

## How to Add Your Logo

Simply paste your logo files in this folder with one of these names:

### Supported Formats:
- `ojawa-logo.png` (Recommended - PNG with transparency)
- `ojawa-logo.svg` (Vector format - scalable)
- `ojawa-logo.jpg` (JPEG format)

### File Naming:
The app will automatically try to load your logo in this order:
1. `ojawa-logo.png`
2. `ojawa-logo.svg` (fallback)
3. `ojawa-logo.jpg` (fallback)

### Logo Specifications:
- **Size**: Any size (will be scaled automatically)
- **Format**: PNG (preferred), SVG, or JPG
- **Background**: Transparent PNG recommended
- **Aspect Ratio**: Square or rectangular (will fit properly)

### After Adding Your Logo:
1. Save your logo file in this folder
2. Run `npm run build` to rebuild the app
3. Deploy with `npx firebase-tools deploy --only hosting`

The logo will automatically appear in:
- Navigation bar
- Mobile menu
- Footer
- All other locations where the OJAWA logo is displayed

### Fallback:
If no logo file is found, the app will show a simple "O" icon as fallback.
