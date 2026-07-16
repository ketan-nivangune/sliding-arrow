import * as PIXI from 'pixi.js';
import { GAME_CONFIG, FLASH_DURATION, pointToSegmentDistance } from './config';
import type { Point, GameLineState, GameThemeConfig } from './types';

export class GameLine {
  state: GameLineState;
  private container: PIXI.Container;
  private graphics: PIXI.Graphics;

  private originalPoints: Point[];
  private trackDistances: number[];
  private originalLength: number;
  private direction: Point;
  private currentTailPos: number = 0;

  private flashTimer = 0;
  private isFlashing = false;
  private flashOn = false;



  private theme: GameThemeConfig;

  constructor(id: number, points: Point[], theme: GameThemeConfig) {
    this.originalPoints = points.map(p => ({ ...p }));
    this.theme = theme;

    this.trackDistances = [0];
    let totalLen = 0;
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      totalLen += d;
      this.trackDistances.push(totalLen);
    }
    this.originalLength = totalLen;

    const head = points[points.length - 1];
    const prev = points.length >= 2 ? points[points.length - 2] : null;
    const dir = prev ? { x: head.x - prev.x, y: head.y - prev.y } : { x: 1, y: 0 };
    const len = Math.hypot(dir.x, dir.y) || 1;
    this.direction = { x: dir.x / len, y: dir.y / len };

    this.state = {
      id,
      originalPoints: this.originalPoints,
      currentPoints: points.map(p => ({ ...p })),
      direction: this.direction,
      status: 'idle',
      hasCollided: false,
      lostLifeForCollision: false,
      isAnimating: false,
    };

