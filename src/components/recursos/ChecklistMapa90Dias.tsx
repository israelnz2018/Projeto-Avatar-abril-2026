/**
 * ChecklistMapa90Dias — o conteúdo "O Mapa dos 90 Dias" renderizado dentro do modal
 * da RecursosView. 60 ações (1 por dia), 12 semanas, 3 fases. Borda decorativa.
 * Checkboxes marcáveis (estado local, não persiste — é um material de apoio/impressão).
 */
import React, { useMemo, useState } from 'react';

export type Fase = 'f1' | 'f2' | 'f3';
export interface Semana { fase: Fase; sw: string; titulo: string; dias: { d: string; txt: string }[]; }

export const SEMANAS: Semana[] = [
  { fase: 'f1', sw: 'Sem 1', titulo: 'POP e SIPOC — o que a área faz', dias: [
    { d: 'Dia 1', txt: 'Listei as principais atividades que a área executa no dia a dia' },
    { d: 'Dia 2', txt: 'Identifiquei e li os principais procedimentos que existem na minha área (POP)' },
    { d: 'Dia 3', txt: 'Mapeei as Entradas e Saídas das principais atividades (SIPOC)' },
    { d: 'Dia 4', txt: 'Identifiquei Fornecedores e Clientes das principais saídas (SIPOC)' },
    { d: 'Dia 5', txt: 'Montei o mapa das principais atividades da minha área (SIPOC)' },
  ]},
  { fase: 'f1', sw: 'Sem 2', titulo: 'Organograma e pessoas-chave', dias: [
    { d: 'Dia 6', txt: 'Desenhei quem reporta a quem na área (ORGANOGRAMA)' },
    { d: 'Dia 7', txt: 'Marquei quem decide, quem aprova e quem executa (ORGANOGRAMA)' },
    { d: 'Dia 8', txt: 'Identifiquei os especialistas da área' },
    { d: 'Dia 9', txt: 'Agendei conversa com cada pessoa-chave' },
    { d: 'Dia 10', txt: 'Anotei o que cada pessoa-chave espera do meu trabalho' },
  ]},
  { fase: 'f1', sw: 'Sem 3', titulo: 'Mapa do processo e RACI', dias: [
    { d: 'Dia 11', txt: 'Mapeei o fluxo dos principais processos, do início ao fim (MAPA DE PROCESSO)' },
    { d: 'Dia 12', txt: 'Criei o rascunho do mapa do processo (MAPA DE PROCESSO)' },
    { d: 'Dia 13', txt: 'Criei o mapa do processo funcional (MAPA DE PROCESSO)' },
    { d: 'Dia 14', txt: 'Defini quem é Responsável, Aprovador, Consultado e Informado (RACI)' },
    { d: 'Dia 15', txt: 'Validei o mapa e as responsabilidades com alguém experiente (RACI)' },
  ]},
  { fase: 'f1', sw: 'Sem 4', titulo: 'Indicadores: técnicos, estratégicos e operacionais', dias: [
    { d: 'Dia 16', txt: 'Levantei os indicadores operacionais — o dia a dia da área (INDICADORES)' },
    { d: 'Dia 17', txt: 'Levantei os indicadores técnicos — qualidade, tempo, retrabalho (INDICADORES)' },
    { d: 'Dia 18', txt: 'Entendi os indicadores estratégicos — o que a diretoria acompanha (INDICADORES)' },
    { d: 'Dia 19', txt: 'Descobri quais indicadores estão associados com o meu trabalho (INDICADORES)' },
    { d: 'Dia 20', txt: 'Conversei com o líder para entender as prioridades dos indicadores' },
  ]},
  { fase: 'f2', sw: 'Sem 5', titulo: 'Ideias de projetos de melhoria', dias: [
    { d: 'Dia 21', txt: 'Listei os problemas que observei nas primeiras semanas' },
    { d: 'Dia 22', txt: 'Perguntei ao time: "o que mais atrapalha vocês aqui?"' },
    { d: 'Dia 23', txt: 'Cruzei os problemas com os indicadores ruins da Semana 4' },
    { d: 'Dia 24', txt: 'Separei reclamação de problema real, com impacto medível' },
    { d: 'Dia 25', txt: 'Cheguei a uma lista de 5 a 10 ideias de projeto (IDEIAS DE PROJETO DE MELHORIA)' },
  ]},
  { fase: 'f2', sw: 'Sem 6', titulo: 'Priorização das ideias', dias: [
    { d: 'Dia 26', txt: 'Avaliei cada ideia por Gravidade, Urgência e Tendência (GUT)' },
    { d: 'Dia 27', txt: 'Avaliei por Retorno, Alcance e Baixo esforço (RAB)' },
    { d: 'Dia 28', txt: 'Ouvi a opinião de pessoas-chave sobre as ideias mais bem pontuadas' },
    { d: 'Dia 29', txt: 'Descartei o grande demais e o pequeno demais' },
    { d: 'Dia 30', txt: 'Escolhi UM projeto: viável de concluir e relevante de ser percebido' },
  ]},
  { fase: 'f2', sw: 'Sem 7', titulo: 'Detalhamento do projeto de melhoria', dias: [
    { d: 'Dia 31', txt: 'Escrevi o problema em uma frase clara — o quê, onde, desde quando (ENTENDENDO O PROBLEMA)' },
    { d: 'Dia 32', txt: 'Defini a meta do projeto: de quanto pra quanto, até quando' },
    { d: 'Dia 33', txt: 'Delimitei o escopo: o que está dentro e o que está fora' },
    { d: 'Dia 34', txt: 'Identifiquei quem precisa apoiar o projeto' },
    { d: 'Dia 35', txt: 'Tenho um projeto definido, com dono e escopo — Fase 2 concluída' },
  ]},
  { fase: 'f2', sw: 'Sem 8', titulo: 'Entendendo as variáveis do processo', dias: [
    { d: 'Dia 36', txt: 'Listei as variáveis que afetam o resultado do processo' },
    { d: 'Dia 37', txt: 'Separei o que eu posso controlar do que eu não controlo' },
    { d: 'Dia 38', txt: 'Coletei dados de como o processo se comporta hoje' },
    { d: 'Dia 39', txt: 'Registrei a situação ANTES com número, foto ou evidência' },
    { d: 'Dia 40', txt: 'Entendi quais variáveis mais influenciam o problema' },
  ]},
  { fase: 'f3', sw: 'Sem 9', titulo: 'Analisando e identificando as causas raízes', dias: [
    { d: 'Dia 41', txt: 'Montei o diagrama das possíveis causas (ISHIKAWA)' },
    { d: 'Dia 42', txt: 'Fui além da primeira causa até a raiz (5 PORQUÊS)' },
    { d: 'Dia 43', txt: 'Analisei os dados coletados no software LBW (ANÁLISE GRÁFICA E ESTATÍSTICA)' },
    { d: 'Dia 44', txt: 'Confirmei a causa raiz com dado, não com achismo' },
    { d: 'Dia 45', txt: 'Priorizei as causas que mais impactam o problema' },
  ]},
  { fase: 'f3', sw: 'Sem 10', titulo: 'Identificando as melhores soluções', dias: [
    { d: 'Dia 46', txt: 'Levantei possíveis soluções para cada causa raiz' },
    { d: 'Dia 47', txt: 'Avaliei as soluções por esforço e benefício (ESFORÇO × BENEFÍCIO)' },
    { d: 'Dia 48', txt: 'Escolhi a solução que dá pra implementar no meu nível' },
    { d: 'Dia 49', txt: 'Validei a solução escolhida com as pessoas-chave' },
    { d: 'Dia 50', txt: 'Prevejo o resultado esperado da solução' },
  ]},
  { fase: 'f3', sw: 'Sem 11', titulo: 'Implementação do plano de ação', dias: [
    { d: 'Dia 51', txt: 'Montei o plano de ação — o quê, quem, quando (PLANO DE AÇÃO)' },
    { d: 'Dia 52', txt: 'Comuniquei o plano a quem será envolvido' },
    { d: 'Dia 53', txt: 'Coloquei a solução em prática, mesmo que em piloto' },
    { d: 'Dia 54', txt: 'Acompanhei a execução e ajustei o que não funcionou' },
    { d: 'Dia 55', txt: 'Registrei a situação DEPOIS com o novo número ou evidência' },
  ]},
  { fase: 'f3', sw: 'Sem 12', titulo: 'Apresentando os resultados', dias: [
    { d: 'Dia 56', txt: 'Montei a comparação com números (ANTES × DEPOIS)' },
    { d: 'Dia 57', txt: 'Gerei o PPT da melhoria pelo software LBW' },
    { d: 'Dia 58', txt: 'Ajustei a apresentação com a história do projeto' },
    { d: 'Dia 59', txt: 'Ensaiei apresentar minha primeira melhoria em poucos minutos' },
    { d: 'Dia 60', txt: 'Apresentei o resultado — Fase 3 concluída' },
  ]},
];

