/**
 * Geração de índice/resumo da transcrição de vídeos da plataforma.
 *
 * Roda 100% no servidor (POST /api/gerar-indice) — a chave da IA nunca chega ao
 * navegador. Ver server.ts (gerarIndicePorIA) pra trocar de provider.
 */

import { auth } from './firebase';

export async function generateSummaryFromRawTranscript(_url: string, rawTranscript: string) {
  try {
    const user = auth.currentUser;
    const token = user ? await user.getIdToken() : '';
    const r = await fetch('/api/gerar-indice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ rawTranscript }),
    });
    const parsed = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(parsed?.error || 'Erro ao gerar índice.');
    return {
      summary: Array.isArray(parsed.summary) ? parsed.summary : [],
      transcript: parsed.transcript || '',
    };
  } catch (error: any) {
    console.error('[generateSummaryFromRawTranscript] erro:', error);
    throw new Error(error?.message || 'Erro ao gerar índice. Tente novamente em instantes.');
  }
}
