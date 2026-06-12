import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Versão da thumbnail do YouTube — usada como cache-buster.
 *
 * O app puxa a capa do vídeo direto do YouTube (img.youtube.com/vi/{id}/...).
 * Quando uma capa customizada é trocada/removida no YouTube, o navegador e o
 * CDN do Google podem continuar servindo a versão antiga em cache por horas/dias.
 *
 * Esta constante é anexada como `?v=N` em todas as URLs de thumbnail. Quando
 * você precisar forçar TODOS os usuários a rebaixar as capas novas (ex: depois
 * de trocar capas no YouTube de novo), basta INCREMENTAR este número e fazer
 * deploy. Cada valor novo é uma URL nova → o cache antigo é ignorado.
 *
 * Histórico:
 *   1 — jun/2026: capas customizadas removidas do YouTube; forçar reload pro
 *       frame automático aparecer no lugar das capas antigas em cache.
 */
export const YT_THUMB_VERSION = 1;

/**
 * Monta a URL da thumbnail de um vídeo do YouTube com cache-busting embutido.
 *
 * @param videoId  ID de 11 chars do vídeo (não a URL completa)
 * @param quality  qualidade da thumb ('hqdefault' = 480x360 padrão dos cards,
 *                 'default' = 120x90 pra listas compactas)
 * @returns URL pronta pro src de uma <img>, ou string vazia se videoId falsy
 */
export function youtubeThumb(
  videoId: string | null | undefined,
  quality: 'default' | 'hqdefault' | 'mqdefault' | 'sddefault' | 'maxresdefault' = 'hqdefault'
): string {
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg?v=${YT_THUMB_VERSION}`;
}