export const FASE_META: Record<Fase, { num: string; nome: string; meta: string; cor: string }> = {
  f1: { num: 'Dias 1–20', nome: 'Entenda como sua área funciona', cor: '#0033CC', meta: 'Meta: você PRECISA saber como as principais atividades da sua área funcionam.' },
  // (verbos por fase: F1 PRECISA · F2 DEVE · F3 VAI — escala de compromisso crescente)
  f2: { num: 'Dias 21–40', nome: 'Encontre o problema certo', cor: '#7C3AED', meta: 'Meta: você DEVE identificar as causas do principal problema que você pode melhorar.' },
  f3: { num: 'Dias 41–60', nome: 'Entregue e mostre o resultado', cor: '#0F9D58', meta: 'Meta: você VAI implementar uma melhoria e celebrar os resultados com todo o time.' },
};

export default function ChecklistMapa90Dias() {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setMarcados((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const total = 60;
  const feitos = marcados.size;
  const pct = Math.round((feitos / total) * 100);

  const fases: Fase[] = ['f1', 'f2', 'f3'];
  const porFase = useMemo(() => {
    const m: Record<Fase, Semana[]> = { f1: [], f2: [], f3: [] };
    SEMANAS.forEach((s) => m[s.fase].push(s));
    return m;
  }, []);

  return (
    <div style={{ border: '3px double #1E2D6E', borderRadius: 6, background: '#fff', overflow: 'hidden' }}>
      <div style={{ border: '1px solid #dfe4f0', margin: 6, borderRadius: 3 }}>
        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg,#1E2D6E,#0033CC)', color: '#fff', padding: '20px 26px' }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.2em', textTransform: 'uppercase', opacity: .85, marginBottom: 6 }}>
            Kit 90 Dias · LBW — Educação pelo Trabalho
          </div>
          <h1 style={{ fontSize: 25, fontWeight: 800, margin: '0 0 5px', fontFamily: "'Space Grotesk', Inter, sans-serif" }}>O Mapa dos 90 Dias</h1>
          <p style={{ fontSize: 12, opacity: .92, margin: 0, maxWidth: 600, lineHeight: 1.4 }}>
            Seu checklist de progresso — 60 ações, uma por dia. Marque cada item conforme avança.
          </p>
          <div className="no-print" style={{ marginTop: 16, background: 'rgba(255,255,255,.15)', borderRadius: 100, height: 9, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: pct + '%', background: '#fff', borderRadius: 100, transition: 'width .3s' }} />
          </div>
          <div className="no-print" style={{ fontSize: 11.5, fontWeight: 700, marginTop: 7, opacity: .9 }}>{feitos} de {total} concluídos · {pct}%</div>
        </div>

        {/* Fases */}
        {fases.map((f) => {
          const meta = FASE_META[f];
          return (
            <div key={f} style={{ padding: '12px 24px 2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1.5px solid #dfe4f0', paddingBottom: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 5, color: '#fff', background: meta.cor, whiteSpace: 'nowrap' }}>{meta.num}</span>
                <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0A0F24', margin: 0, fontFamily: "'Space Grotesk', Inter, sans-serif" }}>{meta.nome}</h2>
              </div>
              <div style={{ fontSize: 10.5, color: '#6B7280', fontStyle: 'italic', marginBottom: 10 }}>{meta.meta}</div>

              {porFase[f].map((sem) => (
                <div
                  key={sem.sw}
                  // Semana 7 abre a 2ª folha (Folha 1 = Sem 1-6, Folha 2 = Sem 7-12).
                  className={sem.sw === 'Sem 7' ? 'quebra-folha' : undefined}
                  style={{ marginBottom: 9, breakInside: 'avoid' }}
                >
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: '#0A0F24', marginBottom: 3, display: 'flex', gap: 7, alignItems: 'baseline' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 4, color: '#fff', background: meta.cor }}>{sem.sw}</span>
                    {sem.titulo}
                  </div>
                  {sem.dias.map((dia) => {
                    const k = sem.sw + dia.d;
                    const on = marcados.has(k);
                    return (
                      <label key={k} onClick={() => toggle(k)} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 4px 3px 22px', borderRadius: 6, cursor: 'pointer', fontSize: 11.5, lineHeight: 1.32 }}>
                        <span style={{ fontWeight: 800, color: '#6B7280', flexShrink: 0, fontSize: 10, minWidth: 34 }}>{dia.d}</span>
                        <span style={{ width: 14, height: 14, border: `1.6px solid ${on ? meta.cor : '#c3cbe0'}`, background: on ? meta.cor : '#fff', borderRadius: 4, flexShrink: 0, marginTop: 1, position: 'relative', display: 'inline-block' }}>
                          {on && <span style={{ position: 'absolute', color: '#fff', fontSize: 10, fontWeight: 900, top: -3, left: 1.5 }}>✓</span>}
                        </span>
                        <span style={{ textDecoration: on ? 'line-through' : 'none', color: on ? '#6B7280' : '#2A2F3A' }}>{dia.txt}</span>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        })}

        {/* Entrega final */}
        <div style={{ margin: '8px 24px 4px', background: 'linear-gradient(135deg,#0F9D58,#0b7a44)', color: '#fff', borderRadius: 10, padding: '12px 18px' }}>
          <h3 style={{ fontSize: 13, marginBottom: 6, fontFamily: "'Space Grotesk', sans-serif" }}>🏁 Ao final dos 90 dias, você terá nas mãos:</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px 16px', fontSize: 10.5 }}>
            {['Um SIPOC + mapa da sua área', 'Um projeto escolhido com critério', 'A análise de causa raiz', 'Um plano de ação executado', 'Um antes × depois com números', 'Um PPT da sua primeira melhoria'].map((t) => (
              <span key={t} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontWeight: 900, background: 'rgba(255,255,255,.22)', borderRadius: '50%', width: 15, height: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, flexShrink: 0 }}>✓</span>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div style={{ margin: '6px 24px 16px', fontSize: 11, fontStyle: 'italic', color: '#1E2D6E', borderLeft: '3px solid #0033CC', padding: '7px 14px', background: '#F0F2FA', borderRadius: '0 8px 8px 0', lineHeight: 1.4 }}>
          Enquanto a maioria passou 90 dias "tentando entender", você entendeu, agiu e entregou. MEUS PARABÉNS!
        </div>
      </div>
    </div>
  );
}
