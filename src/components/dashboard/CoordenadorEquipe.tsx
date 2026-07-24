/**
 * CoordenadorEquipe — a aba "Minha Equipe" (rota /equipe).
 *
 * É a tela dedicada do coordenador: renderiza o painel do time (super-relatório
 * + convidar/gerenciar membros). Cada coordenador vê SÓ os dados do seu time
 * (vínculo por empresaId, dentro do DashboardCoordenador).
 */
import React, { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { getUserData } from '../../services/userService';
import DashboardCoordenador from './DashboardCoordenador';

export default function CoordenadorEquipe() {
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    getUserData(u.uid)
      .then((d) => setNome(d?.nome || u.displayName || u.email?.split('@')[0] || null))
      .catch(() => setNome(auth.currentUser?.displayName || null));
  }, []);

  return <DashboardCoordenador nome={nome} />;
}
