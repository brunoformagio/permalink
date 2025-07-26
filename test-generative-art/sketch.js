// Deterministic random number generator
class Random {
    constructor(seed) {
        this.seed = seed;
    }
    
    next() {
        this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
        return this.seed / 4294967296;
    }
    
    range(min, max) {
        return min + this.next() * (max - min);
    }
    
    int(min, max) {
        return Math.floor(this.range(min, max + 1));
    }
    
    choice(array) {
        return array[this.int(0, array.length - 1)];
    }
}

// Global variables
let canvas, ctx, rng;
let currentHash = '';
let generationCount = 1;
let nodes = [];
let connections = [];
let animationId;
let isAnimating = true;
let time = 0;
let isNFTMode = false; // Track if this is a minted NFT

// Node class for circles
class Node {
    constructor(x, y, radius, hue, speed, phase) {
        this.baseX = x;
        this.baseY = y;
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.hue = hue;
        this.speed = speed;
        this.phase = phase;
        this.pulse = 0;
    }
    
    update(t) {
        // Subtle floating motion
        this.x = this.baseX + Math.sin(t * this.speed + this.phase) * 15;
        this.y = this.baseY + Math.cos(t * this.speed * 0.7 + this.phase) * 10;
        this.pulse = Math.sin(t * this.speed * 2 + this.phase) * 0.3 + 1;
    }
    
    draw(ctx) {
        const gradient = ctx.createRadialGradient(
            this.x, this.y, 0,
            this.x, this.y, this.radius * this.pulse
        );
        
        gradient.addColorStop(0, `hsla(${this.hue}, 80%, 70%, 0.9)`);
        gradient.addColorStop(0.7, `hsla(${this.hue}, 60%, 50%, 0.6)`);
        gradient.addColorStop(1, `hsla(${this.hue}, 40%, 30%, 0.1)`);
        
        // Main circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.pulse, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Outer glow
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.pulse * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 60%, 50%, 0.1)`;
        ctx.fill();
        
        // Core highlight
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * this.pulse * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 90%, 90%, 0.8)`;
        ctx.fill();
    }
}

// Connection class for lines
class Connection {
    constructor(nodeA, nodeB, strength) {
        this.nodeA = nodeA;
        this.nodeB = nodeB;
        this.strength = strength;
        this.energy = 0;
    }
    
    update(t) {
        this.energy = Math.sin(t * 2 + this.strength * 10) * 0.5 + 0.5;
    }
    
