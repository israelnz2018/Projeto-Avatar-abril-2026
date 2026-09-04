/**
 * MeusAlunos — gestão completa dos alunos do consultor.
 * Lista + coluna de cursos + editar (cada curso com vencimento e valor próprios,
 * add/remove) + adicionar aluno (nome, email, e por curso: vencimento default 1 ano
 * e valor pago). Tudo no Firebase. Ver PLANO-WHITELABEL.md.
 *
 * A lista literal `cursosAcesso` é a fonte de verdade das permissões.
 */
import { ehTipoDeProjeto } from '../../lib/tipoIniciativa';
import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ChevronDown, Pencil, Plus, Trash2, LockKeyhole, CheckCircle2, Clock3 } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';
import { useUserAccess } from '../../hooks/useUserAccess';
import { getCourses, getInitiatives } from '../../services/configService';
import { empresaIdDireto } from '../../services/consultorService';
import { getUserDocsByConsultor, updateUserNoConsultor } from '../../services/userService';
import { getEducationCourses } from '../../services/educationCourseService';
import { courseNamesMatch, hasCourseAccess } from '../../lib/courseAccess';
import { ANALYTICS_MODULOS, acessoAnalyticsDoAluno, type AnalyticsModulo, type AcessoAnalytics } from '../../services/analyticsModules';
import type { Initiative } from '../../types';

async function authedFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const user = auth.currentUser;
  const headers = new Headers(init.headers || {});
  if (user) headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  return fetch(url, { ...init, headers });
}

interface CursoAcesso { curso: string; vencimento: string | null; valor: number; quantidade: number; }
interface Aluno {
  uid: string; nome: string; email: string; tipo: string; acessou: boolean;
  ultimoAcesso?: string | null;
  dataConvite?: string | null;
  cursosAcesso: CursoAcesso[];
  plano?: string;
  acessoCompletoAte?: string;
  // analytics = ids dos módulos liberados (ver services/analyticsModules).
  // Ausente = aluno legado, ainda sem permissão individual gravada.
  acessoProdutos?: { analytics?: AcessoAnalytics; projetos?: string };
  projetosAcesso?: Array<{ projeto: string; vencimento?: string | null; valor?: number }> | string[];
  unitarioLegado?: boolean;
  empresaId?: string;
  desvinculadoEm?: string;
  avisoBloqueio?: { expiraEm?: string };
  inativo?: boolean;
}

interface ItemAcessoDraft {
  id: string;
  vencimento: string;
  valor: string;
}

interface Equipe {
  empresaId: string;
  nome: string;
  coordenador: string;
  direto?: boolean;
  cursosPermitidos?: string[];
}

const emUmAno = () => new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
const venceu = (v: string | null) => !!v && new Date(v).getTime() < Date.now();
const parseValor = (s: string) => { const n = Number(String(s).replace(',', '.')); return isNaN(n) ? 0 : n; };
// Sem separador de milhar (evita o ponto ser lido como decimal ao reparsear). Vírgula = decimal.
const fmtValor = (v: number) => (v ? String(v).replace('.', ',') : '');
const CURSO_UNITARIO_LEGADO = 'Como Resolver Problemas no Trabalho - Kit 90 dias';
  const resolverCursoUnitario = (catalogo: string[]) => catalogo.find((curso) => {
  const nome = curso.toLocaleLowerCase('pt-BR');
  return nome.includes('resolver problemas no trabalho') && nome.includes('90');
  }) || catalogo.find((curso) => curso.toLocaleLowerCase('pt-BR').includes('resolver problemas no trabalho')) || CURSO_UNITARIO_LEGADO;

