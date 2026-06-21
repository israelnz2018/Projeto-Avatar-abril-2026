/**
 * LandingInstitucional — páginas institucionais públicas (rodapé das landings).
 * Uma página por rota: /quem-somos, /contato, /pacotes-corporativos,
 * /termos, /privacidade. Servidas SEM login (bypass no App.tsx).
 *
 * Visual escuro NAVY, alinhado às landings. Conteúdo é rascunho editável —
 * Termos e Privacidade trazem aviso de "minuta, revisar com um advogado".
 */
import React from 'react';

const CSS = `
.li{--ink:#070A18;--line:rgba(255,255,255,.10);--txt:rgba(255,255,255,.74);--txt2:rgba(255,255,255,.5)}
.li *{margin:0;padding:0;box-sizing:border-box}
.li{background:var(--ink);color:#fff;font-family:'Segoe UI',Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;min-height:100vh;display:flex;flex-direction:column}
.li h1,.li h2,.li h3{font-family:'Space Grotesk',Inter,sans-serif;letter-spacing:-.02em;line-height:1.1}
.li .top{border-bottom:1px solid var(--line);background:#05070F}
.li .topwrap{max-width:880px;margin:0 auto;padding:18px 20px;display:flex;align-items:center;justify-content:space-between}
.li .logo{font-family:'Space Grotesk';font-weight:800;font-size:17px;color:#fff;text-decoration:none}
.li .back{font-size:13px;color:#9FC0FF;text-decoration:none;font-weight:600}
.li .hero{padding:54px 20px 26px;text-align:center;background:radial-gradient(ellipse 70% 60% at 50% 0%,rgba(0,51,204,.16),transparent 60%)}
.li .hero .eyebrow{display:inline-block;font-size:12px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#9FC0FF;background:rgba(159,192,255,.08);border:1px solid rgba(159,192,255,.22);padding:8px 16px;border-radius:999px;margin-bottom:16px}
.li .hero h1{font-size:36px;font-weight:800}
.li .body{flex:1;max-width:760px;margin:0 auto;padding:14px 20px 60px;width:100%}
.li .body h2{font-size:22px;font-weight:700;margin:30px 0 12px;color:#fff}
.li .body p,.li .body li{font-size:15.5px;color:var(--txt);line-height:1.7;margin-bottom:14px}
.li .body ul{padding-left:22px;margin-bottom:14px}
.li .body a{color:#9FC0FF}
.li .note{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);border-radius:12px;padding:14px 18px;font-size:13.5px;color:#fcd9a0;margin-bottom:24px}
.li .card{background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:16px;padding:24px;margin-bottom:16px}
.li .btn{display:inline-block;font-weight:700;font-size:15px;padding:14px 28px;border-radius:12px;text-decoration:none;cursor:pointer;border:none;background:linear-gradient(120deg,#0033CC,#2563EB);color:#fff;margin-top:8px}
.li .foot{background:#05070F;border-top:1px solid var(--line);padding:28px 20px;text-align:center;font-size:12px;color:var(--txt2);line-height:1.7}
.li .foot a{color:#9FC0FF;text-decoration:none}
@media(max-width:560px){ .li .hero h1{font-size:28px} }
`;

const HOJE = 'junho de 2026';

function Quem() {
  return (
    <>
      <p>A <strong>Learning by Working — Educação pelo Trabalho</strong> nasceu de uma constatação simples: ninguém aprende a resolver problema de verdade só assistindo aula. Aprende fazendo.</p>
      <p>Somos uma plataforma de educação corporativa aplicada que une vídeo-aulas, ferramentas que executam o trabalho com você e um mentor digital baseado na experiência real do nosso fundador, Israel Souza — mais de 20 anos resolvendo problemas em multinacionais de bebida, automotiva, petroquímica, equipamentos médicos e setor público.</p>
      <h2>Missão</h2>
      <p>Formar profissionais capazes de resolver problemas e entregar resultado com método — da adaptação a uma área nova até se tornarem especialistas em gerenciamento de projetos de melhoria, aprendendo na prática.</p>
      <h2>Visão</h2>
      <p>Ser a referência em educação aplicada para quem quer evoluir tecnicamente na carreira: uma jornada completa, das ferramentas do dia a dia ao domínio de projetos de melhoria complexos.</p>
      <h2>Valores</h2>
      <ul>
        <li><strong>Prática acima da teoria</strong> — ensinamos o que funciona no mundo real e já foi aplicado.</li>
        <li><strong>Resultado de verdade</strong> — o que importa é o que o profissional entrega, não o certificado na parede.</li>
        <li><strong>Simplicidade</strong> — método claro e ferramentas que executam com você, sem jargão.</li>
        <li><strong>Honestidade</strong> — sem hype: prático, real e concreto.</li>
        <li><strong>Evolução contínua</strong> — cada trilha acrescenta uma camada, até o ápice de especialista em gerenciamento de projetos de melhoria.</li>
      </ul>
      <h2>Como fazemos</h2>
      <ul>
        <li>Trilhas práticas que se complementam — da adaptação a uma área nova até o nível de especialista em gerenciamento de projetos de melhoria.</li>
        <li>Ferramentas (SIPOC, RACI, Ishikawa, análise de dados e muito mais) que se preenchem com o seu projeto real.</li>
        <li>O Mentor Israel digital, que responde com base nos vídeos do próprio Israel.</li>
      </ul>
      <a className="btn" href="/trilhagratis">Comece grátis →</a>
    </>
  );
}

