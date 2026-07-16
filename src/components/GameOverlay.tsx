import { useState, useEffect, useMemo } from 'react';
import type { WinResult, GameThemeConfig } from '../engine/types';
import { soundManager } from '../engine/SoundManager';

interface GameOverlayProps {
  result: WinResult | null;
  theme: GameThemeConfig;
  onClose: () => void;
}

export function GameOverlay({ result, theme, onClose }: GameOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (result) {
      setVisible(false);
      setExiting(false);
      const t = setTimeout(() => {
        setVisible(true);
        if (result.label !== 'Try Again') {
          soundManager.playPopupWin();
        } else {
          soundManager.playPopupLose();
        }
      }, 50);
      return () => clearTimeout(t);
    }
    setVisible(false);
    setExiting(false);
  }, [result]);

  const confettiPieces = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      left: `${50 + (Math.random() - 0.5) * 20}%`,
      top: `${50 + (Math.random() - 0.5) * 20}%`,
      color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF9FF3', '#FFA502'][i % 7],
      size: 6 + Math.random() * 8,
      tx: (Math.random() - 0.5) * 400,
      ty: (Math.random() - 0.5) * 400 - 100,
      rot: Math.random() * 720 - 360,
      delay: Math.random() * 0.1,
    }));
  }, [result]);

  if (!result) return null;

  const isWin = result.label !== 'Try Again';

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 400);
  };

  return (
    <div
      className={`overlay-backdrop ${visible && !exiting ? 'visible' : ''} ${exiting ? 'exiting' : ''}`}
      onClick={handleClose}
    >
      {isWin && visible && !exiting && (
        <div className="confetti-container">
          {confettiPieces.map((piece, i) => (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left: piece.left,
                top: piece.top,
                backgroundColor: piece.color,
                width: `${piece.size}px`,
                height: `${piece.size}px`,
                animationDelay: `${piece.delay}s`,
                '--tx': `${piece.tx}px`,
                '--ty': `${piece.ty}px`,
                '--rot': `${piece.rot}deg`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {isWin ? (
        <div 
          className={`voucher-card theme-${theme.voucherTheme} ${visible && !exiting ? 'enter' : ''} ${exiting ? 'exit' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Watermark Stars Background */}
          <div className="voucher-bg-stars">
            <svg viewBox="0 0 100 100" className="watermark-star s1"><polygon points="50,5 61,35 95,35 68,54 78,85 50,65 22,85 32,54 5,35 39,35" /></svg>
            <svg viewBox="0 0 100 100" className="watermark-star s2"><polygon points="50,5 61,35 95,35 68,54 78,85 50,65 22,85 32,54 5,35 39,35" /></svg>
            <svg viewBox="0 0 100 100" className="watermark-star s3"><polygon points="50,5 61,35 95,35 68,54 78,85 50,65 22,85 32,54 5,35 39,35" /></svg>
          </div>

          <div className="voucher-content">
            <div className="top-stars">
              <span>★</span>
              <span className="star-large">★</span>
              <span>★</span>
            </div>
            
            <div className="voucher-value">
              {theme.rewardValue}
            </div>

            <div className="voucher-ribbon-container">
              <div className="ribbon-tail left"></div>
              <div className="ribbon-center">
                <span>★</span> {theme.voucherLabel} <span>★</span>
              </div>
              <div className="ribbon-tail right"></div>
            </div>

            <div className="voucher-footer">
              ★ <i>special offer</i> ★
            </div>

            <button className="claim-btn" onClick={handleClose}>
              CLAIM NOW
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`overlay-card card-lose ${visible && !exiting ? 'enter' : ''} ${exiting ? 'exit' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="card-header-icon">💔</div>
          <h2 className="card-title">Game Over</h2>
          <div className="lose-box">
            <p className="lose-text">You ran out of lives. Better luck next time!</p>
          </div>
          <button className="card-btn btn-lose" onClick={handleClose}>TRY AGAIN</button>
        </div>
      )}
    </div>
  );
}
