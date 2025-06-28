"use client";

import { useEffect, useRef, useState } from "react";

interface Shape {
  x: number;
  y: number;
  radius: number;
  speed: number;
  angle: number;
  color: string;
  opacity: number;
}

interface GenerativeArtProps {
  isPlaying: boolean;
  onGenerationChange: (generation: number) => void;
}

export function GenerativeArt({ isPlaying, onGenerationChange }: GenerativeArtProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const [generation, setGeneration] = useState(1);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [colors, setColors] = useState<string[]>([]);

  const generateColorPalette = () => {
    const hue = Math.random() * 360;
    return [
      `hsl(${hue}, 70%, 50%)`,
      `hsl(${(hue + 60) % 360}, 70%, 60%)`,
      `hsl(${(hue + 120) % 360}, 70%, 40%)`,
      `hsl(${(hue + 180) % 360}, 70%, 55%)`,
      `hsl(${(hue + 240) % 360}, 70%, 45%)`
    ];
  };

  const generateShapes = (canvasWidth: number, canvasHeight: number) => {
    const newShapes: Shape[] = [];
    // Scale number of shapes based on canvas size (more shapes for larger canvases)
    const baseShapes = 8;
    const scaleFactor = Math.min(canvasWidth, canvasHeight) / 400;
    const numShapes = Math.floor(baseShapes + (scaleFactor * 8)) + Math.floor(Math.random() * 12);
    
    for (let i = 0; i < numShapes; i++) {
      // Scale radius based on canvas size
      const minRadius = Math.min(canvasWidth, canvasHeight) * 0.03;
      const maxRadius = Math.min(canvasWidth, canvasHeight) * 0.15;
      
      newShapes.push({
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
        radius: minRadius + Math.random() * (maxRadius - minRadius),
        speed: 0.5 + Math.random() * 2,
        angle: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        opacity: 0.3 + Math.random() * 0.4
      });
    }
    
    return newShapes;
  };

  const setupCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    // Get container dimensions
    const containerRect = container.getBoundingClientRect();
    const size = Math.min(containerRect.width, containerRect.height);
    
    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    
    // Scale the canvas back down using CSS
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    
    // Scale the drawing context so everything draws at the higher resolution
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    
    return size;
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasSize = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);

    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    // Set blend mode for glowing effect
    ctx.globalCompositeOperation = 'lighter';

    // Render shapes
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];
      
      // Scale movement based on canvas size
      const movementScale = canvasSize / 400;
      const x = shape.x + Math.sin(timeRef.current * shape.speed + shape.angle) * (30 * movementScale);
      const y = shape.y + Math.cos(timeRef.current * shape.speed + shape.angle) * (20 * movementScale);
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, shape.radius);
      gradient.addColorStop(0, shape.color.replace(')', `, ${shape.opacity})`).replace('hsl', 'hsla'));
      gradient.addColorStop(1, shape.color.replace(')', ', 0)').replace('hsl', 'hsla'));
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, shape.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw connecting lines
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    
    for (let i = 0; i < shapes.length - 1; i++) {
      const shape1 = shapes[i];
      const shape2 = shapes[i + 1];
      
      const movementScale = canvasSize / 400;
      const x1 = shape1.x + Math.sin(timeRef.current * shape1.speed + shape1.angle) * (30 * movementScale);
      const y1 = shape1.y + Math.cos(timeRef.current * shape1.speed + shape1.angle) * (20 * movementScale);
      const x2 = shape2.x + Math.sin(timeRef.current * shape2.speed + shape2.angle) * (30 * movementScale);
      const y2 = shape2.y + Math.cos(timeRef.current * shape2.speed + shape2.angle) * (20 * movementScale);
      
      const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const connectionDistance = 150 * movementScale;
      
      if (distance < connectionDistance) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }
  };

  const animate = () => {
    timeRef.current += 0.02;
    render();
    
    if (isPlaying) {
      animationIdRef.current = requestAnimationFrame(animate);
    }
  };

  const randomize = () => {
    const newGeneration = generation + 1;
    setGeneration(newGeneration);
    onGenerationChange(newGeneration);
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const canvasSize = setupCanvas();
    if (!canvasSize) return;

    const newColors = generateColorPalette();
    const newShapes = generateShapes(canvasSize, canvasSize);
    
    setColors(newColors);
    setShapes(newShapes);
    render();
  };

  // Initialize artwork
  useEffect(() => {
    const canvasSize = setupCanvas();
    if (canvasSize) {
      const newColors = generateColorPalette();
      setColors(newColors);
    }
  }, []);

  // Generate shapes when colors are ready
  useEffect(() => {
    if (colors.length > 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const canvasSize = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);
        const newShapes = generateShapes(canvasSize, canvasSize);
        setShapes(newShapes);
      }
    }
  }, [colors]);

  // Render when shapes are ready
  useEffect(() => {
    if (shapes.length > 0) {
      render();
    }
  }, [shapes]);

  // Handle animation
  useEffect(() => {
    if (isPlaying && shapes.length > 0) {
      animationIdRef.current = requestAnimationFrame(animate);
    } else if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isPlaying, shapes]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvasSize = setupCanvas();
      if (canvasSize && shapes.length > 0) {
        // Regenerate shapes for new canvas size
        const newShapes = generateShapes(canvasSize, canvasSize);
        setShapes(newShapes);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [colors]);

  return {
    canvasRef,
    generation,
    randomize
  };
} 