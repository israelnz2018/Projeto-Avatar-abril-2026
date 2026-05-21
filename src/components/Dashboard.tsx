/**
 * Dashboard — roteador por perfil de usuário.
 *
 * Decide qual dashboard renderizar usando os 4 sinais do useUserAccess:
 *   - isAdmin       → DashboardAdmin
 *   - isCoordenador → DashboardCoordenador
 *   - plano = completo → DashboardAlunoPago
 *   - default       → DashboardAlunoGratuito
 *
 * Cada perfil é um arquivo separado em ./dashboard/. Aqui só decide e injeta o nome.
 */

import React, { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useUserAccess } from '../hooks/useUserAccess';
import { getUserData } from '../services/userService';
import { DashboardLoading } from './dashboard/_shared';
import DashboardAlunoGratuito from './dashboard/DashboardAlunoGratuito';
import DashboardAlunoPago from './dashboard/DashboardAlunoPago';
import DashboardCoordenador from './dashboard/DashboardCoordenador';
import DashboardAdmin from './dashboard/DashboardAdmin';

export default function Dashboard() {
  const { loading, isAdmin, isCoordenador, plano } = useUserAccess();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    // Busca nome do doc Firestore; se não tiver, usa displayName ou parte do e-mail.
    getUserData(u.uid).then(data => {
      const fromDoc = data?.nome;
      const fromAuth = u.displayName;
      const fromEmail = u.email?.split('@')[0];
      setNome(fromDoc || fromAuth || fromEmail || null);
    }).catch(() => {
      setNome(auth.currentUser?.displayName || null);
    });
  }, []);

  if (loading) return <DashboardLoading label="Identificando seu perfil…" />;

  if (isAdmin) return <DashboardAdmin nome={nome} />;
  if (isCoordenador) return <DashboardCoordenador nome={nome} />;
  if (plano === 'completo') return <DashboardAlunoPago nome={nome} />;
  return <DashboardAlunoGratuito nome={nome} />;
}
