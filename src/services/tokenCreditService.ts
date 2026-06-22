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

// Limites mensais (tokens LBW) por tipo de acesso.
const LIMITE_GRATIS = 200;          // plano gratuito (Trilha 1)
const LIMITE_CORTESIA = 500;        // completo gratuito (convidados/cortesia)
const LIMITE_PAGANTE = 1000;        // completo pago (Hotmart)

/** admin/coordenador não sofrem bloqueio de crédito. */
function isPlanoIlimitado(tipoUsuario?: string): boolean {
  return tipoUsuario === 'admin' || tipoUsuario === 'coordenador';
}

/** Marcas que indicam acesso completo concedido como CORTESIA (não pagante). */
function isCortesia(data: any): boolean {
  const origem = String(data?.origemAcesso || '');
  return origem.length > 0; // hoje só cortesias setam origemAcesso (ex: convite-reativacao)
}

/** Limite mensal (tokens LBW) conforme o tipo de acesso do usuário. */
function limitePorAcesso(data: any): number {
  const plano = data?.plano;
  if (plano === 'completo') return isCortesia(data) ? LIMITE_CORTESIA : LIMITE_PAGANTE;
  return LIMITE_GRATIS; // gratuito (ou ausente)
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
    if (isPlanoIlimitado(data?.tipoUsuario)) {
      return { allowed: true, usado: 0, limite: 0, restante: 0, ilimitado: true };
    }

    const credito = data?.creditoIA || {};
    // Limite é derivado do tipo de acesso (gratuito 200 / cortesia 500 / pagante 1000).
    const limite = limitePorAcesso(data);
    let usado = typeof credito.usado === 'number' ? credito.usado : 0;

    // Reset mensal: se a data de reset (ISO) já passou (ou está ausente), zera o
    // consumo e agenda o próximo reset (+30 dias). Mesma convenção do userService.
    const resetEm = typeof credito.resetEm === 'string' ? credito.resetEm : '';
    const venceu = !resetEm || new Date(resetEm).getTime() <= Date.now();
    // Mantém creditoIA.limite no doc sincronizado com o limite derivado, pra o
    // painel /users exibir o valor correto (200 / 500 / 1000).
    const limiteDessincronizado = credito.limite !== limite;
    if (venceu || limiteDessincronizado) {
      const patch: Record<string, any> = { 'creditoIA.limite': limite };
      if (venceu) { usado = 0; patch['creditoIA.usado'] = 0; patch['creditoIA.resetEm'] = proximoReset(); }
      try { await updateDoc(ref, patch); } catch { /* best-effort */ }
    }

    const restante = Math.max(0, limite - usado);
    return { allowed: usado < limite, usado, limite, restante, ilimitado: false };
  } catch {
    return liberadoFallback; // nunca trava por falha de leitura
  }
}

/**
 * Aluno solicita aumento de crédito. Grava no próprio doc do usuário
 * (creditoIA.solicitouMais + data) — o admin vê no painel /users, sem e-mail.
 * Retorna true se gravou.
 */
export async function solicitarMaisCredito(): Promise<boolean> {
  try {
    const user = auth.currentUser;
    if (!user) return false;
    await updateDoc(doc(db, 'users', user.uid), {
      'creditoIA.solicitouMais': true,
      'creditoIA.solicitadoEm': new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
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
