/**
 * SejaConsultor — convite, dentro da área do aluno, para o aluno usar a própria
 * plataforma como consultor (white-label, com o subdomínio dele).
 *
 * É uma PONTE, não uma landing nova: explica a oportunidade pra quem já está
 * logado e conhece a plataforma por dentro, e manda pro formulário que já existe
 * em /consultores (LandingConsultores), que alimenta /api/leads-consultor e a
 * aprovação do admin em SolicitacoesConsultores. Nada é duplicado aqui.
 *
 * O CTA é <a target="_blank"> de propósito, NÃO <Link>: /consultores é
 * interceptado no topo do App (antes do Router) pelo pathname da janela, então
 * navegação client-side cairia na rota interna da vitrine em vez da landing.
 * Um page load de verdade garante a landing certa — e em aba nova o aluno não
 * perde a sessão nem onde estava no curso.
 */
import React from 'react';
import { Award, Check, Palette, Rocket, Store, TrendingUp, Users, Video } from 'lucide-react';

const URL_FORMULARIO = '/consultores#consultores-formulario';

const RECURSOS = [
  { icon: Palette, titulo: 'Sua marca', texto: 'Sua logo, suas cores e seu slogan no lugar dos nossos. Seus alunos veem você, não a LBW.' },
  { icon: Video, titulo: 'Seus cursos', texto: 'Você sobe seus próprios vídeos e monta suas trilhas. O conteúdo é seu.' },
  { icon: Users, titulo: 'Seus clientes', texto: 'Cadastre empresas, times e coordenadores. Cada cliente com o acesso que você liberar.' },
  { icon: TrendingUp, titulo: 'Projetos e ferramentas', texto: 'A mesma metodologia de projetos que você usa hoje como aluno, agora rodando para os seus.' },
  { icon: Award, titulo: 'Certificados seus', texto: 'Certificado emitido com a sua marca, verificável por link público.' },
  { icon: Store, titulo: 'Vitrine pública', texto: 'Sua página aparece na vitrine onde empresas procuram consultores.' },
];

const PRE_REQUISITOS = [
  'Você atua com melhoria contínua, Lean, Six Sigma ou qualidade.',
  'Você já tem um curso gravado — ou está pronto para gravar o seu.',
  'Você já atende (ou quer começar a atender) empresas.',
];

const ETAPAS = [
  { n: 1, titulo: 'Você envia a solicitação', texto: 'Um formulário curto com o seu perfil e o endereço que você quer usar.' },
  { n: 2, titulo: 'A gente analisa pessoalmente', texto: 'As vagas iniciais são limitadas e cada solicitação é lida por uma pessoa.' },
  { n: 3, titulo: 'Sua plataforma entra no ar', texto: 'Criamos o seu endereço e a sua marca. Você recebe o acesso de consultor.' },
  { n: 4, titulo: 'Você sobe seus cursos', texto: 'Um checklist guiado leva você do zero até o primeiro cliente dentro da plataforma.' },
];

