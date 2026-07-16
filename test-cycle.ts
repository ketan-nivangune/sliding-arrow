import { generateLevel } from './src/engine/LevelGenerator';
import { getGridBounds } from './src/engine/config';

function testForCycles() {
  let deadlocks = 0;
  for (let i = 0; i < 1000; i++) {
    const level = generateLevel(7);
    
    // Build dependency graph
    // We need to map points back to grid cells for easy checking
    // Since points are padding + col * 50, col = (x - padding) / 50
    const padding = 50;
    const size = 50;
    
    const getCells = (pts) => {
      const cells = [];
      for (let j = 0; j < pts.length - 1; j++) {
        const p1 = pts[j];
        const p2 = pts[j+1];
        const c1 = Math.round((p1.x - padding) / size);
        const r1 = Math.round((p1.y - padding) / size);
        const c2 = Math.round((p2.x - padding) / size);
        const r2 = Math.round((p2.y - padding) / size);
        
        if (c1 === c2) {
          const minR = Math.min(r1, r2);
          const maxR = Math.max(r1, r2);
          for (let r = minR; r <= maxR; r++) cells.push(`${c1},${r}`);
        } else {
          const minC = Math.min(c1, c2);
          const maxC = Math.max(c1, c2);
          for (let c = minC; c <= maxC; c++) cells.push(`${c},${r1}`);
        }
      }
      return [...new Set(cells)]; // unique
    };
    
    const lines = level.lines.map(l => {
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
      
      return { id: l.id, cells: getCells(pts), head: {c: hc, r: hr}, dir: {dc, dr} };
    });
    
    const deps = new Map();
    for (const l of lines) {
      deps.set(l.id, new Set());
      let c = l.head.c + l.dir.dc;
      let r = l.head.r + l.dir.dr;
      while (c >= 0 && c <= 20 && r >= 0 && r <= 20) { // rough bounds
        for (const other of lines) {
          if (other.id !== l.id && other.cells.includes(`${c},${r}`)) {
            deps.get(l.id).add(other.id);
          }
        }
        c += l.dir.dc;
        r += l.dir.dr;
      }
    }
    
    // Detect cycle
    const isCyclic = (id, visited, stack) => {
      if (stack.has(id)) return true;
      if (visited.has(id)) return false;
      visited.add(id);
      stack.add(id);
      for (const dep of deps.get(id)) {
        if (isCyclic(dep, visited, stack)) return true;
      }
      stack.delete(id);
      return false;
    };
    
    let hasCycle = false;
    const visited = new Set();
    for (const l of lines) {
      if (isCyclic(l.id, visited, new Set())) {
        hasCycle = true;
        break;
      }
    }
    
    if (hasCycle) deadlocks++;
  }
  console.log(`Tested 1000 levels. Deadlocks found: ${deadlocks}`);
}
testForCycles();
