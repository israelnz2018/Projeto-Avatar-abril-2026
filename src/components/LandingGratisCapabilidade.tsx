import React, { useEffect, useRef, useState } from 'react';
import RodapeInstitucional from './RodapeInstitucional';

type FormState = 'idle' | 'sending' | 'ok' | 'err';

const PAISES_WHATSAPP = [
  { nome: 'Brasil', codigo: '+55', min: 10, max: 11 },
  { nome: 'Austrália', codigo: '+61', min: 9, max: 9 },
  { nome: 'Nova Zelândia', codigo: '+64', min: 8, max: 9 },
  { nome: 'Portugal', codigo: '+351', min: 9, max: 9 },
  { nome: 'Estados Unidos', codigo: '+1', min: 10, max: 10 },
  { nome: 'Canadá', codigo: '+1', min: 10, max: 10 },
  { nome: 'Reino Unido', codigo: '+44', min: 10, max: 10 },
  { nome: 'Irlanda', codigo: '+353', min: 9, max: 9 },
  { nome: 'Espanha', codigo: '+34', min: 9, max: 9 },
  { nome: 'França', codigo: '+33', min: 9, max: 9 },
  { nome: 'Alemanha', codigo: '+49', min: 10, max: 11 },
  { nome: 'Itália', codigo: '+39', min: 9, max: 10 },
  { nome: 'México', codigo: '+52', min: 10, max: 10 },
  { nome: 'Argentina', codigo: '+54', min: 10, max: 10 },
  { nome: 'Chile', codigo: '+56', min: 9, max: 9 },
  { nome: 'África do Sul', codigo: '+27', min: 9, max: 9 },
] as const;

const SELECT_STYLE: React.CSSProperties = {
  display: 'block', width: '100%', padding: '12px 13px', borderRadius: 10,
  border: '1px solid rgba(148,163,184,.3)', background: '#0b1426', color: '#fff', fontSize: 14,
};

