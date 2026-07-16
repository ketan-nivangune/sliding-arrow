import { useEffect, useRef, type RefObject } from 'react';
import type { GameThemeConfig } from '../engine/types';

export interface PixiGameEngine {
  init(canvas: HTMLCanvasElement, theme: GameThemeConfig): Promise<void>;
  destroy(): void;
}

export function usePixiCanvas<T extends PixiGameEngine>(
  createEngine: () => T,
  initialTheme: GameThemeConfig,
  onReady?: (engine: T, canvas: HTMLCanvasElement) => void,
): { containerRef: RefObject<HTMLDivElement | null>; engineRef: RefObject<T | null> } {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<T | null>(null);
  const onReadyRef = useRef(onReady);
  const initialThemeRef = useRef(initialTheme);
  onReadyRef.current = onReady;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const engine = createEngine();
    engineRef.current = engine;

    engine
      .init(canvas, initialThemeRef.current)
      .then(() => onReadyRef.current?.(engine, canvas))
      .catch(console.error);

    return () => {
      engine.destroy();
      try {
        canvas.remove();
      } catch {
        // ignore
      }
      engineRef.current = null;
    };
  }, []);

  return { containerRef, engineRef };
}
