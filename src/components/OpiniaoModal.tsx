/**
 * OpiniaoModal — pop-up de depoimento OBRIGATÓRIO depois da aprovação.
 *
 * Mostra: nome do aluno, o curso que está concluindo, uma lista de itens com
 * rating 1-5 estrelas cada, um campo de comentário e um checkbox de autorização
 * para divulgar nas redes. Só libera a prova depois de todas as notas preenchidas.
 */

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Star, Heart, Loader2 } from 'lucide-react';
import { getOpiniaoConfig, salvarOpiniao } from '../services/opiniaoService';
import { useConsultor } from '../contexts/ConsultorContext';

const LBW = { navy: '#1E2D6E', blue: '#0033CC' };

export default function OpiniaoModal({
  uid, alunoNome, alunoEmail, trilha, trilhaTitulo, initiativeId, onDone, onCancel, obrigatorioSemSaida = false,
}: {
  uid: string;
  alunoNome: string;
  alunoEmail: string;
  trilha: number;
  trilhaTitulo: string;
  initiativeId?: string;
  /** Chamado após salvar com sucesso — segue para a emissão do certificado. */
  onDone: () => void;
  onCancel: () => void;
  /** Trilha 1 do aluno gratuito: depoimento obrigatório, sem botão de pular. */
  obrigatorioSemSaida?: boolean;
}) {
  const [itens, setItens] = useState<string[]>([]);
  const [perguntaAberta, setPerguntaAberta] = useState('Como foi sua experiência com este curso e com a plataforma LBW?');
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [hover, setHover] = useState<Record<string, number>>({});
  const [comentario, setComentario] = useState('');
  const [autoriza, setAutoriza] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false); // mostra tela de agradecimento
  const { consultor } = useConsultor();
  const nomeMarca = consultor.branding.nome || 'a plataforma';

  useEffect(() => {
    getOpiniaoConfig().then((config) => {
      setItens(config.itens);
      setPerguntaAberta(config.perguntaAberta);
    }).finally(() => setLoading(false));
  }, []);

  // Depois do agradecimento, redireciona para a prova.
  useEffect(() => {
    if (!enviado) return;
    const t = setTimeout(() => onDone(), 2600);
    return () => clearTimeout(t);
  }, [enviado, onDone]);

  const todasPreenchidas = itens.length > 0 && itens.every((it) => (notas[it] ?? 0) >= 1);

  const handleEnviar = async () => {
    if (!todasPreenchidas || !comentario.trim()) {
      setErro(!todasPreenchidas
        ? 'Por favor, dê uma nota para cada item antes de continuar. 🙏'
        : 'Responda à pergunta aberta antes de continuar.');
      return;
    }
    setSaving(true); setErro('');
    try {
      await salvarOpiniao({
        uid, alunoNome, alunoEmail, trilha, trilhaTitulo, initiativeId,
        notas: itens.map((item) => ({ item, nota: notas[item] })),
        comentario: comentario.trim(),
        autorizaDivulgacao: autoriza,
      });
    } catch (e) {
      console.error('[OpiniaoModal] salvar:', e);
      setErro('Não foi possível salvar seu depoimento. Verifique sua conexão e tente novamente.');
      return;
    } finally {
      setSaving(false);
    }
    setEnviado(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8 overflow-hidden"
      >
        {enviado ? (
          /* Tela de agradecimento — some sozinha e redireciona para a prova */
          <div className="px-6 py-12 text-center">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
              className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center bg-emerald-100">
              <Heart size={40} className="fill-emerald-500 text-emerald-500" />
            </motion.div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Muito obrigado, {alunoNome.split(' ')[0]}! 🙏</h2>
            <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">
              Seu depoimento foi registrado. Agora o sistema poderá liberar seu certificado.
            </p>
            <p className="text-gray-500 text-sm mt-4 flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              Estamos finalizando seu certificado…
            </p>
          </div>
        ) : (
        <>
        {/* Cabeçalho */}
        <div className="px-6 pt-6 pb-4 text-center border-b border-gray-100">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(0,51,204,.1)' }}>
            <Heart size={26} style={{ color: LBW.blue }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Parabéns pela aprovação, {alunoNome.split(' ')[0]} 💙</h2>
          <p className="text-gray-500 text-sm mt-1 leading-relaxed">
            Você foi aprovado no curso <b style={{ color: LBW.navy }}>{trilhaTitulo}</b>.
            Responda ao depoimento abaixo para liberar a emissão do seu certificado.
          </p>
          {obrigatorioSemSaida && (
            <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mt-3 leading-relaxed">
              O depoimento é obrigatório para concluir a emissão do certificado. 💙
            </p>
          )}
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
                <label className="text-sm font-bold text-gray-700">{perguntaAberta}</label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                  placeholder="Escreva sua resposta…"
                  className="mt-1 w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Autorização */}
              <label className="mt-3 flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={autoriza} onChange={(e) => setAutoriza(e.target.checked)}
                  className="mt-0.5 w-4 h-4 shrink-0" style={{ accentColor: LBW.blue }} />
                <span className="text-xs text-gray-600 leading-relaxed">
                  Autorizo {nomeMarca} a divulgar meu depoimento (com meu primeiro nome)
                  nas redes sociais e materiais de divulgação.
                </span>
              </label>

              {erro && <p className="text-red-500 text-sm mt-3 font-semibold">{erro}</p>}
            </>
          )}
        </div>

        {/* Rodapé */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
          {!obrigatorioSemSaida && (
            <button onClick={onCancel} className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm">
              Agora não
            </button>
          )}
          <button
            onClick={handleEnviar}
            disabled={saving || !todasPreenchidas}
            className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: LBW.blue }}
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Enviando…</> : 'Enviar depoimento e liberar certificado →'}
          </button>
        </div>
        </>
        )}
      </motion.div>
    </div>
  );
}
