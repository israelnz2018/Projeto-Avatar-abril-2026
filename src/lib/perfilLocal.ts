/**
 * O perfil guardado no navegador — UMA GAVETA POR USUÁRIO.
 *
 * Era uma chave só (`lbw_user_profile`), sem o usuário no nome. Quem entrava depois
 * via os dados de quem entrou antes: nome, empresa, cargo e foto de outra pessoa na
 * tela "Meu Perfil". E não parava na tela — este perfil assina a CAPA dos
 * PowerPoints gerados e alimenta os relatórios, então o nome de outra pessoa ia
 * para dentro dos documentos do consultor.
 *
 * A conta está aqui, fora do componente e com o depósito injetado, porque é a
 * regra que impede a mistura de perfis — e regra dessas se testa.
 */

/** O mínimo que se espera do localStorage. Injetado para o teste não precisar de navegador. */
export interface DepositoLocal {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
}

const BASE = 'lbw_user_profile';
const BASE_SINCRONISMO = 'lbw_user_profile_cloud_synced';

export const chaveDoPerfil = (uid: string) => `${BASE}:${uid}`;
export const chaveDoSincronismo = (uid: string) => `${BASE_SINCRONISMO}:${uid}`;

/**
 * Decide o destino do registro antigo, da época da chave única.
 *
 * Ele pertence a quem salvou por último. Se for do usuário de agora (o e-mail bate),
 * passa para a gaveta dele. Se não for, é DESCARTADO — dado de outra pessoa não pode
 * seguir no navegador esperando a próxima vítima. Nos dois casos a chave antiga sai,
 * então isto roda uma vez e nunca mais.
 */
export function cuidarDoRegistroAntigo(
  deposito: DepositoLocal,
  uid: string,
  email: string,
): 'migrado' | 'descartado' | 'nada' {
  let destino: 'migrado' | 'descartado' | 'nada' = 'nada';
  try {
    const antigo = deposito.getItem(BASE);
    if (antigo) {
      const dono = String(JSON.parse(antigo)?.email || '').trim().toLowerCase();
      const atual = String(email || '').trim().toLowerCase();
      const ehDoUsuarioDeAgora = Boolean(dono) && Boolean(atual) && dono === atual;
      if (ehDoUsuarioDeAgora && !deposito.getItem(chaveDoPerfil(uid))) {
        deposito.setItem(chaveDoPerfil(uid), antigo);
        if (deposito.getItem(BASE_SINCRONISMO) === '1') {
          deposito.setItem(chaveDoSincronismo(uid), '1');
        }
        destino = 'migrado';
      } else {
        destino = 'descartado';
      }
    }
  } catch {
    // JSON estragado também é registro para descartar.
    destino = 'descartado';
  }
  deposito.removeItem(BASE);
  deposito.removeItem(BASE_SINCRONISMO);
  return destino;
}

/** O perfil do usuário, ou null quando ele nunca salvou nada neste navegador. */
export function lerPerfilLocal<T>(deposito: DepositoLocal, uid: string): T | null {
  try {
    const salvo = deposito.getItem(chaveDoPerfil(uid));
    return salvo ? (JSON.parse(salvo) as T) : null;
  } catch {
    return null;
  }
}

/** Grava o perfil na gaveta do usuário. Sem uid não grava: perfil sem dono é o que vazava. */
export function gravarPerfilLocal(deposito: DepositoLocal, uid: string | undefined, perfil: unknown): void {
  if (!uid) return;
  deposito.setItem(chaveDoPerfil(uid), JSON.stringify(perfil));
}

export function jaSincronizou(deposito: DepositoLocal, uid: string): boolean {
  return deposito.getItem(chaveDoSincronismo(uid)) === '1';
}

export function marcarSincronizado(deposito: DepositoLocal, uid: string): void {
  deposito.setItem(chaveDoSincronismo(uid), '1');
}
