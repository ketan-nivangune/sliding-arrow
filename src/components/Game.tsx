import { useState, useCallback, useEffect } from 'react';
import { ArrowGameEngine } from '../engine/ArrowGameEngine';
import { usePixiCanvas } from '../hooks/usePixiCanvas';
import { LivesDisplay } from './LivesDisplay';
import { GameOverlay } from './GameOverlay';
import { Sidebar } from './Sidebar';
import { GAME_CONFIG } from '../engine/config';
import type { WinResult, GameThemeConfig } from '../engine/types';

interface GameProps {
  rewardLabel?: string;
  rewardColor?: string;
  rewardAccent?: string;
}

const DEFAULT_THEME: GameThemeConfig = {
  arrowColor: 0x000000,
  arrowThickness: 12,
  arrowHeadStyle: 'triangle',
  pathStyle: 'rounded',
  bgColor: 0xffffff,
  bgOpacity: 1,
  canvasRadius: 12,
  showGrid: true,
  gridSize: 25,
  voucherTheme: 'purple',
  rewardValue: '$100',
  voucherLabel: 'GIFT VOUCHER',
  campaignBgColor: '#1A1A1A',
  showVignette: true,
  campaignBgLandscape: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a4d?q=80&w=2074&auto=format&fit=crop',
  campaignBgPortrait: 'https://images.unsplash.com/photo-1516214104703-d2507f0147e8?q=80&w=1000&auto=format&fit=crop',
  bgFit: 'cover',
};

export function Game({
  rewardLabel = '10% OFF',
  rewardColor = '#7EC8E3',
  rewardAccent = '#5BA3C9',
}: GameProps) {
  const [theme, setTheme] = useState<GameThemeConfig>(DEFAULT_THEME);
  const [lives, setLives] = useState(GAME_CONFIG.maxLives);
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [winResult, setWinResult] = useState<WinResult | null>(null);
  const [difficulty, setDifficulty] = useState<string>('medium');

  const [shakeHeader, setShakeHeader] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Trigger resize when sidebar toggles so PIXI recalculates layout
  useEffect(() => {
    window.dispatchEvent(new Event('resize'));
  }, [isSidebarOpen]);

  const handleGameWon = useCallback(
    (_result: unknown) => {
      setGameStatus('won');
      setWinResult({ label: rewardLabel, color: rewardColor, accent: rewardAccent });
    },
    [rewardLabel, rewardColor, rewardAccent],
  );

  const handleGameLost = useCallback(() => {
    setGameStatus('lost');
    setWinResult({ label: 'Try Again', color: '#666', accent: '#888' });
  }, []);

  const handleCollision = useCallback((remaining: number) => {
    setLives(remaining);
    setShakeHeader(true);
  }, []);

  const handleLineCleared = useCallback(() => {
    // Left empty since progress was removed
  }, []);

  useEffect(() => {
    if (shakeHeader) {
      const t = setTimeout(() => setShakeHeader(false), 400);
      return () => clearTimeout(t);
    }
  }, [shakeHeader]);

  const { containerRef, engineRef } = usePixiCanvas(
    () => new ArrowGameEngine(),
    DEFAULT_THEME,
    (engine) => {
      engine.setCallbacks({
        onGameWon: handleGameWon,
        onGameLost: handleGameLost,
        onCollision: handleCollision,
        onLineCleared: handleLineCleared,
      });
    },
  );

  // Apply theme changes instantly to engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.applyTheme(theme);
    }
  }, [theme, engineRef]);

  // Regenerate level when difficulty changes (only in idle state)
  useEffect(() => {
    if (engineRef.current && gameStatus === 'idle') {
      engineRef.current.setDifficulty(difficulty);
    }
  }, [difficulty, gameStatus, engineRef]);

  const handleStart = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setDifficulty(difficulty);
    engine.startGame();
    setLives(GAME_CONFIG.maxLives);
    setGameStatus('playing');
  };

  const handleRestart = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.setDifficulty(difficulty);
    engine.resetGame();
    setLives(GAME_CONFIG.maxLives);
    setGameStatus('playing');
    setWinResult(null);
  };

  const handleCloseOverlay = () => {
    setWinResult(null);
    handleRestart();
  };

  return (
    <div className="builder-layout">
      {/* Left Area: Game Canvas */}
      <div
        className="builder-main"
        style={{
          '--bg-landscape': theme.campaignBgLandscape ? `url(${theme.campaignBgLandscape})` : 'none',
          '--bg-portrait': theme.campaignBgPortrait ? `url(${theme.campaignBgPortrait})` : 'none',
          '--bg-fit': theme.bgFit,
          backgroundColor: theme.campaignBgColor,
        } as React.CSSProperties}
      >
        <div className="builder-main-vignette" style={{ opacity: theme.showVignette ? 1 : 0, transition: 'opacity 0.3s' }}></div>
        <div className="builder-header">
          <div className="breadcrumb">
            <span className="back-arrow">←</span>
            <h2>Arrow Puzzle</h2>
            <span className="badge">Draft</span>
          </div>
          <div className="header-actions">
            <button className="preview-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              {isSidebarOpen ? 'Hide Controls' : 'Show Controls'}
            </button>
            <button className="publish-btn">Publish</button>
          </div>
        </div>

        <div className="game-wrapper">
          <div className={`game-header ${shakeHeader ? 'shake' : ''}`}>
            <div className="header-left">
              <button
                className="header-btn undo-btn"
                onClick={handleRestart}
                disabled={gameStatus !== 'playing'}
                title="Restart"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                Refresh
              </button>
            </div>

            <LivesDisplay lives={lives} maxLives={GAME_CONFIG.maxLives} />
          </div>
          <div className="game-canvas-area">
            <div
              className="game-canvas-container"
              style={{
                backgroundColor: `rgba(${(theme.bgColor >> 16) & 255}, ${(theme.bgColor >> 8) & 255}, ${theme.bgColor & 255}, ${theme.bgOpacity})`,
                borderRadius: `${theme.canvasRadius}px`,
                boxShadow: theme.bgOpacity === 0 ? 'none' : undefined,
              }}
            >
              <div ref={containerRef} className="canvas-mount" />

              {gameStatus === 'idle' && (
                <div className="start-overlay">
                  <div className="start-card">
                    <h1 className="start-title">ARROWS</h1>
                    <p className="start-subtitle">
                      Tap arrows to send them forward.<br />
                      Clear all without collisions!
                    </p>
                    <button className="start-button" onClick={handleStart}>
                      PLAY
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Area: Sidebar Config */}
      {isSidebarOpen && (
        <Sidebar
          theme={theme}
          onThemeChange={setTheme}
          onClose={() => setIsSidebarOpen(false)}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
        />
      )}

      <GameOverlay result={winResult} theme={theme} onClose={handleCloseOverlay} />
    </div>
  );
}
