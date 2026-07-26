/**
 * ConsultorContext — provê o "consultor" (tenant) atual pra todo o app.
 *
 * Resolve o consultorId pelo subdomínio (ex.: israel.educacaopelotrabalho.com →
 * 'israel') e carrega a marca dele. Enquanto o doc não existir no Firestore,
 * cai no CONSULTOR_PADRAO (marca LBW) — nada muda. Ver PLANO-WHITELABEL.md.
 *
 * Fase 0: existe mas ainda não é consumido pela UI. A Fase 1 (branding por
 * config) passa a ler `useConsultor().consultor.branding` no lugar dos valores
 * LBW hardcoded.
 */
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Consultor } from '../types';
import { CONSULTOR_PADRAO, getConsultor, resolveConsultorId } from '../services/consultorService';

interface ConsultorContextValue {
  consultor: Consultor;
  consultorId: string;
  loading: boolean;
}

const ConsultorContext = createContext<ConsultorContextValue>({
  consultor: CONSULTOR_PADRAO,
  consultorId: 'israel',
  loading: true,
});

export function ConsultorProvider({ children }: { children: React.ReactNode }) {
  const consultorId = resolveConsultorId();
  const [consultor, setConsultor] = useState<Consultor>({ ...CONSULTOR_PADRAO, id: consultorId });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    getConsultor(consultorId)
      .then((c) => { if (ativo) setConsultor(c); })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [consultorId]);

  return (
    <ConsultorContext.Provider value={{ consultor, consultorId, loading }}>
      {children}
    </ConsultorContext.Provider>
  );
}

export function useConsultor() {
  return useContext(ConsultorContext);
}
