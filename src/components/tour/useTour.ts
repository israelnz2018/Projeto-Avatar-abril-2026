/**
 * useTour — controla o disparo do tour de uma aba.
 *
 * Regra (pedido do Israel): mostra automaticamente nas 2 PRIMEIRAS aberturas,
 * depois fica só manual (botão "Iniciar tour", sempre disponível).
 *
 * Cada aba passa uma `key` única → contagem independente no localStorage.
 */
import { useEffect, useState } from 'react';

const AUTO_LIMIT = 2; // 2 primeiras visitas mostram automático

function countKey(key: string) {
  return `lbw-tour-count-${key}-v1`;
}

function getCount(key: string): number {
  try { return parseInt(localStorage.getItem(countKey(key)) || '0', 10) || 0; }
  catch { return 0; }
}

function bumpCount(key: string): void {
  try { localStorage.setItem(countKey(key), String(getCount(key) + 1)); }
  catch { /* ignore */ }
}

export function useTour(key: string) {
  const [isOpen, setIsOpen] = useState(false);

  // Abre automaticamente nas 2 primeiras visitas. O bump acontece ao abrir,
  // então recarregar/sair sem concluir ainda conta como uma exibição.
  useEffect(() => {
    if (getCount(key) < AUTO_LIMIT) {
      const t = setTimeout(() => {
        bumpCount(key);
        setIsOpen(true);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [key]);

  // Abertura manual (botão) não conta no limite automático.
  const openTour = () => setIsOpen(true);
  const closeTour = () => setIsOpen(false);

  return { isOpen, openTour, closeTour };
}
