import { GAME_CONFIG, getGridBounds } from './config';
import type { LineData, Point } from './types';

// --- Difficulty Profiles ---

export interface DifficultyProfile {
  name: string;
  minLines: number;
  maxLines: number;
  targetCriticalPath: number;  // longest dependency chain
  minDependencies: number;     // total blocking relationships
  minBranching: number;        // lines with 0 deps (available at start)
}

export const PROFILES: Record<string, DifficultyProfile> = {
  easy: {
    name: 'easy',
    minLines: 7,
    maxLines: 9,
    targetCriticalPath: 2,
    minDependencies: 3,
    minBranching: 3,
  },
  medium: {
    name: 'medium',
    minLines: 9,
    maxLines: 11,
    targetCriticalPath: 3,
    minDependencies: 5,
    minBranching: 2,
  },
  hard: {
    name: 'hard',
    minLines: 11,
    maxLines: 14,
    targetCriticalPath: 3,
    minDependencies: 8,
    minBranching: 1,
  },
};

// --- Dependency Graph Builder ---

interface GridLine {
  id: number;
  bodyCells: Set<string>;  // "col,row" cells the line body occupies
  headCell: { c: number; r: number };
  dir: { dc: number; dr: number };
}

function pointsToGridCells(points: Point[]): { bodyCells: Set<string>; headCell: { c: number; r: number }; dir: { dc: number; dr: number } } {
  const padding = GAME_CONFIG.gridPadding;
  const size = GAME_CONFIG.gridSize;
  const bodyCells = new Set<string>();

  // Convert all line segments to grid cells
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const c1 = Math.round((p1.x - padding) / size);
    const r1 = Math.round((p1.y - padding) / size);
    const c2 = Math.round((p2.x - padding) / size);
    const r2 = Math.round((p2.y - padding) / size);

    if (c1 === c2) {
      const minR = Math.min(r1, r2);
      const maxR = Math.max(r1, r2);
      for (let r = minR; r <= maxR; r++) bodyCells.add(`${c1},${r}`);
    } else {
      const minC = Math.min(c1, c2);
      const maxC = Math.max(c1, c2);
      for (let c = minC; c <= maxC; c++) bodyCells.add(`${c},${r1}`);
    }
  }

  // Head = last point, direction = last segment direction
  const head = points[points.length - 1];
  const prev = points[points.length - 2];
  const hc = Math.round((head.x - padding) / size);
  const hr = Math.round((head.y - padding) / size);
  let dc = 0, dr = 0;
  if (head.x > prev.x) dc = 1;
  else if (head.x < prev.x) dc = -1;
  else if (head.y > prev.y) dr = 1;
  else if (head.y < prev.y) dr = -1;

  return { bodyCells, headCell: { c: hc, r: hr }, dir: { dc, dr } };
}

function buildDependencyGraph(lines: LineData[]): Map<number, Set<number>> {
  const gridLines: GridLine[] = lines.map(l => ({
    id: l.id,
    ...pointsToGridCells(l.points),
  }));

  const bounds = getGridBounds();
  const deps = new Map<number, Set<number>>();

  for (const line of gridLines) {
    deps.set(line.id, new Set());

    // Trace the escape ray from the head outward
    let c = line.headCell.c + line.dir.dc;
    let r = line.headCell.r + line.dir.dr;

    while (c >= 0 && c < bounds.cols && r >= 0 && r < bounds.rows) {
      for (const other of gridLines) {
        if (other.id !== line.id && other.bodyCells.has(`${c},${r}`)) {
          deps.get(line.id)!.add(other.id);
        }
      }
      c += line.dir.dc;
      r += line.dir.dr;
    }
  }

  return deps;
}

// --- Metric Computation ---

export interface LevelMetrics {
  criticalPath: number;    // longest dependency chain
  totalDeps: number;       // total edges in DAG
  branching: number;       // lines with 0 incoming deps
  lineCount: number;
}

function computeCriticalPath(deps: Map<number, Set<number>>): number {
  // Longest path in DAG via DFS with memoization
  const memo = new Map<number, number>();

  function longestPath(id: number, visited: Set<number>): number {
    if (memo.has(id)) return memo.get(id)!;
    if (visited.has(id)) return 0; // cycle guard (shouldn't happen)

    visited.add(id);
    let maxChild = 0;
    for (const depId of deps.get(id) ?? []) {
      maxChild = Math.max(maxChild, longestPath(depId, visited));
    }
    visited.delete(id);

    const result = 1 + maxChild;
    memo.set(id, result);
    return result;
  }

  let longest = 0;
  for (const id of deps.keys()) {
    longest = Math.max(longest, longestPath(id, new Set()));
  }
  return longest;
}

function computeMetrics(lines: LineData[]): LevelMetrics {
  const deps = buildDependencyGraph(lines);

  // Count incoming deps per line (what blocks me?)
  const incoming = new Map<number, number>();
  for (const id of deps.keys()) incoming.set(id, 0);
  for (const [, targets] of deps) {
    for (const t of targets) {
      incoming.set(t, (incoming.get(t) ?? 0) + 1);
    }
  }

  let totalDeps = 0;
  let branching = 0;
  for (const [id, targets] of deps) {
    totalDeps += targets.size;
    if (incoming.get(id) === 0) branching++;
  }

  return {
    criticalPath: computeCriticalPath(deps),
    totalDeps,
    branching,
    lineCount: lines.length,
  };
}

// --- Candidate Scoring & Selection ---

function scoreCandidate(metrics: LevelMetrics, profile: DifficultyProfile): number {
  let score = 0;

  // Critical path: 高权重, 越接近 target 越好
  const cpDiff = Math.abs(metrics.criticalPath - profile.targetCriticalPath);
  score -= cpDiff * cpDiff * 20;

  // Bonus for hitting the target exactly
  if (cpDiff === 0) score += 15;

  // Total dependencies: 越接近 target 越好
  const depDiff = Math.abs(metrics.totalDeps - profile.minDependencies);
  score -= depDiff * depDiff * 3;

  // Branching: 越多越简单, 越少越难. 越接近 target 越好
  const brDiff = Math.abs(metrics.branching - profile.minBranching);
  score -= brDiff * brDiff * 5;

  // Line count within range: bonus
  if (metrics.lineCount >= profile.minLines && metrics.lineCount <= profile.maxLines) {
    score += 5;
  } else {
    score -= Math.abs(metrics.lineCount - (profile.minLines + profile.maxLines) / 2) * 2;
  }

  return score;
}

export function selectBestCandidate(
  candidates: LineData[][],
  profile: DifficultyProfile
): { lines: LineData[]; metrics: LevelMetrics } {
  let bestLines = candidates[0];
  let bestScore = -Infinity;
  let bestMetrics = computeMetrics(candidates[0]);

  for (const candidate of candidates) {
    const metrics = computeMetrics(candidate);
    const score = scoreCandidate(metrics, profile);
    if (score > bestScore) {
      bestScore = score;
      bestLines = candidate;
      bestMetrics = metrics;
    }
  }

  return { lines: bestLines, metrics: bestMetrics };
}

// --- Public API ---

export function computeLevelMetrics(lines: LineData[]): LevelMetrics {
  return computeMetrics(lines);
}
