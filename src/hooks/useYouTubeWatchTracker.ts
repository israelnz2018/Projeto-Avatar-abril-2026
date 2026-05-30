/**
 * useYouTubeWatchTracker — conta segundos efetivamente assistidos de um iframe YouTube.
 *
 * Como funciona:
 *   1. Carrega a YouTube IFrame API (uma vez globalmente).
 *   2. Envolve o iframe já renderizado com `YT.Player` (precisa de `enablejsapi=1` no src).
 *   3. Conta segundos só quando o player está em PLAYING state — não conta seek pra frente,
 *      não conta pause, não conta enquanto carrega. Pra MVP usa contagem por intervalo
 *      (a cada 1s soma 1s se está playing), simples e robusta.
 *   4. Quando `secondsWatched / duration >= threshold`, dispara `onThresholdReached` UMA vez.
 *
 * Anti-gaming: como só conta tempo em PLAYING state, arrastar a barrinha pro fim não conta
 * como assistido — o aluno precisa deixar o vídeo tocando pelo menos `threshold * duration`
 * segundos (acumulado, pode pausar e retomar).
 *
 * Quando o player desmonta (componente desmonta, ou videoId muda), o player é destruído
 * limpinho — sem leak de listeners.
 */

import { useEffect, useRef, useState } from 'react';

// Tipos mínimos da YouTube IFrame API (sem dependência externa)
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

// Estado global do carregamento da API
let ytApiPromise: Promise<void> | null = null;

function loadYouTubeAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise<void>(resolve => {
    const existing = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existing) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }
    const prevCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prevCallback) prevCallback();
      resolve();
    };
    // Se a API já carregou no meio do caminho (race), resolve direto
    const interval = setInterval(() => {
      if (window.YT && window.YT.Player) {
        clearInterval(interval);
        resolve();
      }
    }, 200);
  });
  return ytApiPromise;
}

interface UseYouTubeWatchTrackerOptions {
  /** Ref pro elemento <iframe> que já está renderizado no DOM. */
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  /** VideoId — quando muda, reseta a contagem. */
  videoId: string | null;
  /** Threshold (0..1). Ex: 0.70 = 70%. */
  threshold: number;
  /** Disparado UMA VEZ quando `secondsWatched / duration >= threshold`. */
  onThresholdReached: (pctWatched: number) => void;
  /** Disparado a cada 1s enquanto está em PLAYING — recebe currentTime e duration reais do player.
   *  Use pra persistir a posição (com throttle no callback se quiser). */
  onTick?: (currentSeconds: number, durationSeconds: number) => void;
}

interface TrackerState {
  secondsWatched: number;
  duration: number;
  pctWatched: number;
  thresholdHit: boolean;
}

export function useYouTubeWatchTracker({
  iframeRef,
  videoId,
  threshold,
  onThresholdReached,
  onTick,
}: UseYouTubeWatchTrackerOptions): TrackerState {
  const [state, setState] = useState<TrackerState>({
    secondsWatched: 0,
    duration: 0,
    pctWatched: 0,
    thresholdHit: false,
  });

  // Refs pra não criar closures stale e evitar re-renders desnecessários
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const secondsRef = useRef(0);
  const thresholdHitRef = useRef(false);
  const callbackRef = useRef(onThresholdReached);
  const onTickRef = useRef(onTick);

  useEffect(() => { callbackRef.current = onThresholdReached; }, [onThresholdReached]);
  useEffect(() => { onTickRef.current = onTick; }, [onTick]);

  useEffect(() => {
    // Reset quando troca de vídeo
    secondsRef.current = 0;
    thresholdHitRef.current = false;
    setState({ secondsWatched: 0, duration: 0, pctWatched: 0, thresholdHit: false });

    if (!videoId || !iframeRef.current) return;

    let cancelled = false;
    let player: any = null;

    loadYouTubeAPI().then(() => {
      if (cancelled || !iframeRef.current) return;
      try {
        player = new window.YT.Player(iframeRef.current, {
          events: {
            onReady: (e: any) => {
              try {
                const dur = e.target.getDuration?.() || 0;
                setState(s => ({ ...s, duration: dur }));
              } catch {}
            },
            onStateChange: (e: any) => {
              // 1 = PLAYING. Iniciamos contagem por intervalo aqui.
              const isPlaying = e.data === 1;
              if (isPlaying && !intervalRef.current) {
                intervalRef.current = setInterval(() => {
                  if (!player) return;
                  secondsRef.current += 1;
                  let dur = 0;
                  let cur = 0;
                  try { dur = player.getDuration?.() || 0; } catch {}
                  try { cur = player.getCurrentTime?.() || 0; } catch {}
                  const pct = dur > 0 ? secondsRef.current / dur : 0;
                  setState({
                    secondsWatched: secondsRef.current,
                    duration: dur,
                    pctWatched: pct,
                    thresholdHit: thresholdHitRef.current,
                  });
                  if (!thresholdHitRef.current && pct >= threshold && dur > 0) {
                    thresholdHitRef.current = true;
                    setState(s => ({ ...s, thresholdHit: true }));
                    try { callbackRef.current(pct); } catch (err) { console.error('[useYouTubeWatchTracker] callback error:', err); }
                  }
                  // Tick com a posição REAL do vídeo (não acumulada) — pra persistir lastPosition
                  try { onTickRef.current?.(cur, dur); } catch (err) { console.error('[useYouTubeWatchTracker] onTick error:', err); }
                }, 1000);
              } else if (!isPlaying && intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            },
          },
        });
        playerRef.current = player;
      } catch (err) {
        console.error('[useYouTubeWatchTracker] erro ao instanciar player:', err);
      }
    });

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      try {
        playerRef.current?.destroy?.();
      } catch {}
      playerRef.current = null;
    };
    // iframeRef intencionalmente fora — ref não muda, depender dele causaria re-run desnecessário
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, threshold]);

  return state;
}

/**
 * Extrai o videoId YouTube de uma URL (suporta youtu.be e youtube.com/watch).
 */
export function extractYouTubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
