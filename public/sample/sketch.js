// Simple deterministic random number generator
class Random {
    constructor(seed) {
        this.seed = seed;
    }
    
    // Simple LCG (Linear Congruential Generator)
    next() {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return this.seed / 4294967296;
    }
    
    // Random float between min and max
    range(min, max) {
        return min + this.next() * (max - min);
    }
    
    // Random integer between min and max (inclusive)
    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }
}

// Global variables
let canvas;
let ctx;
let rng;
let currentHash = '';
let circles = [];

// Initialize on page load
window.onload = function() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    // Get hash from URL or generate random one
    const urlParams = new URLSearchParams(window.location.search);
    const hashParam = urlParams.get('hash');
    
    if (hashParam) {
        currentHash = hashParam;
    } else {
        // Generate random hash for testing
        currentHash = generateRandomHash();
    }
    
    // Listen for hash messages (for blockchain integration)
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'SET_HASH') {
            currentHash = event.data.hash;
            generate();
        }
    });
    
    generate();
};

function generateRandomHash() {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
}

function hashToSeed(hash) {
    // Convert hash to a numeric seed
    let seed = 0;
    for (let i = 0; i < hash.length; i++) {
        seed = ((seed << 5) - seed + hash.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(seed);
}

function generate() {
    // Update hash display
    document.getElementById('hash').textContent = currentHash.slice(0, 10) + '...';
    
    // Initialize random generator with hash
    const seed = hashToSeed(currentHash);
    rng = new Random(seed);
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Generate circles
    circles = [];
    const numCircles = rng.int(5, 15);
    
    for (let i = 0; i < numCircles; i++) {
        const circle = {
            x: rng.range(50, canvas.width - 50),
            y: rng.range(50, canvas.height - 50),
            radius: rng.range(10, 60),
            hue: rng.range(0, 360),
            saturation: rng.range(50, 100),
            lightness: rng.range(40, 80),
            alpha: rng.range(0.3, 0.8)
        };
        circles.push(circle);
    }
    
    // Draw circles
    drawCircles();
}

function drawCircles() {
    // Sort circles by radius (largest first) for better layering
    circles.sort((a, b) => b.radius - a.radius);
    
    circles.forEach(circle => {
        // Create gradient
        const gradient = ctx.createRadialGradient(
            circle.x, circle.y, 0,
            circle.x, circle.y, circle.radius
        );
        
        const color1 = `hsla(${circle.hue}, ${circle.saturation}%, ${circle.lightness}%, ${circle.alpha})`;
        const color2 = `hsla(${circle.hue}, ${circle.saturation}%, ${circle.lightness * 0.3}%, ${circle.alpha * 0.5})`;
        
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        
        // Draw circle
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add subtle stroke
        ctx.strokeStyle = `hsla(${circle.hue}, ${circle.saturation}%, ${circle.lightness + 20}%, 0.3)`;
        ctx.lineWidth = 2;
        ctx.stroke();
    });
}

function regenerate() {
    currentHash = generateRandomHash();
    generate();
}

function saveImage() {
    const link = document.createElement('a');
    link.download = `generative-circles-${currentHash.slice(2, 8)}.png`;
    link.href = canvas.toDataURL();
    link.click();
}

// Export features for platforms like fx(hash)
function getFeatures() {
    if (circles.length === 0) return {};
    
    const avgHue = circles.reduce((sum, c) => sum + c.hue, 0) / circles.length;
    const avgRadius = circles.reduce((sum, c) => sum + c.radius, 0) / circles.length;
    
    let palette = 'Warm';
    if (avgHue < 60) palette = 'Red-Orange';
    else if (avgHue < 120) palette = 'Yellow-Green';
    else if (avgHue < 180) palette = 'Green-Cyan';
    else if (avgHue < 240) palette = 'Blue';
    else if (avgHue < 300) palette = 'Purple';
    else palette = 'Pink-Red';
    
    let complexity = 'Low';
    if (circles.length > 8) complexity = 'Medium';
    if (circles.length > 12) complexity = 'High';
    
    let size = 'Small';
    if (avgRadius > 30) size = 'Medium';
    if (avgRadius > 45) size = 'Large';
    
    return {
        'Circle Count': circles.length,
        'Color Palette': palette,
        'Complexity': complexity,
        'Average Size': size,
        'Seed': hashToSeed(currentHash) % 10000
    };
}

// Make features available globally
window.getFeatures = getFeatures; 