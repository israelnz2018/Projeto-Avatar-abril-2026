/**
 * LandingDiagnostico — o chat de diagnóstico, em /diagnostico, sem exigir login.
 *
 * FALA COM ALUNO, não com consultor. A página nasceu para a captação de
 * consultores, e os textos foram trocados quando o bot passou a ser o da
 * Plataforma LBW ("Em quais destes temas você vê uma oportunidade de se
 * desenvolver?"). Se o texto voltar a falar de "atuar como consultor", ele
 * passa a contradizer a conversa que a pessoa está tendo na tela.
 *
 * Qual bot aparece aqui vem de VITE_TYPEBOT_DIAGNOSTICO_URL, na plataforma, no
 * Railway — trocar de bot é trocar essa variável, sem mexer no código. Mas o
 * texto em volta é desta página: trocar para um bot de outro público pede
 * ajustar os textos também.
 *
 * O bot que escolhe entre aluno e consultor continua existindo no Typebot
 * ("Fluxo de Melhoria Continua"); ele não está ligado em nenhuma página hoje.
 */
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
    document.title = 'Diagnóstico LBW | Descubra seu plano na Plataforma';
    return () => { document.title = tituloAnterior; };
  }, []);

  return (
    <div className="min-h-screen bg-[#081a32] text-white">
      <header className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <a href="/" className="text-xl font-black tracking-tight text-white no-underline" aria-label="LBW Educação pelo Trabalho, início">LBW <span className="text-sm font-normal text-blue-200">Educação pelo Trabalho</span></a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-16 pt-12">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Diagnóstico LBW</p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">Onde você tem mais a ganhar em melhoria contínua?</h1>
          <p className="mt-4 text-base leading-relaxed text-blue-100">Responda algumas perguntas sobre seus temas de interesse e seu momento profissional. Ao final, você vê qual plano da Plataforma LBW atende o que você precisa.</p>
        </div>

        {/* AVISO DO TELEFONE — a causa número 1 de agendamento que não conclui.
            O campo de telefone na tela de agendamento é obrigatório e já vem
            preenchido com o +55. Quem digita o +55 de novo acaba com
            "+55 (55) 119…", que é inválido, e o Cal recusa. A recusa acontece
            dentro do navegador: nenhum pedido é enviado, nenhuma reunião é
            criada e nenhuma confirmação aparece. Para quem está na tela,
            parece que o botão travou.
            Por isso o aviso vem ANTES, em vez de depender só da mensagem de
            erro do Cal, que é pequena e fica logo abaixo do campo. */}
        <p className="mt-6 flex items-start gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3 text-sm leading-relaxed text-emerald-50">
          <span aria-hidden="true">💬</span>
          <span>
            Na hora de escolher o horário, o telefone é obrigatório e o campo já começa com{' '}
            <strong className="font-bold">+55</strong> — digite apenas o DDD e o número,
            assim: <strong className="font-bold">11 98888-7777</strong>. Com um número
            inválido, o botão de confirmar não conclui o agendamento.
          </span>
        </p>

        <section className="mt-4 overflow-hidden rounded-2xl bg-white text-slate-900 shadow-2xl" aria-label="Perguntas do diagnóstico">
          {urlValida ? (
            <iframe
              title="Diagnóstico da Plataforma LBW"
              src={botUrl}
              /* ALTURA: 1000px, antes 720. O passo de agendamento abre nome,
                 e-mail, telefone, observações e o botão Confirmar. A 720px a
                 mensagem "Invalid phone number" caía fora da área visível, e a
                 pessoa clicava em Confirmar sem nunca ver o motivo de nada
                 acontecer. Diminuir esta altura traz o problema de volta. */
              className="block h-[1000px] min-h-[85vh] w-full border-0"
              allow="clipboard-write"
            />
          ) : (
            <div className="flex min-h-[360px] flex-col items-center justify-center px-6 py-12 text-center">
              <h2 className="text-xl font-bold">O diagnóstico está sendo preparado.</h2>
              <p className="mt-3 max-w-lg text-slate-600">Enquanto isso, você já pode ver os planos da Plataforma LBW e escolher o que atende seu objetivo.</p>
              <a href="/plataformalbw" className="mt-6 rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800">Ver os planos</a>
            </div>
          )}
        </section>

        <p className="mt-5 text-center text-sm text-blue-200">Ao enviar seus dados, consulte nossa <a href="/privacidade" className="underline hover:text-white">política de privacidade</a>.</p>
      </main>
    </div>
  );
}
