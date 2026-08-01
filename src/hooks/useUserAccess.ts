import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getInitiatives, getInitiativeConfigs } from '../services/configService';
import type { TipoUsuario } from '../services/userService';

type Plano = 'gratuito' | 'completo';

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
  const [cursosLiberados, setCursosLiberados] = useState<string[]>([]);
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
        let porCurso = false;
        if (userSnap.exists()) {
          const data = userSnap.data();
          // Marca o 1º acesso (1x só) — pra saber quem dos convidados já entrou.
          if (!data.primeiroAcessoEm) {
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
              } else {
                pFonte = 'consultor';
              }
            } catch { /* sem doc/permissão — mantém marca do consultor */ }
          }
          // Modelo novo: cursosAcesso [{curso, vencimento}] — ativos = não vencidos.
          // Fallback pro legado cursosLiberados (string[] sem vencimento).
          const ca = Array.isArray(data.cursosAcesso) ? data.cursosAcesso : null;
          if (ca) {
            cursosLib = ca
              .filter((c: any) => !c?.vencimento || new Date(c.vencimento).getTime() >= Date.now())
              .map((c: any) => c?.curso)
              .filter(Boolean);
          } else {
            cursosLib = Array.isArray(data.cursosLiberados) ? data.cursosLiberados : [];
          }
          // Modo por-curso: só quando o aluno TEM cursosAcesso não-vazio (pacote definido
          // pelo consultor). Vazio/ausente = modelo de plano (preserva os grupos atuais).
          porCurso = Array.isArray(data.cursosAcesso) && data.cursosAcesso.length > 0;
          // Acesso completo pode ter validade (acessoCompletoAte). Se a data já
          // passou, o "completo" expira e o usuário volta a gratuito.
          // Sem o campo = completo sem validade (admin, casos antigos): não quebra.
          const completoValido = (() => {
            const ate = data.acessoCompletoAte;
            if (!ate) return true; // sem validade definida
            const dt = new Date(ate);
            if (isNaN(dt.getTime())) return true; // data inválida: não bloqueia
            return dt.getTime() > Date.now();
          })();
          if (data.plano === 'completo' && completoValido) {
            userPlano = 'completo';
          } else if (data.plano === 'completo' && !completoValido) {
            userPlano = 'gratuito'; // acesso expirou
          } else if (Array.isArray(data.formacoes) && data.formacoes.length > 0) {
            const temAvancada = data.formacoes.some(
              (f: string) => !f.includes('introdutoria') && !f.includes('gratuito')
            );
            userPlano = temAvancada ? 'completo' : 'gratuito';
          }
        }
        // Consultor tem acesso total às ferramentas (como o completo). Não depende
        // de plano/validade — o papel garante. Preserva os cursos que ele já tinha.
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
        setCursosLiberados(cursosLib);
        setAcessoPorCurso(porCurso);
        const initiatives = await getInitiatives();
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
        const liberadosSet = new Set(cursosLib);
        const grantedToolSet = new Set<string>();
        for (const initiative of initiatives.filter(i => liberadosSet.has(i.name))) {
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
    if (isAdmin) return true;
    // Modo por-curso: só as ferramentas do pacote (+ grátis). O plano:completo NÃO libera tudo.
    if (acessoPorCurso) return freeToolIds.has(toolId) || grantedToolIds.has(toolId);
    if (plano === 'completo') return true;
    return freeToolIds.has(toolId);
  };

  const canUseInitiative = (initiativeId: string, initiatives: any[]) => {
    if (isAdmin) return true;
    const initiative = initiatives.find(i => i.id === initiativeId);
    if (!initiative) return false;
    // Modo por-curso: só as trilhas do pacote (+ grátis). O plano:completo NÃO libera tudo.
    if (acessoPorCurso) return initiative.isFree === true || (cursosLiberados || []).includes(initiative.name);
    if (plano === 'completo') return true;
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
    cursosLiberados,
    acessoPorCurso,
    freeToolIds,
    canUseTool,
    canUseInitiative,
  };
}
