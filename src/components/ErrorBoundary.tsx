import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  // Erro de "chunk velho": acontece quando saiu um deploy novo e o navegador
  // ainda tem o index antigo, então tenta buscar um arquivo de aba que já não
  // existe (hash mudou). Em vez de mostrar a tela vermelha, recarrega 1x sozinho.
  private static isStaleChunkError(error: Error | null): boolean {
    const msg = String(error?.message || '');
    return (
      /Failed to fetch dynamically imported module/i.test(msg) ||
      /error loading dynamically imported module/i.test(msg) ||
      /Importing a module script failed/i.test(msg) ||
      /'?text\/html'?.*not a valid JavaScript MIME type/i.test(msg)
    );
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);

    if (ErrorBoundary.isStaleChunkError(error)) {
      // Guarda na sessão pra não entrar em loop de reload se o problema persistir.
      const KEY = 'lbw-stale-reloaded';
      if (!sessionStorage.getItem(KEY)) {
        sessionStorage.setItem(KEY, '1');
        window.location.reload();
      }
    } else {
      // Erro normal (não de versão): limpa o flag pra futuros reloads automáticos funcionarem.
      try { sessionStorage.removeItem('lbw-stale-reloaded'); } catch {}
    }
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      let details = "";

      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = `Erro no Firestore: ${parsed.operationType}`;
            details = parsed.error;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full border-t-4 border-red-500">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Ops! Algo deu errado.</h2>
            <p className="text-gray-700 mb-4">{errorMessage}</p>
            {details && (
              <div className="bg-gray-100 p-3 rounded text-xs font-mono text-gray-600 mb-4 overflow-auto max-h-32">
                {details}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-red-600 text-white py-2 rounded font-bold hover:bg-red-700 transition-colors"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
