export interface Point {
  x: number;
  y: number;
}

export type LineStatus = 'idle' | 'moving-forward' | 'moving-backward' | 'cleared';

export interface LineData {
  id: number;
  points: Point[];
}

export interface GameLineState {
  id: number;
  originalPoints: Point[];
  currentPoints: Point[];
  direction: Point;
  status: LineStatus;
  hasCollided: boolean;
  lostLifeForCollision: boolean;
  isAnimating: boolean;
}

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export interface GameResult {
  won: boolean;
  linesCleared: number;
  livesRemaining: number;
}

export interface GameCallbacks {
  onGameStart?: () => void;
  onLineCleared?: (linesRemaining: number) => void;
  onCollision?: (livesRemaining: number) => void;
  onGameWon?: (result: GameResult) => void;
  onGameLost?: (result: GameResult) => void;
}

export interface WinResult {
  label: string;
  color: string;
  accent: string;
  redemptionUrl?: string;
}

export interface GameThemeConfig {
  arrowColor: number;
  arrowThickness: number;
  arrowHeadStyle: 'triangle' | 'flat';
  pathStyle: 'rounded' | 'square';
  
  // Grid / Canvas Settings
  bgColor: number;
  bgOpacity: number; // 0 to 1
  canvasRadius: number; // 0 to 40
  showGrid: boolean;
  gridSize: number;
  
  // Voucher Settings
  voucherTheme: 'purple' | 'gold' | 'blue';
  rewardValue: string;
  voucherLabel: string;
  
  // Campaign Environment
  campaignBgLandscape: string | null;
  campaignBgPortrait: string | null;
}
