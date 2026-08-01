/**
 * MarcaDoTime — o COORDENADOR escolhe a marca do PPT da turma dele:
 *   (a) usar o PPT do consultor (herda tudo), ou
 *   (b) usar o PPT dele — sigla + 3 cores próprias.
 * Salva no doc do coordenador (users/{uid}). O Layout resolve o override quando
 * o coordenador ou um aluno do time dele exporta um PPT. Ver PLANO-WHITELABEL.md.
 */
import React, { useEffect, useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { Palette } from 'lucide-react';
import { db, auth } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';

const comHash = (c?: string) => (c ? (c.startsWith('#') ? c : `#${c}`) : '');

export default function MarcaDoTime() {
  const { consultor, consultorId } = useConsultor();
  const { isCoordenador, loading, empresaId, pptFonte, siglaPpt, pptCores } = useUserAccess();

  const [fonte, setFonte] = useState<'consultor' | 'proprio'>('consultor');
  const [sigla, setSigla] = useState('');
  const [corEscura, setCorEscura] = useState('#1E2D6E');
  const [corDestaque, setCorDestaque] = useState('#0033CC');
  const [corClara, setCorClara] = useState('#F0F2FA');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setFonte(pptFonte === 'proprio' ? 'proprio' : 'consultor');
    setSigla(siglaPpt || '');
    setCorEscura(comHash(pptCores?.navy) || '#1E2D6E');
    setCorDestaque(comHash(pptCores?.blue) || '#0033CC');
    setCorClara(comHash(pptCores?.light) || '#F0F2FA');
  }, [pptFonte, siglaPpt, pptCores]);

  if (loading) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isCoordenador) return <div className="p-8 text-red-600 font-bold">Só o coordenador edita a marca do time.</div>;

  async function salvar() {
    setSalvando(true);
    setMsg('');
    try {
      if (!auth.currentUser?.uid) throw new Error('Sessão expirada.');
      if (!empresaId) throw new Error('Sua conta ainda não está vinculada a uma empresa/time.');
      await setDoc(
        doc(db, 'team_branding', empresaId),
        {
          empresaId,
          consultorId,
          pptFonte: fonte,
          siglaPpt: fonte === 'proprio' ? sigla.trim().toUpperCase().slice(0, 7) : '',
          coresPpt: fonte === 'proprio' ? { navy: corEscura, blue: corDestaque, light: corClara } : null,
        },
        { merge: true }
      );
      setMsg('✅ Marca do time salva. Os PPTs da sua turma já usam essa marca.');
    } catch (e: any) {
      setMsg('❌ ' + (e?.message || e));
    } finally {
      setSalvando(false);
    }
  }

  const marcaConsultor = consultor.branding.sigla || (consultor.branding.nome || '').split(' ')[0] || 'LBW';

  return (
    <div className="max-w-2xl mx-auto pb-12">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Marca do time (PPT)</h1>
      <p className="text-gray-500 text-sm mb-6">
        Escolha como os slides que a <b>sua turma</b> exporta vão assinar a marca.
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        {/* Opção 1 — herdar do consultor */}
        <label className={`block border rounded-xl p-4 cursor-pointer transition-colors ${fonte === 'consultor' ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 hover:border-gray-300'}`}>
          <div className="flex items-center gap-2">
            <input type="radio" name="fonte" checked={fonte === 'consultor'} onChange={() => setFonte('consultor')} />
            <span className="font-bold text-gray-800 text-sm">Usar o PPT do consultor</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">
            Herda a marca e as cores do consultor (sigla <b>“{marcaConsultor}”</b>). Nada pra configurar.
          </p>
        </label>

        {/* Opção 2 — próprio */}
        <label className={`block border rounded-xl p-4 cursor-pointer transition-colors ${fonte === 'proprio' ? 'border-blue-500 bg-blue-50/40' : 'border-gray-200 hover:border-gray-300'}`}>
          <div className="flex items-center gap-2">
            <input type="radio" name="fonte" checked={fonte === 'proprio'} onChange={() => setFonte('proprio')} />
            <span className="font-bold text-gray-800 text-sm">Usar o meu próprio PPT</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 ml-6">A marca da sua turma: uma sigla e 3 cores próprias.</p>
          {fonte === 'proprio' && (
            <div className="ml-6 mt-3 space-y-4">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wide text-gray-500 mb-1">Sigla (até 7 letras)</div>
                <input
                  value={sigla}
                  onChange={(e) => setSigla(e.target.value.toUpperCase().slice(0, 7))}
                  placeholder="Ex.: FAB-A"
                  className="w-40 border border-gray-300 rounded-lg px-3 py-2.5 text-sm uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Aparece no topo de cada slide que a turma exporta.</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <CorPicker rotulo="Escura (cabeçalho)" valor={corEscura} onChange={setCorEscura} />
                <CorPicker rotulo="Destaque (chips/linhas)" valor={corDestaque} onChange={setCorDestaque} />
                <CorPicker rotulo="Clara (painéis)" valor={corClara} onChange={setCorClara} />
              </div>
            </div>
          )}
        </label>

        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={salvar}
            disabled={salvando}
            className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            {salvando ? 'Salvando…' : 'Salvar marca do time'}
          </button>
          {msg && <span className="text-sm text-gray-600">{msg}</span>}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Logo e template próprios do time entram num próximo passo — por ora, a marca do time é sigla + cores.
      </p>
    </div>
  );
}

function CorPicker({ rotulo, valor, onChange }: { rotulo: string; valor: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-gray-500 mb-1">{rotulo}</div>
      <div className="flex items-center gap-2">
        <input type="color" value={valor} onChange={(e) => onChange(e.target.value)} className="h-9 w-9 rounded border border-gray-300 cursor-pointer bg-white" />
        <span className="text-xs text-gray-500 uppercase" style={{ fontVariantNumeric: 'tabular-nums' }}>{valor}</span>
      </div>
    </div>
  );
}
