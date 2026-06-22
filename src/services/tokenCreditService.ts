/**
 * tokenCreditService — controle de crédito de IA POR USUÁRIO (creditoIA).
 *
 * Unidade "token LBW": 1 token LBW = 1.000 tokens reais de OUTPUT.
 *   → consumo = ceil(outputTokens / 1000), mínimo 1 por chamada que gerou texto.
 *
 * Grátis (Trilha 1): limite 200 tokens LBW/mês, renovado mensalmente (resetEm).
 * Pagantes: por enquanto sem bloqueio (limite alto / ausente).
 *
 * Fluxo:
 *   - canUseAI()  → ANTES de chamar a IA: aplica reset mensal se vencido e diz
 *                   se ainda há saldo. Bloqueia só quando usado >= limite.
 *   - consumeOutput(outputTokens) → DEPOIS da chamada: incrementa creditoIA.usado.
 *
 * Tudo é best-effort: se o Firestore falhar, NÃO trava a UI (libera por padrão),
 * mas o consumo é registrado quando possível.
 */
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const TOKENS_REAIS_POR_LBW = 1000;
const LIMITE_GRATIS = 200;

/** Plano que NÃO sofre bloqueio de crédito por enquanto. */
function isPlanoIlimitado(plano?: string, tipoUsuario?: string): boolean {
  if (tipoUsuario === 'admin' || tipoUsuario === 'coordenador') return true;
  return plano === 'completo' || plano === 'coordenador';
}

/** Próxima data de reset: agora + 30 dias (ISO). Mesma convenção do userService. */
function proximoReset(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString();
}

export interface CreditStatus {
  allowed: boolean;
  usado: number;
  limite: number;
  restante: number;
  ilimitado: boolean;
}

/**
 * Verifica se o usuário atual pode usar IA. Aplica reset mensal se o mês virou.
 * Retorna allowed=false só quando o limite foi atingido (plano não-ilimitado).
 */
export async function canUseAI(): Promise<CreditStatus> {
  const liberadoFallback: CreditStatus = { allowed: true, usado: 0, limite: LIMITE_GRATIS, restante: LIMITE_GRATIS, ilimitado: false };
  try {
    const user = auth.currentUser;
    if (!user) return liberadoFallback;

    const ref = doc(db, 'users', user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return liberadoFallback;

    const data = snap.data() as any;
    if (isPlanoIlimitado(data?.plano, data?.tipoUsuario)) {
      return { allowed: true, usado: 0, limite: 0, restante: 0, ilimitado: true };
    }

    const credito = data?.creditoIA || {};
    const limite = typeof credito.limite === 'number' && credito.limite > 0 ? credito.limite : LIMITE_GRATIS;
    let usado = typeof credito.usado === 'number' ? credito.usado : 0;

    // Reset mensal: se a data de reset (ISO) já passou (ou está ausente), zera o
    // consumo e agenda o próximo reset (+30 dias). Mesma convenção do userService.
    const resetEm = typeof credito.resetEm === 'string' ? credito.resetEm : '';
    const venceu = !resetEm || new Date(resetEm).getTime() <= Date.now();
    if (venceu) {
      usado = 0;
      try { await updateDoc(ref, { 'creditoIA.usado': 0, 'creditoIA.resetEm': proximoReset() }); } catch { /* best-effort */ }
    }

    const restante = Math.max(0, limite - usado);
    return { allowed: usado < limite, usado, limite, restante, ilimitado: false };
  } catch {
    return liberadoFallback; // nunca trava por falha de leitura
  }
}

/**
 * Registra o consumo de uma chamada de IA (em tokens LBW), incrementando
 * creditoIA.usado. Best-effort, fire-and-forget.
 */
export function consumeOutput(outputTokens: number): void {
  if (!outputTokens || outputTokens <= 0) return;
  const tokensLbw = Math.max(1, Math.ceil(outputTokens / TOKENS_REAIS_POR_LBW));
  void (async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      await updateDoc(ref, { 'creditoIA.usado': increment(tokensLbw) });
    } catch { /* best-effort: telemetria de consumo não pode travar a UI */ }
  })();
}
