import * as PIXI from 'pixi.js';
import { GameLine } from './Line';
import { generateLevel, generateLevelWithDifficulty } from './LevelGenerator';
import { GAME_CONFIG } from './config';
import type { GameCallbacks, GameThemeConfig } from './types';
import { soundManager } from './SoundManager';

export class ArrowGameEngine {
  private app!: PIXI.Application;
  private rootContainer!: PIXI.Container;
  private backgroundGrid!: PIXI.Graphics;
  private gameScale: number = 1;
  private lines: GameLine[] = [];
  private callbacks: GameCallbacks = {};
  private lives = GAME_CONFIG.maxLives;
  private linesRemaining = 0;
  private isPlaying = false;
  private initialized = false;

  private shakeTimer = 0;
  private shakeIntensity = 0;
  private hitStopCounter = 0;

  private currentTheme: GameThemeConfig | null = null;
  private difficulty: string = 'medium';

  setCallbacks(cb: GameCallbacks) {
    this.callbacks = cb;
  }

  async init(canvas: HTMLCanvasElement, initialTheme: GameThemeConfig, difficulty?: string): Promise<void> {
    this.currentTheme = initialTheme;
    if (difficulty) this.difficulty = difficulty;
    if (this.app) {
      try { this.app.destroy(true); } catch { /* ignore */ }
    }

    this.app = new PIXI.Application();

    await this.app.init({
      canvas,
      resizeTo: canvas.parentElement || window,
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    this.rootContainer = new PIXI.Container();
    this.backgroundGrid = new PIXI.Graphics();
    this.rootContainer.addChild(this.backgroundGrid);
    this.app.stage.addChild(this.rootContainer);

    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = new PIXI.Rectangle(0, 0, 10000, 10000);

    window.addEventListener('resize', this.onResize);
    this.onResize();

    this.drawBackgroundGrid();
    this.loadLevel();

    this.app.stage.on('pointerdown', (e: PIXI.FederatedPointerEvent) => {
      const localPos = this.rootContainer.toLocal(e.global);
      this.handleClick(localPos.x, localPos.y);
    });

    this.app.ticker.add(this.onTick.bind(this));
    this.initialized = true;
  }

  applyTheme(theme: GameThemeConfig) {
    this.currentTheme = theme;
    if (!this.initialized) return;

    // Update grid
    this.drawBackgroundGrid();

    // Update lines
    for (const line of this.lines) {
      line.setTheme(theme);
    }
  }

  private onResize = () => {
    if (!this.app || !this.rootContainer) return;
    const screenW = this.app.screen.width;
    const screenH = this.app.screen.height;

    const scaleX = screenW / GAME_CONFIG.logicalWidth;
    const scaleY = screenH / GAME_CONFIG.logicalHeight;
    this.gameScale = Math.min(scaleX, scaleY);

    this.rootContainer.scale.set(this.gameScale);
    this.rootContainer.x = (screenW - GAME_CONFIG.logicalWidth * this.gameScale) / 2;
    this.rootContainer.y = (screenH - GAME_CONFIG.logicalHeight * this.gameScale) / 2;
  };

  destroy(): void {
    if (!this.app) return;
    this.initialized = false;
    this.isPlaying = false;
    window.removeEventListener('resize', this.onResize);
    for (const line of this.lines) line.destroy();
    this.lines = [];
    try { this.rootContainer?.destroy({ children: true }); } catch { /* ignore */ }
    try {
      const canvas = this.app.canvas as HTMLCanvasElement;
      if (canvas?.parentNode) canvas.parentNode.removeChild(canvas);
      this.app.destroy(true);
    } catch { /* ignore */ }
  }

  startGame() {
    this.lives = GAME_CONFIG.maxLives;
    this.isPlaying = true;
    this.callbacks.onGameStart?.();
  }

  resetGame() {
    this.clearLines();
    this.drawBackgroundGrid(); // Re-draw to ensure clean state
    this.loadLevel();
    this.lives = GAME_CONFIG.maxLives;
    this.isPlaying = true;
  }

  setDifficulty(difficulty: string) {
    this.difficulty = difficulty;
    // Regenerate level immediately so the new difficulty is visible
    if (this.initialized && this.currentTheme) {
      this.clearLines();
      this.loadLevel();
    }
  }

  private drawBackgroundGrid() {
    if (!this.currentTheme) return;
    const bg = this.backgroundGrid;
    bg.clear();

    // Fill background color with opacity support
    bg.rect(0, 0, GAME_CONFIG.logicalWidth, GAME_CONFIG.logicalHeight);
    bg.fill({ color: this.currentTheme.bgColor, alpha: this.currentTheme.bgOpacity });

    if (this.currentTheme.showGrid) {
      const spacing = this.currentTheme.gridSize;
      const size = 2; // Dot size
      const color = 0x000000;
      const alpha = 0.08;
      const w = GAME_CONFIG.logicalWidth;
      const h = GAME_CONFIG.logicalHeight;

      for (let x = spacing; x < w; x += spacing) {
        for (let y = spacing; y < h; y += spacing) {
          bg.circle(x, y, size);
        }
      }
      bg.fill({ color, alpha });
    }
  }

  private loadLevel() {
    if (!this.currentTheme) return;
    const level = generateLevelWithDifficulty(this.difficulty);
    for (const lineData of level.lines) {
      const gameLine = new GameLine(lineData.id, lineData.points, this.currentTheme);
      gameLine.addToStage(this.rootContainer);
      this.lines.push(gameLine);
    }
    this.linesRemaining = this.lines.length;
  }

  private clearLines() {
    for (const line of this.lines) {
      line.removeFromStage();
      line.destroy();
    }
    this.lines = [];
  }

  private handleClick(localX: number, localY: number) {
    if (!this.isPlaying) return;

    for (const line of this.lines) {
      if (line.containsPoint(localX, localY)) {
        line.startForward();
        soundManager.playMove(); // Play move sound when a line starts moving
        return;
      }
    }

    // Play tap sound ONLY if no line was hit
    soundManager.playTap();
  }

  private triggerShake() {
    this.shakeTimer = GAME_CONFIG.shakeDuration;
    this.shakeIntensity = GAME_CONFIG.shakeIntensity;
  }

  private updateShake(delta: number) {
    if (this.shakeTimer <= 0) {
      this.onResize();
      return;
    }
    this.shakeTimer -= delta / 60;
    const t = Math.max(0, this.shakeTimer / GAME_CONFIG.shakeDuration);
    const intensity = this.shakeIntensity * t;

    const baseX = (this.app.screen.width - GAME_CONFIG.logicalWidth * this.gameScale) / 2;
    const baseY = (this.app.screen.height - GAME_CONFIG.logicalHeight * this.gameScale) / 2;

    this.rootContainer.x = baseX + (Math.random() - 0.5) * intensity * 2;
    this.rootContainer.y = baseY + (Math.random() - 0.5) * intensity * 2;
  }

  private onTick(ticker: PIXI.Ticker) {
    if (!this.initialized) return;
    const delta = ticker.deltaTime;

    this.updateShake(delta);

    if (this.hitStopCounter > 0) {
      this.hitStopCounter--;
      for (const line of this.lines) line.update(0);
      return;
    }

    for (const line of this.lines) {
      if (line.state.status === 'idle' || line.state.status === 'cleared') {
        line.update(delta);
      }
    }

    if (!this.isPlaying) return;

    for (const line of this.lines) {
      if (line.state.status === 'cleared' || line.state.status === 'idle') continue;
      const result = line.update(delta);
      if (result === 'cleared') {
        soundManager.playClear(); // Play clear sound
        this.linesRemaining--;
        this.callbacks.onLineCleared?.(this.linesRemaining);
        if (this.linesRemaining <= 0) {
          this.isPlaying = false;
          soundManager.playWin(); // Play win sound
          this.callbacks.onGameWon?.({ won: true, linesCleared: this.lines.length, livesRemaining: this.lives });
          return;
        }
      } else if (result === 'timed-out') {
        soundManager.playCollision();
        this.triggerShake();
        this.lives--;
        this.callbacks.onCollision?.(this.lives);
        if (this.lives <= 0) {
          this.isPlaying = false;
          soundManager.playLose();
          this.callbacks.onGameLost?.({ won: false, linesCleared: 0, livesRemaining: 0 });
          return;
        }
      }
    }

    for (const line of this.lines) {
      if (line.state.status !== 'moving-forward' || line.state.hasCollided) continue;
      if (line.checkHeadCollision(this.lines)) {
        line.handleCollision();
        soundManager.playCollision(); // Play collision sound
        this.triggerShake();
        this.hitStopCounter = GAME_CONFIG.hitStopFrames;
        if (!line.state.lostLifeForCollision) {
          line.state.lostLifeForCollision = true;
          this.lives--;
          this.callbacks.onCollision?.(this.lives);
          if (this.lives <= 0) {
            this.isPlaying = false;
            soundManager.playLose(); // Play lose sound
            this.callbacks.onGameLost?.({ won: false, linesCleared: 0, livesRemaining: 0 });
            return;
          }
        }
      }
    }
  }

  getLives(): number { return this.lives; }
  getLinesRemaining(): number { return this.linesRemaining; }
}
