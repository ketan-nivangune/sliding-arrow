import { useEffect, useRef } from 'react';

interface LivesDisplayProps {
  lives: number;
  maxLives: number;
}

export function LivesDisplay({ lives, maxLives }: LivesDisplayProps) {
  const prevLivesRef = useRef(lives);
  const containerRef = useRef<HTMLDivElement>(null);

  // Trigger shake + bounce when losing a life
  useEffect(() => {
    if (lives < prevLivesRef.current && containerRef.current) {
      containerRef.current.classList.add('lives-shake');
      const t = setTimeout(() => {
        containerRef.current?.classList.remove('lives-shake');
      }, 500);
      prevLivesRef.current = lives;
      return () => clearTimeout(t);
    }
    prevLivesRef.current = lives;
  }, [lives]);

  return (
    <div className="lives-badge" ref={containerRef}>
      {Array.from({ length: maxLives }, (_, i) => {
        const isActive = i < lives;
        const justLost = i === lives && lives < maxLives;
        return (
          <span
            key={i}
            className={`heart ${isActive ? 'active' : 'lost'} ${justLost ? 'heart-break' : ''}`}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill={isActive ? '#B83A3F' : '#E8B4B8'}
              />
              {isActive && (
                <ellipse cx="8.5" cy="7.5" rx="2.8" ry="2.2" fill="white" opacity="0.3" />
              )}
            </svg>
          </span>
        );
      })}
    </div>
  );
}