const CSS = `
.lgc{--ink:#07101f;--blue:#2563eb;--cyan:#22d3ee;--muted:#a8b6cc;--line:rgba(148,163,184,.18);min-height:100vh;background:radial-gradient(900px 500px at 80% -10%,rgba(37,99,235,.32),transparent 65%),#07101f;color:#f8fafc;font-family:Inter,Segoe UI,system-ui,sans-serif}
.lgc *{box-sizing:border-box}.lgc .wrap{width:min(1080px,calc(100% - 40px));margin:auto}.lgc h1,.lgc h2,.lgc h3{letter-spacing:-.035em;line-height:1.08;margin:0}.lgc p{line-height:1.6}.lgc .top{padding:22px 0;border-bottom:1px solid var(--line)}.lgc .brand{font-weight:900;letter-spacing:.12em;font-size:13px}.lgc .brand span{color:var(--cyan)}
.lgc .hero{padding:72px 0 64px}.lgc .hero-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:58px;align-items:center}.lgc .eyebrow{display:inline-flex;padding:8px 13px;border:1px solid rgba(34,211,238,.35);border-radius:999px;color:#67e8f9;background:rgba(34,211,238,.08);font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}.lgc h1{font-size:clamp(38px,5.3vw,64px);margin:20px 0 18px}.lgc .grad{background:linear-gradient(100deg,#fff 10%,#93c5fd 55%,#22d3ee);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}.lgc .lead{font-size:19px;color:var(--muted);max-width:620px;margin:0 0 28px}.lgc .cta{display:inline-block;background:linear-gradient(120deg,#2563eb,#0891b2);border:1px solid rgba(147,197,253,.45);color:#fff;font-weight:850;text-decoration:none;padding:16px 24px;border-radius:12px;box-shadow:0 16px 40px rgba(37,99,235,.28);cursor:pointer}.lgc .note{font-size:12px;color:#8fa1bc;margin-top:12px}.lgc .visual{position:relative;border:1px solid rgba(147,197,253,.28);border-radius:24px;padding:25px;background:linear-gradient(145deg,rgba(30,64,175,.42),rgba(15,23,42,.7));box-shadow:0 30px 90px rgba(0,0,0,.25)}.lgc .visual:before{content:'';position:absolute;inset:12px;border:1px solid rgba(34,211,238,.15);border-radius:18px;pointer-events:none}.lgc .gauge{height:245px;display:flex;align-items:center;justify-content:center;position:relative}.lgc .circle{width:176px;height:176px;border-radius:50%;border:18px solid rgba(148,163,184,.2);border-top-color:#22d3ee;border-right-color:#2563eb;transform:rotate(25deg);display:flex;align-items:center;justify-content:center;box-shadow:0 0 45px rgba(34,211,238,.22)}.lgc .circle b{font-size:36px;transform:rotate(-25deg)}.lgc .metric{display:flex;justify-content:space-between;border-top:1px solid var(--line);padding:14px 0;color:var(--muted);font-size:13px}.lgc .metric strong{color:#fff}.lgc section{padding:68px 0}.lgc .section-head{text-align:center;max-width:700px;margin:0 auto 34px}.lgc .section-head h2{font-size:clamp(28px,4vw,42px);margin:14px 0}.lgc .section-head p{color:var(--muted);margin:0}.lgc .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.lgc .card{border:1px solid var(--line);border-radius:16px;background:rgba(15,23,42,.65);padding:24px}.lgc .card .icon{font-size:28px}.lgc .card h3{font-size:18px;margin:14px 0 8px}.lgc .card p{font-size:14px;color:var(--muted);margin:0}.lgc .access{background:linear-gradient(180deg,rgba(15,23,42,.1),rgba(15,23,42,.75));border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.lgc .access-grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:start}.lgc .list{display:grid;gap:12px}.lgc .list div{display:flex;gap:10px;color:#dbeafe}.lgc .check{color:#67e8f9;font-weight:900}.lgc .form-box{border:1px solid rgba(147,197,253,.3);background:rgba(15,23,42,.88);border-radius:18px;padding:28px;box-shadow:0 24px 70px rgba(0,0,0,.25)}.lgc .form-box h3{font-size:24px;margin-bottom:8px}.lgc .form-box p{color:var(--muted);font-size:14px;margin:0 0 18px}.lgc input{display:block;width:100%;padding:14px 15px;margin:0 0 11px;border-radius:10px;border:1px solid rgba(148,163,184,.3);background:#0b1426;color:#fff;font-size:15px;outline:none}.lgc input:focus{border-color:#38bdf8}.lgc .form-box .cta{width:100%;border:0;font-size:16px}.lgc .error{color:#fca5a5;font-size:13px;margin:0 0 10px}.lgc .success{text-align:center}.lgc .success .mark{font-size:42px;margin-bottom:8px}.lgc .faq{max-width:760px;margin:auto;display:grid;gap:10px}.lgc details{border:1px solid var(--line);border-radius:12px;background:rgba(15,23,42,.58);padding:17px 19px}.lgc summary{cursor:pointer;font-weight:750}.lgc details p{color:var(--muted);font-size:14px;margin:12px 0 0}.lgc .final{text-align:center;padding-bottom:82px}.lgc .final h2{font-size:clamp(30px,4vw,46px);margin-bottom:14px}.lgc .final p{color:var(--muted);max-width:600px;margin:0 auto 24px}@media(max-width:760px){.lgc .hero{padding-top:46px}.lgc .hero-grid,.lgc .access-grid{grid-template-columns:1fr;gap:32px}.lgc .cards{grid-template-columns:1fr}.lgc .visual{max-width:480px;margin:auto}.lgc section{padding:52px 0}}
/* Primeira dobra compacta: mensagem, demonstracao e cadastro aparecem juntos. */
.lgc .brand{text-align:center}.lgc .hero{padding:34px 0 42px}.lgc .hero-grid{grid-template-columns:1.1fr .9fr;gap:32px;align-items:center}.lgc h1{font-size:clamp(34px,3.8vw,48px);margin:16px 0 14px}.lgc .lead{font-size:16px;line-height:1.48;margin-bottom:18px}.lgc .hero .form-box{height:100%;padding:22px}.lgc .hero .form-box h3{font-size:21px}.lgc .hero .form-box p{font-size:13px;margin-bottom:14px}.lgc .hero .form-box input{padding:12px 13px;margin-bottom:9px;font-size:14px}.lgc .hero .form-box .cta{padding:14px 16px;font-size:14px}.lgc .hero .form-box .note{font-size:11px}.lgc .hero-form{height:100%}
@media(max-width:980px){.lgc .hero-grid{grid-template-columns:1fr 1fr}.lgc .hero-copy{grid-column:1 / -1;text-align:center}.lgc .hero-copy .lead{margin-left:auto;margin-right:auto}.lgc .hero-copy .note{margin-bottom:0}}
@media(max-width:760px){.lgc .hero{padding-top:40px}.lgc .hero-grid{grid-template-columns:1fr;gap:20px}.lgc .hero-copy{grid-column:auto;text-align:left}.lgc .hero-copy .lead{margin-left:0;margin-right:0}.lgc .hero .visual{max-width:none}.lgc .hero-form{height:auto}}
.lgc .hero-copy .hero-benefits{grid-template-columns:repeat(3,1fr)}@media(max-width:520px){.lgc .hero-copy .hero-benefits{grid-template-columns:1fr}}
.lgc .hero-grid{grid-template-columns:1fr .9fr}.lgc .hero-benefits{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:20px}.lgc .benefit{display:block;text-align:center;border:1px solid var(--line);border-radius:12px;background:rgba(15,23,42,.65);padding:11px 8px}.lgc .benefit-icon{width:32px;height:32px;display:grid;place-items:center;margin:0 auto 7px;border-radius:10px;background:rgba(37,99,235,.2);border:1px solid rgba(103,232,249,.25);font-size:17px}.lgc .benefit h3{font-size:12px;line-height:1.2;margin:0}.lgc .benefit p{font-size:10px;color:var(--muted);margin:4px 0 0;line-height:1.25}.lgc .terms-check{display:flex;align-items:flex-start;gap:9px;margin-top:12px;text-align:left;color:#9fb0c8;font-size:11px;line-height:1.4}.lgc .terms-check input{width:16px;height:16px;margin:1px 0 0;flex:none;accent-color:#22d3ee}.lgc .terms-check a{color:#67e8f9;text-decoration:underline}
`;