export default function MeusAlunos({ embedded = false, empresaIdFiltro, somenteLeitura = false }: { embedded?: boolean; empresaIdFiltro?: string; somenteLeitura?: boolean }) {
  const { consultor, consultorId } = useConsultor();
  const { isAdmin, isConsultor, loading: loadingAcesso } = useUserAccess();
  const [rows, setRows] = useState<Aluno[]>([]);
  const [cursos, setCursos] = useState<string[]>([]);
  const [freeCursos, setFreeCursos] = useState<string[]>([]);
  const [iniciativas, setIniciativas] = useState<Initiative[]>([]);
  const [tiposProjeto, setTiposProjeto] = useState<Initiative[]>([]);
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  // % de vídeos assistidos, vindo pronto do servidor (ver /api/consultor/progresso-alunos).
  // Chega separado do resto porque é só informativo: se falhar, a tela funciona igual.
  const [progresso, setProgresso] = useState<Record<string, { geral: number; porCurso: Record<string, number> }>>({});
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  type CampoOrdenacao = 'alfabetica' | 'convite' | 'ultimoAcesso' | 'projetos' | 'education' | 'analytics' | 'situacao';
  const [ordenacao, setOrdenacao] = useState<CampoOrdenacao>('convite');
  const [ordemAscendente, setOrdemAscendente] = useState(false);
  const [detalheUid, setDetalheUid] = useState<string | null>(null);

  // agrupamento por time — cada grupo (meus próprios alunos + cada coordenador) é um
  // acordeão independente; abre/fecha e tem seu próprio "adicionar aluno" já escopado.
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});
  const [addAbertoEmpresaId, setAddAbertoEmpresaId] = useState<string | null>(null);

  // adicionar — qualquer combinação de cursos, análises e projetos,
  // cada item com vencimento + valor próprios.
  const [aNome, setANome] = useState('');
  const [aEmail, setAEmail] = useState('');
  const [aEmpresaId, setAEmpresaId] = useState('');
  const [aItens, setAItens] = useState<{ curso: string; vencimento: string; valor: string }[]>([]);
  const [aAnalytics, setAAnalytics] = useState<ItemAcessoDraft[]>([]);
  const [aProjetos, setAProjetos] = useState<ItemAcessoDraft[]>([]);
  const [addEnviando, setAddEnviando] = useState(false);
  const [addMsg, setAddMsg] = useState('');

  // editar
  const [editUid, setEditUid] = useState<string | null>(null);
  const [eCursos, setECursos] = useState<CursoAcesso[]>([]);
  const [eAddCurso, setEAddCurso] = useState('');

  // Edição dos acessos por área (Data Analysis / Projects) direto no painel de
  // detalhes. Guarda o rascunho enquanto o consultor marca; só grava no Salvar.
  // Cada seção (Analysis / Projects) tem o próprio botão de editar, então o
  // estado guarda QUAL aluno e QUAL área estão abertos — uma de cada vez.
  const [editArea, setEditArea] = useState<{ uid: string; area: 'analytics' | 'projetos' } | null>(null);
  // Edição unificada: Education, Data Analysis e Projects ficam em um único
  // rascunho e só são gravados pelo botão "Salvar todas as alterações".
  const [editGeralUid, setEditGeralUid] = useState<string | null>(null);
  const [rascunhoAnalytics, setRascunhoAnalytics] = useState<string[]>([]);
  const [rascunhoProjetos, setRascunhoProjetos] = useState<string[]>([]);
  const [rascunhoAnalyticsDetalhes, setRascunhoAnalyticsDetalhes] = useState<ItemAcessoDraft[]>([]);
  const [rascunhoProjetosDetalhes, setRascunhoProjetosDetalhes] = useState<ItemAcessoDraft[]>([]);
  const [salvandoAcessos, setSalvandoAcessos] = useState(false);
  const [msgAcessos, setMsgAcessos] = useState('');
  // Confirmação pós-salvar: pergunta se avisa o aluno por e-mail.
  const [avisoPendente, setAvisoPendente] = useState<{ aluno: Aluno; mudancas: string[] } | null>(null);
  const [enviandoAviso, setEnviandoAviso] = useState(false);
  const [editSalvando, setEditSalvando] = useState(false);
  const [editMsg, setEditMsg] = useState('');
  const [removingUid, setRemovingUid] = useState<string | null>(null);
  const [bloqueados, setBloqueados] = useState<Aluno[]>([]);
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  // Os alunos antigos de acesso unitário compraram o Kit 90 Dias. Esse vínculo não
  // pode depender da ordenação alfabética do catálogo, pois `cursos[0]` pode mudar.
  const cursoUnitario = useMemo(() => {
    return resolverCursoUnitario([...freeCursos, ...cursos]);
  }, [cursos, freeCursos]);

  const cursosEfetivos = (aluno: Aluno): CursoAcesso[] => {
    const atuais = aluno.cursosAcesso.map((curso) => ({ ...curso, quantidade: 1 }));
    if (!aluno.unitarioLegado || atuais.some((curso) => curso.curso === cursoUnitario)) return atuais;
    return [{ curso: cursoUnitario, vencimento: null, valor: 0, quantidade: 1 }, ...atuais];
  };

  const vencimentoPadraoAluno = (aluno: Aluno) => {
    const datas = cursosEfetivos(aluno).map((curso) => curso.vencimento).filter(Boolean) as string[];
    const maisDistante = datas.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
    return maisDistante || (aluno.acessoCompletoAte ? String(aluno.acessoCompletoAte).slice(0, 10) : emUmAno());
  };

  const acessoCurso = (aluno: Aluno, nomeCurso: string) => {
    if (aluno.plano === 'completo') return true;
    return cursosEfetivos(aluno).some((curso) => hasCourseAccess([curso.curso], nomeCurso) && !venceu(curso.vencimento));
  };

  const registroCurso = (aluno: Aluno, nomeCurso: string) =>
    cursosEfetivos(aluno).find((curso) => courseNamesMatch(curso.curso, nomeCurso));

  // Regra vem do serviço (fonte única) — não reimplementar aqui.
  const acessoAnalytics = (aluno: Aluno, modulo: AnalyticsModulo) =>
    acessoAnalyticsDoAluno(aluno.acessoProdutos?.analytics, modulo);

  const acessoProjetoExplicito = (aluno: Aluno, projeto: Initiative) => {
    if (!Array.isArray(aluno.projetosAcesso)) return undefined;
    const encontrado = aluno.projetosAcesso.find((item: any) => {
      const chave = typeof item === 'string' ? item : item?.projeto || item?.projetoId;
      return chave === projeto.id || courseNamesMatch(chave, projeto.name);
    }) as any;
    if (!encontrado) return { liberado: false, valor: undefined, vencimento: null };
    const vencimento = typeof encontrado === 'object' ? encontrado.vencimento || null : null;
    return {
      liberado: !venceu(vencimento),
      valor: typeof encontrado === 'object' && typeof encontrado.valor === 'number' ? encontrado.valor : undefined,
      vencimento,
    };
  };

  const acessoProjeto = (aluno: Aluno, projeto: Initiative) => {
    const explicito = acessoProjetoExplicito(aluno, projeto);
    if (explicito) return explicito;
    if (projeto.somenteProjeto) return { liberado: false, valor: undefined, vencimento: null };
    const cursoAssociado = projeto.cursoAssociadoId
      ? iniciativas.find((item) => item.id === projeto.cursoAssociadoId)
      : projeto;
    const registro = cursoAssociado ? registroCurso(aluno, cursoAssociado.name) : undefined;
    return {
      liberado: !!cursoAssociado && acessoCurso(aluno, cursoAssociado.name),
      valor: registro?.valor,
      vencimento: registro?.vencimento || (aluno.plano === 'completo' ? aluno.acessoCompletoAte || null : null),
    };
  };

  const dataBr = (data?: string | null) => {
    if (!data) return '—';
    const parsed = new Date(data);
    return isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString('pt-BR');
  };

  const ultimoAcessoMs = (aluno: Aluno) => {
    if (!aluno.ultimoAcesso) return 0;
    const ms = new Date(aluno.ultimoAcesso).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  };

  const conviteMs = (aluno: Aluno) => {
    if (!aluno.dataConvite) return 0;
    const ms = new Date(aluno.dataConvite).getTime();
    return Number.isNaN(ms) ? 0 : ms;
  };

  const quantidadeCursosLiberados = (aluno: Aluno) => cursos.filter((curso) => acessoCurso(aluno, curso)).length;
  const quantidadeAnalyticsLiberados = (aluno: Aluno) => ANALYTICS_MODULOS.filter((modulo) => acessoAnalytics(aluno, modulo).liberado).length;
  const quantidadeProjetosLiberados = (aluno: Aluno) => tiposProjeto.filter((projeto) => acessoProjeto(aluno, projeto).liberado).length;
  const pesoSituacao = (aluno: Aluno) => ({ Removido: 0, Limitado: 1, Acesso: 2, Completo: 3 }[situacaoAluno(aluno)] || 0);

  const selecionarOrdenacao = (campo: CampoOrdenacao) => {
    if (ordenacao === campo) {
      setOrdemAscendente((atual) => !atual);
      return;
    }
    setOrdenacao(campo);
    setOrdemAscendente(campo === 'alfabetica');
  };

  const situacaoAluno = (aluno: Aluno) => {
    if (aluno.inativo) return 'Removido';
    const totalCursos = cursos.length;
    const cursosLiberados = cursos.filter((curso) => acessoCurso(aluno, curso)).length;
    const analyticsLiberados = ANALYTICS_MODULOS.filter((modulo) => acessoAnalytics(aluno, modulo).liberado).length;
    const projetosLiberados = tiposProjeto.filter((projeto) => acessoProjeto(aluno, projeto).liberado).length;
    const total = totalCursos + ANALYTICS_MODULOS.length + tiposProjeto.length;
    const liberados = cursosLiberados + analyticsLiberados + projetosLiberados;
    if (liberados === 0) return 'Limitado';
    if (total > 0 && liberados === total) return 'Completo';
    return 'Acesso';
  };

  const toAluno = (d: any): Aluno => {
    const u = d as any;
    let ca: CursoAcesso[] = Array.isArray(u.cursosAcesso)
      ? u.cursosAcesso.map((c: any) => ({ curso: c?.curso, vencimento: c?.vencimento ?? null, valor: typeof c?.valor === 'number' ? c.valor : 0, quantidade: Number(c?.quantidade) || 1 })).filter((c: CursoAcesso) => c.curso)
      : [];
    if (ca.length === 0 && Array.isArray(u.cursosLiberados)) ca = u.cursosLiberados.map((c: string) => ({ curso: c, vencimento: null, valor: 0, quantidade: 1 }));
    return {
      uid: d.id,
      nome: u.nome || u.displayName || (u.email ? String(u.email).split('@')[0] : '-'),
      email: u.email || '',
      tipo: u.tipoUsuario || 'aluno',
      acessou: !!u.primeiroAcessoEm,
      ultimoAcesso: u.lastLogin || u.ultimoAcessoEm || u.ultimoAcesso || null,
      dataConvite: u.conviteEm || u.criadoEm || u.createdAt || u.dataConvite || null,
      cursosAcesso: ca,
      unitarioLegado: ca.length === 0 && u.plano !== 'completo',
      desvinculadoEm: u.desvinculadoEm,
      avisoBloqueio: u.avisoBloqueio,
      plano: u.plano,
      acessoCompletoAte: u.acessoCompletoAte,
      acessoProdutos: u.acessoProdutos,
      projetosAcesso: u.projetosAcesso,
      inativo: true,
    };
  };

  const carregar = async () => {
    setLoading(true);
    // Não entra no Promise.all abaixo de propósito: o progresso é informativo e não
    // pode atrasar nem derrubar o carregamento da lista de alunos.
    // Espera o auth existir: abrindo a página direto nesta rota, o carregar() dispara
    // antes de o Firebase popular o currentUser, e a chamada sairia sem token (401).
    (async () => {
      if (!auth.currentUser) {
        await new Promise<void>((resolve) => {
          const unsub = onAuthStateChanged(auth, (u) => { if (u) { unsub(); resolve(); } });
          setTimeout(() => { unsub(); resolve(); }, 8000);
        });
      }
      try {
        const r = await authedFetch('/api/consultor/progresso-alunos');
        if (!r.ok) return;
        const d = await r.json();
        if (d?.progresso) setProgresso(d.progresso);
      } catch { /* progresso é opcional — a tela funciona sem ele */ }
    })();
    try {
      const [userDocs, blockedSnap, inits, catalogoEducacional, todasIniciativas] = await Promise.all([
        getUserDocsByConsultor(consultorId),
        getDocs(query(collection(db, 'users'), where('desvinculadoDe', '==', consultorId))),
        getCourses(),
        getEducationCourses(consultorId),
        getInitiatives(),
      ]);
      const allUsers = userDocs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const gratis = inits.filter((i) => i.isFree === true).map((i) => i.name).filter(Boolean);
      const nomesCursos = catalogoEducacional.map((curso) => curso.name);
      const lista: Aluno[] = allUsers
        .map((d) => {
          const u = d as any;
          let ca: CursoAcesso[] = Array.isArray(u.cursosAcesso)
            ? u.cursosAcesso.map((c: any) => ({ curso: c?.curso, vencimento: c?.vencimento ?? null, valor: typeof c?.valor === 'number' ? c.valor : 0, quantidade: Number(c?.quantidade) || 1 })).filter((c: CursoAcesso) => c.curso)
            : [];
          if (ca.length === 0 && Array.isArray(u.cursosLiberados)) ca = u.cursosLiberados.map((c: string) => ({ curso: c, vencimento: null, valor: 0, quantidade: 1 }));
          return {
            uid: d.id,
            nome: u.nome || u.displayName || (u.email ? String(u.email).split('@')[0] : '—'),
            email: u.email || '',
            tipo: u.tipoUsuario || 'aluno',
            acessou: !!u.primeiroAcessoEm,
            ultimoAcesso: u.lastLogin || u.ultimoAcessoEm || u.ultimoAcesso || null,
            dataConvite: u.conviteEm || u.criadoEm || u.createdAt || u.dataConvite || null,
            cursosAcesso: ca,
            plano: u.plano,
            acessoCompletoAte: u.acessoCompletoAte,
            acessoProdutos: u.acessoProdutos,
            projetosAcesso: u.projetosAcesso,
            unitarioLegado: ca.length === 0 && u.plano !== 'completo',
            empresaId: u.empresaId ? String(u.empresaId) : undefined,
          };
        })
        .filter((u) => u.tipo !== 'admin' && u.tipo !== 'coordenador' && u.tipo !== 'consultor')
        .sort((a, b) => a.nome.localeCompare(b.nome));
      const equipesMap = new Map<string, Equipe>();
      allUsers
        .filter((u: any) => u.tipoUsuario === 'coordenador' && u.empresaId)
        .forEach((u: any) => {
          const cursosPermitidos = (Array.isArray(u.cursosAcesso) ? u.cursosAcesso : [])
            .filter((c: any) => !c?.vencimento || new Date(c.vencimento).getTime() >= Date.now())
            .map((c: any) => String(c?.curso || '').trim())
            .filter(Boolean);
          equipesMap.set(String(u.empresaId), {
            empresaId: String(u.empresaId),
            nome: u.empresaNome || u.nome || u.empresaId,
            coordenador: u.nome || u.email || 'Coordenador',
            cursosPermitidos,
          });
        });
      setRows(lista);
      setBloqueados(blockedSnap.docs.map((d) => toAluno({ id: d.id, ...(d.data() as any) })).filter((u) => u.tipo !== 'admin' && u.tipo !== 'coordenador' && u.tipo !== 'consultor').sort((a, b) => (b.desvinculadoEm || '').localeCompare(a.desvinculadoEm || '')));
      setCursos(nomesCursos);
      setFreeCursos(gratis);
      setIniciativas(todasIniciativas);
      setTiposProjeto(todasIniciativas.filter(ehTipoDeProjeto));
      // "Alunos diretos" sempre disponível no topo — um único grupo fixo, sem coordenador,
      // pro consultor atender aluno avulso sem precisar de uma conta de coordenador fake.
      const equipesReais = Array.from(equipesMap.values()).sort((a, b) => a.nome.localeCompare(b.nome));
      setEquipes([
        { empresaId: empresaIdDireto(consultorId), nome: 'Meus próprios alunos', coordenador: consultor.branding.nome || 'você', direto: true },
        ...equipesReais,
      ]);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [consultorId]);

  // Agrupa os alunos ativos por time (empresaId) — cada time é um acordeão em
  // "Alunos na Plataforma". Busca filtra dentro dos grupos. Aluno legado sem empresaId
  // (cadastrado antes dessa hierarquia existir) cai direto em "Meus próprios alunos".
  const alunosPorEmpresa = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const direto = empresaIdDireto(consultorId);
    const mapa = new Map<string, Aluno[]>();
    for (const a of rows) {
      if (t && !a.nome.toLowerCase().includes(t) && !a.email.toLowerCase().includes(t)) continue;
      const key = a.empresaId || direto;
      if (!mapa.has(key)) mapa.set(key, []);
      mapa.get(key)!.push(a);
    }
    for (const alunos of mapa.values()) {
      alunos.sort((a, b) => {
        let resultado = 0;
        if (ordenacao === 'alfabetica') resultado = a.nome.localeCompare(b.nome, 'pt-BR');
        if (ordenacao === 'convite') resultado = conviteMs(a) - conviteMs(b);
        if (ordenacao === 'ultimoAcesso') resultado = ultimoAcessoMs(a) - ultimoAcessoMs(b);
        if (ordenacao === 'projetos') resultado = quantidadeProjetosLiberados(a) - quantidadeProjetosLiberados(b);
        if (ordenacao === 'education') resultado = quantidadeCursosLiberados(a) - quantidadeCursosLiberados(b);
        if (ordenacao === 'analytics') resultado = quantidadeAnalyticsLiberados(a) - quantidadeAnalyticsLiberados(b);
        if (ordenacao === 'situacao') resultado = pesoSituacao(a) - pesoSituacao(b);
        if (resultado !== 0) return (ordemAscendente ? 1 : -1) * resultado;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      });
    }
    return mapa;
  }, [rows, busca, consultorId, ordenacao, ordemAscendente, tiposProjeto, iniciativas, cursos]);
  const buscando = busca.trim().length > 0;
  const empresaDiretaId = empresaIdDireto(consultorId);

  if (loadingAcesso) return <div className="p-8 text-gray-500">Carregando…</div>;
  if (!isAdmin && !isConsultor) return <div className="p-8 text-red-600 font-bold">Apenas consultores e admins gerenciam alunos dos times.</div>;

  // ----- adicionar -----
  const toggleCursoAdd = (curso: string) =>
    setAItens((p) => p.some((i) => i.curso === curso)
      ? p.filter((i) => i.curso !== curso)
      : [...p, { curso, vencimento: emUmAno(), valor: '' }]);
  const setItemVenc = (curso: string, v: string) => setAItens((p) => p.map((i) => (i.curso === curso ? { ...i, vencimento: v } : i)));
  const setItemValor = (curso: string, v: string) => setAItens((p) => p.map((i) => (i.curso === curso ? { ...i, valor: v.replace(/[^\d.,]/g, '') } : i)));

  async function adicionar() {
    const mail = aEmail.trim().toLowerCase();
    if (!mail || mail.indexOf('@') < 0) { setAddMsg('Informe um e-mail válido.'); return; }
    if (!aEmpresaId) { setAddMsg('Escolha o time/coordenador do aluno.'); return; }
    if (aItens.length === 0 && aAnalytics.length === 0 && aProjetos.length === 0) { setAddMsg('Escolha ao menos um curso, análise ou projeto.'); return; }
    if (aItens.some((i) => !i.vencimento) || aAnalytics.some((i) => !i.vencimento) || aProjetos.some((i) => !i.vencimento)) {
      setAddMsg('Informe a data de expiração de todos os itens liberados.');
      return;
    }
    setAddEnviando(true); setAddMsg('');
    try {
      const cursosAcesso = aItens.map((i) => ({ curso: i.curso, vencimento: i.vencimento || null, valor: parseValor(i.valor) }));
      const acessoProdutos = {
        analytics: aAnalytics.map((item) => ({ modulo: item.id, nome: ANALYTICS_MODULOS.find((m) => m.id === item.id)?.nome || item.id, vencimento: item.vencimento || null, valor: parseValor(item.valor) })),
      };
      const projetosAcesso = aProjetos.map((item) => ({ projeto: item.id, nome: tiposProjeto.find((p) => p.id === item.id)?.name || item.id, vencimento: item.vencimento || null, valor: parseValor(item.valor) }));
      const valorPago = cursosAcesso.reduce((s, c) => s + c.valor, 0)
        + aAnalytics.reduce((s, item) => s + parseValor(item.valor), 0)
        + aProjetos.reduce((s, item) => s + parseValor(item.valor), 0);
      const r = await authedFetch('/api/aluno/convidar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: mail, nome: aNome.trim(), empresaId: aEmpresaId || undefined, cursosAcesso, acessoProdutos, projetosAcesso, valorPago }),
      });
      const j = await r.json().catch(() => ({} as any));
      if (r.ok) {
        setAddMsg(`✅ Aluno ${j.status}${j.emailEnviado ? '' : ' (e-mail falhou)'}`);
         setANome(''); setAEmail(''); setAItens([]); setAAnalytics([]); setAProjetos([]);
        setAddAbertoEmpresaId(null);
        carregar();
      } else setAddMsg('❌ ' + (j.error || 'erro'));
    } catch (e: any) { setAddMsg('❌ ' + (e?.message || e)); }
    finally { setAddEnviando(false); }
  }

  // ----- editar -----
  function abrirEdit(a: Aluno) {
    setEditUid(a.uid);
    setECursos(cursosEfetivos(a));
    setEAddCurso('');
    setEditMsg('');
  }
  const setVenc = (curso: string, v: string) => setECursos((p) => p.map((c) => (courseNamesMatch(c.curso, curso) ? { ...c, vencimento: v || null } : c)));
  const setValorCurso = (curso: string, v: string) => setECursos((p) => p.map((c) => (courseNamesMatch(c.curso, curso) ? { ...c, valor: parseValor(v.replace(/[^\d.,]/g, '')) } : c)));
  const removerCurso = (curso: string) => setECursos((p) => p.filter((c) => !courseNamesMatch(c.curso, curso)));
  const addCursoEdit = () => {
    if (!eAddCurso || eCursos.some((c) => c.curso === eAddCurso)) return;
    setECursos((p) => [...p, { curso: eAddCurso, vencimento: emUmAno(), valor: 0, quantidade: 1 }]);
    setEAddCurso('');
  };

  const alternarCursoEdit = (curso: string, liberado: boolean) => {
    setECursos((p) => {
      const existente = p.some((item) => courseNamesMatch(item.curso, curso));
      if (!liberado) return p.filter((item) => !courseNamesMatch(item.curso, curso));
      if (existente) return p;
      return [...p, { curso, vencimento: emUmAno(), valor: 0, quantidade: 1 }];
    });
  };

  function abrirEdicaoGeral(a: Aluno) {
    if (editGeralUid === a.uid) {
      setEditGeralUid(null);
      setEditUid(null);
      setEditArea(null);
      return;
    }
    setEditGeralUid(a.uid);
    setEditUid(a.uid);
    const vencimentoPadrao = vencimentoPadraoAluno(a);
    setECursos(cursosEfetivos(a).map((curso) => ({ ...curso, vencimento: curso.vencimento || vencimentoPadrao })));
    setEAddCurso('');
    setEditMsg('');
    setEditArea(null);
    setRascunhoAnalytics(ANALYTICS_MODULOS.filter((m) => acessoAnalytics(a, m).liberado).map((m) => m.id));
    setRascunhoProjetos(tiposProjeto.filter((p) => acessoProjeto(a, p).liberado).map((p) => p.id));
    setRascunhoAnalyticsDetalhes(ANALYTICS_MODULOS
      .filter((m) => acessoAnalytics(a, m).liberado)
      .map((m) => {
        const acesso = acessoAnalytics(a, m);
        return { id: m.id, vencimento: acesso.vencimento || vencimentoPadrao, valor: fmtValor(acesso.valor || 0) };
      }));
    setRascunhoProjetosDetalhes(tiposProjeto
      .filter((p) => acessoProjeto(a, p).liberado)
      .map((p) => {
        const acesso = acessoProjeto(a, p);
        return { id: p.id, vencimento: acesso.vencimento || vencimentoPadrao, valor: fmtValor(acesso.valor || 0) };
      }));
    setMsgAcessos('');
  }

  function cancelarEdicaoGeral() {
    setEditGeralUid(null);
    setEditUid(null);
    setEditArea(null);
    setEditMsg('');
    setMsgAcessos('');
  }

  // Abre a edição dos acessos por área já com o estado atual do aluno marcado.
  // Aluno legado (sem permissão gravada) entra com TUDO marcado, refletindo o que
  // ele enxerga hoje — assim salvar não tira acesso sem o consultor perceber.
  const editandoArea = (a: Aluno, area: 'analytics' | 'projetos') =>
    editArea?.uid === a.uid && editArea.area === area;

  function abrirEditAcessos(a: Aluno, area: 'analytics' | 'projetos') {
    if (editandoArea(a, area)) { setEditArea(null); return; }
    setEditArea({ uid: a.uid, area });
    setMsgAcessos('');
    if (area === 'analytics') {
      setRascunhoAnalytics(ANALYTICS_MODULOS.filter((m) => acessoAnalytics(a, m).liberado).map((m) => m.id));
    } else {
      setRascunhoProjetos(tiposProjeto.filter((p) => acessoProjeto(a, p).liberado).map((p) => p.id));
    }
  }

  const alternar = (lista: string[], id: string) =>
    lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];

  const alternarItemAcesso = (lista: ItemAcessoDraft[], id: string) =>
    lista.some((item) => item.id === id)
      ? lista.filter((item) => item.id !== id)
      : [...lista, { id, vencimento: emUmAno(), valor: '0' }];

  const atualizarItemAcesso = (
    lista: ItemAcessoDraft[],
    id: string,
    campo: 'vencimento' | 'valor',
    valor: string,
  ) => lista.map((item) => item.id === id ? { ...item, [campo]: campo === 'valor' ? valor.replace(/[^\d.,]/g, '') : valor } : item);

  async function salvarAcessos(a: Aluno, area: 'analytics' | 'projetos') {
    setSalvandoAcessos(true);
    setMsgAcessos('');
    try {
      // Descreve em linguagem de gente o que mudou — vira o corpo do e-mail.
      // Só compara a área editada; a outra não é tocada.
      const nomeAnalytics = (id: string) => ANALYTICS_MODULOS.find((m) => m.id === id)?.nome || id;
      const nomeProjeto = (id: string) => tiposProjeto.find((p) => p.id === id)?.name || id;
      let mudancas: string[];
      let patch: Record<string, any>;
      let novoLocal: Partial<Aluno>;

      if (area === 'analytics') {
        const antes = ANALYTICS_MODULOS.filter((m) => acessoAnalytics(a, m).liberado).map((m) => m.id);
        mudancas = [
          ...rascunhoAnalytics.filter((id) => !antes.includes(id)).map((id) => `Liberado em Data Analysis: ${nomeAnalytics(id)}`),
          ...antes.filter((id) => !rascunhoAnalytics.includes(id)).map((id) => `Removido de Data Analysis: ${nomeAnalytics(id)}`),
        ];
        patch = { acessoProdutos: { ...(a.acessoProdutos || {}), analytics: rascunhoAnalytics } };
        novoLocal = { acessoProdutos: { ...(a.acessoProdutos || {}), analytics: rascunhoAnalytics } };
      } else {
        const antes = tiposProjeto.filter((p) => acessoProjeto(a, p).liberado).map((p) => p.id);
        mudancas = [
          ...rascunhoProjetos.filter((id) => !antes.includes(id)).map((id) => `Liberado em Projetos: ${nomeProjeto(id)}`),
          ...antes.filter((id) => !rascunhoProjetos.includes(id)).map((id) => `Removido de Projetos: ${nomeProjeto(id)}`),
        ];
        patch = { projetosAcesso: rascunhoProjetos };
        novoLocal = { projetosAcesso: rascunhoProjetos };
      }

      await updateUserNoConsultor(a.uid, consultorId, patch);
      setRows((p) => p.map((r) => (r.uid === a.uid ? { ...r, ...novoLocal } : r)));
      setEditArea(null);

      if (mudancas.length === 0) {
        setMsgAcessos('Nada mudou.');
        return;
      }
      setMsgAcessos('✅ Acessos salvos.');
      // Salvou primeiro; o aviso é opcional e o consultor decide agora.
      if (a.email) setAvisoPendente({ aluno: a, mudancas });
    } catch (e: any) {
      setMsgAcessos('❌ ' + (e?.message || e));
    } finally {
      setSalvandoAcessos(false);
    }
  }

  async function enviarAvisoAlteracao() {
    if (!avisoPendente) return;
    setEnviandoAviso(true);
    try {
      const r = await authedFetch('/api/acesso/alteracao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: avisoPendente.aluno.email, nome: avisoPendente.aluno.nome, mudancas: avisoPendente.mudancas }),
      });
      const j = await r.json().catch(() => ({} as any));
      setMsgAcessos(r.ok && j.ok ? '✅ Acessos salvos e aviso enviado por e-mail.' : '✅ Acessos salvos. O e-mail de aviso falhou.');
    } catch {
      setMsgAcessos('✅ Acessos salvos. O e-mail de aviso falhou.');
    } finally {
      setEnviandoAviso(false);
      setAvisoPendente(null);
    }
  }

  async function salvarEdit(uid: string) {
    setEditSalvando(true); setEditMsg('');
    try {
      const anterior = rows.find((r) => r.uid === uid);
      const cursosAnteriores = anterior ? cursosEfetivos(anterior) : [];
      const cursosNovos = eCursos.filter((novo) => !cursosAnteriores.some((antigo) => antigo.curso === novo.curso));
      const valorPago = eCursos.reduce((s, c) => s + (c.valor || 0), 0);
      await updateUserNoConsultor(uid, consultorId, {
        plano: 'por_curso',
        modeloAcesso: 'por_curso',
        cursosAcesso: eCursos,
        cursosLiberados: eCursos.map((curso) => curso.curso),
        valorPago,
      });
      if (cursosNovos.length > 0 && anterior?.email) {
        await authedFetch('/api/acesso/novo-curso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: anterior.email, nome: anterior.nome, cursos: cursosNovos.map((c) => c.curso) }) });
      }
      setRows((p) => p.map((r) => (r.uid === uid ? { ...r, cursosAcesso: eCursos, unitarioLegado: false } : r)));
      setEditMsg(cursosNovos.length > 0 ? '✅ Salvo. Novo curso liberado e aviso enviado por e-mail.' : '✅ Salvo.');
    } catch (e: any) { setEditMsg('❌ ' + (e?.message || e)); }
    finally { setEditSalvando(false); }
  }

  async function salvarTudo(a: Aluno) {
    if (editGeralUid !== a.uid) return;
    setEditSalvando(true);
    setEditMsg('');
    setMsgAcessos('');
    try {
      const cursosAnteriores = cursosEfetivos(a);
      const analyticsAnteriores = ANALYTICS_MODULOS.filter((m) => acessoAnalytics(a, m).liberado).map((m) => m.id);
      const projetosAnteriores = tiposProjeto.filter((p) => acessoProjeto(a, p).liberado).map((p) => p.id);
      const analyticsSelecionados = rascunhoAnalyticsDetalhes.map((item) => ({
        modulo: item.id,
        vencimento: item.vencimento || null,
        valor: parseValor(item.valor),
      }));
      const projetosSelecionados = rascunhoProjetosDetalhes.map((item) => ({
        projeto: item.id,
        vencimento: item.vencimento || null,
        valor: parseValor(item.valor),
      }));
      const nomeAnalytics = (id: string) => ANALYTICS_MODULOS.find((m) => m.id === id)?.nome || id;
      const nomeProjeto = (id: string) => tiposProjeto.find((p) => p.id === id)?.name || id;
      const mudancas: string[] = [];

      eCursos.filter((curso) => !cursosAnteriores.some((anterior) => courseNamesMatch(anterior.curso, curso.curso)))
        .forEach((curso) => mudancas.push(`Liberado em Education: ${curso.curso}`));
      cursosAnteriores.filter((curso) => !eCursos.some((novo) => courseNamesMatch(novo.curso, curso.curso)))
        .forEach((curso) => mudancas.push(`Removido de Education: ${curso.curso}`));
      eCursos.filter((novo) => cursosAnteriores.some((antigo) =>
        courseNamesMatch(antigo.curso, novo.curso)
        && (String(antigo.vencimento || '') !== String(novo.vencimento || '') || Number(antigo.valor || 0) !== Number(novo.valor || 0))
      )).forEach((curso) => mudancas.push(`Atualizado em Education: ${curso.curso}`));

      analyticsSelecionados.filter((item) => !analyticsAnteriores.includes(item.modulo))
        .forEach((item) => mudancas.push(`Liberado em Data Analysis: ${nomeAnalytics(item.modulo)} · R$ ${fmtValor(item.valor) || '0,00'} · expira ${dataBr(item.vencimento)}`));
      analyticsAnteriores.filter((id) => !analyticsSelecionados.some((item) => item.modulo === id))
        .forEach((id) => mudancas.push(`Removido de Data Analysis: ${nomeAnalytics(id)}`));
      analyticsSelecionados.filter((item) => analyticsAnteriores.includes(item.modulo)).forEach((item) => {
        const antes = acessoAnalytics(a, ANALYTICS_MODULOS.find((m) => m.id === item.modulo)!);
        if (String(antes.vencimento || '') !== String(item.vencimento || '') || Number(antes.valor || 0) !== item.valor) {
          mudancas.push(`Atualizado em Data Analysis: ${nomeAnalytics(item.modulo)} · R$ ${fmtValor(item.valor) || '0,00'} · expira ${dataBr(item.vencimento)}`);
        }
      });

      projetosSelecionados.filter((item) => !projetosAnteriores.includes(item.projeto))
        .forEach((item) => mudancas.push(`Liberado em Projects: ${nomeProjeto(item.projeto)} · R$ ${fmtValor(item.valor) || '0,00'} · expira ${dataBr(item.vencimento)}`));
      projetosAnteriores.filter((id) => !projetosSelecionados.some((item) => item.projeto === id))
        .forEach((id) => mudancas.push(`Removido de Projects: ${nomeProjeto(id)}`));
      projetosSelecionados.filter((item) => projetosAnteriores.includes(item.projeto)).forEach((item) => {
        const projeto = tiposProjeto.find((p) => p.id === item.projeto);
        const antes = projeto ? acessoProjeto(a, projeto) : undefined;
        if (antes && (String(antes.vencimento || '') !== String(item.vencimento || '') || Number(antes.valor || 0) !== item.valor)) {
          mudancas.push(`Atualizado em Projects: ${nomeProjeto(item.projeto)} · R$ ${fmtValor(item.valor) || '0,00'} · expira ${dataBr(item.vencimento)}`);
        }
      });

      if (eCursos.some((item) => !item.vencimento) || analyticsSelecionados.some((item) => !item.vencimento) || projetosSelecionados.some((item) => !item.vencimento)) {
        setMsgAcessos('⚠️ Informe a data de expiração de todos os cursos, projetos e análises liberados.');
        return;
      }

      const valorPago = eCursos.reduce((s, c) => s + (c.valor || 0), 0);
      const patch = {
        plano: 'por_curso',
        modeloAcesso: 'por_curso',
        cursosAcesso: eCursos,
        cursosLiberados: eCursos.map((curso) => curso.curso),
        valorPago,
        acessoProdutos: { ...(a.acessoProdutos || {}), analytics: analyticsSelecionados },
        projetosAcesso: projetosSelecionados,
      };
      await updateUserNoConsultor(a.uid, consultorId, patch);
      setRows((p) => p.map((r) => (r.uid === a.uid ? {
        ...r,
        cursosAcesso: eCursos,
        acessoProdutos: patch.acessoProdutos,
        projetosAcesso: projetosSelecionados,
        unitarioLegado: false,
      } : r)));
      cancelarEdicaoGeral();

      if (mudancas.length === 0) {
        setMsgAcessos('Nada mudou.');
        return;
      }
      setMsgAcessos('✅ Todos os acessos foram salvos.');
      // O e-mail só é perguntado depois que as três áreas foram gravadas.
      if (a.email) setAvisoPendente({ aluno: a, mudancas });
    } catch (e: any) {
      console.error('[MeusAlunos] erro ao salvar todos os acessos:', e);
      setMsgAcessos('❌ Não foi possível salvar: ' + (e?.message || e));
    } finally {
      setEditSalvando(false);
    }
  }

  async function removerAluno(aluno: Aluno) {
    if (!window.confirm(`Remover ${aluno.nome} do seu ambiente?\n\nA conta e o histórico não serão apagados, mas o aluno perderá o acesso aos seus cursos.`)) return;
    setRemovingUid(aluno.uid);
    try {
      const response = await authedFetch(`/api/aluno/${encodeURIComponent(aluno.uid)}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({} as any));
      if (!response.ok) throw new Error(body?.error || 'Erro ao remover aluno.');
      setRows(current => current.filter(item => item.uid !== aluno.uid));
      if (editUid === aluno.uid) setEditUid(null);
    } catch (error: any) {
      window.alert(error?.message || 'Erro ao remover aluno.');
    } finally { setRemovingUid(null); }
  }

  async function bloquearAluno(aluno: Aluno) {
    if (!window.confirm(`Bloquear/remover ${aluno.nome} do seu ambiente?\n\nO aluno perdera o acesso aos seus cursos agora. A conta, historico e projetos ficarao preservados por ate 3 meses antes de qualquer exclusao definitiva.`)) return;
    setRemovingUid(aluno.uid);
    try {
      const response = await authedFetch(`/api/aluno/${encodeURIComponent(aluno.uid)}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({} as any));
      if (!response.ok) throw new Error(body?.error || 'Erro ao remover aluno.');
      setRows(current => current.filter(item => item.uid !== aluno.uid));
      if (editUid === aluno.uid) setEditUid(null);
      carregar();
    } catch (error: any) {
      window.alert(error?.message || 'Erro ao remover aluno.');
    } finally { setRemovingUid(null); }
  }

  const diasDesdeBloqueio = (aluno: Aluno) => {
    const raw = aluno.desvinculadoEm;
    if (!raw) return 0;
    const ms = Date.now() - new Date(raw).getTime();
    return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
  };

  const podeExcluirDefinitivo = (aluno: Aluno) => diasDesdeBloqueio(aluno) >= 90;

  async function excluirDefinitivo(aluno: Aluno) {
    const nome = aluno.nome || aluno.email || aluno.uid;
    if (!window.confirm(`Excluir definitivamente ${nome}?\n\nIsso vai apagar a conta do Firebase Auth, o cadastro, progresso, projetos e conversas do mentor desse aluno. Esta acao nao pode ser desfeita.`)) return;
    setDeletingUid(aluno.uid);
    try {
      const response = await authedFetch(`/api/aluno/${encodeURIComponent(aluno.uid)}/definitivo`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({} as any));
      if (!response.ok) throw new Error(body?.error || 'Erro ao excluir definitivamente.');
      setBloqueados(current => current.filter(item => item.uid !== aluno.uid));
      window.alert('Aluno excluido definitivamente do Firebase.');
    } catch (error: any) {
      window.alert(error?.message || 'Erro ao excluir definitivamente.');
    } finally { setDeletingUid(null); }
  }

  const campo = 'border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const cursosPermitidosNoTime = (empresaId?: string) => {
    if (!empresaId || empresaId === empresaIdDireto(consultorId)) return cursos;
    const equipe = equipes.find((item) => item.empresaId === empresaId);
    const permitidos = new Set(equipe?.cursosPermitidos || []);
    return cursos.filter((curso) => permitidos.has(curso));
  };
  const cursosDisponiveis = (empresaId?: string) => cursosPermitidosNoTime(empresaId).filter((c) => !eCursos.some((x) => x.curso === c));


  const renderStatusAcesso = (liberado: boolean, legado = false) => (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase rounded-full px-2 py-1 whitespace-nowrap ${
      liberado ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {liberado ? <CheckCircle2 size={12} /> : <LockKeyhole size={12} />}
      {liberado ? (legado ? 'Liberado · atual' : 'Liberado') : 'Sem acesso'}
    </span>
  );

  const renderToggleAcesso = (liberado: boolean, onChange: (value: boolean) => void) => (
    <button
      type="button"
      role="switch"
      aria-checked={liberado}
      onClick={() => onChange(!liberado)}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase whitespace-nowrap transition-colors ${liberado ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}
    >
      <span className={`h-3 w-3 rounded-full border-2 ${liberado ? 'border-emerald-500 bg-emerald-500' : 'border-gray-400 bg-white'}`} />
      {liberado ? 'Liberado' : 'Sem acesso'}
    </button>
  );

  // `pct` só é passado pela seção Education — Data Analysis e Projects não têm vídeo,
  // então lá a coluna continua exatamente como era.
  const renderAcessoLinha = (nome: string, liberado: boolean, valor?: number, vencimento?: string | null, extra?: string, legado = false, pct?: number) => (
    <div className="grid grid-cols-[minmax(180px,1.6fr)_auto_100px_120px] gap-3 items-center border-b border-gray-100 last:border-0 py-2.5 text-sm">
      <div className="min-w-0">
        <div className="font-semibold text-gray-800 truncate">{nome}</div>
        {extra && <div className="text-[11px] text-gray-400">{extra}</div>}
      </div>
      <div className="flex items-center gap-2">
        {typeof pct === 'number' && (
          <span
            title={`${pct}% dos vídeos deste curso assistidos`}
            className={`text-[11px] font-black tabular-nums whitespace-nowrap ${pct === 0 ? 'text-gray-300' : pct >= 80 ? 'text-emerald-600' : 'text-gray-600'}`}
          >
            {pct}%
          </span>
        )}
        {renderStatusAcesso(liberado, legado)}
      </div>
      <span className="text-xs text-gray-600 whitespace-nowrap">{liberado && typeof valor === 'number' ? `R$ ${fmtValor(valor) || '0,00'}` : '—'}</span>
      <span className={`text-xs whitespace-nowrap ${vencimento && venceu(vencimento) ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
        {vencimento && venceu(vencimento) ? <><Clock3 size={12} className="inline mr-1" />Expirado</> : dataBr(vencimento)}
      </span>
    </div>
  );

  // Formulário de cursos — fica DENTRO da seção Education (logo abaixo da lista).
  // Antes era desenhado no fim do painel, depois de Data Analysis e Projects: o
  // consultor clicava em "Editar" no cabeçalho de Education e o formulário
  // aparecia fora da tela, dando a impressão de que o botão não funcionava.
  const renderFormCursos = (a: Aluno) => {
    if (somenteLeitura || a.inativo || editUid !== a.uid) return null;
    return (
      <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 my-3">
        <div className="text-xs font-black uppercase text-gray-500 mb-2">Editar cursos · vencimento e valor</div>
        <div className="space-y-2 mb-3">
          {eCursos.length === 0 && <div className="text-sm text-gray-500">Nenhum curso liberado.</div>}
          {eCursos.map((c) => (
            <div key={c.curso} className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-800 flex-1 min-w-[140px] truncate">{c.curso} · 1 acesso</span>
              <div className="flex items-center gap-1"><span className="text-[11px] text-gray-400">vence</span><input type="date" value={c.vencimento || ''} onChange={(e) => setVenc(c.curso, e.target.value)} className={campo} /></div>
              <div className="flex items-center gap-1"><span className="text-[11px] text-gray-400">R$</span><input value={fmtValor(c.valor)} onChange={(e) => setValorCurso(c.curso, e.target.value)} placeholder="0,00" className={campo + ' w-24'} /></div>
              <button onClick={() => removerCurso(c.curso)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Remover curso"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        {cursosDisponiveis(a.empresaId).length > 0 && (
          <div className="flex items-center gap-2 mb-3"><select value={eAddCurso} onChange={(e) => setEAddCurso(e.target.value)} className={campo}><option value="">+ adicionar curso…</option>{cursosDisponiveis(a.empresaId).map((c) => <option key={c} value={c}>{c}</option>)}</select><button onClick={addCursoEdit} disabled={!eAddCurso} className="text-xs font-bold text-blue-600 disabled:opacity-40">adicionar</button></div>
        )}
        <div className="text-xs text-blue-700">Atenção: este curso será salvo junto com Data Analysis e Projects no botão “Salvar todas as alterações”.</div>
      </div>
    );
  };

  const renderBarraSalvarAcessos = (a: Aluno, area: 'analytics' | 'projetos') => {
    if (!editandoArea(a, area)) return null;
    return (
      <div className="flex items-center gap-3 py-3 flex-wrap">
        <button onClick={() => salvarAcessos(a, area)} disabled={salvandoAcessos} className="px-5 py-2 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
          {salvandoAcessos ? 'Salvando…' : 'Salvar'}
        </button>
        <button onClick={() => setEditArea(null)} className="text-xs font-bold text-gray-500 hover:text-gray-700">cancelar</button>
        {msgAcessos && <span className="text-sm text-gray-600">{msgAcessos}</span>}
      </div>
    );
  };

  // % de vídeos assistidos de um curso por um aluno. Devolve undefined quando não há
  // dado (aluno sem progresso, ou curso sem vídeo), e aí nada é desenhado.
  const pctCurso = (uid: string | null | undefined, curso: string): number | undefined =>
    uid ? progresso[uid]?.porCurso?.[curso] : undefined;

  const renderCursoEditLinha = (curso: string) => {
    const registro = eCursos.find((item) => courseNamesMatch(item.curso, curso));
    const liberado = !!registro;
    return (
      <div key={curso} className="grid grid-cols-[minmax(180px,1.6fr)_auto_130px_145px] gap-3 items-center border-b border-gray-100 last:border-0 py-2.5 text-sm">
        <div className="min-w-0 font-semibold text-gray-800 truncate">{curso}</div>
        {/* Mesma % do modo de visualização. O aluno em edição é o editGeralUid,
            já que esta linha é desenhada só quando ele está aberto para editar. */}
        <div className="flex items-center gap-2">
          {typeof pctCurso(editGeralUid, curso) === 'number' && (
            <span
              title={`${pctCurso(editGeralUid, curso)}% dos vídeos deste curso assistidos`}
              className={`text-[11px] font-black tabular-nums whitespace-nowrap ${pctCurso(editGeralUid, curso) === 0 ? 'text-gray-300' : (pctCurso(editGeralUid, curso) as number) >= 80 ? 'text-emerald-600' : 'text-gray-600'}`}
            >
              {pctCurso(editGeralUid, curso)}%
            </span>
          )}
          {renderToggleAcesso(liberado, (value) => alternarCursoEdit(curso, value))}
        </div>
        <div className="flex items-center gap-1"><span className="text-[11px] text-gray-400">R$</span><input disabled={!liberado} value={liberado ? fmtValor(registro?.valor || 0) : ''} onChange={(e) => setValorCurso(curso, e.target.value)} placeholder="0,00" className={campo + ' w-24 disabled:bg-gray-100 disabled:text-gray-400'} /></div>
        <input disabled={!liberado} type="date" value={liberado ? (registro?.vencimento || '') : ''} onChange={(e) => setVenc(curso, e.target.value)} className={campo + ' disabled:bg-gray-100 disabled:text-gray-400'} />
      </div>
    );
  };

  const renderModuloEditLinha = (modulo: AnalyticsModulo) => {
    const registro = rascunhoAnalyticsDetalhes.find((item) => item.id === modulo.id);
    const liberado = !!registro;
    return (
      <div key={modulo.id} className="grid grid-cols-[minmax(180px,1.6fr)_auto_130px_145px] gap-3 items-center border-b border-gray-100 last:border-0 py-2.5 text-sm">
        <div className="min-w-0 font-semibold text-gray-800 truncate">{modulo.nome}</div>
        {renderToggleAcesso(liberado, (value) => setRascunhoAnalyticsDetalhes((p) => alternarItemAcesso(p, modulo.id)))}
        <div className="flex items-center gap-1"><span className="text-[11px] text-gray-400">R$</span><input disabled={!liberado} value={liberado ? registro?.valor : ''} onChange={(e) => setRascunhoAnalyticsDetalhes((p) => atualizarItemAcesso(p, modulo.id, 'valor', e.target.value))} placeholder="0,00" className={campo + ' w-24 disabled:bg-gray-100 disabled:text-gray-400'} /></div>
        <input disabled={!liberado} type="date" value={liberado ? registro?.vencimento : ''} onChange={(e) => setRascunhoAnalyticsDetalhes((p) => atualizarItemAcesso(p, modulo.id, 'vencimento', e.target.value))} className={campo + ' disabled:bg-gray-100 disabled:text-gray-400'} />
      </div>
    );
  };

  const renderProjetoEditLinha = (projeto: Initiative) => {
    const registro = rascunhoProjetosDetalhes.find((item) => item.id === projeto.id);
    const liberado = !!registro;
    return (
      <div key={projeto.id} className="grid grid-cols-[minmax(180px,1.6fr)_auto_130px_145px] gap-3 items-center border-b border-gray-100 last:border-0 py-2.5 text-sm">
        <div className="min-w-0 font-semibold text-gray-800 truncate">{projeto.name}</div>
        {renderToggleAcesso(liberado, (value) => setRascunhoProjetosDetalhes((p) => alternarItemAcesso(p, projeto.id)))}
        <div className="flex items-center gap-1"><span className="text-[11px] text-gray-400">R$</span><input disabled={!liberado} value={liberado ? registro?.valor : ''} onChange={(e) => setRascunhoProjetosDetalhes((p) => atualizarItemAcesso(p, projeto.id, 'valor', e.target.value))} placeholder="0,00" className={campo + ' w-24 disabled:bg-gray-100 disabled:text-gray-400'} /></div>
        <input disabled={!liberado} type="date" value={liberado ? registro?.vencimento : ''} onChange={(e) => setRascunhoProjetosDetalhes((p) => atualizarItemAcesso(p, projeto.id, 'vencimento', e.target.value))} className={campo + ' disabled:bg-gray-100 disabled:text-gray-400'} />
      </div>
    );
  };

  const renderDetalheAcessos = (a: Aluno) => {
    const cursosExibidos = cursos.length > 0 ? cursos : cursosEfetivos(a).map((curso) => curso.curso);
    const cursosLiberados = cursosExibidos.filter((curso) => acessoCurso(a, curso)).length;
    const analyticsLiberados = ANALYTICS_MODULOS.filter((modulo) => acessoAnalytics(a, modulo).liberado).length;
    const projetosLiberados = tiposProjeto.filter((projeto) => acessoProjeto(a, projeto).liberado).length;

    return (
      <div className="border-t border-blue-100 bg-slate-50 px-4 py-4 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-black text-gray-800">Detalhes de acesso</div>
            <div className="text-xs text-gray-500">{a.email} · situação: <b>{situacaoAluno(a)}</b></div>
          </div>
          {!somenteLeitura && !a.inativo && editGeralUid === a.uid && (
            <button type="button" onClick={() => salvarTudo(a)} disabled={editSalvando} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-black text-white hover:bg-blue-700 disabled:opacity-40">
              {editSalvando ? 'Salvando tudo…' : 'Salvar todas as alterações'}
            </button>
          )}
        </div>
        {msgAcessos && !editArea && <div className="text-xs font-bold text-gray-600">{msgAcessos}</div>}

        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
            <div><h3 className="text-sm font-black text-gray-800 m-0">Education</h3><p className="text-xs text-gray-400 m-0 mt-0.5">{cursosLiberados} de {cursosExibidos.length} cursos{progresso[a.uid] && cursosLiberados > 0 ? ` · ${progresso[a.uid].geral}% assistido` : ''}</p></div>
            <span className="text-[10px] font-black uppercase text-gray-400">Preço · expiração</span>
          </div>
          <div className="px-4">
            {editGeralUid === a.uid && <div className="grid grid-cols-[minmax(180px,1.6fr)_auto_130px_145px] gap-3 px-0 py-2 text-[10px] font-black uppercase tracking-wide text-gray-400"><div>Curso</div><div>Acesso</div><div>Valor de venda</div><div>Expiração</div></div>}
            {editGeralUid === a.uid
              ? cursosExibidos.map(renderCursoEditLinha)
              : cursosExibidos.map((curso) => {
                  const registro = registroCurso(a, curso);
                  return <React.Fragment key={curso}>{renderAcessoLinha(curso, acessoCurso(a, curso), registro?.valor, registro?.vencimento || (a.plano === 'completo' ? a.acessoCompletoAte : null), undefined, false, progresso[a.uid]?.porCurso?.[curso])}</React.Fragment>;
                })}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
            <div><h3 className="text-sm font-black text-gray-800 m-0">Data Analysis</h3><p className="text-xs text-gray-400 m-0 mt-0.5">{analyticsLiberados} de {ANALYTICS_MODULOS.length} módulos</p></div>
            {editGeralUid === a.uid && <span className="text-[10px] font-black uppercase text-blue-600">editando</span>}
          </div>
          <div className="px-4">
            {editGeralUid === a.uid
              ? <>
                  <div className="grid grid-cols-[minmax(180px,1.6fr)_auto_130px_145px] gap-3 px-0 py-2 text-[10px] font-black uppercase tracking-wide text-gray-400"><div>Análise</div><div>Acesso</div><div>Valor de venda</div><div>Expiração</div></div>
                  {ANALYTICS_MODULOS.map(renderModuloEditLinha)}
                </>
              : ANALYTICS_MODULOS.map((modulo) => {
                  const acesso = acessoAnalytics(a, modulo);
                  return <React.Fragment key={modulo.id}>{renderAcessoLinha(modulo.nome, acesso.liberado, acesso.valor, acesso.vencimento, acesso.legado ? 'permissão individual ainda não configurada' : undefined, acesso.legado)}</React.Fragment>;
                })}
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
            <div><h3 className="text-sm font-black text-gray-800 m-0">Projects</h3><p className="text-xs text-gray-400 m-0 mt-0.5">{projetosLiberados} de {tiposProjeto.length} projetos</p></div>
            {editGeralUid === a.uid && <span className="text-[10px] font-black uppercase text-blue-600">editando</span>}
          </div>
          <div className="px-4">
            {tiposProjeto.length === 0 && <div className="py-3 text-sm text-gray-500">Nenhum tipo de projeto cadastrado.</div>}
            {editGeralUid === a.uid
              ? <>
                  <div className="grid grid-cols-[minmax(180px,1.6fr)_auto_130px_145px] gap-3 px-0 py-2 text-[10px] font-black uppercase tracking-wide text-gray-400"><div>Projeto</div><div>Acesso</div><div>Valor de venda</div><div>Expiração</div></div>
                  {tiposProjeto.map(renderProjetoEditLinha)}
                </>
              : tiposProjeto.map((projeto) => {
                  const acesso = acessoProjeto(a, projeto);
                  // cursoAssociadoId vazio NÃO quer dizer "independente": quer dizer que
                  // este registro é o próprio curso (mesmo nome serve de curso e de tipo
                  // de projeto). Só é independente de verdade quando somenteProjeto=true
                  // e não aponta pra curso nenhum. Mesma resolução que acessoProjeto usa.
                  const cursoDoProjeto = projeto.cursoAssociadoId
                    ? iniciativas.find((item) => item.id === projeto.cursoAssociadoId)
                    : projeto;
                  const legenda = cursoDoProjeto
                    ? (cursoDoProjeto.id === projeto.id ? 'Curso: este mesmo' : `Curso: ${cursoDoProjeto.name}`)
                    : 'Sem curso associado';
                  return <React.Fragment key={projeto.id}>{renderAcessoLinha(projeto.name, acesso.liberado, acesso.valor, acesso.vencimento, legenda)}</React.Fragment>;
                })}
          </div>
          <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 text-xs text-blue-800">
            Ao liberar um projeto, o pacote inclui o projeto do aluno, a IA Digital do consultor, os vídeos associados e a geração de PDF. Isso não libera Analytics automaticamente.
          </div>
        </section>

      </div>
    );
  };

  const renderLinha = (a: Aluno) => {
    const cursosLiberados = quantidadeCursosLiberados(a);
    const analyticsLiberados = quantidadeAnalyticsLiberados(a);
    const projetosLiberados = quantidadeProjetosLiberados(a);
    const aberto = detalheUid === a.uid;
    return (
      <div key={a.uid} className="border-b border-gray-100 last:border-0">
        <div className={`grid grid-cols-[minmax(180px,1.45fr)_minmax(105px,.9fr)_minmax(110px,1fr)_minmax(125px,1.1fr)_minmax(105px,1fr)_minmax(120px,1fr)_auto_auto] gap-3 px-4 py-3 items-center ${a.inativo ? 'bg-gray-50/70' : ''}`}>
          <div className="min-w-0"><div className="font-bold text-gray-800 text-sm truncate">{a.nome}</div><div className="text-xs text-gray-400 truncate">{a.email}</div></div>
          <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{dataBr(a.dataConvite)}</span>
          <span className="text-xs font-semibold text-gray-700">
            {cursosLiberados === 0 ? 'Sem acesso' : `${cursosLiberados} de ${cursos.length} cursos`}
            {cursosLiberados > 0 && progresso[a.uid] && (
              <span className={`ml-1 font-black tabular-nums ${progresso[a.uid].geral === 0 ? 'text-gray-300' : progresso[a.uid].geral >= 80 ? 'text-emerald-600' : 'text-blue-600'}`}>
                · {progresso[a.uid].geral}%
              </span>
            )}
          </span>
          <span className="text-xs font-semibold text-gray-700">{analyticsLiberados === 0 ? 'Sem acesso' : `${analyticsLiberados} de ${ANALYTICS_MODULOS.length} módulos`}</span>
          <span className="text-xs font-semibold text-gray-700">{projetosLiberados === 0 ? 'Sem acesso' : `${projetosLiberados} projeto${projetosLiberados === 1 ? '' : 's'}`}</span>
          <div className="min-w-[88px]"><span className={`inline-flex text-[10px] font-black uppercase rounded-full px-2 py-1 whitespace-nowrap ${situacaoAluno(a) === 'Completo' ? 'bg-emerald-100 text-emerald-700' : situacaoAluno(a) === 'Limitado' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{situacaoAluno(a)}</span><span className="block mt-1 text-[10px] text-gray-400 whitespace-nowrap">{a.ultimoAcesso ? `Último acesso: ${dataBr(a.ultimoAcesso)}` : 'Nunca acessou'}</span></div>
          <button onClick={() => {
            if (aberto) {
              setDetalheUid(null);
              cancelarEdicaoGeral();
            } else {
              setDetalheUid(a.uid);
              if (!somenteLeitura && !a.inativo) abrirEdicaoGeral(a);
            }
          }} title="Ver detalhes de acesso deste aluno" className="inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 hover:bg-blue-100 whitespace-nowrap">{aberto ? 'Fechar' : 'Gerenciar'}</button>
          {!somenteLeitura && <div className="flex justify-end">{!a.inativo ? <button onClick={() => bloquearAluno(a)} disabled={removingUid === a.uid} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40" title="Remover aluno do meu ambiente"><Trash2 size={15} /></button> : <button onClick={() => excluirDefinitivo(a)} disabled={!podeExcluirDefinitivo(a) || deletingUid === a.uid} className="text-xs font-bold text-red-600 disabled:text-gray-300" title={podeExcluirDefinitivo(a) ? 'Excluir definitivamente' : 'Disponível após 90 dias'}>excluir</button>}</div>}
        </div>
        {aberto && renderDetalheAcessos(a)}
      </div>
    );
  };

  const renderFormAdicionar = (empresaId: string) => (
    <div className="px-4 pb-4 pt-3 bg-blue-50/40 border-t border-blue-100 space-y-4">
      <div className="grid sm:grid-cols-2 gap-3">
        <input value={aNome} onChange={(e) => setANome(e.target.value)} placeholder="Nome completo" className={campo} />
        <input value={aEmail} onChange={(e) => setAEmail(e.target.value)} placeholder="E-mail" className={campo} />
      </div>
      <div>
        <div className="text-xs font-bold text-gray-500 mb-1">Cursos que ele vai acessar (opcional)</div>
        <div className="flex flex-wrap gap-2">
          {cursosPermitidosNoTime(empresaId).length === 0 && <span className="text-xs text-gray-400">Nenhum curso disponível neste time.</span>}
          {cursosPermitidosNoTime(empresaId).map((c) => {
            const on = aItens.some((i) => i.curso === c);
            return (
              <button key={c} onClick={() => toggleCursoAdd(c)}
                className={`text-xs font-bold rounded-lg px-3 py-1.5 border ${on ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'}`}>
                {c}
              </button>
            );
          })}
        </div>
      </div>
      {aItens.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wide text-gray-400">Vencimento e valor de cada curso</div>
          {aItens.map((i) => (
            <div key={i.curso} className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-gray-800 flex-1 min-w-[140px] truncate">{i.curso}</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-gray-400">vence</span>
                <input type="date" value={i.vencimento} onChange={(e) => setItemVenc(i.curso, e.target.value)} className={campo} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-gray-400">R$</span>
                <input value={i.valor} onChange={(e) => setItemValor(i.curso, e.target.value)} placeholder="0,00" className={campo + ' w-24'} />
              </div>
            </div>
          ))}
        </div>
      )}
      <div>
        <div className="text-xs font-bold text-gray-500 mb-1">Data Analysis (opcional)</div>
        <div className="flex flex-wrap gap-2">
          {ANALYTICS_MODULOS.map((modulo) => {
            const on = aAnalytics.some((item) => item.id === modulo.id);
            return <button key={modulo.id} type="button" onClick={() => setAAnalytics((p) => alternarItemAcesso(p, modulo.id))}
              className={`text-xs font-bold rounded-lg px-3 py-1.5 border ${on ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-600 border-gray-300'}`}>
              {modulo.nome}
            </button>;
          })}
        </div>
      </div>
      {aAnalytics.length > 0 && <div className="space-y-2">
        <div className="text-xs font-black uppercase tracking-wide text-gray-400">Vencimento e valor de cada análise</div>
        {aAnalytics.map((item) => <div key={item.id} className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-800 flex-1 min-w-[140px] truncate">{ANALYTICS_MODULOS.find((m) => m.id === item.id)?.nome || item.id}</span>
          <div className="flex items-center gap-1"><span className="text-[11px] text-gray-400">vence</span><input type="date" value={item.vencimento} onChange={(e) => setAAnalytics((p) => atualizarItemAcesso(p, item.id, 'vencimento', e.target.value))} className={campo} /></div>
          <div className="flex items-center gap-1"><span className="text-[11px] text-gray-400">R$</span><input value={item.valor} onChange={(e) => setAAnalytics((p) => atualizarItemAcesso(p, item.id, 'valor', e.target.value))} placeholder="0,00" className={campo + ' w-24'} /></div>
        </div>)}
      </div>}
      <div>
        <div className="text-xs font-bold text-gray-500 mb-1">Projects (opcional)</div>
        <div className="flex flex-wrap gap-2">
          {tiposProjeto.map((projeto) => {
            const on = aProjetos.some((item) => item.id === projeto.id);
            return <button key={projeto.id} type="button" onClick={() => setAProjetos((p) => alternarItemAcesso(p, projeto.id))}
              className={`text-xs font-bold rounded-lg px-3 py-1.5 border ${on ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-gray-600 border-gray-300'}`}>
              {projeto.name}
            </button>;
          })}
        </div>
      </div>
      {aProjetos.length > 0 && <div className="space-y-2">
        <div className="text-xs font-black uppercase tracking-wide text-gray-400">Vencimento e valor de cada projeto</div>
        {aProjetos.map((item) => <div key={item.id} className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-800 flex-1 min-w-[140px] truncate">{tiposProjeto.find((p) => p.id === item.id)?.name || item.id}</span>
          <div className="flex items-center gap-1"><span className="text-[11px] text-gray-400">vence</span><input type="date" value={item.vencimento} onChange={(e) => setAProjetos((p) => atualizarItemAcesso(p, item.id, 'vencimento', e.target.value))} className={campo} /></div>
          <div className="flex items-center gap-1"><span className="text-[11px] text-gray-400">R$</span><input value={item.valor} onChange={(e) => setAProjetos((p) => atualizarItemAcesso(p, item.id, 'valor', e.target.value))} placeholder="0,00" className={campo + ' w-24'} /></div>
        </div>)}
      </div>}
      <div className="flex items-center gap-3">
        <button onClick={adicionar} disabled={addEnviando || aEmpresaId !== empresaId} className="px-6 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40">
          {addEnviando ? 'Adicionando…' : 'Adicionar aluno'}
        </button>
        {addMsg && <span className="text-sm text-gray-600">{addMsg}</span>}
      </div>
    </div>
  );

  const abrirFormAdicionar = (empresaId: string) => {
    if (addAbertoEmpresaId === empresaId) { setAddAbertoEmpresaId(null); return; }
    setAddAbertoEmpresaId(empresaId);
    setAEmpresaId(empresaId);
     setANome(''); setAEmail(''); setAItens([]); setAAnalytics([]); setAProjetos([]); setAddMsg('');
  };
  const abrirAdicionarNoTopo = () => {
    if (addAbertoEmpresaId === empresaDiretaId) {
      setAddAbertoEmpresaId(null);
      return;
    }
    setAddAbertoEmpresaId(empresaDiretaId); setAEmpresaId(empresaDiretaId);
    setANome(''); setAEmail(''); setAItens([]); setAAnalytics([]); setAProjetos([]); setAddMsg('');
  };

  // Corpo de um time: cabeçalho das colunas + alunos + "adicionar aluno".
  // Usado solto (dentro da linha do coordenador) e dentro do acordeão da tela cheia.
  const indicadorOrdenacao = (campo: CampoOrdenacao) => ordenacao === campo ? (ordemAscendente ? '↑' : '↓') : '↕';
  const cabecalhoOrdenavel = (campo: CampoOrdenacao, label: string) => (
    <button type="button" onClick={() => selecionarOrdenacao(campo)} className="inline-flex items-center gap-1 text-left hover:text-blue-700" aria-label={`Ordenar por ${label}`} aria-sort={ordenacao === campo ? (ordemAscendente ? 'ascending' : 'descending') : 'none'}>
      <span>{label}</span><span className={`text-[11px] ${ordenacao === campo ? 'text-blue-600' : 'text-gray-300'}`}>{indicadorOrdenacao(campo)}</span>
    </button>
  );

  const corpoGrupo = (empresaId: string) => {
    const alunosDoTime = alunosPorEmpresa.get(empresaId) || [];
    const cadastroDentroDoGrupo = embedded || empresaId !== empresaDiretaId;
    return (
      <>
        {!somenteLeitura && cadastroDentroDoGrupo && <div className="px-4 py-3 border-b border-blue-100 bg-blue-50/30">
          <button onClick={() => abrirFormAdicionar(empresaId)} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800">
            <Plus size={14} /> {addAbertoEmpresaId === empresaId ? 'fechar cadastro' : 'adicionar aluno'}
          </button>
        </div>}
        {!somenteLeitura && cadastroDentroDoGrupo && addAbertoEmpresaId === empresaId && (
          <div id={`adicionar-aluno-${empresaId}`}>{renderFormAdicionar(empresaId)}</div>
        )}
        <div className="overflow-x-auto">
          <div className="min-w-[980px]">
            <div className="px-4 py-2.5 bg-gray-50 grid grid-cols-[minmax(180px,1.45fr)_minmax(105px,.9fr)_minmax(110px,1fr)_minmax(125px,1.1fr)_minmax(105px,1fr)_minmax(120px,1fr)_auto_auto] gap-3 text-[11px] font-black uppercase tracking-wide text-gray-400">
              <div>{cabecalhoOrdenavel('alfabetica', 'Aluno')}</div>
              <div>{cabecalhoOrdenavel('convite', 'Convite')}</div>
              <div>{cabecalhoOrdenavel('education', 'Education')}</div>
              <div>{cabecalhoOrdenavel('analytics', 'Data Analysis')}</div>
              <div>{cabecalhoOrdenavel('projetos', 'Projects')}</div>
              <div className="flex flex-col gap-0.5"><span>Situação</span>{cabecalhoOrdenavel('ultimoAcesso', 'Último acesso')}</div>
              <div>Ação</div><div />
            </div>
            {alunosDoTime.length === 0 && <div className="px-4 py-6 text-center text-gray-400 text-sm">Nenhum aluno neste time ainda.</div>}
            {alunosDoTime.map(renderLinha)}
          </div>
        </div>
      </>
    );
  };

  // O consultor tambem pode abrir esta tela embutida em Meus Coordenadores.
  // O aviso precisa ser renderizado nos dois modos, depois que o acesso foi salvo.
  const renderAvisoModal = () => avisoPendente && (
    <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6">
          <h4 className="font-black text-gray-800 mb-1">Avisar o aluno por e-mail?</h4>
          <p className="text-sm text-gray-600 mb-4">
            O acesso de <b>{avisoPendente.aluno.nome}</b> já foi salvo. Quer mandar um e-mail
            para <b>{avisoPendente.aluno.email}</b> contando o que mudou?
          </p>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 mb-5 max-h-48 overflow-y-auto">
            <ul className="text-xs text-gray-700 space-y-1 m-0 pl-4">
              {avisoPendente.mudancas.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setAvisoPendente(null); setMsgAcessos('✅ Acessos salvos (sem aviso ao aluno).'); }}
              disabled={enviandoAviso}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Não avisar
            </button>
            <button
              onClick={enviarAvisoAlteracao}
              disabled={enviandoAviso}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-40"
            >
              {enviandoAviso ? 'Enviando…' : 'Enviar aviso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Embutido na linha do coordenador: o time já está identificado pela linha,
  // então não repete busca nem acordeão — só a tabela do time.
  if (embedded) {
    const empresaId = empresaIdFiltro || empresaIdDireto(consultorId);
    return loading
      ? <div className="text-gray-500 text-sm">Carregando…</div>
      : <>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">{corpoGrupo(empresaId)}</div>
          {renderAvisoModal()}
        </>;
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-black text-gray-800 mb-1">Alunos na Plataforma</h1>
      <p className="text-gray-500 text-sm mb-5">
        Gerencie os alunos de <b>{consultor.branding.nome}</b>, agrupados por time — os seus diretos e os de cada coordenador.
      </p>

      {!somenteLeitura && <div className="flex justify-end mb-3">
        <button type="button" onClick={abrirAdicionarNoTopo} className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800">
          <Plus size={16} /> {addAbertoEmpresaId === empresaDiretaId ? 'fechar cadastro' : 'adicionar aluno'}
        </button>
      </div>}
      {!somenteLeitura && addAbertoEmpresaId === empresaDiretaId && (
        <div id="adicionar-aluno-topo" className="mb-5 overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
          {renderFormAdicionar(empresaDiretaId)}
        </div>
      )}
      <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou e-mail…" className={campo + ' w-full max-w-sm mb-5'} />

      <div className="flex items-center gap-2 flex-wrap mb-5" aria-label="Ordenar alunos">
        <span className="text-xs font-bold text-gray-500 mr-1">Ordenar por:</span>
        {([
          ['convite', 'Convite'],
          ['ultimoAcesso', 'Último acesso'],
          ['projetos', 'Projetos'],
          ['education', 'Education'],
          ['analytics', 'Data Analysis'],
          ['alfabetica', 'A–Z'],
        ] as [CampoOrdenacao, string][]).map(([valor, label]) => (
          <button key={valor} type="button" onClick={() => selecionarOrdenacao(valor)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${ordenacao === valor ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-700'}`}>
            {label} {ordenacao === valor ? (ordemAscendente ? '↑' : '↓') : ''}
          </button>
        ))}
      </div>
      {loading ? <div className="text-gray-500">Carregando…</div> : (
        <div className="space-y-4">
          {equipes.map((eq) => {
            const alunosDoTime = alunosPorEmpresa.get(eq.empresaId) || [];
            const aberto = buscando ? alunosDoTime.length > 0 : !!gruposAbertos[eq.empresaId];
            return (
              <div key={eq.empresaId} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setGruposAbertos((p) => ({ ...p, [eq.empresaId]: !p[eq.empresaId] }))}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3.5"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="font-black text-gray-800 truncate">
                      {eq.direto ? eq.nome : `${eq.coordenador}${eq.nome && eq.nome !== eq.coordenador ? ' — ' + eq.nome : ''}`}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">({alunosDoTime.length})</span>
                  </span>
                  <ChevronDown size={18} className={`text-gray-400 transition-transform shrink-0 ${aberto ? 'rotate-180' : ''}`} />
                </button>
                {aberto && <div className="border-t border-gray-100">{corpoGrupo(eq.empresaId)}</div>}
              </div>
            );
          })}
        </div>
      )}

      {false && bloqueados.length > 0 && (
        <div className="mt-8 bg-white border border-orange-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
            <h2 className="text-sm font-black text-orange-950">Alunos removidos em retencao</h2>
            <p className="text-xs text-orange-700 mt-0.5">Eles perderam o acesso, mas dados e projetos ficam preservados por 3 meses.</p>
          </div>
          {bloqueados.map((a) => {
            const dias = diasDesdeBloqueio(a);
            const pronto = podeExcluirDefinitivo(a);
            return (
              <div key={a.uid} className="grid grid-cols-[1.2fr_1fr_auto] gap-3 px-4 py-3 items-center border-b border-orange-50 last:border-0">
                <div className="min-w-0">
                  <div className="font-bold text-gray-800 text-sm truncate">{a.nome}</div>
                  <div className="text-xs text-gray-400 truncate">{a.email}</div>
                </div>
                <div className="text-xs text-gray-600">
                  <span className={pronto ? 'font-black text-red-600' : 'font-bold text-orange-700'}>
                    {pronto ? 'Mais de 3 meses' : `${dias}/90 dias`}
                  </span>
                  {a.desvinculadoEm && <span className="block text-[11px] text-gray-400">bloqueado em {new Date(a.desvinculadoEm).toLocaleDateString('pt-BR')}</span>}
                </div>
                <button
                  onClick={() => excluirDefinitivo(a)}
                  disabled={!pronto || deletingUid === a.uid}
                  className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-black bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                  title={pronto ? 'Excluir definitivamente do Firebase' : 'Disponivel apos 3 meses'}
                >
                  <Trash2 size={14} />
                  {deletingUid === a.uid ? 'Excluindo...' : 'Excluir total'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Pós-salvar: o acesso já foi gravado. Aqui só se decide avisar o aluno. */}
      {renderAvisoModal()}
    </div>
  );
}
