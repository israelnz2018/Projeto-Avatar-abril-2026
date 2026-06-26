/**
 * Template do e-mail de agradecimento/convite LBW (acesso cortesia até 31/12/2026).
 * Usado pela aba Marketing: botão de teste (1 e-mail) e disparo em massa.
 */

const NAVY = '#1E2D6E';
const BLUE = '#0033CC';
const GOLD = '#C9A24B';
const INK = '#2A2F3A';
const LIGHT = '#F0F2FA';

export const CAMPANHA_ASSUNTO = 'Seu acesso gratuito à plataforma LBW — meu presente para você 🎁';

const TRILHAS = [
  '01 · Como Chegar em uma Área Nova e Entregar Resultado Rapidamente',
  '02 · Como Recomendar Melhorias com Base em Análise de Dados',
  '03 · Como Conduzir Mudanças com Menos Resistência',
  '04 · Como Criar Apresentações que Convencem',
  '05 · Como Antecipar Riscos Antes que Virem Problemas',
  '06 · Cultura Lean na Prática',
  '07 · Como Fazer Análises Estatísticas Aplicadas a Negócios',
  '08 · Como Se Tornar um Especialista em Gestão de Projetos de Melhoria',
];

/** Gera o HTML do e-mail. `emailDestino` aparece no bloco de dados de acesso. */
export function campanhaCortesiaHtml(emailDestino: string): string {
  const APP = 'https://app.educacaopelotrabalho.com';
  const trilhasHtml = TRILHAS.map((t) =>
    `<tr><td style="padding:7px 0;border-bottom:1px solid #EAEDF5;font-size:14px;color:${INK};">${t}</td></tr>`
  ).join('');

  return `
  <div style="margin:0;padding:0;background:#EEF1F8;">
    <div style="max-width:600px;margin:0 auto;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:${INK};">
      <div style="background-color:${NAVY};padding:34px 32px;text-align:center;">
        <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-.5px;">Learning by Working</div>
        <div style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#ffffff;margin-top:6px;">Educação pelo Trabalho</div>
      </div>
      <div style="height:4px;background:linear-gradient(90deg,${GOLD},#E7C977,${GOLD});"></div>
      <div style="padding:34px 34px 10px;">
        <p style="font-size:15px;line-height:1.65;margin:0 0 14px;">Olá!</p>
        <p style="font-size:15px;line-height:1.65;margin:0 0 14px;">
          Aqui é o <strong>Israel Cavalcanti de Souza</strong>. Você já esteve comigo em algum momento — seja
          acompanhando meus conteúdos no <strong>YouTube</strong> ou no <strong>LinkedIn</strong>, seja em um
          dos meus <strong>cursos na Hotmart</strong>. E é justamente por isso que estou te escrevendo.
        </p>
        <p style="font-size:15px;line-height:1.65;margin:0 0 14px;">
          Eu desenvolvi a plataforma <strong>LBW — Learning by Working</strong> para levar tudo o que
          ensino a um outro nível: aprender fazendo, com ferramentas que executam o trabalho com você.
          E como você já caminha comigo há um tempo, quero <strong>retribuir</strong>: estou te dando
          acesso <strong>100% gratuito</strong>, a tudo, <strong>até 31 de dezembro de 2026</strong>.
        </p>
        <div style="background:${LIGHT};border-left:4px solid ${BLUE};border-radius:8px;padding:18px 20px;margin:22px 0;">
          <div style="font-size:12px;font-weight:bold;letter-spacing:1px;color:${NAVY};margin-bottom:10px;">SEUS DADOS DE ACESSO</div>
          <div style="font-size:14px;margin:4px 0;"><strong>E-mail:</strong> ${emailDestino}</div>
          <div style="font-size:14px;margin:4px 0;"><strong>Senha provisória:</strong>
            <code style="background:#fff;border:1px solid #ccd;border-radius:4px;padding:3px 8px;font-family:monospace;">LBW2026</code>
          </div>
          <div style="font-size:12px;color:#7A828F;margin-top:8px;">É obrigatório trocar a senha no primeiro acesso.</div>
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="${APP}" style="background-color:#0033CC;color:#ffffff;text-decoration:none;font-weight:bold;font-size:17px;padding:17px 44px;border-radius:12px;display:inline-block;mso-padding-alt:0;">
            <span style="color:#ffffff;">Acessar a plataforma LBW →</span>
          </a>
        </div>
        <h2 style="font-size:17px;color:${NAVY};margin:30px 0 6px;font-weight:800;">O que você tem acesso</h2>
        <p style="font-size:14px;line-height:1.6;color:#5B6472;margin:0 0 12px;">Tudo liberado, sem pagar nada:</p>
        <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">
          <tr><td style="padding:6px 0;font-size:14px;">📊 <strong>Aplicativo estatístico</strong> (Software LBW) — gere análises e gráficos sem programar</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;">🎬 <strong>Todas as vídeo-aulas</strong></td></tr>
          <tr><td style="padding:6px 0;font-size:14px;">🤖 <strong>Israel Digital</strong> — um mentor que responde como eu responderia, com base nos meus próprios vídeos e no método LBW, pra te ajudar a destravar o seu projeto a qualquer hora</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;">👥 <strong>A comunidade</strong> de alunos</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;">🏅 <strong>Certificado de cada trilha</strong> (ao concluir o mínimo de aulas)</td></tr>
        </table>
        <h2 style="font-size:17px;color:${NAVY};margin:26px 0 10px;font-weight:800;">As 8 trilhas</h2>
        <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">${trilhasHtml}</table>
        <div style="background:#FBF7EC;border:1px solid #EBDDB8;border-radius:10px;padding:20px 22px;margin:28px 0;">
          <h2 style="font-size:16px;color:${NAVY};margin:0 0 12px;font-weight:800;">Em troca, te peço só 3 coisas 🤝</h2>
          <div style="font-size:14px;line-height:1.6;margin:0 0 10px;"><strong>1.</strong> Participe da <strong>comunidade</strong>.</div>
          <div style="font-size:14px;line-height:1.6;margin:0 0 10px;"><strong>2.</strong> Me ajude reportando <strong>sugestões de melhoria, bugs</strong> e o que achar que pode melhorar.</div>
          <div style="font-size:14px;line-height:1.6;margin:0;"><strong>3.</strong> Antes de fazer a prova de cada trilha, escreva um <strong>breve depoimento</strong> sobre a plataforma — pode ser positivo ou negativo, quero a sua opinião sincera. Esse depoimento poderá ser usado nas minhas redes sociais para divulgar o trabalho.</div>
        </div>
        <p style="font-size:15px;line-height:1.65;margin:0 0 14px;">É isso. Aproveite de verdade — foi feito pra você. Qualquer dúvida, é só responder este e-mail.</p>
        <p style="font-size:15px;line-height:1.65;margin:18px 0 4px;">Um abraço,</p>
        <p style="font-size:15px;line-height:1.4;margin:0;"><strong>Israel Cavalcanti de Souza</strong><br>
          <span style="font-size:13px;color:#5B6472;">CEO Learning by Working · Consultor Sênior em Melhoria de Processos e Negócios</span></p>
      </div>
      <div style="background:#05070F;padding:22px 32px;text-align:center;">
        <div style="font-size:12px;color:#8A94A6;line-height:1.6;">
          Learning by Working — Educação pelo Trabalho
        </div>
      </div>
    </div>
  </div>`;
}
