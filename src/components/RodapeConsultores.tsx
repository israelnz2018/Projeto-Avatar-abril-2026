/**
 * RodapeConsultores — rodapé da landing /consultores. NÃO reusa RodapeInstitucional
 * porque aquele lista as 8 trilhas do Israel (não faz sentido aqui: o discurso é
 * "suba os SEUS cursos", não "use os cursos do Israel"). Mesmo estilo visual, 3
 * colunas em vez de 4 (sem a lista de trilhas).
 */
import React from 'react';

const AZUL = '#9FC0FF';
const TXT2 = 'rgba(255,255,255,.5)';

const tituloCol: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, letterSpacing: '.16em',
  textTransform: 'uppercase', color: AZUL, marginBottom: 14,
};
const linkStyle: React.CSSProperties = { color: AZUL, textDecoration: 'none' };

export default function RodapeConsultores() {
  return (
    <footer style={{ background: '#05070F', padding: '54px 20px 40px', borderTop: '1px solid rgba(255,255,255,.08)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, maxWidth: 900, margin: '0 auto' }}
        className="rodape-cols-consultores">
        <div>
          <div style={{ fontFamily: "'Space Grotesk', Inter, sans-serif", fontSize: 18, fontWeight: 800, marginBottom: 10, color: '#fff' }}>
            Learning by Working – Educação pelo Trabalho
          </div>
          <p style={{ fontSize: 13.5, color: TXT2, lineHeight: 1.6 }}>
            A plataforma white-label pra consultores gerenciarem cursos, clientes e projetos de melhoria contínua — com a sua marca.
          </p>
        </div>
        <div>
          <div style={tituloCol}>Institucional</div>
          <div style={{ fontSize: 13, color: TXT2, lineHeight: 2.1 }}>
            <a href="/quem-somos" target="_blank" rel="noopener noreferrer" style={linkStyle}>Quem somos</a><br/>
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
      <div style={{ maxWidth: 900, margin: '36px auto 0', paddingTop: 24, borderTop: '1px solid rgba(255,255,255,.08)', fontSize: 12, color: 'rgba(255,255,255,.4)', lineHeight: 1.7 }}>
        Learning by Working — Sole Trader · NZBN: 9429047241657<br/>Hillsborough — Auckland, Nova Zelândia · © 2026 Learning by Working – Educação pelo Trabalho · Todos os direitos reservados
      </div>
      <style>{`@media(max-width:800px){ .rodape-cols-consultores{ grid-template-columns:1fr !important; gap:28px !important; } }`}</style>
    </footer>
  );
}
