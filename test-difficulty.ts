import { generateLevelWithDifficulty } from './src/engine/LevelGenerator';
import { computeLevelMetrics, PROFILES } from './src/engine/difficulty';

function testProfile(name: string, count: number = 100) {
  const profile = PROFILES[name];
  const metricsList: { criticalPath: number; totalDeps: number; branching: number; lineCount: number }[] = [];

  for (let i = 0; i < count; i++) {
    const level = generateLevelWithDifficulty(name, 30);
    const metrics = computeLevelMetrics(level.lines);
    metricsList.push(metrics);
  }

  const avgCP = metricsList.reduce((s, m) => s + m.criticalPath, 0) / count;
  const avgDeps = metricsList.reduce((s, m) => s + m.totalDeps, 0) / count;
  const avgBranch = metricsList.reduce((s, m) => s + m.branching, 0) / count;
  const avgLines = metricsList.reduce((s, m) => s + m.lineCount, 0) / count;

  const minCP = Math.min(...metricsList.map(m => m.criticalPath));
  const maxCP = Math.max(...metricsList.map(m => m.criticalPath));
  const minDeps = Math.min(...metricsList.map(m => m.totalDeps));
  const maxDeps = Math.max(...metricsList.map(m => m.totalDeps));

  console.log(`\n=== ${name.toUpperCase()} (${count} samples) ===`);
  console.log(`  Lines:       avg=${avgLines.toFixed(1)}  range=[${Math.min(...metricsList.map(m => m.lineCount))}, ${Math.max(...metricsList.map(m => m.lineCount))}]`);
  console.log(`  Critical:    avg=${avgCP.toFixed(2)}  range=[${minCP}, ${maxCP}]  target=${profile.targetCriticalPath}`);
  console.log(`  Dependencies: avg=${avgDeps.toFixed(2)}  range=[${minDeps}, ${maxDeps}]  target=${profile.minDependencies}`);
  console.log(`  Branching:   avg=${avgBranch.toFixed(2)}  range=[${Math.min(...metricsList.map(m => m.branching))}, ${Math.max(...metricsList.map(m => m.branching))}]  target=${profile.minBranching}`);

  // Distribution of critical path depths
  const cpDist = new Map<number, number>();
  for (const m of metricsList) cpDist.set(m.criticalPath, (cpDist.get(m.criticalPath) ?? 0) + 1);
  const distStr = [...cpDist.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `cp${k}:${v}`).join(' ');
  console.log(`  CP distribution: ${distStr}`);
}

testProfile('easy');
testProfile('medium');
testProfile('hard');
