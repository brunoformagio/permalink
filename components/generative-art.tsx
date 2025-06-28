"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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
  
  const [colors, setColors] = useState<string[]>([]);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [generation, setGeneration] = useState(1);

  const generateColorPalette = useCallback(() => {
    const hues = Array.from({ length: 3 }, () => Math.floor(Math.random() * 360));
    return hues.map(hue => `hsl(${hue}, ${60 + Math.random() * 40}%, ${50 + Math.random() * 30}%)`);
  }, []);

  const generateShapes = useCallback((canvasWidth: number, canvasHeight: number) => {
    const newShapes: Shape[] = [];
    const shapeCount = 8 + Math.floor(Math.random() * 5);
    
    for (let i = 0; i < shapeCount; i++) {
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
  }, [colors]);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const size = Math.min(containerRect.width, containerRect.height);
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
    
    return size;
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || shapes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const canvasSize = Math.min(canvas.width, canvas.height) / (window.devicePixelRatio || 1);

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvasSize, canvasSize);

    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i];
      
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
  }, [shapes]);

  const animate = useCallback(() => {
    timeRef.current += 0.02;
    render();
    
    if (isPlaying) {
      animationIdRef.current = requestAnimationFrame(animate);
    }
  }, [isPlaying, render]);

  const randomize = useCallback(() => {
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
  }, [generation, onGenerationChange, setupCanvas, generateColorPalette, generateShapes]);

  // Initialize artwork
  useEffect(() => {
    const canvasSize = setupCanvas();
    if (canvasSize) {
      const newColors = generateColorPalette();
      setColors(newColors);
    }
  }, [setupCanvas, generateColorPalette]);

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
  }, [colors, generateShapes]);

  // Render when shapes are ready
  useEffect(() => {
    if (shapes.length > 0) {
      render();
    }
  }, [shapes, render]);

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
  }, [isPlaying, shapes.length, animate]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      const canvasSize = setupCanvas();
      if (canvasSize && colors.length > 0) {
        const newShapes = generateShapes(canvasSize, canvasSize);
        setShapes(newShapes);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setupCanvas, generateShapes, colors.length]);

  return {
    canvasRef,
    generation,
    randomize
  };
} 