function Contato() {
  return (
    <>
      <p>Tem uma dúvida, quer falar sobre a formação ou precisa de suporte? Fale com a gente.</p>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>E-mail</h2>
        <p style={{ marginBottom: 0 }}><a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a></p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>LinkedIn</h2>
        <p style={{ marginBottom: 0 }}><a href="https://www.linkedin.com/in/israel-cavalcanti-de-souza-mbb-pmp-mba-9244a320/" target="_blank" rel="noopener noreferrer">Israel Cavalcanti de Souza</a></p>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Empresa</h2>
        <p style={{ marginBottom: 0 }}>Learning by Working — Sole Trader · NZBN: 9429047241657<br/>Hillsborough — Auckland, Nova Zelândia</p>
      </div>
    </>
  );
}

function Pacotes() {
  return (
    <>
      <p>Quer levar a formação para a sua equipe? A LBW oferece condições especiais para empresas que querem capacitar times inteiros em projetos de melhoria, análise de dados e gestão.</p>
      <h2>O que está incluído</h2>
      <ul>
        <li>Acesso completo às 8 trilhas para cada colaborador.</li>
        <li>Painel do coordenador para acompanhar o progresso da equipe.</li>
        <li>Gestão de quantos alunos quiser, conforme o pacote contratado.</li>
        <li>Mentor Israel digital e todas as ferramentas da plataforma.</li>
      </ul>
      <h2>Para quem é</h2>
      <p>Áreas de qualidade, melhoria contínua, operações, RH e qualquer time que precise resolver problemas e mostrar resultado com método.</p>
      <p>Fale com a gente para montar uma proposta sob medida:</p>
      <a className="btn" href="mailto:contact@learningbyworking.com?subject=Pacotes%20corporativos%20LBW">Solicitar proposta corporativa →</a>
    </>
  );
}

function Termos() {
  return (
    <>
      <div className="note">⚠️ Esta é uma <strong>minuta inicial</strong>. Recomendamos revisão por um advogado antes da publicação definitiva.</div>
      <p>Última atualização: {HOJE}.</p>
      <p>Ao acessar e usar a plataforma <strong>Learning by Working — Educação pelo Trabalho</strong> (o "Serviço"), você concorda com estes Termos de Uso.</p>
      <h2>1. Acesso e conta</h2>
      <p>Para usar o Serviço você cria uma conta com nome e e-mail válidos. Você é responsável por manter a confidencialidade da sua senha e por toda atividade na sua conta.</p>
      <h2>2. Acesso gratuito e pago</h2>
      <p>Oferecemos uma trilha gratuita e planos pagos com acesso ampliado. O acesso pago é concedido conforme o plano adquirido e pode ter prazo de validade informado no momento da compra.</p>
      <h2>2.1. Sobre o acesso gratuito</h2>
      <p>O acesso gratuito pode ocorrer de duas formas, e em ambas <strong>não há cobrança</strong>:</p>
      <ul>
        <li><strong>Trilha 1 gratuita:</strong> liberada para qualquer pessoa que se cadastre com nome e e-mail, sem necessidade de cartão. Inclui a primeira trilha completa, o software LBW, o Mentor Israel digital e o certificado da Trilha 1.</li>
        <li><strong>Acesso completo como cortesia:</strong> em ações pontuais (ex: convidados, parceiros ou promoções), podemos conceder acesso completo às 8 trilhas de forma gratuita. Esse acesso de cortesia pode ter <strong>prazo de validade</strong> informado no momento da concessão; ao fim do prazo, a conta retorna automaticamente ao acesso gratuito (Trilha 1), sem cobrança.</li>
      </ul>
      <p>O acesso gratuito é pessoal e intransferível e segue as mesmas regras de uso adequado descritas neste documento.</p>
      <h2>3. Uso adequado</h2>
      <p>Você concorda em não compartilhar suas credenciais, não copiar ou redistribuir o conteúdo, e usar o Serviço apenas para fins legais e pessoais (ou conforme o pacote corporativo contratado).</p>
      <h2>4. Propriedade intelectual</h2>
      <p>Todo o conteúdo — vídeos, textos, ferramentas e marca — pertence à Learning by Working e está protegido por lei. O acesso não transfere propriedade.</p>
      <h2>5. Cancelamento e reembolso</h2>
      <p>As compras seguem a política da plataforma de pagamento utilizada (Hotmart), incluindo o prazo legal de arrependimento.</p>
      <h2>6. Alterações</h2>
      <p>Podemos atualizar estes termos. Mudanças relevantes serão comunicadas pelos nossos canais.</p>
      <h2>7. Contato</h2>
      <p>Dúvidas: <a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a>.</p>
    </>
  );
}

