import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getInitiatives, getInitiativeConfigs } from '../services/configService';

type Plano = 'gratuito' | 'completo';

export function useUserAccess() {
  const [loading, setLoading] = useState(true);
  const [plano, setPlano] = useState<Plano>('gratuito');
  const [isAdmin, setIsAdmin] = useState(false);
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
        if (userSnap.exists()) {
          const data = userSnap.data();
          admin = data.tipoUsuario === 'admin' || data.role === 'admin';
          if (data.plano === 'completo') {
            userPlano = 'completo';
          } else if (Array.isArray(data.formacoes) && data.formacoes.length > 0) {
            const temAvancada = data.formacoes.some(
              (f: string) => !f.includes('introdutoria') && !f.includes('gratuito')
            );
            userPlano = temAvancada ? 'completo' : 'gratuito';
          }
        }
        setPlano(userPlano);
        setIsAdmin(admin);
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

  return { loading, plano, isAdmin, freeToolIds, canUseTool, canUseInitiative };
}
