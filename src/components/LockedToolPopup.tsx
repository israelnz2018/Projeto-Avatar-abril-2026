import React from 'react';
import { Lock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HOTMART_CHECKOUT_URL } from '../lib/constants';

interface LockedToolPopupProps {
  isOpen: boolean;
  onClose: () => void;
  /** 'upgrade' (padrão, B2C legado): oferece upgrade via Hotmart.
   *  'consultor' (modelo por-consultor: coordenador/aluno com pacote): não existe upgrade
   *  self-service — o conteúdo só é liberado pelo consultor, então orienta a falar com ele. */
  variant?: 'upgrade' | 'consultor';
  /** Nome do consultor, usado só no variant='consultor'. */
  consultorNome?: string;
}

export const LockedToolPopup: React.FC<LockedToolPopupProps> = ({ isOpen, onClose, variant = 'upgrade', consultorNome }) => {
  const handleUpgrade = () => {
    window.open(HOTMART_CHECKOUT_URL, '_blank');
    onClose();
  };

  if (variant === 'consultor') {
    return (
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-8 overflow-hidden"
            >
              <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                  <Lock size={48} className="text-blue-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Ainda não liberado</h2>
                <p className="text-gray-700 font-medium mb-1">Este conteúdo ainda não foi liberado para você.</p>
                <p className="text-sm text-gray-500 mb-8">
                  Fale com {consultorNome ? <b>{consultorNome}</b> : 'seu consultor'} para solicitar acesso.
                </p>
                <button onClick={onClose} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg transition-colors">
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-8 overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <Lock size={48} className="text-blue-600" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Ferramenta bloqueada
              </h2>
              
              <p className="text-gray-700 font-medium mb-1">
                Esta ferramenta está disponível no Pacote Completo.
              </p>
              
              <p className="text-sm text-gray-500 mb-8">
                Desbloqueie todas as ferramentas e formações avançadas.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={handleUpgrade}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Quero fazer upgrade
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
