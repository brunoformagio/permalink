# Generative Circles - Sample Artwork

This is a sample generative art package for testing the Permalink platform's .zip file support.

## Features

- **Deterministic Generation**: Uses blockchain hash as seed for reproducible results
- **Interactive Controls**: Regenerate button and save PNG functionality
- **Feature Detection**: Automatically categorizes artwork traits
- **Responsive Design**: Works on desktop and mobile devices

## Files

- `index.html` - Main HTML file with UI and styling
- `sketch.js` - JavaScript code for generative art logic
- `README.md` - This documentation file

## How it Works

1. The artwork uses a deterministic random number generator seeded with a blockchain hash
2. Generates 5-15 colorful circles with random positions, sizes, and colors
3. Creates radial gradients for visual depth
4. Layers circles by size for better composition
5. Extracts features like color palette, complexity, and average size

## Features Detected

- **Circle Count**: Number of circles generated (5-15)
- **Color Palette**: Dominant color family (Red-Orange, Yellow-Green, etc.)
- **Complexity**: Based on circle count (Low/Medium/High)
- **Average Size**: Based on circle radius (Small/Medium/Large)
- **Seed**: Numeric representation of the hash

## Testing

To test this artwork:
1. Zip these files together
2. Upload the .zip file to Permalink
3. The artwork will be stored on-chain and generate unique variations based on the token hash

## Size Optimization

This sample is designed to be under 16KB when zipped, making it suitable for on-chain storage on the Permalink platform.

---

Created for Permalink NFT Platform - Generative Art on Etherlink 