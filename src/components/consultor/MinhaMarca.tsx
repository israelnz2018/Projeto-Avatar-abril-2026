/**
 * MinhaMarca — o consultor edita a própria marca (logo + nome).
 * Salva em consultores/{consultorId}.branding e o app re-veste ao vivo (refresh).
 *
 * Primeira tela da experiência do Consultor. Cores virão num passo próprio
 * (hoje as cores estão no Tailwind; precisam virar variáveis antes). Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';

export default function MinhaMarca() {
  const { consultor, consultorId, refresh } = useConsultor();
  const { isAdmin, isConsultor, loading } = useUserAccess();
  const [nome, setNome] = useState('');
  const [sigla, setSigla] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  // Pré-popula com a marca atual assim que carrega.
  useEffect(() => {
    setNome(consultor.branding.nome || '');
    setSigla(consultor.branding.sigla || '');
    setLogoUrl(consultor.branding.logoUrl || '');
  }, [consultor.branding.nome, consultor.branding.sigla, consultor.branding.logoUrl]);

  // Só o consultor (hoje = admin) edita a marca. Coordenador/aluno não.
  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Só o consultor edita a marca.</div>;

  async function salvar() {
    setSalvando(true);
    setMsg('');
    try {
      await setDoc(
        doc(db, 'consultores', consultorId),
        { branding: { ...consultor.branding, nome: nome.trim(), sigla: sigla.trim().toUpperCase().slice(0, 7), logoUrl: logoUrl.trim() } },
        { merge: true }
      );
      await refresh(); // re-veste o app ao vivo
      setMsg('✅ Marca salva. O app já atualizou.');
    } catch (e: any) {
      setMsg('❌ Erro ao salvar: ' + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Minha Marca</h1>
      <p className="text-gray-500 text-sm mb-6">
        A identidade do seu site (<b>{consultorId}.educacaopelotrabalho.com</b>). Salvou, o app re-veste na hora.
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-black uppercase tracking-wide text-gray-500 mb-1">Nome / marca</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Consultoria João Silva"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wide text-gray-500 mb-1">Sigla (aparece nos PPTs — até 7 letras)</label>
          <input
            value={sigla}
            onChange={(e) => setSigla(e.target.value.toUpperCase().slice(0, 7))}
            placeholder="Ex.: JSC"
            className="w-40 border border-gray-300 rounded-lg px-3 py-2.5 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-black uppercase tracking-wide text-gray-500 mb-1">URL do logo</label>
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://…/meu-logo.png"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-gray-400">Prévia:</span>
            {logoUrl ? (
              <img src={logoUrl} alt="Prévia do logo" className="h-12 w-auto border border-gray-100 rounded bg-gray-50 p-1" />
            ) : (
              <span className="text-xs text-gray-400 italic">sem logo</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {salvando ? 'Salvando…' : 'Salvar marca'}
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        As <b>cores</b> do site entram num próximo passo (hoje estão no estilo do app; precisam virar variáveis antes).
      </p>
    </div>
  );
}
