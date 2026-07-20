import { GAME_CONFIG, getGridBounds, gridToPixel } from './config';
import type { LineData, Point } from './types';
import { PROFILES, selectBestCandidate } from './difficulty';

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
  const prev = path[path.length - 2];
  // Prevent immediate U-turn
  if (newCol === prev.col && newRow === prev.row) return true;
  // Prevent crossing own body (check all cells except the tail — tail adjacency is expected)
  for (let i = 0; i < path.length - 1; i++) {
    const dx = Math.abs(newCol - path[i].col);
    const dy = Math.abs(newRow - path[i].row);
    if (dx + dy <= 1) return true;
  }
  return false;
}

function hasCycle(lines: LineData[], bounds: { cols: number; rows: number }): boolean {
  const padding = GAME_CONFIG.gridPadding;
  const size = GAME_CONFIG.gridSize;

  const gridLines = lines.map(l => {
    const bodyCells = new Set<string>();
    for (let i = 0; i < l.points.length - 1; i++) {
      const p1 = l.points[i];
      const p2 = l.points[i + 1];
      const c1 = Math.round((p1.x - padding) / size);
      const r1 = Math.round((p1.y - padding) / size);
      const c2 = Math.round((p2.x - padding) / size);
      const r2 = Math.round((p2.y - padding) / size);
      if (c1 === c2) {
        for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) bodyCells.add(`${c1},${r}`);
      } else {
        for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) bodyCells.add(`${c},${r1}`);
      }
    }
    const head = l.points[l.points.length - 1];
    const prev = l.points[l.points.length - 2];
    const hc = Math.round((head.x - padding) / size);
    const hr = Math.round((head.y - padding) / size);
    let dc = 0, dr = 0;
    if (head.x > prev.x) dc = 1;
    else if (head.x < prev.x) dc = -1;
    else if (head.y > prev.y) dr = 1;
    else if (head.y < prev.y) dr = -1;
    return { id: l.id, bodyCells, head: { c: hc, r: hr }, dir: { dc, dr } };
  });

  const adj = new Map<number, number[]>();
  for (const line of gridLines) {
    adj.set(line.id, []);
    let c = line.head.c + line.dir.dc;
    let r = line.head.r + line.dir.dr;
    while (c >= 0 && c < bounds.cols && r >= 0 && r < bounds.rows) {
      for (const other of gridLines) {
        if (other.id !== line.id && other.bodyCells.has(`${c},${r}`)) {
          adj.get(line.id)!.push(other.id);
        }
      }
      c += line.dir.dc;
      r += line.dir.dr;
    }
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<number, number>();
  for (const id of adj.keys()) color.set(id, WHITE);

  function dfs(u: number): boolean {
    color.set(u, GRAY);
    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === GRAY) return true;
      if (color.get(v) === WHITE && dfs(v)) return true;
    }
    color.set(u, BLACK);
    return false;
  }

  for (const id of adj.keys()) {
    if (color.get(id) === WHITE && dfs(id)) return true;
  }
  return false;
}

function generatePath(
  id: number,
  occupied: Set<string>,
  bounds: { cols: number; rows: number }
): LineData | null {
  const maxAttempts = 200;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const col = rand(0, bounds.cols - 1);
    const row = rand(0, bounds.rows - 1);

    if (occupied.has(`${col},${row}`)) continue;

    const pathCells: GridCell[] = [{ col, row }];
    let currentDir = -1;
    let isValid = true;
    const numSegments = rand(2, 4);

    for (let s = 0; s < numSegments; s++) {
      const candidates = currentDir === -1
        ? shuffle([0, 1, 2, 3])
        : shuffle([(currentDir + 3) % 4, (currentDir + 1) % 4, currentDir, (currentDir + 2) % 4]);

      const validDirs = candidates.filter(d => {
        const { dc, dr } = DIR_DELTA[d];
        const nc = pathCells[pathCells.length - 1].col + dc;
        const nr = pathCells[pathCells.length - 1].row + dr;
        if (nc < 0 || nc >= bounds.cols || nr < 0 || nr >= bounds.rows) return false;
        if (occupied.has(`${nc},${nr}`)) return false;
        if (wouldSelfLoop(pathCells, nc, nr)) return false;
        return true;
      });

      if (validDirs.length === 0) {
        if (pathCells.length < 4) isValid = false;
        break;
      }

      const dir = validDirs[0];
      const segmentLen = rand(2, 4);

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

    if (isValid && pathCells.length >= 4 && currentDir !== -1) {
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
          if (i > 1) points.push(gridToPixel(prev.col, prev.row));
          lastDir = dir;
        }
      }
      points.push(gridToPixel(pathCells[pathCells.length - 1].col, pathCells[pathCells.length - 1].row));

      for (const cell of pathCells) occupied.add(`${cell.col},${cell.row}`);
      return { id, points };
    }
  }
  return null;
}

export interface GeneratedLevel {
  lines: LineData[];
}

function generateRawLines(targetCount: number): LineData[] {
  const bounds = getGridBounds();
  const occupied = new Set<string>();
  const lines: LineData[] = [];

  for (let i = 0; i < targetCount + 100; i++) {
    const line = generatePath(lines.length, occupied, bounds);
    if (line) lines.push(line);
    if (lines.length >= targetCount) break;
  }

  return lines;
}

const FALLBACK_LEVEL: LineData[] = [
  { id: 0, points: [gridToPixel(1, 1), gridToPixel(4, 1), gridToPixel(4, 4)] },
  { id: 1, points: [gridToPixel(6, 4), gridToPixel(6, 7), gridToPixel(8, 7)] },
  { id: 2, points: [gridToPixel(1, 6), gridToPixel(1, 8), gridToPixel(4, 8)] },
  { id: 3, points: [gridToPixel(8, 1), gridToPixel(8, 3), gridToPixel(6, 3)] },
];

export function generateLevel(targetCount?: number): GeneratedLevel {
  const actualCount = targetCount || rand(GAME_CONFIG.minLines + 5, GAME_CONFIG.maxLines + 10);
  const lines = generateRawLines(actualCount);
  return { lines: lines.length >= 4 ? lines : FALLBACK_LEVEL };
}

export function generateLevelWithDifficulty(
  profileName: string = 'medium',
  candidateCount?: number
): GeneratedLevel {
  const profile = PROFILES[profileName] ?? PROFILES.medium;
  const targetCount = rand(profile.minLines, profile.maxLines);
  const bounds = getGridBounds();
  const actualCandidateCount = candidateCount ?? (profileName === 'hard' ? 80 : profileName === 'medium' ? 60 : 40);

  const valid: LineData[][] = [];
  for (let i = 0; i < actualCandidateCount; i++) {
    const lines = generateRawLines(targetCount);
    if (lines.length < 4) continue;
    if (hasCycle(lines, bounds)) continue;
    valid.push(lines);
  }

  if (valid.length === 0) return { lines: FALLBACK_LEVEL };

  const { lines } = selectBestCandidate(valid, profile);
  return { lines };
}
