/**
 * RodapeInstitucional — rodapé ÚNICO compartilhado pelas 3 páginas públicas
 * (Landing grátis, Landing paga e Jornada pública). Para mudar o rodapé,
 * edite SÓ este arquivo — propaga para as 3.
 *
 * Não usa classes de CSS das landings (cada uma tem o seu escopo .lc/.lf);
 * estiliza inline pra renderizar idêntico em qualquer página.
 */
import React from 'react';

const AZUL = '#9FC0FF';
const TXT2 = 'rgba(255,255,255,.5)';

const tituloCol: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, letterSpacing: '.16em',
  textTransform: 'uppercase', color: AZUL, marginBottom: 14,
};
const linkStyle: React.CSSProperties = { color: AZUL, textDecoration: 'none' };

export default function RodapeInstitucional() {
  return (
    <footer style={{ background: '#05070F', padding: '54px 20px 40px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, maxWidth: 1100, margin: '0 auto' }}
        className="rodape-cols">
        <div>
          <div style={{ fontFamily: "'Space Grotesk', Inter, sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 10, color: '#fff' }}>
            Learning by Working – Educação pelo Trabalho
          </div>
          <p style={{ fontSize: 13.5, color: TXT2, lineHeight: 1.6 }}>
            A plataforma para gerenciar projetos de melhoria e análise de dados sem programação.
          </p>
        </div>
        <div>
          <div style={tituloCol}>Cursos</div>
          <div style={{ fontSize: 13, color: TXT2, lineHeight: 2 }}>
            01 · Como Resolver Problemas no Trabalho<br/>
            02 · Como Recomendar Melhorias com Base em Análise de Dados<br/>
            03 · Como Conduzir Mudanças com Menos Resistência<br/>
            04 · Como Criar Apresentações que Convencem<br/>
            05 · Como Antecipar Riscos Antes que Virem Problemas<br/>
            06 · Cultura Lean na Prática<br/>
            07 · Como Fazer Análises Estatísticas Aplicadas a Negócios<br/>
            08 · Formação Profissional em Gestão de Projetos de Melhoria
          </div>
        </div>
        <div>
          <div style={tituloCol}>Institucional</div>
          <div style={{ fontSize: 13, color: TXT2, lineHeight: 2.1 }}>
            <a href="/quem-somos" target="_blank" rel="noopener noreferrer" style={linkStyle}>Quem somos</a><br/>
            <a href="/contato" target="_blank" rel="noopener noreferrer" style={linkStyle}>Contato</a><br/>
            <a href="/pacotes-corporativos" target="_blank" rel="noopener noreferrer" style={linkStyle}>Pacotes corporativos</a><br/>
            <a href="/termos" target="_blank" rel="noopener noreferrer" style={linkStyle}>Termos de uso</a><br/>
            <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={linkStyle}>Política de privacidade</a>
          </div>
        </div>
        <div>
          <div style={tituloCol}>Fale com a gente</div>
          <div style={{ fontSize: 13, color: TXT2, lineHeight: 1.9 }}>
            <a href="mailto:contact@learningbyworking.com" style={linkStyle}>contact@learningbyworking.com</a><br/>
            <a href="https://www.linkedin.com/in/israel-cavalcanti-de-souza-mbb-pmp-mba-9244a320/" target="_blank" rel="noopener noreferrer" style={linkStyle}>LinkedIn</a>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1100, margin: '36px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.08)', fontSize: 12, color: 'rgba(255,255,255,.4)', lineHeight: 1.7 }}>
        Learning by Working — Sole Trader · NZBN: 9429047241657<br/>Hillsborough — Auckland, Nova Zelândia · © 2026 Learning by Working – Educação pelo Trabalho · Todos os direitos reservados
      </div>
      <style>{`@media(max-width:900px){ .rodape-cols{ grid-template-columns:1fr !important; gap:28px !important; } }`}</style>
    </footer>
  );
}
