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
import { Consultor } from '../types';
import { CONSULTOR_PADRAO, getConsultor, resolveConsultorId, nomeMentorDe, setMentorNome } from '../services/consultorService';
import { setSlideBrand } from '../services/slideTemplate';

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
  const consultorId = resolveConsultorId();
  const [consultor, setConsultor] = useState<Consultor>({ ...CONSULTOR_PADRAO, id: consultorId });
  const [loading, setLoading] = useState(true);

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

  // White-label do PPT + mentor: a marca (sigla) vai pro cabeçalho dos slides e o
  // nome do mentor de IA passa a ser o do consultor ("Fulano digital").
  useEffect(() => {
    setSlideBrand(consultor.branding.sigla || (consultor.branding.nome || '').split(' ')[0] || 'LBW');
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
