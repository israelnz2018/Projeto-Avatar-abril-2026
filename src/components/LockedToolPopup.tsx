import React, { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, Lock, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { useConsultor } from '../contexts/ConsultorContext';

interface LockedToolPopupProps {
  isOpen: boolean;
  onClose: () => void;
  consultorNome?: string;
  recursoNome?: string;
}

export const LockedToolPopup: React.FC<LockedToolPopupProps> = ({
  isOpen,
  onClose,
  consultorNome,
  recursoNome,
}) => {
  const { consultor, consultorId } = useConsultor();
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
  const nome = consultorNome || consultor.nome || consultor.branding.nome || 'seu consultor';

  useEffect(() => {
    if (!isOpen) return;
    setMensagem(recursoNome
      ? `Olá! Gostaria de solicitar acesso a ${recursoNome}.`
      : 'Olá! Gostaria de solicitar acesso a este conteúdo.');
    setErro('');
    setEnviado(false);
  }, [isOpen, recursoNome]);

  const enviar = async () => {
    const texto = mensagem.trim();
    if (texto.length < 5 || enviando) return;
    setEnviando(true);
    setErro('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Faça login novamente para enviar a solicitação.');
      const response = await fetch('/api/solicitacoes/acesso', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          consultorId,
          mensagem: texto,
          recurso: recursoNome || '',
          pagina: `${window.location.pathname}${window.location.search}`,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível enviar a solicitação.');
      setEnviado(true);
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível enviar a solicitação.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-100 bg-white p-7 shadow-2xl"
          >
            <button onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 border-none bg-transparent text-gray-400 hover:text-gray-700">
              <X size={22} />
            </button>

            {enviado ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="mb-2 text-xl font-black text-gray-900">Solicitação enviada</h2>
                <p className="mb-6 text-sm text-gray-600">Sua mensagem foi enviada para {nome}.</p>
                <button onClick={onClose} className="w-full rounded-xl border-none bg-[#0033CC] px-5 py-3 font-bold text-white hover:bg-[#1E2D6E]">
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div className="mb-5 flex items-start gap-4 pr-7">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <Lock size={25} />
                  </div>
                  <div>
                    <h2 className="m-0 text-xl font-black text-gray-900">Conteúdo não liberado</h2>
                    <p className="mb-0 mt-1 text-sm text-gray-600">Quer solicitar acesso a {nome}?</p>
                  </div>
                </div>

                <label htmlFor="mensagem-solicitacao-acesso" className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-600">
                  Mensagem para o consultor
                </label>
                <textarea
                  id="mensagem-solicitacao-acesso"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value.slice(0, 1000))}
                  rows={5}
                  autoFocus
                  className="w-full resize-none rounded-xl border border-gray-300 p-3 text-sm text-gray-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  placeholder="Explique qual curso, ferramenta ou conteúdo você gostaria de acessar."
                />
                <div className="mt-1 text-right text-[11px] text-gray-400">{mensagem.length}/1000</div>
                {erro && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{erro}</p>}

                <div className="mt-5 flex gap-3">
                  <button onClick={onClose} className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 font-bold text-gray-700 hover:bg-gray-50">
                    Cancelar
                  </button>
                  <button
                    onClick={enviar}
                    disabled={mensagem.trim().length < 5 || enviando}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border-none bg-[#0033CC] px-4 py-3 font-bold text-white hover:bg-[#1E2D6E] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {enviando ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                    {enviando ? 'Enviando...' : 'Enviar ao consultor'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
