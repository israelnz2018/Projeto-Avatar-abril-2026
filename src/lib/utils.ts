import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Monta a URL da thumbnail de um vídeo do YouTube.
 *
 * IMPORTANTE: NÃO adicionar query string (?v=, ?t=, etc.) na URL.
 * O domínio img.youtube.com NÃO aceita query params — quando recebe `?v=1`
 * ele devolve imagem vazia/placeholder cinza em vez da capa. Isso quebrou
 * 95% das capas numa tentativa de cache-busting em jun/2026. A URL tem que
 * ser exatamente `https://img.youtube.com/vi/{id}/{quality}.jpg`, limpa.
 *
 * Se um dia precisar forçar reload de capa (cache antigo), a saída é trocar
 * a QUALIDADE (ex: hqdefault → sddefault) ou o domínio (i.ytimg.com), não
 * anexar query string.
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
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}
