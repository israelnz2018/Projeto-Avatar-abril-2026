/**
 * WhiteLabelSetup — ferramenta admin (uma vez) da Fase 0 do multi-tenant.
 *
 * Faz, com segurança e na ordem:
 *   1. BACKUP  — baixa um JSON com todas as coleções tocadas (ponto de retorno).
 *   2. SIMULAR — dry-run: conta quantos docs receberiam consultorId (não escreve).
 *   3. MIGRAR  — cria `consultores/israel` e carimba consultorId='israel' em todo
 *                doc que não tem. Idempotente (rodar 2x não duplica).
 *
 * Só o admin acessa. A migração fica travada até o backup ser baixado.
 * Ver PLANO-WHITELABEL.md.
 */
import React, { useState } from 'react';
import { collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useUserAccess } from '../hooks/useUserAccess';
import { CONSULTOR_PADRAO } from '../services/consultorService';

// Coleções que ganham `consultorId` (e que entram no backup).
const COLECOES = ['users', 'projects', 'initiatives', 'initiative_configs', 'knowledge_base', 'courses', 'playlists'];

export default function WhiteLabelSetup() {
  const { isAdmin, loading } = useUserAccess();
  const [log, setLog] = useState<string[]>([]);
  const [backupFeito, setBackupFeito] = useState(false);
  const [rodando, setRodando] = useState(false);

  const add = (m: string) => setLog((l) => [...l, m]);

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin) return <div className="p-8 text-red-600 font-bold">Acesso restrito ao administrador.</div>;

  async function baixarBackup() {
    setRodando(true);
    setLog([]);
    try {
      add('Lendo coleções…');
      const dump: Record<string, any[]> = {};
      for (const nome of COLECOES) {
        const snap = await getDocs(collection(db, nome));
        dump[nome] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        add(`• ${nome}: ${dump[nome].length} docs`);
      }
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-lbw-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setBackupFeito(true);
      add('✅ Backup baixado. Guarde o arquivo em lugar seguro.');
    } catch (e: any) {
      add('❌ Erro no backup: ' + (e?.message || e));
    } finally {
      setRodando(false);
    }
  }

  async function simular() {
    setRodando(true);
    try {
      add('— Simulação (não escreve nada) —');
      for (const nome of COLECOES) {
        const snap = await getDocs(collection(db, nome));
        const faltando = snap.docs.filter((d) => !(d.data() as any).consultorId).length;
        add(`• ${nome}: ${faltando} de ${snap.size} receberiam consultorId`);
      }
      const cons = await getDoc(doc(db, 'consultores', 'israel'));
      add(cons.exists() ? '• consultores/israel: já existe' : '• consultores/israel: será criado');
      add('— Fim da simulação —');
    } catch (e: any) {
      add('❌ Erro: ' + (e?.message || e));
    } finally {
      setRodando(false);
    }
  }

  async function rodarMigracao() {
    if (!backupFeito) {
      add('⚠️ Baixe o backup primeiro (passo 1).');
      return;
    }
    if (!window.confirm('Rodar a migração?\n\nVai criar consultores/israel e carimbar consultorId=israel em todo dado que ainda não tem. É reversível (você tem o backup) e idempotente.')) return;
    setRodando(true);
    try {
      add('Criando consultores/israel…');
      await setDoc(
        doc(db, 'consultores', 'israel'),
        { ...CONSULTOR_PADRAO, criadoEm: CONSULTOR_PADRAO.criadoEm || new Date().toISOString() },
        { merge: true }
      );
      add('✅ consultores/israel pronto.');
      for (const nome of COLECOES) {
        const snap = await getDocs(collection(db, nome));
        let carimbados = 0;
        for (const d of snap.docs) {
          if (!(d.data() as any).consultorId) {
            await setDoc(d.ref, { consultorId: 'israel' }, { merge: true });
            carimbados++;
          }
        }
        add(`• ${nome}: ${carimbados} carimbados (${snap.size} total)`);
      }
      add('✅ Migração concluída. Você agora é o consultor #0.');
    } catch (e: any) {
      add('❌ Erro na migração: ' + (e?.message || e));
    } finally {
      setRodando(false);
    }
  }

  const btn = 'px-5 py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">White-Label · Setup (Fase 0)</h1>
      <p className="text-gray-500 text-sm mb-6">
        Ferramenta única pra iniciar a migração multi-consultor. Faça na ordem. Nada é escrito antes do passo 3.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-900">
        <b>⚠️ Ordem obrigatória:</b> primeiro <b>baixe o backup</b> (passo 1). A migração (passo 3) só libera depois disso.
        A migração só <b>adiciona</b> um campo (<code>consultorId</code>) — não apaga nem sobrescreve nada, e pode rodar 2x sem problema.
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button onClick={baixarBackup} disabled={rodando} className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}>
          1. Baixar backup (JSON)
        </button>
        <button onClick={simular} disabled={rodando} className={`${btn} bg-gray-200 text-gray-800 hover:bg-gray-300`}>
          2. Simular (dry-run)
        </button>
        <button onClick={rodarMigracao} disabled={rodando || !backupFeito} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}>
          3. Rodar migração
        </button>
      </div>

      <div className="bg-gray-900 text-gray-100 rounded-xl p-4 font-mono text-xs min-h-[160px] whitespace-pre-wrap">
        {log.length === 0 ? <span className="text-gray-500">O log das operações aparece aqui…</span> : log.join('\n')}
        {rodando && <div className="text-amber-300 mt-2">⏳ processando…</div>}
      </div>
    </div>
  );
}
