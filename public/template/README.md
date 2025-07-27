# Generative Art Template for Permalink Platform

## Overview
This template provides a complete starter framework for creating generative/interactive artwork that works seamlessly with the Permalink NFT platform.

## Features
- ✅ Hash-based deterministic randomization
- ✅ Full screen canvas (no UI distractions)
- ✅ Platform compatibility with hash injection
- ✅ Responsive auto-sizing canvas
- ✅ Clean, minimal design
- ✅ Under 16KB for on-chain storage

## Quick Start

1. **Download the template**: `generative-art-template.zip`
2. **Extract the files**: You'll get `index.html` and `sketch.js`
3. **Customize the art**: Edit the `generate()` function in `sketch.js`
4. **Test locally**: Open `index.html` in your browser
5. **Optimize**: Ensure total file size stays under 16KB
6. **Package**: Zip both files together (keep names as `index.html` and `sketch.js`)
7. **Upload**: Use the Permalink create page to mint your series

## How It Works

### Hash System
```javascript
// The platform provides a unique hash for each NFT
tokenHash = "0x1234567890abcdef..."; // 64-character hex string

// Use the HashRandom class for all randomization
const rng = new HashRandom(tokenHash);
const randomValue = rng.next();        // 0-1
const randomInt = rng.int(1, 10);      // Integer 1-10
const randomColor = rng.choice(['red', 'blue', 'green']);
```

### Customization Areas

#### 1. Replace Art Generation (in sketch.js)
```javascript
function generate() {
    // Replace the artwork section with your own logic
    // Always use 'rng' for randomization, never Math.random()
    
    // Example: Your custom artwork
    const color = rng.choice(['#ff0000', '#00ff00', '#0000ff']);
    const x = rng.range(0, canvas.width);
    const y = rng.range(0, canvas.height);
    // ... your drawing code here
}
```

#### 2. Scale for Full Screen
```javascript
// Scale elements relative to canvas size for responsiveness
const size = rng.range(canvas.width * 0.01, canvas.width * 0.1);
const x = rng.range(0, canvas.width);
const y = rng.range(0, canvas.height);
```

#### 3. Customize Your Art
- The canvas automatically fills the entire viewport
- All artwork elements should scale with canvas.width and canvas.height
- No UI elements or text overlays to worry about

## Best Practices

### File Size Optimization
- Minimize whitespace and comments
- Use short variable names in production
- Avoid external dependencies
- Compress images to base64 if needed

### Randomization Rules
- ✅ Always use `rng.*` methods
- ❌ Never use `Math.random()`
- ✅ Same hash = same artwork
- ✅ Different hash = different artwork

### Testing
1. Test with multiple hashes to ensure variety
2. Verify deterministic behavior (same input = same output)
3. Test at different screen sizes to ensure responsiveness
4. Verify artwork scales properly with viewport

## Canvas Drawing Examples

### Basic Shapes
```javascript
// Circle
ctx.beginPath();
ctx.arc(x, y, radius, 0, Math.PI * 2);
ctx.fill();

// Rectangle
ctx.fillRect(x, y, width, height);

// Line
ctx.beginPath();
ctx.moveTo(x1, y1);
ctx.lineTo(x2, y2);
ctx.stroke();
```

### Colors
```javascript
// Solid colors
ctx.fillStyle = '#ff0000';
ctx.strokeStyle = 'rgb(255, 0, 0)';

// Gradients
const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
gradient.addColorStop(0, '#ff0000');
gradient.addColorStop(1, '#0000ff');
ctx.fillStyle = gradient;
```

## Platform Integration

The template automatically handles:
- Hash injection from the Permalink platform
- Canvas resizing for any viewport size
- Cross-platform compatibility
- Full screen artwork display

## File Structure
```
your-artwork.zip
├── index.html          # HTML file (references sketch.js)
├── sketch.js          # Your artwork logic (customize this)
├── assets/            # Optional: images, data files
│   ├── texture.png
│   └── data.json
└── README.md          # Optional: artwork description
```

## Troubleshooting

### Common Issues
1. **Same artwork every time**: Check if you're using `Math.random()` instead of `rng.*`
2. **File too large**: Remove comments, compress assets, minimize code
3. **Artwork not scaling**: Use canvas.width/canvas.height for responsive sizing
4. **Canvas appears blank**: Ensure generateArt() is called after canvas resize

### Debug Mode
Add this to see hash information:
```javascript
console.log('Hash:', tokenHash);
console.log('First 10 random values:', 
    Array.from({length: 10}, () => rng.next()));
```

## Support

For questions or issues:
- Check the Permalink platform documentation
- Test your artwork thoroughly before minting
- Ensure compatibility with the provided hash system

## License
This template is provided as-is for creating artwork on the Permalink platform. 