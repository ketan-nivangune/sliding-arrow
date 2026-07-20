import type { Point } from './types';

// Base logical resolution. The engine will scale this to fit the screen.
export const GAME_CONFIG = {
  logicalWidth: 600,
  logicalHeight: 600,

  // Visual — clean, mature, high-contrast, no blur
  bgColor: 0xf5f5f0,
  dotColor: 0xd0caca,
  dotSize: 2,
  dotSpacing: 25,
  
  // Arrow styling
  lineColor: 0x1a1a1a,
  collisionColor: 0xcc3333,
  lineWidth: 12,
  headSize: 18,
  cornerRadius: 12, // for smooth path joints

  // Grid mechanics for tight packing
  gridSize: 50,
  gridPadding: 50,
  
  // Movement
  lineSpeed: 800, // fast, snappy movement

  // Collision
  collisionThreshold: 15,

  // Game rules
  maxLives: 3,
  minLines: 8,
  maxLines: 12, // denser levels

  // Juice
  shakeIntensity: 6,
  shakeDuration: 0.2,
  hitStopFrames: 5, // Freeze frame duration on hit
  exitDuration: 0.2, // Snappy exit scale-down
};

export const FLASH_DURATION = 0.3;

export function getGridBounds() {
  const cols = Math.floor(
    (GAME_CONFIG.logicalWidth - GAME_CONFIG.gridPadding * 2) / GAME_CONFIG.gridSize,
  );
  const rows = Math.floor(
    (GAME_CONFIG.logicalHeight - GAME_CONFIG.gridPadding * 2) / GAME_CONFIG.gridSize,
  );
  return { cols, rows };
}

export function gridToPixel(col: number, row: number): Point {
  return {
    x: GAME_CONFIG.gridPadding + col * GAME_CONFIG.gridSize,
    y: GAME_CONFIG.gridPadding + row * GAME_CONFIG.gridSize,
  };
}

export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}
