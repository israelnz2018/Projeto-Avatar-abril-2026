import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getInitiatives, getInitiativeConfigs } from '../services/configService';
import { userDataNoConsultor, type TipoUsuario } from '../services/userService';
import { resolveConsultorId } from '../services/consultorService';
import { hasCourseAccess } from '../lib/courseAccess';

type Plano = 'gratuito' | 'completo' | 'coordenador' | 'por_curso';
type CursoAcesso = { curso: string; vencimento: string | null; valor?: number; quantidade?: number };

export function useUserAccess() {
  const [loading, setLoading] = useState(true);
  const [plano, setPlano] = useState<Plano>('gratuito');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoordenador, setIsCoordenador] = useState(false);
  const [isConsultor, setIsConsultor] = useState(false);
  const [tipoUsuario, setTipoUsuario] = useState<TipoUsuario>('aluno');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [empresaNome, setEmpresaNome] = useState<string | null>(null);
  const [maxAlunos, setMaxAlunos] = useState<number | null>(null);
  const [siglaPpt, setSiglaPpt] = useState<string>('');
  const [pptFonte, setPptFonte] = useState<'consultor' | 'proprio' | null>(null);
  const [pptCores, setPptCores] = useState<{ navy: string; blue: string; light: string } | null>(null);
  const [pptCapaUrl, setPptCapaUrl] = useState('');
  const [pptInternaUrl, setPptInternaUrl] = useState('');
  const [cursosLiberados, setCursosLiberados] = useState<string[]>([]);
  const [cursosAcesso, setCursosAcesso] = useState<CursoAcesso[]>([]);
  // Aluno em modo POR-CURSO: tem cursosAcesso definido (pacote de cursos escolhido
  // pelo consultor). Nesse modo o acesso é pelos cursos liberados, NÃO pelo plano —
  // assim o `plano:completo` que o convite grava não faz o aluno "ver tudo".
  // Sem cursosAcesso (alunos Hotmart atuais) → modelo de plano intacto.
  const [acessoPorCurso, setAcessoPorCurso] = useState(false);
  const [freeToolIds, setFreeToolIds] = useState<Set<string>>(new Set());
  // Ferramentas das trilhas do pacote liberado pra ESTE aluno (além das grátis).
  const [grantedToolIds, setGrantedToolIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        let userPlano: Plano = 'gratuito';
        let admin = false;
        let coord = false;
        let cons = false;
        let tipo: TipoUsuario = 'aluno';
        let empId: string | null = null;
        let empNome: string | null = null;
        let maxAl: number | null = null;
        let sPpt = '';
        let pFonte: 'consultor' | 'proprio' | null = null;
        let pCores: { navy: string; blue: string; light: string } | null = null;
        let cursosLib: string[] = [];
        let cursosAcc: CursoAcesso[] = [];
        let porCurso = false;
        if (userSnap.exists()) {
          const dataGlobal = userSnap.data();
          const data = userDataNoConsultor(dataGlobal, resolveConsultorId());
          // Marca o 1º acesso (1x só) — pra saber quem dos convidados já entrou.
          if (!dataGlobal.primeiroAcessoEm) {
            setDoc(userRef, { primeiroAcessoEm: new Date().toISOString() }, { merge: true }).catch(() => {});
          }
          // SÓ aceita tipoUsuario com valor válido. Não fazemos fallback pra `role`
          // porque docs antigos/inconsistentes (do n8n ou de testes) podem ter
          // `role: "user"`, `role: "admin"`, etc. e isso bagunçava permissões.
          const rawTipo = data.tipoUsuario;
          tipo = (rawTipo === 'admin' || rawTipo === 'coordenador' || rawTipo === 'consultor' || rawTipo === 'aluno')
            ? rawTipo
            : 'aluno';
          admin = tipo === 'admin';
          coord = tipo === 'coordenador';
          cons = tipo === 'consultor';
          empId = data.empresaId || null;
          empNome = data.empresaNome || null;
          maxAl = typeof data.maxAlunos === 'number' ? data.maxAlunos : null;
          sPpt = typeof data.siglaPpt === 'string' ? data.siglaPpt : '';
          // Marca do PPT do TIME: vive em team_branding/{empresaId} — só sigla + cores,
          // sem dado sensível. Coordenador e alunos do mesmo time leem o MESMO doc.
          // Fora de um time (sem empresaId), fica null → o app usa a marca do consultor.
          if (empId) {
            const lerCores = (raw: any): { navy: string; blue: string; light: string } | null =>
              raw && typeof raw === 'object' && raw.navy && raw.blue && raw.light
                ? { navy: String(raw.navy), blue: String(raw.blue), light: String(raw.light) }
                : null;
            try {
              const tb = await getDoc(doc(db, 'team_branding', empId));
              const t = tb.exists() ? (tb.data() as any) : null;
              if (t && t.pptFonte === 'proprio') {
                pFonte = 'proprio';
                sPpt = typeof t.siglaPpt === 'string' ? t.siglaPpt : '';
                pCores = lerCores(t.coresPpt);
                setPptCapaUrl(typeof t.pptCapaUrl === 'string' ? t.pptCapaUrl : '');
                setPptInternaUrl(typeof t.pptInternaUrl === 'string' ? t.pptInternaUrl : '');
              } else {
                pFonte = 'consultor';
                setPptCapaUrl('');
                setPptInternaUrl('');
              }
            } catch { /* sem doc/permissão — mantém marca do consultor */ }
          }
          // Modelo novo: cursosAcesso [{curso, vencimento}] — ativos = não vencidos.
          // Fallback pro legado cursosLiberados (string[] sem vencimento).
          const ca = Array.isArray(data.cursosAcesso) ? data.cursosAcesso : null;
          if (ca) {
            cursosAcc = ca
              .map((c: any) => ({
                curso: String(c?.curso || '').trim(),
                vencimento: c?.vencimento ? String(c.vencimento) : null,
                valor: typeof c?.valor === 'number' ? c.valor : 0,
                quantidade: typeof c?.quantidade === 'number' ? c.quantidade : undefined,
              }))
              .filter((c: CursoAcesso) => c.curso);
            cursosLib = ca
              .filter((c: any) => !c?.vencimento || new Date(c.vencimento).getTime() >= Date.now())
              .map((c: any) => c?.curso)
              .filter(Boolean);
          } else {
            cursosLib = Array.isArray(data.cursosLiberados) ? data.cursosLiberados : [];
          }
          // A lista literal é a única fonte de permissão. Lista vazia também é
          // explícita e significa que nenhum curso foi liberado.
          porCurso = Array.isArray(data.cursosAcesso) || data.modeloAcesso === 'por_curso' || data.plano === 'por_curso';
          if (data.plano === 'por_curso') userPlano = 'por_curso';
        }
        // O consultor administra o catálogo inteiro. Coordenadores e alunos usam
        // exclusivamente a lista literal de cursos do seu vínculo.
        if (cons) userPlano = 'completo';
        setPlano(userPlano);
        setIsAdmin(admin);
        setIsCoordenador(coord);
        setIsConsultor(cons);
        setTipoUsuario(tipo);
        setEmpresaId(empId);
        setEmpresaNome(empNome);
        setMaxAlunos(maxAl);
        setSiglaPpt(sPpt);
        setPptFonte(pFonte);
        setPptCores(pCores);
        setCursosAcesso(cursosAcc);
        setCursosLiberados(cursosLib);
        setAcessoPorCurso(porCurso);
        if (admin || cons) {
          setFreeToolIds(new Set());
          setGrantedToolIds(new Set());
          return;
        }
        const initiatives = await getInitiatives();
        // Converte nomes legados (ex.: "6- Como Aplicar...") para o nome atual do
        // curso. Assim todas as telas recebem a mesma lista canônica de acesso.
        cursosLib = cursosLib.map((curso) => initiatives.find((initiative) => hasCourseAccess([curso], initiative.name))?.name || curso);
        setCursosLiberados(cursosLib);
        const freeInitiatives = initiatives.filter(i => i.isFree === true);
        const toolIdsSet = new Set<string>();
        for (const initiative of freeInitiatives) {
          const configs = await getInitiativeConfigs(initiative.id);
          configs.forEach(config => {
            if (config.toolIds && Array.isArray(config.toolIds)) {
              config.toolIds.forEach(id => toolIdsSet.add(id));
            }
          });
        }
        setFreeToolIds(toolIdsSet);
        // Ferramentas do PACOTE liberado pra este aluno (trilhas cujo nome está nos cursos
        // liberados). Vínculo canônico curso↔trilha é por nome. Só usado no modo por-curso.
        const grantedToolSet = new Set<string>();
        for (const initiative of initiatives.filter(i => hasCourseAccess(cursosLib, i.name))) {
          const configs = await getInitiativeConfigs(initiative.id);
          configs.forEach(config => {
            if (Array.isArray(config.toolIds)) config.toolIds.forEach(id => grantedToolSet.add(id));
          });
        }
        setGrantedToolIds(grantedToolSet);
      } catch (error) {
        console.error('Erro ao verificar acesso do usuário:', error);
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const canUseTool = (toolId: string) => {
    if (isAdmin || isConsultor) return true;
    // Modelo POR-CONSULTOR (coordenador ou aluno com pacote): não existe "grátis" no
    // sistema — o acesso é SÓ o que o consultor liberou explicitamente. Se o consultor
    // quiser dar de graça, ele escolhe o curso com valor=0 (ainda assim precisa liberar).
    if (isCoordenador || acessoPorCurso) return grantedToolIds.has(toolId);
    // Modelo de plano LEGADO (aluno solo, sem coordenador/pacote): mantém as ferramentas grátis.
    return freeToolIds.has(toolId);
  };

  const canUseInitiative = (initiativeId: string, initiatives: any[]) => {
    if (isAdmin || isConsultor) return true;
    const initiative = initiatives.find(i => i.id === initiativeId);
    if (!initiative) return false;
    // Modelo POR-CONSULTOR: idem — só o que foi explicitamente liberado, sem bypass de isFree.
    if (isCoordenador || acessoPorCurso) {
      const cursoAssociado = initiative.cursoAssociadoId
        ? initiatives.find(i => i.id === initiative.cursoAssociadoId)
        : null;
      return hasCourseAccess(cursosLiberados, cursoAssociado?.name || initiative.name);
    }
    // Modelo de plano LEGADO: mantém as trilhas grátis do aluno solo (sem coordenador).
    return initiative.isFree === true;
  };

  return {
    loading,
    plano,
    isAdmin,
    isCoordenador,
    isConsultor,
    tipoUsuario,
    empresaId,
    empresaNome,
    maxAlunos,
    siglaPpt,
    pptFonte,
    pptCores,
    pptCapaUrl,
    pptInternaUrl,
    cursosLiberados,
    cursosAcesso,
    acessoPorCurso,
    freeToolIds,
    canUseTool,
    canUseInitiative,
  };
}
