/**
 * ConsultorContext — provê o "consultor" (tenant) atual pra todo o app.
 *
 * Resolve o consultorId pelo subdomínio (ex.: israel.educacaopelotrabalho.com →
 * 'israel') e carrega a marca dele. Enquanto o doc não existir no Firestore,
 * cai no CONSULTOR_PADRAO (marca LBW). Ver PLANO-WHITELABEL.md.
 *
 * `refresh()` recarrega a marca do Firestore — usado depois que o consultor
 * edita a própria marca (Minha Marca) pra o app re-vestir ao vivo.
 */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { Consultor } from '../types';
import { CONSULTOR_PADRAO, getConsultor, resolveConsultorId, nomeMentorDe, setMentorNome } from '../services/consultorService';
import { auth, db } from '../lib/firebase';

interface ConsultorContextValue {
  consultor: Consultor;
  consultorId: string;
  loading: boolean;
  refresh: () => Promise<void>;
}

const ConsultorContext = createContext<ConsultorContextValue>({
  consultor: CONSULTOR_PADRAO,
  consultorId: 'israel',
  loading: true,
  refresh: async () => {},
});

export function ConsultorProvider({ children }: { children: React.ReactNode }) {
  const consultorIdDoEndereco = resolveConsultorId();
  const [consultorId, setConsultorId] = useState(consultorIdDoEndereco);
  const [consultor, setConsultor] = useState<Consultor>({ ...CONSULTOR_PADRAO, id: consultorId });
  const [loading, setLoading] = useState(true);

  // Depois do login, a fonte de verdade é o consultorId do perfil. Assim um
  // consultor que entrou por outro subdomínio nunca tenta editar a marca alheia.
  useEffect(() => auth.onAuthStateChanged(async (usuario) => {
    if (!usuario) {
      setConsultorId(consultorIdDoEndereco);
      return;
    }
    try {
      const perfil = await getDoc(doc(db, 'users', usuario.uid));
      const idDoPerfil = perfil.exists() ? perfil.data().consultorId : null;
      setConsultorId(typeof idDoPerfil === 'string' && idDoPerfil.trim() ? idDoPerfil.trim() : consultorIdDoEndereco);
    } catch {
      setConsultorId(consultorIdDoEndereco);
    }
  }), [consultorIdDoEndereco]);

  const refresh = useCallback(async () => {
    const c = await getConsultor(consultorId);
    setConsultor(c);
  }, [consultorId]);

  useEffect(() => {
    let ativo = true;
    getConsultor(consultorId)
      .then((c) => { if (ativo) setConsultor(c); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [consultorId]);

  // Mentor de IA "Fulano digital": nome do mentor = o do consultor atual.
  // (A sigla E as cores do PPT são setadas no Layout, pra o coordenador poder
  // sobrepor com a marca do time dele — lá tem consultor + papel do usuário juntos.)
  useEffect(() => {
    setMentorNome(nomeMentorDe(consultor));
  }, [consultor]);

  return (
    <ConsultorContext.Provider value={{ consultor, consultorId, loading, refresh }}>
      {children}
    </ConsultorContext.Provider>
  );
}

export function useConsultor() {
  return useContext(ConsultorContext);
}
