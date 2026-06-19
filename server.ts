import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";
import { YoutubeTranscript } from "youtube-transcript";
import { initFirebaseAdmin, isAdminReady, adminAuth, adminFirestore } from "./src/lib/firebaseAdmin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Firebase Admin SDK — usado pelos endpoints /api/admin/*
  initFirebaseAdmin();

  // ===============================================================
  // Admin Users API — gerenciar usuários pelo painel /users
  // ===============================================================
  // Helper: manda e-mail de boas-vindas com senha provisória.
  // Retorna true se enviou, false se SMTP não está configurado ou falhou.
  async function sendWelcomeEmail(params: {
    para: string;
    nome: string;
    senhaProvisoria: string;
    appUrl?: string;
    contexto?: "novo" | "reset";
  }): Promise<boolean> {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;
    if (!host || !user || !pass) {
      console.warn("[sendWelcomeEmail] SMTP não configurado. Pulando envio.");
      return false;
    }
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      const linkApp = params.appUrl || process.env.APP_URL || "https://lbw-copilot.app";
      const titulo = params.contexto === "reset"
        ? "Sua senha foi resetada — LBW Copilot"
        : "Bem-vindo ao LBW Copilot — seus dados de acesso";
      const intro = params.contexto === "reset"
        ? `O administrador resetou sua senha de acesso ao <strong>LBW Continuous Improvement Copilot</strong>.`
        : `Sua conta no <strong>LBW Continuous Improvement Copilot</strong> foi criada por um administrador.`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #2A2F3A;">
          <h2 style="color: #1E2D6E;">${titulo}</h2>
          <p>Olá ${params.nome || params.para.split("@")[0]},</p>
          <p>${intro}</p>
          <div style="background: #F0F2FA; border-left: 4px solid #0033CC; padding: 16px 20px; margin: 20px 0;">
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #1E2D6E; font-weight: bold;">DADOS DE ACESSO</p>
            <p style="margin: 4px 0;"><strong>E-mail:</strong> ${params.para}</p>
            <p style="margin: 4px 0;"><strong>Senha provisória:</strong> <code style="background: #fff; padding: 4px 8px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace;">${params.senhaProvisoria}</code></p>
          </div>
          <p>Recomendamos que você <strong>troque a senha</strong> no primeiro acesso.</p>
          <p style="margin: 24px 0;">
            <a href="${linkApp}" style="background: #0033CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar a plataforma</a>
          </p>
          <p style="font-size: 12px; color: #9CA3AF; margin-top: 32px;">
            Se não foi você que solicitou esse acesso, ignore este e-mail.
          </p>
          <p style="font-size: 12px; color: #9CA3AF;">Equipe LBW · Learning by Working</p>
        </div>
      `;
      await transporter.sendMail({
        from,
        to: params.para,
        subject: titulo,
        html,
      });
      return true;
    } catch (err: any) {
      console.error("[sendWelcomeEmail] Erro SMTP:", err?.message || err);
      return false;
    }
  }


  // E-mail de acesso — 3 textos distintos (aprovados pelo Israel):
  //   1) novo + gratuito   → boas-vindas Trilha 1 + lista das outras 7
  //   2) novo + completo   → boas-vindas com as 8 trilhas já liberadas
  //   3) upgrade           → "você desbloqueou tudo" (sem senha, já tem login)
  // Usa o mesmo SMTP Hostinger.
  async function sendAcessoEmail(params: {
    para: string;
    nome?: string;
    senhaProvisoria?: string;
    plano: "gratuito" | "completo";
    contexto: "novo" | "upgrade" | "existente";
  }): Promise<boolean> {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;
    if (!host || !user || !pass) {
      console.warn("[sendAcessoEmail] SMTP não configurado. Pulando envio.");
      return false;
    }
    const linkApp = process.env.APP_URL || "https://app.educacaopelotrabalho.com";
    const primeiroNome = (params.nome || params.para.split("@")[0]).split(" ")[0];

    // Tipo de e-mail: upgrade > pago > gratuito
    const tipo: "gratis" | "pago" | "upgrade" =
      params.contexto === "upgrade" ? "upgrade" :
      params.plano === "completo" ? "pago" : "gratis";

    // ----- blocos reutilizáveis -----
    const linha = (n: string, txt: string) =>
      `<p style="margin:0 0 12px 0;font-size:14px;"><strong>${n}</strong> ${txt}</p>`;

    const trilha1 = "<strong>Chegar em uma área nova e entregar rápido</strong> — entenda como qualquer área funciona (SIPOC, RACI, organograma, indicadores) e mostre valor já nas primeiras semanas.";
    const trilha2 = "<strong>Recomendar melhorias com dados</strong> — faça a pergunta certa antes do gráfico e use análises gráficas e estatísticas pra transformar números em recomendação que o chefe aprova.";
    const trilha3 = "<strong>Conduzir mudanças com menos resistência</strong> — leve sua ideia adiante sem virar inimigo do time (mapa de stakeholders, jornada ADKAR).";
    const trilha4 = "<strong>Apresentações que convencem</strong> — estruture sua recomendação no frame executivo e seja ouvido pela diretoria.";
    const trilha5 = "<strong>Antecipar riscos</strong> — enxergue o problema antes dele acontecer com FMEA e as boas práticas do PMI para gestão de riscos.";
    const trilha6 = "<strong>Cultura Lean</strong> — entenda o Sistema Toyota de Produção e aprenda a enxergar e eliminar os 3 inimigos da eficiência: Muri, Mura e Muda (sobrecarga, irregularidade e desperdício).";
    const trilha7 = "<strong>Estatística aplicada a negócios</strong> — causa raiz com dados, testes de hipótese, regressão e controle de processo, sem precisar programar.";
    const trilha8 = "<strong>Especialista em Gestão de Projetos de Melhoria</strong> — o topo: conduza projetos complexos de ponta a ponta, integrando tudo o que aprendeu.";

    const mentorBloco =
      `<p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>Mentor Israel (IA)</strong> — um mentor que responde como eu responderia: ele busca a resposta primeiro nos meus próprios vídeos e materiais, com base nos meus 20 anos de experiência. Não é uma IA genérica da internet — é o meu jeito de pensar, à sua disposição.</p>`;
    const comunidadeBloco =
      `<p style="margin:0 0 12px 0;font-size:14px;">👥 <strong>Comunidade LBW</strong> — pergunte, troque experiências e sugira melhorias junto com outros profissionais.</p>`;
    const dashboardBloco =
      `<p style="margin:0 0 12px 0;font-size:14px;">📈 <strong>Dashboard</strong> — acompanhe seu progresso e seus resultados num lugar só.</p>`;

    // ----- monta cada e-mail -----
    let titulo: string;
    let planoLabel: string;
    let introHtml: string;
    let credenciaisHtml: string;
    let botaoLabel: string;
    let corpoHtml: string;

    // Credenciais: com senha (novatos) ou sem (upgrade)
    const credComSenha = `
      <div style="background:#F0F2FA;border-left:4px solid #0033CC;padding:16px 20px;margin:20px 0;">
        <p style="margin:0 0 8px 0;font-size:13px;color:#1E2D6E;font-weight:bold;">SEUS DADOS DE ACESSO</p>
        <p style="margin:4px 0;"><strong>E-mail:</strong> ${params.para}</p>
        <p style="margin:4px 0;"><strong>Senha provisória:</strong> <code style="background:#fff;padding:4px 8px;border:1px solid #ccc;border-radius:4px;font-family:monospace;">${params.senhaProvisoria || ""}</code></p>
        <p style="margin:10px 0 0 0;font-size:12px;color:#b45309;">⚠️ Por segurança, você vai criar a sua própria senha no primeiro acesso.</p>
      </div>`;
    const credSemSenha = `
      <div style="background:#F0F2FA;border-left:4px solid #0033CC;padding:16px 20px;margin:20px 0;">
        <p style="margin:0 0 4px 0;font-size:13px;color:#1E2D6E;font-weight:bold;">SEU ACESSO</p>
        <p style="margin:4px 0;">Entre com o <strong>mesmo login de sempre</strong>: ${params.para}</p>
      </div>`;

    if (tipo === "gratis") {
      titulo = "Seu acesso gratuito à LBW está liberado 🎉";
      planoLabel = "Plano Gratuito (Trilha 1)";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso à plataforma <strong>LBW</strong> está liberado. Você começa pela <strong>Trilha 1 — Como Chegar em uma Área Nova e Entregar Resultado Rapidamente</strong>.`;
      credenciaisHtml = credComSenha;
      botaoLabel = "ACESSAR MEU CURSO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎥 <strong>Vídeo-aulas</strong> — práticas e direto ao ponto, no seu ritmo.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🛠️ <strong>Ferramentas de gestão</strong> — SIPOC, RACI, Organograma e mais, pra usar em casos reais (você não só assiste, você executa).</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎯 <strong>Resolução de problemas</strong> — identifique os melhores projetos da sua área, execute e implemente as soluções — e se destaque de verdade no seu trabalho.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📊 <strong>Análise de dados</strong> — transforme números em decisão com gráficos, sem precisar de Excel avançado.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado da Trilha 1</strong> — ao concluir a trilha (respeitando o tempo mínimo), você recebe seu certificado.</p>
        ${dashboardBloco}
        ${mentorBloco}
        ${comunidadeBloco}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="font-weight:bold;color:#1E2D6E;margin:0 0 12px 0;">E TEM MAIS 7 TRILHAS ESPERANDO POR VOCÊ:</p>
        ${linha("2.", trilha2)}${linha("3.", trilha3)}${linha("4.", trilha4)}${linha("5.", trilha5)}${linha("6.", trilha6)}${linha("7.", trilha7)}${linha("8.", trilha8)}`;
    } else if (tipo === "pago") {
      titulo = "Bem-vindo à Formação completa LBW 🚀 seu acesso está liberado";
      planoLabel = "Plano Completo (8 trilhas)";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Que bom ter você aqui. Seu acesso ao <strong>Plano Completo da LBW</strong> está liberado — você tem <strong>todas as 8 trilhas</strong> e a plataforma inteira na mão, da primeira semana numa área nova até conduzir projetos complexos de ponta a ponta.`;
      credenciaisHtml = credComSenha;
      botaoLabel = "ACESSAR MINHA FORMAÇÃO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">SUA JORNADA COMPLETA — AS 8 TRILHAS:</p>
        ${linha("1.", trilha1)}${linha("2.", trilha2)}${linha("3.", trilha3)}${linha("4.", trilha4)}${linha("5.", trilha5)}${linha("6.", trilha6)}${linha("7.", trilha7)}${linha("8.", trilha8)}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="font-weight:bold;color:#1E2D6E;margin:0 0 12px 0;">E AINDA:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado em cada trilha</strong> — ao concluir uma trilha (respeitando o tempo mínimo), você recebe o certificado. São 8 certificados ao longo da jornada.</p>
        ${dashboardBloco}
        ${mentorBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Comece pela Trilha 1 e siga no seu ritmo. Está tudo liberado.</p>`;
    } else {
      // upgrade
      titulo = "Você desbloqueou tudo 🚀 acesso completo liberado — LBW";
      planoLabel = "Plano Completo (8 trilhas)";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Parabéns pela decisão — e obrigado pela confiança. Seu acesso acaba de ser <strong>atualizado para o Plano Completo</strong>: as <strong>8 trilhas</strong> e a plataforma inteira agora estão liberadas pra você.`;
      credenciaisHtml = credSemSenha;
      botaoLabel = "ENTRAR NA MINHA FORMAÇÃO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">AGORA É TUDO SEU — AS 8 TRILHAS:</p>
        ${linha("1.", trilha1)}${linha("2.", trilha2)}${linha("3.", trilha3)}${linha("4.", trilha4)}${linha("5.", trilha5)}${linha("6.", trilha6)}${linha("7.", trilha7)}${linha("8.", trilha8)}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="font-weight:bold;color:#1E2D6E;margin:0 0 12px 0;">E AINDA:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado em cada trilha</strong> — ao concluir uma trilha (respeitando o tempo mínimo), você recebe o certificado. São 8 certificados ao longo da jornada.</p>
        ${dashboardBloco}
        ${mentorBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Você já conhece a Trilha 1. Agora é seguir em frente — está tudo liberado.</p>`;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2A2F3A;">
        <div style="background:#1E2D6E;color:#fff;padding:24px;border-radius:6px 6px 0 0;">
          <h1 style="margin:0;font-size:22px;">${titulo}</h1>
          <p style="margin:6px 0 0 0;font-size:13px;opacity:.85;">LBW · Educação pelo Trabalho · ${planoLabel}</p>
        </div>
        <div style="background:#fff;padding:28px 24px;border:1px solid #ccc;border-top:0;border-radius:0 0 6px 6px;">
          <p style="font-size:15px;">${introHtml}</p>
          ${credenciaisHtml}
          <p style="margin:24px 0;text-align:center;">
            <a href="${linkApp}" style="background:#0033CC;color:#fff;padding:14px 36px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;font-size:15px;">${botaoLabel}</a>
          </p>
          ${corpoHtml}
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="font-size:13px;color:#666;">Qualquer dúvida, responda este e-mail.<br><strong>Israel Souza</strong> · Equipe LBW</p>
          <p style="font-size:12px;color:#9CA3AF;">O acesso é por aqui: <a href="${linkApp}" style="color:#0033CC;">${linkApp}</a></p>
        </div>
      </div>`;

    try {
      const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
      await transporter.sendMail({
        from: `"LBW · Educação pelo Trabalho" <${from}>`,
        to: params.para,
        subject: titulo,
        html,
      });
      return true;
    } catch (err: any) {
      console.error("[sendAcessoEmail] Erro SMTP:", err?.message || err);
      return false;
    }
  }

  // Verifica que o request vem de um admin autenticado (idToken Firebase no header).
  async function requireAdmin(req: any, res: any, next: any) {
    if (!isAdminReady()) {
      return res.status(503).json({ error: "Firebase Admin não configurado no servidor." });
    }
    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) {
      return res.status(401).json({ error: "Header Authorization Bearer <idToken> obrigatório." });
    }
    try {
      const decoded = await adminAuth().verifyIdToken(idToken);
      const email = (decoded.email || "").toLowerCase();
      const ADMIN_EMAILS = ["israelnz2018@hotmail.com", "israel@learningbyworking.com"];
      if (!ADMIN_EMAILS.includes(email)) {
        return res.status(403).json({ error: "Acesso restrito a administradores." });
      }
      req.adminEmail = email;
      req.adminUid = decoded.uid;
      next();
    } catch (err: any) {
      console.error("[requireAdmin] erro:", err);
      return res.status(401).json({ error: "idToken inválido ou expirado." });
    }
  }

  // GET /api/admin/users/list — lista TODOS os usuários (Auth + Firestore merged)
  // Resolve a "lacuna": usuários que existem no Firebase Auth mas não têm doc Firestore
  // aparecem aqui marcados como `_hasDoc: false` — admin pode regularizar com 1 clique.
  app.get("/api/admin/users/list", requireAdmin, async (_req: any, res) => {
    try {
      // 1. Lista tudo do Firebase Auth (max 1000)
      const authResult = await adminAuth().listUsers(1000);
      // 2. Lê tudo do Firestore users/
      const firestoreSnap = await adminFirestore().collection("users").get();
      const docsByUid = new Map<string, any>();
      firestoreSnap.docs.forEach(d => docsByUid.set(d.id, d.data()));

      // 3. Merge pelo uid
      const merged = authResult.users.map(au => {
        const doc = docsByUid.get(au.uid);
        if (doc) {
          return {
            ...doc,
            uid: au.uid,
            email: doc.email || au.email || "",
            _hasDoc: true,
            _authCreatedAt: au.metadata?.creationTime || null,
            _authDisabled: au.disabled || false,
          };
        }
        // Órfão — só Auth, sem doc Firestore
        return {
          uid: au.uid,
          email: au.email || "",
          nome: au.displayName || "",
          tipoUsuario: "aluno",
          plano: "gratuito",
          formacoes: [],
          creditoIA: { limite: 0, usado: 0, resetEm: au.metadata?.creationTime || new Date().toISOString() },
          criadoEm: au.metadata?.creationTime || new Date().toISOString(),
          _hasDoc: false,
          _authCreatedAt: au.metadata?.creationTime || null,
          _authDisabled: au.disabled || false,
        };
      });

      return res.json({ users: merged, count: merged.length });
    } catch (err: any) {
      console.error("[GET /api/admin/users/list] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao listar usuários." });
    }
  });

  // POST /api/admin/users/:uid/complete-profile — cria doc Firestore pra um usuário
  // que só existia no Firebase Auth ("órfão"). Aplica defaults razoáveis.
  app.post("/api/admin/users/:uid/complete-profile", requireAdmin, async (req: any, res) => {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "uid obrigatório." });
    try {
      // Verifica se o usuário existe no Auth
      const authUser = await adminAuth().getUser(uid);
      // Confirma que não tem doc ainda — não sobrescreve dados existentes
      const docRef = adminFirestore().collection("users").doc(uid);
      const snap = await docRef.get();
      if (snap.exists) {
        return res.status(409).json({ error: "Usuário já tem doc Firestore. Use o botão Editar." });
      }
      const novoDoc = {
        uid,
        email: authUser.email || "",
        nome: authUser.displayName || "",
        tipoUsuario: "aluno",
        plano: "gratuito",
        formacoes: ["projetos-melhoria-introdutoria"],
        creditoIA: {
          limite: 100,
          usado: 0,
          resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        },
        criadoEm: authUser.metadata?.creationTime || new Date().toISOString(),
      };
      await docRef.set(novoDoc);
      return res.json({ ok: true, doc: novoDoc });
    } catch (err: any) {
      console.error("[POST complete-profile] erro:", err);
      if (err?.code === "auth/user-not-found") {
        return res.status(404).json({ error: "Conta Firebase Auth não encontrada." });
      }
      return res.status(500).json({ error: err?.message || "Erro ao completar perfil." });
    }
  });

  // POST /api/admin/users — cria conta Firebase Auth + doc Firestore
  app.post("/api/admin/users", requireAdmin, async (req: any, res) => {
    const { email, nome, plano, formacoes, empresaId, empresaNome, maxAlunos, tipoUsuario } = req.body as {
      email: string;
      nome?: string;
      plano?: "gratuito" | "completo" | "coordenador";
      formacoes?: string[];
      empresaId?: string;
      empresaNome?: string;
      maxAlunos?: number;
      tipoUsuario?: "aluno" | "coordenador";
    };
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "E-mail inválido." });
    }
    const senhaProvisoria = Math.random().toString(36).slice(-10);
    const tipo = tipoUsuario === "coordenador" ? "coordenador" : "aluno";
    try {
      const userRecord = await adminAuth().createUser({
        email: email.toLowerCase().trim(),
        password: senhaProvisoria,
        displayName: nome || undefined,
      });
      await adminFirestore().collection("users").doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: userRecord.email || email.toLowerCase().trim(),
        nome: nome || "",
        tipoUsuario: tipo,
        plano: plano || (tipo === "coordenador" ? "coordenador" : "gratuito"),
        formacoes: Array.isArray(formacoes) && formacoes.length > 0
          ? formacoes
          : ["projetos-melhoria-introdutoria"],
        creditoIA: {
          limite: 100,
          usado: 0,
          resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        },
        ...(empresaId ? { empresaId } : {}),
        ...(empresaNome ? { empresaNome } : {}),
        ...(typeof maxAlunos === "number" ? { maxAlunos } : {}),
        criadoEm: new Date().toISOString(),
      });
      // Tenta enviar e-mail de boas-vindas automaticamente
      const appUrl = (req.body as any)?.appUrl;
      const emailEnviado = await sendWelcomeEmail({
        para: userRecord.email || email.toLowerCase().trim(),
        nome: nome || "",
        senhaProvisoria,
        appUrl,
        contexto: "novo",
      });
      return res.json({
        ok: true,
        uid: userRecord.uid,
        email: userRecord.email,
        senhaProvisoria,
        emailEnviado,
      });
    } catch (err: any) {
      console.error("[POST /api/admin/users] erro:", err);
      if (err?.code === "auth/email-already-exists") {
        return res.status(409).json({ error: "E-mail já cadastrado no Firebase Auth." });
      }
      return res.status(500).json({ error: err?.message || "Erro ao criar usuário." });
    }
  });

  // PATCH /api/admin/users/:uid — edita doc Firestore (e displayName/email no Auth se vier)
  app.patch("/api/admin/users/:uid", requireAdmin, async (req: any, res) => {
    const { uid } = req.params;
    const updates = req.body as Record<string, any>;
    if (!uid) return res.status(400).json({ error: "uid obrigatório." });
    try {
      const firestoreUpdate: Record<string, any> = {};
      const allowed = [
        "nome",
        "tipoUsuario",
        "plano",
        "formacoes",
        "empresaId",
        "empresaNome",
        "maxAlunos",
        "creditoIA",
      ];
      for (const k of allowed) {
        if (updates[k] !== undefined) firestoreUpdate[k] = updates[k];
      }
      if (Object.keys(firestoreUpdate).length > 0) {
        await adminFirestore().collection("users").doc(uid).set(firestoreUpdate, { merge: true });
      }
      // Atualizar displayName no Auth se mudou o nome
      if (updates.nome !== undefined) {
        try {
          await adminAuth().updateUser(uid, { displayName: updates.nome });
        } catch (e) {
          console.warn("[PATCH /api/admin/users] não atualizou displayName no Auth:", e);
        }
      }
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("[PATCH /api/admin/users] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao atualizar usuário." });
    }
  });

  // DELETE /api/admin/users/:uid — apaga Auth + Firestore
  app.delete("/api/admin/users/:uid", requireAdmin, async (req: any, res) => {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "uid obrigatório." });
    try {
      // Auth primeiro (se falhar aqui, paramos sem corromper o Firestore)
      try {
        await adminAuth().deleteUser(uid);
      } catch (e: any) {
        // Se a conta já foi deletada do Auth, segue pra limpar Firestore
        if (e?.code !== "auth/user-not-found") {
          throw e;
        }
        console.warn(`[DELETE /api/admin/users/${uid}] conta Auth já não existia.`);
      }
      // Firestore
      await adminFirestore().collection("users").doc(uid).delete();
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("[DELETE /api/admin/users] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao deletar usuário." });
    }
  });

  // POST /api/admin/users/:uid/reset-password — gera nova senha provisória + envia e-mail
  app.post("/api/admin/users/:uid/reset-password", requireAdmin, async (req: any, res) => {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ error: "uid obrigatório." });
    try {
      const senhaProvisoria = Math.random().toString(36).slice(-10);
      const userRecord = await adminAuth().updateUser(uid, { password: senhaProvisoria });
      // Manda e-mail com a senha nova (se SMTP configurado)
      const emailEnviado = await sendWelcomeEmail({
        para: userRecord.email || "",
        nome: userRecord.displayName || "",
        senhaProvisoria,
        appUrl: (req.body as any)?.appUrl,
        contexto: "reset",
      });
      return res.json({ ok: true, senhaProvisoria, emailEnviado });
    } catch (err: any) {
      console.error("[POST reset-password] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao resetar senha." });
    }
  });

  // ===============================================================
  // Hostinger Reach API — sincroniza contatos do Firestore p/ email marketing
  // Token na env HOSTINGER_API_TOKEN (Railway). Base: developers.hostinger.com
  // Endpoint da Reach: POST /api/reach/v1/contacts  { email(req), name, surname }
  // ===============================================================
  const REACH_BASE = "https://developers.hostinger.com";

  // Adiciona/atualiza um contato no Reach. Retorna {ok, status, body}.
  async function reachAddContact(params: { email: string; name?: string; surname?: string; note?: string }) {
    const token = process.env.HOSTINGER_API_TOKEN;
    if (!token) return { ok: false, status: 0, body: "HOSTINGER_API_TOKEN não configurado." };
    const email = (params.email || "").trim().toLowerCase();
    if (!email || email.indexOf("@") < 0) return { ok: false, status: 0, body: "email inválido." };
    try {
      const r = await fetch(`${REACH_BASE}/api/reach/v1/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email,
          name: params.name || undefined,
          surname: params.surname || undefined,
          note: params.note || undefined,
        }),
      });
      const text = await r.text();
      // 409/422 = contato já existe → tratamos como sucesso (idempotente)
      const jaExiste = r.status === 409 || r.status === 422 || /exist/i.test(text);
      return { ok: r.ok || jaExiste, status: r.status, body: text, jaExiste };
    } catch (err: any) {
      return { ok: false, status: 0, body: err?.message || "erro de rede" };
    }
  }

  // GET /api/reach/groups — testa a conexão listando contatos (admin).
  // NB: usamos /contacts (funciona); /contacts/groups está bugado na Hostinger (Reach:9999).
  app.get("/api/reach/groups", requireAdmin, async (_req: any, res) => {
    const token = process.env.HOSTINGER_API_TOKEN;
    if (!token) return res.status(503).json({ error: "HOSTINGER_API_TOKEN não configurado no Railway." });
    try {
      const r = await fetch(`${REACH_BASE}/api/reach/v1/contacts`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const raw = await r.text();
      let parsed: any = null;
      try { parsed = JSON.parse(raw); } catch { /* não-JSON */ }
      if (r.ok) {
        const total = Array.isArray(parsed?.data) ? parsed.data.length : undefined;
        return res.status(200).json({ ok: true, totalNaPrimeiraPagina: total });
      }
      return res.status(r.status).json({
        error: `Reach respondeu HTTP ${r.status}.`,
        dica: r.status === 401 ? "Token inválido. Confira HOSTINGER_API_TOKEN no Railway."
          : r.status === 403 ? "Token sem permissão pro Reach."
          : "Erro ao chamar o Reach.",
        detalhe: parsed ?? raw?.slice(0, 300),
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao chamar a Hostinger." });
    }
  });

  // POST /api/reach/sync-contact — adiciona UM contato (chamado pelo n8n no cadastro).
  // Protegido por segredo simples no header x-reach-secret (env REACH_SYNC_SECRET),
  // pois o n8n não tem idToken de admin. Body: { email, name }.
  app.post("/api/reach/sync-contact", async (req: any, res) => {
    const secret = process.env.REACH_SYNC_SECRET;
    if (secret && req.headers["x-reach-secret"] !== secret) {
      return res.status(401).json({ error: "segredo inválido." });
    }
    const { email, name } = req.body || {};
    if (!email) return res.status(400).json({ error: "email obrigatório." });
    const result = await reachAddContact({ email, name, note: "cadastro plataforma LBW" });
    return res.status(result.ok ? 200 : 502).json(result);
  });

  // POST /api/reach/sync-all — carga inicial: empurra TODOS os leads do Firestore
  // pro Reach (admin). Roda em lote com pausa pra não estourar rate limit.
  app.post("/api/reach/sync-all", requireAdmin, async (_req: any, res) => {
    if (!process.env.HOSTINGER_API_TOKEN) {
      return res.status(503).json({ error: "HOSTINGER_API_TOKEN não configurado no Railway." });
    }
    try {
      const snap = await adminFirestore().collection("users").get();
      const contatos = snap.docs
        .map((d) => d.data())
        .filter((u: any) => u && u.email && String(u.email).indexOf("@") > 0)
        .map((u: any) => ({ email: String(u.email), name: u.nome || u.displayName || "" }));

      let enviados = 0, jaExistiam = 0, falhas = 0;
      const erros: any[] = [];
      for (const c of contatos) {
        const r = await reachAddContact({ email: c.email, name: c.name, note: "carga inicial LBW" });
        if (r.jaExiste) jaExistiam++;
        else if (r.ok) enviados++;
        else { falhas++; if (erros.length < 10) erros.push({ email: c.email, status: r.status, body: r.body }); }
        await new Promise((ok) => setTimeout(ok, 350)); // ~3/seg, conservador
      }
      return res.json({ total: contatos.length, enviados, jaExistiam, falhas, erros });
    } catch (err: any) {
      console.error("[POST /api/reach/sync-all] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro na carga inicial." });
    }
  });

  // ===============================================================
  // Campanhas via RESEND — envio em massa pros leads do Firestore.
  // NÃO mexe no SMTP existente (sendWelcomeEmail/sendAcessoEmail seguem iguais).
  // Token na env RESEND_API_KEY. Remetente RESEND_FROM (default contact@learningbyworking.com).
  // ===============================================================
  const RESEND_FROM = process.env.RESEND_FROM || "LBW <contact@learningbyworking.com>";

  // Envia 1 email via API do Resend. Retorna {ok, status, body}.
  async function resendSend(params: { to: string; subject: string; html: string }) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, status: 0, body: "RESEND_API_KEY não configurada." };
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ from: RESEND_FROM, to: params.to, subject: params.subject, html: params.html }),
      });
      const text = await r.text();
      return { ok: r.ok, status: r.status, body: text };
    } catch (err: any) {
      return { ok: false, status: 0, body: err?.message || "erro de rede" };
    }
  }

  // Configuração editável do template de e-mail (aba Template, na UI).
  // Vive em config/marketingTemplate; cai nos defaults abaixo se não existir.
  // Template GLOBAL: só cabeçalho (cor + marca), cor padrão dos botões e rodapé.
  // Título e botões são decididos por e-mail (marcações no corpo), não aqui.
  type TemplateConfig = {
    headerCor: string; headerTitulo: string; headerSubtitulo: string;
    botaoCor: string; rodapeTexto: string;
  };
  const TEMPLATE_DEFAULT: TemplateConfig = {
    headerCor: "#1E2D6E",
    headerTitulo: "Learning by Working",
    headerSubtitulo: "Educação pelo Trabalho",
    botaoCor: "#0033CC",
    rodapeTexto: "Você recebe este e-mail porque se cadastrou na plataforma LBW.\nLearning by Working — Educação pelo Trabalho · contact@learningbyworking.com",
  };

  async function lerTemplate(): Promise<TemplateConfig> {
    try {
      const snap = await adminFirestore().collection("config").doc("marketingTemplate").get();
      if (snap.exists) return { ...TEMPLATE_DEFAULT, ...(snap.data() as any) };
    } catch (e) { /* default */ }
    return TEMPLATE_DEFAULT;
  }

  function esc(s: string) { return String(s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // Primeiro nome da pessoa, ou "" se não houver.
  function primeiroNomeDe(nome?: string): string {
    return String(nome || "").trim().split(/\s+/)[0] || "";
  }

  // Substitui {nome} no texto. Se a pessoa não tem nome, usa uma saudação genérica:
  // "Oi {nome}," vira "Olá," e "{nome}" sozinho vira "tudo bem". Evita "Oi ,".
  function aplicarNome(texto: string, nome?: string): string {
    const pn = primeiroNomeDe(nome);
    if (pn) return texto.replace(/\{nome\}/g, pn);
    // sem nome: trata os padrões comuns de saudação pra não ficar esquisito
    return texto
      .replace(/\boi,?\s*\{nome\}/gi, "Olá")
      .replace(/\bol[áa],?\s*\{nome\}/gi, "Olá")
      .replace(/\{nome\}/g, "tudo bem");
  }

  // Extrai o ID de um link do YouTube (watch?v=, youtu.be/, /embed/).
  function youtubeId(url: string): string | null {
    const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  // Marcações OPCIONAIS que o admin escreve no corpo de cada e-mail, decididas
  // e-mail por e-mail (não no template global):
  //   [titulo: Texto]            -> título de destaque
  //   [botao: Texto | https://…] -> botão clicável (quantos quiser)
  //   [video: link-youtube]      -> capa do vídeo clicável (e-mail não toca embutido)
  // O botaoCor vem do template (cor padrão dos botões).
  function aplicarMarcacoes(corpoHtml: string, botaoCor: string): string {
    let out = corpoHtml;

    // [titulo: ...]
    out = out.replace(/\[titulo:\s*([^\]]+)\]/gi, (_f, txt) =>
      `<h2 style="color:#1E2D6E; font-size:21px; font-weight:bold; margin:8px 0 14px 0;">${esc(String(txt).trim())}</h2>`);

    // [botao: Texto | link]  (aceita vários no mesmo e-mail)
    out = out.replace(/\[botao:\s*([^\]]+)\]/gi, (_f, conteudo) => {
      const partes = String(conteudo).split("|");
      const texto = (partes[0] || "").trim();
      const link = (partes[1] || "").trim();
      if (!texto || !link) return "";
      return `<div style="margin:14px 0;"><a href="${esc(link)}" style="display:inline-block; background:${esc(botaoCor)}; color:#fff; text-decoration:none; font-weight:bold; font-size:15px; padding:13px 26px; border-radius:8px;">${esc(texto)}</a></div>`;
    });

    // [video: link]
    out = out.replace(/\[video:\s*([^\]]+)\]/gi, (_f, url) => {
      const id = youtubeId(String(url).trim());
      if (!id) return "";
      const thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
      const link = `https://www.youtube.com/watch?v=${id}`;
      return `
        <a href="${link}" style="display:block; max-width:480px; margin:12px auto; position:relative; text-decoration:none;">
          <img src="${thumb}" alt="Assistir ao vídeo" width="480" style="width:100%; max-width:480px; border-radius:10px; display:block;" />
          <span style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:rgba(0,0,0,.75); color:#fff; width:64px; height:44px; border-radius:10px; text-align:center; line-height:44px; font-size:22px;">&#9658;</span>
        </a>`;
    });

    return out;
  }

  // Envolve o corpo (HTML já pronto) no layout da marca, usando a config do template.
  // Título e botões são marcações no próprio corpo (por e-mail), não no template.
  function campanhaHtmlCom(corpoHtmlRaw: string, t: TemplateConfig) {
    const corpoHtml = aplicarMarcacoes(corpoHtmlRaw, t.botaoCor); // [titulo:]/[botao:]/[video:]
    const rodape = esc(t.rodapeTexto).replace(/\n/g, "<br/>");
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background:#ffffff; color:#2A2F3A;">
        <div style="background:${esc(t.headerCor)}; padding:20px 24px;">
          <span style="color:#fff; font-weight:bold; font-size:18px; letter-spacing:.5px;">${esc(t.headerTitulo)}</span>
          ${t.headerSubtitulo ? `<span style="color:#ffffffcc; font-size:13px;"> · ${esc(t.headerSubtitulo)}</span>` : ""}
        </div>
        <div style="padding:28px 24px; font-size:15px; line-height:1.6;">
          ${corpoHtml}
        </div>
        <div style="padding:20px 24px; border-top:1px solid #eee; font-size:12px; color:#9CA3AF;">
          ${rodape}
        </div>
      </div>`;
  }

  // Versão síncrona com defaults — mantém compatibilidade com chamadas existentes.
  // (As que querem o template editado devem passar a config via campanhaHtmlCom.)
  function campanhaHtml(corpoHtml: string) {
    return campanhaHtmlCom(corpoHtml, TEMPLATE_DEFAULT);
  }

  // GET /api/campanha/teste — confere se o Resend está configurado (admin).
  app.get("/api/campanha/teste", requireAdmin, async (_req: any, res) => {
    if (!process.env.RESEND_API_KEY) return res.status(503).json({ ok: false, error: "RESEND_API_KEY não configurada no Railway." });
    return res.json({ ok: true, from: RESEND_FROM });
  });

  // POST /api/campanha/enviar — dispara uma campanha pra todos os leads do Firestore (admin).
  // Body: { assunto, corpo (texto ou html), html?: boolean }. Envia em lote com pausa.
  app.post("/api/campanha/enviar", requireAdmin, async (req: any, res) => {
    if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: "RESEND_API_KEY não configurada no Railway." });
    const { assunto, corpo, html } = req.body || {};
    if (!assunto || !corpo) return res.status(400).json({ error: "assunto e corpo são obrigatórios." });
    // texto simples → parágrafos; html → usa direto
    const corpoHtml = html ? String(corpo) : String(corpo).split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
    const finalHtml = campanhaHtml(corpoHtml);
    try {
      const snap = await adminFirestore().collection("users").get();
      const emails = Array.from(new Set(
        snap.docs.map((d) => d.data()).filter((u: any) => u?.email && String(u.email).indexOf("@") > 0).map((u: any) => String(u.email).trim().toLowerCase())
      ));
      let enviados = 0, falhas = 0;
      const erros: any[] = [];
      for (const to of emails) {
        const r = await resendSend({ to, subject: assunto, html: finalHtml });
        if (r.ok) enviados++;
        else { falhas++; if (erros.length < 10) erros.push({ to, status: r.status, body: r.body?.slice(0, 200) }); }
        await new Promise((ok) => setTimeout(ok, 120)); // ~8/seg
      }
      return res.json({ total: emails.length, enviados, falhas, erros });
    } catch (err: any) {
      console.error("[POST /api/campanha/enviar] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao enviar campanha." });
    }
  });

  // ===============================================================
  // Reativação: cria contas COMPLETAS (acesso grátis até 01/10/2026) pros contatos
  // do Reach, cada um com senha provisória própria. Retorna a lista email→senha pro
  // admin mandar no e-mail. Idempotente: se já existe, só garante completo + validade.
  // ===============================================================
  const REATIVACAO_ATE = "2026-12-31T23:59:59-03:00";

  app.post("/api/reativacao/criar-contas", requireAdmin, async (_req: any, res) => {
    if (!process.env.HOSTINGER_API_TOKEN) return res.status(503).json({ error: "HOSTINGER_API_TOKEN não configurado (preciso ler os contatos do Reach)." });
    try {
      // 1) lê todos os emails do Reach (paginado)
      const token = process.env.HOSTINGER_API_TOKEN;
      const emails: string[] = [];
      for (let page = 1; page <= 20; page++) {
        const r = await fetch(`${REACH_BASE}/api/reach/v1/contacts?page=${page}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!r.ok) break;
        const j: any = await r.json().catch(() => ({}));
        const arr = Array.isArray(j?.data) ? j.data : [];
        arr.forEach((c: any) => { if (c?.email) emails.push(String(c.email).toLowerCase().trim()); });
        const meta = j?.meta;
        if (!meta || meta.current_page >= Math.ceil((meta.total || 0) / (meta.per_page || 25))) break;
      }
      const unicos = Array.from(new Set(emails)).filter((e) => e.indexOf("@") > 0);

      // 2) cria/atualiza cada conta como completo + validade.
      // Senha temporária ÚNICA (igual pra todos) -> permite um e-mail de convite em massa idêntico.
      // senhaProvisoria:true força a troca obrigatória no 1º login (App.tsx + DefinirSenha.tsx).
      const SENHA_CONVITE = "LBW2026";
      const credenciais: { email: string; senha: string; status: string }[] = [];
      let criados = 0, atualizados = 0, falhas = 0;
      for (const email of unicos) {
        const senha = SENHA_CONVITE;
        try {
          let uid: string, novo = false;
          try { uid = (await adminAuth().getUserByEmail(email)).uid; await adminAuth().updateUser(uid, { password: senha }); }
          catch { uid = (await adminAuth().createUser({ email, password: senha })).uid; novo = true; }
          const ref = adminFirestore().collection("users").doc(uid);
          const snap = await ref.get();
          const base = snap.exists ? (snap.data() as any) : {};
          await ref.set({
            uid, email,
            nome: base.nome || "",
            tipoUsuario: base.tipoUsuario === "admin" || base.tipoUsuario === "coordenador" ? base.tipoUsuario : "aluno",
            plano: "completo",
            acessoCompletoAte: REATIVACAO_ATE,
            origemAcesso: "convite-reativacao",
            formacoes: Array.isArray(base.formacoes) && base.formacoes.length > 0 ? base.formacoes : ["projetos-melhoria-introdutoria"],
            creditoIA: base.creditoIA || { limite: 100, usado: 0, resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() },
            criadoEm: base.criadoEm || new Date().toISOString(),
            senhaProvisoria: true, // força troca obrigatória no 1º acesso (senha LBW2026 é compartilhada)
          }, { merge: true });
          credenciais.push({ email, senha, status: novo ? "criado" : "atualizado" });
          novo ? criados++ : atualizados++;
        } catch (e: any) {
          falhas++; credenciais.push({ email, senha: "", status: "falha: " + (e?.message || "") });
        }
      }
      return res.json({ total: unicos.length, criados, atualizados, falhas, acessoAte: REATIVACAO_ATE, credenciais });
    } catch (err: any) {
      console.error("[POST /api/reativacao/criar-contas] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao criar contas." });
    }
  });

  // ===============================================================
  // SEQUÊNCIAS DE E-MAIL AUTOMÁTICAS (Lead + Grátis) — o "motor"
  // -----------------------------------------------------------------
  // Estágio de cada usuário (decidido pelo estado ATUAL no Firestore):
  //   lead   = conta gratuita que NUNCA acessou  (sem primeiroAcessoEm, plano != completo)
  //   gratis = conta gratuita que JÁ acessou      (com primeiroAcessoEm, plano != completo)
  //   pago   = plano completo                      (newsletter é manual, não entra aqui)
  // Um cron diário varre os users, classifica cada um, vê quantos dias desde o
  // cadastro e envia o e-mail da sequência que "vence" hoje — se ainda não foi
  // enviado (marca em users/{uid}.emailSequencia.{pacote}_{n}). Idempotente.
  // As sequências (textos/dias) vivem em config/marketingSequencias pra serem
  // editáveis pela tela (Fase 2). Se o doc não existir, usa os defaults abaixo.
  // ===============================================================

  type SeqEmail = { dia: number; assunto: string; corpo: string; ativo: boolean };
  type Sequencias = { lead: SeqEmail[]; gratis: SeqEmail[] };

  const SEQUENCIAS_DEFAULT: Sequencias = {
    lead: [
      { dia: 0, ativo: true, assunto: "Seu acesso está pronto — entra aqui", corpo: "Oi {nome},\n\nVocê pediu acesso à plataforma mas ainda não entrou. Tá tudo pronto te esperando.\n\nÉ só entrar e dar uma volta.\n\nIsrael" },
      { dia: 2, ativo: true, assunto: "Ainda dá tempo de começar", corpo: "Oi {nome},\n\nReparei que você ainda não entrou. Em 5 minutos você já mexe na primeira ferramenta.\n\nIsrael" },
      { dia: 5, ativo: true, assunto: "O que você está perdendo", corpo: "Oi {nome},\n\nDeixa eu te mostrar rapidinho o que tem lá dentro.\n\nIsrael" },
    ],
    gratis: [
      { dia: 0, ativo: true, assunto: "Bem-vindo! Comece por aqui", corpo: "Oi {nome},\n\nQue bom te ver por aqui. Deixa eu te mostrar o primeiro passo.\n\nIsrael" },
      { dia: 2, ativo: true, assunto: "A ferramenta que todo mundo ama", corpo: "Oi {nome},\n\nHoje quero te mostrar o SIPOC na prática.\n\nIsrael" },
      { dia: 5, ativo: true, assunto: "Caso real: como apliquei isso", corpo: "Oi {nome},\n\nDeixa eu te contar uma história de chão de fábrica.\n\nIsrael" },
      { dia: 9, ativo: true, assunto: "O que você ganha com o completo", corpo: "Oi {nome},\n\nVocê já viu bastante coisa. Tem muito mais no plano completo.\n\nIsrael" },
      { dia: 14, ativo: true, assunto: "Última dica + um convite", corpo: "Oi {nome},\n\nFechando nossa sequência com uma última dica.\n\nIsrael" },
    ],
  };

  async function lerSequencias(): Promise<Sequencias> {
    try {
      const snap = await adminFirestore().collection("config").doc("marketingSequencias").get();
      if (snap.exists) {
        const d = snap.data() as any;
        return {
          lead: Array.isArray(d?.lead) ? d.lead : SEQUENCIAS_DEFAULT.lead,
          gratis: Array.isArray(d?.gratis) ? d.gratis : SEQUENCIAS_DEFAULT.gratis,
        };
      }
    } catch (e) { /* cai no default */ }
    return SEQUENCIAS_DEFAULT;
  }

  function classificarUsuario(u: any): "lead" | "gratis" | "pago" | null {
    if (!u || !u.email) return null;
    if (u.plano === "completo") return "pago";
    if (u.tipoUsuario === "admin" || u.tipoUsuario === "coordenador") return null; // não recebem sequência
    return u.primeiroAcessoEm ? "gratis" : "lead";
  }

  function diasDesde(iso: string): number {
    const t = Date.parse(iso);
    if (isNaN(t)) return -1;
    return Math.floor((Date.now() - t) / (24 * 3600 * 1000));
  }

  // Processa um ciclo de envios. Retorna um resumo (e detalhes pra log/teste).
  async function processarEnviosDiarios(opts: { dryRun?: boolean } = {}) {
    const dryRun = !!opts.dryRun;
    const seqs = await lerSequencias();
    const template = await lerTemplate();
    const resumo = {
      rodadoEm: new Date().toISOString(), dryRun,
      analisados: 0, enviados: 0, falhas: 0, pulados: 0,
      porPacote: { lead: 0, gratis: 0 } as Record<string, number>,
      detalhes: [] as any[],
    };

    const snap = await adminFirestore().collection("users").get();
    for (const doc of snap.docs) {
      const u = doc.data() as any;
      resumo.analisados++;
      const estagio = classificarUsuario(u);
      if (estagio !== "lead" && estagio !== "gratis") { resumo.pulados++; continue; }

      const seq = seqs[estagio];
      const base = u.criadoEm || u.primeiroAcessoEm;
      if (!base) { resumo.pulados++; continue; }
      const dias = diasDesde(base);
      if (dias < 0) { resumo.pulados++; continue; }

      const jaEnviados = (u.emailSequencia && typeof u.emailSequencia === "object") ? u.emailSequencia : {};

      // Acha o e-mail da sequência que "vence" hoje: dia <= dias, ativo, ainda não enviado.
      // Pega o de maior 'dia' elegível (se o cron atrasou, manda o mais recente devido — não floda).
      let alvo: { idx: number; email: SeqEmail } | null = null;
      seq.forEach((email, idx) => {
        const chave = `${estagio}_${idx + 1}`;
        if (!email.ativo) return;
        if (jaEnviados[chave]) return;
        if (email.dia > dias) return;
        if (!alvo || email.dia > alvo.email.dia) alvo = { idx, email };
      });
      if (!alvo) { resumo.pulados++; continue; }

      const chave = `${estagio}_${alvo.idx + 1}`;
      const corpoTxt = aplicarNome(String(alvo.email.corpo), u.nome);
      const corpoHtml = campanhaHtmlCom(corpoTxt.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join(""), template);

      if (dryRun) {
        resumo.detalhes.push({ email: u.email, estagio, envia: chave, assunto: alvo.email.assunto });
        resumo.enviados++; resumo.porPacote[estagio]++;
        continue;
      }

      const r = await resendSend({ to: u.email, subject: alvo.email.assunto, html: corpoHtml });
      if (r.ok) {
        // marca como enviado SÓ se deu certo (senão tenta de novo amanhã — proteção defensiva)
        await doc.ref.set({ emailSequencia: { ...jaEnviados, [chave]: new Date().toISOString() } }, { merge: true });
        resumo.enviados++; resumo.porPacote[estagio]++;
        resumo.detalhes.push({ email: u.email, estagio, enviou: chave, ok: true });
      } else {
        resumo.falhas++;
        resumo.detalhes.push({ email: u.email, estagio, enviou: chave, ok: false, erro: r.status + " " + String(r.body).slice(0, 120) });
      }
      await new Promise((ok) => setTimeout(ok, 130)); // ~7/seg, respeita rate limit
    }

    // guarda a última execução pra a faixa de status da tela (Fase 2)
    try {
      await adminFirestore().collection("config").doc("marketingMotorStatus").set({
        ...resumo, detalhes: resumo.detalhes.slice(0, 50),
      });
    } catch (e) { /* não-crítico */ }
    console.log(`[motor-email] rodado dryRun=${dryRun} analisados=${resumo.analisados} enviados=${resumo.enviados} falhas=${resumo.falhas} pulados=${resumo.pulados}`);
    return resumo;
  }

  // GET /api/marketing/sequencias — lê as sequências (tela Fase 2)
  app.get("/api/marketing/sequencias", requireAdmin, async (_req: any, res) => {
    return res.json(await lerSequencias());
  });

  // PUT /api/marketing/sequencias — salva as sequências editadas (tela Fase 2)
  app.put("/api/marketing/sequencias", requireAdmin, async (req: any, res) => {
    const { lead, gratis } = req.body || {};
    if (!Array.isArray(lead) || !Array.isArray(gratis)) return res.status(400).json({ error: "lead e gratis precisam ser arrays." });
    const limpa = (arr: any[]): SeqEmail[] => arr.map((e) => ({
      dia: Math.max(0, parseInt(e?.dia, 10) || 0),
      assunto: String(e?.assunto || ""),
      corpo: String(e?.corpo || ""),
      ativo: e?.ativo !== false,
    }));
    try {
      await adminFirestore().collection("config").doc("marketingSequencias").set({ lead: limpa(lead), gratis: limpa(gratis) });
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao salvar." });
    }
  });

  // GET /api/marketing/template — config editável do desenho dos e-mails
  app.get("/api/marketing/template", requireAdmin, async (_req: any, res) => {
    return res.json(await lerTemplate());
  });

  // PUT /api/marketing/template — salva a config do template
  app.put("/api/marketing/template", requireAdmin, async (req: any, res) => {
    const b = req.body || {};
    const limpo: TemplateConfig = {
      headerCor: String(b.headerCor || TEMPLATE_DEFAULT.headerCor),
      headerTitulo: String(b.headerTitulo ?? TEMPLATE_DEFAULT.headerTitulo),
      headerSubtitulo: String(b.headerSubtitulo ?? TEMPLATE_DEFAULT.headerSubtitulo),
      botaoCor: String(b.botaoCor || TEMPLATE_DEFAULT.botaoCor),
      rodapeTexto: String(b.rodapeTexto ?? TEMPLATE_DEFAULT.rodapeTexto),
    };
    try {
      await adminFirestore().collection("config").doc("marketingTemplate").set(limpo);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao salvar template." });
    }
  });

  // POST /api/marketing/template/preview — monta o HTML com um corpo de exemplo (preview)
  app.post("/api/marketing/template/preview", requireAdmin, async (req: any, res) => {
    const b = req.body || {};
    const t: TemplateConfig = { ...TEMPLATE_DEFAULT, ...b };
    const corpoTxt = String(b.corpoExemplo || "Oi {nome},\n\nEste é um exemplo de como seu e-mail vai chegar.\n\nIsrael");
    const corpoHtml = corpoTxt.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join("");
    return res.json({ html: campanhaHtmlCom(corpoHtml, t) });
  });

  // GET /api/marketing/status — resumo da última execução + contagem por estágio (faixa de status)
  app.get("/api/marketing/status", requireAdmin, async (_req: any, res) => {
    try {
      const [statusSnap, usersSnap] = await Promise.all([
        adminFirestore().collection("config").doc("marketingMotorStatus").get(),
        adminFirestore().collection("users").get(),
      ]);
      const contagem = { lead: 0, gratis: 0, pago: 0 };
      usersSnap.docs.forEach((d) => {
        const c = classificarUsuario(d.data());
        if (c && c in contagem) (contagem as any)[c]++;
      });
      return res.json({ ultimaExecucao: statusSnap.exists ? statusSnap.data() : null, contagem });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao ler status." });
    }
  });

  // POST /api/marketing/rodar-agora — dispara o motor na hora (teste). ?dry=1 só simula.
  app.post("/api/marketing/rodar-agora", requireAdmin, async (req: any, res) => {
    if (!process.env.RESEND_API_KEY && !req.query.dry) {
      return res.status(503).json({ error: "RESEND_API_KEY não configurada (use ?dry=1 pra simular)." });
    }
    try {
      const resumo = await processarEnviosDiarios({ dryRun: req.query.dry === "1" });
      return res.json(resumo);
    } catch (err: any) {
      console.error("[POST /api/marketing/rodar-agora] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao rodar o motor." });
    }
  });

  // Agendador: roda 1x/dia (~06:00). Checa de hora em hora se já rodou hoje.
  // Processo único no Railway, então não há risco de execução duplicada.
  let ultimoDiaProcessado = "";
  const HORA_ALVO = 6;
  setInterval(() => {
    const agora = new Date();
    const diaHoje = agora.toISOString().slice(0, 10);
    if (agora.getHours() >= HORA_ALVO && ultimoDiaProcessado !== diaHoje) {
      ultimoDiaProcessado = diaHoje;
      processarEnviosDiarios().catch((e) => console.error("[motor-email] erro no ciclo agendado:", e?.message || e));
    }
  }, 60 * 60 * 1000); // a cada hora

  // ===============================================================
  // NEWSLETTER (pacote Pago) — envio manual + histórico pra reenviar
  // Público-alvo por filtro: 'pago' (completo), 'gratis', 'lead' ou 'todos'.
  // Cada envio é salvo em newsletters/{id} pra você reabrir e reenviar.
  // ===============================================================

  function emailsPorPublico(docs: any[], publico: string): { email: string; nome: string }[] {
    const vistos = new Set<string>();
    const lista: { email: string; nome: string }[] = [];
    docs.forEach((d) => {
      const u = d.data ? d.data() : d;
      if (!u?.email || String(u.email).indexOf("@") < 0) return;
      const estagio = classificarUsuario(u);
      if (publico === "todos" || estagio === publico) {
        const email = String(u.email).trim().toLowerCase();
        if (vistos.has(email)) return;
        vistos.add(email);
        lista.push({ email, nome: u.nome || "" });
      }
    });
    return lista;
  }

  // POST /api/newsletter/enviar — body { assunto, corpo, publico }
  app.post("/api/newsletter/enviar", requireAdmin, async (req: any, res) => {
    if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: "RESEND_API_KEY não configurada no Railway." });
    const { assunto, corpo, publico } = req.body || {};
    if (!assunto || !corpo) return res.status(400).json({ error: "assunto e corpo são obrigatórios." });
    const alvo = ["pago", "gratis", "lead", "todos"].includes(publico) ? publico : "pago";
    try {
      const template = await lerTemplate();
      const snap = await adminFirestore().collection("users").get();
      const destinatarios = emailsPorPublico(snap.docs, alvo);
      let enviados = 0, falhas = 0;
      const erros: any[] = [];
      for (const dest of destinatarios) {
        const corpoTxt = aplicarNome(String(corpo), dest.nome);
        const html = campanhaHtmlCom(corpoTxt.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join(""), template);
        const r = await resendSend({ to: dest.email, subject: assunto, html });
        if (r.ok) enviados++;
        else { falhas++; if (erros.length < 10) erros.push({ to: dest.email, status: r.status, body: String(r.body).slice(0, 200) }); }
        await new Promise((ok) => setTimeout(ok, 130));
      }
      // salva no histórico
      const ref = adminFirestore().collection("newsletters").doc();
      await ref.set({
        id: ref.id, assunto, corpo, publico: alvo,
        total: destinatarios.length, enviados, falhas,
        enviadoEm: new Date().toISOString(),
      });
      return res.json({ id: ref.id, total: destinatarios.length, enviados, falhas, erros });
    } catch (err: any) {
      console.error("[POST /api/newsletter/enviar] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao enviar newsletter." });
    }
  });

  // GET /api/newsletter/historico — lista os envios passados (mais recentes primeiro)
  app.get("/api/newsletter/historico", requireAdmin, async (_req: any, res) => {
    try {
      const snap = await adminFirestore().collection("newsletters").get();
      const lista = snap.docs
        .map((d) => d.data())
        .sort((a: any, b: any) => String(b.enviadoEm).localeCompare(String(a.enviadoEm)));
      return res.json({ historico: lista });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao ler histórico." });
    }
  });

  // ===============================================================
  // TRACKING — webhook do Resend (abertura/clique) + painel de engajamento.
  // O Resend chama este endpoint a cada evento. Identificamos o usuário pelo
  // e-mail em data.to[0] e incrementamos contadores no perfil.
  //
  // ⚠️ ABERTURA é métrica IMPRECISA (Apple Mail infla, Gmail esconde imagens).
  // CLIQUE é confiável. A tela mostra os dois, mas avisa sobre a abertura.
  // ===============================================================

  // Webhook é PÚBLICO (o Resend não manda idToken). Validação leve por segredo
  // opcional em RESEND_WEBHOOK_SECRET (?s=...), pra evitar chamadas aleatórias.
  app.post("/api/webhooks/resend", async (req: any, res) => {
    const segredo = process.env.RESEND_WEBHOOK_SECRET;
    if (segredo && req.query.s !== segredo) return res.status(401).json({ error: "segredo inválido" });
    if (!isAdminReady()) return res.status(200).json({ ok: false, skipped: "admin não pronto" });

    try {
      const evt = req.body || {};
      const tipo = String(evt.type || "");
      const to = evt?.data?.to;
      const email = (Array.isArray(to) ? to[0] : to) ? String(Array.isArray(to) ? to[0] : to).toLowerCase().trim() : "";
      if (!email) return res.status(200).json({ ok: true, ignored: "sem destinatário" });

      const campo = tipo === "email.clicked" ? "cliques" : tipo === "email.opened" ? "aberturas" : null;
      if (!campo) return res.status(200).json({ ok: true, ignored: tipo });

      // acha o usuário por e-mail
      const q = await adminFirestore().collection("users").where("email", "==", email).limit(1).get();
      if (q.empty) return res.status(200).json({ ok: true, ignored: "usuário não encontrado" });
      const ref = q.docs[0].ref;
      const atual = (q.docs[0].data() as any)?.engajamento || {};
      await ref.set({
        engajamento: {
          aberturas: (atual.aberturas || 0) + (campo === "aberturas" ? 1 : 0),
          cliques: (atual.cliques || 0) + (campo === "cliques" ? 1 : 0),
          ultimoEvento: new Date().toISOString(),
          ultimoTipo: tipo,
        },
      }, { merge: true });
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error("[webhook resend] erro:", err?.message || err);
      return res.status(200).json({ ok: false }); // 200 sempre, pra o Resend não re-tentar infinito
    }
  });

  // GET /api/marketing/engajamento — usuários ordenados por engajamento (por pessoa)
  app.get("/api/marketing/engajamento", requireAdmin, async (_req: any, res) => {
    try {
      const snap = await adminFirestore().collection("users").get();
      const lista = snap.docs.map((d) => {
        const u = d.data() as any;
        const eng = u.engajamento || {};
        return {
          email: u.email, nome: u.nome || "",
          estagio: classificarUsuario(u),
          cliques: eng.cliques || 0,
          aberturas: eng.aberturas || 0,
          voltouAoApp: !!u.primeiroAcessoEm,
          ultimoEvento: eng.ultimoEvento || null,
        };
      }).filter((x) => x.estagio); // só quem está num estágio do funil
      // ordena por engajamento: cliques primeiro (confiável), depois aberturas
      lista.sort((a, b) => (b.cliques - a.cliques) || (b.aberturas - a.aberturas));
      return res.json({ usuarios: lista });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao ler engajamento." });
    }
  });

  // Mock Database State
  let projects: any[] = [];
  let datasets: any[] = [];
  let analysisRuns: any[] = [];

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/projects", (req, res) => {
    const project = { id: Date.now().toString(), ...req.body, currentPhase: 'Define', updatedAt: new Date().toISOString() };
    projects.push(project);
    res.status(201).json(project);
  });

  app.get("/api/projects", (req, res) => {
    res.json(projects);
  });

  app.post("/api/datasets/upload", (req, res) => {
    const dataset = { id: Date.now().toString(), ...req.body, createdAt: new Date().toISOString() };
    datasets.push(dataset);
    res.status(201).json(dataset);
  });

  app.post("/api/analysis/run", (req, res) => {
    const run = { 
      id: Date.now().toString(), 
      ...req.body, 
      results: { 
        mean: 45.2, 
        stdDev: 2.1, 
        pValue: 0.034, 
        interpretation: "Significant correlation found." 
      }, 
      createdAt: new Date().toISOString() 
    };
    analysisRuns.push(run);
    res.status(201).json(run);
  });

  // Convite por e-mail (SMTP Hostinger + links de webhooks n8n)
  app.post("/api/send-invite", async (req, res) => {
    const { para, nome, empresa, tipoEmail, mensagemExtra, appUrl, formacaoNome, aceitouMarketing } = req.body as {
      para: string;
      nome?: string;
      empresa?: string;
      tipoEmail: "convite_gratuito" | "convite_pago" | "convite_coordenador" | "time_coordenador";
      mensagemExtra?: string;
      appUrl?: string;
      formacaoNome?: string;
      aceitouMarketing?: boolean;
    };

    if (!para || !para.includes("@")) {
      return res.status(400).json({ error: "E-mail de destino inválido." });
    }

    // convite_gratuito: chama o n8n direto (server-to-server). O n8n cria a conta
    // e envia o e-mail com a senha provisória pro cliente. Sem SMTP nem botão intermediário.
    // Mantemos paridade de campos com o que a landing page envia (nome, email,
    // aceitouMarketing, formacaoNome) — o n8n parseia $json.body desses 4 campos.
    if (tipoEmail === "convite_gratuito") {
      const url = process.env.N8N_WEBHOOK_GRATUITO;
      if (!url) {
        return res.status(500).json({ error: "N8N_WEBHOOK_GRATUITO não configurado no .env." });
      }
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // Campos no formato esperado pelo n8n (idêntico à landing)
            nome: nome || "",
            email: para,
            aceitouMarketing: typeof aceitouMarketing === "boolean" ? aceitouMarketing : true,
            formacaoNome: formacaoNome || "Yellow Belt LBW",
            // Campos auxiliares pra rastreabilidade no n8n
            name: nome || "",
            source: "lbw-app-invite",
          }),
        });
        if (!r.ok) {
          const t = await r.text().catch(() => "");
          return res.status(502).json({ error: `n8n retornou ${r.status}: ${t.slice(0, 200)}` });
        }
        // n8n responde com { ok, ja_existe?: boolean, email?: string }.
        // Repassamos a flag pro frontend mostrar mensagem amigável quando a conta já existe.
        const body = await r.json().catch(() => ({} as any));
        return res.json({
          ok: true,
          source: "n8n",
          ja_existe: !!body?.ja_existe,
          email: body?.email || para,
        });
      } catch (err: any) {
        console.error("[/api/send-invite] Erro chamando n8n:", err);
        return res.status(500).json({ error: err?.message || "Falha ao acionar n8n." });
      }
    }

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user;

    if (!host || !user || !pass) {
      return res.status(500).json({
        error: "SMTP não configurado. Defina SMTP_HOST, SMTP_USER e SMTP_PASS no .env do servidor.",
      });
    }

    const WEBHOOK_GRATUITO = process.env.N8N_WEBHOOK_GRATUITO || "";
    const WEBHOOK_PAGO = process.env.N8N_WEBHOOK_PAGO || "";
    const WEBHOOK_COORDENADOR = process.env.N8N_WEBHOOK_COORDENADOR || "";
    const linkApp = appUrl || process.env.APP_URL || "https://lbw-copilot.app";

    // Define o conteúdo de acordo com o tipo de e-mail
    const config = {
      convite_gratuito: {
        titulo: "Conheça a plataforma LBW — acesso gratuito",
        chamada: `Quero te apresentar a <strong>LBW Continuous Improvement Copilot</strong>: uma plataforma de Lean Six Sigma e melhoria contínua com mentor de IA, ferramentas integradas (Charter, SIPOC, Ishikawa, FMEA e mais 40), análises estatísticas e geração automática de apresentações.<br><br>Liberei pra você o <strong>plano gratuito Yellow Belt</strong>, com a formação introdutória e as principais análises de dados. Sem cartão, sem amarras — é só criar a conta com este e-mail.`,
        botaoLabel: "Criar conta gratuita",
        botaoUrl: WEBHOOK_GRATUITO || linkApp,
      },
      convite_pago: {
        titulo: "Convite especial — Plano completo LBW",
        chamada: `Você foi indicado(a) a conhecer o <strong>plano completo da LBW Continuous Improvement Copilot</strong>: acesso total às 3 metodologias (DMAIC, Lean/Kaizen e PMI), mais de 40 ferramentas, 80+ análises estatísticas e mentor de IA dedicado.<br><br>Pelo link abaixo você finaliza a compra e, no primeiro login, todas as suas permissões já estarão configuradas automaticamente.`,
        botaoLabel: "Quero o plano completo",
        botaoUrl: WEBHOOK_PAGO || linkApp,
      },
      convite_coordenador: {
        titulo: "Plano Coordenador — gestão da sua equipe",
        chamada: `Para empresas e líderes de melhoria contínua: o <strong>plano Coordenador da LBW</strong> dá tudo do plano completo <em>mais</em> um dashboard exclusivo para gerenciar sua equipe — você acompanha o progresso dos seus alunos, distribui formações e mede a evolução de cada um.<br><br>Após a compra, sua área de gestão e a quantidade de vagas do time são liberadas automaticamente.`,
        botaoLabel: "Quero o plano Coordenador",
        botaoUrl: WEBHOOK_COORDENADOR || linkApp,
      },
      time_coordenador: {
        titulo: "Seu acesso à LBW foi liberado",
        chamada: `Boa notícia: você foi incluído(a) no time${empresa ? ` da empresa <strong>${empresa}</strong>` : ""} na plataforma <strong>LBW Continuous Improvement Copilot</strong>.<br><br>Suas formações, mentor de IA e ferramentas já estão liberadas. Basta fazer o cadastro com <strong>este mesmo e-mail</strong> que tudo aparece pronto na primeira entrada.`,
        botaoLabel: "Fazer meu cadastro",
        botaoUrl: linkApp,
      },
    }[tipoEmail] || null;

    if (!config) {
      return res.status(400).json({ error: "tipoEmail inválido." });
    }

    // Adiciona email e nome como query params na URL do botão (pra n8n receber via GET)
    const qs = new URLSearchParams();
    qs.set("email", para);
    if (nome) qs.set("name", nome);
    if (empresa) qs.set("empresa", empresa);
    const sep = config.botaoUrl.includes("?") ? "&" : "?";
    config.botaoUrl = `${config.botaoUrl}${sep}${qs.toString()}`;

    const saudacao = nome ? `Olá, ${nome.split(" ")[0]}!` : "Olá!";
    const mensagemExtraHtml = mensagemExtra
      ? `<div style="background: #F0F2FA; border-left: 4px solid #0033CC; padding: 12px 16px; margin: 16px 0; font-size: 14px;">${mensagemExtra.replace(/\n/g, "<br>")}</div>`
      : "";

    const html = `
<div style="font-family: Calibri, Arial, sans-serif; color: #2A2F3A; max-width: 600px; margin: 0 auto;">
  <div style="background: #1E2D6E; color: white; padding: 24px; border-radius: 4px 4px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">${config.titulo}</h1>
    <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.85;">LBW Continuous Improvement Copilot</p>
  </div>
  <div style="background: #ffffff; padding: 28px 24px; border: 1px solid #ccc; border-top: 0; border-radius: 0 0 4px 4px;">
    <p style="font-size: 15px;">${saudacao}</p>
    <p>${config.chamada}</p>
    ${mensagemExtraHtml}
    <p style="margin: 28px 0; text-align: center;">
      <a href="${config.botaoUrl}" style="background: #0033CC; color: white; padding: 14px 36px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block; font-size: 15px;">${config.botaoLabel}</a>
    </p>
    <p style="font-size: 13px; color: #666; text-align: center;">
      Ou copie e cole no navegador:<br>
      <a href="${config.botaoUrl}" style="color: #0033CC; word-break: break-all;">${config.botaoUrl}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="font-size: 12px; color: #9CA3AF;">Qualquer dúvida, responda este e-mail.<br>Equipe LBW · Learning by Working</p>
  </div>
</div>`.trim();

    const texto = [
      saudacao,
      "",
      config.chamada.replace(/<[^>]+>/g, ""),
      "",
      mensagemExtra || "",
      "",
      `${config.botaoLabel}: ${config.botaoUrl}`,
      "",
      "Qualquer dúvida, responda este e-mail.",
      "Equipe LBW",
    ].filter(Boolean).join("\n");

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      const info = await transporter.sendMail({
        from: `"LBW Continuous Improvement Copilot" <${from}>`,
        to: para,
        subject: config.titulo,
        text: texto,
        html,
      });
      res.json({ ok: true, messageId: info.messageId });
    } catch (err: any) {
      console.error("[/api/send-invite] Erro SMTP:", err);
      res.status(500).json({ error: err?.message || "Falha ao enviar e-mail." });
    }
  });

  // ===============================================================
  // LIBERAR ACESSO — chamado pelo n8n após compra (grátis ou pago).
  // Faz TUDO num bloco só, com Firebase Admin (sem 403) + SMTP:
  //   1. verifica se o e-mail já existe (Auth)
  //   2. NÃO existe  -> cria conta + doc Firestore + senha + e-mail de acesso
  //   3. JÁ existe   -> se está subindo de plano (gratuito->completo), atualiza
  //                     o doc e avisa por e-mail (sem trocar a senha)
  //   4. retorna status explícito pro n8n (nada de erro engolido)
  //
  // Protegido por token secreto compartilhado (LBW_WEBHOOK_SECRET) no header
  // x-lbw-secret. O n8n manda esse header; sem ele (ou errado) = 401.
  // ===============================================================
  app.post("/api/acesso/liberar", async (req: any, res) => {
    if (!isAdminReady()) {
      return res.status(503).json({ error: "Firebase Admin não configurado no servidor." });
    }

    // 1) Autenticação por segredo compartilhado
    const segredoConfig = process.env.LBW_WEBHOOK_SECRET || "";
    const segredoRecebido = req.headers["x-lbw-secret"] || "";
    if (!segredoConfig) {
      return res.status(503).json({ error: "LBW_WEBHOOK_SECRET não configurado no servidor." });
    }
    if (segredoRecebido !== segredoConfig) {
      return res.status(401).json({ error: "Segredo inválido." });
    }

    // 2) Dados de entrada (aceita tanto campos diretos quanto o payload cru da Hotmart)
    const body = req.body || {};
    const hotmartBuyer = body?.data?.buyer || {};
    const email = String(body.email || hotmartBuyer.email || "").toLowerCase().trim();
    const nome = String(body.nome || body.name || hotmartBuyer.name || hotmartBuyer.first_name || "").trim();
    // plano: 'completo' (8 trilhas) ou 'gratuito' (trilha 1). Default = gratuito.
    const planoSolicitado: "completo" | "gratuito" = body.plano === "completo" ? "completo" : "gratuito";

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "E-mail ausente ou inválido no payload." });
    }

    const FORMACOES = {
      gratuito: ["projetos-melhoria-introdutoria"],
      completo: ["projetos-melhoria-completo"], // libera tudo (o app trata 'completo' como acesso total)
    };

    try {
      // 3) Verifica se já existe no Firebase Auth (fonte da verdade pra login)
      let userRecord: any = null;
      try {
        userRecord = await adminAuth().getUserByEmail(email);
      } catch (e: any) {
        if (e?.code !== "auth/user-not-found") throw e;
      }

      const usersCol = adminFirestore().collection("users");

      // ---- CASO A: usuário NÃO existe -> cria do zero ----
      if (!userRecord) {
        const senhaProvisoria = Math.random().toString(36).slice(-10);
        const novo = await adminAuth().createUser({
          email,
          password: senhaProvisoria,
          displayName: nome || undefined,
        });
        await usersCol.doc(novo.uid).set({
          uid: novo.uid,
          email,
          nome: nome || "",
          tipoUsuario: "aluno",
          plano: planoSolicitado,
          formacoes: FORMACOES[planoSolicitado],
          creditoIA: {
            limite: planoSolicitado === "completo" ? 1000 : 100,
            usado: 0,
            resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          },
          senhaProvisoria: true, // força troca obrigatória no 1º acesso
          criadoEm: new Date().toISOString(),
          origem: planoSolicitado === "completo" ? "compra-hotmart" : "gratuito-landing",
          // Compra completa (Hotmart) = 1 ano de acesso. Só exibição por enquanto;
          // o rebaixamento automático ao vencer ainda é pendência (cron, Camada B).
          ...(planoSolicitado === "completo"
            ? { acessoCompletoAte: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString() }
            : {}),
        });
        const emailEnviado = await sendAcessoEmail({
          para: email, nome, senhaProvisoria, plano: planoSolicitado, contexto: "novo",
        });
        console.log(`[acesso/liberar] CRIADO ${email} (${planoSolicitado}) email=${emailEnviado}`);
        return res.json({ ok: true, status: "criado", uid: novo.uid, email, plano: planoSolicitado, emailEnviado });
      }

      // ---- CASO B: usuário JÁ existe ----
      const uid = userRecord.uid;
      const docRef = usersCol.doc(uid);
      const snap = await docRef.get();
      const planoAtual = snap.exists ? (snap.data() as any)?.plano : null;

      // Garante que o doc Firestore exista (se a conta só estava no Auth, regulariza)
      if (!snap.exists) {
        await docRef.set({
          uid, email, nome: nome || userRecord.displayName || "",
          tipoUsuario: "aluno",
          plano: planoSolicitado,
          formacoes: FORMACOES[planoSolicitado],
          creditoIA: { limite: planoSolicitado === "completo" ? 1000 : 100, usado: 0, resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() },
          criadoEm: new Date().toISOString(),
          origem: "regularizado",
        });
        // Nota: não marca senhaProvisoria aqui — conta já existia no Auth com senha própria.
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: planoSolicitado, contexto: "existente" });
        console.log(`[acesso/liberar] REGULARIZADO ${email} (${planoSolicitado})`);
        return res.json({ ok: true, status: "regularizado", uid, email, plano: planoSolicitado, emailEnviado });
      }

      // Subindo de gratuito -> completo (ou comprou pago): atualiza plano
      if (planoSolicitado === "completo" && planoAtual !== "completo") {
        await docRef.set({ plano: "completo", formacoes: FORMACOES.completo }, { merge: true });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "completo", contexto: "upgrade" });
        console.log(`[acesso/liberar] UPGRADE ${email}: ${planoAtual} -> completo`);
        return res.json({ ok: true, status: "atualizado-completo", uid, email, plano: "completo", emailEnviado });
      }

      // Já tinha o plano pedido (ou já é completo): nada a fazer, não duplica nem reenvia senha
      console.log(`[acesso/liberar] JA_EXISTIA ${email} (plano atual: ${planoAtual})`);
      return res.json({ ok: true, status: "ja-existia", uid, email, plano: planoAtual });
    } catch (err: any) {
      console.error("[acesso/liberar] ERRO:", err?.message || err);
      return res.status(500).json({ error: err?.message || "Falha ao liberar acesso." });
    }
  });

  // YouTube Transcript Endpoint
  // Busca o transcript bruto (com timestamps) diretamente do YouTube.
  // Body: { videoUrl: string, lang?: string }  → Response: { transcript: string }
  app.post("/api/youtube-transcript", async (req, res) => {
    const { videoUrl, lang } = req.body as { videoUrl?: string; lang?: string };
    if (!videoUrl) {
      return res.status(400).json({ error: "videoUrl é obrigatório" });
    }
    try {
      // Tenta primeiro no idioma solicitado (default pt), depois cai para pt-BR, en e default.
      const candidates = [lang, "pt", "pt-BR", "en", undefined].filter(
        (v, i, arr) => arr.indexOf(v) === i
      );
      let segments: { text: string; offset: number; duration: number }[] | null = null;
      let lastError: unknown = null;
      for (const candidate of candidates) {
        try {
          const opts = candidate ? { lang: candidate } : undefined;
          segments = (await YoutubeTranscript.fetchTranscript(videoUrl, opts)) as any;
          if (segments && segments.length > 0) break;
        } catch (err) {
          lastError = err;
        }
      }
      if (!segments || segments.length === 0) {
        const msg = lastError instanceof Error ? lastError.message : "Sem legendas disponíveis";
        return res.status(404).json({ error: `Nenhuma legenda encontrada: ${msg}` });
      }

      // A lib retorna offset/duration em ms (formato srv3) ou em segundos (formato classic).
      // Detecta a unidade pela duração mediana dos segmentos: frases típicas duram 1-10s,
      // então se a mediana de "duration" for > 60, está em ms.
      const sortedDurations = segments.map(s => s.duration).sort((a, b) => a - b);
      const medianDuration = sortedDurations[Math.floor(sortedDurations.length / 2)];
      const inMs = medianDuration > 60;

      const formatTs = (offset: number) => {
        const totalSeconds = Math.floor(inMs ? offset / 1000 : offset);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      };

      const transcript = segments
        .map((seg) => `[${formatTs(seg.offset)}] ${seg.text}`)
        .join("\n");

      res.json({ transcript, segments: segments.length });
    } catch (err: any) {
      console.error("[/api/youtube-transcript] erro:", err);
      res.status(500).json({ error: err?.message || "Erro ao buscar transcript" });
    }
  });

  // AI Chat Endpoint
  app.post("/api/chat", async (req, res) => {
    const { message } = req.body;

    const prompt = `Você é o Mentor LBW, consultor Master Black Belt em Lean Six Sigma com 20 anos de experiência.

O aluno descreveu este problema:
"${message}"

Responda em português, como um consultor sênior direto e técnico:
1. Em 1 frase: qual é o tipo de projeto (Seis Sigma DMAIC, Lean/Kaizen, Gestão de Mudança ADKAR, Gestão de Projeto PMI ou Quick Win).
2. Em 2 a 3 frases: por que você chegou a essa conclusão.
3. Em 1 frase: sugira o nível (Yellow Belt, Green Belt ou Black Belt) e duração estimada.
4. Faça UMA pergunta curta de confirmação.

Máximo 150 palavras. Seja direto.`;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      res.json({
        content: response.text || 'Não consegui processar.',
        role: 'assistant',
        createdAt: new Date().toISOString()
      });
    } catch (err) {
      console.error('[/api/chat] Erro Gemini:', err);
      res.status(500).json({ content: 'Erro ao conectar com a IA. Tente novamente.' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
