import { generateLevelWithDifficulty } from './src/engine/LevelGenerator';
import { getGridBounds } from './src/engine/config';
import { computeLevelMetrics, PROFILES } from './src/engine/difficulty';

const padding = 50;
const size = 50;

function getCells(pts: any[]) {
  const cells: string[] = [];
  for (let j = 0; j < pts.length - 1; j++) {
    const p1 = pts[j];
    const p2 = pts[j + 1];
    const c1 = Math.round((p1.x - padding) / size);
    const r1 = Math.round((p1.y - padding) / size);
    const c2 = Math.round((p2.x - padding) / size);
    const r2 = Math.round((p2.y - padding) / size);
    if (c1 === c2) {
      for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++) cells.push(`${c1},${r}`);
    } else {
      for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++) cells.push(`${c},${r1}`);
    }
  }
  return [...new Set(cells)];
}

function checkDeadlock(lines: any[]): boolean {
  const bounds = getGridBounds();
  const gridLines = lines.map((l: any) => {
    const pts = l.points;
    const head = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const hc = Math.round((head.x - padding) / size);
    const hr = Math.round((head.y - padding) / size);
    let dc = 0, dr = 0;
    if (head.x > prev.x) dc = 1;
    else if (head.x < prev.x) dc = -1;
    else if (head.y > prev.y) dr = 1;
    else if (head.y < prev.y) dr = -1;
    return { id: l.id, cells: getCells(pts), head: { c: hc, r: hr }, dir: { dc, dr } };
  });

  const adj = new Map<number, number[]>();
  for (const l of gridLines) {
    adj.set(l.id, []);
    let c = l.head.c + l.dir.dc;
    let r = l.head.r + l.dir.dr;
    while (c >= 0 && c < bounds.cols && r >= 0 && r < bounds.rows) {
      for (const other of gridLines) {
        if (other.id !== l.id && other.cells.includes(`${c},${r}`)) {
          adj.get(l.id)!.push(other.id);
        }
      }
      c += l.dir.dc;
      r += l.dir.dr;
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

// Test each profile
for (const profileName of ['easy', 'medium', 'hard']) {
  let deadlocks = 0;
  let tooFew = 0;
  const samples = 200;
  const metricsList: any[] = [];

  for (let i = 0; i < samples; i++) {
    const level = generateLevelWithDifficulty(profileName, 40);
    if (level.lines.length < 5) { tooFew++; continue; }
    if (checkDeadlock(level.lines)) deadlocks++;
    metricsList.push(computeLevelMetrics(level.lines));
  }

  const avgCP = metricsList.reduce((s, m) => s + m.criticalPath, 0) / metricsList.length;
  const avgDeps = metricsList.reduce((s, m) => s + m.totalDeps, 0) / metricsList.length;
  const avgLines = metricsList.reduce((s, m) => s + m.lineCount, 0) / metricsList.length;
  const minLines = Math.min(...metricsList.map(m => m.lineCount));

  console.log(`\n=== ${profileName.toUpperCase()} (${samples} samples) ===`);
  console.log(`  Deadlocks: ${deadlocks}/${samples}`);
  console.log(`  Too few lines (<5): ${tooFew}/${samples}`);
  console.log(`  Lines: avg=${avgLines.toFixed(1)} min=${minLines}`);
  console.log(`  CP: avg=${avgCP.toFixed(2)}  Deps: avg=${avgDeps.toFixed(2)}`);
}