    draw(ctx) {
        const distance = Math.sqrt(
            Math.pow(this.nodeB.x - this.nodeA.x, 2) + 
            Math.pow(this.nodeB.y - this.nodeA.y, 2)
        );
        
        if (distance < 150) {
            const opacity = (1 - distance / 150) * this.strength * this.energy;
            const avgHue = (this.nodeA.hue + this.nodeB.hue) / 2;
            
            // Energy flow effect
            const gradient = ctx.createLinearGradient(
                this.nodeA.x, this.nodeA.y,
                this.nodeB.x, this.nodeB.y
            );
            
            gradient.addColorStop(0, `hsla(${this.nodeA.hue}, 70%, 60%, ${opacity})`);
            gradient.addColorStop(0.5, `hsla(${avgHue}, 80%, 70%, ${opacity * 1.5})`);
            gradient.addColorStop(1, `hsla(${this.nodeB.hue}, 70%, 60%, ${opacity})`);
            
            ctx.beginPath();
            ctx.moveTo(this.nodeA.x, this.nodeA.y);
            ctx.lineTo(this.nodeB.x, this.nodeB.y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = this.strength * 3 * this.energy;
            ctx.stroke();
            
            // Energy particles
            if (this.energy > 0.7) {
                const particleX = this.nodeA.x + (this.nodeB.x - this.nodeA.x) * this.energy;
                const particleY = this.nodeA.y + (this.nodeB.y - this.nodeA.y) * this.energy;
                
                ctx.beginPath();
                ctx.arc(particleX, particleY, 2, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${avgHue}, 90%, 80%, ${opacity})`;
                ctx.fill();
            }
        }
    }
}

// Initialize on page load
window.onload = function() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    
    // Get hash from multiple sources (most reliable first)
    let hashParam = null;
    
    // Method 1: Check if hash was injected globally by Permalink platform
    if (window.PERMALINK_TOKEN_HASH) {
        hashParam = window.PERMALINK_TOKEN_HASH;
        isNFTMode = window.PERMALINK_IS_NFT_MODE || true;
    }
    
    // Method 2: Try URL parameters
    if (!hashParam) {
        const urlParams = new URLSearchParams(window.location.search);
        hashParam = urlParams.get('hash');
    }
    
    // Validate and use the hash
    if (hashParam && hashParam.startsWith('0x') && hashParam.length > 10) {
        // This looks like a real blockchain hash - NFT mode
        currentHash = hashParam;
        isNFTMode = true;
        updateUIForNFTMode();
        console.log('🎨 NFT Mode - Using hash:', currentHash.substring(0, 10) + '...');
    } else {
        // Testing/preview mode
        currentHash = generateRandomHash();
        isNFTMode = false;
        updateUIForPreviewMode();
        console.log('🎨 Preview Mode - Generated hash:', currentHash.substring(0, 10) + '...');
    }
    
    // Listen for hash messages (for blockchain integration)
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'SET_HASH') {
            console.log('🎨 Received SET_HASH message:', event.data.hash.substring(0, 10) + '...');
            currentHash = event.data.hash;
            isNFTMode = event.data.isNFTMode || true; // Use provided NFT mode
            generationCount = 1;
            updateUIForNFTMode();
            generate();
        }
    });
    
    generate();
    animate();
};

function updateUIForNFTMode() {
    const container = document.getElementById('canvas-container');
    const regenerateBtn = document.getElementById('regenerate-btn');
    const infoDiv = document.getElementById('info');
    
    // Add NFT mode class
    container.className = 'nft-mode';
    
    // Update main info to be user-friendly
    infoDiv.innerHTML = `
        <div id="artwork-title">🎨 YOUR COSMIC NETWORK</div>
        <div id="artwork-subtitle" style="font-size: 9px; opacity: 0.8; margin-top: 4px;">
            Unique Digital Artwork #${currentHash.slice(-4)}
        </div>
    `;
    
    // Hide regenerate button for NFTs
    regenerateBtn.style.display = 'none';
}

function updateUIForPreviewMode() {
    const container = document.getElementById('canvas-container');
    const regenerateBtn = document.getElementById('regenerate-btn');
    const infoDiv = document.getElementById('info');
    
    // Add preview mode class
    container.className = 'preview-mode';
    
    // Show preview info
    infoDiv.innerHTML = `
        <div id="artwork-title">🌌 COSMIC NETWORK</div>
        <div id="artwork-subtitle" style="font-size: 9px; opacity: 0.8; margin-top: 4px;">
            Preview Mode - Try Regenerate!
        </div>
    `;
    
    // Show regenerate button for preview
    regenerateBtn.style.display = 'block';
}

function generateRandomHash() {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
        hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
}

function hashToSeed(hash) {
    let seed = 0;
    for (let i = 0; i < hash.length; i++) {
        seed = ((seed << 5) - seed + hash.charCodeAt(i)) & 0xffffffff;
    }
    return Math.abs(seed);
}

function generate() {
    // Initialize random generator with hash
    // For NFTs: Always use the same hash (no generation count)
    // For testing: Include generation count for variations
    const seedInput = isNFTMode ? currentHash : currentHash + generationCount;
    const seed = hashToSeed(seedInput);
    rng = new Random(seed);
    
    // Clear arrays
    nodes = [];
    connections = [];
    
    // Generate nodes (circles)
    const nodeCount = rng.int(6, 12);
    const colorSchemes = [
        [200, 280, 320], // Blue-Purple
        [300, 350, 30],  // Purple-Pink-Red
        [120, 180, 200], // Green-Cyan-Blue
        [40, 80, 120],   // Orange-Yellow-Green
        [260, 300, 340], // Purple spectrum
    ];
    
    const scheme = rng.choice(colorSchemes);
    
    for (let i = 0; i < nodeCount; i++) {
        const x = rng.range(60, canvas.width - 60);
        const y = rng.range(60, canvas.height - 60);
        const radius = rng.range(8, 25);
        const hue = scheme[i % scheme.length] + rng.range(-20, 20);
        const speed = rng.range(0.5, 1.5);
        const phase = rng.range(0, Math.PI * 2);
        
        nodes.push(new Node(x, y, radius, hue, speed, phase));
    }
    
    // Generate connections (lines)
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            const distance = Math.sqrt(
                Math.pow(nodes[j].baseX - nodes[i].baseX, 2) + 
                Math.pow(nodes[j].baseY - nodes[i].baseY, 2)
            );
            
            if (distance < 180 && rng.next() > 0.4) {
                const strength = rng.range(0.3, 1.0);
                connections.push(new Connection(nodes[i], nodes[j], strength));
            }
        }
    }
    
    updateTraits();
}

function animate() {
    if (!isAnimating) return;
    
    time += 0.02;
    
    // Clear canvas with fade effect
    ctx.fillStyle = 'rgba(12, 12, 12, 0.1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw connections first (behind nodes)
    connections.forEach(connection => {
        connection.update(time);
        connection.draw(ctx);
    });
    
    // Update and draw nodes
    nodes.forEach(node => {
        node.update(time);
        node.draw(ctx);
    });
    
    animationId = requestAnimationFrame(animate);
}

function updateTraits() {
    const traits = getTraits();
    const traitText = Object.entries(traits)
        .map(([key, value]) => `${key}: ${value}`)
        .join('<br>');
    document.getElementById('trait-list').innerHTML = traitText;
}

function regenerate() {
    // Only allow regeneration in testing mode
    if (isNFTMode) {
        return; // Silent fail for NFTs
    }
    
    generationCount++;
    generate();
}

function saveImage() {
    const filename = isNFTMode 
        ? `cosmic-network-${currentHash.slice(-4)}.png`
        : `cosmic-network-preview-${generationCount}.png`;
    
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL();
    link.click();
}

function toggleAnimation() {
    isAnimating = !isAnimating;
    const text = document.getElementById('anim-text');
    if (isAnimating) {
        text.textContent = 'Pause';
        animate();
    } else {
        text.textContent = 'Play';
        if (animationId) {
            cancelAnimationFrame(animationId);
        }
    }
}

// Export traits for platform integration
function getTraits() {
    if (nodes.length === 0) return {};
    
    const avgHue = nodes.reduce((sum, node) => sum + node.hue, 0) / nodes.length;
    const avgRadius = nodes.reduce((sum, node) => sum + node.radius, 0) / nodes.length;
    const connectionDensity = connections.length / nodes.length;
    
    let palette = 'Monochrome';
    if (avgHue < 60) palette = 'Warm Tones';
    else if (avgHue < 120) palette = 'Nature';
    else if (avgHue < 180) palette = 'Ocean';
    else if (avgHue < 240) palette = 'Sky';
    else if (avgHue < 300) palette = 'Mystic';
    else palette = 'Fire';
    
    let complexity = 'Minimal';
    if (nodes.length > 8) complexity = 'Balanced';
    if (nodes.length > 10) complexity = 'Complex';
    
    let energy = 'Calm';
    if (connectionDensity > 1.5) energy = 'Active';
    if (connectionDensity > 2.5) energy = 'Dynamic';
    
    let scale = 'Intimate';
    if (avgRadius > 15) scale = 'Medium';
    if (avgRadius > 20) scale = 'Bold';
    
    return {
        'Style': palette,
        'Complexity': complexity,
        'Energy': energy,
        'Scale': scale,
        'Nodes': nodes.length,
        'Connections': connections.length
    };
}

// Make traits available globally
window.getTraits = getTraits; 