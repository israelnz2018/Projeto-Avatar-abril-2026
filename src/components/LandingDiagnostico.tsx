import { useEffect } from 'react';

const botUrl = String(import.meta.env.VITE_TYPEBOT_DIAGNOSTICO_URL || '').trim();
const urlValida = (() => {
  try {
    return new URL(botUrl).protocol === 'https:';
  } catch {
    return false;
  }
})();

export default function LandingDiagnostico() {
  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = 'Diagnóstico para consultores | LBW Educação pelo Trabalho';
    return () => { document.title = tituloAnterior; };
  }, []);

  return (
    <div className="min-h-screen bg-[#081a32] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <a href="/" className="text-xl font-black tracking-tight text-white no-underline" aria-label="LBW Educação pelo Trabalho, início">LBW <span className="text-sm font-normal text-blue-200">Educação pelo Trabalho</span></a>
          <a href="/consultoresLBW" className="text-sm font-semibold text-blue-100 hover:text-white">Conhecer a formação</a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 pt-12">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Diagnóstico LBW</p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Como está sua preparação para atuar como consultor?</h1>
          <p className="mt-4 text-base leading-relaxed text-blue-100">Responda algumas perguntas sobre sua experiência e seus objetivos. Ao final, você poderá conhecer a Formação de Consultores LBW e escolher um horário para a apresentação gratuita.</p>
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl" aria-label="Perguntas do diagnóstico">
          {urlValida ? (
            <iframe
              title="Diagnóstico para consultores LBW"
              src={botUrl}
              className="block h-[720px] min-h-[75vh] w-full border-0"
              allow="clipboard-write"
            />
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
              <h2 className="text-xl font-bold">O diagnóstico está sendo preparado.</h2>
              <p className="mt-3 max-w-lg text-slate-600">Enquanto isso, você já pode conhecer a formação e agendar uma apresentação gratuita.</p>
              <a href="/consultoresLBW" className="mt-6 rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800">Conhecer a formação</a>
            </div>
          )}
        </section>

        <p className="mt-5 text-center text-sm text-blue-200">Ao enviar seus dados, consulte nossa <a href="/privacidade" className="underline hover:text-white">política de privacidade</a>.</p>
      </main>
    </div>
  );
}
