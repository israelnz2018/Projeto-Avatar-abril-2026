import React, { useEffect, useState } from 'react';
import { auth } from '../../lib/firebase';
import { getUserData } from '../../services/userService';
import { useUserAccess } from '../../hooks/useUserAccess';
import DashboardCoordenador from './DashboardCoordenador';

export default function CoordenadorReport() {
  const { isCoordenador, loading } = useUserAccess();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    getUserData(u.uid)
      .then((d) => setNome(d?.nome || u.displayName || u.email?.split('@')[0] || null))
      .catch(() => setNome(auth.currentUser?.displayName || null));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isCoordenador) return <div className="p-8 text-red-600 font-bold">Este relatório mostra somente os dados do time do coordenador.</div>;
  return <DashboardCoordenador nome={nome} modo="report" />;
}
