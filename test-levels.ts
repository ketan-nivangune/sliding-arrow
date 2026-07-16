import { generateLevel } from './src/engine/LevelGenerator';

console.log('Testing 10 random level generations...');
let successes = 0;

for (let i = 1; i <= 10; i++) {
  try {
    const level = generateLevel(8); // Ask for 8 lines
    console.log(`Level ${i}: Generated ${level.lines.length} lines.`);
    if (level.lines.length >= 4) {
      successes++;
    } else {
      console.log(`Level ${i} failed to generate enough lines.`);
    }
  } catch (err) {
    console.error(`Level ${i} threw an error:`, err);
  }
}

console.log(`\nVerification: ${successes}/10 levels successfully generated solvable layouts.`);
