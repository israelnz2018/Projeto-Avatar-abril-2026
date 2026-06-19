import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getInitiatives, getInitiativeConfigs } from '../services/configService';
import type { TipoUsuario } from '../services/userService';

type Plano = 'gratuito' | 'completo';

export function useUserAccess() {
  const [loading, setLoading] = useState(true);
  const [plano, setPlano] = useState<Plano>('gratuito');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoordenador, setIsCoordenador] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>('aluno');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [freeToolIds, setFreeToolIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        let userPlano: Plano = 'gratuito';
        let admin = false;
        let coord = false;
        let tipo: TipoUsuario = 'aluno';
        let empId: string | null = null;
        let empNome: string | null = null;
        if (userSnap.exists()) {
          const data = userSnap.data();
          // Marca o 1º acesso (1x só) — pra saber quem dos convidados já entrou.
          if (!data.primeiroAcessoEm) {
            setDoc(userRef, { primeiroAcessoEm: new Date().toISOString() }, { merge: true }).catch(() => {});
          }
          // SÓ aceita tipoUsuario com valor válido. Não fazemos fallback pra `role`
          // porque docs antigos/inconsistentes (do n8n ou de testes) podem ter
          // `role: "user"`, `role: "admin"`, etc. e isso bagunçava permissões.
          const rawTipo = data.tipoUsuario;
          tipo = (rawTipo === 'admin' || rawTipo === 'coordenador' || rawTipo === 'aluno')
            ? rawTipo
            : 'aluno';
          admin = tipo === 'admin';
          coord = tipo === 'coordenador';
          empId = data.empresaId || null;
          empNome = data.empresaNome || null;
          // Acesso completo pode ter validade (acessoCompletoAte). Se a data já
          // passou, o "completo" expira e o usuário volta a gratuito.
          // Sem o campo = completo sem validade (admin, casos antigos): não quebra.
          const completoValido = (() => {
            const ate = data.acessoCompletoAte;
            if (!ate) return true; // sem validade definida
            const dt = new Date(ate);
            if (isNaN(dt.getTime())) return true; // data inválida: não bloqueia
            return dt.getTime() > Date.now();
          })();
          if (data.plano === 'completo' && completoValido) {
            userPlano = 'completo';
          } else if (data.plano === 'completo' && !completoValido) {
            userPlano = 'gratuito'; // acesso expirou
          } else if (Array.isArray(data.formacoes) && data.formacoes.length > 0) {
            const temAvancada = data.formacoes.some(
              (f: string) => !f.includes('introdutoria') && !f.includes('gratuito')
            );
            userPlano = temAvancada ? 'completo' : 'gratuito';
          }
        }
        setPlano(userPlano);
        setIsAdmin(admin);
        setIsCoordenador(coord);
        setTipoUsuario(tipo);
        setEmpresaId(empId);
        setEmpresaNome(empNome);
        const initiatives = await getInitiatives();
        const freeInitiatives = initiatives.filter(i => i.isFree === true);
        const toolIdsSet = new Set<string>();
        for (const initiative of freeInitiatives) {
          const configs = await getInitiativeConfigs(initiative.id);
          configs.forEach(config => {
            if (config.toolIds && Array.isArray(config.toolIds)) {
              config.toolIds.forEach(id => toolIdsSet.add(id));
            }
          });
        }
        setFreeToolIds(toolIdsSet);
      } catch (error) {
        console.error('Erro ao verificar acesso do usuário:', error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const canUseTool = (toolId: string) => {
    if (isAdmin) return true;
    if (plano === 'completo') return true;
    return freeToolIds.has(toolId);
  };

  const canUseInitiative = (initiativeId: string, initiatives: any[]) => {
    if (isAdmin) return true;
    if (plano === 'completo') return true;
    const initiative = initiatives.find(i => i.id === initiativeId);
    return initiative?.isFree === true;
  };

  return {
    loading,
    plano,
    isAdmin,
    isCoordenador,
    tipoUsuario,
    empresaId,
    empresaNome,
    freeToolIds,
    canUseTool,
    canUseInitiative,
  };
}
