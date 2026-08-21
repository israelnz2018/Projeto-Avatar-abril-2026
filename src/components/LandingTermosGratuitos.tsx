import React from 'react';
import RodapeInstitucional from './RodapeInstitucional';

const CSS = `
.lgt{min-height:100vh;background:#07101f;color:#f8fafc;font-family:Inter,Segoe UI,system-ui,sans-serif}.lgt *{box-sizing:border-box}.lgt .wrap{width:min(820px,calc(100% - 40px));margin:auto}.lgt .top{padding:24px 0;border-bottom:1px solid rgba(148,163,184,.18)}.lgt .brand{text-align:center;font-size:13px;font-weight:900;letter-spacing:.12em}.lgt .brand span{color:#22d3ee}.lgt main{padding:58px 0 76px}.lgt .eyebrow{display:inline-flex;padding:8px 13px;border:1px solid rgba(34,211,238,.35);border-radius:999px;color:#67e8f9;background:rgba(34,211,238,.08);font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.lgt h1{font-size:clamp(32px,5vw,50px);line-height:1.05;letter-spacing:-.04em;margin:18px 0 12px}.lgt .intro{color:#a8b6cc;font-size:17px;line-height:1.6;margin:0 0 30px}.lgt .card{border:1px solid rgba(148,163,184,.2);background:rgba(15,23,42,.72);border-radius:18px;padding:26px;margin:14px 0}.lgt h2{font-size:20px;margin:0 0 10px}.lgt p,.lgt li{color:#c4d0e1;line-height:1.65;font-size:15px}.lgt ul{padding-left:22px;margin:10px 0 0}.lgt .back{display:inline-block;margin-top:24px;color:#67e8f9;font-weight:800;text-decoration:none}.lgt strong{color:#fff}
`;

export default function LandingTermosGratuitos() {
  return <div className="lgt"><style>{CSS}</style>
    <header className="top"><div className="wrap"><div className="brand">LBW <span>·</span> EDUCAÇÃO PELO TRABALHO</div></div></header>
    <main><div className="wrap">
      <span className="eyebrow">Cursos gratuitos LBW</span>
      <h1>Termos e condições dos treinamentos gratuitos</h1>
      <p className="intro">Estes termos explicam como funciona o acesso gratuito aos cursos, às análises estatísticas e aos recursos liberados pela plataforma LBW — Educação pelo Trabalho.</p>

      <section className="card"><h2>1. O que está sendo oferecido</h2><p>O participante recebe acesso gratuito ao pacote indicado na página de inscrição. O pacote pode incluir videoaulas, exercícios, análises estatísticas, software LBW e o Mentor Israel digital, conforme o produto divulgado.</p></section>
      <section className="card"><h2>2. Validade do acesso</h2><p>Os acessos gratuitos desta campanha são válidos até <strong>31 de dezembro de 2026</strong>. A LBW poderá criar novas campanhas, alterar os produtos gratuitos ou encerrar uma campanha futura, sem retirar os acessos já utilizados dentro do período informado.</p></section>
      <section className="card"><h2>3. Requisitos para o certificado</h2><p>O certificado não é liberado apenas pelo cadastro. Para solicitar a emissão, o aluno deverá:</p><ul><li>assistir a pelo menos <strong>70% dos vídeos</strong> do curso;</li><li>realizar o teste de avaliação correspondente;</li><li>obter nota mínima de <strong>70% (7,0 em uma escala de 0 a 10)</strong>;</li><li>enviar um depoimento ou avaliação sobre a experiência na plataforma LBW antes da emissão.</li></ul></section>
      <section className="card"><h2>4. Depoimento e divulgação</h2><p>O depoimento deve ser verdadeiro e pode ser positivo, negativo ou conter sugestões. Ao enviar o depoimento, o aluno autoriza a LBW a utilizá-lo para melhorar a plataforma e, quando houver autorização específica, para divulgação institucional.</p><p>Depois de receber o certificado, convidamos o aluno a publicar sua conquista no LinkedIn, mostrando o certificado e mencionando a LBW. Essa divulgação ajuda outras pessoas a conhecerem o treinamento; ela não substitui os requisitos técnicos de conclusão.</p></section>
      <section className="card"><h2>5. Uso responsável</h2><p>O acesso é individual e não deve ser compartilhado, vendido, copiado ou utilizado para distribuir os materiais da LBW. O aluno pode aplicar os conhecimentos e as análises em seus próprios estudos e projetos, respeitando a confidencialidade dos dados da sua organização.</p></section>
      <section className="card"><h2>6. Dados e comunicação</h2><p>O e-mail informado é utilizado para criar o acesso, enviar credenciais, avisos importantes e informações relacionadas ao treinamento. O aluno pode solicitar a correção ou a remoção dos seus dados pelos canais de contato da LBW, observadas as necessidades de manutenção dos registros de certificação.</p></section>
      <section className="card"><h2>7. Aceite</h2><p>Ao marcar a caixa de aceite na página de inscrição, o participante confirma que leu e concorda com estes termos e condições.</p></section>
      <a className="back" href="/capabilidade/gratis">← Voltar para o cadastro gratuito</a>
    </div></main><RodapeInstitucional />
  </div>;
}
