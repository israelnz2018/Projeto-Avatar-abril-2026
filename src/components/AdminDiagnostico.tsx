import BaseDeContatos from './admin/BaseDeContatos';
const builderBase = String(import.meta.env.VITE_TYPEBOT_BUILDER_URL || '').trim();
const workspacePath = '/w/cmut8futp00003srjrb10x770/typebots';
const editorUrl = (() => {
  try {
    const url = new URL(workspacePath, builderBase);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
})();

export default function AdminDiagnostico() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">Área do Administrador</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Chatbox</h1>
          <p className="mt-2 text-sm text-slate-600">Crie e publique os fluxos de conversa do Typebot.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {editorUrl && <a href={editorUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 no-underline hover:bg-slate-50">Abrir em tela cheia</a>}
          <a href="https://educacaopelotrabalho.com/diagnostico" target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 no-underline hover:bg-slate-50">Ver diagnóstico público</a>
        </div>
      </div>
      <BaseDeContatos />

      {editorUrl ? (
        <iframe
          title="Editor Chatbox Typebot"
          src={editorUrl}
          className="block h-[calc(100vh-180px)] min-h-[720px] w-full rounded-xl border border-slate-200 bg-white"
          allow="clipboard-read; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-slate-600">Editor em configuração.</div>
      )}
    </div>
  );
}
