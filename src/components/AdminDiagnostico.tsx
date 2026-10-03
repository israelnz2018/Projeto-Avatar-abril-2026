const builderUrl = String(import.meta.env.VITE_TYPEBOT_BUILDER_URL || '').trim();
const editorDisponivel = (() => {
  try {
    return new URL(builderUrl).protocol === 'https:';
  } catch {
    return false;
  }
})();

export default function AdminDiagnostico() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Área do Administrador</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Fluxos de diagnóstico</h1>
        <p className="mt-3 text-slate-600">Crie as perguntas, os caminhos e as mensagens no editor do Typebot. O acesso usa uma conta administrativa própria.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Editor do diagnóstico</h2>
        <p className="mt-2 text-sm text-slate-600">Monte e publique o fluxo no editor. Depois, confira como ele aparece na página pública.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          {editorDisponivel ? (
            <a href={builderUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-bold text-white no-underline hover:bg-blue-800">Abrir editor do Typebot</a>
          ) : (
            <span className="rounded-lg bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-600">Editor em configuração</span>
          )}
          <a href="https://educacaopelotrabalho.com/diagnostico" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 no-underline hover:bg-slate-50">Ver página pública</a>
        </div>
      </div>
    </div>
  );
}