export default function LandingGratisCapabilidade() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [profissao, setProfissao] = useState('');
  const [cursosInteresse, setCursosInteresse] = useState<string[]>([]);
  const [cursosInteresseSelecionados, setCursosInteresseSelecionados] = useState<string[]>([]);
  const [cursosCarregando, setCursosCarregando] = useState(true);
  const [codigoPais, setCodigoPais] = useState('+55');
  const [whatsapp, setWhatsapp] = useState('');
  const cursosDropdownRef = useRef<HTMLDetailsElement>(null);
  const [state, setState] = useState<FormState>('idle');
  const [message, setMessage] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const paisSelecionado = PAISES_WHATSAPP.find(item => item.codigo === codigoPais) || PAISES_WHATSAPP[0];
  const numeroWhatsappDigitado = whatsapp.replace(/\D/g, '');
  const whatsappFormatoValido = numeroWhatsappDigitado.length >= paisSelecionado.min && numeroWhatsappDigitado.length <= paisSelecionado.max && /^[1-9]\d+$/.test(numeroWhatsappDigitado);
  const resumoCursos = cursosInteresseSelecionados.length === 0
    ? 'Qual outro curso você gostaria de aprender mais?'
    : cursosInteresseSelecionados.length === 1 ? cursosInteresseSelecionados[0] : `${cursosInteresseSelecionados.length} cursos selecionados`;

  const alternarCursoInteresse = (curso: string) => {
    setCursosInteresseSelecionados(anterior => curso === 'Nenhum curso'
      ? ['Nenhum curso']
      : anterior.includes(curso)
        ? anterior.filter(item => item !== curso)
        : [...anterior.filter(item => item !== 'Nenhum curso'), curso]);
  };

  const selecionarCursoNoDropdown = (curso: string) => {
    alternarCursoInteresse(curso);
  };

  const confirmarCursosNoDropdown = () => {
    cursosDropdownRef.current?.removeAttribute('open');
  };

  useEffect(() => {
    fetch('/api/public/cursos')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Falha ao carregar cursos')))
      .then(data => setCursosInteresse(Array.isArray(data.cursos) ? data.cursos : []))
      .catch(error => console.error('[LandingGratisCapabilidade] cursos:', error))
      .finally(() => setCursosCarregando(false));
  }, []);

  useEffect(() => {
    const fecharAoClicarFora = (event: MouseEvent) => {
      const dropdown = cursosDropdownRef.current;
      if (dropdown?.open && !dropdown.contains(event.target as Node)) dropdown.removeAttribute('open');
    };
    document.addEventListener('mousedown', fecharAoClicarFora);
    return () => document.removeEventListener('mousedown', fecharAoClicarFora);
  }, []);

  const enviar = async (event: React.FormEvent) => {
    event.preventDefault();
    if (nome.trim().length < 2) { setState('err'); setMessage('Informe seu nome.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setState('err'); setMessage('Informe um e-mail válido.'); return; }
    if (!profissao.trim()) { setState('err'); setMessage('Informe sua profissão.'); return; }
    if (cursosInteresseSelecionados.length === 0) { setState('err'); setMessage('Escolha pelo menos um curso ou selecione “Nenhum curso”.'); return; }
    if (cursosInteresseSelecionados.includes('Nenhum curso') && cursosInteresseSelecionados.length > 1) { setState('err'); setMessage('“Nenhum curso” não pode ser combinado com outros cursos.'); return; }
    const pais = paisSelecionado;
    const numeroWhatsapp = whatsapp.replace(/\D/g, '');
    if (numeroWhatsapp.length < pais.min || numeroWhatsapp.length > pais.max || !/^[1-9]\d+$/.test(numeroWhatsapp)) {
      setState('err'); setMessage(`Informe um WhatsApp válido para ${pais.nome} (${pais.min === pais.max ? `${pais.min}` : `${pais.min} a ${pais.max}`} dígitos, sem o código do país).`); return;
    }
    if (!aceitouTermos) { setState('err'); setMessage('Aceite os termos e condições para continuar.'); return; }
    setState('sending'); setMessage('');
    try {
      const response = await fetch('/api/public/acesso-gratis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto: 'capabilidade-processo', nome: nome.trim(), email: email.trim(), profissao: profissao.trim(), interesseCursos: cursosInteresseSelecionados, whatsapp: `${codigoPais.trim()} ${whatsapp.trim()}` }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Não foi possível liberar seu acesso.');
      setState('ok');
    } catch (error: any) {
      setState('err'); setMessage(error?.message || 'Não foi possível liberar seu acesso.');
    }
  };

  const renderForm = () => (
    <div className="form-box">{state === 'ok' ? <div className="success"><div className="mark">✅</div><h3>Seu acesso foi liberado!</h3><p>Enviamos os dados de acesso para <strong style={{ color: '#fff' }}>{email}</strong>. Confira também a caixa de spam.</p><a className="cta" href="https://israel.educacaopelotrabalho.com">Entrar na plataforma →</a></div> : <><h3>Libere seu pacote gratuito</h3><p>Preencha seus dados. O sistema cria seu acesso e envia as instruções por e-mail.</p><form onSubmit={enviar}><input aria-label="Nome" placeholder="Seu nome" value={nome} onChange={e => setNome(e.target.value)} autoComplete="name" required /><input aria-label="E-mail" type="email" placeholder="Seu melhor e-mail" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required /><input aria-label="Profissão" placeholder="Sua profissão" value={profissao} onChange={e => setProfissao(e.target.value)} autoComplete="organization-title" required /><div className="whatsapp-row" style={{ display: 'grid', gridTemplateColumns: '30% 70%', gap: 8, marginTop: 11 }}><select aria-label="País do WhatsApp" value={codigoPais} onChange={e => setCodigoPais(e.target.value)} required style={SELECT_STYLE}><option value="" disabled>Escolha o país</option>{PAISES_WHATSAPP.map(pais => <option key={`${pais.nome}-${pais.codigo}`} value={pais.codigo}>{pais.nome} ({pais.codigo})</option>)}</select><input aria-label="WhatsApp" placeholder="Seu WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} autoComplete="tel" required /></div>{whatsapp && <p style={{ color: whatsappFormatoValido ? '#6ee7b7' : '#fca5a5', fontSize: 12, margin: '-4px 0 10px' }}>{whatsappFormatoValido ? `Formato válido para ${paisSelecionado.nome}.` : `Verifique o formato: ${paisSelecionado.min === paisSelecionado.max ? paisSelecionado.min : `${paisSelecionado.min} a ${paisSelecionado.max}`} dígitos, sem o código do país.`}</p>}<details ref={cursosDropdownRef} style={{ position: 'relative', marginTop: 11 }}><summary aria-label="Outros cursos de interesse" style={{ ...SELECT_STYLE, cursor: 'pointer', listStyle: 'none' }}>{resumoCursos}</summary><div style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 6px)', left: 0, right: 0, maxHeight: 230, overflowY: 'auto', padding: 8, borderRadius: 10, border: '1px solid rgba(148,163,184,.3)', background: '#0b1426', boxShadow: '0 18px 35px rgba(0,0,0,.4)' }}>{cursosInteresse.map(curso => <label key={curso} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', color: '#fff', fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={cursosInteresseSelecionados.includes(curso)} onChange={() => selecionarCursoNoDropdown(curso)} style={{ display: 'inline-block', width: 16, height: 16, padding: 0, margin: 0, flex: '0 0 auto' }} />{curso}</label>)}<label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px', color: '#fff', fontSize: 13, cursor: 'pointer', borderTop: '1px solid rgba(148,163,184,.18)', marginTop: 4 }}><input type="checkbox" checked={cursosInteresseSelecionados.includes('Nenhum curso')} onChange={() => selecionarCursoNoDropdown('Nenhum curso')} style={{ display: 'inline-block', width: 16, height: 16, padding: 0, margin: 0, flex: '0 0 auto' }} />Nenhum curso</label><button type="button" onClick={confirmarCursosNoDropdown} style={{ width: '100%', marginTop: 8, padding: '9px 12px', border: 0, borderRadius: 8, background: '#2563EB', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Selecionar</button></div></details>{state === 'err' && <p className="error">{message}</p>}<button className="cta" disabled={state === 'sending'}>{state === 'sending' ? 'Liberando acesso…' : 'Quero acessar gratuitamente →'}</button><label className="terms-check"><input type="checkbox" checked={aceitouTermos} onChange={e => { setAceitouTermos(e.target.checked); if (e.target.checked && state === 'err') { setState('idle'); setMessage(''); } }} /><span>Concordo com os <a href="/termos-gratuitos" target="_blank" rel="noreferrer">termos e condições deste treinamento</a>.</span></label></form></>}</div>
  );

  return <div className="lgc"><style>{CSS}</style><style>{'.lgc .hero-form details{border:0;padding:0;background:transparent;border-radius:0}'}</style>
    <header className="top"><div className="wrap"><div className="brand">LBW <span>·</span> EDUCAÇÃO PELO TRABALHO</div></div></header>
    <main>
      <section className="hero"><div className="wrap hero-grid">
        <div className="hero-copy"><span className="eyebrow">Pacote gratuito · Capabilidade</span><h1>Entenda se o seu processo é <span className="grad">capaz de entregar o que promete.</span></h1><p className="lead">Aprenda a interpretar e gerar a capabilidade do processo através de aulas completas, exercícios e software estatístico gratuito para fazer as análises. Tudo isso dentro da melhor e mais completa plataforma em gerenciamento de projetos de melhoria.</p><div className="hero-benefits"><div className="benefit"><div className="benefit-icon">🎥</div><div><h3>Assista videoaulas</h3><p>Aprenda a interpretar a capabilidade.</p></div></div><div className="benefit"><div className="benefit-icon">📊</div><div><h3>Faça as análises estatísticas</h3><p>Use o software gratuito.</p></div></div><div className="benefit"><div className="benefit-icon">🤖</div><div><h3>Converse com a IA digital</h3><p>Tire dúvidas sobre os resultados.</p></div></div></div></div>
        <div className="hero-form" id="cadastro">{renderForm()}</div>
      </div></section>

    </main><RodapeInstitucional />
  </div>;
}