function Privacidade() {
  return (
    <>
      <div className="note">⚠️ Esta é uma <strong>minuta inicial</strong>. Recomendamos revisão por um advogado/DPO antes da publicação definitiva (conformidade LGPD).</div>
      <p>Última atualização: {HOJE}.</p>
      <p>Esta Política descreve como a <strong>Learning by Working</strong> coleta, usa e protege seus dados pessoais.</p>
      <h2>1. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome e e-mail.</li>
        <li><strong>Uso:</strong> progresso nas trilhas, projetos criados e interações com a plataforma.</li>
        <li><strong>Pagamento:</strong> processado pela Hotmart — não armazenamos dados de cartão.</li>
      </ul>
      <h2>2. Como usamos</h2>
      <p>Para dar acesso à plataforma, acompanhar seu progresso, enviar comunicações sobre o serviço e melhorar a experiência.</p>
      <h2>3. Compartilhamento</h2>
      <p>Não vendemos seus dados. Compartilhamos apenas com prestadores necessários à operação (ex: hospedagem, e-mail, pagamento), sob obrigação de sigilo.</p>
      <h2>4. Seus direitos (LGPD)</h2>
      <p>Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento pelo e-mail abaixo.</p>
      <h2>5. Segurança</h2>
      <p>Adotamos medidas técnicas e organizacionais para proteger seus dados. Nenhum sistema é 100% infalível, mas trabalhamos para reduzir riscos.</p>
      <h2>6. Contato</h2>
      <p>Para exercer seus direitos ou tirar dúvidas: <a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a>.</p>
    </>
  );
}

const PAGINAS: Record<string, { eyebrow: string; titulo: string; render: () => React.ReactNode }> = {
  '/quem-somos': { eyebrow: 'Institucional', titulo: 'Quem somos', render: Quem },
  '/contato': { eyebrow: 'Fale com a gente', titulo: 'Contato', render: Contato },
  '/pacotes-corporativos': { eyebrow: 'Para empresas', titulo: 'Pacotes corporativos', render: Pacotes },
  '/termos': { eyebrow: 'Legal', titulo: 'Termos de uso', render: Termos },
  '/privacidade': { eyebrow: 'Legal', titulo: 'Política de privacidade', render: Privacidade },
};

export default function LandingInstitucional() {
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : '/quem-somos';
  const pg = PAGINAS[path] || PAGINAS['/quem-somos'];

  return (
    <div className="li">
      <style>{CSS}</style>
      <div className="top">
        <div className="topwrap">
          <a className="logo" href="/">Learning by Working</a>
          <a className="back" href="/">← Voltar ao site</a>
        </div>
      </div>

      <header className="hero">
        <span className="eyebrow">{pg.eyebrow}</span>
        <h1>{pg.titulo}</h1>
      </header>

      <main className="body">{pg.render()}</main>

      <footer className="foot">
        © 2026 Learning by Working – Educação pelo Trabalho · Todos os direitos reservados<br/>
        <a href="mailto:contact@learningbyworking.com">contact@learningbyworking.com</a>
      </footer>
    </div>
  );
}
