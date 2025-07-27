# Cosmic Network - Generative Art

An animated generative art piece featuring interconnected nodes with flowing energy connections.

## Features

- **Deterministic Generation**: Uses blockchain hash as seed for reproducible results
- **Animated Visualization**: Floating nodes with pulsing effects and energy flows
- **Dynamic Connections**: Lines that pulse with energy between nearby nodes
- **Interactive Controls**: Regenerate, save, and pause/play animation
- **Feature Analysis**: Automatic trait detection and categorization
- **Color Schemes**: Multiple pre-defined palettes for visual variety

## Visual Elements

### Nodes (Circles)
- 6-12 animated circles with subtle floating motion
- Radial gradients with pulsing effects
- Color schemes based on hash seed
- Varying sizes and glow effects

### Connections (Lines)
- Dynamic lines connecting nearby nodes
- Energy flow animations with particle effects
- Gradient colors blending node hues
- Distance-based opacity and thickness

### Animation
- Continuous floating motion for all nodes
- Pulsing effects synchronized to each node's rhythm
- Energy flow particles traveling along connections
- Smooth fade trail effects

## Hash Integration

Compatible with Permalink's hash injection system:
- Reads `tokenHash` from injected script
- Uses deterministic random generation
- Supports URL parameters for testing
- Responds to window messages for blockchain integration

## Features Detected

- **Nodes**: Number of circles generated (6-12)
- **Connections**: Number of active line connections
- **Palette**: Color scheme (Warm, Nature, Ocean, Sky, Mystic, Fire)
- **Complexity**: Based on node count (Simple/Moderate/Complex)
- **Connectivity**: Based on connection density (Sparse/Connected/Dense)
- **Node Size**: Average circle size (Small/Medium/Large)
- **Seed**: Numeric representation for uniqueness

## File Structure

- `index.html` - Main HTML with styling and layout
- `sketch.js` - Generative art logic and animation
- `README.md` - This documentation

## Size Optimization

Designed to be under 16KB when zipped for on-chain storage compatibility.

## Testing

1. Zip these three files together
2. Upload to Permalink platform
3. Each token ID will generate a unique network visualization
4. Animation runs automatically with interactive controls

---

Created for Permalink NFT Platform - Generative Art on Etherlink 