    this.container = new PIXI.Container();
    this.graphics = new PIXI.Graphics();
    this.container.addChild(this.graphics);
    this.draw();
  }

  setTheme(theme: GameThemeConfig) {
    this.theme = theme;
    this.draw();
  }

  private getPointAtDistance(dist: number): Point {
    if (dist <= 0) return { ...this.originalPoints[0] };
    if (dist >= this.originalLength) {
      const head = this.originalPoints[this.originalPoints.length - 1];
      const excess = dist - this.originalLength;
      return {
        x: head.x + this.direction.x * excess,
        y: head.y + this.direction.y * excess
      };
    }
    for (let i = 0; i < this.trackDistances.length - 1; i++) {
      const d1 = this.trackDistances[i];
      const d2 = this.trackDistances[i + 1];
      if (dist >= d1 && dist < d2) {
        const p1 = this.originalPoints[i];
        const p2 = this.originalPoints[i + 1];
        const t = (dist - d1) / (d2 - d1);
        return {
          x: p1.x + (p2.x - p1.x) * t,
          y: p1.y + (p2.y - p1.y) * t
        };
      }
    }
    return { ...this.originalPoints[this.originalPoints.length - 1] };
  }

  private updateCurrentPoints() {
    const headPos = this.currentTailPos + this.originalLength;
    const newPts: Point[] = [];
    newPts.push(this.getPointAtDistance(this.currentTailPos));
    for (let i = 1; i < this.originalPoints.length - 1; i++) {
      const d = this.trackDistances[i];
      if (d > this.currentTailPos && d < headPos) {
        newPts.push({ ...this.originalPoints[i] });
      }
    }
    newPts.push(this.getPointAtDistance(headPos));
    this.state.currentPoints = newPts;
  }

  private draw() {
    const pts = this.state.currentPoints;
    this.graphics.clear();
    if (pts.length < 2) return;

    let color = this.theme.arrowColor;
    if (this.isFlashing) {
      color = this.flashOn ? GAME_CONFIG.collisionColor : this.theme.arrowColor;
    } else if (this.state.hasCollided && this.state.status === 'moving-backward') {
      color = GAME_CONFIG.collisionColor;
    }

    const joinStyle = this.theme.pathStyle === 'rounded' ? 'round' : 'miter';
    const capStyle = this.theme.pathStyle === 'rounded' ? 'round' : 'square';

    this.graphics.setStrokeStyle({
      width: this.theme.arrowThickness,
      color,
      cap: capStyle,
      join: joinStyle
    });

    this.graphics.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      this.graphics.lineTo(pts[i].x, pts[i].y);
    }
    this.graphics.stroke();

    this.drawArrowhead(pts, color);
  }

  private drawArrowhead(pts: Point[], color: number) {
    const head = pts[pts.length - 1];
    const prev = pts[pts.length - 2];
    const angle = Math.atan2(head.y - prev.y, head.x - prev.x);
    // Make head size proportional to thickness
    const size = Math.max(16, this.theme.arrowThickness * 1.8);

    const tipX = head.x + Math.cos(angle) * (size * 0.5);
    const tipY = head.y + Math.sin(angle) * (size * 0.5);

    if (this.theme.arrowHeadStyle === 'triangle') {
      const backAngle = Math.PI * 0.82;
      const leftX = tipX + Math.cos(angle + backAngle) * size;
      const leftY = tipY + Math.sin(angle + backAngle) * size;
      const rightX = tipX + Math.cos(angle - backAngle) * size;
      const rightY = tipY + Math.sin(angle - backAngle) * size;
      this.graphics.poly([tipX, tipY, leftX, leftY, rightX, rightY]);
      this.graphics.fill({ color });
    } else {
      // Flat style (chevron) - filled polygon
      const backAngle = Math.PI * 0.75;
      const leftX = tipX + Math.cos(angle + backAngle) * size;
      const leftY = tipY + Math.sin(angle + backAngle) * size;
      const rightX = tipX + Math.cos(angle - backAngle) * size;
      const rightY = tipY + Math.sin(angle - backAngle) * size;

      // Inner points for chevron
      const innerSize = size * 0.6;
      const innerLeftX = tipX + Math.cos(angle + Math.PI * 0.85) * innerSize;
      const innerLeftY = tipY + Math.sin(angle + Math.PI * 0.85) * innerSize;
      const innerRightX = tipX + Math.cos(angle - Math.PI * 0.85) * innerSize;
      const innerRightY = tipY + Math.sin(angle - Math.PI * 0.85) * innerSize;

      this.graphics.poly([tipX, tipY, leftX, leftY, innerLeftX, innerLeftY, innerRightX, innerRightY, rightX, rightY]);
      this.graphics.fill({ color });
    }
  }



  addToStage(parent: PIXI.Container) { parent.addChild(this.container); }
  removeFromStage() { this.container.parent?.removeChild(this.container); }

  containsPoint(x: number, y: number): boolean {
    if (this.state.status !== 'idle') return false;
    const pts = this.state.currentPoints;
    const hitR = this.theme.arrowThickness * 2.5;
    for (let i = 0; i < pts.length - 1; i++) {
      if (pointToSegmentDistance({ x, y }, pts[i], pts[i + 1]) < hitR) return true;
    }
    return false;
  }

  startForward() {
    if (this.state.status !== 'idle') return;
    this.state.status = 'moving-forward';
    this.state.hasCollided = false;
    this.state.lostLifeForCollision = false;
    this.state.isAnimating = true;
    this.isFlashing = false;
    this.flashOn = false;
    this.draw();
  }

  handleCollision() {
    if (this.state.hasCollided) return;
    this.state.hasCollided = true;
    this.state.status = 'moving-backward';
    this.isFlashing = true;
    this.flashTimer = FLASH_DURATION;
    this.flashOn = true;
    this.draw();
  }

  checkHeadCollision(otherLines: GameLine[]): boolean {
    if (this.state.status !== 'moving-forward' || this.state.hasCollided) return false;
    const pts = this.state.currentPoints;
    if (pts.length < 2) return false;
    const head = pts[pts.length - 1];

    for (const other of otherLines) {
      if (other.state.id === this.state.id) continue;
      if (other.state.status === 'cleared') continue;
      const oP = other.state.currentPoints;
      if (oP.length < 2) continue;
      for (let i = 0; i < oP.length - 1; i++) {
        if (pointToSegmentDistance(head, oP[i], oP[i + 1]) < GAME_CONFIG.collisionThreshold) {
          return true;
        }
      }
    }
    return false;
  }

  update(delta: number): 'cleared' | 'completed-backward' | null {
    const dt = delta / 60;

    if (this.state.status === 'cleared') {
      // Continue gliding seamlessly off the canvas, but accelerate the exit speed
      // for a fast, punchy visual finish that doesn't linger on the screen
      const speed = GAME_CONFIG.lineSpeed * dt * 3.0;
      this.currentTailPos += speed;
      this.updateCurrentPoints();
      this.draw();

      // Hide completely only when it is safely extremely far off screen
      if (this.currentTailPos > this.originalLength + GAME_CONFIG.logicalWidth * 2) {
        this.container.visible = false;
      }
      return null;
    }

    if (this.isFlashing) {
      this.flashTimer -= dt;
      this.flashOn = Math.floor(this.flashTimer * 12) % 2 === 0;
      if (this.flashTimer <= 0) { this.isFlashing = false; this.flashOn = false; }
    }

    if (this.state.status === 'moving-forward') return this.updateForward(dt);
    if (this.state.status === 'moving-backward') return this.updateBackward(dt);
    return null;
  }

  private updateForward(dt: number): 'cleared' | null {
    const speed = GAME_CONFIG.lineSpeed * dt;
    this.currentTailPos += speed;
    this.updateCurrentPoints();

    // Trigger the 'cleared' event very early (snappy fast feel)
    // 60px ensures the tail has just left its immediate grid cell area
    const triggerDistance = 60;
    if (this.currentTailPos > this.originalLength + triggerDistance) {
      this.state.status = 'cleared';
      this.state.isAnimating = false;
      return 'cleared';
    }
    this.draw();
    return null;
  }

  private updateBackward(dt: number): 'completed-backward' | null {
    const speed = GAME_CONFIG.lineSpeed * dt;
    this.currentTailPos -= speed;
    if (this.currentTailPos <= 0) {
      this.currentTailPos = 0;
      this.updateCurrentPoints();
      this.state.status = 'idle';
      this.state.hasCollided = false;
      this.state.lostLifeForCollision = false;
      this.state.isAnimating = false;
      this.isFlashing = false;
      this.flashOn = false;
      this.draw();
      return 'completed-backward';
    }
    this.updateCurrentPoints();
    this.draw();
    return null;
  }

  destroy() {
    this.graphics.clear();
    this.container.destroy({ children: true });
  }
}
