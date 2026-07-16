import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";
import { YoutubeTranscript } from "youtube-transcript";
import { initFirebaseAdmin, isAdminReady, adminAuth, adminFirestore } from "./src/lib/firebaseAdmin";
import { campanhaCortesiaHtml, CAMPANHA_ASSUNTO } from "./src/services/campanhaCortesiaEmail";

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
    const fromEmail = process.env.SMTP_FROM || user;
    const from = `LBW - Educação pelo Trabalho <${fromEmail}>`;
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
    const fromEmail = process.env.SMTP_FROM || user;
    const from = `LBW - Educação pelo Trabalho <${fromEmail}>`;
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
      titulo = "Parabéns pela sua compra! Seu Kit 90 Dias está liberado 🎉";
      planoLabel = "Kit 90 Dias (Trilha 1)";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Que bom ter você aqui. Sua compra foi confirmada e seu acesso ao <strong>Kit 90 Dias — Sobreviva em uma Nova Área e se Destaque no Trabalho</strong> está liberado. A partir de agora você tem um plano prático pros seus primeiros 90 dias: entender a área, escolher o problema certo e entregar sua primeira melhoria.`;
      credenciaisHtml = credComSenha;
      botaoLabel = "ACESSAR MEU KIT 90 DIAS";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🗺️ <strong>O Mapa dos 90 Dias</strong> — seu checklist de progresso, 60 ações (uma por dia), do "cheguei perdido" ao "olha o que eu entreguei".</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎥 <strong>Vídeo-aulas</strong> — práticas e direto ao ponto, no seu ritmo.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🛠️ <strong>Ferramentas de gestão</strong> — SIPOC, RACI, Organograma e mais, pra usar em casos reais (você não só assiste, você executa).</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎯 <strong>Resolução de problemas</strong> — identifique os melhores projetos da sua área, execute e implemente as soluções — e se destaque de verdade no seu trabalho.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado</strong> — ao concluir o Kit 90 Dias (respeitando o tempo mínimo), você recebe seu certificado.</p>
        ${dashboardBloco}
        ${mentorBloco}
        ${comunidadeBloco}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="font-weight:bold;color:#1E2D6E;margin:0 0 12px 0;">DEPOIS DO KIT, TEM UMA JORNADA INTEIRA À SUA FRENTE:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">O Kit 90 Dias é a porta de entrada. Quando quiser ir além, a formação completa te leva do básico ao nível de quem senta na mesa de decisão — com mais 7 trilhas:</p>
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

  // POST /api/reset-senha — "Esqueci minha senha" público.
  // O Firebase Admin gera o link de redefinição e o NOSSO SMTP (Hostinger) envia
  // o e-mail — do nosso domínio, evitando o spam do remetente padrão do Firebase.
  // Sempre responde ok (não revela se o e-mail existe).
  app.post("/api/reset-senha", async (req: any, res) => {
    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Informe um e-mail válido." });
    }
    if (!isAdminReady()) return res.status(503).json({ error: "Servidor não configurado." });
    try {
      // Gera o link oficial de redefinição (válido mesmo se o usuário existir).
      const appUrl = process.env.APP_URL || "https://app.educacaopelotrabalho.com";
      let link: string | null = null;
      try {
        // 1ª tentativa: com continueUrl (precisa do domínio autorizado no Firebase).
        link = await adminAuth().generatePasswordResetLink(email, { url: appUrl });
      } catch (e: any) {
        if (e?.code === "auth/user-not-found") {
          return res.json({ ok: true }); // não revela se o e-mail existe
        }
        // 2ª tentativa: SEM a opção url (evita falha por dominio nao autorizado).
        console.warn("[/api/reset-senha] retry sem url; erro inicial:", e?.code || e?.message);
        try {
          link = await adminAuth().generatePasswordResetLink(email);
        } catch (e2: any) {
          if (e2?.code === "auth/user-not-found") return res.json({ ok: true });
          throw e2;
        }
      }

      // Envia o e-mail pelo nosso SMTP (mesmo dos convites).
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || "465", 10);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const fromEmail = process.env.SMTP_FROM || user;
    const from = `LBW - Educação pelo Trabalho <${fromEmail}>`;
      if (host && user && pass && link) {
        const primeiroNome = email.split("@")[0];
        const html = `
        <!DOCTYPE html>
        <html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#eef1f8;font-family:'Segoe UI',Arial,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef1f8;padding:32px 16px;">
            <tr><td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px -12px rgba(30,45,110,.35);">
                <!-- Header -->
                <tr><td style="background:linear-gradient(135deg,#1E2D6E,#0033CC);padding:32px 32px 26px;text-align:center;">
                  <img src="https://www.educacaopelotrabalho.com/favicon.png" alt="Learning by Working" width="150" style="display:inline-block;max-width:150px;filter:brightness(0) invert(1);" />
                  <div style="color:rgba(255,255,255,.85);font-size:11px;letter-spacing:.18em;text-transform:uppercase;font-weight:700;margin-top:10px;">Educação pelo Trabalho</div>
                </td></tr>
                <!-- Body -->
                <tr><td style="padding:36px 36px 8px;">
                  <h1 style="margin:0 0 18px;color:#1E2D6E;font-size:22px;font-weight:800;">Redefinição de senha</h1>
                  <p style="margin:0 0 14px;color:#2A2F3A;font-size:15px;line-height:1.6;">Olá <strong>${primeiroNome}</strong>,</p>
                  <p style="margin:0 0 26px;color:#3A4150;font-size:15px;line-height:1.6;">Recebemos um pedido para redefinir a senha da sua conta no <strong>Learning by Working</strong>. Clique no botão abaixo para criar uma nova senha:</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 26px;"><tr><td align="center" style="border-radius:12px;background:linear-gradient(120deg,#0033CC,#2563EB);">
                    <a href="${link}" target="_blank" style="display:inline-block;padding:15px 38px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:12px;">Criar nova senha →</a>
                  </td></tr></table>
                  <p style="margin:0 0 6px;color:#8A94A6;font-size:12px;">Ou copie e cole este link no navegador:</p>
                  <p style="margin:0 0 24px;color:#5B6472;font-size:12px;word-break:break-all;background:#f4f6fc;border:1px solid #e2e8f4;border-radius:8px;padding:10px 12px;">${link}</p>
                </td></tr>
                <!-- Footer -->
                <tr><td style="padding:0 36px 32px;">
                  <div style="border-top:1px solid #eceff6;padding-top:20px;">
                    <p style="margin:0 0 6px;color:#9CA3AF;font-size:12px;line-height:1.6;">Se não foi você que pediu, pode ignorar este e-mail — sua senha continua a mesma.</p>
                    <p style="margin:0;color:#9CA3AF;font-size:12px;">© 2026 Learning by Working — Educação pelo Trabalho</p>
                  </div>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body></html>
        `;
        try {
          const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
          await transporter.sendMail({ from, to: email, subject: "Redefinição de senha — Learning by Working", html });
        } catch (err: any) {
          console.error("[/api/reset-senha] Erro SMTP:", err?.message || err);
        }
      }
      return res.json({ ok: true });
    } catch (err: any) {
      // E-mail inexistente pode vir como user-not-found OU como internal-error
      // ("Unable to create the email action link") — em ambos, não revelamos nada.
      const msg = String(err?.message || "");
      if (err?.code === "auth/user-not-found" || msg.includes("Unable to create the email action link")) {
        return res.json({ ok: true });
      }
      console.error("[POST /api/reset-senha] erro:", err?.message || err);
      return res.status(500).json({ error: "Erro ao processar. Tente novamente." });
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
    // Plano é a fonte de verdade; formacoes derivam dele (regra binária:
    // gratuito = trilha 1; resto = completo). Ignora o campo formacoes digitado.
    const planoFinal = plano || (tipo === "coordenador" ? "coordenador" : "gratuito");
    const formacoesFinal = planoFinal === "gratuito"
      ? ["projetos-melhoria-introdutoria"]
      : ["projetos-melhoria-completo"];
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
        plano: planoFinal,
        formacoes: formacoesFinal,
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
      // COERÊNCIA: o plano é a fonte de verdade. A regra é binária —
      // gratuito = trilha 1; completo/coordenador = tudo. As formacoes são
      // DERIVADAS do plano, nunca digitadas, pra nunca ficarem contraditórias
      // (o que fazia o app classificar errado, ex: gratuito virando completo).
      if (firestoreUpdate.plano !== undefined) {
        firestoreUpdate.formacoes = firestoreUpdate.plano === "gratuito"
          ? ["projetos-melhoria-introdutoria"]
          : ["projetos-melhoria-completo"];
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
  const RESEND_FROM = process.env.RESEND_FROM || "LBW - Educação pelo Trabalho <contact@learningbyworking.com>";

  // Envia 1 email via API do Resend. Retorna {ok, status, body}.
  async function resendSend(params: { to: string; subject: string; html: string; unsubUrl?: string }) {
    const key = process.env.RESEND_API_KEY;
    if (!key) return { ok: false, status: 0, body: "RESEND_API_KEY não configurada." };
    try {
      // List-Unsubscribe (RFC 2369 + one-click RFC 8058): dá o botão nativo
      // "Cancelar inscrição" do Gmail/Outlook e melhora a reputação de envio.
      const headers: Record<string, string> = params.unsubUrl
        ? {
            "List-Unsubscribe": `<${params.unsubUrl}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          }
        : {};
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ from: RESEND_FROM, to: params.to, subject: params.subject, html: params.html, headers }),
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
    rodapeTexto: "Você recebe este e-mail porque se cadastrou na plataforma LBW.\nLBW - Educação pelo Trabalho · contact@learningbyworking.com",
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

  // ===== UNSUBSCRIBE (opt-out) — exigência legal em todo e-mail de marketing =====
  // Segredo pra assinar o link (HMAC): usa env dedicada; se não houver, deriva de um
  // segredo estável já presente (a chave admin do Firebase). Assim o token é válido e
  // consistente entre reinícios, sem precisar configurar nada.
  const UNSUB_SECRET =
    process.env.UNSUBSCRIBE_SECRET ||
    (process.env.FIREBASE_ADMIN_KEY_JSON || "lbw-fallback-secret").slice(0, 64);
  const BASE_URL = process.env.PUBLIC_BASE_URL || "https://app.educacaopelotrabalho.com";

  function unsubToken(email: string): string {
    return crypto.createHmac("sha256", UNSUB_SECRET).update(email.toLowerCase().trim()).digest("hex").slice(0, 32);
  }
  function unsubLink(email: string): string {
    const e = encodeURIComponent(email.toLowerCase().trim());
    return `${BASE_URL}/api/unsubscribe?e=${e}&t=${unsubToken(email)}`;
  }
  function unsubValido(email: string, token: string): boolean {
    if (!email || !token) return false;
    const esperado = unsubToken(email);
    // comparação em tempo constante pra não vazar o token por timing
    const a = Buffer.from(esperado);
    const b = Buffer.from(String(token));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  // Envolve o corpo (HTML já pronto) no layout da marca, usando a config do template.
  // Título e botões são marcações no próprio corpo (por e-mail), não no template.
  // `emailDestinatario` (opcional): quando presente, injeta o rodapé legal com link de
  // descadastro + endereço físico. Ausente em previews (sem destinatário real).
  function campanhaHtmlCom(corpoHtmlRaw: string, t: TemplateConfig, emailDestinatario?: string) {
    const corpoHtml = aplicarMarcacoes(corpoHtmlRaw, t.botaoCor); // [titulo:]/[botao:]/[video:]
    const rodape = esc(t.rodapeTexto).replace(/\n/g, "<br/>");
    // Bloco legal (só com destinatário real): APENAS o link de descadastro. O endereço
    // físico já vem no rodapeTexto acima — não repetir aqui pra não duplicar.
    const blocoLegal = emailDestinatario
      ? `<div style="margin-top:12px; padding-top:12px; border-top:1px solid #f0f0f0;">
           Não quer mais receber estes e-mails?
           <a href="${unsubLink(emailDestinatario)}" style="color:#9CA3AF; text-decoration:underline;">Cancelar inscrição</a>.
         </div>`
      : "";
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
          ${blocoLegal}
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

  // POST /api/campanha/teste — envia UM e-mail (HTML pronto) pra um destinatário só.
  // Pra testar a campanha antes do disparo em massa. Body: { to, assunto, html }.
  app.post("/api/campanha/teste", requireAdmin, async (req: any, res) => {
    if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: "RESEND_API_KEY não configurada no Railway." });
    const { to, assunto, html } = req.body || {};
    if (!to || !assunto || !html) return res.status(400).json({ error: "to, assunto e html são obrigatórios." });
    try {
      const r = await resendSend({ to: String(to).trim(), subject: String(assunto), html: String(html) });
      if (r.ok) return res.json({ ok: true, to });
      return res.status(502).json({ ok: false, status: r.status, body: String(r.body).slice(0, 300) });
    } catch (err: any) {
      console.error("[POST /api/campanha/teste] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao enviar teste." });
    }
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
  // POST /api/campanha/cortesia — disparo SEGURO da campanha cortesia.
  // Dispara SÓ pros usuários cortesia (acesso completo até 31/12/2026, via
  // convite-reativacao), NUNCA pros excluídos abaixo. O front manda o HTML
  // já montado (mesmo template do teste). Body: { assunto, html, dryRun?: boolean }.
  // dryRun=true → só retorna a lista de quem receberia, sem enviar nada.
  // ===============================================================
  const CAMPANHA_EXCLUIR = new Set([
    "emerson.franco.coach@gmail.com",
    "mariananz2018@gmail.com",
    "israelnz2018@hotmail.com",
    "israel@learningbyworking.com",
  ]);
  function isCortesia(u: any): boolean {
    const ate = String(u?.acessoCompletoAte || "");
    return u?.origemAcesso === "convite-reativacao"
      || u?.origemAcesso === "trilha1-cortesia"
      || ate.startsWith("2026-12-31");
  }

  // COMPROU? Só a `origem` diz a verdade sobre pagamento. O `plano` diz o NÍVEL de
  // acesso ("gratuito" = Trilha 1), e quem compra o Kit 90 (R$67) fica com esse
  // mesmo nível — então classificar por `plano` fazia o comprador virar "lead".
  // Cortesia tem o acesso mas NÃO pagou: não é comprador.
  function isComprador(u: any): boolean {
    if (!u || isCortesia(u)) return false;
    const origem = String(u.origem || "");
    return origem === "compra-trilha1"      // comprou o Kit 90 (Trilha 1, R$67)
      || origem === "compra-hotmart"        // comprou o plano completo
      || origem.startsWith("compra");       // qualquer compra futura
  }

  app.post("/api/campanha/cortesia", requireAdmin, async (req: any, res) => {
    if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: "RESEND_API_KEY não configurada no Railway." });
    const { assunto, html, dryRun } = req.body || {};
    if (!assunto || !html) return res.status(400).json({ error: "assunto e html são obrigatórios." });
    try {
      const snap = await adminFirestore().collection("users").get();
      const emails = Array.from(new Set(
        snap.docs
          .map((d) => d.data())
          .filter((u: any) => u?.email && String(u.email).indexOf("@") > 0)
          .filter((u: any) => isCortesia(u))
          .map((u: any) => String(u.email).trim().toLowerCase())
          .filter((email: string) => !CAMPANHA_EXCLUIR.has(email))
      ));

      // dryRun: não envia, só mostra quem receberia (pra conferência).
      if (dryRun) return res.json({ dryRun: true, total: emails.length, emails });

      let enviados = 0, falhas = 0;
      const erros: any[] = [];
      for (const to of emails) {
        // Personaliza o HTML com o e-mail do destinatário (bloco "dados de acesso").
        const htmlPersonalizado = String(html).replace(/__EMAIL_DESTINO__/g, to);
        const r = await resendSend({ to, subject: String(assunto), html: htmlPersonalizado });
        if (r.ok) enviados++;
        else { falhas++; if (erros.length < 10) erros.push({ to, status: r.status, body: String(r.body).slice(0, 200) }); }
        await new Promise((ok) => setTimeout(ok, 120)); // ~8/seg
      }
      return res.json({ total: emails.length, enviados, falhas, erros });
    } catch (err: any) {
      console.error("[POST /api/campanha/cortesia] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao disparar a campanha cortesia." });
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

  // POST /api/reativacao/criar-um — concede acesso completo grátis (até 31/12/2026)
  // para UMA pessoa (nome + email). Cria no Firebase se não existir, ou atualiza
  // se já existir. Senha padrão LBW2026 (troca obrigatória no 1º acesso) e envia
  // o e-mail de acesso. Usado no painel de Marketing pra quem procura pelo LinkedIn.
  app.post("/api/reativacao/criar-um", requireAdmin, async (req: any, res) => {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const nome = String(req.body?.nome || "").trim();
    if (!email || email.indexOf("@") < 0) {
      return res.status(400).json({ error: "E-mail inválido." });
    }
    const SENHA_CONVITE = "LBW2026";
    try {
      // 1) Cria no Auth se não existir; se existir, redefine a senha padrão.
      let uid: string, novo = false;
      try {
        uid = (await adminAuth().getUserByEmail(email)).uid;
        await adminAuth().updateUser(uid, { password: SENHA_CONVITE, ...(nome ? { displayName: nome } : {}) });
      } catch {
        uid = (await adminAuth().createUser({ email, password: SENHA_CONVITE, ...(nome ? { displayName: nome } : {}) })).uid;
        novo = true;
      }
      // 2) Cria/atualiza o doc Firestore: completo + validade até 31/12 + senha provisória.
      const ref = adminFirestore().collection("users").doc(uid);
      const snap = await ref.get();
      const base = snap.exists ? (snap.data() as any) : {};
      await ref.set({
        uid, email,
        nome: nome || base.nome || "",
        tipoUsuario: base.tipoUsuario === "admin" || base.tipoUsuario === "coordenador" ? base.tipoUsuario : "aluno",
        plano: "completo",
        acessoCompletoAte: REATIVACAO_ATE,
        origemAcesso: "convite-reativacao",
        formacoes: Array.isArray(base.formacoes) && base.formacoes.length > 0 ? base.formacoes : ["projetos-melhoria-introdutoria"],
        creditoIA: base.creditoIA || { limite: 100, usado: 0, resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() },
        criadoEm: base.criadoEm || new Date().toISOString(),
        senhaProvisoria: true,
      }, { merge: true });
      // 3) Envia o MESMO e-mail de cortesia usado na campanha (via Resend) —
      // "Seu acesso gratuito à plataforma LBW — meu presente para você 🎁".
      let emailEnviado = false;
      try {
        const r = await resendSend({ to: email, subject: CAMPANHA_ASSUNTO, html: campanhaCortesiaHtml(email) });
        emailEnviado = r.ok;
      } catch (e) {
        console.error("[reativacao/criar-um] falha no envio Resend:", e);
      }
      console.log(`[reativacao/criar-um] ${novo ? "CRIADO" : "ATUALIZADO"} ${email} email=${emailEnviado}`);
      return res.json({ ok: true, status: novo ? "criado" : "atualizado", email, senha: SENHA_CONVITE, emailEnviado, acessoAte: REATIVACAO_ATE });
    } catch (err: any) {
      console.error("[POST /api/reativacao/criar-um] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao conceder acesso." });
    }
  });

  // ===============================================================
  // POST /api/trilha1/blindar-atuais — FASE 0 da conversão da Trilha 1 pra paga.
  // Marca TODOS os alunos já cadastrados (que hoje têm a Trilha 1 de graça) como
  // "cortesia introdutória": garante formacoes=['projetos-melhoria-introdutoria']
  // e origemAcesso='trilha1-cortesia'. Assim, quando a Trilha 1 virar paga (R$67),
  // eles MANTÊM o acesso que já tinham (só a Trilha 1) e NÃO recebem os e-mails de
  // "parabéns pela compra" (isCortesia passa a reconhecê-los).
  //
  // NÃO toca em: admin, coordenador, nem em quem já é 'completo' (esses ficam como
  // estão — a blindagem é só pros gratuitos/introdutórios).
  // dryRun=true → só lista quem SERIA marcado, sem escrever nada. Rodar assim 1º.
  // ===============================================================
  app.post("/api/trilha1/blindar-atuais", requireAdmin, async (req: any, res) => {
    const dryRun = req.body?.dryRun === true;
    const INTRO = "projetos-melhoria-introdutoria";
    try {
      const snap = await adminFirestore().collection("users").get();
      const alvos: { uid: string; email: string; motivo: string }[] = [];
      const pulados: { email: string; motivo: string }[] = [];

      for (const d of snap.docs) {
        const u = d.data() as any;
        const email = String(u?.email || "").trim().toLowerCase();
        if (!email || email.indexOf("@") < 0) { continue; }
        // Não mexe em admin/coordenador.
        if (u?.tipoUsuario === "admin" || u?.tipoUsuario === "coordenador") {
          pulados.push({ email, motivo: u.tipoUsuario }); continue;
        }
        // Quem já é completo (pago de verdade ou cortesia-completo do Hostinger)
        // não precisa de blindagem — já tem tudo. Deixa como está.
        if (u?.plano === "completo") { pulados.push({ email, motivo: "completo" }); continue; }
        alvos.push({ uid: d.id, email, motivo: "gratuito→cortesia-introdutoria" });
      }

      if (dryRun) {
        return res.json({ dryRun: true, totalAlvos: alvos.length, totalPulados: pulados.length, alvos, pulados });
      }

      let marcados = 0, falhas = 0;
      const erros: any[] = [];
      for (const a of alvos) {
        try {
          await adminFirestore().collection("users").doc(a.uid).set({
            formacoes: [INTRO],
            origemAcesso: "trilha1-cortesia",
          }, { merge: true });
          marcados++;
        } catch (e: any) {
          falhas++; if (erros.length < 10) erros.push({ email: a.email, erro: e?.message || "" });
        }
      }
      return res.json({ ok: true, totalAlvos: alvos.length, marcados, falhas, totalPulados: pulados.length, erros });
    } catch (err: any) {
      console.error("[POST /api/trilha1/blindar-atuais] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao blindar os atuais." });
    }
  });

  // ===============================================================
  // SEQUÊNCIAS DE E-MAIL AUTOMÁTICAS (Lead + Grátis) — o "motor"
  // -----------------------------------------------------------------
  // Estágio de cada usuário (decidido pelo estado ATUAL no Firestore):
  //   gratis = plano introdutório (Kit 90 Dias / Trilha 1), tenha acessado ou não
  //   pago   = plano completo                      (newsletter é manual, não entra aqui)
  // Um cron diário varre os users, classifica cada um, vê quantos dias desde o
  // cadastro e envia o e-mail da sequência que "vence" hoje — se ainda não foi
  // enviado (marca em users/{uid}.emailSequencia.{pacote}_{n}). Idempotente.
  // As sequências (textos/dias) vivem em config/marketingSequencias pra serem
  // editáveis pela tela (Fase 2). Se o doc não existir, usa os defaults abaixo.
  // ===============================================================

  type SeqEmail = { dia: number; assunto: string; corpo: string; ativo: boolean };
  // 4 sequências:
  //   gratis          = Trilha 1 "novo" (comprou/ganhou, assistiu ≤2 vídeos) → ATIVAÇÃO (fala só da Trilha 1)
  //   gratisEngajado  = Trilha 1 "engajado" (assistiu >2 vídeos)              → VENDA do completo
  //   pago7 + pago    = Completo (anti-reembolso 7 dias + rotina)             → RELACIONAMENTO
  type Sequencias = { gratis: SeqEmail[]; gratisEngajado: SeqEmail[]; pago7: SeqEmail[]; pago: SeqEmail[] };

  // Conteúdo inicial das sequências (editável pela tela). Tom "Carta do Israel":
  // 1ª pessoa, casos reais, dor antes da solução, sem hype.
  // GRÁTIS (7 e-mails, dias 0/3/7/11/15/19/24): um por trilha (trilhas 2 a 8 do app).
  const APP_URL = "https://app.educacaopelotrabalho.com";
  // Página de vendas (preço cheio R$ 597).
  const VENDAS_URL = "https://www.educacaopelotrabalho.com/formacao";
  // Link do desconto (R$ 400). Trocar pelo checkout/cupom da Hotmart quando existir.
  // Enquanto isso aponta pra página de vendas — ajuste no painel Marketing quando tiver o link.
  const DESCONTO_URL = "https://www.educacaopelotrabalho.com/formacao";
  const SEQUENCIAS_DEFAULT: Sequencias = {
    // ── SEQUÊNCIA 1 · "Trilha 1 · novo" (ativação) ──────────────────────────
    // Quem: tem a Trilha 1 e assistiu ≤2 vídeos. Objetivo: fazer USAR. Sem venda.
    // REGRA: fala SÓ da Trilha 1 — 5 e-mails, um por FASE. Nada inventado
    // (conteúdo real de trilhas.ts). Boas-vindas (dia 0) já vem do n8n.
    // TIMING (dias 2-6): concentrado ANTES do 7º dia — no 7º a Hotmart fecha a
    // janela de reembolso. Objetivo: a pessoa usar e sentir valor antes disso.
    gratis: [
      // 1 — FASE 1: entender sua área (dia 2)
      {
        dia: 2, ativo: true,
        assunto: "Fase 1: entenda como sua área funciona",
        corpo:
          "[titulo: Fase 1: entenda como sua área funciona]\n\n" +
          "Oi {nome},\n\n" +
          "A Trilha 1, 'Como Gerar Resultados nos Próximos 90 Dias', começa pela Fase 1, que é a base de tudo.\n\n" +
          "Nela você aprende a enxergar como sua área funciona de verdade, com quatro ferramentas: SIPOC (fornecedores, entradas, processo, saídas e clientes), Matriz RACI (quem é responsável, aprovador, consultado e informado), Organograma e Indicadores.\n\n" +
          "Com a Fase 1 você consegue explicar sua área em 3 frases, coisa que a maioria não faz nem depois de meses.\n\n" +
          "Repara no que muda: você deixa de ser mais um que 'só faz a tarefa' e passa a enxergar o quadro completo, de onde vêm as coisas, pra onde vão, quem depende de você e quais números provam que seu trabalho deu certo. Em poucos dias você fala com propriedade sobre a sua área, ganha a confiança do chefe e para de se sentir perdido no meio de tanta informação nova.\n\n" +
          "[botao: Abrir a Fase 1 | " + APP_URL + "]\n\n" +
          "Israel",
      },
      // 2 — FASE 2: achar os problemas certos (dia 3)
      {
        dia: 3, ativo: true,
        assunto: "Fase 2: ache os problemas que valem a pena",
        corpo:
          "[titulo: Fase 2: ache os problemas que merecem atenção]\n\n" +
          "Oi {nome},\n\n" +
          "A Fase 2 da Trilha 1 é sobre escolher em qual problema vale a pena mexer. Porque atacar o problema errado gasta tempo e não muda nada.\n\n" +
          "Você aprende a transformar um incômodo vago numa Ideia de Projeto clara, e a priorizar com a Matriz GUT (Gravidade, Urgência, Tendência) e a Matriz RAB. No fim, fica claro onde colocar a energia primeiro.\n\n" +
          "Na prática, você deixa de apagar incêndio o dia inteiro. Em vez de correr atrás de tudo ao mesmo tempo e terminar o dia exausto sem ter resolvido nada de verdade, você passa a escolher com critério a batalha que traz mais resultado. É o que separa quem vive ocupado de quem entrega resultado, e é exatamente isso que o chefe percebe e valoriza na hora de confiar em você um projeto maior.\n\n" +
          "[botao: Abrir a Fase 2 | " + APP_URL + "]\n\n" +
          "Israel",
      },
      // 3 — FASE 3: descobrir a causa (dia 4)
      {
        dia: 4, ativo: true,
        assunto: "Fase 3: a causa real, antes de agir",
        corpo:
          "[titulo: Fase 3: descubra a causa antes de agir]\n\n" +
          "Oi {nome},\n\n" +
          "O erro mais caro no trabalho é agir no sintoma e o problema voltar. A Fase 3 da Trilha 1 ensina a chegar na causa raiz de verdade.\n\n" +
          "São quatro ferramentas: Mapa de Processo (pra ver onde o problema nasce), Brainstorming estruturado, Espinha de Peixe (Ishikawa) e Análise Gráfica. Com elas dá pra parar de chutar e apontar a causa com segurança.\n\n" +
          "Aí você deixa de dar 'palpite' e passa a chegar com prova. Numa reunião, enquanto os outros discutem opinião contra opinião, você mostra o caminho lógico até a causa e ninguém tem o que contestar. Além de resolver o problema de vez (e não ele voltar em duas semanas), você constrói uma reputação rara: a pessoa que analisa antes de agir. É esse tipo de gente que a empresa promove.\n\n" +
          "[botao: Abrir a Fase 3 | " + APP_URL + "]\n\n" +
          "Israel",
      },
      // 4 — FASE 4: implementar a solução (dia 5)
      {
        dia: 5, ativo: true,
        assunto: "Fase 4: escolha e implemente a solução",
        corpo:
          "[titulo: Fase 4: escolha e implemente a melhor solução]\n\n" +
          "Oi {nome},\n\n" +
          "A Fase 4 da Trilha 1 é onde a melhoria acontece de verdade.\n\n" +
          "Você usa o Esforço × Impacto pra decidir o que fazer primeiro, monta um Plano de Ação que sai do papel, e registra o Antes × Depois, a prova concreta de que a melhoria funcionou. É isso que faz o chefe olhar e falar 'olha o que mudou'.\n\n" +
          "Com isso você sai do 'eu acho que melhorou' pro 'aqui está a prova, com número'. Muita gente boa trabalha duro e ninguém percebe, porque não sabe registrar e mostrar o que fez. Aqui você não só entrega o resultado: tem o Antes × Depois na mão pra mostrar numa avaliação, numa reunião ou numa proposta de aumento. É a diferença entre ser reconhecido e ser esquecido.\n\n" +
          "[botao: Abrir a Fase 4 | " + APP_URL + "]\n\n" +
          "Israel",
      },
      // 5 — FASE 5: comunicar com profissionalismo (dia 6)
      {
        dia: 6, ativo: true,
        assunto: "Fase 5: comunique com profissionalismo",
        corpo:
          "[titulo: Fase 5: comunique-se com profissionalismo]\n\n" +
          "Oi {nome},\n\n" +
          "A Fase 5 fecha a Trilha 1, e é a parte que quase ninguém ensina: como se portar e se comunicar num ambiente profissional.\n\n" +
          "Postura, vestimenta, como conduzir uma ligação, e como usar bem Teams e Outlook sem parecer perdido. São os detalhes que separam quem sabe fazer de quem também sabe se mostrar.\n\n" +
          "Com a Fase 5 você fecha a Trilha 1 inteira, do entender a área ao comunicar como profissional.\n\n" +
          "Essa é a parte que mais muda como você é visto: deixar de ser o técnico competente que ninguém nota e virar o profissional que passa segurança em qualquer sala. O trabalho bem feito abre a porta, mas é a forma como você se comunica que faz você entrar. Dominar postura, tom, e-mail e reunião é o que faz um chefe pensar 'essa pessoa tem futuro aqui', mesmo antes de você abrir a boca sobre o resultado.\n\n" +
          "[botao: Abrir a Fase 5 | " + APP_URL + "]\n\n" +
          "Israel",
      },
    ],
    // ── SEQUÊNCIA 2 · "Trilha 1 · engajado" (venda do completo) ─────────────
    // Quem: tem a Trilha 1 e assistiu >2 vídeos. Objetivo: upgrade pro completo.
    // REGRA: fala do COMPLETO (8 trilhas). Desconto só nos 2 últimos e-mails.
    // Dia conta a partir de quando virou engajado.
    gratisEngajado: [
      // 1 — PONTE: você provou valor, existe a jornada inteira (dia 0)
      {
        dia: 0, ativo: true,
        assunto: "Você já provou que funciona, {nome}",
        corpo:
          "[titulo: Você viu a ponta do iceberg]\n\n" +
          "Oi {nome},\n\n" +
          "Você não só comprou a Trilha 1. Você entrou, assistiu, começou a aplicar. Isso já te separa de 9 em cada 10 pessoas.\n\n" +
          "Então deixa eu te contar uma verdade: o que você tem em mãos é a ponta do iceberg. A Trilha 1 te mostra como chegar numa área e entender. As outras 7 trilhas são onde a virada de verdade acontece, do básico ao nível de quem senta na mesa de decisão e é ouvido.\n\n" +
          "Não precisa decidir nada hoje. Continue usando o que é seu. Só quero que você saiba que existe um caminho inteiro à sua frente.\n\n" +
          "[botao: Conhecer a formação completa | " + VENDAS_URL + "]\n\n" +
          "Israel",
      },
      // 2 — NUTRE: conduzir mudanças (dia 4)
      {
        dia: 4, ativo: true,
        assunto: "Por que as pessoas resistem quando você tem razão",
        corpo:
          "[titulo: Ter dado não basta]\n\n" +
          "Oi {nome},\n\n" +
          "Talvez a coisa mais frustrante do mundo corporativo: você tem razão, prova com dados que sua ideia é melhor, e mesmo assim o time resiste, arrasta o pé, volta pro 'como era antes'.\n\n" +
          "Demorei pra entender uma coisa: mostrar dado NÃO convence pessoas. Existe um método pra conduzir isso. Chama-se ADKAR, e eu uso em todo projeto de mudança que toco.\n\n" +
          "Uma das trilhas da formação completa te dá o mapa de stakeholders honesto, os scripts pra conversa difícil com quem resiste, e como sobreviver aos 90 dias críticos depois que a mudança começa.\n\n" +
          "Liderança técnica de verdade não é mandar. É fazer o outro querer ir junto.\n\n" +
          "[botao: Ver a formação completa | " + VENDAS_URL + "]\n\n" +
          "Israel",
      },
      // 3 — NUTRE: estatística (dia 8)
      {
        dia: 8, ativo: true,
        assunto: "Estatística que vira decisão (não relatório)",
        corpo:
          "[titulo: A trilha que muda o patamar]\n\n" +
          "Oi {nome},\n\n" +
          "Deixa eu te mostrar a trilha mais hardcore, e a que mais muda o patamar de quem domina.\n\n" +
          "Tem uma fronteira que separa o profissional bom do profissional raro: saber usar estatística pra DECIDIR, não pra encher relatório. A maioria tem medo porque associou aquilo a fórmula e prova de faculdade. Mas estatística aplicada é outra coisa: é a ferramenta mais poderosa que existe pra parar de decidir no 'achismo'.\n\n" +
          "Você começou entendendo como chegar numa área nova. Isso aqui é o outro extremo da jornada: virar a referência técnica que todo mundo procura. Tudo no-code, traduzido pra linguagem de negócio.\n\n" +
          "[botao: Ver a formação completa | " + VENDAS_URL + "]\n\n" +
          "Israel",
      },
      // 4 — CTA VENDA: a jornada completa, preço cheio (dia 16)
      {
        dia: 16, ativo: true,
        assunto: "Você já provou que consegue, {nome}",
        corpo:
          "[titulo: A jornada completa te espera]\n\n" +
          "Oi {nome},\n\n" +
          "Nessas semanas você viu de perto o que a plataforma faz. Não foi promessa, foi experiência: você entrou, usou, e viu funcionar.\n\n" +
          "Agora eu te faço um convite direto. Você viu a ponta. A formação completa é a jornada inteira, as 8 trilhas, da base ao topo:\n\n" +
          "Entender uma empresa por dentro. Recomendar melhorias com dados. Conduzir mudanças. Apresentar como executivo. Antecipar riscos. Cultura Lean. Estatística aplicada. E o topo: gestão de projetos de melhoria.\n\n" +
          "Mais o software estatístico, o Mentor Israel digital ilimitado, a comunidade e o certificado de cada trilha. Tudo por 12x de R$ 61,74 (ou R$ 597 à vista).\n\n" +
          "Quem chegou usando até aqui é exatamente quem mais aproveita.\n\n" +
          "[botao: Quero a formação completa | " + VENDAS_URL + "]\n\n" +
          "Israel",
      },
      // 5 — CTA VENDA: o custo de não fazer (dia 19)
      {
        dia: 19, ativo: true,
        assunto: "O que custa continuar do jeito que está",
        corpo:
          "[titulo: O custo invisível de não decidir]\n\n" +
          "Oi {nome},\n\n" +
          "Deixa eu ser honesto sobre uma conta que quase ninguém faz.\n\n" +
          "Ficar mais um ano 'aprendendo no susto', travando quando pedem os números, vendo boa ideia sua ser ignorada por falta de apresentação, isso também tem preço. Só que é um preço invisível: promoções que não vêm, projetos que não decolam, a sensação de que você poderia mais.\n\n" +
          "A formação completa custa 12x de R$ 61,74. Menos que um jantar por mês. E te entrega o método que separa quem executa de quem só assiste.\n\n" +
          "Não é sobre gastar. É sobre parar de pagar o preço invisível de ficar onde está.\n\n" +
          "[botao: Dar o próximo passo | " + VENDAS_URL + "]\n\n" +
          "Israel",
      },
      // 6 — DESCONTO + prazo 48h (dia 22) — tom de aluno, não de brinde
      {
        dia: 22, ativo: true,
        assunto: "{nome}, uma condição de aluno",
        corpo:
          "[titulo: Uma condição que não abro pra quem chega de fora]\n\n" +
          "Oi {nome},\n\n" +
          "Você já é aluno LBW. Entrou, usou a plataforma, acompanhou meus e-mails. Isso me diz que você leva a sério o seu crescimento, e eu quero reconhecer isso.\n\n" +
          "Por isso posso te fazer uma condição que não abro pra quem chega de fora: a formação completa, que sai por R$ 597, sai pra você por R$ 400. São R$ 197 de desconto, de aluno pra aluno.\n\n" +
          "Mas preciso ser justo com quem paga o valor cheio, então essa condição vale só por 48 horas. Depois disso, o preço volta ao normal.\n\n" +
          "Se você já pensava em dar esse passo, essa é a hora certa.\n\n" +
          "[botao: Garantir por R$ 400 (48h) | " + DESCONTO_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. É um desconto de verdade, com prazo de verdade. Em 48h ele acaba.",
      },
      // 7 — ÚLTIMA CHAMADA do desconto (dia 23)
      {
        dia: 23, ativo: true,
        assunto: "Acaba hoje: seus R$ 197 de desconto",
        corpo:
          "[titulo: Última chamada]\n\n" +
          "Oi {nome},\n\n" +
          "Ontem eu te enviei uma condição especial: a formação completa por R$ 400, em vez de R$ 597. Esse desconto acaba hoje.\n\n" +
          "Não vou te encher com pressão falsa. Só quero ser justo: se você deixar passar, o preço volta pra R$ 597 e essa condição não volta.\n\n" +
          "Você já fez a parte mais difícil, que é começar. Entrou, usou, viu que funciona. Falta só decidir ir até o fim.\n\n" +
          "Se fizer sentido pra você, esse é o momento.\n\n" +
          "[botao: Garantir por R$ 400 (acaba hoje) | " + DESCONTO_URL + "]\n\n" +
          "Foi uma honra te acompanhar nessas semanas, de verdade.\n\nIsrael\n\n" +
          "P.S. Se não for a hora, tudo bem, sua Trilha 1 continua sua. Mas se for, não deixe pra amanhã: o desconto não vai estar lá.",
      },
    ],
    // PAGO-7DIAS (3 e-mails, dias 0/3/6) — SÓ os primeiros 7 dias do comprador.
    // Objetivo ÚNICO: evitar reembolso. Fazer a pessoa entrar, usar e sentir o valor
    // antes do prazo da Hotmart fechar. Do 7º dia em diante a pessoa migra pro estágio
    // "pago" (relacionamento), tratado por classificarSequencia().
    pago7: [
      // 1 — BOAS-VINDAS (dia 0) — reduzir arrependimento, guiar o primeiro acesso
      // DESATIVADO: o boas-vindas já é enviado pelo n8n na compra. Manter aqui
      // duplicaria. Não removido pra não deslocar a numeração (pago7_N).
      {
        dia: 0, ativo: false,
        assunto: "Bem-vindo à formação completa, {nome}",
        corpo:
          "[titulo: Você tomou a decisão certa]\n\n" +
          "Oi {nome},\n\n" +
          "Aqui é o Israel. Sua formação completa está liberada, e eu queria ser o primeiro a te dar as boas-vindas pessoalmente.\n\n" +
          "Você acabou de destravar tudo: as 8 trilhas, todas as ferramentas, as análises de dados, o certificado no final. É a jornada inteira, do entender uma empresa por dentro até liderar projetos de melhoria como um especialista sênior.\n\n" +
          "Mas deixa eu te falar uma verdade que aprendi treinando gente em multinacional: o que separa quem transforma a carreira de quem só assiste vídeo é uma coisa só. Começar hoje, não amanhã.\n\n" +
          "Então meu pedido é simples: entra agora, dá uma volta, e faz a primeira fase da Trilha 1. São 15 minutos.\n\n" +
          "[botao: Entrar na plataforma | " + APP_URL + "]\n\n" +
          "Qualquer dúvida, responde este e-mail. Eu leio, e eu respondo.\n\nIsrael\n\n" +
          "P.S. Você entra com o seu e-mail e a senha que criou na compra. Se travar, é só me responder aqui. Eu leio.",
      },
      // 2 — ATIVAÇÃO (dia 3) — primeiro resultado rápido, dentro do prazo de reembolso
      {
        dia: 3, ativo: true,
        assunto: "Faça isso hoje e você já sai na frente",
        corpo:
          "[titulo: Seu primeiro resultado, ainda esta semana]\n\n" +
          "Oi {nome},\n\n" +
          "Comprar foi o primeiro passo. Mas o que muda a sua vida não é ter acesso, é usar.\n\n" +
          "Por isso vim te empurrar de leve. Reserve 20 minutos hoje e faça uma coisa só: pegue um processo do seu trabalho de verdade, qualquer um, e monte o SIPOC dele na plataforma.\n\n" +
          "Vai parecer simples. Mas quando você terminar, vai enxergar aquele processo de um jeito que ninguém na sua equipe enxerga. É o primeiro momento em que a ferramenta vira poder de verdade.\n\n" +
          "Não deixa pra depois. Depois vira nunca, e eu não quero isso pra você.\n\n" +
          "[botao: Abrir a Trilha 1 agora | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Fez e ficou com dúvida se está certo? Me responde com um print. Eu olho pra você.",
      },
      // 3 — CONFIRMAÇÃO DE VALOR (dia 6) — fecha a janela de reembolso com a pessoa convencida
      {
        dia: 6, ativo: true,
        assunto: "{nome}, você já sentiu por que valeu?",
        corpo:
          "[titulo: Uma semana com você]\n\n" +
          "Oi {nome},\n\n" +
          "Faz quase uma semana que você entrou. Queria fazer um check honesto com você.\n\n" +
          "Se você já entrou e usou uma ferramenta, você já sabe do que estou falando: aquilo destrava um jeito de pensar que não tem volta. Você começa a ver desperdício, causa raiz e oportunidade onde antes via só rotina.\n\n" +
          "E se você ainda não entrou de verdade, esse e-mail é o seu empurrão. Não deixa esse investimento virar mais uma assinatura esquecida. Ele foi feito pra te dar retorno, e o retorno começa no primeiro uso.\n\n" +
          "Você tem uma jornada inteira pela frente, 8 trilhas que vão te levar de recém chegado a referência técnica. Mas tudo começa com você abrindo a plataforma esta semana.\n\n" +
          "[botao: Continuar de onde parei | " + APP_URL + "]\n\n" +
          "Estou aqui pra isso dar certo pra você.\n\nIsrael\n\n" +
          "P.S. Travou em algo, achou confuso, faltou alguma coisa? Me responde. Eu quero saber, de verdade.",
      },
    ],
    // PAGO (7 e-mails, dias 13→55) — comprador que já passou dos 7 dias (fora do risco
    // de reembolso). Estes são os e-mails de ROTINA: o início do ritmo semanal que segue
    // pra sempre. Uma trilha por semana + certificado + fechamento. Os dias contam a partir
    // da COMPRA (criadoEm). Quando os 7 acabam, dá pra ir acrescentando novos semanais aqui
    // (ou a newsletter manual assume). É a base da comunicação contínua com quem pagou.
    pago: [
      // 1 — TRILHA 2 (dia 13) — início do ritmo semanal
      {
        dia: 13, ativo: true,
        assunto: "Resolver problema sem depender de Excel",
        corpo:
          "[titulo: Trilha 2: o método que funciona sem dado]\n\n" +
          "Oi {nome},\n\n" +
          "Tem um tipo de problema no trabalho que ninguém resolve porque todo mundo trava esperando ter dado, ter planilha, ter número. E o problema fica lá, apodrecendo.\n\n" +
          "A Trilha 2 te ensina a resolver mesmo sem nada disso. Brainstorming estruturado, Ishikawa pra achar a causa raiz, os 5 Porquês, Esforço x Impacto pra decidir onde mexer primeiro, e o 5W2H pra virar plano de ação.\n\n" +
          "É a caixa de ferramentas que faz você ser a pessoa que resolve, enquanto os outros ainda estão reclamando que falta informação.\n\n" +
          "[botao: Começar a Trilha 2 | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Aplica num problema real do seu trabalho enquanto faz. Aprender fazendo gruda de um jeito que só assistir nunca vai grudar.",
      },
      // 2 — TRILHA 3 (dia 20)
      {
        dia: 20, ativo: true,
        assunto: "Decidir com dados, sem programar nada",
        corpo:
          "[titulo: Trilha 3: dado vira decisão, sem virar programador]\n\n" +
          "Oi {nome},\n\n" +
          "Muita gente boa fica pra trás porque acha que trabalhar com dados é coisa de quem programa. Não é.\n\n" +
          "Na Trilha 3 você aprende a transformar uma pilha de números numa decisão clara, sem escrever uma linha de código. Pareto pra achar o que importa, Histograma, Tendência, Dispersão, Box Plot. Tudo dentro da plataforma, é só preencher.\n\n" +
          "Mas o mais importante vem antes do gráfico: qual é A PERGUNTA que você quer responder. Gente que domina isso para de fazer gráfico bonito e inútil, e começa a mostrar conclusão que o chefe respeita.\n\n" +
          "[botao: Começar a Trilha 3 | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Essa é a trilha que faz você chegar numa reunião e falar com autoridade, com o número na mão.",
      },
      // 3 — TRILHA 4 (dia 27) — desmistificar a parte hardcore
      {
        dia: 27, ativo: true,
        assunto: "A estatística que assusta (e não devia)",
        corpo:
          "[titulo: Trilha 4: a parte que separa amador de profissional]\n\n" +
          "Oi {nome},\n\n" +
          "Vou ser sincero: a Trilha 4 é a que mais assusta no papel. Controle estatístico de processo, capacidade (Cp, Cpk), testes de hipótese, ANOVA, regressão. Nomes que fazem gente fugir.\n\n" +
          "Mas aqui está o segredo: você não precisa ser matemático. A plataforma faz a conta. O que você aprende é o que cada uma significa e quando usar. E isso, poucos dominam.\n\n" +
          "Quem passa por essa trilha ganha uma coisa rara no mercado: consegue provar, com rigor, que uma melhoria funcionou de verdade e não foi sorte. É o que te coloca num outro nível de conversa.\n\n" +
          "Vai com calma, uma ferramenta de cada vez. Do outro lado você sai diferente.\n\n" +
          "[botao: Encarar a Trilha 4 | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Empacou em algum conceito? Me responde. Já expliquei isso pra muita gente que achava que não era capaz, e era.",
      },
      // 4 — TRILHA 5 (dia 34) — parte humana
      {
        dia: 34, ativo: true,
        assunto: "Ter razão não basta. Precisa convencer",
        corpo:
          "[titulo: Trilha 5: influenciar sem ter o cargo]\n\n" +
          "Oi {nome},\n\n" +
          "Vou te contar o erro que quase todo técnico bom comete: acha que ter razão é suficiente. Chega com a análise perfeita, os dados certos, e mesmo assim ninguém se move.\n\n" +
          "Porque decisão, na prática, é gente. E gente se move por confiança, por história bem contada, por sentir que faz parte da mudança, não por planilha.\n\n" +
          "A Trilha 5 te ensina essa parte que faculdade nenhuma ensina: o método ADKAR pra conduzir mudança, mapear quem decide, contar a história com o SCQA, apresentar pra diretoria e influenciar mesmo sem ter autoridade formal.\n\n" +
          "É o que faz sua ideia sair da sua cabeça e virar decisão da empresa.\n\n" +
          "[botao: Começar a Trilha 5 | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Essa trilha muda como você é visto no trabalho. De 'o cara técnico' pra 'a pessoa que faz acontecer'.",
      },
      // 5 — TRILHA 6 (dia 41) — o topo
      {
        dia: 41, ativo: true,
        assunto: "A última trilha é onde você vira referência",
        corpo:
          "[titulo: Trilha 6: o topo da jornada]\n\n" +
          "Oi {nome},\n\n" +
          "Você chegou na trilha que resume tudo. A Trilha 6 é onde você deixa de ser quem usa ferramenta e vira quem lidera projetos de melhoria inteiros, do começo ao fim.\n\n" +
          "Gestão de projetos no padrão PMI, FMEA pra antecipar risco, registro de riscos, charter, cronograma de 12 a 18 meses, e como coordenar um programa de excelência operacional numa empresa.\n\n" +
          "É o nível de quem uma empresa chama pra resolver o problema que ninguém mais consegue. O especialista sênior que anda pela organização inteira e deixa resultado por onde passa. Foi o que eu construí na minha carreira, e é exatamente isso que essa trilha entrega pra você.\n\n" +
          "Quando você fechar essa, você não vai ser mais o mesmo profissional que começou lá na Trilha 1.\n\n" +
          "[botao: Chegar ao topo | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Termina essa trilha e você libera o certificado. E ele vale, porque atrás dele tem competência de verdade.",
      },
      // 6 — CERTIFICADO / PROVA DE COMPETÊNCIA (dia 48)
      {
        dia: 48, ativo: true,
        assunto: "Seu certificado (e como fazer ele valer)",
        corpo:
          "[titulo: Transforme o que aprendeu em oportunidade]\n\n" +
          "Oi {nome},\n\n" +
          "Se você chegou até aqui na jornada, precisa saber uma coisa: o certificado é a parte fácil. O que importa é o que ele representa, competência que você consegue provar.\n\n" +
          "Então deixa eu te dar um plano prático pra transformar isso em carreira:\n\n" +
          "Coloque a formação no seu LinkedIn, com uma frase concreta do que você sabe fazer agora. Não 'fiz um curso', e sim 'sei mapear processos, achar causa raiz e provar melhoria com dados'.\n\n" +
          "Numa entrevista ou conversa com o chefe, não diga que estudou. Mostre um projeto que você fez na plataforma com um problema real. Prova sempre vence promessa.\n\n" +
          "Você não tem só um certificado. Você tem um portfólio de coisas que resolveu. Use isso.\n\n" +
          "[botao: Ver minha jornada | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Terminou tudo e quer que eu dê uma olhada em como você está se posicionando? Me responde. Fico feliz em ajudar.",
      },
      // 7 — FECHAMENTO / RELACIONAMENTO (dia 55)
      {
        dia: 55, ativo: true,
        assunto: "{nome}, como foi a sua jornada?",
        corpo:
          "[titulo: Uma conversa, de pessoa pra pessoa]\n\n" +
          "Oi {nome},\n\n" +
          "Faz umas semanas que você começou, e eu queria fechar essa série do jeito que ela merece: com uma conversa de verdade, não com mais um e-mail automático.\n\n" +
          "Me conta como foi. O que você aplicou no trabalho? Teve algum resultado, alguma reunião que mudou, algum problema que você resolveu e teria travado antes? Eu leio cada resposta, e casos reais de aluno são o que mais me motiva a melhorar isso tudo.\n\n" +
          "E se ainda tem trilha que você não terminou, sem culpa. A plataforma é sua, ela vai estar lá quando você voltar. O importante é que essa não é a última parada, é o começo de uma carreira em que você é a referência técnica, não mais quem corre atrás.\n\n" +
          "[botao: Voltar pra plataforma | " + APP_URL + "]\n\n" +
          "Obrigado por confiar em mim nessa jornada. De verdade.\n\nIsrael\n\n" +
          "P.S. Se essa formação te ajudou, me responde contando. E se conhece alguém que precisa disso, me avisa que eu cuido bem de quem você indicar.",
      },
    ],
  };

  async function lerSequencias(): Promise<Sequencias> {
    try {
      const snap = await adminFirestore().collection("config").doc("marketingSequencias").get();
      if (snap.exists) {
        const d = snap.data() as any;
        return {
          gratis: Array.isArray(d?.gratis) ? d.gratis : SEQUENCIAS_DEFAULT.gratis,
          gratisEngajado: Array.isArray(d?.gratisEngajado) ? d.gratisEngajado : SEQUENCIAS_DEFAULT.gratisEngajado,
          pago7: Array.isArray(d?.pago7) ? d.pago7 : SEQUENCIAS_DEFAULT.pago7,
          pago: Array.isArray(d?.pago) ? d.pago : SEQUENCIAS_DEFAULT.pago,
        };
      }
    } catch (e) { /* cai no default */ }
    return SEQUENCIAS_DEFAULT;
  }

  // Conta dias por DATA DE CALENDÁRIO (UTC), não por 24h exatas. Assim, virou o
  // dia seguinte à régua = conta +1, independente da HORA que a régua começou ou
  // que o motor roda. Sem isto, uma régua que começa 08:10 e um motor que roda
  // 06:38 fazem cada e-mail atrasar 1 dia (o "dia" só fecha 24h depois, tarde
  // demais pro ciclo daquela manhã).
  function diasDesde(iso: string): number {
    const t = Date.parse(iso);
    if (isNaN(t)) return -1;
    const diaRegua = Math.floor(t / (24 * 3600 * 1000));      // nº do dia (epoch/dia) da régua
    const diaHoje = Math.floor(Date.now() / (24 * 3600 * 1000)); // nº do dia de hoje
    return diaHoje - diaRegua;
  }

  // Classificação "de negócio" — usada na tela (contagem/engajamento). Trata
  // todo comprador como "pago" (uma coisa só), pra não quebrar quem já consome.
  // Não existe mais "lead": a Trilha 1 virou paga, ninguém cadastra sem acessar.
  // Quem tem conta e ainda não acessou é tratado como "gratis" (introdutório).
  function classificarUsuario(u: any): "gratis" | "pago" | null {
    if (!u || !u.email) return null;
    if (u.tipoUsuario === "admin" || u.tipoUsuario === "coordenador") return null; // não recebem sequência
    if (u.plano === "completo") return "pago";
    // Comprador do Kit 90: o plano dele é "gratuito" (nível Trilha 1), mas ele PAGOU.
    // Quem decide é a `origem`, não o `plano` — senão o comprador virava "lead".
    if (isComprador(u)) return "pago";
    return "gratis";
  }

  // Classificação "de sequência" — usada SÓ pelo motor de e-mails. Igual à de
  // negócio, mas divide o comprador em duas fases pela idade da compra:
  //   pago7 = primeiros 7 dias (0..6) — 3 e-mails anti-reembolso
  //   pago  = do 7º dia em diante     — 7 e-mails de relacionamento
  // IMPORTANTE: quem é CORTESIA (grátis completo, não pagou) NÃO entra no pago7,
  // porque a fase anti-reembolso é irrelevante pra quem não tem o que reembolsar.
  // Vai direto pro "pago" (relacionamento).
  // Corte de engajamento da Trilha 1: assistiu MAIS de 2 vídeos = engajado.
  const VIDEOS_ENGAJADO = 2;
  // videosPorUid: mapa uid → nº de vídeos assistidos (de userProgress). Opcional:
  // se não vier, trata todo Trilha 1 como "gratis" (novo) — fallback seguro.
  function classificarSequencia(u: any, videosPorUid?: Record<string, number>): "gratis" | "gratisEngajado" | "pago7" | "pago" | null {
    if (!u || !u.email) return null;
    if (u.tipoUsuario === "admin" || u.tipoUsuario === "coordenador") return null;
    // A sequência é decidida pelo PRODUTO que a pessoa tem, não por ter pago:
    //   - Tem só a Trilha 1 (comprou o Kit 90 OU ganhou de cortesia) → aba "Trilha 1"
    //   - Tem o Completo (comprou OU ganhou de cortesia)             → aba "Completo"
    if (u.plano !== "completo") {
      // Trilha 1 se divide por ENGAJAMENTO (vídeos assistidos):
      //   >2 vídeos → "gratisEngajado" (vender o completo)
      //   ≤2 vídeos → "gratis" (ativar; fala só da Trilha 1)
      const nv = videosPorUid && u.uid ? (videosPorUid[u.uid] || 0) : 0;
      return nv > VIDEOS_ENGAJADO ? "gratisEngajado" : "gratis";
    }
    // Completo: separa só os 7 primeiros dias do COMPRADOR (anti-reembolso).
    // Quem é cortesia do completo não tem o que reembolsar → vai direto pro "pago".
    if (isCortesia(u)) return "pago";
    const dias = diasDesde(u.criadoEm || u.primeiroAcessoEm || "");
    return dias >= 0 && dias < 7 ? "pago7" : "pago";
  }

  // Carrega o mapa uid → nº de vídeos assistidos (coleção userProgress).
  async function carregarVideosPorUid(): Promise<Record<string, number>> {
    const mapa: Record<string, number> = {};
    try {
      const snap = await adminFirestore().collection("userProgress").get();
      snap.forEach((d) => {
        const w = (d.data() as any)?.watchedUrls;
        mapa[d.id] = w && typeof w === "object" ? Object.keys(w).length : 0;
      });
    } catch { /* mapa vazio = todos tratados como novos */ }
    return mapa;
  }

  // Quais estágios estão LIGADos pra envio automático. Guardado em Firestore pra o Israel
  // ligar/desligar pela tela sem deploy. Default: TODOS DESLIGADOS (posição segura).
  type EstagiosAtivos = { gratis: boolean; gratisEngajado: boolean; pago7: boolean; pago: boolean };
  async function lerEstagiosAtivos(): Promise<EstagiosAtivos> {
    const off = { gratis: false, gratisEngajado: false, pago7: false, pago: false };
    try {
      const snap = await adminFirestore().collection("config").doc("marketingEstagiosAtivos").get();
      if (!snap.exists) return off;
      const d = snap.data() as any;
      return {
        gratis: d?.gratis === true,
        gratisEngajado: d?.gratisEngajado === true,
        pago7: d?.pago7 === true, pago: d?.pago === true,
      };
    } catch { return off; }
  }

  // Processa um ciclo de envios. Retorna um resumo (e detalhes pra log/teste).
  // opts.forcarEstagios: ignora a config e usa esses estágios (pra teste dirigido).
  async function processarEnviosDiarios(opts: { dryRun?: boolean; forcarEstagios?: Partial<EstagiosAtivos> } = {}) {
    const dryRun = !!opts.dryRun;
    const seqs = await lerSequencias();
    const template = await lerTemplate();
    const videosPorUid = await carregarVideosPorUid(); // pra separar Trilha 1 novo vs engajado
    const ativos = opts.forcarEstagios
      ? { gratis: false, gratisEngajado: false, pago7: false, pago: false, ...opts.forcarEstagios }
      : await lerEstagiosAtivos();
    const resumo = {
      rodadoEm: new Date().toISOString(), dryRun,
      analisados: 0, enviados: 0, falhas: 0, pulados: 0,
      porPacote: { gratis: 0, gratisEngajado: 0, pago7: 0, pago: 0 } as Record<string, number>,
      detalhes: [] as any[],
    };

    const snap = await adminFirestore().collection("users").get();
    for (const doc of snap.docs) {
      const u = doc.data() as any;
      resumo.analisados++;
      // Opt-out (descadastro): quem cancelou a inscrição NÃO recebe mais nada. Lei.
      if (u.emailOptOut === true) { resumo.pulados++; continue; }
      const estagio = classificarSequencia(u, videosPorUid);
      if (estagio !== "gratis" && estagio !== "gratisEngajado" && estagio !== "pago7" && estagio !== "pago") { resumo.pulados++; continue; }
      if (!ativos[estagio]) { resumo.pulados++; continue; } // estágio desligado na config

      const seq = seqs[estagio];
      // Data-base da régua de dias, por estágio:
      //  - emailReguaInicioEm: se existir, TEM PRIORIDADE (usado pra "zerar" a régua de
      //    quem já estava na base sem tocar em criadoEm/primeiroAcessoEm).
      //  - gratis (Trilha 1 novo): conta do PRIMEIRO ACESSO (ou cadastro) — ativação.
      //  - gratisEngajado/pago7/pago: conta do cadastro/compra (criadoEm).
      //  - emailReguaInicioEm (zerado pra todos na virada) tem prioridade e alinha tudo.
      const base = u.emailReguaInicioEm
        || (estagio === "gratis"
          ? (u.primeiroAcessoEm || u.criadoEm)
          : (u.criadoEm || u.primeiroAcessoEm));
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
      const corpoHtml = campanhaHtmlCom(corpoTxt.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join(""), template, u.email);

      if (dryRun) {
        resumo.detalhes.push({ email: u.email, estagio, envia: chave, assunto: alvo.email.assunto });
        resumo.enviados++; resumo.porPacote[estagio]++;
        continue;
      }

      const r = await resendSend({ to: u.email, subject: alvo.email.assunto, html: corpoHtml, unsubUrl: unsubLink(u.email) });
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

  // GET /api/marketing/estagios-ativos — quais estágios estão ligados pra envio
  app.get("/api/marketing/estagios-ativos", requireAdmin, async (_req: any, res) => {
    return res.json(await lerEstagiosAtivos());
  });

  // PUT /api/marketing/estagios-ativos — liga/desliga estágios (sem deploy)
  app.put("/api/marketing/estagios-ativos", requireAdmin, async (req: any, res) => {
    const b = req.body || {};
    const limpo = { gratis: b.gratis === true, gratisEngajado: b.gratisEngajado === true, pago7: b.pago7 === true, pago: b.pago === true };
    try {
      await adminFirestore().collection("config").doc("marketingEstagiosAtivos").set(limpo);
      return res.json({ ok: true, ...limpo });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao salvar." });
    }
  });

  // POST /api/marketing/teste-envio — manda a sequência pra UM e-mail de teste, sem tocar
  // na base. Envia o e-mail #N (idx) do estágio pedido pro destinatário informado.
  app.post("/api/marketing/teste-envio", requireAdmin, async (req: any, res) => {
    if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: "RESEND_API_KEY não configurada." });
    const { email, estagio, idx } = req.body || {};
    const dest = String(email || "").trim().toLowerCase();
    const est = String(estagio || "");
    const i = Math.max(0, parseInt(idx, 10) || 0);
    if (!dest.includes("@")) return res.status(400).json({ error: "e-mail inválido." });
    if (!["gratis", "gratisEngajado", "pago7", "pago"].includes(est)) return res.status(400).json({ error: "estágio inválido." });
    try {
      const seqs = await lerSequencias();
      const template = await lerTemplate();
      const arr = (seqs as any)[est] as SeqEmail[];
      if (!arr || !arr[i]) return res.status(400).json({ error: `e-mail #${i + 1} não existe em ${est}.` });
      const em = arr[i];
      const corpoTxt = aplicarNome(String(em.corpo), "Israel");
      const html = campanhaHtmlCom(corpoTxt.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join(""), template, dest);
      const r = await resendSend({ to: dest, subject: `[TESTE] ${em.assunto}`, html, unsubUrl: unsubLink(dest) });
      if (r.ok) return res.json({ ok: true, enviadoPara: dest, estagio: est, email: i + 1, assunto: em.assunto });
      return res.status(502).json({ error: `Resend recusou: ${r.status} ${String(r.body).slice(0, 200)}` });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao enviar teste." });
    }
  });

  // GET /api/marketing/sequencias — lê as sequências (tela Fase 2)
  app.get("/api/marketing/sequencias", requireAdmin, async (_req: any, res) => {
    return res.json(await lerSequencias());
  });

  // PUT /api/marketing/sequencias — salva as sequências editadas (tela Fase 2)
  app.put("/api/marketing/sequencias", requireAdmin, async (req: any, res) => {
    const { gratis, gratisEngajado, pago7, pago } = req.body || {};
    if (!Array.isArray(gratis) || !Array.isArray(gratisEngajado) || !Array.isArray(pago7) || !Array.isArray(pago)) return res.status(400).json({ error: "gratis, gratisEngajado, pago7 e pago precisam ser arrays." });
    const limpa = (arr: any[]): SeqEmail[] => arr.map((e) => ({
      dia: Math.max(0, parseInt(e?.dia, 10) || 0),
      assunto: String(e?.assunto || ""),
      corpo: String(e?.corpo || ""),
      ativo: e?.ativo !== false,
    }));
    try {
      await adminFirestore().collection("config").doc("marketingSequencias").set({ gratis: limpa(gratis), gratisEngajado: limpa(gratisEngajado), pago7: limpa(pago7), pago: limpa(pago) });
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

  // ===== UNSUBSCRIBE (público, sem auth) — o link no rodapé dos e-mails aponta aqui.
  // GET  = pessoa clicou no link → marca opt-out e mostra página de confirmação.
  // POST = one-click do Gmail/Outlook (RFC 8058) → marca opt-out e responde 200 seco.
  async function aplicarOptOut(email: string, token: string): Promise<{ ok: boolean; motivo?: string }> {
    const e = String(email || "").trim().toLowerCase();
    if (!unsubValido(e, token)) return { ok: false, motivo: "link inválido" };
    try {
      const snap = await adminFirestore().collection("users").where("email", "==", e).get();
      if (snap.empty) {
        // e-mail não está na base (ou grafia diferente) — considera sucesso mesmo assim,
        // pra a pessoa não ficar tentando de novo. Nada a marcar.
        return { ok: true };
      }
      const batch = adminFirestore().batch();
      snap.docs.forEach((d) => batch.set(d.ref, { emailOptOut: true, emailOptOutEm: new Date().toISOString() }, { merge: true }));
      await batch.commit();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, motivo: err?.message || "erro" };
    }
  }

  function paginaUnsub(sucesso: boolean, msg: string): string {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1"/>
      <title>Cancelar inscrição — LBW</title></head>
      <body style="margin:0; font-family:Arial,sans-serif; background:#F0F2FA; color:#2A2F3A;">
        <div style="max-width:480px; margin:60px auto; background:#fff; border-radius:16px; padding:40px 28px; text-align:center; box-shadow:0 4px 24px rgba(30,45,110,.08);">
          <div style="width:56px; height:56px; margin:0 auto 16px; border-radius:50%; background:${sucesso ? "#D1FAE5" : "#FEE2E2"}; line-height:56px; font-size:28px;">${sucesso ? "✓" : "!"}</div>
          <h1 style="font-size:20px; margin:0 0 10px; color:#1E2D6E;">${sucesso ? "Inscrição cancelada" : "Não foi possível"}</h1>
          <p style="font-size:15px; line-height:1.6; color:#4B5563; margin:0;">${msg}</p>
        </div>
      </body></html>`;
  }

  app.get("/api/unsubscribe", async (req: any, res) => {
    const email = String(req.query.e || "");
    const token = String(req.query.t || "");
    const r = await aplicarOptOut(email, token);
    res.status(r.ok ? 200 : 400).type("html").send(
      r.ok
        ? paginaUnsub(true, "Pronto. Você não vai mais receber nossos e-mails automáticos. Se mudar de ideia, é só responder qualquer e-mail antigo que a gente te reativa.")
        : paginaUnsub(false, "Esse link de cancelamento não é válido ou expirou. Se você quer parar de receber, responda um dos e-mails pedindo o descadastro que a gente resolve na hora.")
    );
  });

  app.post("/api/unsubscribe", async (req: any, res) => {
    // one-click (RFC 8058): parâmetros vêm na query string mesmo no POST.
    const email = String(req.query.e || (req.body && req.body.e) || "");
    const token = String(req.query.t || (req.body && req.body.t) || "");
    const r = await aplicarOptOut(email, token);
    return res.status(r.ok ? 200 : 400).json({ ok: r.ok });
  });

  // GET /api/marketing/status — resumo da última execução + contagem por estágio (faixa de status)
  app.get("/api/marketing/status", requireAdmin, async (_req: any, res) => {
    try {
      const [statusSnap, usersSnap, videosPorUid] = await Promise.all([
        adminFirestore().collection("config").doc("marketingMotorStatus").get(),
        adminFirestore().collection("users").get(),
        carregarVideosPorUid(),
      ]);
      // Contagem por ABA: "gratis" = Trilha 1 novo, "gratisEngajado" = Trilha 1
      // engajado, "pago"/"pago7" = Completo (pago7 é sub-fase, soma no pago).
      const contagem = { gratis: 0, gratisEngajado: 0, pago: 0 };
      usersSnap.docs.forEach((d) => {
        const c = classificarSequencia(d.data(), videosPorUid);
        if (c === "gratis") contagem.gratis++;
        else if (c === "gratisEngajado") contagem.gratisEngajado++;
        else if (c === "pago7" || c === "pago") contagem.pago++;
      });
      return res.json({ ultimaExecucao: statusSnap.exists ? statusSnap.data() : null, contagem });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao ler status." });
    }
  });

  // GET /api/marketing/volume — controle de cota do Resend (100/dia, 3000/mês no plano atual).
  // Puxa TODOS os e-mails realmente enviados (automático + newsletter + cortesia) da API do
  // Resend e agrega por dia. Fonte da verdade pro limite, porque conta tudo que saiu de fato.
  app.get("/api/marketing/volume", requireAdmin, async (_req: any, res) => {
    const key = process.env.RESEND_API_KEY;
    if (!key) return res.status(503).json({ error: "RESEND_API_KEY não configurada." });
    try {
      // pagina a lista de e-mails (limite 100 por página; cursor 'after' = id do último)
      const H = { Authorization: `Bearer ${key}` };
      let url: string | null = "https://api.resend.com/emails?limit=100";
      const todos: any[] = [];
      let guard = 0;
      while (url && guard < 60) {
        guard++;
        const r: any = await fetch(url, { headers: H });
        if (!r.ok) break;
        const j: any = await r.json();
        const data: any[] = Array.isArray(j?.data) ? j.data : [];
        todos.push(...data);
        if (j?.has_more && data.length) url = `https://api.resend.com/emails?limit=100&after=${data[data.length - 1].id}`;
        else url = null;
      }
      // agrega por dia (YYYY-MM-DD) e por mês (YYYY-MM)
      const porDia: Record<string, number> = {};
      const porMes: Record<string, number> = {};
      for (const e of todos) {
        const iso = String(e.created_at || "");
        const dia = iso.slice(0, 10);
        const mes = iso.slice(0, 7);
        if (dia) porDia[dia] = (porDia[dia] || 0) + 1;
        if (mes) porMes[mes] = (porMes[mes] || 0) + 1;
      }
      const hojeStr = new Date().toISOString().slice(0, 10);
      const mesStr = hojeStr.slice(0, 7);
      // detalhe de HOJE por estágio: vem do porPacote da última execução do motor (só se rodou hoje)
      const statusSnap = await adminFirestore().collection("config").doc("marketingMotorStatus").get();
      const st: any = statusSnap.exists ? statusSnap.data() : null;
      const rodouHoje = st && String(st.rodadoEm || "").slice(0, 10) === hojeStr && !st.dryRun;
      const hojePorEstagio = rodouHoje && st.porPacote ? st.porPacote : null;
      // últimos 35 dias em ordem, pra o gráfico/lista
      const dias = Object.entries(porDia).map(([d, n]) => ({ dia: d, total: n })).sort((a, b) => a.dia.localeCompare(b.dia)).slice(-35);
      return res.json({
        limiteDia: 100,
        limiteMes: 3000,
        hoje: hojeStr,
        enviadosHoje: porDia[hojeStr] || 0,
        enviadosMes: porMes[mesStr] || 0,
        hojePorEstagio,     // { gratis, pago7, pago } se o motor rodou hoje; senão null
        totalHistorico: todos.length,
        porDia: dias,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao ler volume do Resend." });
    }
  });

  // POST /api/marketing/rodar-agora — dispara o motor na hora (teste). ?dry=1 só simula.
  app.post("/api/marketing/rodar-agora", requireAdmin, async (req: any, res) => {
    if (!process.env.RESEND_API_KEY && !req.query.dry) {
      return res.status(503).json({ error: "RESEND_API_KEY não configurada (use ?dry=1 pra simular)." });
    }
    // Respeita a pausa do motor (mas permite simular com ?dry=1).
    if (String(process.env.MOTOR_EMAIL_PAUSADO || "").toLowerCase() === "true" && req.query.dry !== "1") {
      return res.status(409).json({ error: "Motor de e-mail PAUSADO (MOTOR_EMAIL_PAUSADO=true). Remova a env var pra religar." });
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
  //
  // DESLIGADO POR PADRÃO (decisão do Israel, jul/2026): o motor automático só dispara
  // e-mails se MOTOR_EMAIL_ATIVO=true estiver setado no Railway. Sem essa env var, ele
  // fica PARADO — é a posição segura. Assim, remover uma flag por engano NÃO religa o
  // motor sozinho. Pra religar, o Israel pede e a gente seta MOTOR_EMAIL_ATIVO=true.
  // Os envios MANUAIS (campanha cortesia etc.) NÃO são afetados por isto.
  const MOTOR_ATIVO = String(process.env.MOTOR_EMAIL_ATIVO || "").toLowerCase() === "true";
  if (!MOTOR_ATIVO) {
    console.warn("[motor-email] DESLIGADO (padrão) — nenhum envio automático. Setar MOTOR_EMAIL_ATIVO=true pra religar.");
  }
  let ultimoDiaProcessado = "";
  const HORA_ALVO = 6;
  setInterval(() => {
    if (!MOTOR_ATIVO) return; // motor desligado por padrão: não dispara nada
    const agora = new Date();
    const diaHoje = agora.toISOString().slice(0, 10);
    if (agora.getHours() >= HORA_ALVO && ultimoDiaProcessado !== diaHoje) {
      ultimoDiaProcessado = diaHoje;
      processarEnviosDiarios().catch((e) => console.error("[motor-email] erro no ciclo agendado:", e?.message || e));
    }
  }, 60 * 60 * 1000); // a cada hora

  // ===============================================================
  // NEWSLETTER (pacote Pago) — envio manual + histórico pra reenviar
  // Público-alvo por filtro: 'pago' (completo), 'gratis' ou 'todos'.
  // Cada envio é salvo em newsletters/{id} pra você reabrir e reenviar.
  // ===============================================================

  function emailsPorPublico(docs: any[], publico: string): { email: string; nome: string }[] {
    const vistos = new Set<string>();
    const lista: { email: string; nome: string }[] = [];
    docs.forEach((d) => {
      const u = d.data ? d.data() : d;
      if (!u?.email || String(u.email).indexOf("@") < 0) return;
      if (u.emailOptOut === true) return; // descadastrado: nunca recebe. Lei.
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
    const alvo = ["pago", "gratis", "todos"].includes(publico) ? publico : "pago";
    try {
      const template = await lerTemplate();
      const snap = await adminFirestore().collection("users").get();
      const destinatarios = emailsPorPublico(snap.docs, alvo);
      let enviados = 0, falhas = 0;
      const erros: any[] = [];
      for (const dest of destinatarios) {
        const corpoTxt = aplicarNome(String(corpo), dest.nome);
        const html = campanhaHtmlCom(corpoTxt.split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br/>")}</p>`).join(""), template, dest.email);
        const r = await resendSend({ to: dest.email, subject: assunto, html, unsubUrl: unsubLink(dest.email) });
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
  // LEADS CORPORATIVOS — formulário público da página /pacotes-corporativos.
  // Salva no Firestore (coleção corporate_leads) E avisa por e-mail (Resend).
  // O admin vê os leads na aba Marketing (GET abaixo, protegido).
  // ===============================================================
  app.post("/api/lead-corporativo", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Servidor não configurado." });
    const b = req.body || {};
    const nome = String(b.nome || "").trim();
    const empresa = String(b.empresa || "").trim();
    if (nome.length < 2 || empresa.length < 2) {
      return res.status(400).json({ error: "Informe nome e empresa." });
    }
    const lead = {
      nome,
      funcao: String(b.funcao || "").trim(),
      email: String(b.email || "").trim(),
      telefone: String(b.telefone || "").trim(),
      empresa,
      site: String(b.site || "").trim(),
      qtdTreinandos: String(b.qtdTreinandos || "").trim(),
      suporte: Array.isArray(b.suporte) ? b.suporte.map((s: any) => String(s)) : [],
      detalhes: String(b.detalhes || "").trim(),
      criadoEm: new Date().toISOString(),
    };
    try {
      const ref = adminFirestore().collection("corporate_leads").doc();
      await ref.set({ id: ref.id, ...lead });

      // Avisa por e-mail (não bloqueia o sucesso se o e-mail falhar)
      try {
        const linhas = [
          `<p><strong>Novo lead corporativo</strong></p>`,
          `<p><strong>Nome:</strong> ${esc(lead.nome)}</p>`,
          `<p><strong>Função:</strong> ${esc(lead.funcao)}</p>`,
          `<p><strong>E-mail:</strong> ${esc(lead.email)}</p>`,
          `<p><strong>Telefone/WhatsApp:</strong> ${esc(lead.telefone)}</p>`,
          `<p><strong>Empresa:</strong> ${esc(lead.empresa)}</p>`,
          `<p><strong>Site:</strong> ${esc(lead.site)}</p>`,
          `<p><strong>Funcionários a treinar:</strong> ${esc(lead.qtdTreinandos)}</p>`,
          `<p><strong>Suporte desejado:</strong> ${esc(lead.suporte.join(", "))}</p>`,
          lead.detalhes ? `<p><strong>Detalhes:</strong> ${esc(lead.detalhes)}</p>` : "",
        ].join("");
        await resendSend({
          to: "contact@learningbyworking.com",
          subject: `Lead corporativo — ${lead.empresa}`,
          html: campanhaHtml(linhas),
        });
      } catch (e) { /* e-mail não-crítico */ }

      return res.json({ ok: true, id: ref.id });
    } catch (err: any) {
      console.error("[POST /api/lead-corporativo] erro:", err?.message || err);
      return res.status(500).json({ error: "Erro ao enviar. Tente novamente." });
    }
  });

  // GET /api/leads-corporativos — lista os leads (admin, aba Marketing)
  app.get("/api/leads-corporativos", requireAdmin, async (_req: any, res) => {
    try {
      const snap = await adminFirestore().collection("corporate_leads").get();
      const leads = snap.docs
        .map((d) => d.data())
        .sort((a: any, b: any) => String(b.criadoEm).localeCompare(String(a.criadoEm)));
      return res.json({ leads });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao ler leads." });
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

  // GET /api/marketing/engajamento — lista de pessoas do funil pra gestão (com filtros no front).
  // Usa classificarSequencia (mostra os 4 estágios, incl. pago7). Sem foco em cliques.
  app.get("/api/marketing/engajamento", requireAdmin, async (_req: any, res) => {
    try {
      // Score de engajamento 0-100 — usa só sinais CONFIÁVEIS (não usa aberturas/cliques,
      // que são imprecisos). Ideia: o quanto a pessoa demonstrou interesse real.
      //  +40 acessou a plataforma · +45 comprou (pago/pago7) · +10 não descadastrou
      //  ajuste por recência: lead novo (<7d) ainda "quente" ganha bônus; lead frio perde.
      function scoreEngajamento(u: any, estagio: string): number {
        if (u.emailOptOut === true) return 0; // descadastrou = engajamento zero
        let s = 10; // base (ainda está na lista, não saiu)
        if (u.primeiroAcessoEm) s += 40; // acessou de verdade — sinal forte
        if (estagio === "pago" || estagio === "pago7") s += 45; // comprou — sinal máximo
        // recência do cadastro (lead que acabou de entrar está mais quente)
        const diasCad = diasDesde(u.criadoEm || u.primeiroAcessoEm || "");
        if (!u.primeiroAcessoEm) {
          if (diasCad >= 0 && diasCad <= 7) s += 10;        // lead novo, quente
          else if (diasCad > 30) s -= 10;                    // lead frio, esfriou
        }
        return Math.max(0, Math.min(100, s));
      }
      const [snap, videosPorUid] = await Promise.all([
        adminFirestore().collection("users").get(),
        carregarVideosPorUid(),
      ]);
      const lista = snap.docs.map((d) => {
        const u = d.data() as any;
        const estagio = classificarSequencia(u, videosPorUid);
        return {
          email: u.email, nome: u.nome || "",
          estagio,
          plano: u.plano || "",
          acessou: !!u.primeiroAcessoEm,
          optOut: u.emailOptOut === true,
          optOutEm: u.emailOptOutEm || null,
          cortesia: isCortesia(u),
          criadoEm: u.criadoEm || null,
          primeiroAcessoEm: u.primeiroAcessoEm || null,
          score: scoreEngajamento(u, estagio || ""),
        };
      }).filter((x) => x.estagio); // só quem está num estágio do funil
      // ordena por cadastro mais recente primeiro (útil pra gestão do dia a dia)
      lista.sort((a, b) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
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
    const fromEmail = process.env.SMTP_FROM || user;
    const from = `LBW - Educação pelo Trabalho <${fromEmail}>`;

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
    // plano recebido do n8n:
    //   'completo'  -> 8 trilhas
    //   'trilha1'   -> COMPRA da Trilha 1 (R$67). Acesso = mesma Trilha 1 do grátis,
    //                  mas conta como venda (origem + validade 1 ano).
    //   'gratuito'  -> Trilha 1 grátis (fluxo antigo). Default.
    const planoRaw = String(body.plano || "").toLowerCase();
    const isCompraTrilha1 = planoRaw === "trilha1" || planoRaw === "trilha-1" || planoRaw === "trilha1-pago";
    const planoSolicitado: "completo" | "gratuito" = planoRaw === "completo" ? "completo" : "gratuito";

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
        // GRÁTIS: senha padrão LBW2026 (facilita o acesso — o email/LinkedIn pode
        // sempre informar a mesma senha, sem depender de achar o e-mail original).
        // PAGO (completo OU Trilha 1 comprada): senha aleatória (mais seguro para quem
        // comprou). Todos trocam no 1º acesso.
        const senhaProvisoria = (planoSolicitado === "completo" || isCompraTrilha1)
          ? Math.random().toString(36).slice(-10)
          : "LBW2026";
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
          origem: planoSolicitado === "completo"
            ? "compra-hotmart"
            : (isCompraTrilha1 ? "compra-trilha1" : "gratuito-landing"),
          // Compra (completa OU Trilha 1) = 1 ano de acesso. Só exibição por enquanto;
          // o rebaixamento automático ao vencer ainda é pendência (cron, Camada B).
          ...(planoSolicitado === "completo" || isCompraTrilha1
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

      // COMPRA da Trilha 1 por quem já existia (lead/cortesia/gratuito). Não muda o
      // acesso (já tem a Trilha 1), mas registra que agora é COMPRA: origem + validade.
      // Não rebaixa quem já é completo.
      if (isCompraTrilha1 && planoAtual !== "completo") {
        await docRef.set({
          origem: "compra-trilha1",
          acessoCompletoAte: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
        }, { merge: true });
        console.log(`[acesso/liberar] COMPRA-TRILHA1 (ja existia) ${email}`);
        return res.json({ ok: true, status: "compra-trilha1-registrada", uid, email, plano: planoAtual });
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
