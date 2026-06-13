import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bug, Lightbulb, HelpCircle, Send, X, Loader2, CheckCircle2, Wrench, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FeedbackTipo } from '../../services/feedbackService';
import { criarPost } from '../../services/communityService';
import { cn } from '../../lib/utils';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  projetoAtivoNome?: string | null;
  /** Nome amigável da ferramenta aberta (se houver). Mostra "Você está em: X". */
  ferramentaAtual?: string | null;
}

const TIPOS: Array<{
  v: FeedbackTipo;
  label: string;
  icon: React.ElementType;
  iconClass: string;
  hint: string;
  placeholder: string;
}> = [
  {
    v: 'bug',
    label: 'Reportar bug',
    icon: Bug,
    iconClass: 'text-red-600 bg-red-50 border-red-200',
    hint: 'Algo não está funcionando como deveria.',
    placeholder: 'Descreva o que estava fazendo, o que esperava acontecer e o que aconteceu de fato.',
  },
  {
    v: 'sugestao',
    label: 'Sugerir melhoria',
    icon: Lightbulb,
    iconClass: 'text-amber-600 bg-amber-50 border-amber-200',
    hint: 'Tem uma ideia que tornaria a plataforma melhor?',
    placeholder: 'Conte sua ideia. Quanto mais específico, melhor.',
  },
  {
    v: 'duvida',
    label: 'Tirar dúvida',
    icon: HelpCircle,
    iconClass: 'text-blue-600 bg-blue-50 border-blue-200',
    hint: 'Pergunte e a comunidade (e o mentor) pode responder. As dúvidas mais comuns viram conteúdo do curso.',
    placeholder: 'Qual é a sua dúvida?',
  },
];

export default function FeedbackModal({
  isOpen,
  onClose,
  projetoAtivoNome,
  ferramentaAtual,
}: FeedbackModalProps) {
  const [tipo, setTipo] = useState<FeedbackTipo>('sugestao');
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const tipoConfig = TIPOS.find(t => t.v === tipo)!;

  const handleEnviar = async () => {
    if (descricao.trim().length < 5) {
      setErro('Descreva com pelo menos 5 caracteres.');
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      // Cria um post na Comunidade LBW (público). O tipo (bug/sugestão/dúvida)
      // é o mesmo da comunidade.
      await criarPost({
        tipo,
        texto: descricao,
        ferramenta: ferramentaAtual || null,
        projetoNome: projetoAtivoNome || null,
      });
      setEnviado(true);
      // Auto-fechar após 2s
      setTimeout(() => {
        handleFechar();
      }, 2000);
    } catch (err: any) {
      setErro(err?.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const handleFechar = () => {
    setTipo('sugestao');
    setDescricao('');
    setEnviado(false);
    setErro(null);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
        >
          {enviado ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">Recebido! 🎉</h3>
              <p className="text-sm text-gray-600">
                Publicado na aba <strong>Perguntas &amp; Respostas da Comunidade</strong>. Todos os alunos
                podem ver e responder.
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
                <h2 className="text-lg font-bold text-gray-800 m-0">Reportar / Sugerir / Perguntar</h2>
                <button
                  onClick={handleFechar}
                  className="p-1 hover:bg-gray-100 rounded-full border-none bg-transparent cursor-pointer text-gray-500"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Corpo rolável */}
              <div className="p-5 space-y-3 overflow-y-auto">
                {/* Ferramenta atual — deixa claro sobre o que ele está falando */}
                {ferramentaAtual && (
                  <div className="flex items-center gap-2 text-[12px] bg-blue-50 border border-blue-200 text-blue-800 rounded-[8px] px-3 py-2">
                    <Wrench size={14} className="shrink-0" />
                    <span>
                      Você está na ferramenta <strong>{ferramentaAtual}</strong>. Se sua mensagem for sobre
                      ela, mencione — assim fica claro pra todos.
                    </span>
                  </div>
                )}

                <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                  Tipo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TIPOS.map(t => {
                    const Icon = t.icon;
                    const selected = tipo === t.v;
                    return (
                      <button
                        key={t.v}
                        type="button"
                        onClick={() => setTipo(t.v)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3 border rounded-[8px] transition-all cursor-pointer',
                          selected
                            ? `${t.iconClass} ring-2 ring-offset-1 ring-current font-bold`
                            : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                        )}
                      >
                        <Icon size={20} />
                        <span className="text-[11px] leading-tight text-center">{t.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Hint do tipo selecionado */}
                <div className={cn('text-[12px] p-3 rounded-[6px] border', tipoConfig.iconClass)}>
                  {tipoConfig.hint}
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider block mb-1">
                    Descrição
                  </label>
                  <textarea
                    rows={5}
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    placeholder={tipoConfig.placeholder}
                    className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm resize-vertical focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    {descricao.length} caracteres
                  </p>
                </div>

                {/* Aviso de comunidade — vale pros 3 tipos */}
                <div className="flex items-start gap-2 text-[12px] bg-amber-50 border border-amber-200 text-amber-800 rounded-[8px] px-3 py-2.5 leading-relaxed">
                  <Users size={15} className="shrink-0 mt-0.5" />
                  <span>
                    Sua mensagem será publicada na aba <strong>Perguntas &amp; Respostas da Comunidade</strong>,
                    visível para todos os alunos, <strong>com o seu nome</strong>. Não inclua informações
                    confidenciais.
                  </span>
                </div>

                {erro && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-[4px] p-2">
                    {erro}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 flex justify-end gap-2 bg-gray-50 shrink-0">
                <button
                  onClick={handleFechar}
                  disabled={enviando}
                  className="px-4 py-2 rounded-[4px] text-sm font-bold bg-white border border-gray-300 cursor-pointer disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnviar}
                  disabled={enviando || descricao.trim().length < 5}
                  className={cn(
                    'px-4 py-2 rounded-[4px] text-sm font-bold border-none cursor-pointer flex items-center gap-2',
                    enviando || descricao.trim().length < 5
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  )}
                >
                  {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {enviando ? 'Enviando…' : 'Enviar'}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
