/**
 * OpiniaoModal — pop-up de depoimento OBRIGATÓRIO (e educado) antes da prova.
 *
 * Mostra: nome do aluno, a trilha que está concluindo, uma lista de itens com
 * rating 1-5 estrelas cada, um campo de comentário e um checkbox de autorização
 * para divulgar nas redes. Só libera a prova depois de todas as notas preenchidas.
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Star, Heart, Loader2 } from 'lucide-react';
import { getOpiniaoItens, salvarOpiniao } from '../services/opiniaoService';

const LBW = { navy: '#1E2D6E', blue: '#0033CC' };

export default function OpiniaoModal({
  uid, alunoNome, alunoEmail, trilha, trilhaTitulo, onDone, onCancel,
}: {
  uid: string;
  alunoNome: string;
  alunoEmail: string;
  trilha: number;
  trilhaTitulo: string;
  /** Chamado após salvar com sucesso — segue para a prova. */
  onDone: () => void;
  onCancel: () => void;
}) {
  const [itens, setItens] = useState<string[]>([]);
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [hover, setHover] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState('');
  const [autoriza, setAutoriza] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    getOpiniaoItens().then(setItens).finally(() => setLoading(false));
  }, []);

  const todasPreenchidas = itens.length > 0 && itens.every((it) => (notas[it] ?? 0) >= 1);

  const handleEnviar = async () => {
    if (!todasPreenchidas) {
      setErro('Por favor, dê uma nota para cada item antes de continuar. 🙏');
      return;
    }
    setSaving(true); setErro('');
    try {
      await salvarOpiniao({
        uid, alunoNome, alunoEmail, trilha, trilhaTitulo,
        notas: itens.map((item) => ({ item, nota: notas[item] })),
        comentario: comentario.trim(),
        autorizaDivulgacao: autoriza,
      });
      onDone();
    } catch (e) {
      console.error('[OpiniaoModal] salvar:', e);
      // Não trava o aluno se o Firestore falhar — segue para a prova.
      onDone();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden"
      >
        {/* Cabeçalho */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-gray-100">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(0,51,204,.1)' }}>
            <Heart size={26} style={{ color: LBW.blue }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Antes de começar, {alunoNome.split(' ')[0]} 💙</h2>
          <p className="text-gray-500 text-sm mt-1 leading-relaxed">
            Você está concluindo a trilha <b style={{ color: LBW.navy }}>{trilhaTitulo}</b>.
            Sua opinião sincera nos ajuda muito a melhorar. Leva menos de 1 minuto — e é o que
            nos permite continuar evoluindo por você.
          </p>
        </div>

        {/* Corpo */}
        <div className="px-6 py-5 max-h-[52vh] overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-gray-400">Carregando…</div>
          ) : (
            <>
              <div className="space-y-3">
                {itens.map((item) => (
                  <div key={item} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-gray-700 flex-1">{item}</span>
                    <div className="flex gap-0.5 shrink-0" onMouseLeave={() => setHover((h) => ({ ...h, [item]: 0 }))}>
                      {[1, 2, 3, 4, 5].map((n) => {
                        const active = n <= (hover[item] || notas[item] || 0);
                        return (
                          <button
                            key={n}
                            onMouseEnter={() => setHover((h) => ({ ...h, [item]: n }))}
                            onClick={() => setNotas((s) => ({ ...s, [item]: n }))}
                            className="p-0.5"
                            title={`${n} ${n === 1 ? '(péssimo)' : n === 5 ? '(ótimo)' : ''}`}
                          >
                            <Star size={22} className={active ? 'fill-amber-400 text-amber-400' : 'text-gray-300'} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400 mt-1 text-right">1 = péssimo · 5 = ótimo</p>

              {/* Comentário */}
              <div className="mt-5">
                <label className="text-sm font-bold text-gray-700">Deixe seu depoimento (opcional)</label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                  placeholder="Conte como foi sua experiência com o curso e a plataforma…"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Autorização */}
              <label className="mt-3 flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0" style={{ accentColor: LBW.blue }} />
                <span className="text-xs text-gray-600 leading-relaxed">
                  Autorizo a Learning by Working a divulgar meu depoimento (com meu primeiro nome)
                  nas redes sociais e materiais de divulgação.
                </span>
              </label>

              {erro && <p className="text-red-500 text-sm mt-3 font-semibold">{erro}</p>}
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          <button onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm">
            Agora não
          </button>
          <button
            onClick={handleEnviar}
            disabled={saving || !todasPreenchidas}
            className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: LBW.blue }}
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : 'Enviar e começar a avaliação →'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
