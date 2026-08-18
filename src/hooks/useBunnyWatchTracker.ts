/**
 * useBunnyWatchTracker — equivalente ao useYouTubeWatchTracker, mas pro player do
 * Bunny Stream (iframe mediadelivery.net), usando o protocolo player.js via postMessage.
 *
 * Paridade com o YouTube:
 *  - Conta só o AVANÇO real de reprodução (delta pequeno entre timeupdates) — arrastar a
 *    barrinha pro fim (seek grande) NÃO conta como assistido (anti-gaming).
 *  - Dispara onThresholdReached UMA vez quando assistido/duração >= threshold.
 *  - onTick(currentSeconds, durationSeconds) a cada timeupdate (pra persistir a posição).
 *  - resumeAt: ao ficar pronto, dá seek pra retomar de onde parou.
 *
 * Sem dependência externa — fala o protocolo player.js na mão. Interface espelha o hook
 * do YouTube pra o LearningView plugar do mesmo jeito.
 */
import { useEffect, useRef } from 'react';

interface Options {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  /** GUID do vídeo no Bunny — quando muda, reseta. null = inativo (no-op). */
  bunnyGuid: string | null;
  threshold: number;
  resumeAt?: number; // segundos pra retomar
  onThresholdReached: (pctWatched: number) => void;
  onTick?: (currentSeconds: number, durationSeconds: number) => void;
}

const PJS = 'player.js';

export function useBunnyWatchTracker({ iframeRef, bunnyGuid, threshold, resumeAt = 0, onThresholdReached, onTick }: Options) {
  const cbRef = useRef(onThresholdReached);
  const tickRef = useRef(onTick);
  useEffect(() => { cbRef.current = onThresholdReached; }, [onThresholdReached]);
  useEffect(() => { tickRef.current = onTick; }, [onTick]);

  // resumeAt NÃO pode ser dependência do efeito abaixo. Quem nos usa deriva esse
  // valor do progresso salvo, que é atualizado em tempo real (onSnapshot) a cada
  // ~10s pelo próprio onTick. Como dependência, isso remontava o efeito em loop,
  // zerava a trava `resumed` e reenviava setCurrentTime com uma posição de ~10s
  // atrás — o vídeo voltava e repetia a última frase. Fica numa ref, lida só uma
  // vez por vídeo (no 'ready'), sem disparar remontagem.
  const resumeAtRef = useRef(resumeAt);
  useEffect(() => { resumeAtRef.current = resumeAt; }, [resumeAt]);

  useEffect(() => {
    if (!bunnyGuid || !iframeRef.current) return;
    const iframe = iframeRef.current;

    let watched = 0;
    let lastPos = 0;
    let fired = false;
    let resumed = false;
    let retomarTimer = 0;

    const send = (msg: any) => {
      try { iframe.contentWindow?.postMessage(JSON.stringify(msg), '*'); } catch { /* ignore */ }
    };
    const addListener = (ev: string) => send({ context: PJS, version: '0.0.11', method: 'addEventListener', value: ev, listener: ev });

    const onMsg = (e: MessageEvent) => {
      let d: any = e.data;
      if (typeof d === 'string') { try { d = JSON.parse(d); } catch { return; } }
      if (!d || d.context !== PJS) return;

      if (d.event === 'ready') {
        addListener('timeupdate');
        addListener('ended');
        const alvo = resumeAtRef.current;
        if (alvo > 1 && !resumed) {
          resumed = true;
          // pequeno atraso pra o player aceitar o seek
          retomarTimer = window.setTimeout(() => send({ context: PJS, method: 'setCurrentTime', value: alvo }), 800);
        }
      } else if (d.event === 'timeupdate') {
        const v = d.value || {};
        const seconds = Number(v.seconds || 0);
        const duration = Number(v.duration || 0);
        // Acumula só avanço real de playback (ignora seek grande) → anti-gaming, igual YouTube.
        const delta = seconds - lastPos;
        if (delta > 0 && delta < 2) watched += delta;
        lastPos = seconds;
        if (duration > 0) {
          try { tickRef.current?.(seconds, duration); } catch { /* ignore */ }
          const pct = watched / duration;
          if (!fired && pct >= threshold) {
            fired = true;
            try { cbRef.current(pct); } catch (err) { console.error('[useBunnyWatchTracker] callback:', err); }
          }
        }
      }
    };

    window.addEventListener('message', onMsg);
    // Registra o ready (o player do Bunny emite ready; alguns já mandam antes de escutarmos).
    addListener('ready');

    return () => {
      window.removeEventListener('message', onMsg);
      if (retomarTimer) window.clearTimeout(retomarTimer);
    };
    // resumeAt fica FORA de propósito (ver comentário acima): ele muda a cada
    // gravação de progresso e remontaria o efeito em loop durante a reprodução.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bunnyGuid, threshold]);
}