export default function SejaConsultor() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 flex items-center gap-2">
          <Store className="text-blue-600 shrink-0" size={30} />
          Use esta plataforma como consultor
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Você já conhece a plataforma por dentro. Ela também pode ser sua — com a sua marca e o seu endereço.
        </p>
      </div>

      {/* Hero + preview do subdomínio */}
      <div className="rounded-2xl bg-gradient-to-br from-[#0a1330] to-[#14295d] text-white p-6 md:p-10 mb-8">
        <div className="max-w-3xl">
          <h2 className="text-xl md:text-3xl font-black leading-tight mb-3">
            Se você já atua com melhoria contínua e tem o seu curso pronto,
            não precisa construir uma plataforma do zero.
          </h2>
          <p className="text-blue-100 text-sm md:text-base leading-relaxed">
            Use esta mesma plataforma como consultor: seus cursos, seus clientes e seus projetos,
            no seu próprio endereço. Você cuida do conteúdo e da consultoria — a tecnologia já está pronta.
          </p>
        </div>

        {/* Mock da barra de endereço */}
        <div className="mt-7 bg-white/10 border border-white/15 rounded-xl p-4 md:p-5">
          <p className="text-[11px] uppercase tracking-wide font-bold text-blue-200 mb-2">
            O seu endereço seria assim
          </p>
          <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2.5 overflow-x-auto">
            <div className="flex gap-1.5 shrink-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <span className="font-mono text-sm whitespace-nowrap">
              <span className="font-black text-blue-700">seu-nome</span>
              <span className="text-gray-500">.educacaopelotrabalho.com</span>
            </span>
          </div>
          <p className="text-xs text-blue-100 mt-2.5">
            Pode ser o seu nome ou o da sua empresa. O Israel, por exemplo, usa
            {' '}<b className="text-white">israel.educacaopelotrabalho.com</b>.
          </p>
        </div>

        <a
          href={URL_FORMULARIO}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-7 bg-blue-600 hover:bg-blue-500 transition-colors text-white font-bold px-6 py-3.5 rounded-xl no-underline"
        >
          <Rocket size={18} />
          Quero saber como ter a minha
        </a>
      </div>

      {/* Já é consultor? */}
      <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 md:p-6 mb-8">
        <h3 className="font-black text-gray-900 mb-1">Já é consultor e entrou só para conhecer a plataforma?</h3>
        <p className="text-sm text-gray-700 leading-relaxed">
          Então esta página é exatamente para você. Continue explorando como aluno o quanto quiser —
          é a melhor forma de entender a experiência que os seus clientes teriam. Quando fizer sentido,
          o convite está aberto.
        </p>
      </div>

      {/* O que vem junto */}
      <h3 className="text-lg md:text-xl font-black text-gray-900 mb-4">O que vem junto</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        {RECURSOS.map(({ icon: Icone, titulo, texto }) => (
          <div key={titulo} className="rounded-2xl border border-gray-200 bg-white p-5 hover:border-blue-400 hover:shadow-lg transition-all">
            <Icone className="text-blue-600 mb-3" size={22} />
            <p className="font-bold text-gray-900 mb-1">{titulo}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{texto}</p>
          </div>
        ))}
      </div>

      {/* Pré-requisitos */}
      <h3 className="text-lg md:text-xl font-black text-gray-900 mb-4">Para quem é</h3>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 md:p-6 mb-10">
        <ul className="space-y-3 mb-4">
          {PRE_REQUISITOS.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-gray-700">
              <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={13} strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-4">
          Não precisa marcar nada aqui — essas perguntas fazem parte do formulário, e é lá que a gente
          entende o seu momento. Ainda não ter o curso gravado não elimina você.
        </p>
      </div>

      {/* Como funciona */}
      <h3 className="text-lg md:text-xl font-black text-gray-900 mb-4">Como funciona</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {ETAPAS.map(({ n, titulo, texto }) => (
          <div key={n} className="rounded-2xl border border-gray-200 bg-white p-5">
            <span className="w-8 h-8 rounded-full bg-blue-600 text-white font-black flex items-center justify-center mb-3">
              {n}
            </span>
            <p className="font-bold text-gray-900 mb-1 text-sm">{titulo}</p>
            <p className="text-sm text-gray-600 leading-relaxed">{texto}</p>
          </div>
        ))}
      </div>

      {/* CTA final */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 md:p-8 text-center">
        <h3 className="text-lg md:text-xl font-black text-gray-900 mb-2">
          Quer ver os detalhes e se candidatar?
        </h3>
        <p className="text-sm text-gray-600 mb-6 max-w-xl mx-auto leading-relaxed">
          A página do Programa de Consultores explica o modelo por completo e tem o formulário
          de solicitação. Abre em uma aba nova — você não perde o seu lugar aqui.
        </p>
        <a
          href={URL_FORMULARIO}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 transition-colors text-white font-bold px-6 py-3.5 rounded-xl no-underline"
        >
          <Rocket size={18} />
          Ver o programa e enviar solicitação
        </a>
        <p className="text-xs text-gray-400 mt-4">
          Sem mensalidade inicial. As vagas iniciais são limitadas e analisadas pessoalmente.
        </p>
      </div>
    </div>
  );
}
