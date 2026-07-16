import { GAME_CONFIG, getGridBounds, gridToPixel } from './config';
import type { LineData, Point } from './types';

interface GridCell {
  col: number;
  row: number;
}

const DIR_DELTA = [
  { dc: 0, dr: -1 }, // 0: Up
  { dc: 1, dr: 0 },  // 1: Right
  { dc: 0, dr: 1 },  // 2: Down
  { dc: -1, dr: 0 }, // 3: Left
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function wouldSelfLoop(path: GridCell[], newCol: number, newRow: number): boolean {
  if (path.length < 2) return false;
  for (let i = 0; i < path.length - 1; i++) {
    const cell = path[i];
    const dx = Math.abs(newCol - cell.col);
    const dy = Math.abs(newRow - cell.row);
    if (dx + dy <= 1) return true;
  }
  return false;
}

function hasClearEscape(
  head: GridCell,
  dirIndex: number,
  occupied: Set<string>,
  bounds: { cols: number; rows: number }
): boolean {
  const { dc, dr } = DIR_DELTA[dirIndex];
  let c = head.col + dc;
  let r = head.row + dr;

  while (c >= 0 && c < bounds.cols && r >= 0 && r < bounds.rows) {
    if (occupied.has(`${c},${r}`)) {
      return false;
    }
    c += dc;
    r += dr;
  }
  return true;
}

function generatePath(
  id: number,
  occupied: Set<string>,
  bounds: { cols: number; rows: number }
): LineData | null {
  const maxAttempts = 150;
  const centerCol = Math.floor(bounds.cols / 2);
  const centerRow = Math.floor(bounds.rows / 2);
  const maxRadius = Math.min(bounds.cols, bounds.rows) / 2 - 2;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Growing radius: start tight at the center, expand outward as attempts fail
    const progress = attempt / maxAttempts;
    const currentMaxRadius = Math.max(1, Math.floor(maxRadius * Math.pow(progress, 0.5))); // Square root grows moderately fast
    
    // Pick a random offset within currentMaxRadius
    const offsetCol = rand(-currentMaxRadius, currentMaxRadius);
    const offsetRow = rand(-currentMaxRadius, currentMaxRadius);
    
    const col = Math.min(Math.max(1, centerCol + offsetCol), bounds.cols - 2);
    const row = Math.min(Math.max(1, centerRow + offsetRow), bounds.rows - 2);

    if (occupied.has(`${col},${row}`)) continue;

    const pathCells: GridCell[] = [{ col, row }];
    let currentDir = -1;
    let isValid = true;
    // Increase segments for more zig-zags (more interlocking)
    const numSegments = rand(1, 3);

    for (let s = 0; s < numSegments; s++) {
      const candidates = currentDir === -1
        ? [0, 1, 2, 3]
        : [(currentDir + 3) % 4, currentDir, (currentDir + 1) % 4];

      const validDirs = shuffle(candidates).filter(d => {
        const { dc, dr } = DIR_DELTA[d];
        const nc = pathCells[pathCells.length - 1].col + dc;
        const nr = pathCells[pathCells.length - 1].row + dr;

        if (nc < 0 || nc >= bounds.cols || nr < 0 || nr >= bounds.rows) return false;
        if (occupied.has(`${nc},${nr}`)) return false;
        if (wouldSelfLoop(pathCells, nc, nr)) return false;
        return true;
      });

      if (validDirs.length === 0) {
        if (pathCells.length < 3) isValid = false;
        break;
      }

      const dir = validDirs[0];
      // Make segments shorter to keep them compact and blocky
      const segmentLen = rand(2, 3);

      for (let step = 0; step < segmentLen; step++) {
        const { dc, dr } = DIR_DELTA[dir];
        const lastCell = pathCells[pathCells.length - 1];
        const nc = lastCell.col + dc;
        const nr = lastCell.row + dr;

        if (nc < 0 || nc >= bounds.cols || nr < 0 || nr >= bounds.rows) break;
        if (occupied.has(`${nc},${nr}`)) break;
        if (wouldSelfLoop(pathCells, nc, nr)) break;

        pathCells.push({ col: nc, row: nr });
      }
      currentDir = dir;
    }

    if (isValid && pathCells.length >= 3 && currentDir !== -1) {
      const head = pathCells[pathCells.length - 1];
      
      // REVERSE GENERATION LOGIC: Ensures 100% solvability without deadlocks
      if (!hasClearEscape(head, currentDir, occupied, bounds)) {
        continue;
      }

      const points: Point[] = [];
      points.push(gridToPixel(pathCells[0].col, pathCells[0].row));

      let lastDir = -1;
      for (let i = 1; i < pathCells.length; i++) {
        const prev = pathCells[i - 1];
        const curr = pathCells[i];

        let dir = -1;
        if (curr.col > prev.col) dir = 1;
        else if (curr.col < prev.col) dir = 3;
        else if (curr.row > prev.row) dir = 2;
        else if (curr.row < prev.row) dir = 0;

        if (dir !== lastDir) {
          if (i > 1) {
            points.push(gridToPixel(prev.col, prev.row));
          }
          lastDir = dir;
        }
      }
      points.push(gridToPixel(head.col, head.row));

      for (const cell of pathCells) {
        occupied.add(`${cell.col},${cell.row}`);
      }

      return { id, points };
    }
  }
  return null;
}

export interface GeneratedLevel {
  lines: LineData[];
}

export function generateLevel(targetCount?: number): GeneratedLevel {
  const bounds = getGridBounds();
  const occupied = new Set<string>();
  const lines: LineData[] = [];
  
  // Use a denser target count by default
  const actualCount = targetCount || rand(GAME_CONFIG.minLines + 5, GAME_CONFIG.maxLines + 10);

  for (let i = 0; i < actualCount + 30; i++) {
    const line = generatePath(lines.length, occupied, bounds);
    if (line) lines.push(line);
    if (lines.length >= actualCount) break;
  }

  if (lines.length < 4) {
    return {
      lines: [
        { id: 0, points: [gridToPixel(2, 2), gridToPixel(4, 2), gridToPixel(4, 4)] },
        { id: 1, points: [gridToPixel(5, 4), gridToPixel(5, 6), gridToPixel(7, 6)] },
        { id: 2, points: [gridToPixel(2, 5), gridToPixel(2, 7), gridToPixel(4, 7)] },
        { id: 3, points: [gridToPixel(8, 2), gridToPixel(8, 4), gridToPixel(6, 4)] },
      ]
    };
  }

  return { lines };
}
