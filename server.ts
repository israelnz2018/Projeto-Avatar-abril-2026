import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import crypto from "crypto";
import os from "os";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import Automizer from "pptx-automizer";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer from "nodemailer";
import { initFirebaseAdmin, isAdminReady, adminAuth, adminFirestore, admin } from "./src/lib/firebaseAdmin";
import { campanhaCortesiaHtml, CAMPANHA_ASSUNTO } from "./src/services/campanhaCortesiaEmail";
import { DEFAULT_QUIZZES } from "./src/services/quizSeed";
import { empresaIdDireto } from "./src/services/consultorService";
import { ANALYTICS_MODULOS } from "./src/services/analyticsModules";
import { TOOL_HANDLERS } from "./src/services/pptToolHandlers";
import { setPptTemplateMode } from "./src/services/slideTemplate";
import { addCoverSlide } from "./src/services/coverSlide";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MAX_QUIZ_TRILHAS = 50;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ===================================================================
  // PROXY do serviço de ANÁLISES ESTATÍSTICAS (Data Analysis).
  // O serviço roda em outro domínio (Railway) e tem whitelist de CORS que só
  // conhece `app.educacaopelotrabalho.com` — então, a partir de QUALQUER
  // subdomínio de consultor (israel., fulano., ...) o navegador bloqueava a
  // chamada ("Failed to fetch"). Como o modelo white-label cria um subdomínio
  // por consultor, manter whitelist lá é insustentável: o front passa a chamar
  // /api/analises/* (mesma origem, sem CORS) e aqui repassamos pro serviço.
  // Suporta multipart (planilha via FormData) e resposta binária (xlsx).
  const ANALISES_UPSTREAM = process.env.ANALISES_API_URL || "https://analises-production.up.railway.app";
  app.use("/api/analises", async (req: any, res) => {
    try {
      const upstream = ANALISES_UPSTREAM + req.url;
      const ehJson = req.is("application/json");
      const headers: Record<string, string> = {};
      if (req.headers["content-type"]) headers["content-type"] = String(req.headers["content-type"]);
      if (req.headers["authorization"]) headers["authorization"] = String(req.headers["authorization"]);

      const temCorpo = req.method !== "GET" && req.method !== "HEAD";
      const resposta = await fetch(upstream, {
        method: req.method,
        headers,
        // JSON já foi consumido pelo express.json() -> re-serializa. Multipart/stream
        // (upload de planilha) não é consumido -> repassa o stream cru.
        ...(temCorpo ? { body: ehJson ? JSON.stringify(req.body ?? {}) : req, duplex: "half" } as any : {}),
      });

      res.status(resposta.status);
      const tipo = resposta.headers.get("content-type");
      if (tipo) res.setHeader("content-type", tipo);
      const disp = resposta.headers.get("content-disposition");
      if (disp) res.setHeader("content-disposition", disp);
      // arrayBuffer cobre JSON e binário (planilha do Gage R&R) igualmente.
      return res.send(Buffer.from(await resposta.arrayBuffer()));
    } catch (erro: any) {
      console.error("[/api/analises] proxy falhou:", erro?.message || erro);
      return res.status(502).json({ erro: "Serviço de análises indisponível. Tente novamente." });
    }
  });

  function gerarSenhaProvisoria(): string {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const random = crypto.randomBytes(14);
    return Array.from(random, (b) => alphabet[b % alphabet.length]).join("");
  }

  function slugCurto(valor: string): string {
    return valor
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || "time";
  }

  function gerarEmpresaId(consultorId: string, base: string): string {
    return `emp_${slugCurto(consultorId)}_${slugCurto(base)}_${crypto.randomBytes(4).toString("hex")}`;
  }

  // Impede que dois coordenadores diferentes acabem com o mesmo empresaId (o que faria
  // seus times se misturarem — alunos aparecendo/sendo contados nas duas equipes).
  async function empresaIdJaUsadoPorOutroCoordenador(empresaId: string, excludeUid?: string): Promise<boolean> {
    if (!empresaId) return false;
    const snap = await adminFirestore().collection("users")
      .where("empresaId", "==", empresaId)
      .where("tipoUsuario", "==", "coordenador")
      .get();
    return snap.docs.some((d) => d.id !== excludeUid);
  }

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
  //   2) novo + completo   → produto legado convertido no curso especialista
  //   3) upgrade           → novo curso especialista (sem trocar a senha)
  // Usa o mesmo SMTP Hostinger.
  async function sendAcessoEmail(params: {
    para: string;
    nome?: string;
    senhaProvisoria?: string;
    plano: "gratuito" | "completo" | "capabilidade" | "estatistica-aplicada" | "analise-inferencial" | "cep" | "preditiva" | "msa" | "software-lbw" | "gate" | "gestao-mudanca" | "gerenciamento-risco" | "cultura-lean" | "apresentacoes" | "plataforma-completa" | "lbw-academy";
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
    const tipo: "gratis" | "pago" | "capabilidade" | "estatistica-aplicada" | "analise-inferencial" | "cep" | "preditiva" | "msa" | "software-lbw" | "gate" | "gestao-mudanca" | "gerenciamento-risco" | "cultura-lean" | "apresentacoes" | "plataforma-completa" | "lbw-academy" | "upgrade" =
      params.contexto === "upgrade" ? "upgrade" :
      params.plano === "completo" ? "pago" :
      params.plano === "capabilidade" ? "capabilidade" :
      params.plano === "estatistica-aplicada" ? "estatistica-aplicada" :
      params.plano === "analise-inferencial" ? "analise-inferencial" :
      params.plano === "cep" ? "cep" :
      params.plano === "preditiva" ? "preditiva" :
      params.plano === "msa" ? "msa" :
      params.plano === "software-lbw" ? "software-lbw" :
      params.plano === "gate" ? "gate" :
      params.plano === "gestao-mudanca" ? "gestao-mudanca" :
      params.plano === "gerenciamento-risco" ? "gerenciamento-risco" :
      params.plano === "cultura-lean" ? "cultura-lean" :
      params.plano === "plataforma-completa" ? "plataforma-completa" :
      params.plano === "lbw-academy" ? "lbw-academy" : "gratis";

    // ----- blocos reutilizáveis -----
    const linha = (n: string, txt: string) =>
      `<p style="margin:0 0 12px 0;font-size:14px;"><strong>${n}</strong> ${txt}</p>`;

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
    } else if (tipo === "estatistica-aplicada") {
      titulo = "Seu acesso à Estatística Aplicada e Ferramentas da Qualidade está liberado 🚀";
      planoLabel = "Estatística Aplicada e Ferramentas da Qualidade";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso ao curso <strong>Estatística Aplicada e Ferramentas da Qualidade</strong> está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR MEU CURSO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Curso Estatística Aplicada e Ferramentas da Qualidade</strong> — aulas e exercícios para aplicar estatística e ferramentas da qualidade.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📊 <strong>Data Analysis — Análises Diversas e Gráficos</strong> — realize e interprete suas análises estatísticas.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — tire dúvidas sobre o uso e a interpretação das análises.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado</strong> — disponível após cumprir os critérios do curso.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e comece no seu ritmo.</p>`;
    } else if (tipo === "analise-inferencial") {
      titulo = "Seu acesso à Análise Inferencial - Testes de Hipóteses está liberado 🚀";
      planoLabel = "Análise Inferencial - Testes de Hipóteses";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso ao curso <strong>Análise Inferencial - Testes de Hipóteses</strong> está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR MEU CURSO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Curso Análise Inferencial - Testes de Hipóteses</strong> — aulas e exercícios para interpretar e aplicar testes de hipóteses.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📊 <strong>Data Analysis — Análise Inferencial, Gráficos e Análises Diversas</strong> — realize e interprete suas análises estatísticas.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — tire dúvidas sobre o uso e a interpretação das análises.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado</strong> — disponível após cumprir os critérios do curso.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e comece no seu ritmo.</p>`;
    } else if (tipo === "cep") {
      titulo = "Seu acesso ao Controle Estatístico de Processo está liberado 🚀";
      planoLabel = "Controle Estatístico de Processo";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso ao curso <strong>CEP - Controle Estatístico de Processo</strong> está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR MEU CURSO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Curso CEP - Controle Estatístico de Processo</strong> — aulas e exercícios para monitorar e controlar a variabilidade dos processos.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📊 <strong>Data Analysis — Controle de Processo, Gráficos e Análises Diversas</strong> — realize e interprete suas análises estatísticas.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — tire dúvidas sobre o uso e a interpretação das análises.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado</strong> — disponível após cumprir os critérios do curso.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e comece no seu ritmo.</p>`;
    } else if (tipo === "preditiva") {
      titulo = "Seu acesso à Análise Preditiva está liberado 🚀";
      planoLabel = "Análise Preditiva - Regressões, Correlações e Séries Temporais";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso ao curso <strong>Análise Preditiva - Regressões, Correlações e Séries Temporais</strong> está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR MEU CURSO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Curso Análise Preditiva - Regressões, Correlações e Séries Temporais</strong> — aulas e exercícios para analisar relações e fazer previsões com dados.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📊 <strong>Data Analysis — Análise Preditiva, Gráficos e Análises Diversas</strong> — realize e interprete suas análises estatísticas.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — tire dúvidas sobre o uso e a interpretação das análises.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado</strong> — disponível após cumprir os critérios do curso.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e comece no seu ritmo.</p>`;
    } else if (tipo === "msa") {
      titulo = "Seu acesso à Análise do Sistema de Medição está liberado 🚀";
      planoLabel = "MSA - Análise do Sistema de Medição";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso ao curso <strong>MSA - Análise do Sistema de Medição</strong> está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR MEU CURSO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Curso MSA - Análise do Sistema de Medição</strong> — aulas e exercícios para avaliar a confiabilidade dos sistemas de medição.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📊 <strong>Data Analysis — MSA, Gráficos e Análises Diversas</strong> — realize e interprete estudos para dados contínuos e discretos.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — tire dúvidas sobre o uso e a interpretação das análises.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado</strong> — disponível após cumprir os critérios do curso.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e comece no seu ritmo.</p>`;
    } else if (tipo === "software-lbw") {
      // Degrau 2 da escada comercial: cursos + Software LBW. Antes este pacote
      // era só a plataforma; passou a incluir o catálogo inteiro de cursos, e o
      // e-mail acompanha (senão o comprador não saberia que tem os cursos).
      titulo = "Seu acesso à Formação Profissional + Software LBW está liberado 🚀";
      planoLabel = "Formação Profissional + Software LBW";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso à <strong>Formação Profissional + Software LBW</strong> está liberado: todos os cursos mais o ambiente completo de análise.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR MINHA FORMAÇÃO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Todos os cursos da plataforma</strong> — videoaulas, exercícios, avaliações e certificado de conclusão de cada curso.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📊 <strong>Todos os módulos de Data Analysis</strong> — Gráficos, Estatística Básica, Análise Exploratória, Inferencial, MSA, Preditiva, Controle de Processo e Capabilidade.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📁 <strong>Projetos livres</strong> — crie e salve quantos projetos precisar para organizar suas análises.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🖨️ <strong>Relatórios e apresentações PowerPoint</strong> geradas automaticamente a partir das suas análises.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — tire dúvidas sobre o uso e a interpretação das análises.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Este plano não inclui os projetos guiados Yellow, Green e Black Belt — eles fazem parte da Formação Completa.</p>`;
    } else if (tipo === "gate") {
      titulo = "Seu acesso ao curso GATE está liberado 🚀";
      planoLabel = "Como Recomendar Melhorias com Base em Dados - GATE";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso ao curso <strong>Como Recomendar Melhorias com Base em Dados - GATE</strong> está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR MEU CURSO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Curso GATE</strong> — transforme dados em recomendações de melhoria claras e estruturadas.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🛠️ <strong>Projeto e ferramentas associadas</strong> — liberados conforme a configuração atual do curso.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — apoio para aplicar o conteúdo e estruturar suas recomendações.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado</strong> — disponível após cumprir os critérios do curso.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e comece no seu ritmo.</p>`;
    } else if (tipo === "gestao-mudanca") {
      titulo = "Seu acesso ao curso de Gestão de Mudança está liberado 🚀";
      planoLabel = "Como Conduzir Mudanças com Menos Resistência";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso ao curso <strong>Como Conduzir Mudanças com Menos Resistência</strong> está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR MEU CURSO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Curso Como Conduzir Mudanças com Menos Resistência</strong> — aulas e exercícios para estruturar mudanças, engajar as pessoas e reduzir resistências.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🛠️ <strong>Projeto e ferramentas associadas</strong> — disponíveis quando estiverem habilitados na configuração do curso.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — apoio para aplicar o conteúdo e esclarecer dúvidas.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado</strong> — disponível após cumprir os critérios do curso.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e comece no seu ritmo.</p>`;
    } else if (tipo === "gerenciamento-risco") {
      titulo = "Seu acesso ao curso de Gerenciamento de Risco está liberado 🚀";
      planoLabel = "Como Antecipar Riscos Antes que Virem Problemas";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso ao curso <strong>Como Antecipar Riscos Antes que Virem Problemas</strong> está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR MEU CURSO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Curso Como Antecipar Riscos Antes que Virem Problemas</strong> — aulas e exercícios para identificar, avaliar, priorizar e tratar riscos antes que afetem os resultados.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🛠️ <strong>Projeto e ferramentas associadas</strong> — disponíveis quando estiverem habilitados na configuração do curso.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — apoio para aplicar o conteúdo e esclarecer dúvidas.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado</strong> — disponível após cumprir os critérios do curso.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e comece no seu ritmo.</p>`;
    } else if (tipo === "cultura-lean") {
      titulo = "Seu acesso ao curso de Cultura Lean está liberado 🚀";
      planoLabel = "Como Aplicar a Cultura Lean";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso ao curso <strong>Como Aplicar a Cultura Lean</strong> está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR MEU CURSO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Curso Como Aplicar a Cultura Lean</strong> — aulas e exercícios para identificar desperdícios, desenvolver pensamento Lean e sustentar melhorias no trabalho.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🛠️ <strong>Projeto e ferramentas associadas</strong> — disponíveis quando estiverem habilitados na configuração do curso.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — apoio para aplicar o conteúdo e esclarecer dúvidas.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado</strong> — disponível após cumprir os critérios do curso.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e comece no seu ritmo.</p>`;
    } else if (tipo === "plataforma-completa") {
      titulo = "Seu acesso completo à Plataforma LBW está liberado 🚀";
      planoLabel = "Plataforma Profissional em Gestão de Projetos de Melhoria";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso de 12 meses à <strong>Plataforma Profissional em Gestão de Projetos de Melhoria</strong> está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR A PLATAFORMA COMPLETA";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Todos os cursos da Formação Profissional</strong> — videoaulas, exercícios, avaliações e certificados de conclusão.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📊 <strong>Software LBW completo</strong> — todos os módulos de Data Analysis disponíveis.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🛠️ <strong>Todos os projetos e ferramentas</strong> — incluindo os projetos guiados disponíveis na plataforma.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🖨️ <strong>Relatórios e apresentações PowerPoint</strong> gerados a partir das suas análises e projetos.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — apoio no conteúdo, nas análises e nos projetos.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e aproveite todos os recursos disponíveis para o aluno.</p>`;
    } else if (tipo === "lbw-academy") {
      titulo = "Sua Formação Profissional está liberada 🚀";
      planoLabel = "Formação Profissional em Gestão de Projetos de Melhoria";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso de 12 meses à <strong>Formação Profissional em Gestão de Projetos de Melhoria</strong>, com 100% dos cursos disponíveis na aba Educação, está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR TODOS OS CURSOS";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>100% dos cursos disponíveis na aba Educação</strong> — acesso ao catálogo completo da Formação Profissional.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎥 <strong>Videoaulas, exercícios e materiais de apoio</strong> para estudar no seu ritmo.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📝 <strong>Avaliações de aprendizagem</strong> de cada curso configurado.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado para todos os cursos</strong> — disponível após cumprir os critérios de conclusão de cada curso.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> para apoiar seus estudos.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Este pacote não inclui os módulos do Software LBW nem a execução de projetos na aba Projects.</p>`;
    } else if (tipo === "capabilidade") {
      titulo = "Seu acesso à Capabilidade de Processo Avançado está liberado 🚀";
      planoLabel = "Capabilidade de Processo Avançado";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso ao curso <strong>Capabilidade de Processo Avançado</strong> está liberado.`;
      credenciaisHtml = params.contexto === "novo" ? credComSenha : credSemSenha;
      botaoLabel = "ACESSAR MEU CURSO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">O QUE VOCÊ JÁ TEM ACESSO:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🎓 <strong>Curso Capabilidade de Processo Avançado</strong> — aulas e exercícios para aprender a interpretar e gerar a capabilidade do processo.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📊 <strong>Data Analysis — Capabilidade</strong> — use o software estatístico para realizar as análises.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">🤖 <strong>IA digital do Israel</strong> — tire dúvidas sobre o uso e a interpretação das análises.</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado</strong> — disponível após cumprir os critérios do curso.</p>
        ${dashboardBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e comece no seu ritmo.</p>`;
    } else if (tipo === "pago") {
      titulo = "Sua Formação Profissional está liberada 🚀";
      planoLabel = "Formação Profissional em Gestão de Projetos de Melhoria";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Que bom ter você aqui. Seu acesso ao curso <strong>Formação Profissional em Gestão de Projetos de Melhoria</strong> está liberado.`;
      credenciaisHtml = credComSenha;
      botaoLabel = "ACESSAR MINHA FORMAÇÃO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">CURSO LIBERADO:</p>
        ${linha("", trilha8)}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="font-weight:bold;color:#1E2D6E;margin:0 0 12px 0;">E AINDA:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado do curso</strong> — ao concluir o curso e cumprir os critérios, você poderá emitir seu certificado.</p>
        ${dashboardBloco}
        ${mentorBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Acesse a plataforma e comece no seu ritmo.</p>`;
    } else {
      // upgrade
      titulo = "Novo curso liberado na plataforma LBW 🚀";
      planoLabel = "Formação Profissional em Gestão de Projetos de Melhoria";
      introHtml = `Olá <strong>${primeiroNome}</strong>! Seu acesso ao curso <strong>Formação Profissional em Gestão de Projetos de Melhoria</strong> acaba de ser liberado.`;
      credenciaisHtml = credSemSenha;
      botaoLabel = "ENTRAR NA MINHA FORMAÇÃO";
      corpoHtml = `
        <p style="font-weight:bold;color:#1E2D6E;margin:24px 0 12px 0;">NOVO CURSO DISPONÍVEL:</p>
        ${linha("", trilha8)}
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
        <p style="font-weight:bold;color:#1E2D6E;margin:0 0 12px 0;">E AINDA:</p>
        <p style="margin:0 0 12px 0;font-size:14px;">📜 <strong>Certificado do curso</strong> — ao concluir o curso e cumprir os critérios, você poderá emitir seu certificado.</p>
        ${dashboardBloco}
        ${mentorBloco}
        ${comunidadeBloco}
        <p style="margin:18px 0 0 0;font-size:14px;">Entre com sua senha habitual e acesse o novo curso.</p>`;
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

  async function sendAlunoBloqueadoEmail(params: {
    para: string;
    nome?: string;
    consultorNome?: string;
  }): Promise<boolean> {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "465", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromEmail = process.env.SMTP_FROM || user;
    const from = `LBW - Educacao pelo Trabalho <${fromEmail}>`;
    if (!host || !user || !pass) {
      console.warn("[sendAlunoBloqueadoEmail] SMTP nao configurado. Pulando envio.");
      return false;
    }
    const nome = params.nome || params.para.split("@")[0];
    const consultor = params.consultorNome || "seu consultor";
    const linkApp = process.env.APP_URL || "https://app.educacaopelotrabalho.com";
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #2A2F3A;">
        <h2 style="color: #1E2D6E; margin: 0 0 16px 0;">Atualizacao sobre seu acesso</h2>
        <p>Ola ${nome},</p>
        <p>Seu acesso aos conteudos e recursos do ambiente de ${consultor} foi bloqueado.</p>
        <div style="background: #FFF7ED; border-left: 4px solid #F97316; padding: 16px 18px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px;">
            Seus dados, historico e projetos permanecem preservados na plataforma e ficarao disponiveis por ate 3 meses.
          </p>
        </div>
        <p>Se voce acredita que isso aconteceu por engano ou deseja reativar o acesso, fale diretamente com ${consultor}.</p>
        <p style="font-size: 12px; color: #9CA3AF; margin-top: 28px;">
          Plataforma: <a href="${linkApp}" style="color:#0033CC;">${linkApp}</a>
        </p>
      </div>
    `;
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from,
        to: params.para,
        subject: "Atualizacao sobre seu acesso - LBW",
        html,
      });
      return true;
    } catch (err: any) {
      console.error("[sendAlunoBloqueadoEmail] Erro SMTP:", err?.message || err);
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

  async function requireUser(req: any, res: any, next: any) {
    if (!isAdminReady()) {
      return res.status(503).json({ error: "Firebase Admin não configurado no servidor." });
    }
    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Autenticação obrigatória." });
    try {
      const decoded = await adminAuth().verifyIdToken(idToken);
      req.userUid = decoded.uid;
      req.userEmail = (decoded.email || "").toLowerCase();
      next();
    } catch {
      return res.status(401).json({ error: "Token inválido." });
    }
  }

  // Solicitação enviada a partir de qualquer cadeado da plataforma.
  // Registra no Firestore para auditoria e envia a mensagem por e-mail ao consultor do tenant.
  // Gera, somente para o consultor autenticado, um endereço aleatório válido por
  // 30 minutos. O Office Viewer usa esse acesso temporário sem receber a URL do Storage.
  app.post("/api/ppt/modelo-url", requireUser, async (req: any, res: any) => {
    const consultorId = String(req.body?.consultorId || "").trim();
    const arquivo = String(req.body?.arquivo || "");
    const campo = arquivo === "capa.pptx"
      ? "pptCapaUrl"
      : arquivo === "pagina-interna.pptx"
        ? "pptInternaUrl"
        : "";
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/i.test(consultorId) || !campo) {
      return res.status(400).json({ error: "Modelo inválido." });
    }

    try {
      const [usuarioSnap, consultorSnap] = await Promise.all([
        adminFirestore().collection("users").doc(req.userUid).get(),
        adminFirestore().collection("consultores").doc(consultorId).get(),
      ]);
      const usuario = usuarioSnap.data() || {};
      const ADMIN_EMAILS = ["israelnz2018@hotmail.com", "israel@learningbyworking.com"];
      const ids = new Set([
        String((usuario as any).consultorId || ""),
        ...(((usuario as any).consultorIds || []) as unknown[]).map(String),
      ]);
      const autorizado = ADMIN_EMAILS.includes(String(req.userEmail || "")) || ids.has(consultorId);
      if (!autorizado || !consultorSnap.exists) return res.status(403).json({ error: "Acesso negado." });

      const origem = String((consultorSnap.data() as any)?.branding?.[campo] || "");
      if (!/\.pptx(?:\?|$)/i.test(origem)) return res.status(404).json({ error: "PowerPoint não encontrado." });

      const token = crypto.randomBytes(32).toString("hex");
      const tokenId = crypto.createHash("sha256").update(token).digest("hex");
      const expiraEm = Date.now() + 30 * 60 * 1000;
      await adminFirestore().collection("pptPreviewTokens").doc(tokenId).set({
        consultorId, arquivo, origem, expiraEm, criadoPor: req.userUid,
      });
      return res.json({ caminho: `/api/ppt/modelo/${token}/${arquivo}`, expiraEm });
    } catch (erro: any) {
      console.error("[/api/ppt/modelo-url]", erro?.message || erro);
      return res.status(500).json({ error: "Não foi possível preparar a visualização." });
    }
  });

  app.get("/api/ppt/modelo/:token/:arquivo", async (req: any, res: any) => {
    const token = String(req.params.token || "");
    const arquivo = String(req.params.arquivo || "");
    if (!/^[a-f0-9]{64}$/.test(token) || !["capa.pptx", "pagina-interna.pptx"].includes(arquivo) || !isAdminReady()) {
      return res.status(404).end();
    }

    try {
      const tokenId = crypto.createHash("sha256").update(token).digest("hex");
      const tokenSnap = await adminFirestore().collection("pptPreviewTokens").doc(tokenId).get();
      const dados = tokenSnap.data() || {};
      if (!tokenSnap.exists || dados.arquivo !== arquivo || Number(dados.expiraEm || 0) < Date.now()) {
        return res.status(404).end();
      }
      const resposta = await fetch(String(dados.origem || ""), { signal: AbortSignal.timeout(30_000) });
      if (!resposta.ok) return res.status(404).end();
      const arquivoPpt = Buffer.from(await resposta.arrayBuffer());
      res.setHeader("content-type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      res.setHeader("content-disposition", `inline; filename="${arquivo}"`);
      res.setHeader("content-length", String(arquivoPpt.length));
      res.setHeader("cache-control", "private, no-store");
      return res.send(arquivoPpt);
    } catch (erro: any) {
      console.error("[/api/ppt/modelo]", erro?.message || erro);
      return res.status(404).end();
    }
  });

  app.post('/api/solicitacoes/acesso', requireUser, async (req: any, res) => {
    const consultorId = String(req.body?.consultorId || '').trim();
    const mensagem = String(req.body?.mensagem || '').trim();
    const recurso = String(req.body?.recurso || '').trim().slice(0, 200);
    const pagina = String(req.body?.pagina || '').trim().slice(0, 300);
    if (!consultorId || mensagem.length < 5 || mensagem.length > 1000) {
      return res.status(400).json({ error: 'Escreva uma mensagem entre 5 e 1000 caracteres.' });
    }

    const escaparHtml = (valor: unknown) => String(valor || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    try {
      const [usuarioSnap, consultorSnap] = await Promise.all([
        adminFirestore().collection('users').doc(req.userUid).get(),
        adminFirestore().collection('consultores').doc(consultorId).get(),
      ]);
      if (!consultorSnap.exists) return res.status(404).json({ error: 'Consultor não encontrado.' });

      const usuario = usuarioSnap.data() || {};
      const consultor = consultorSnap.data() || {};
      const emailConsultor = String(consultor.email || '').trim();
      if (!emailConsultor) return res.status(409).json({ error: 'O e-mail do consultor ainda não está configurado.' });

      const nomeUsuario = String(usuario.nome || usuario.displayName || req.userEmail || 'Usuário');
      const nomeConsultor = String(consultor.nome || consultor.branding?.nome || 'Consultor');
      const criadoEm = new Date().toISOString();
      const solicitacaoRef = await adminFirestore().collection('solicitacoes_acesso').add({
        consultorId,
        consultorEmail: emailConsultor,
        solicitanteUid: req.userUid,
        solicitanteNome: nomeUsuario,
        solicitanteEmail: req.userEmail || '',
        mensagem,
        recurso,
        pagina,
        status: 'pendente_envio',
        criadoEm,
      });

      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '465', 10);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const fromEmail = process.env.SMTP_FROM || user;
      if (!host || !user || !pass || !fromEmail) {
        await solicitacaoRef.update({ status: 'erro_email', erro: 'SMTP não configurado' });
        return res.status(503).json({ error: 'O envio de mensagens ainda não está configurado.' });
      }

      const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#1f2937">
          <h2 style="color:#1E2D6E;margin-bottom:8px">Nova solicitação de acesso</h2>
          <p>Olá, <strong>${escaparHtml(nomeConsultor)}</strong>.</p>
          <p><strong>${escaparHtml(nomeUsuario)}</strong> (${escaparHtml(req.userEmail)}) enviou uma solicitação pela plataforma.</p>
          ${recurso ? `<p><strong>Conteúdo solicitado:</strong> ${escaparHtml(recurso)}</p>` : ''}
          <div style="margin:20px 0;padding:16px;border-left:4px solid #0033CC;background:#f3f6ff;white-space:pre-wrap">${escaparHtml(mensagem)}</div>
          ${pagina ? `<p style="font-size:12px;color:#6b7280"><strong>Tela:</strong> ${escaparHtml(pagina)}</p>` : ''}
          <p style="font-size:12px;color:#9ca3af">Solicitação registrada em ${escaparHtml(criadoEm)}.</p>
        </div>`;
      await transporter.sendMail({
        from: `LBW - Educação pelo Trabalho <${fromEmail}>`,
        to: emailConsultor,
        replyTo: req.userEmail || undefined,
        subject: `Solicitação de acesso de ${nomeUsuario}`,
        html,
      });
      await solicitacaoRef.update({ status: 'enviado', enviadoEm: new Date().toISOString() });
      return res.json({ ok: true });
    } catch (error: any) {
      console.error('[/api/solicitacoes/acesso]', error?.message || error);
      return res.status(500).json({ error: 'Não foi possível enviar a solicitação agora.' });
    }
  });

  // Gera um slide em cima do PPTX real do consultor. O arquivo do modelo nunca
  // é devolvido nem escolhido pelo cliente: ele vem do tenant do usuário autenticado.
  app.post(["/api/ppt/gerar-ferramenta", "/api/ppt/gerar-apresentacao"], requireUser, async (req: any, res: any) => {
    const jobs = Array.isArray(req.body?.jobs) ? req.body.jobs : [{
      toolId: req.body?.toolId, localData: req.body?.localData, aiAnalysis: req.body?.aiAnalysis, options: req.body?.options,
    }];
    if (!jobs.length || jobs.some((job: any) => !TOOL_HANDLERS[String(job?.toolId || "")])) {
      return res.status(400).json({ error: "Uma das ferramentas não possui exportador PowerPoint." });
    }
    try {
      const userSnap = await adminFirestore().collection("users").doc(req.userUid).get();
      const consultorId = String(userSnap.data()?.consultorId || "israel");
      const consultorSnap = await adminFirestore().collection("consultores").doc(consultorId).get();
      const branding = (consultorSnap.data() as any)?.branding || {};
      const capaUrl = String(branding.pptCapaUrl || "");
      const internaUrl = String(branding.pptInternaUrl || "");
      if (!/\.pptx(?:\?|$)/i.test(capaUrl) || !/\.pptx(?:\?|$)/i.test(internaUrl)) {
        return res.status(409).json({ error: "Este consultor ainda não enviou os dois modelos PPTX." });
      }

      const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "lbw-ppt-"));
      try {
        const [capaResp, internaResp] = await Promise.all([fetch(capaUrl), fetch(internaUrl)]);
        if (!capaResp.ok || !internaResp.ok) throw new Error("Não foi possível baixar o modelo PowerPoint.");
        await Promise.all([
          fs.writeFile(path.join(workDir, "capa.pptx"), Buffer.from(await capaResp.arrayBuffer())),
          fs.writeFile(path.join(workDir, "interna.pptx"), Buffer.from(await internaResp.arrayBuffer())),
        ]);

        const automizer = new Automizer({
          templateDir: workDir, outputDir: workDir, removeExistingSlides: true,
          autoImportSlideMasters: true, cleanup: true, compression: 0, verbosity: 0,
        });
        const pres: any = automizer.loadRoot("capa.pptx").load("capa.pptx", "capa").load("interna.pptx", "interna");
        const project = req.body?.project || {};
        const userName = String(userSnap.data()?.nome || req.userEmail || "");
        setPptTemplateMode(true);
        pres.addSlide("capa", 1, (slide: any) => slide.generate((pptSlide: any) => {
          addCoverSlide(({ addSlide: () => pptSlide } as any), project, userName);
        }));
        for (const job of jobs) {
          const handler = TOOL_HANDLERS[String(job.toolId)];
          pres.addSlide("interna", 1, (slide: any) => slide.generate((pptSlide: any) => {
            const fakePresentation = { addSlide: () => pptSlide } as any;
            // Os exporters são síncronos até o writeFile (que não ocorre ao passar pres).
            void handler.exporter(project, job.localData || {}, String(job.aiAnalysis || ""), {
              ...(job.options || {}), pres: fakePresentation,
            });
          }));
        }
        const name = `${jobs.length > 1 ? "Apresentacao_Final" : "Ferramenta"}_${Date.now()}.pptx`;
        await pres.write(name);
        const arquivo = await fs.readFile(path.join(workDir, name));
        res.setHeader("content-type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
        res.setHeader("content-disposition", `attachment; filename=\"${name}\"`);
        return res.send(arquivo);
      } finally {
        setPptTemplateMode(false);
        await fs.rm(workDir, { recursive: true, force: true });
      }
    } catch (err: any) {
      console.error("[/api/ppt/gerar-ferramenta]", err);
      return res.status(500).json({ error: err?.message || "Erro ao montar o PowerPoint." });
    }
  });

  function generateCertId(): string {
    const year = new Date().getFullYear();
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let suffix = "";
    for (let i = 0; i < 6; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    return `LBW-${year}-${suffix}`;
  }

  function certificateMissingItems(config: any, consultorId: string, initiativeId: string): string[] {
    const temFundoPadrao = consultorId === "israel" && !config?.fundoUrl;
    const faltando: string[] = [];
    if (!config?.fundoUrl && !temFundoPadrao) faltando.push("fundo do certificado");
    if (!config?.assinaturaUrl && !temFundoPadrao) faltando.push("assinatura");
    if (!String(config?.instituicao || "").trim()) faltando.push("instituicao");
    if (!String(config?.titulo || "").trim()) faltando.push("titulo");
    if (!String(config?.textoCertificamos || "").trim()) faltando.push("texto antes do nome");
    if (!String(config?.textoConclusao || "").trim()) faltando.push("texto antes do curso");
    if (!String(config?.textoAprovacao || "").trim()) faltando.push("texto de aprovacao");
    if (!String(config?.emissorNome || "").trim()) faltando.push("nome de quem assina");
    if (!String(config?.emissorCargo || "").trim()) faltando.push("cargo/profissao");
    if (!Number(config?.cursos?.[initiativeId]?.cargaHoraria)) faltando.push("carga horaria do curso");
    return faltando;
  }

  function normalizeSourceUrl(video: any): string {
    return String(video?.sourceUrl || video?.bunnyVideoId || video?.id || "");
  }

  async function issueCertificateForUser(uid: string, initiativeId: string): Promise<{ issued: boolean; certId?: string; already?: boolean }> {
    const [userSnap, initiativeSnap, progressSnap, videosSnap] = await Promise.all([
      adminFirestore().collection("users").doc(uid).get(),
      adminFirestore().collection("initiatives").doc(initiativeId).get(),
      adminFirestore().collection("userProgress").doc(uid).get(),
      adminFirestore().collection("knowledge_base").get(),
    ]);

    if (!userSnap.exists) throw new Error("Usuário não encontrado.");
    if (!initiativeSnap.exists) throw new Error("Curso/trilha não encontrado.");

    const user = userSnap.data() as any;
    const initiative = { id: initiativeSnap.id, ...(initiativeSnap.data() as any) };
    const consultorId = String(initiative.consultorId || user.consultorId || "israel");
    const temVinculoNoConsultor = String(user.consultorId || "") === consultorId || !!user.vinculos?.[consultorId];
    if (!temVinculoNoConsultor) throw new Error("Esta trilha não pertence ao consultor do usuário.");
    const userNoConsultor = { ...user, ...(user.vinculos?.[consultorId] || {}), consultorId };

    const progress = progressSnap.exists
      ? (progressSnap.data() as any)
      : { uid, watchedUrls: {}, certificadosEmitidos: {}, lastUpdated: new Date().toISOString() };
    if (progress.certificadosEmitidos?.[initiativeId]) {
      return { issued: false, already: true, certId: progress.certificadosEmitidos[initiativeId].certId };
    }

    const videos = videosSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .filter((v) => String(v.consultorId || "israel") === consultorId && String(v.course || "") === String(initiative.name || ""));
    const uniqueUrls = Array.from(new Set(videos.map(normalizeSourceUrl).filter(Boolean)));
    const watchedUrls = progress.watchedUrls || {};
    const watched = uniqueUrls.filter((url) => watchedUrls[url]);
    const pct = uniqueUrls.length === 0 ? 0 : watched.length / uniqueUrls.length;
    if (uniqueUrls.length === 0 || pct < 0.70) return { issued: false };

    const quiz = await loadQuizForInitiative(initiative, consultorId);
    const quizQuestions = Array.isArray(quiz?.questions) ? quiz.questions : [];
    if (!quiz || quizQuestions.length === 0) return { issued: false };

    const attemptsSnap = await adminFirestore().collection("quiz_attempts")
      .where("uid", "==", uid)
      .get();
    const passouNaProva = attemptsSnap.docs.some((entry) => {
      const attempt = entry.data() as any;
      return attempt.passed === true
        && String(attempt.consultorId || "israel") === consultorId
        && (String(quiz.initiativeId || "") === initiativeId
          ? (String(attempt.initiativeId || "") === initiativeId || (!attempt.initiativeId && Number(attempt.trilha) === Number(quiz.trilha)))
          : Number(attempt.trilha) === Number(quiz.trilha));
    });
    if (!passouNaProva) return { issued: false };

    const consultorSnap = await adminFirestore().collection("consultores").doc(consultorId).get();
    const consultorData = consultorSnap.exists ? (consultorSnap.data() as any) : {};
    const depoimentoAtivo = consultorData.depoimentoPosProvaAtivo
      ?? consultorData.depoimentoPreProvaAtivo !== false;
    if (depoimentoAtivo) {
      const opinioesSnap = await adminFirestore().collection("opiniaoClientes")
        .where("uid", "==", uid)
        .get();
      const temDepoimento = opinioesSnap.docs.some((entry) => {
        const opiniao = entry.data() as any;
        return (String(opiniao.initiativeId || "") === initiativeId
          || (!opiniao.initiativeId && Number(opiniao.trilha) === Number(quiz.trilha)))
          && (!opiniao.consultorId || String(opiniao.consultorId) === consultorId)
          && String(opiniao.comentario || "").trim().length > 0;
      });
      if (!temDepoimento) return { issued: false };
    }

    if (userNoConsultor.empresaId) {
      const repasseSnap = await adminFirestore().collection("repasses").doc(String(userNoConsultor.empresaId)).get();
      if (repasseSnap.exists && (repasseSnap.data() as any).certificadoLiberado !== true) {
        return { issued: false };
      }
    }

    const certId = generateCertId();
    const issuedAt = new Date().toISOString();
    const alunoNome = String(user.nome || user.displayName || user.email?.split("@")[0] || "Aluno LBW");
    const certificadoConfig = (consultorSnap.data() as any)?.certificado || {};
    const pendenciasCertificado = certificateMissingItems(certificadoConfig, consultorId, initiativeId);
    if (pendenciasCertificado.length) {
      throw new Error(`Certificado ainda nao liberado pelo consultor. Falta: ${pendenciasCertificado.join(", ")}.`);
    }
    const templateVersion = Number(certificadoConfig?.versao || 0) || undefined;
    const certificado = {
      issuedAt,
      pctAtIssue: pct,
      initiativeNameAtIssue: String(initiative.name || ""),
      certId,
      alunoNomeAtIssue: alunoNome,
      consultorId,
      ...(templateVersion ? { templateVersion } : {}),
    };
    const updated = {
      ...progress,
      uid,
      certificadosEmitidos: {
        ...(progress.certificadosEmitidos || {}),
        [initiativeId]: certificado,
      },
      lastUpdated: issuedAt,
    };
    await Promise.all([
      adminFirestore().collection("userProgress").doc(uid).set(updated, { merge: false }),
      adminFirestore().collection("certificadosPublicos").doc(certId).set({
        certId,
        alunoNome,
        initiativeName: String(initiative.name || ""),
        issuedAt,
        consultorId,
        uid,
        initiativeId,
      }),
    ]);
    return { issued: true, certId };
  }

  app.post("/api/certificados/emitir", requireUser, async (req: any, res) => {
    try {
      const initiativeId = String(req.body?.initiativeId || "").trim();
      if (!initiativeId) return res.status(400).json({ error: "initiativeId obrigatório." });
      const result = await issueCertificateForUser(req.userUid, initiativeId);
      return res.json({ ok: true, ...result });
    } catch (err: any) {
      console.error("[POST /api/certificados/emitir] erro:", err);
      return res.status(400).json({ error: err?.message || "Erro ao emitir certificado." });
    }
  });

  function scopedQuizId(consultorId: string, trilha: number): string {
    return `${consultorId}__${trilha}`;
  }

  async function loadQuizForServer(trilha: number, consultorId: string): Promise<any | null> {
    const scoped = await adminFirestore().collection("quizzes").doc(scopedQuizId(consultorId, trilha)).get();
    if (scoped.exists) return { ...scoped.data(), trilha, consultorId };
    if (consultorId === "israel") {
      const legacy = await adminFirestore().collection("quizzes").doc(String(trilha)).get();
      if (legacy.exists) return { ...legacy.data(), trilha, consultorId };
    }
    const seed = (DEFAULT_QUIZZES as any)[trilha];
    return seed ? { ...seed, consultorId } : null;
  }

  async function loadQuizForInitiative(initiative: any, consultorId: string): Promise<any | null> {
    const byInitiative = await adminFirestore().collection("quizzes")
      .where("initiativeId", "==", String(initiative.id))
      .get();
    const exact = byInitiative.docs.find((entry) => {
      const data = entry.data() as any;
      return String(data.consultorId || consultorId) === consultorId;
    });
    if (exact) {
      const data = exact.data() as any;
      return { ...data, trilha: Number(data.trilha) || Number(initiative.ordem) || 0, consultorId };
    }

    const trilha = Number(initiative.ordem) || 0;
    return trilha > 0 ? loadQuizForServer(trilha, consultorId) : null;
  }

  function publicQuizPayload(quiz: any) {
    return {
      trilha: Number(quiz.trilha) || 0,
      initiativeId: quiz.initiativeId ? String(quiz.initiativeId) : undefined,
      titulo: String(quiz.titulo || `Trilha ${quiz.trilha || ""}`),
      passPct: typeof quiz.passPct === "number" ? quiz.passPct : 0.7,
      watchGatePct: typeof quiz.watchGatePct === "number" ? quiz.watchGatePct : 0.7,
      consultorId: String(quiz.consultorId || "israel"),
      updatedAt: quiz.updatedAt || null,
      questions: Array.isArray(quiz.questions)
        ? quiz.questions.map((q: any) => ({
            id: String(q.id || ""),
            text: String(q.text || ""),
            options: Array.isArray(q.options) ? q.options.map((o: any) => String(o)) : [],
          }))
        : [],
    };
  }

  app.get("/api/quizzes/list", requireUser, async (req: any, res) => {
    try {
      const userSnap = await adminFirestore().collection("users").doc(req.userUid).get();
      const user = userSnap.exists ? (userSnap.data() as any) : {};
      const requested = String(req.query?.consultorId || user.consultorId || "israel");
      const consultorId = user.tipoUsuario === "admin"
        ? requested
        : (user.vinculos?.[requested] ? requested : String(user.consultorId || requested));
      const quizzes = [];
      for (let trilha = 1; trilha <= MAX_QUIZ_TRILHAS; trilha++) {
        const quiz = await loadQuizForServer(trilha, consultorId);
        if (quiz) quizzes.push(publicQuizPayload(quiz));
      }
      return res.json({ ok: true, quizzes });
    } catch (err: any) {
      console.error("[GET /api/quizzes/list] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao carregar provas." });
    }
  });

  app.post("/api/quizzes/grade", requireUser, async (req: any, res) => {
    try {
      const trilha = Number(req.body?.trilha) || 0;
      if (trilha < 1 || trilha > MAX_QUIZ_TRILHAS) return res.status(400).json({ error: "Trilha inválida." });
      const userSnap = await adminFirestore().collection("users").doc(req.userUid).get();
      const user = userSnap.exists ? (userSnap.data() as any) : {};
      const requested = String(req.body?.consultorId || user.consultorId || "israel");
      const consultorId = user.vinculos?.[requested] ? requested : String(user.consultorId || requested);
      const quiz = await loadQuizForServer(trilha, consultorId);
      if (!quiz) return res.status(404).json({ error: "Prova não encontrada." });

      const tentativaJanelaMs = 24 * 60 * 60 * 1000;
      const maxTentativasJanela = 3;
      const desde = Date.now() - tentativaJanelaMs;
      const tentativasSnap = await adminFirestore()
        .collection("quiz_attempts")
        .where("uid", "==", req.userUid)
        .get();
      const tentativasRecentes = tentativasSnap.docs
        .map((d) => d.data() as any)
        .filter((a) =>
          Number(a.trilha) === trilha &&
          String(a.consultorId || "israel") === consultorId &&
          Date.parse(String(a.createdAt || "")) >= desde
        );
      if (tentativasRecentes.length >= maxTentativasJanela) {
        return res.status(429).json({
          error: "Limite de tentativas atingido. Tente novamente em 24 horas.",
          attemptsUsed: tentativasRecentes.length,
          maxAttempts: maxTentativasJanela,
        });
      }

      const answers = req.body?.answers && typeof req.body.answers === "object" ? req.body.answers : {};
      const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
      let correct = 0;
      const perQuestion = questions.map((q: any) => {
        const chosenText = String(answers[String(q.id)] ?? "");
        const correctText = String((q.options || [])[Number(q.correctIndex)] ?? "");
        const ok = !!chosenText && chosenText === correctText;
        if (ok) correct++;
        return { id: String(q.id || ""), correct: ok, chosenText };
      });
      const total = questions.length;
      const pct = total === 0 ? 0 : correct / total;
      const passPct = typeof quiz.passPct === "number" ? quiz.passPct : 0.7;
      const passed = pct >= passPct;
      await adminFirestore().collection("quiz_attempts").add({
        uid: req.userUid,
        email: req.userEmail || user.email || "",
        consultorId,
        trilha,
        initiativeId: quiz.initiativeId || null,
        total,
        correct,
        pct,
        passed,
        createdAt: new Date().toISOString(),
      });
      return res.json({ ok: true, total, correct, pct, passed, perQuestion });
    } catch (err: any) {
      console.error("[POST /api/quizzes/grade] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao corrigir prova." });
    }
  });

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
    if (tipo === "coordenador" && empresaId && await empresaIdJaUsadoPorOutroCoordenador(empresaId)) {
      return res.status(409).json({ error: `empresaId "${empresaId}" já pertence a outro coordenador. Escolha outro identificador.` });
    }
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
      if (firestoreUpdate.empresaId !== undefined) {
        const atualSnap = await adminFirestore().collection("users").doc(uid).get();
        const tipoAtual = firestoreUpdate.tipoUsuario ?? (atualSnap.exists ? (atualSnap.data() as any).tipoUsuario : undefined);
        if (tipoAtual === "coordenador" && await empresaIdJaUsadoPorOutroCoordenador(firestoreUpdate.empresaId, uid)) {
          return res.status(409).json({ error: `empresaId "${firestoreUpdate.empresaId}" já pertence a outro coordenador. Escolha outro identificador.` });
        }
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

  function payloadReativacaoIsrael(base: any) {
    const consultorId = "israel";
    const patchAcesso = {
      plano: "completo",
      acessoCompletoAte: REATIVACAO_ATE,
      origemAcesso: "convite-reativacao",
      formacoes: Array.isArray(base.formacoes) && base.formacoes.length > 0 ? base.formacoes : ["projetos-melhoria-introdutoria"],
    };
    const vinculos = { ...(base.vinculos || {}) };
    if (base.consultorId && !vinculos[base.consultorId]) {
      vinculos[base.consultorId] = {
        tipoUsuario: base.tipoUsuario || "aluno", consultorId: base.consultorId,
        empresaId: base.empresaId || null, empresaNome: base.empresaNome || null,
        plano: base.plano || "gratuito", formacoes: base.formacoes || [],
        cursosAcesso: base.cursosAcesso || [], acessoCompletoAte: base.acessoCompletoAte || null,
      };
    }
    const papelIsrael = vinculos[consultorId]?.tipoUsuario
      || (String(base.consultorId || "") === consultorId ? base.tipoUsuario : "aluno");
    vinculos[consultorId] = {
      ...(vinculos[consultorId] || {}), ...patchAcesso,
      tipoUsuario: papelIsrael === "consultor" || papelIsrael === "coordenador" ? papelIsrael : "aluno",
      consultorId,
    };
    const consultorIds = Array.from(new Set([...(Array.isArray(base.consultorIds) ? base.consultorIds : []), base.consultorId, consultorId].filter(Boolean)));
    const principalEhIsrael = !base.consultorId || String(base.consultorId) === consultorId;
    return {
      consultorIds, vinculos,
      ...(principalEhIsrael ? { ...patchAcesso, consultorId } : {}),
    };
  }

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
      // Cada conta nova recebe senha temporária própria. Contas existentes mantêm a senha atual.
      const credenciais: { email: string; senha: string; status: string }[] = [];
      let criados = 0, atualizados = 0, falhas = 0;
      for (const email of unicos) {
        const senha = gerarSenhaProvisoria();
        try {
          let uid: string, novo = false;
          try { uid = (await adminAuth().getUserByEmail(email)).uid; }
          catch { uid = (await adminAuth().createUser({ email, password: senha })).uid; novo = true; }
          const ref = adminFirestore().collection("users").doc(uid);
          const snap = await ref.get();
          const base = snap.exists ? (snap.data() as any) : {};
          await ref.set({
            uid, email,
            nome: base.nome || "",
            tipoUsuario: base.tipoUsuario === "admin" || base.tipoUsuario === "coordenador" || base.tipoUsuario === "consultor" ? base.tipoUsuario : "aluno",
            ...payloadReativacaoIsrael(base),
            creditoIA: base.creditoIA || { limite: 100, usado: 0, resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() },
            criadoEm: base.criadoEm || new Date().toISOString(),
            ...(novo ? { senhaProvisoria: true } : {}),
          }, { merge: true });
          credenciais.push({ email, senha: novo ? senha : "", status: novo ? "criado" : "atualizado-sem-alterar-senha" });
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
  // se já existir. Só conta nova recebe senha provisória e troca obrigatória.
  // Usado no painel de Marketing pra quem procura pelo LinkedIn.
  app.post("/api/reativacao/criar-um", requireAdmin, async (req: any, res) => {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const nome = String(req.body?.nome || "").trim();
    if (!email || email.indexOf("@") < 0) {
      return res.status(400).json({ error: "E-mail inválido." });
    }
    const senhaProvisoria = gerarSenhaProvisoria();
    try {
      // 1) Cria no Auth se não existir; conta existente mantém a própria senha.
      let uid: string, novo = false;
      try {
        uid = (await adminAuth().getUserByEmail(email)).uid;
        if (nome) await adminAuth().updateUser(uid, { displayName: nome });
      } catch {
        uid = (await adminAuth().createUser({ email, password: senhaProvisoria, ...(nome ? { displayName: nome } : {}) })).uid;
        novo = true;
      }
      // 2) Cria/atualiza o vínculo de Israel: completo + validade até 31/12.
      const ref = adminFirestore().collection("users").doc(uid);
      const snap = await ref.get();
      const base = snap.exists ? (snap.data() as any) : {};
      await ref.set({
        uid, email,
        nome: nome || base.nome || "",
        tipoUsuario: base.tipoUsuario === "admin" || base.tipoUsuario === "coordenador" || base.tipoUsuario === "consultor" ? base.tipoUsuario : "aluno",
        ...payloadReativacaoIsrael(base),
        creditoIA: base.creditoIA || { limite: 100, usado: 0, resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() },
        criadoEm: base.criadoEm || new Date().toISOString(),
        ...(novo ? { senhaProvisoria: true } : {}),
      }, { merge: true });
      // 3) Envia o MESMO e-mail de cortesia usado na campanha (via Resend) —
      // "Seu acesso gratuito à plataforma LBW — meu presente para você 🎁".
      let emailEnviado = false;
      try {
        if (novo) {
          const r = await resendSend({ to: email, subject: CAMPANHA_ASSUNTO, html: campanhaCortesiaHtml(email, senhaProvisoria) });
          emailEnviado = r.ok;
        } else {
          emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "completo", contexto: "existente" });
        }
      } catch (e) {
        console.error("[reativacao/criar-um] falha no envio Resend:", e);
      }
      console.log(`[reativacao/criar-um] ${novo ? "CRIADO" : "ATUALIZADO"} ${email} email=${emailEnviado}`);
      return res.json({ ok: true, status: novo ? "criado" : "atualizado-sem-alterar-senha", email, senha: novo ? senhaProvisoria : "", emailEnviado, acessoAte: REATIVACAO_ATE });
    } catch (err: any) {
      console.error("[POST /api/reativacao/criar-um] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao conceder acesso." });
    }
  });

  // ===== Bunny Stream (multi-tenant: 1 Video Library por consultor) =====
  const BUNNY_ACCOUNT_API_KEY = process.env.BUNNY_ACCOUNT_API_KEY;
  async function bunnyCreateLibrary(name: string): Promise<{ libraryId: string; apiKey: string } | null> {
    if (!BUNNY_ACCOUNT_API_KEY) return null; // sem chave de conta → onboarding não cria (setup manual)
    const r = await fetch("https://api.bunny.net/videolibrary", {
      method: "POST",
      headers: { AccessKey: BUNNY_ACCOUNT_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ Name: name }),
    });
    if (!r.ok) throw new Error(`Bunny createLibrary ${r.status}`);
    const j: any = await r.json();
    return { libraryId: String(j.Id), apiKey: String(j.ApiKey) };
  }
  // Library do consultor (coleção PRIVADA bunny_libraries/{id}; o consultor #0 'israel' cai no env).
  async function bunnyLibraryDoConsultor(consultorId: string): Promise<{ libraryId: string; apiKey: string } | null> {
    try {
      const snap = await adminFirestore().collection("bunny_libraries").doc(consultorId).get();
      if (snap.exists) { const d = snap.data() as any; if (d?.libraryId && d?.apiKey) return { libraryId: String(d.libraryId), apiKey: String(d.apiKey) }; }
    } catch { /* ignore */ }
    if (consultorId === "israel" && process.env.BUNNY_LIBRARY_ID && process.env.BUNNY_STREAM_API_KEY) {
      return { libraryId: String(process.env.BUNNY_LIBRARY_ID), apiKey: String(process.env.BUNNY_STREAM_API_KEY) };
    }
    return null;
  }

  // Hostname do CDN (Pull Zone) da library — precisa da chave de CONTA (Bunny Account API),
  // diferente da chave de STREAM (por library). Usado só pra montar a URL da thumbnail.
  // Sem BUNNY_ACCOUNT_API_KEY configurada, thumbnail fica desabilitada (não quebra o resto).
  const bunnyLibraryHostnameCache = new Map<string, string>();
  async function getBunnyLibraryHostname(libraryId: string): Promise<string | null> {
    const accountKey = process.env.BUNNY_ACCOUNT_API_KEY;
    if (!accountKey) return null;
    if (bunnyLibraryHostnameCache.has(libraryId)) return bunnyLibraryHostnameCache.get(libraryId)!;
    try {
      const r = await fetch(`https://api.bunny.net/videolibrary/${libraryId}`, {
        headers: { AccessKey: accountKey, Accept: "application/json" },
      });
      if (!r.ok) return null;
      const body = await r.json() as any;
      const hostname = String(body?.Hostnames?.[0]?.Value || body?.PullZoneHostname || "") || null;
      if (hostname) bunnyLibraryHostnameCache.set(libraryId, hostname);
      return hostname;
    } catch {
      return null;
    }
  }

  // POST /api/bunny/create-video — cria o vídeo na library DO CONSULTOR e devolve a
  // assinatura pro upload DIRETO (TUS) do navegador pro Bunny. A chave nunca vai ao cliente.
  app.post("/api/bunny/create-video", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });
    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Autenticação obrigatória." });
    let callerUid: string;
    try { callerUid = (await adminAuth().verifyIdToken(idToken)).uid; }
    catch { return res.status(401).json({ error: "Token inválido." }); }
    const callerSnap = await adminFirestore().collection("users").doc(callerUid).get();
    const caller = callerSnap.exists ? (callerSnap.data() as any) : {};
    const ADMIN_EMAILS = ["israelnz2018@hotmail.com", "israel@learningbyworking.com"];
    const ehAdmin = ADMIN_EMAILS.includes((caller.email || "").toLowerCase());
    if (caller.tipoUsuario !== "consultor" && !ehAdmin) return res.status(403).json({ error: "Só consultor ou admin." });
    const consultorId = String(caller.consultorId || "israel");
    const lib = await bunnyLibraryDoConsultor(consultorId);
    if (!lib) return res.status(503).json({ error: "Biblioteca Bunny do consultor não configurada." });
    const title = String(req.body?.title || "Sem título").slice(0, 200);
    try {
      const r = await fetch(`https://video.bunnycdn.com/library/${lib.libraryId}/videos`, {
        method: "POST", headers: { AccessKey: lib.apiKey, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!r.ok) {
        const detail = (await r.text()).slice(0, 500);
        console.error(`[Bunny create-video] HTTP ${r.status} library=${lib.libraryId}: ${detail}`);
        const error = r.status === 401
          ? "A API Key da Video Library do Bunny foi rejeitada. Atualize BUNNY_STREAM_API_KEY no servidor."
          : r.status === 403
            ? "A API Key do Bunny não tem permissão para criar vídeos nesta Video Library."
            : r.status === 404
              ? "A Video Library configurada não foi encontrada no Bunny. Confira BUNNY_LIBRARY_ID."
              : `Bunny recusou a criação do vídeo (HTTP ${r.status}).`;
        return res.status(502).json({ error });
      }
      const video = (await r.json()) as any;
      const guid = String(video?.guid || "").trim();
      if (!guid) {
        console.error(`[Bunny create-video] resposta sem guid library=${lib.libraryId}`);
        return res.status(502).json({ error: "O Bunny não devolveu o identificador do vídeo." });
      }
      // Arquivos grandes podem levar mais de uma hora. A assinatura TUS fica
      // válida por 24h, sem expor a chave da library ao navegador.
      const expiration = Math.floor(Date.now() / 1000) + 86400;
      const { createHash } = await import("crypto");
      const signature = createHash("sha256").update(lib.libraryId + lib.apiKey + expiration + guid).digest("hex");
      return res.json({ guid, libraryId: lib.libraryId, signature, expiration });
    } catch (e: any) { return res.status(500).json({ error: e?.message || "Erro Bunny" }); }
  });

  // Gera índice (capítulos) + resumo a partir de uma transcrição, via Gemini — SEMPRE
  // no servidor (a chave nunca vai ao navegador). Usado pelo transcribe-video e pelo
  // endpoint dedicado /api/gerar-indice (reprocessamento manual/em lote no cliente).
  async function gerarIndicePorIA(rawTranscript: string): Promise<{ summary: any[]; transcript: string }> {
    const settingsSnap = await adminFirestore().collection("app_config").doc("api_settings").get();
    const settings = settingsSnap.exists ? settingsSnap.data() as any : {};
    const geminiKey = process.env.GEMINI_API_KEY || settings?.gemini?.apiKey;
    const geminiModel = settings?.gemini?.model || "gemini-2.5-flash";
    if (!geminiKey) throw new Error("Gemini API key não configurada para gerar o índice.");
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const prompt = `TRANSCRIÇÃO COMPLETA (com tempos):\n${rawTranscript}\n\n` +
      `Crie um ÍNDICE DE CAPÍTULOS no estilo YouTube (aquele que aparece embaixo do vídeo) e um resumo detalhado à parte.\n\n` +
      `Regras do índice — cada "topic" é um TÍTULO DE CAPÍTULO, não um resumo do que foi dito:\n` +
      `- Máximo 6 palavras / 40 caracteres.\n` +
      `- Substantivo ou frase nominal curta (ex: "Cálculo do DPMO", "Exemplo no Minitab"), NUNCA uma frase completa narrando a fala.\n` +
      `- Sempre em português, mesmo que a transcrição tenha termos em inglês.\n` +
      `- Sem verbos conjugados narrando terceira pessoa (proibido: "O palestrante explica...", "É demonstrado que...").\n` +
      `- Espaçamento mínimo de 90 segundos entre um capítulo e o seguinte — nunca dois capítulos\n` +
      `  a menos de 90s um do outro. Alvo aproximado: 1 capítulo a cada 2 minutos de vídeo.\n` +
      `- Um capítulo marca uma virada REAL de assunto (um bloco temático novo), não cada micro-passo\n` +
      `  de uma explicação (ex: "agora eu clico aqui", "agora calculo isso" são o MESMO capítulo).\n\n` +
      `O resumo detalhado ("transcript") é o único lugar com texto mais longo, e fica separado do índice.\n\n` +
      `Retorne APENAS JSON neste formato: {"summary":[{"time":"MM:SS","topic":"título curto"}],"transcript":"resumo detalhado com tempos"}. Use somente a transcrição.`;
    // responseSchema força decodificação restrita a essa estrutura — o modelo não
    // consegue gerar JSON sintaticamente inválido (aspas soltas, chave faltando etc.),
    // que era a causa real do "Expected ',' or '}' after property value": o resumo
    // detalhado é texto livre e longo, e no modo só-prompt o Gemini ocasionalmente
    // devolvia uma aspas do que foi falado sem escapar, quebrando o JSON.
    const schemaIndice = {
      type: Type.OBJECT,
      properties: {
        summary: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { time: { type: Type.STRING }, topic: { type: Type.STRING } },
            required: ["time", "topic"],
          },
        },
        transcript: { type: Type.STRING },
      },
      required: ["summary", "transcript"],
    };
    // Defesa em profundidade: além do schema, uma nova tentativa se ainda assim vier
    // algo não-parseável (rede instável, resposta cortada etc.) — o Gemini não é
    // determinístico, uma segunda chamada quase sempre resolve o que a primeira não deu.
    let parsed: any;
    let ultimoErro: any;
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const generated = await ai.models.generateContent({
          model: geminiModel,
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          config: { responseMimeType: "application/json", responseSchema: schemaIndice, maxOutputTokens: 8192, temperature: 0.4 },
        });
        const cleaned = String(generated.text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
        parsed = JSON.parse(cleaned);
        ultimoErro = null;
        break;
      } catch (erro) {
        ultimoErro = erro;
      }
    }
    if (ultimoErro) throw new Error(`Gemini devolveu um índice inválido mesmo após nova tentativa: ${ultimoErro?.message || ultimoErro}`);
    if (!Array.isArray(parsed.summary) || !parsed.summary.length) throw new Error("Gemini retornou índice vazio.");

    // Garantia no servidor, não só no prompt: a IA às vezes ignora o limite e devolve
    // uma frase inteira em vez de um título de capítulo. Trunca em palavra inteira
    // pra o índice nunca virar o "texto imenso" que o prompt tenta evitar.
    const TOPIC_MAX = 46;
    const summary = parsed.summary
      .filter((item: any) => item && typeof item.time === "string" && typeof item.topic === "string" && item.topic.trim())
      .map((item: any) => {
        let topic = item.topic.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
        if (topic.length > TOPIC_MAX) {
          const corte = topic.slice(0, TOPIC_MAX);
          const ultimoEspaco = corte.lastIndexOf(" ");
          topic = `${(ultimoEspaco > 20 ? corte.slice(0, ultimoEspaco) : corte).trim()}…`;
        }
        return { time: item.time, topic };
      });
    if (!summary.length) throw new Error("Gemini retornou índice vazio.");

    // Garantia no servidor pro espaçamento também — o prompt pede mínimo de 90s entre
    // capítulos, mas isso é instrução, não trava. Ordena por tempo e descarta qualquer
    // capítulo que caia a menos de 90s do último mantido (sempre mantém o primeiro).
    const ESPACAMENTO_MIN_SEG = 90;
    const paraSegundos = (tempo: string): number => {
      const partes = tempo.split(":").map((v) => Number.parseInt(v, 10) || 0);
      if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
      if (partes.length === 2) return partes[0] * 60 + partes[1];
      return 0;
    };
    const summaryEspacado = summary
      .slice()
      .sort((a, b) => paraSegundos(a.time) - paraSegundos(b.time))
      .reduce((acc: typeof summary, item) => {
        const ultimo = acc[acc.length - 1];
        if (!ultimo || paraSegundos(item.time) - paraSegundos(ultimo.time) >= ESPACAMENTO_MIN_SEG) acc.push(item);
        return acc;
      }, []);

    return { summary: summaryEspacado, transcript: String(parsed.transcript || "") };
  }

  // POST /api/gerar-indice — gera índice/resumo a partir de uma transcrição já salva
  // (reprocessamento manual por vídeo, ou o botão "Gerar índice" em lote). Roda 100% no
  // servidor: o consultor nunca vê qual IA/provedor a plataforma usa por baixo.
  app.post("/api/gerar-indice", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });
    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Autenticação obrigatória." });
    try { await adminAuth().verifyIdToken(idToken); }
    catch { return res.status(401).json({ error: "Token inválido." }); }

    const rawTranscript = String(req.body?.rawTranscript || "").trim();
    if (!rawTranscript) return res.status(400).json({ error: "rawTranscript obrigatório." });
    try {
      const { summary, transcript } = await gerarIndicePorIA(rawTranscript);
      return res.json({ summary, transcript });
    } catch (error: any) {
      console.error("[/api/gerar-indice] erro:", error);
      const errorMessage = String(error?.message || "Erro ao gerar índice.")
        .replace(/\bgemini\b/gi, "serviço de IA")
        .slice(0, 500);
      return res.status(500).json({ error: errorMessage });
    }
  });

  // POST /api/bunny/transcribe-video — transcreve um vídeo já enviado ao Bunny usando
  // DeepInfra Whisper (muito mais barato que Bunny Transcribe), publica a legenda pt no player
  // e devolve o transcript com timestamps. A chave da DeepInfra e a chave Bunny ficam no servidor.
  app.post("/api/bunny/transcribe-video", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });

    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Autenticação obrigatória." });

    let callerUid: string;
    try { callerUid = (await adminAuth().verifyIdToken(idToken)).uid; }
    catch { return res.status(401).json({ error: "Token inválido." }); }

    const callerSnap = await adminFirestore().collection("users").doc(callerUid).get();
    const caller = callerSnap.exists ? (callerSnap.data() as any) : {};
    const adminEmails = ["israelnz2018@hotmail.com", "israel@learningbyworking.com"];
    const isAdmin = adminEmails.includes(String(caller.email || "").toLowerCase());
    if (caller.tipoUsuario !== "consultor" && !isAdmin) return res.status(403).json({ error: "Só consultor ou admin." });

    const consultorId = String(caller.consultorId || "israel");
    const videoId = String(req.body?.bunnyVideoId || "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(videoId)) return res.status(400).json({ error: "Vídeo Bunny inválido." });

    let videoDocs: admin.firestore.QuerySnapshot | null = null;
    // Declarados FORA do try: o catch abaixo usa os dois pra registrar a falha.
    // Quando viviam dentro do try, o catch estourava ReferenceError antes de gravar
    // qualquer coisa — o vídeo ficava preso em "processando" e nenhum erro aparecia.
    const pipelineStatus: Record<string, any> = {};
    let etapaAtual: "processamentoVideo" | "transcricao" | "indice" = "processamentoVideo";
    try {
      // Confirma que o GUID pertence à base deste consultor antes de usar suas credenciais.
      videoDocs = await adminFirestore().collection("knowledge_base")
        .where("bunnyVideoId", "==", videoId).get();
      if (videoDocs.empty) return res.status(404).json({ error: "Vídeo não encontrado na plataforma." });
      const belongsToTenant = videoDocs.docs.some((doc) => {
        const owner = String((doc.data() as any).consultorId || "israel");
        return owner === consultorId;
      });
      if (!isAdmin && !belongsToTenant) return res.status(403).json({ error: "Vídeo não pertence a este consultor." });

      const lib = await bunnyLibraryDoConsultor(consultorId);
      if (!lib) throw new Error("Biblioteca de vídeo do consultor não configurada.");
      const base = `https://video.bunnycdn.com/library/${lib.libraryId}/videos/${videoId}`;

      const saved = videoDocs.docs.map(doc => doc.data() as any);
      let rawTranscript = String(saved.find(value => value.rawTranscript?.trim())?.rawTranscript || "");
      const savedSummary = saved.find(value => Array.isArray(value.summary) && value.summary.length)?.summary;

      // O consultor acompanha cada etapa sem precisar interpretar um erro genérico.
      // O status é salvo nos placements irmãos para todos os cursos exibirem a mesma informação.
      pipelineStatus.processamentoVideo = rawTranscript ? "concluido" : "processando";
      pipelineStatus.transcricao = rawTranscript ? "concluido" : "aguardando";
      pipelineStatus.indice = savedSummary ? "concluido" : rawTranscript ? "processando" : "aguardando";
      etapaAtual = rawTranscript ? "indice" : "processamentoVideo";
      const salvarPipelineStatus = async (limparErro = false) => {
        pipelineStatus.atualizadoEm = new Date().toISOString();
        const batch = adminFirestore().batch();
        videoDocs!.docs.forEach(doc => batch.update(doc.ref, {
          pipelineStatus: { ...pipelineStatus },
          ...(limparErro ? { transcricaoErro: admin.firestore.FieldValue.delete() } : {}),
        }));
        await batch.commit();
      };

      // Etapas longas (transcrição e índice) não emitem progresso. Sem uma batida
      // periódica o atualizadoEm congela e a tela acusa "travado" no meio de um
      // processamento saudável. Só renova o carimbo de hora; não muda etapa.
      const comSinalDeVida = async <T,>(tarefa: Promise<T>): Promise<T> => {
        const batida = setInterval(() => { void salvarPipelineStatus().catch(() => {}); }, 60_000);
        try { return await tarefa; } finally { clearInterval(batida); }
      };

      // O play-data do Bunny já devolve a thumbnail pública (video.thumbnailUrl).
      // Isso usa a mesma chave Stream da biblioteca e não exige BUNNY_ACCOUNT_API_KEY.
      // Retorna true se salvou (ou já tinha) — usado pra decidir se vale tentar de novo.
      let thumbnailSalva = false;
      const tentarSalvarThumbnail = async (): Promise<boolean> => {
        if (thumbnailSalva || saved.some(value => value.bunnyThumbnailUrl)) return true;
        try {
          const playForThumbnail = await fetch(`${base}/play`, {
            headers: { AccessKey: lib.apiKey, Accept: "application/json" },
            signal: AbortSignal.timeout(30_000),
          });
          if (playForThumbnail.ok) {
            const playData = await playForThumbnail.json() as any;
            const bunnyThumbnailUrl = String(playData?.video?.thumbnailUrl || "").trim();
            if (bunnyThumbnailUrl) {
              const thumbBatch = adminFirestore().batch();
              videoDocs!.docs.forEach(doc => thumbBatch.update(doc.ref, { bunnyThumbnailUrl }));
              await thumbBatch.commit();
              thumbnailSalva = true;
            }
          }
        } catch (thumbnailError) {
          console.warn("[/api/bunny/transcribe-video] thumbnail não disponível:", thumbnailError);
        }
        return thumbnailSalva;
      };
      // Primeira tentativa: rápida, cobre o vídeo já totalmente processado antes
      // (retry/"reused"). Num vídeo NOVO a codificação pode ainda não ter gerado a
      // capa aqui — por isso há uma segunda chamada mais abaixo, depois de confirmar
      // que a codificação terminou, garantindo que a capa não fique pra sempre vazia.
      await tentarSalvarThumbnail();

      if (rawTranscript && savedSummary) {
        // Sucesso (ou já processado antes) — limpa qualquer erro anterior persistido.
        pipelineStatus.processamentoVideo = "concluido";
        pipelineStatus.transcricao = "concluido";
        pipelineStatus.indice = "concluido";
        await salvarPipelineStatus(true).catch(() => {});
        return res.json({ transcript: rawTranscript, summary: savedSummary, reused: true, complete: true });
      }

      await salvarPipelineStatus(true);

      if (!rawTranscript) {
        const deepinfraKey = process.env.DEEPINFRA_API_KEY;
        if (!deepinfraKey) throw new Error("Serviço de transcrição não configurado no servidor.");

        // O pull zone do Bunny exige Referer. Calculado aqui porque tanto a sondagem
        // quanto o download abaixo precisam do cabeçalho.
        const origem = String(req.headers.origin || req.headers.referer || process.env.APP_URL || "").trim();
        const referer = origem ? { Referer: origem.endsWith("/") ? origem : `${origem}/` } : {};

        // O upload TUS termina antes da CODIFICAÇÃO. O /play devolve o fallbackUrl
        // assim que o registro do vídeo existe, mesmo sem o MP4 estar gravado — era
        // por isso que o download estourava 404 logo depois de enviar o vídeo.
        // Agora espera o status de codificação concluída (4) E confirma que o arquivo
        // responde, antes de tentar baixá-lo. Até 10 minutos.
        let mediaUrl = "";
        let ultimoMotivo = "codificação ainda não concluída";
        for (let attempt = 0; attempt < 60 && !mediaUrl; attempt++) {
          const infoResponse = await fetch(base, {
            headers: { AccessKey: lib.apiKey, Accept: "application/json" },
          });
          const info = infoResponse.ok ? await infoResponse.json() as any : null;
          const encodeStatus = Number(info?.status ?? -1);
          // 5 = falha no processamento, 6 = falha no upload. Não adianta esperar.
          if (encodeStatus === 5 || encodeStatus === 6) {
            throw new Error("O servidor de vídeo não conseguiu processar este arquivo. Envie o vídeo novamente.");
          }

          if (encodeStatus === 4) {
            const playResponse = await fetch(`${base}/play`, {
              headers: { AccessKey: lib.apiKey, Accept: "application/json" },
            });
            const play = playResponse.ok ? await playResponse.json() as any : null;
            // O Bunny devolve fallbackUrl como prefixo (ex.: .../play_). A
            // resolução precisa ser acrescentada antes do download.
            let candidata = String(play?.fallbackUrl || play?.originalUrl || "");
            if (candidata.endsWith("/play_")) {
              const resolutions = String(play?.video?.availableResolutions || info?.availableResolutions || "")
                .split(",")
                .map((value: string) => Number.parseInt(value, 10))
                .filter((value: number) => Number.isFinite(value));
              const sourceHeight = Number(play?.video?.height || info?.height || 0);
              const usable = resolutions.filter((value: number) => !sourceHeight || value <= sourceHeight);
              // Para transcrição, a menor resolução preserva o áudio e reduz muito
              // o download/memória do servidor (um vídeo 1080p pode ter centenas de MB).
              const candidates = usable.length > 0 ? usable : resolutions;
              const resolution = candidates.length > 0 ? Math.min(...candidates) : 0;
              candidata = resolution > 0 ? `${candidata}${resolution}p.mp4` : "";
            }
            if (candidata) {
              // O arquivo pode demorar alguns segundos além do status 4. Confirma
              // que ele responde antes de comprometer o download inteiro.
              const sonda = await fetch(candidata, {
                headers: { Range: "bytes=0-1", ...referer },
                signal: AbortSignal.timeout(30_000),
              }).catch(() => null);
              if (sonda && (sonda.ok || sonda.status === 206)) mediaUrl = candidata;
              // 403 é bloqueio de acesso do CDN (restrição de referer), não demora
              // de codificação — insistir por 10 minutos não resolveria nada.
              else if (sonda?.status === 403) {
                throw new Error("O servidor de vídeo recusou o acesso ao arquivo (403). Verifique a restrição de domínios do CDN e a variável APP_URL.");
              }
              else ultimoMotivo = `arquivo ainda não disponível (HTTP ${sonda?.status ?? "sem resposta"})`;
            } else {
              ultimoMotivo = "o servidor de vídeo não informou nenhuma resolução para download";
            }
          } else {
            ultimoMotivo = `codificação em ${Number(info?.encodeProgress ?? 0)}%`;
          }

          if (!mediaUrl) {
            // Sinal de vida a cada 30s. Sem isso o atualizadoEm ficava parado
            // durante toda a codificação e a tela marcava como "travado" um vídeo
            // que está processando normalmente — e um Refazer ali dispararia uma
            // segunda transcrição paga do mesmo vídeo.
            if (attempt % 3 === 2) await salvarPipelineStatus().catch(() => {});
            await new Promise(resolve => setTimeout(resolve, 10_000));
          }
        }
        if (!mediaUrl) throw new Error(`O vídeo não ficou pronto no servidor de vídeo em 10 minutos (${ultimoMotivo}).`);

        // Codificação confirmada concluída — se a primeira tentativa (antes da espera)
        // não achou a capa porque o Bunny ainda estava gerando, agora é a hora certa.
        await tentarSalvarThumbnail();

        pipelineStatus.processamentoVideo = "concluido";
        pipelineStatus.transcricao = "processando";
        etapaAtual = "transcricao";
        await salvarPipelineStatus();

        // DeepInfra (diferente do Groq) não aceita "url" — precisa do arquivo em si no form.
        const mediaResponse = await fetch(mediaUrl, {
          headers: { Accept: "video/mp4,video/*;q=0.9,*/*;q=0.8", ...referer },
          signal: AbortSignal.timeout(120_000),
        });
        if (!mediaResponse.ok) throw new Error(`Falha ao baixar o vídeo do Bunny: HTTP ${mediaResponse.status}`);
        const mediaBuffer = Buffer.from(await mediaResponse.arrayBuffer());

        const form = new FormData();
        form.append("file", new Blob([mediaBuffer]), "video.mp4");
        form.append("model", "openai/whisper-large-v3-turbo");
        form.append("language", "pt");
        form.append("response_format", "verbose_json");
        form.append("timestamp_granularities", "segment");
        form.append("temperature", "0");
        form.append("prompt", "Aula técnica em português sobre Lean Six Sigma, DMAIC, Minitab, capabilidade, MSA, CEP e gestão de projetos de melhoria.");

        const deepinfraResponse = await comSinalDeVida(fetch("https://api.deepinfra.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${deepinfraKey}` },
          body: form,
          // Uma chamada presa não pode deixar o vídeo indefinidamente em
          // "Transcrição — Processando". O catch persiste Falha + Refazer.
          signal: AbortSignal.timeout(300_000),
        }));
        if (!deepinfraResponse.ok) {
          const detail = await deepinfraResponse.text().catch(() => "");
          if (deepinfraResponse.status === 402) {
            throw new Error("Serviço de transcrição sem saldo positivo. Adicione saldo para processar este vídeo.");
          }
          throw new Error(`DeepInfra HTTP ${deepinfraResponse.status}${detail ? `: ${detail.slice(0, 240)}` : ""}`);
        }
        const transcription = await deepinfraResponse.json() as any;
        const segments = Array.isArray(transcription.segments)
          ? transcription.segments.filter((segment: any) => String(segment.text || "").trim())
          : [];
        if (!segments.length) throw new Error("Groq não retornou segmentos com timestamps.");

        const stamp = (seconds: number) => {
          const ms = Math.max(0, Math.round(Number(seconds || 0) * 1000));
          const h = Math.floor(ms / 3600000);
          const m = Math.floor((ms % 3600000) / 60000);
          const s = Math.floor((ms % 60000) / 1000);
          const milli = ms % 1000;
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(milli).padStart(3, "0")}`;
        };
        rawTranscript = segments.map((segment: any) => {
          const total = Math.floor(Number(segment.start || 0));
          const h = Math.floor(total / 3600);
          const m = Math.floor((total % 3600) / 60);
          const s = total % 60;
          const time = h
            ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
            : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
          return `[${time}] ${String(segment.text).trim()}`;
        }).join("\n");
        if (!rawTranscript.trim()) throw new Error("A transcrição completa retornou vazia.");
        const transcriptMeta = {
          segmentCount: segments.length,
          characterCount: rawTranscript.length,
          savedAt: new Date().toISOString(),
        };
        const vtt = `WEBVTT\n\n${segments.map((segment: any) =>
          `${stamp(segment.start)} --> ${stamp(Math.max(Number(segment.end || 0), Number(segment.start || 0) + 0.5))}\n${String(segment.text).replace(/-->/g, "→").trim()}`
        ).join("\n\n")}\n`;

        // Salva a transcrição completa antes de legenda e índice. Assim, uma falha
        // posterior não perde o texto nem cobra novamente a transcrição no retry.
        const transcriptBatch = adminFirestore().batch();
        videoDocs.docs.forEach(doc => transcriptBatch.update(doc.ref, { rawTranscript, transcriptMeta }));
        await transcriptBatch.commit();

        // Confirma que o Firestore recebeu exatamente o texto integral montado a
        // partir de todos os segmentos, sem truncamento silencioso.
        const persistedTranscript = String((await videoDocs.docs[0].ref.get()).data()?.rawTranscript || "");
        if (persistedTranscript !== rawTranscript) {
          throw new Error("A transcrição completa não foi persistida integralmente.");
        }

        const captionResponse = await fetch(`${base}/captions/pt`, {
          method: "POST",
          headers: { AccessKey: lib.apiKey, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ srclang: "pt", label: "Português", captionsFile: Buffer.from(vtt, "utf8").toString("base64") }),
        });
        if (!captionResponse.ok) throw new Error(`Bunny caption HTTP ${captionResponse.status}`);
      }

      pipelineStatus.processamentoVideo = "concluido";
      pipelineStatus.transcricao = "concluido";
      pipelineStatus.indice = "processando";
      etapaAtual = "indice";
      await salvarPipelineStatus();

      const indiceComTimeout = Promise.race([
        gerarIndicePorIA(rawTranscript),
        new Promise<never>((_, reject) => setTimeout(
          () => reject(new Error("O índice e o resumo demoraram mais que 3 minutos.")),
          180_000,
        )),
      ]);
      const { summary, transcript: indiceTranscript } = await comSinalDeVida(indiceComTimeout);
      const indexBatch = adminFirestore().batch();
      videoDocs.docs.forEach(doc => indexBatch.update(doc.ref, {
        rawTranscript,
        summary,
        transcript: indiceTranscript,
      }));
      await indexBatch.commit();

      pipelineStatus.processamentoVideo = "concluido";
      pipelineStatus.transcricao = "concluido";
      pipelineStatus.indice = "concluido";
      await salvarPipelineStatus(true).catch(() => {});

      return res.json({ transcript: rawTranscript, summary, caption: "pt", complete: true });
    } catch (error: any) {
      // Log completo (com nome de fornecedor/detalhe técnico) só no servidor. O consultor
      // nunca vê qual software/provedor a plataforma usa por baixo dos panos.
      console.error("[/api/bunny/transcribe-video] erro:", error);
      const errorMessage = String(error?.message || "Erro ao transcrever vídeo.")
        .replace(/deepinfra/gi, "serviço de transcrição")
        .replace(/\bgroq\b/gi, "serviço de transcrição")
        .replace(/\bgemini\b/gi, "serviço de IA")
        .replace(/\bbunny\b/gi, "servidor de vídeo")
        .slice(0, 500);
      if (videoDocs && !videoDocs.empty) {
        pipelineStatus[etapaAtual] = "erro";
        pipelineStatus.atualizadoEm = new Date().toISOString();
        pipelineStatus.erro = {
          etapa: etapaAtual,
          mensagem: errorMessage,
          ocorridoEm: new Date().toISOString(),
        };
        const failureBatch = adminFirestore().batch();
        videoDocs.docs.forEach(doc => failureBatch.update(doc.ref, {
          pipelineStatus: { ...pipelineStatus },
          transcricaoErro: {
            mensagem: errorMessage,
            ocorridoEm: new Date().toISOString(),
          },
        }));
        await failureBatch.commit().catch((persistError) => {
          console.error("[/api/bunny/transcribe-video] falha ao persistir status:", persistError);
        });
      }
      return res.status(500).json({ error: errorMessage });
    }
  });

  // POST /api/consultor/convidar — convida/promove alguém a CONSULTOR de um tenant.
  // Se o e-mail já for usuário (aluno pago/grátis), PROMOVE pra consultor (não duplica).
  // Senha padrão LBW2026 + troca obrigatória no 1º login (senhaProvisoria). Admin-only, sem n8n.
  app.post("/api/consultor/convidar", requireAdmin, async (req: any, res) => {
    const email = String(req.body?.email || "").toLowerCase().trim();
    const nome = String(req.body?.nome || "").trim();
    const consultorId = String(req.body?.consultorId || "").trim();
    if (!email || email.indexOf("@") < 0) return res.status(400).json({ error: "E-mail inválido." });
    if (!consultorId) return res.status(400).json({ error: "consultorId obrigatório." });
    const site = `https://${consultorId}.educacaopelotrabalho.com`;
    const SENHA_CONVITE = gerarSenhaProvisoria();
    try {
      // 1) Se já existe (aluno pago/grátis), NÃO reseta a senha — ele mantém a que já
      //    usa; só promovemos o papel. Se é conta nova, cria com a senha padrão.
      let uid: string, novo = false;
      try {
        uid = (await adminAuth().getUserByEmail(email)).uid;
        if (nome) await adminAuth().updateUser(uid, { displayName: nome });
      } catch {
        uid = (await adminAuth().createUser({ email, password: SENHA_CONVITE, ...(nome ? { displayName: nome } : {}) })).uid;
        novo = true;
      }
      // 2) Doc: promove a consultor (mantém só admin como admin) + consultorId + acesso completo.
      const ref = adminFirestore().collection("users").doc(uid);
      const snap = await ref.get();
      const base = snap.exists ? (snap.data() as any) : {};
      const consultorIds = Array.from(new Set([...(Array.isArray(base.consultorIds) ? base.consultorIds : []), base.consultorId, consultorId].filter(Boolean)));
      const vinculoConsultor = {
        tipoUsuario: "consultor",
        consultorId,
        plano: "completo",
        criadoEm: base.vinculos?.[consultorId]?.criadoEm || new Date().toISOString(),
      };
      const vinculosExistentes = { ...(base.vinculos || {}) };
      if (base.consultorId && !vinculosExistentes[base.consultorId]) {
        vinculosExistentes[base.consultorId] = {
          tipoUsuario: base.tipoUsuario || "aluno", consultorId: base.consultorId,
          empresaId: base.empresaId || null, empresaNome: base.empresaNome || null,
          plano: base.plano || "gratuito", cursosAcesso: base.cursosAcesso || [],
          maxAlunos: base.maxAlunos || null, valorPago: base.valorPago || 0,
        };
      }
      await ref.set({
        uid, email,
        nome: nome || base.nome || "",
        tipoUsuario: base.tipoUsuario === "admin" ? "admin" : "consultor",
        consultorId,
        consultorIds,
        vinculos: { ...vinculosExistentes, [consultorId]: vinculoConsultor },
        plano: "completo",
        formacoes: Array.isArray(base.formacoes) && base.formacoes.length > 0 ? base.formacoes : ["projetos-melhoria-introdutoria"],
        creditoIA: base.creditoIA || { limite: 200, usado: 0, resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() },
        criadoEm: base.criadoEm || new Date().toISOString(),
        // Só conta NOVA ganha senha provisória (troca no 1º login). Quem já existe
        // mantém o estado dele — não mexemos na senha nem forçamos troca.
        ...(novo ? { senhaProvisoria: true } : {}),
      }, { merge: true });
      // 2b) Multi-tenant: cria a Video Library do Bunny do consultor (1x, se ainda não tem).
      // Guarda a chave na coleção PRIVADA bunny_libraries/{consultorId} (só o servidor lê).
      try {
        const jaTem = await adminFirestore().collection("bunny_libraries").doc(consultorId).get();
        if (!jaTem.exists) {
          const lib = await bunnyCreateLibrary(`LBW ${consultorId}`);
          if (lib) {
            await adminFirestore().collection("bunny_libraries").doc(consultorId).set(lib);
            await adminFirestore().collection("consultores").doc(consultorId).set({ bunnyLibraryId: lib.libraryId }, { merge: true });
            console.log(`[consultor/convidar] Bunny library criada p/ ${consultorId}: ${lib.libraryId}`);
          }
        }
      } catch (e) { console.error("[consultor/convidar] Bunny library:", e); }
      // 3) E-mail de acesso (via Resend) com login + senha padrão + link do site dele.
      let emailEnviado = false;
      try {
        const saud = nome ? `Olá, ${nome.split(" ")[0]}!` : "Olá!";
        const blocoAcesso = novo
          ? `<p style="background:#F0F2FA;border-left:4px solid #0033CC;padding:12px 16px"><strong>Seus dados de acesso:</strong><br>E-mail: <strong>${email}</strong><br>Senha provisória: <code style="background:#fff;padding:2px 6px;border:1px solid #ccc;border-radius:4px">${SENHA_CONVITE}</code></p><p style="font-size:14px">No primeiro acesso o sistema vai pedir pra você criar uma senha nova.</p>`
          : `<p style="background:#F0F2FA;border-left:4px solid #0033CC;padding:12px 16px">Entre com o seu <strong>e-mail (${email})</strong> e a <strong>senha que você já usa</strong> na plataforma — seu acesso de consultor já está liberado. Se não lembrar a senha, clique em "Esqueci minha senha" na tela de login.</p>`;
        const html = `
<div style="font-family:Arial,sans-serif;color:#2A2F3A;max-width:600px;margin:0 auto">
  <div style="background:#1E2D6E;color:#fff;padding:24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">Seu acesso de Consultor na LBW</h1>
  </div>
  <div style="background:#fff;padding:28px 24px;border:1px solid #ccc;border-top:0;border-radius:0 0 8px 8px">
    <p style="font-size:15px">${saud}</p>
    <p>Sua plataforma para gerenciar os seus cursos e os seus futuros clientes está pronta: <a href="${site}">${consultorId}.educacaopelotrabalho.com</a></p>
    ${blocoAcesso}
    <p style="text-align:center;margin:24px 0">
      <a href="${site}" style="background:#0033CC;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Acessar minha plataforma</a>
    </p>
    <p style="font-size:13px;color:#666">Use o nosso ecossistema pra transformar o seu conhecimento em cursos, ferramentas e resultados prontos pros seus clientes.</p>
  </div>
</div>`;
        const r = await resendSend({ to: email, subject: "Seu acesso ao Programa de Consultores LBW foi aprovado", html });
        emailEnviado = r.ok;
      } catch (e) {
        console.error("[consultor/convidar] falha no envio do e-mail:", e);
      }
      console.log(`[consultor/convidar] ${novo ? "CRIADO" : "PROMOVIDO"} ${email} → consultor ${consultorId} email=${emailEnviado}`);
      return res.json({ ok: true, status: novo ? "criado" : "promovido", email, senha: SENHA_CONVITE, emailEnviado });
    } catch (err: any) {
      console.error("[POST /api/consultor/convidar] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao convidar consultor." });
    }
  });

  app.post("/api/acesso/novo-curso", async (req: any, res: any) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/, '');
    let caller: any;
    try { caller = await adminAuth().verifyIdToken(token); } catch { return res.status(401).json({ error: "Autenticação obrigatória." }); }
    const targetEmail = String(req.body?.email || '').trim();
    const nome = String(req.body?.nome || '').trim();
    const cursos = Array.isArray(req.body?.cursos) ? req.body.cursos.map((c: any) => String(c).trim()).filter(Boolean) : [];
    if (!targetEmail || !cursos.length) return res.status(400).json({ error: "E-mail e cursos são obrigatórios." });
    const callerSnap = await adminFirestore().collection('users').doc(caller.uid).get();
    const callerData = callerSnap.data() || {};
    if (callerData.tipoUsuario !== 'consultor' && callerData.tipoUsuario !== 'admin') return res.status(403).json({ error: "Sem permissão." });
    const site = `https://${String(callerData.consultorId || 'israel')}.educacaopelotrabalho.com`;
    const lista = cursos.map((c: string) => `<li>${c}</li>`).join('');
    const html = `<div style="font-family:Arial,sans-serif;color:#2A2F3A;max-width:600px;margin:0 auto"><div style="background:#1E2D6E;color:#fff;padding:24px"><h1 style="margin:0;font-size:22px">Novo curso liberado na plataforma LBW</h1></div><div style="padding:28px 24px;border:1px solid #ccc"><p>Olá, ${nome || 'tudo bem'}!</p><p>Um novo acesso foi liberado para você na plataforma LBW.</p><p><strong>Cursos adicionados:</strong></p><ul>${lista}</ul><p>Você já pode acessar esses cursos usando seu e-mail e sua senha habituais.</p><p>Acesse a plataforma: <a href="${site}">${site}</a></p><p>Atenciosamente,<br>Plataforma LBW</p></div></div>`;
    const sent = await resendSend({ to: targetEmail, subject: 'Novo curso liberado na plataforma LBW', html });
    return res.json({ ok: sent.ok });
  });

  // Avisa o aluno que o acesso dele mudou (Data Analysis / Projects / Cursos).
  // Só é chamado quando o consultor CONFIRMA o envio na tela — nunca automático.
  app.post("/api/acesso/alteracao", async (req: any, res: any) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/, '');
    let caller: any;
    try { caller = await adminAuth().verifyIdToken(token); } catch { return res.status(401).json({ error: "Autenticação obrigatória." }); }
    const targetEmail = String(req.body?.email || '').trim();
    const nome = String(req.body?.nome || '').trim();
    const mudancas = Array.isArray(req.body?.mudancas)
      ? req.body.mudancas.map((m: any) => String(m).trim()).filter(Boolean).slice(0, 40)
      : [];
    if (!targetEmail || mudancas.length === 0) return res.status(400).json({ error: "E-mail e mudanças são obrigatórios." });

    const callerSnap = await adminFirestore().collection('users').doc(caller.uid).get();
    const callerData = callerSnap.data() || {};
    if (callerData.tipoUsuario !== 'consultor' && callerData.tipoUsuario !== 'admin') {
      return res.status(403).json({ error: "Sem permissão." });
    }
    // Só avisa aluno do próprio mundo do consultor (admin passa).
    const consultorId = String(callerData.consultorId || 'israel');
    if (callerData.tipoUsuario !== 'admin') {
      const alvo = await adminFirestore().collection('users').where('email', '==', targetEmail).limit(1).get();
      const alvoData = alvo.empty ? null : (alvo.docs[0].data() as any);
      const pertence = alvoData && (alvoData.consultorId === consultorId
        || (Array.isArray(alvoData.consultorIds) && alvoData.consultorIds.includes(consultorId)));
      if (!pertence) return res.status(403).json({ error: "Este aluno não pertence ao seu ambiente." });
    }

    const site = `https://${consultorId}.educacaopelotrabalho.com`;
    const escapar = (t: string) => t.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
    const lista = mudancas.map((m: string) => `<li>${escapar(m)}</li>`).join('');
    const html = `<div style="font-family:Arial,sans-serif;color:#2A2F3A;max-width:600px;margin:0 auto"><div style="background:#1E2D6E;color:#fff;padding:24px"><h1 style="margin:0;font-size:22px">Seu acesso na plataforma foi atualizado</h1></div><div style="padding:28px 24px;border:1px solid #ccc"><p>Olá, ${escapar(nome) || 'tudo bem'}!</p><p>Houve uma atualização no que você pode acessar na plataforma:</p><ul>${lista}</ul><p>Entre com o seu e-mail e a senha de sempre para usar.</p><p>Acesse: <a href="${site}">${site}</a></p><p>Atenciosamente,<br>Plataforma LBW</p></div></div>`;
    const sent = await resendSend({ to: targetEmail, subject: 'Seu acesso na plataforma foi atualizado', html });
    return res.json({ ok: sent.ok });
  });

  // Libera para um consultor já aprovado a experiência de aluno no site do Israel.
  // Não cria outra conta: acrescenta somente o vínculo "israel" à identidade Firebase atual.
  app.post("/api/consultor/curso-demonstrativo", async (req: any, res: any) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });
    const token = String(req.headers.authorization || "").replace(/^Bearer\s+/, "");
    let callerUid = "";
    try { callerUid = (await adminAuth().verifyIdToken(token)).uid; }
    catch { return res.status(401).json({ error: "Autenticação obrigatória." }); }

    const consultorId = String(req.body?.consultorId || "").trim();
    if (!consultorId || consultorId === "israel") return res.status(400).json({ error: "Este curso demonstrativo é destinado aos consultores parceiros." });

    try {
      const userRef = adminFirestore().collection("users").doc(callerUid);
      const userSnap = await userRef.get();
      if (!userSnap.exists) return res.status(403).json({ error: "Perfil de usuário não encontrado." });
      const base = userSnap.data() as any;
      const vinculoAtual = base.vinculos?.[consultorId] || {};
      const ehConsultor = vinculoAtual.tipoUsuario === "consultor"
        || (base.consultorId === consultorId && base.tipoUsuario === "consultor");
      if (!ehConsultor) return res.status(403).json({ error: "Apenas o consultor desta plataforma pode liberar o curso demonstrativo." });

      const curso = "Como Resolver Problemas no Trabalho - Kit 90 dias";
      const vinculos = { ...(base.vinculos || {}) };
      const vinculoIsrael = { ...(vinculos.israel || {}) };
      const cursosAnteriores = Array.isArray(vinculoIsrael.cursosAcesso) ? vinculoIsrael.cursosAcesso : [];
      const cursosAcesso = [
        ...cursosAnteriores.filter((item: any) => String(item?.curso || "").trim() !== curso),
        { curso, vencimento: null, valor: 0, quantidade: 1 },
      ];
      vinculos.israel = {
        ...vinculoIsrael,
        tipoUsuario: "aluno",
        consultorId: "israel",
        plano: "por_curso",
        modeloAcesso: "por_curso",
        cursosAcesso,
        cursosLiberados: cursosAcesso.map((item: any) => item.curso),
        origem: "cortesia-programa-consultores",
      };
      const consultorIds = Array.from(new Set([
        ...(Array.isArray(base.consultorIds) ? base.consultorIds : []),
        base.consultorId,
        consultorId,
        "israel",
      ].filter(Boolean)));
      await userRef.set({ consultorIds, vinculos }, { merge: true });
      const email = String(base.email || "").trim().toLowerCase();
      if (email) {
        const primeiroNome = String(base.nome || "").trim().split(/\s+/)[0] || "";
        const html = `<div style="font-family:Arial,sans-serif;color:#2A2F3A;max-width:600px;margin:0 auto"><div style="background:#1E2D6E;color:#fff;padding:24px"><h1 style="margin:0;font-size:22px">LBW — Educação pelo Trabalho</h1></div><div style="padding:28px 24px;border:1px solid #ccc"><p>Olá, ${primeiroNome}!</p><p>Seu acesso gratuito ao curso <strong>Como Resolver Problemas no Trabalho — Kit 90 Dias</strong> foi liberado.</p><p>Use o mesmo e-mail e senha da sua conta de consultor para acessar a experiência como aluno.</p><p style="text-align:center"><a href="https://israel.educacaopelotrabalho.com" style="background:#0033CC;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">ACESSAR COMO ALUNO</a></p></div></div>`;
        await resendSend({ to: email, subject: "Seu acesso gratuito ao curso LBW foi liberado", html });
      }
      return res.json({ ok: true });
    } catch (err: any) {
      console.error("[POST /api/consultor/curso-demonstrativo] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao liberar curso demonstrativo." });
    }
  });

  // POST /api/coordenador/convidar — o CONSULTOR (ou admin) convida/promove um COORDENADOR
  // dentro do PRÓPRIO tenant. Conta nova = LBW2026 + troca no 1º login; existente = mantém a
  // senha e só promove (não tira os cursos). Autoriza consultor OU admin (não é requireAdmin).
  app.post("/api/coordenador/convidar", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });
    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Autenticação obrigatória." });
    let callerUid: string;
    try { callerUid = (await adminAuth().verifyIdToken(idToken)).uid; }
    catch { return res.status(401).json({ error: "Token inválido." }); }

    // O caller precisa ser consultor ou admin; o coordenador entra NO tenant do caller.
    const callerSnap = await adminFirestore().collection("users").doc(callerUid).get();
    const caller = callerSnap.exists ? (callerSnap.data() as any) : {};
    const ADMIN_EMAILS = ["israelnz2018@hotmail.com", "israel@learningbyworking.com"];
    const callerEhAdmin = ADMIN_EMAILS.includes((caller.email || "").toLowerCase());
    if (caller.tipoUsuario !== "consultor" && !callerEhAdmin) {
      return res.status(403).json({ error: "Só consultor ou admin pode convidar coordenador." });
    }
    const consultorId = String(caller.consultorId || "israel");

    const email = String(req.body?.email || "").toLowerCase().trim();
    const nome = String(req.body?.nome || "").trim();
    const empresaNome = String(req.body?.empresa || "").trim() || nome || email.split("@")[0];
    const cursosAcesso = Array.isArray(req.body?.cursosAcesso)
      ? req.body.cursosAcesso
          .map((c: any) => ({
            curso: String(c?.curso || "").trim(),
            vencimento: c?.vencimento ? String(c.vencimento).slice(0, 10) : null,
            valor: Number(c?.valor) >= 0 ? Number(c.valor) : 0,
            quantidade: Number(c?.quantidade) > 0 ? Number(c.quantidade) : 0,
          }))
          .filter((c: any) => c.curso)
      : [];
    if (!email || email.indexOf("@") < 0) return res.status(400).json({ error: "E-mail inválido." });
    if (cursosAcesso.length === 0) return res.status(400).json({ error: "Escolha ao menos um curso para o coordenador e o time dele." });
    if (cursosAcesso.some((c: any) => (Number(c?.quantidade) || 0) <= 0)) return res.status(400).json({ error: "Informe a quantidade de acessos de cada curso liberado." });
    if (cursosAcesso.some((c: any) => !c.vencimento || Number.isNaN(new Date(c.vencimento).getTime()))) return res.status(400).json({ error: "Informe a expiração de cada curso liberado." });
    const maxAlunos = cursosAcesso.reduce((s: number, c: any) => s + (Number(c.quantidade) || 0), 0);
    const valorPago = cursosAcesso.reduce((s: number, c: any) => s + (Number(c.valor) || 0), 0);
    const empresaId = gerarEmpresaId(consultorId, empresaNome || email);
    const SENHA_CONVITE = gerarSenhaProvisoria();

    // Enforcement do cap total de alunos do consultor (se o admin definiu capAlunos).
    // O consultor não pode distribuir aos coordenadores mais vagas do que a base permite.
    try {
      const consSnap = await adminFirestore().collection("consultores").doc(consultorId).get();
      const cap = consSnap.exists ? (Number((consSnap.data() as any).capAlunos) || 0) : 0;
      if (cap > 0) {
        const usersSnap = await adminFirestore().collection("users").where("consultorId", "==", consultorId).get();
        let somaSeats = 0;
        usersSnap.forEach((d) => {
          const u = d.data() as any;
          if (u.tipoUsuario === "coordenador" && u.email !== email) somaSeats += Number(u.maxAlunos) || 0;
        });
        if (somaSeats + maxAlunos > cap) {
          return res.status(400).json({ error: `Limite da base (${cap} alunos) excedido. Já distribuídos aos coordenadores: ${somaSeats}. Peça ao administrador pra aumentar o limite.` });
        }
      }
    } catch (e) { console.error("[coordenador/convidar] cap check:", e); }

    try {
      let uid: string, novo = false;
      try {
        uid = (await adminAuth().getUserByEmail(email)).uid;
        if (nome) await adminAuth().updateUser(uid, { displayName: nome });
      } catch {
        uid = (await adminAuth().createUser({ email, password: SENHA_CONVITE, ...(nome ? { displayName: nome } : {}) })).uid;
        novo = true;
      }
      const ref = adminFirestore().collection("users").doc(uid);
      const snap = await ref.get();
      const base = snap.exists ? (snap.data() as any) : {};
      let empresaIdFinal = base.empresaId ? String(base.empresaId) : empresaId;
      if (base.empresaId) {
        const donoEmpresaSnap = await adminFirestore()
          .collection("users")
          .where("empresaId", "==", String(base.empresaId))
          .where("tipoUsuario", "==", "coordenador")
          .limit(1)
          .get();
        const donoEmpresa = donoEmpresaSnap.empty ? null : (donoEmpresaSnap.docs[0].data() as any);
        if (donoEmpresa && String(donoEmpresa.consultorId || "israel") !== consultorId) {
          empresaIdFinal = empresaId;
        }
      }
      await ref.set({
        uid, email,
        nome: nome || base.nome || "",
        tipoUsuario: base.tipoUsuario === "admin" ? "admin" : "coordenador",
        consultorId,
        empresaId: empresaIdFinal,
        empresaNome: base.empresaNome || empresaNome,
        maxAlunos,
        valorPago, // valor pago pela empresa (repasse)
        plano: "por_curso",
        modeloAcesso: "por_curso",
        cursosAcesso,
        cursosLiberados: cursosAcesso.map((c: any) => c.curso),
        formacoes: Array.isArray(base.formacoes) && base.formacoes.length > 0 ? base.formacoes : ["projetos-melhoria-introdutoria"],
        creditoIA: base.creditoIA || { limite: 200, usado: 0, resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() },
        criadoEm: base.criadoEm || new Date().toISOString(),
        ...(novo ? { senhaProvisoria: true } : {}),
      }, { merge: true });

      const site = `https://${consultorId}.educacaopelotrabalho.com`;
      let emailEnviado = false;
      try {
        const saud = nome ? `Olá, ${nome.split(" ")[0]}!` : "Olá!";
        const blocoAcesso = novo
          ? `<p style="background:#F0F2FA;border-left:4px solid #0033CC;padding:12px 16px"><strong>Seus dados de acesso:</strong><br>E-mail: <strong>${email}</strong><br>Senha provisória: <code style="background:#fff;padding:2px 6px;border:1px solid #ccc;border-radius:4px">${SENHA_CONVITE}</code></p><p style="font-size:14px">No primeiro acesso o sistema vai pedir pra você criar uma senha nova.</p>`
          : `<p style="background:#F0F2FA;border-left:4px solid #0033CC;padding:12px 16px">Entre com o seu <strong>e-mail (${email})</strong> e a <strong>senha que você já usa</strong> — seu acesso de coordenador já está liberado.</p>`;
        const html = `
<div style="font-family:Arial,sans-serif;color:#2A2F3A;max-width:600px;margin:0 auto">
  <div style="background:#1E2D6E;color:#fff;padding:24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">Seu acesso de Coordenador</h1>
  </div>
  <div style="background:#fff;padding:28px 24px;border:1px solid #ccc;border-top:0;border-radius:0 0 8px 8px">
    <p style="font-size:15px">${saud}</p>
    <p>Você foi convidado(a) como <strong>coordenador(a)</strong> para gerenciar um time na plataforma.</p>
    ${blocoAcesso}
    <p style="text-align:center;margin:24px 0">
      <a href="${site}" style="background:#0033CC;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Acessar a plataforma</a>
    </p>
    <p style="font-size:13px;color:#666">Lá você acompanha o time, convida membros e vê os resultados.</p>
  </div>
</div>`;
        const r = await resendSend({ to: email, subject: "Seu acesso de Coordenador na plataforma", html });
        emailEnviado = r.ok;
      } catch (e) {
        console.error("[coordenador/convidar] falha no envio do e-mail:", e);
      }
      console.log(`[coordenador/convidar] ${novo ? "CRIADO" : "PROMOVIDO"} ${email} → coord tenant ${consultorId} email=${emailEnviado}`);
      return res.json({ ok: true, status: novo ? "criado" : "promovido", email, emailEnviado });
    } catch (err: any) {
      console.error("[POST /api/coordenador/convidar] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao convidar coordenador." });
    }
  });

  // POST /api/aluno/convidar — o CONSULTOR (ou admin) adiciona/promove um ALUNO no tenant dele,
  // com cursos liberados (cada um com vencimento) e o valor pago. Conta nova = LBW2026 + troca no
  // 1º login; existente = mantém a senha e só ajusta. Autoriza consultor OU admin.
  // PATCH /api/coordenador/:uid — edita os dados cadastrais do coordenador sem alterar
  // cursos, acessos, empresaId ou os alunos já vinculados ao time.
  app.patch("/api/coordenador/:uid", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });
    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Autenticação obrigatória." });

    let callerUid: string;
    try { callerUid = (await adminAuth().verifyIdToken(idToken)).uid; }
    catch { return res.status(401).json({ error: "Token inválido." }); }

    try {
      const [callerSnap, targetSnap] = await Promise.all([
        adminFirestore().collection("users").doc(callerUid).get(),
        adminFirestore().collection("users").doc(String(req.params.uid || "")).get(),
      ]);
      if (!targetSnap.exists) return res.status(404).json({ error: "Coordenador não encontrado." });

      const caller = callerSnap.exists ? (callerSnap.data() as any) : {};
      const target = targetSnap.data() as any;
      const callerEhAdmin = ["israelnz2018@hotmail.com", "israel@learningbyworking.com"]
        .includes(String(caller.email || "").toLowerCase());
      const callerEhConsultor = caller.tipoUsuario === "consultor";
      if (!callerEhAdmin && !callerEhConsultor) {
        return res.status(403).json({ error: "Só o consultor ou admin pode editar coordenador." });
      }
      if (String(target.tipoUsuario || "") !== "coordenador") {
        return res.status(400).json({ error: "Este usuário não é coordenador." });
      }

      const consultorId = String(caller.consultorId || "israel");
      const pertenceAoTenant = String(target.consultorId || "") === consultorId
        || target.vinculos?.[consultorId]?.tipoUsuario === "coordenador"
        || (Array.isArray(target.consultorIds) && target.consultorIds.includes(consultorId));
      if (!callerEhAdmin && !pertenceAoTenant) {
        return res.status(403).json({ error: "Este coordenador não pertence ao seu ambiente." });
      }

      const nome = String(req.body?.nome || "").trim().slice(0, 120);
      const email = String(req.body?.email || "").trim().toLowerCase();
      const empresaNome = String(req.body?.empresa || "").trim().slice(0, 160);
      const telefone = String(req.body?.telefone || "").trim().slice(0, 40);
      if (!nome) return res.status(400).json({ error: "Informe o nome do coordenador." });
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: "Informe um e-mail válido." });
      }

      const uid = targetSnap.id;
      const emailAtual = String(target.email || "").trim().toLowerCase();
      const emailMudou = email !== emailAtual;
      let senhaProvisoria = "";
      if (emailMudou) {
        try {
          const outro = await adminAuth().getUserByEmail(email);
          if (outro.uid !== uid) return res.status(409).json({ error: "Este e-mail já está sendo usado por outra conta." });
        } catch (e: any) {
          if (e?.code !== "auth/user-not-found") throw e;
        }
        senhaProvisoria = gerarSenhaProvisoria();
        await adminAuth().updateUser(uid, { email, displayName: nome, password: senhaProvisoria });
        await adminAuth().revokeRefreshTokens(uid);
      } else {
        await adminAuth().updateUser(uid, { displayName: nome });
      }

      const vinculos = { ...(target.vinculos || {}) };
      Object.keys(vinculos).forEach((id) => {
        if (vinculos[id] && typeof vinculos[id] === "object") {
          vinculos[id] = { ...vinculos[id], email, nome };
        }
      });
      await targetSnap.ref.update({
        email,
        nome,
        empresaNome: empresaNome || null,
        telefone: telefone || null,
        ...(emailMudou ? { senhaProvisoria: true } : {}),
        ...(Object.keys(vinculos).length ? { vinculos } : {}),
      });
      let emailEnviado = false;
      if (emailMudou) {
        const site = `https://${consultorId}.educacaopelotrabalho.com`;
        const escaparHtml = (valor: unknown) => String(valor || '').replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
        const primeiroNome = nome.split(/\s+/)[0] || nome;
        const html = `
<div style="font-family:Arial,sans-serif;color:#2A2F3A;max-width:600px;margin:0 auto">
  <div style="background:#1E2D6E;color:#fff;padding:24px;border-radius:8px 8px 0 0">
    <h1 style="margin:0;font-size:22px">Seu novo acesso de Coordenador na LBW</h1>
  </div>
  <div style="background:#fff;padding:28px 24px;border:1px solid #ccc;border-top:0;border-radius:0 0 8px 8px">
    <p style="font-size:15px">Olá <strong>${escaparHtml(primeiroNome)}</strong>!</p>
    <p>Seu acesso como coordenador foi atualizado na plataforma LBW. A empresa, a equipe e os cursos vinculados foram preservados.</p>
    <div style="background:#F0F2FA;border-left:4px solid #0033CC;padding:14px 16px;margin:20px 0">
      <strong>Novos dados de acesso</strong><br>
      E-mail: <strong>${escaparHtml(email)}</strong><br>
      Senha provisória: <code style="background:#fff;padding:3px 7px;border:1px solid #ccc;border-radius:4px">${escaparHtml(senhaProvisoria)}</code>
    </div>
    <p>Por segurança, crie uma nova senha no primeiro acesso.</p>
    <p style="text-align:center;margin:24px 0"><a href="${site}" style="background:#0033CC;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Acessar minha plataforma</a></p>
    <p style="font-size:13px;color:#666">Se você não esperava esta alteração, entre em contato com o consultor responsável.</p>
  </div>
</div>`;
        try {
          const envio = await resendSend({ to: email, subject: "Seu novo acesso de Coordenador na plataforma LBW", html });
          emailEnviado = envio.ok;
        } catch (e) { console.error("[PATCH /api/coordenador/:uid] falha no envio do novo acesso:", e); }
      }
      return res.json({ ok: true, uid, email, nome, empresaNome, telefone, emailMudou, emailEnviado });
    } catch (err: any) {
      console.error("[PATCH /api/coordenador/:uid] erro:", err);
      if (err?.code === "auth/invalid-email") return res.status(400).json({ error: "E-mail inválido." });
      if (err?.code === "auth/email-already-exists") return res.status(409).json({ error: "Este e-mail já está sendo usado por outra conta." });
      return res.status(500).json({ error: err?.message || "Erro ao editar coordenador." });
    }
  });

  // POST /api/leads-consultor — formulário público da landing /consultores.
  // As primeiras vagas são aprovadas manualmente pelo administrador antes que o
  // consultor receba a plataforma.
  app.post("/api/leads-consultor", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });
    const nome = String(req.body?.nome || "").trim().slice(0, 120);
    const cidadeEstado = String(req.body?.cidadeEstado || "").trim().slice(0, 120);
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 180);
    const empresa = String(req.body?.empresa || "").trim().slice(0, 120);
    const funcao = String(req.body?.funcao || "").trim().slice(0, 120);
    const whatsapp = String(req.body?.whatsapp || "").trim().slice(0, 40);
    const atuaMelhoria = String(req.body?.atuaMelhoria || "").trim().slice(0, 40);
    const clientesEmpresariais = String(req.body?.clientesEmpresariais || "").trim().slice(0, 40);
    const cursoOnline = String(req.body?.cursoOnline || "").trim().slice(0, 40);
    const cursoPretendido = String(req.body?.cursoPretendido || "").trim().slice(0, 300);
    const empresasAtuacao = String(req.body?.empresasAtuacao || "").trim().slice(0, 800);
    const prazoConfiguracao = String(req.body?.prazoConfiguracao || "").trim().slice(0, 40);
    const subdominioPretendido = String(req.body?.subdominioPretendido || "").trim().toLowerCase().slice(0, 31);
    const origem = String(req.body?.origem || "landing-consultores").trim().slice(0, 60);
    const respostasValidas =
      ["ja_atuo", "nao"].includes(atuaMelhoria) &&
      ["ja_atendo", "estou_buscando", "nao"].includes(clientesEmpresariais) &&
      ["ja_tenho", "desenvolvendo", "nao_tenho"].includes(cursoOnline);
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const whatsappValido = /^\+\d{1,4}\s+/.test(whatsapp) && (() => {
      const digitos = whatsapp.replace(/\D/g, "").length;
      return digitos >= 8 && digitos <= 15;
    })();
    if (!nome || !cidadeEstado || !emailValido || !empresa || !funcao || !whatsappValido || !cursoPretendido || !empresasAtuacao || !/^[a-z0-9][a-z0-9-]{2,30}$/.test(subdominioPretendido) || !["ate_7", "8_15", "16_30", "mais_30"].includes(prazoConfiguracao) || !respostasValidas) {
      return res.status(400).json({ error: "Preencha todos os campos." });
    }
    const qualificado =
      atuaMelhoria === "ja_atuo" &&
      ["ja_atendo", "estou_buscando"].includes(clientesEmpresariais) &&
      cursoOnline === "ja_tenho";
    try {
      await adminFirestore().collection("leads_consultores").add({
        nome, cidadeEstado, email, empresa, funcao, whatsapp, origem,
        atuaMelhoria, clientesEmpresariais, cursoOnline, cursoPretendido, empresasAtuacao, prazoConfiguracao, subdominioPretendido, qualificado,
        status: qualificado ? "aguardando_aprovacao" : "nao_qualificado",
        criadoEm: new Date().toISOString(),
      });
      return res.json({ ok: true, qualificado });
    } catch (err: any) {
      console.error("[POST /api/leads-consultor] erro:", err);
      return res.status(500).json({ error: "Erro ao salvar. Tente novamente." });
    }
  });

  // Lista e atualiza solicitações de consultores fundadores. Somente o hub admin
  // enxerga os dados, pois o formulário contém informações comerciais dos candidatos.
  app.get("/api/leads-consultor", requireAdmin, async (_req: any, res: any) => {
    try {
      const snap = await adminFirestore().collection("leads_consultores").get();
      const leads = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => String(b.criadoEm || "").localeCompare(String(a.criadoEm || "")));
      return res.json({ leads });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao listar solicitações." });
    }
  });

  app.patch("/api/leads-consultor/:id", requireAdmin, async (req: any, res: any) => {
    const id = String(req.params?.id || "").trim();
    const status = String(req.body?.status || "").trim();
    if (!id || !["aprovado", "recusado"].includes(status)) {
      return res.status(400).json({ error: "Status inválido." });
    }
    try {
      const ref = adminFirestore().collection("leads_consultores").doc(id);
      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "Solicitação não encontrada." });
      const agora = new Date().toISOString();
      const lead = snap.data() as any;
      let cursoDemonstrativoEmailEnviado = false;
      if (status === "recusado" && lead?.email) {
        const email = String(lead.email).trim().toLowerCase();
        const nome = String(lead.nome || "").trim();
        const curso = "Como Resolver Problemas no Trabalho - Kit 90 dias";
        let uid = "";
        let novo = false;
        let senhaProvisoria = "";
        try {
          uid = (await adminAuth().getUserByEmail(email)).uid;
        } catch (error: any) {
          if (error?.code !== "auth/user-not-found") throw error;
          senhaProvisoria = gerarSenhaProvisoria();
          uid = (await adminAuth().createUser({ email, password: senhaProvisoria, ...(nome ? { displayName: nome } : {}) })).uid;
          novo = true;
        }
        const userRef = adminFirestore().collection("users").doc(uid);
        const userSnap = await userRef.get();
        const base = userSnap.exists ? (userSnap.data() as any) : {};
        const vinculos = { ...(base.vinculos || {}) };
        const vinculoIsrael = { ...(vinculos.israel || {}) };
        const cursosAnteriores = Array.isArray(vinculoIsrael.cursosAcesso) ? vinculoIsrael.cursosAcesso : [];
        const cursosAcesso = [...cursosAnteriores.filter((item: any) => String(item?.curso || "").trim() !== curso), { curso, vencimento: null, valor: 0, quantidade: 1 }];
        vinculos.israel = { ...vinculoIsrael, tipoUsuario: "aluno", consultorId: "israel", plano: "por_curso", modeloAcesso: "por_curso", cursosAcesso, cursosLiberados: cursosAcesso.map((item: any) => item.curso), origem: "cortesia-consultores" };
        const consultorIds = Array.from(new Set([...(Array.isArray(base.consultorIds) ? base.consultorIds : []), base.consultorId, "israel"].filter(Boolean)));
        await userRef.set(novo ? {
          uid, email, nome, tipoUsuario: "aluno", consultorId: "israel", consultorIds, plano: "por_curso", modeloAcesso: "por_curso", cursosAcesso, cursosLiberados: cursosAcesso.map((item: any) => item.curso), vinculos, senhaProvisoria: true, criadoEm: agora, origem: "cortesia-consultores",
        } : { uid, email, nome: base.nome || nome, consultorIds, vinculos }, { merge: true });
        const primeiroNome = (nome.split(/\s+/)[0] || "").replace(/[<>&]/g, "");
        const acesso = novo
          ? `<p><strong>E-mail:</strong> ${email}<br><strong>Senha provisória:</strong> <code>${senhaProvisoria}</code></p><p>No primeiro acesso, crie uma nova senha.</p>`
          : `<p>Entre usando o e-mail <strong>${email}</strong> e a senha que você já utiliza na plataforma.</p>`;
        const html = `<div style="font-family:Arial,sans-serif;color:#2A2F3A;max-width:600px;margin:0 auto"><div style="background:#1E2D6E;color:#fff;padding:24px"><h1 style="margin:0;font-size:22px">LBW — Educação pelo Trabalho</h1></div><div style="padding:28px 24px;border:1px solid #ccc"><p>Olá, ${primeiroNome || ""}!</p><p>Agradecemos seu interesse no <strong>Programa de Consultores LBW — Educação pelo Trabalho</strong>.</p><p>Neste momento, você não foi aprovado para participar desta turma. Em breve abriremos novas turmas, e seu perfil poderá ser considerado novamente.</p><p>Enquanto isso, liberamos gratuitamente para você o curso <strong>Como Resolver Problemas no Trabalho — Kit 90 Dias</strong>. Ao fazer este curso, você conhecerá todos os recursos da plataforma pela perspectiva do aluno e entenderá, na prática, a experiência que seus futuros clientes terão.</p>${acesso}<p>Ao entrar, abra o curso em <strong>Educação / Meus Cursos</strong>.</p><p style="text-align:center"><a href="https://israel.educacaopelotrabalho.com" style="background:#0033CC;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">ACESSAR MEU CURSO GRATUITO</a></p><p>Atenciosamente,<br><strong>Israel Cavalcanti de Souza</strong><br>LBW — Educação pelo Trabalho</p></div></div>`;
        const mail = await resendSend({ to: email, subject: "Atualização sobre sua solicitação ao Programa de Consultores LBW", html });
        cursoDemonstrativoEmailEnviado = mail.ok;
      }
      await ref.set({
        status,
        decisaoEm: agora,
        decisaoPor: req.adminEmail || "admin",
        ...(status === "aprovado" ? {
          consultorId: String(req.body?.consultorId || "").trim(),
          conviteEnviado: Boolean(req.body?.conviteEnviado),
        } : { cursoDemonstrativoLiberado: true, cursoDemonstrativoEmailEnviado }),
      }, { merge: true });
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Erro ao atualizar solicitação." });
    }
  });

  app.post("/api/aluno/convidar", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });
    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Autenticação obrigatória." });
    let callerUid: string;
    try { callerUid = (await adminAuth().verifyIdToken(idToken)).uid; }
    catch { return res.status(401).json({ error: "Token inválido." }); }

    const callerSnap = await adminFirestore().collection("users").doc(callerUid).get();
    const caller = callerSnap.exists ? (callerSnap.data() as any) : {};
    const ADMIN_EMAILS = ["israelnz2018@hotmail.com", "israel@learningbyworking.com"];
    const callerEhAdmin = ADMIN_EMAILS.includes((caller.email || "").toLowerCase());
    const callerEhCoordenador = caller.tipoUsuario === "coordenador";
    const callerEhConsultor = caller.tipoUsuario === "consultor";
    if (!callerEhConsultor && !callerEhCoordenador && !callerEhAdmin) {
      return res.status(403).json({ error: "Só consultor, coordenador ou admin pode adicionar aluno." });
    }
    const consultorId = String(caller.consultorId || "israel");

    const email = String(req.body?.email || "").toLowerCase().trim();
    const nome = String(req.body?.nome || "").trim();
    let cursosAcesso = Array.isArray(req.body?.cursosAcesso) ? req.body.cursosAcesso : [];
    const analyticsInformado = Object.prototype.hasOwnProperty.call(req.body?.acessoProdutos || {}, "analytics");
    const projetosInformado = Object.prototype.hasOwnProperty.call(req.body || {}, "projetosAcesso");
    const analyticsAcessoSolicitado = Array.isArray(req.body?.acessoProdutos?.analytics) ? req.body.acessoProdutos.analytics : [];
    const projetosAcessoSolicitado = Array.isArray(req.body?.projetosAcesso) ? req.body.projetosAcesso : [];
    const valorPago = Number(req.body?.valorPago) >= 0 ? Number(req.body.valorPago) : 0;
    // O coordenador pode cadastrar sem disparar o convite. Ausência do campo
    // preserva o comportamento anterior para os demais chamadores da rota.
    const enviarEmail = req.body?.enviarEmail !== false;
    if (!email || email.indexOf("@") < 0) return res.status(400).json({ error: "E-mail inválido." });
    const SENHA_CONVITE = gerarSenhaProvisoria();
    let empresaId: string | null = null;
    let empresaNome: string | null = null;

    if (callerEhCoordenador) {
      empresaId = caller.empresaId ? String(caller.empresaId) : null;
      empresaNome = caller.empresaNome ? String(caller.empresaNome) : null;
      if (!empresaId) return res.status(400).json({ error: "Seu usuário de coordenador ainda não tem empresaId." });
    } else if (req.body?.empresaId) {
      const requestedEmpresaId = String(req.body.empresaId);
      if (requestedEmpresaId === empresaIdDireto(consultorId)) {
        // "Alunos diretos (sem coordenador)": só o consultor/admin monta esse time —
        // não existe doc de coordenador pra validar, é o próprio consultor quem responde.
        if (!callerEhConsultor && !callerEhAdmin) {
          return res.status(403).json({ error: "Só o consultor pode adicionar alunos diretos (sem coordenador)." });
        }
        empresaId = requestedEmpresaId;
        empresaNome = "Alunos diretos (sem coordenador)";
      } else {
        const coordSnap = await adminFirestore()
          .collection("users")
          .where("consultorId", "==", consultorId)
          .where("empresaId", "==", requestedEmpresaId)
          .where("tipoUsuario", "==", "coordenador")
          .limit(1)
          .get();
        if (coordSnap.empty) return res.status(400).json({ error: "Empresa/time não pertence a este consultor." });
        const coord = coordSnap.docs[0].data() as any;
        empresaId = requestedEmpresaId;
        empresaNome = coord.empresaNome || null;
      }
    }
    if (!empresaId) {
      return res.status(400).json({ error: "Aluno precisa estar vinculado a um time/coordenador. Informe o empresaId do coordenador." });
    }

    if (empresaId) {
      const [usersSnap, invitesSnap] = await Promise.all([
        adminFirestore().collection("users").where("empresaId", "==", empresaId).where("tipoUsuario", "==", "aluno").get(),
        adminFirestore().collection("invites").where("empresaId", "==", empresaId).get(),
      ]);
      const coordSnap = await adminFirestore()
        .collection("users")
        .where("consultorId", "==", consultorId)
        .where("empresaId", "==", empresaId)
        .where("tipoUsuario", "==", "coordenador")
        .limit(1)
        .get();
      const coord = coordSnap.empty ? caller : (coordSnap.docs[0].data() as any);
      const maxAlunos = Number(coord.maxAlunos) || 0;
      const currentStudent = await adminAuth().getUserByEmail(email).then((u) => u.uid).catch(() => null);
      const jaContaNoTime = currentStudent ? usersSnap.docs.some((d) => d.id === currentStudent) : false;
      const usados = usersSnap.size + invitesSnap.size;
      if (maxAlunos > 0 && !jaContaNoTime && usados >= maxAlunos) {
        return res.status(400).json({ error: `Limite de vagas atingido (${usados}/${maxAlunos}).` });
      }
      const timeTemCoordenador = !coordSnap.empty;
      const cursosCoord = (Array.isArray(coord.cursosAcesso) ? coord.cursosAcesso : [])
        .filter((c: any) => !c?.vencimento || new Date(c.vencimento).getTime() >= Date.now());
      const nomesCoord = new Set(cursosCoord.map((c: any) => String(c?.curso || "").trim()).filter(Boolean));
      const temAcessoSemCurso = analyticsAcessoSolicitado.length > 0 || projetosAcessoSolicitado.length > 0;
      if (timeTemCoordenador && nomesCoord.size === 0 && !temAcessoSemCurso) {
        return res.status(400).json({ error: "Este coordenador nao possui cursos validos liberados." });
      }
      if (timeTemCoordenador) {
        if (cursosAcesso.length === 0) {
          // Um consultor pode liberar somente Analytics/Projects para um aluno,
          // mesmo quando o aluno está dentro de um time que também possui cursos.
          if (!temAcessoSemCurso) cursosAcesso = cursosCoord;
        } else {
          const foraDoPacote = cursosAcesso
            .map((c: any) => String(c?.curso || "").trim())
            .filter((curso: string) => curso && !nomesCoord.has(curso));
          if (foraDoPacote.length > 0) {
            return res.status(400).json({ error: `Este time nao tem acesso a: ${foraDoPacote.join(", ")}.` });
          }
        }
        const cursosSolicitados = new Set(cursosAcesso.map((c: any) => String(c?.curso || "").trim()).filter(Boolean));
        const usoPorCurso = new Map<string, number>();
        usersSnap.docs.forEach((d) => {
          if (currentStudent && d.id === currentStudent) return;
          const lista = Array.isArray((d.data() as any).cursosAcesso) ? (d.data() as any).cursosAcesso : [];
          lista.forEach((c: any) => {
            const curso = String(c?.curso || "").trim();
            if (curso) usoPorCurso.set(curso, (usoPorCurso.get(curso) || 0) + 1);
          });
        });
        for (const c of cursosCoord) {
          const curso = String(c?.curso || "").trim();
          const quantidade = Number(c?.quantidade) || 0;
          if (!curso || quantidade <= 0 || !cursosSolicitados.has(curso)) continue;
          const usado = usoPorCurso.get(curso) || 0;
          if (usado >= quantidade) {
            return res.status(400).json({ error: `Limite do curso "${curso}" atingido (${usado}/${quantidade}).` });
          }
        }
      }
    }
    cursosAcesso = cursosAcesso
      .map((c: any) => ({
        curso: String(c?.curso || "").trim(),
        vencimento: c?.vencimento ? String(c.vencimento) : null,
        valor: typeof c?.valor === "number" ? c.valor : 0,
      }))
      .filter((c: any) => c.curso);
    const analyticsAcesso = analyticsAcessoSolicitado
      .map((item: any) => ({
        modulo: String(item?.modulo || item?.id || "").trim(),
        nome: String(item?.nome || item?.modulo || item?.id || "").trim(),
        vencimento: item?.vencimento ? String(item.vencimento) : null,
        valor: typeof item?.valor === "number" ? item.valor : Number(item?.valor) || 0,
      }))
      .filter((item: any) => item.modulo);
    const projetosAcessoNormalizados = projetosAcessoSolicitado
      .map((item: any) => ({
        projeto: String(item?.projeto || item?.id || "").trim(),
        nome: String(item?.nome || item?.projeto || item?.id || "").trim(),
        vencimento: item?.vencimento ? String(item.vencimento) : null,
        valor: typeof item?.valor === "number" ? item.valor : Number(item?.valor) || 0,
      }))
      .filter((item: any) => item.projeto);
    if (cursosAcesso.length === 0 && analyticsAcesso.length === 0 && projetosAcessoNormalizados.length === 0) {
      return res.status(400).json({ error: "Escolha ao menos um curso, análise ou projeto para o aluno." });
    }
    if (cursosAcesso.some((c: any) => !c.vencimento || Number.isNaN(new Date(c.vencimento).getTime()))) {
      return res.status(400).json({ error: "Informe uma data de expiração válida para todos os cursos." });
    }
    if ([...analyticsAcesso, ...projetosAcessoNormalizados].some((item: any) => !item.vencimento || Number.isNaN(new Date(item.vencimento).getTime()))) {
      return res.status(400).json({ error: "Informe uma data de expiração válida para todos os itens liberados." });
    }
    try {
      let uid: string, novo = false;
      try {
        uid = (await adminAuth().getUserByEmail(email)).uid;
        if (nome) await adminAuth().updateUser(uid, { displayName: nome });
      } catch {
        uid = (await adminAuth().createUser({ email, password: SENHA_CONVITE, ...(nome ? { displayName: nome } : {}) })).uid;
        novo = true;
      }
      const ref = adminFirestore().collection("users").doc(uid);
      const snap = await ref.get();
      const base = snap.exists ? (snap.data() as any) : {};
      const agoraIso = new Date().toISOString();
      const mesmoTime = empresaId && base.empresaId && String(base.empresaId) === String(empresaId);
      const vinculoAnterior = base.vinculos?.[consultorId] || {};
      const acessoProdutosAnterior = vinculoAnterior.acessoProdutos || {};
      const acessoProdutosAluno = analyticsInformado
        ? { ...acessoProdutosAnterior, analytics: analyticsAcesso }
        : acessoProdutosAnterior;
      const projetosAcessoAluno = projetosInformado
        ? projetosAcessoNormalizados
        : (Array.isArray(vinculoAnterior.projetosAcesso) ? vinculoAnterior.projetosAcesso : []);
      const consultorIdsAluno = Array.from(new Set([...(Array.isArray(base.consultorIds) ? base.consultorIds : []), base.consultorId, consultorId].filter(Boolean)));
      const vinculoAluno = {
        ...vinculoAnterior,
        tipoUsuario: vinculoAnterior.tipoUsuario === "consultor" || vinculoAnterior.tipoUsuario === "coordenador" ? vinculoAnterior.tipoUsuario : "aluno",
        consultorId,
        ...(empresaId ? { empresaId } : {}),
        ...(empresaNome ? { empresaNome } : {}),
        plano: "por_curso",
        modeloAcesso: "por_curso",
        cursosAcesso,
        cursosLiberados: cursosAcesso.map((c: any) => c.curso),
        acessoProdutos: acessoProdutosAluno,
        projetosAcesso: projetosAcessoAluno,
        valorPago,
        incluidoNoTimeEm: vinculoAnterior.incluidoNoTimeEm || agoraIso,
      };
      const vinculosExistentesAluno = { ...(base.vinculos || {}) };
      if (base.consultorId && !vinculosExistentesAluno[base.consultorId]) {
        vinculosExistentesAluno[base.consultorId] = {
          tipoUsuario: base.tipoUsuario || "aluno", consultorId: base.consultorId,
          empresaId: base.empresaId || null, empresaNome: base.empresaNome || null,
          plano: base.plano || "gratuito", cursosAcesso: base.cursosAcesso || [],
          maxAlunos: base.maxAlunos || null, valorPago: base.valorPago || 0,
        };
      }
      const preservarPrincipal = !!base.consultorId && String(base.consultorId) !== consultorId;
      await ref.set({
        uid, email,
        nome: nome || base.nome || "",
        tipoUsuario: base.tipoUsuario === "admin" || base.tipoUsuario === "coordenador" || base.tipoUsuario === "consultor" ? base.tipoUsuario : "aluno",
        consultorId: preservarPrincipal ? base.consultorId : consultorId,
        consultorIds: consultorIdsAluno,
        vinculos: { ...vinculosExistentesAluno, [consultorId]: vinculoAluno },
        ...(preservarPrincipal ? {} : (empresaId ? { empresaId } : {})),
        ...(preservarPrincipal ? {} : (empresaNome ? { empresaNome } : {})),
        ...(preservarPrincipal ? {} : { plano: "por_curso", modeloAcesso: "por_curso", cursosAcesso, cursosLiberados: cursosAcesso.map((c: any) => c.curso), acessoProdutos: acessoProdutosAluno, projetosAcesso: projetosAcessoAluno, valorPago }),
        formacoes: Array.isArray(base.formacoes) && base.formacoes.length > 0 ? base.formacoes : ["projetos-melhoria-introdutoria"],
        creditoIA: base.creditoIA || { limite: 200, usado: 0, resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() },
        criadoEm: base.criadoEm || agoraIso,
        ...(preservarPrincipal ? {} : { incluidoNoTimeEm: mesmoTime && base.incluidoNoTimeEm ? base.incluidoNoTimeEm : agoraIso }),
        ...(novo ? { senhaProvisoria: true } : {}),
      }, { merge: true });

      const site = `https://${consultorId}.educacaopelotrabalho.com`;
      let emailEnviado = false;
      if (enviarEmail) try {
        const saud = nome ? `Olá, ${nome.split(" ")[0]}!` : "Olá!";
        const nomeQuemConvidou = String(caller.nome || caller.displayName || caller.email || "O coordenador da empresa").trim();
        const empresaConviteNome = String(empresaNome || caller.empresaNome || "sua empresa").trim();
        const escaparHtml = (texto: string) => texto.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
        const dataEmail = (data: any) => data ? String(data).slice(0, 10).split('-').reverse().join('/') : '';
        const valorEmail = (valor: any) => Number(valor) > 0 ? ` · R$ ${Number(valor).toFixed(2).replace('.', ',')}` : '';
        const validadeEmail = (item: any) => item?.vencimento ? ` · válido até ${dataEmail(item.vencimento)}` : '';
        const itensEmail = [
          ...cursosAcesso.map((item: any) => ({ grupo: 'Education', nome: item.curso, vencimento: item.vencimento, valor: item.valor })),
          ...((acessoProdutosAluno?.analytics || []).map((item: any) => ({ grupo: 'Data Analysis', nome: item.nome || item.modulo, vencimento: item.vencimento, valor: item.valor }))),
          ...projetosAcessoAluno.map((item: any) => ({ grupo: 'Projects', nome: item.nome || item.projeto, vencimento: item.vencimento, valor: item.valor })),
        ].filter((item: any) => item.nome);
        const listaItensHtml = `<div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:14px 16px;margin:16px 0"><p style="margin:0 0 8px;font-size:14px"><strong>${nomeQuemConvidou}, ${callerEhCoordenador ? `coordenador da empresa ${empresaConviteNome}, te convidou` : 'seu consultor liberou seu acesso'} à plataforma LBW com:</strong></p><ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6">${itensEmail.map((item: any) => `<li><strong>${escaparHtml(item.grupo)}:</strong> ${escaparHtml(String(item.nome))}${validadeEmail(item)}${valorEmail(item.valor)}</li>`).join('')}</ul></div>`;
        const blocoAcesso = novo
          ? `<p style="background:#F0F2FA;border-left:4px solid #0033CC;padding:12px 16px"><strong>Seu acesso:</strong><br>E-mail: <strong>${email}</strong><br>Senha provisória: <code style="background:#fff;padding:2px 6px;border:1px solid #ccc;border-radius:4px">${SENHA_CONVITE}</code></p><p style="font-size:14px">No primeiro acesso o sistema vai pedir pra você criar uma senha nova.</p>`
          : `<p style="background:#F0F2FA;border-left:4px solid #0033CC;padding:12px 16px">Entre com o seu <strong>e-mail (${email})</strong> e a <strong>senha que você já usa</strong>.<br><br>Caso não lembre da senha, clique em <strong>Esqueci minha senha</strong> na tela de login.</p>`;
        const html = `
<div style="font-family:Arial,sans-serif;color:#2A2F3A;max-width:600px;margin:0 auto">
  <div style="background:#1E2D6E;color:#fff;padding:24px;border-radius:8px 8px 0 0"><h1 style="margin:0;font-size:22px">Seu acesso à plataforma LBW foi liberado</h1></div>
  <div style="background:#fff;padding:28px 24px;border:1px solid #ccc;border-top:0;border-radius:0 0 8px 8px">
    <p style="font-size:15px">${saud}</p>
    <p>${callerEhCoordenador ? `${nomeQuemConvidou}, coordenador da empresa ${empresaConviteNome}, te convidou` : 'Seu consultor liberou'} seu acesso à plataforma LBW.</p>
    ${listaItensHtml}
    ${blocoAcesso}
    <p style="font-size:14px;margin-top:18px">Acesse pelo site:<br><a href="${site}" style="color:#0033CC;font-weight:bold">${site}</a></p>
    <p style="text-align:center;margin:24px 0"><a href="${site}" style="background:#0033CC;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold">Acessar plataforma</a></p>
  </div>
</div>`;
        const r = await resendSend({ to: email, subject: "Seu acesso à plataforma LBW foi liberado", html });
        emailEnviado = r.ok;
      } catch (e) { console.error("[aluno/convidar] falha e-mail:", e); }
      return res.json({ ok: true, status: novo ? "criado" : "atualizado", email, emailEnviado, emailSolicitado: enviarEmail });
    } catch (err: any) {
      console.error("[POST /api/aluno/convidar] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao adicionar aluno." });
    }
  });

  // DELETE /api/aluno/:uid — remove o aluno do tenant sem apagar a conta Auth,
  // os projetos ou o histórico. O aluno deixa de ter acesso aos cursos deste consultor.
  // Catálogo público usado pelas landing pages para mostrar os cursos do consultor.
  // Só retorna nomes de cursos; nenhum conteúdo protegido é exposto.
  const TERMOS_GRATUITOS_VERSAO = "gratuitos-2026-08-25";
  const normalizarNomeLanding = (valor: unknown) => String(valor || "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
  const regrasWhatsappLanding: Record<string, { nome: string; min: number; max: number }> = {
    "+55": { nome: "Brasil", min: 10, max: 11 },
    "+61": { nome: "Austrália", min: 9, max: 9 },
    "+64": { nome: "Nova Zelândia", min: 8, max: 9 },
    "+351": { nome: "Portugal", min: 9, max: 9 },
    "+1": { nome: "Estados Unidos ou Canadá", min: 10, max: 10 },
    "+44": { nome: "Reino Unido", min: 10, max: 10 },
    "+353": { nome: "Irlanda", min: 9, max: 9 },
    "+34": { nome: "Espanha", min: 9, max: 9 },
    "+33": { nome: "França", min: 9, max: 9 },
    "+49": { nome: "Alemanha", min: 10, max: 11 },
    "+39": { nome: "Itália", min: 9, max: 10 },
    "+52": { nome: "México", min: 10, max: 10 },
    "+54": { nome: "Argentina", min: 10, max: 10 },
    "+56": { nome: "Chile", min: 9, max: 9 },
    "+27": { nome: "África do Sul", min: 9, max: 9 },
  };
  app.get("/api/public/cursos", async (_req: any, res: any) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Servidor não configurado.", cursos: [] });
    const consultorId = "israel";
    const excluirCurso = String(_req.query?.excluirCurso || "").trim();
    const excluirCursoNormalizado = normalizarNomeLanding(excluirCurso);
    try {
      const snapshot = await adminFirestore().collection("initiatives").get();
      const cursos = snapshot.docs
        .map((doc: any) => ({ id: doc.id, ...doc.data() }))
        .filter((item: any) => String(item.consultorId || "israel") === consultorId
          && item.somenteProjeto !== true
          && (!excluirCursoNormalizado || normalizarNomeLanding(item.name) !== excluirCursoNormalizado))
        .map((item: any) => String(item.name || "").trim())
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b, "pt-BR"));
      return res.json({ cursos: Array.from(new Set(cursos)) });
    } catch (err: any) {
      console.error("[GET /api/public/cursos] erro:", err?.message || err);
      return res.status(500).json({ error: "Não foi possível carregar os cursos.", cursos: [] });
    }
  });

  // Landing page gratuita do produto Capabilidade de Processo Avançado.
  // O endpoint é público de propósito: cria/atualiza o aluno e libera o pacote
  // específico sem depender do painel do consultor ou do webhook antigo.
  app.post("/api/public/acesso-gratis", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Servidor não configurado." });

    const produtoInformado = String(req.body?.produto || "").trim().toLowerCase();
    // Mantém compatibilidade com a landing antiga, mas separa o identificador
    // do pacote gratuito do pacote comercial de Capabilidade.
    const produto = produtoInformado === "capabilidade-processo"
      ? "capabilidade-processo-gratis"
      : produtoInformado;
    const nome = String(req.body?.nome || "").trim();
    const email = String(req.body?.email || "").trim().toLowerCase();
    const profissao = String(req.body?.profissao || "").trim().slice(0, 120);
    const interesseCursos = Array.from(new Set((Array.isArray(req.body?.interesseCursos) ? req.body.interesseCursos : [req.body?.interesseCurso]).map((item: any) => String(item || "").trim()).filter(Boolean))).slice(0, 20);
    const interesseCurso = interesseCursos.join(", ");
    const codigoPais = String(req.body?.codigoPais || "").trim();
    const whatsappNumero = String(req.body?.whatsappNumero || "").replace(/\D/g, "");
    const aceitouTermos = req.body?.aceitouTermos === true;
    const termosVersao = String(req.body?.termosVersao || "").trim();
    const configuracaoGratis = ({
      "capabilidade-processo-gratis": {
        curso: "Capabilidade de Processo Avançado",
        nomePacote: "Capabilidade de Processo Avançado",
        analytics: [{ modulo: "capabilidade", nome: "Capabilidade" }],
        projetoNome: null,
      },
      "estatistica-aplicada": {
        curso: "Estatística aplicada e ferramentas da qualidade",
        nomePacote: "Estatística aplicada e ferramentas da qualidade",
        analytics: [
          { modulo: "graficos", nome: "Gráficos" },
          { modulo: "diversas", nome: "Análises Diversas" },
        ],
        projetoNome: null,
      },
      "yellow-belt-gratis": {
        curso: "Formação Profissional em Gestão de Projetos de Melhoria - Nível Yellow Belt",
        nomePacote: "Formação Profissional em Gestão de Projetos de Melhoria - Nível Yellow Belt",
        analytics: [
          { modulo: "graficos", nome: "Gráficos" },
          { modulo: "diversas", nome: "Análises Diversas" },
        ],
        projetoNome: "LEAN SIX SIGMA YELLOW BELT",
      },
    } as const)[produto as "capabilidade-processo-gratis" | "estatistica-aplicada" | "yellow-belt-gratis"];
    if (!configuracaoGratis) return res.status(400).json({ error: "Produto gratuito inválido." });
    if (nome.length < 2) return res.status(400).json({ error: "Informe seu nome." });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: "Informe um e-mail válido." });
    if (!profissao) return res.status(400).json({ error: "Informe sua profissão." });
    if (!interesseCursos.length) return res.status(400).json({ error: "Escolha pelo menos um curso ou selecione Nenhum curso." });
    if (interesseCursos.includes("Nenhum curso") && interesseCursos.length > 1) return res.status(400).json({ error: "Nenhum curso não pode ser combinado com outros cursos." });
    const regraWhatsapp = regrasWhatsappLanding[codigoPais];
    if (!regraWhatsapp) return res.status(400).json({ error: "Selecione um país válido para o WhatsApp." });
    if (!/^[1-9]\d+$/.test(whatsappNumero) || whatsappNumero.length < regraWhatsapp.min || whatsappNumero.length > regraWhatsapp.max) {
      const quantidade = regraWhatsapp.min === regraWhatsapp.max ? String(regraWhatsapp.min) : `${regraWhatsapp.min} a ${regraWhatsapp.max}`;
      return res.status(400).json({ error: `Informe um WhatsApp válido para ${regraWhatsapp.nome} (${quantidade} dígitos, sem o código do país).` });
    }
    if (!aceitouTermos || termosVersao !== TERMOS_GRATUITOS_VERSAO) {
      return res.status(400).json({ error: "Aceite os termos e condições atuais para continuar." });
    }

    const consultorId = "israel";
    const curso = configuracaoGratis.curso;
    const validadeGratis = "2026-12-31";
    const analyticsGratis = configuracaoGratis.analytics.map((item) => ({ ...item, vencimento: validadeGratis, valor: 0 }));
    const agora = new Date().toISOString();
    const whatsapp = `${codigoPais}${whatsappNumero}`;
    const consentimentoGratuito = {
      aceito: true,
      versao: TERMOS_GRATUITOS_VERSAO,
      aceitoEm: agora,
      produto,
      origem: "landing-page",
    };

    try {
      let projetoGratis: { projeto: string; nome: string; vencimento: string; valor: number } | null = null;
      if (configuracaoGratis.projetoNome) {
        const iniciativasSnapshot = await adminFirestore().collection("initiatives").get();
        const cursoDoc = iniciativasSnapshot.docs.find((doc: any) => {
          const dados = doc.data() as any;
          return dados.somenteProjeto !== true
            && normalizarNomeLanding(dados.name) === normalizarNomeLanding(configuracaoGratis.curso);
        });
        const projetoDoc = iniciativasSnapshot.docs.find((doc: any) => {
          const dados = doc.data() as any;
          if (dados.somenteProjeto !== true) return false;
          const associadoAoCurso = cursoDoc && String(dados.cursoAssociadoId || "") === String(cursoDoc.id);
          const nomeEsperado = normalizarNomeLanding(dados.name) === normalizarNomeLanding(configuracaoGratis.projetoNome);
          return associadoAoCurso || nomeEsperado;
        });
        if (!projetoDoc) throw new Error("O projeto Yellow Belt associado ao curso não foi encontrado.");
        const projetoDados = projetoDoc.data() as any;
        projetoGratis = {
          projeto: projetoDoc.id,
          nome: String(projetoDados.name || configuracaoGratis.projetoNome),
          vencimento: validadeGratis,
          valor: 0,
        };
      }

      let uid = "";
      let senhaProvisoria = "";
      let novo = false;
      try {
        uid = (await adminAuth().getUserByEmail(email)).uid;
        await adminAuth().updateUser(uid, { displayName: nome });
      } catch (err: any) {
        if (err?.code !== "auth/user-not-found") throw err;
        senhaProvisoria = gerarSenhaProvisoria();
        uid = (await adminAuth().createUser({ email, password: senhaProvisoria, displayName: nome })).uid;
        novo = true;
      }

      const ref = adminFirestore().collection("users").doc(uid);
      const snap = await ref.get();
      const base = snap.exists ? (snap.data() as any) : {};
      const vinculos = { ...(base.vinculos || {}) };
      const anterior = { ...(vinculos[consultorId] || (base.consultorId === consultorId ? base : {})) };
      const cursosAnteriores = Array.isArray(anterior.cursosAcesso) ? anterior.cursosAcesso : [];
      const cursosAcesso = [...cursosAnteriores.filter((item: any) => normalizarNomeLanding(item?.curso) !== normalizarNomeLanding(curso)), { curso, vencimento: validadeGratis, valor: 0, quantidade: 1 }];
      const analyticsAnteriores = Array.isArray(anterior.acessoProdutos?.analytics) ? anterior.acessoProdutos.analytics : [];
      const modulosGratis = new Set(analyticsGratis.map((item) => item.modulo));
      const analyticsAcesso = [
        ...analyticsAnteriores.filter((item: any) => !modulosGratis.has(String(typeof item === "string" ? item : item?.modulo || item?.id || "").trim())),
        ...analyticsGratis,
      ];
      const projetosAnteriores = Array.isArray(anterior.projetosAcesso) ? anterior.projetosAcesso : [];
      const projetosAcesso = projetoGratis
        ? [
            ...projetosAnteriores.filter((item: any) => String(typeof item === "string" ? item : item?.projeto || item?.projetoId || "").trim() !== projetoGratis?.projeto),
            projetoGratis,
          ]
        : projetosAnteriores;
      const projetosAcessoConfigurado = projetoGratis ? true : anterior.projetosAcessoConfigurado === true;
      const vinculo = {
        ...anterior,
        tipoUsuario: anterior.tipoUsuario === "consultor" || anterior.tipoUsuario === "coordenador" ? anterior.tipoUsuario : "aluno",
        consultorId, plano: "por_curso", modeloAcesso: "por_curso", cursosAcesso,
        cursosLiberados: cursosAcesso.map((item: any) => item.curso),
        acessoProdutos: { ...(anterior.acessoProdutos || {}), analytics: analyticsAcesso },
        projetosAcesso,
        projetosAcessoConfigurado,
        origem: anterior.origem || `landing-${produto}`, ultimoCadastroGratisEm: agora,
        profissao, interesseCurso, interesseCursos, whatsapp,
        consentimentos: { ...(anterior.consentimentos || {}), termosTreinamentoGratuito: consentimentoGratuito },
      };
      if (base.consultorId && !vinculos[base.consultorId]) {
        vinculos[base.consultorId] = { tipoUsuario: base.tipoUsuario || "aluno", consultorId: base.consultorId, plano: base.plano || "gratuito", cursosAcesso: base.cursosAcesso || [], acessoProdutos: base.acessoProdutos || {} };
      }
      vinculos[consultorId] = vinculo;
      const consultorIds = Array.from(new Set([...(Array.isArray(base.consultorIds) ? base.consultorIds : []), base.consultorId, consultorId].filter(Boolean)));
      const preservarPrincipal = !!base.consultorId && String(base.consultorId) !== consultorId;
      await ref.set({
        uid, email, nome: nome || base.nome || "", profissao, interesseCurso, interesseCursos, whatsapp,
        tipoUsuario: base.tipoUsuario === "admin" || base.tipoUsuario === "coordenador" || base.tipoUsuario === "consultor" ? base.tipoUsuario : "aluno",
        consultorId: preservarPrincipal ? base.consultorId : consultorId, consultorIds, vinculos,
        ...(preservarPrincipal ? {} : { plano: "por_curso", modeloAcesso: "por_curso", cursosAcesso, cursosLiberados: cursosAcesso.map((item: any) => item.curso), acessoProdutos: vinculo.acessoProdutos, projetosAcesso: vinculo.projetosAcesso, projetosAcessoConfigurado: vinculo.projetosAcessoConfigurado }),
        origem: base.origem || `landing-${produto}`,
        formacoes: Array.from(new Set([...(Array.isArray(base.formacoes) ? base.formacoes : []), produto])),
        consentimentos: { ...(base.consentimentos || {}), termosTreinamentoGratuito: consentimentoGratuito },
        creditoIA: base.creditoIA || { limite: 100, usado: 0, resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() },
        criadoEm: base.criadoEm || agora, ...(novo ? { senhaProvisoria: true } : {}),
      }, { merge: true });

      let emailEnviado = false;
      const site = `https://${consultorId}.educacaopelotrabalho.com`;
      const primeiroNome = nome.split(/\s+/)[0].replace(/[<>&]/g, "");
      if (produto === "estatistica-aplicada" || produto === "yellow-belt-gratis") {
        const credenciaisEstatistica = novo
          ? `<div style="background:#F0F2FA;border-left:4px solid #2563EB;padding:16px 18px;margin:22px 0"><strong>Seus dados de acesso</strong><br>E-mail: <strong>${email}</strong><br>Senha provisória: <code style="background:#fff;padding:3px 6px;border-radius:4px">${senhaProvisoria}</code><br><small>No primeiro acesso, você criará sua senha definitiva.</small></div>`
          : `<div style="background:#F0F2FA;border-left:4px solid #2563EB;padding:16px 18px;margin:22px 0"><strong>Como entrar</strong><br>Use o e-mail <strong>${email}</strong> e a senha que você já utiliza na plataforma.</div>`;
        const itensEstatistica = [
          `Curso ${configuracaoGratis.curso}`,
          ...configuracaoGratis.analytics.map((item) => `Data Analysis - módulo ${item.nome}`),
          ...(projetoGratis ? [`Projeto ${projetoGratis.nome} com ferramentas da qualidade e templates prontos`] : []),
          "IA digital do Israel para apoiar o uso das ferramentas liberadas",
          "Participação na comunidade LBW",
          produto === "yellow-belt-gratis"
            ? "Certificado de conclusão do curso após cumprir 70% dos vídeos, obter 70% na avaliação e enviar o depoimento; a certificação do projeto não está incluída"
            : "Certificado após cumprir 70% dos vídeos, obter 70% na avaliação e enviar o depoimento",
          "Acesso válido até 31 de dezembro de 2026",
        ].map((item) => `<li style="margin-bottom:6px">${item}</li>`).join("");
        const htmlEstatistica = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#F4F7FB;font-family:Arial,Helvetica,sans-serif;color:#273142"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F4F7FB"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #D9E0EA"><tr><td style="background:#1E2D6E;color:#fff;padding:28px 30px"><h1 style="margin:0;font-size:24px;line-height:1.25">Seu acesso gratuito foi liberado</h1><p style="margin:8px 0 0;font-size:15px;color:#DCE6FF">LBW - Educação pelo Trabalho</p></td></tr><tr><td style="padding:30px;font-size:16px;line-height:1.55"><p style="margin:0 0 16px">Olá, ${primeiroNome}!</p><p style="margin:0 0 16px">Você recebeu gratuitamente o pacote <strong>${configuracaoGratis.nomePacote}</strong>.</p><ul style="margin:0 0 22px;padding-left:22px">${itensEstatistica}</ul>${credenciaisEstatistica}<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:26px auto"><tr><td align="center" bgcolor="#2563EB" style="border-radius:8px;background:#2563EB"><a href="${site}" style="display:inline-block;background:#2563EB;border:1px solid #2563EB;border-radius:8px;color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px">Acessar a plataforma -&gt;</a></td></tr></table><p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#64748B">Se você não solicitou este acesso, ignore este e-mail.</p></td></tr></table></td></tr></table></body></html>`;
        try { emailEnviado = (await resendSend({ to: email, subject: `Seu acesso gratuito a ${configuracaoGratis.nomePacote}`, html: htmlEstatistica })).ok; } catch (err) { console.error("[public/acesso-gratis] falha e-mail:", err); }
        return res.json({ ok: true, status: novo ? "criado" : "atualizado", uid, email, emailEnviado, acesso: { curso, analytics: analyticsGratis.map((item) => item.modulo), projetos: projetoGratis ? [projetoGratis.projeto] : [] } });
      }
      const credenciais = novo
        ? `<div style="background:#F0F2FA;border-left:4px solid #2563EB;padding:16px 18px;margin:22px 0"><strong>Seus dados de acesso</strong><br>E-mail: <strong>${email}</strong><br>Senha provisória: <code style="background:#fff;padding:3px 6px;border-radius:4px">${senhaProvisoria}</code><br><small>No primeiro acesso, você criará sua senha definitiva.</small></div>`
        : `<div style="background:#F0F2FA;border-left:4px solid #2563EB;padding:16px 18px;margin:22px 0"><strong>Como entrar</strong><br>Use o e-mail <strong>${email}</strong> e a senha que você já utiliza na plataforma.</div>`;
      const html = `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:0;background:#F4F7FB;font-family:Arial,Helvetica,sans-serif;color:#273142"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F4F7FB"><tr><td align="center" style="padding:24px 12px"><table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #D9E0EA"><tr><td style="background:#1E2D6E;color:#fff;padding:28px 30px"><h1 style="margin:0;font-size:24px;line-height:1.25">Seu acesso gratuito foi liberado</h1><p style="margin:8px 0 0;font-size:15px;color:#DCE6FF">LBW \u2014 Educa\u00e7\u00e3o pelo Trabalho</p></td></tr><tr><td style="padding:30px;font-size:16px;line-height:1.55"><p style="margin:0 0 16px">Ol\u00e1, ${primeiroNome}!</p><p style="margin:0 0 16px">Voc\u00ea recebeu gratuitamente o pacote <strong>Capabilidade de Processo</strong>.</p><ul style="margin:0 0 22px;padding-left:22px"><li style="margin-bottom:6px">Curso Capabilidade de Processo</li><li style="margin-bottom:6px">Data Analysis \u2014 m\u00f3dulo Capabilidade</li><li>IA digital do Israel para apoiar o uso das ferramentas liberadas</li></ul>${credenciais}<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:26px auto"><tr><td align="center" bgcolor="#2563EB" style="border-radius:8px;background:#2563EB"><a href="${site}" style="display:inline-block;background:#2563EB;border:1px solid #2563EB;border-radius:8px;color:#FFFFFF;font-size:16px;font-weight:bold;text-decoration:none;padding:14px 28px">Acessar a plataforma \u2192</a></td></tr></table><p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#64748B">Se voc\u00ea n\u00e3o solicitou este acesso, ignore este e-mail.</p></td></tr></table></td></tr></table></body></html>`;
      const htmlAtualizado = html.replaceAll("Capabilidade de Processo", "Capabilidade de Processo Avançado");
      try { emailEnviado = (await resendSend({ to: email, subject: "Seu acesso gratuito \u00e0 Capabilidade de Processo Avançado", html: htmlAtualizado })).ok; } catch (err) { console.error("[public/acesso-gratis] falha e-mail:", err); }
      return res.json({ ok: true, status: novo ? "criado" : "atualizado", uid, email, emailEnviado, acesso: { curso, analytics: analyticsGratis.map((item) => item.modulo) } });
    } catch (err: any) {
      console.error("[POST /api/public/acesso-gratis] erro:", err?.message || err);
      return res.status(500).json({ error: err?.message || "Não foi possível liberar o acesso agora." });
    }
  });

  app.delete("/api/aluno/:uid", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });
    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Autenticação obrigatória." });
    let callerUid: string;
    try { callerUid = (await adminAuth().verifyIdToken(idToken)).uid; }
    catch { return res.status(401).json({ error: "Token inválido." }); }

    try {
      const [callerSnap, targetSnap] = await Promise.all([
        adminFirestore().collection("users").doc(callerUid).get(),
        adminFirestore().collection("users").doc(String(req.params.uid || "")).get(),
      ]);
      if (!targetSnap.exists) return res.status(404).json({ error: "Aluno não encontrado." });
      const caller = callerSnap.exists ? (callerSnap.data() as any) : {};
      const target = targetSnap.data() as any;
      const callerEhAdmin = ["israelnz2018@hotmail.com", "israel@learningbyworking.com"]
        .includes(String(caller.email || "").toLowerCase());
      const callerEhConsultor = caller.tipoUsuario === "consultor";
      const callerEhCoordenador = caller.tipoUsuario === "coordenador";
      if (!callerEhAdmin && !callerEhConsultor && !callerEhCoordenador) {
        return res.status(403).json({ error: "Só consultor ou admin pode remover aluno." });
      }
      if (["admin", "consultor", "coordenador"].includes(String(target.tipoUsuario || ""))) {
        return res.status(400).json({ error: "Este usuário não é aluno." });
      }
      const consultorId = String(caller.consultorId || "israel");
      if (callerEhCoordenador) {
        const callerEmpresaId = String(caller.empresaId || "");
        if (!callerEmpresaId || String(target.empresaId || "") !== callerEmpresaId) {
          return res.status(403).json({ error: "Este aluno nao pertence ao seu time." });
        }
      }
      if (!callerEhAdmin && String(target.consultorId || "israel") !== consultorId) {
        return res.status(403).json({ error: "Este aluno não pertence ao seu ambiente." });
      }

      const bloqueadoEm = new Date().toISOString();
      const consultorNome = String(caller.nome || caller.displayName || caller.email || "seu consultor");
      const avisoBloqueio = {
        tipo: "acesso_bloqueado",
        titulo: "Seu acesso foi bloqueado",
        mensagem: "Seu acesso aos conteudos deste consultor foi bloqueado. Seus dados, historico e projetos permanecem preservados na plataforma e ficarao disponiveis por ate 3 meses.",
        consultorId: String(target.consultorId || consultorId),
        consultorNome,
        criadoEm: bloqueadoEm,
        expiraEm: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        lida: false,
      };

      await targetSnap.ref.update({
        consultorId: "__sem_consultor__",
        empresaId: admin.firestore.FieldValue.delete(),
        empresaNome: admin.firestore.FieldValue.delete(),
        cursosAcesso: [],
        cursosLiberados: admin.firestore.FieldValue.delete(),
        formacoes: [],
        plano: "gratuito",
        valorPago: 0,
        desvinculadoDe: String(target.consultorId || consultorId),
        desvinculadoEm: bloqueadoEm,
        avisoBloqueio,
      });
      let emailEnviado = false;
      if (target.email) {
        emailEnviado = await sendAlunoBloqueadoEmail({
          para: String(target.email),
          nome: String(target.nome || target.displayName || ""),
          consultorNome,
        });
      }
      return res.json({ ok: true, uid: targetSnap.id, emailEnviado });
    } catch (err: any) {
      console.error("[DELETE /api/aluno/:uid] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao remover aluno." });
    }
  });

  // DELETE /api/coordenador/:uid — remove o coordenador do tenant sem apagar a conta Auth
  // (mesmo padrao do DELETE /api/aluno/:uid: reversivel, dados preservados por 3 meses).
  // Em cascata, bloqueia tambem os alunos do time desse coordenador (mesmo empresaId),
  // pois sem coordenador o time fica orfao — obedece a hierarquia coordenador -> aluno.
  app.delete("/api/coordenador/:uid", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin não configurado." });
    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Autenticação obrigatória." });
    let callerUid: string;
    try { callerUid = (await adminAuth().verifyIdToken(idToken)).uid; }
    catch { return res.status(401).json({ error: "Token inválido." }); }

    try {
      const [callerSnap, targetSnap] = await Promise.all([
        adminFirestore().collection("users").doc(callerUid).get(),
        adminFirestore().collection("users").doc(String(req.params.uid || "")).get(),
      ]);
      if (!targetSnap.exists) return res.status(404).json({ error: "Coordenador não encontrado." });
      const caller = callerSnap.exists ? (callerSnap.data() as any) : {};
      const target = targetSnap.data() as any;
      const callerEhAdmin = ["israelnz2018@hotmail.com", "israel@learningbyworking.com"]
        .includes(String(caller.email || "").toLowerCase());
      const callerEhConsultor = caller.tipoUsuario === "consultor";
      if (!callerEhAdmin && !callerEhConsultor) {
        return res.status(403).json({ error: "Só o consultor ou admin pode remover coordenador." });
      }
      if (String(target.tipoUsuario || "") !== "coordenador") {
        return res.status(400).json({ error: "Este usuário não é coordenador." });
      }
      const consultorId = String(caller.consultorId || "israel");
      if (!callerEhAdmin && String(target.consultorId || "israel") !== consultorId) {
        return res.status(403).json({ error: "Este coordenador não pertence ao seu ambiente." });
      }

      const bloqueadoEm = new Date().toISOString();
      const consultorNome = String(caller.nome || caller.displayName || caller.email || "seu consultor");
      const targetConsultorId = String(target.consultorId || consultorId);
      const avisoBloqueioCoord = {
        tipo: "acesso_bloqueado",
        titulo: "Seu acesso foi bloqueado",
        mensagem: "Seu acesso como coordenador deste ambiente foi bloqueado. Seus dados, historico e time permanecem preservados na plataforma e ficarao disponiveis por ate 3 meses.",
        consultorId: targetConsultorId,
        consultorNome,
        criadoEm: bloqueadoEm,
        expiraEm: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
        lida: false,
      };

      await targetSnap.ref.update({
        consultorId: "__sem_consultor__",
        cursosAcesso: [],
        maxAlunos: 0,
        valorPago: 0,
        desvinculadoDe: targetConsultorId,
        desvinculadoEm: bloqueadoEm,
        avisoBloqueio: avisoBloqueioCoord,
      });

      // Cascata: bloqueia o time (alunos com o mesmo empresaId) — sem coordenador,
      // o time nao pode ficar com acesso ativo (obedece a hierarquia).
      const empresaId = String(target.empresaId || "");
      let timeBloqueado = 0;
      if (empresaId) {
        const timeSnap = await adminFirestore().collection("users")
          .where("consultorId", "==", targetConsultorId)
          .where("empresaId", "==", empresaId)
          .get();
        const avisoBloqueioTime = {
          tipo: "acesso_bloqueado",
          titulo: "Seu acesso foi bloqueado",
          mensagem: "Seu acesso aos conteudos deste consultor foi bloqueado porque o seu coordenador foi removido. Seus dados, historico e projetos permanecem preservados na plataforma e ficarao disponiveis por ate 3 meses.",
          consultorId: targetConsultorId,
          consultorNome,
          criadoEm: bloqueadoEm,
          expiraEm: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          lida: false,
        };
        const batch = adminFirestore().batch();
        for (const alunoDoc of timeSnap.docs) {
          const aluno = alunoDoc.data() as any;
          if (["admin", "consultor", "coordenador"].includes(String(aluno.tipoUsuario || ""))) continue;
          batch.update(alunoDoc.ref, {
            consultorId: "__sem_consultor__",
            empresaId: admin.firestore.FieldValue.delete(),
            empresaNome: admin.firestore.FieldValue.delete(),
            cursosAcesso: [],
            cursosLiberados: admin.firestore.FieldValue.delete(),
            formacoes: [],
            plano: "gratuito",
            valorPago: 0,
            desvinculadoDe: targetConsultorId,
            desvinculadoEm: bloqueadoEm,
            avisoBloqueio: avisoBloqueioTime,
          });
          timeBloqueado++;
          if (aluno.email) {
            sendAlunoBloqueadoEmail({ para: String(aluno.email), nome: String(aluno.nome || aluno.displayName || ""), consultorNome }).catch(() => {});
          }
        }
        if (timeBloqueado > 0) await batch.commit();
      }

      let emailEnviado = false;
      if (target.email) {
        emailEnviado = await sendAlunoBloqueadoEmail({
          para: String(target.email),
          nome: String(target.nome || target.displayName || ""),
          consultorNome,
        });
      }
      return res.json({ ok: true, uid: targetSnap.id, emailEnviado, timeBloqueado });
    } catch (err: any) {
      console.error("[DELETE /api/coordenador/:uid] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao remover coordenador." });
    }
  });

  // DELETE /api/aluno/:uid/definitivo — apaga a conta e dados do aluno somente
  // depois de 90 dias da desvinculacao. A primeira remocao preserva tudo.
  app.delete("/api/aluno/:uid/definitivo", async (req: any, res) => {
    if (!isAdminReady()) return res.status(503).json({ error: "Firebase Admin nao configurado." });
    const header = req.headers.authorization || "";
    const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!idToken) return res.status(401).json({ error: "Autenticacao obrigatoria." });
    let callerUid: string;
    try { callerUid = (await adminAuth().verifyIdToken(idToken)).uid; }
    catch { return res.status(401).json({ error: "Token invalido." }); }

    const deleteQueryDocs = async (collectionName: string, field: string, value: string): Promise<number> => {
      const snap = await adminFirestore().collection(collectionName).where(field, "==", value).get();
      let count = 0;
      for (let i = 0; i < snap.docs.length; i += 450) {
        const batch = adminFirestore().batch();
        snap.docs.slice(i, i + 450).forEach((d) => { batch.delete(d.ref); count += 1; });
        await batch.commit();
      }
      return count;
    };

    try {
      const uid = String(req.params.uid || "");
      const [callerSnap, targetSnap] = await Promise.all([
        adminFirestore().collection("users").doc(callerUid).get(),
        adminFirestore().collection("users").doc(uid).get(),
      ]);
      if (!targetSnap.exists) return res.status(404).json({ error: "Aluno nao encontrado." });

      const caller = callerSnap.exists ? (callerSnap.data() as any) : {};
      const target = targetSnap.data() as any;
      const callerEhAdmin = ["israelnz2018@hotmail.com", "israel@learningbyworking.com"]
        .includes(String(caller.email || "").toLowerCase());
      const callerEhConsultor = caller.tipoUsuario === "consultor";
      if (!callerEhAdmin && !callerEhConsultor) {
        return res.status(403).json({ error: "So consultor ou admin pode excluir aluno definitivamente." });
      }
      if (["admin", "consultor", "coordenador"].includes(String(target.tipoUsuario || ""))) {
        return res.status(400).json({ error: "Este usuario nao e aluno." });
      }
      const consultorId = String(caller.consultorId || "israel");
      const donoOriginal = String(target.desvinculadoDe || target.avisoBloqueio?.consultorId || "");
      if (!callerEhAdmin && donoOriginal !== consultorId) {
        return res.status(403).json({ error: "Este aluno nao foi removido do seu ambiente." });
      }
      if (String(target.consultorId || "") !== "__sem_consultor__" || !target.desvinculadoEm) {
        return res.status(400).json({ error: "Remova/bloqueie o aluno antes da exclusao definitiva." });
      }
      const desvinculadoMs = new Date(String(target.desvinculadoEm)).getTime();
      const limiteMs = 90 * 24 * 60 * 60 * 1000;
      if (!desvinculadoMs || Number.isNaN(desvinculadoMs) || Date.now() - desvinculadoMs < limiteMs) {
        return res.status(400).json({ error: "A exclusao definitiva so fica disponivel apos 3 meses do bloqueio." });
      }

      const projectSnap = await adminFirestore().collection("projects").where("ownerUid", "==", uid).get();
      let projectDataDeleted = 0;
      for (const p of projectSnap.docs) {
        const dataSnap = await p.ref.collection("data").get();
        for (let i = 0; i < dataSnap.docs.length; i += 450) {
          const batch = adminFirestore().batch();
          dataSnap.docs.slice(i, i + 450).forEach((d) => { batch.delete(d.ref); projectDataDeleted += 1; });
          await batch.commit();
        }
      }
      let projectsDeleted = 0;
      for (let i = 0; i < projectSnap.docs.length; i += 450) {
        const batch = adminFirestore().batch();
        projectSnap.docs.slice(i, i + 450).forEach((d) => { batch.delete(d.ref); projectsDeleted += 1; });
        await batch.commit();
      }

      const [mentorDeleted, pendingDeleted] = await Promise.all([
        deleteQueryDocs("mentor_conversations", "userId", uid),
        deleteQueryDocs("pending_questions", "userId", uid),
      ]);
      await Promise.allSettled([
        adminFirestore().collection("userProgress").doc(uid).delete(),
        adminFirestore().collection("users").doc(uid).delete(),
        adminAuth().deleteUser(uid),
      ]);

      return res.json({
        ok: true,
        uid,
        removidos: { projects: projectsDeleted, projectData: projectDataDeleted, mentorConversations: mentorDeleted, pendingQuestions: pendingDeleted, userProgress: 1, user: 1, auth: 1 },
      });
    } catch (err: any) {
      console.error("[DELETE /api/aluno/:uid/definitivo] erro:", err);
      return res.status(500).json({ error: err?.message || "Erro ao excluir aluno definitivamente." });
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
          "Você usa o Esforço × Benefício pra decidir o que fazer primeiro, monta um Plano de Ação que sai do papel, e registra o Antes × Depois, a prova concreta de que a melhoria funcionou. É isso que faz o chefe olhar e falar 'olha o que mudou'.\n\n" +
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
    // PAGO (8 e-mails, dias 13→62) — comprador do completo que já passou dos 7 dias.
    // Ritmo semanal: UM e-mail por trilha (Trilha 1 a 8), pra ir revelando a jornada
    // inteira. Os dias contam a partir da COMPRA (criadoEm). Sem travessões, tom
    // Carta do Israel. Conteúdo por trilha definido pelo Israel (17/jul/2026).
    pago: [
      // 1 — TRILHA 1: melhoria no dia a dia (entender > achar > resolver)
      {
        dia: 13, ativo: true,
        assunto: "O ciclo que resolve qualquer problema",
        corpo:
          "[titulo: Trilha 1: gerar melhoria no dia a dia]\n\n" +
          "Oi {nome},\n\n" +
          "Você já começou pela Trilha 1, e ela é a base de tudo o que vem depois. Vale relembrar o poder dela.\n\n" +
          "O que a Trilha 1 te dá é um jeito de gerar melhoria no dia a dia seguindo um fluxo simples e infalível: primeiro entender como sua área funciona, depois achar o problema que realmente merece atenção, e por fim resolver esse problema de verdade.\n\n" +
          "Parece óbvio, mas quase ninguém faz nessa ordem. É essa sequência que separa quem vive apagando incêndio de quem entrega resultado que aparece.\n\n" +
          "[botao: Revisar a Trilha 1 | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Toda vez que bater um problema no trabalho, lembra do fluxo: entender, achar, resolver. Funciona sempre.",
      },
      // 2 — TRILHA 2: dados geram insights e recomendações (trabalho de analista)
      {
        dia: 20, ativo: true,
        assunto: "Vire o analista de dados da sua área",
        corpo:
          "[titulo: Trilha 2: insights e recomendações só com dados]\n\n" +
          "Oi {nome},\n\n" +
          "Tem um tipo de valor que você gera sem precisar de projeto nenhum: olhar pros dados que já existem e tirar deles insights e recomendações que ninguém mais viu.\n\n" +
          "É exatamente o que faz um analista de dados, e a Trilha 2 te ensina a fazer o mesmo, sem programar. Você pega os números da sua área, encontra o padrão, e chega com uma recomendação embasada em vez de achismo.\n\n" +
          "É um trabalho muito parecido com o de quem ganha bem pra analisar dados, só que aplicado direto no seu contexto e no seu problema.\n\n" +
          "[botao: Começar a Trilha 2 | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Não precisa de um projeto formal. Um bom insight tirado dos dados certos já muda como te enxergam.",
      },
      // 3 — TRILHA 3: mudanças (ADKAR + ferramenta de acompanhamento por fases)
      {
        dia: 27, ativo: true,
        assunto: "Ter razão não basta. Precisa convencer",
        corpo:
          "[titulo: Trilha 3: conduzir mudança de verdade]\n\n" +
          "Oi {nome},\n\n" +
          "A melhor recomendação do mundo não vale nada se as pessoas não embarcam nela. É aí que quase todo bom técnico trava.\n\n" +
          "A Trilha 3 te ensina o método ADKAR pra conduzir mudança, e o melhor: dentro da plataforma você tem uma ferramenta que acompanha cada mudança por fases, mostrando onde cada pessoa está no processo de aceitar aquilo.\n\n" +
          "Isso é o que faz a diferença entre empurrar uma ideia goela abaixo e realmente convencer as pessoas a irem junto. Convencer gente é uma habilidade, e essa trilha te dá o mapa.\n\n" +
          "[botao: Começar a Trilha 3 | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Acompanhar a mudança por fases muda tudo. Você para de adivinhar e passa a saber quem já está com você.",
      },
      // 4 — TRILHA 4: apresentações (essencial pra conversar com liderança)
      {
        dia: 34, ativo: true,
        assunto: "Sem apresentação, sua ideia morre na mesa",
        corpo:
          "[titulo: Trilha 4: apresentar pra liderança]\n\n" +
          "Oi {nome},\n\n" +
          "Existe uma verdade dura do mundo corporativo: a decisão passa pela liderança, e a liderança decide pelo que vê numa apresentação. Não pelo trabalho que você fez escondido.\n\n" +
          "A Trilha 4 te ensina a apresentar de um jeito que convence, e ela é essencial em dois momentos: na hora de defender qual projeto de melhoria vale a pena atacar, e na hora de aprovar as recomendações que saíram da sua análise.\n\n" +
          "É o que garante que o seu trabalho técnico não fique preso na sua gaveta, e sim vire decisão aprovada lá em cima.\n\n" +
          "[botao: Começar a Trilha 4 | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Você pode ter a melhor análise da empresa. Se não souber apresentar, alguém pior que você leva o crédito.",
      },
      // 5 — TRILHA 5: PMI riscos (subjetivo) + FMEA (objetivo/técnico)
      {
        dia: 41, ativo: true,
        assunto: "Antecipe o problema antes dele acontecer",
        corpo:
          "[titulo: Trilha 5: riscos, do PMI ao FMEA]\n\n" +
          "Oi {nome},\n\n" +
          "Quem só corre atrás de problema depois que ele explode sempre vai estar atrasado. A Trilha 5 te ensina a enxergar o risco antes.\n\n" +
          "Ela cobre dois lados. De um lado, as boas práticas de risco do PMI, mais amplas e um pouco mais subjetivas, pra você pensar risco em qualquer projeto. Do outro, o FMEA, que é mais objetivo e técnico: uma forma estruturada de listar o que pode dar errado, o quanto é grave, e o que fazer antes.\n\n" +
          "Juntas, essas duas visões te dão algo raro: a capacidade de prever o problema e agir antes que ele custe caro.\n\n" +
          "[botao: Começar a Trilha 5 | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. FMEA parece burocrático até você evitar o primeiro desastre com ele. Aí você não larga mais.",
      },
      // 6 — TRILHA 6: Lean / TPS / Muda, Mura, Muri
      {
        dia: 48, ativo: true,
        assunto: "A cultura que o mundo inteiro copia da Toyota",
        corpo:
          "[titulo: Trilha 6: cultura Lean]\n\n" +
          "Oi {nome},\n\n" +
          "Tem uma forma de pensar que nasceu na Toyota e hoje empresas do mundo inteiro estão adotando: o Lean, o Sistema Toyota de Produção.\n\n" +
          "A Trilha 6 te ensina a enxergar e eliminar os três inimigos da eficiência: Muda (o desperdício), Mura (a irregularidade) e Muri (a sobrecarga). Depois que você aprende a ver isso, não desliga mais: começa a enxergar desperdício em todo processo por onde passa.\n\n" +
          "Não é teoria japonesa distante. É uma cultura prática que as melhores empresas estão adorando justamente porque funciona, e quem domina isso vira peça valiosa em qualquer operação.\n\n" +
          "[botao: Começar a Trilha 6 | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Muda, Mura e Muri. Depois dessa trilha, você vai reparar nos três no seu trabalho já na primeira semana.",
      },
      // 7 — TRILHA 7: estatística (hipótese, regressão, MSA, SPC, capabilidade)
      {
        dia: 55, ativo: true,
        assunto: "A estatística que prova que você tem razão",
        corpo:
          "[titulo: Trilha 7: estatística aplicada]\n\n" +
          "Oi {nome},\n\n" +
          "Essa é a trilha que te dá o rigor que poucos têm. Um arsenal de ferramentas estatísticas prontas pra usar: teste de hipótese, regressão, estatística básica, MSA, SPC, capabilidade (Cp, Cpk) e mais.\n\n" +
          "E o melhor é a flexibilidade. Você pode fazer um estudo pontual, só pra responder uma pergunta específica com dados de verdade. Ou pode encaixar essas ferramentas dentro das análises de um projeto de melhoria maior, pra provar cada passo com número.\n\n" +
          "A plataforma faz a conta pra você. O que você ganha é a capacidade de dizer 'isso funciona, e eu provo' em vez de 'eu acho que funciona'.\n\n" +
          "[botao: Começar a Trilha 7 | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Não precisa ser matemático. Precisa saber qual ferramenta usar e o que o resultado quer dizer. É isso que a trilha entrega.",
      },
      // 8 — TRILHA 8: especialista em solução de problemas (o completo, futuro consultoria)
      {
        dia: 62, ativo: true,
        assunto: "O especialista que resolve o que ninguém resolve",
        corpo:
          "[titulo: Trilha 8: vire o especialista completo]\n\n" +
          "Oi {nome},\n\n" +
          "Aqui é onde tudo se junta. A Trilha 8 te forma como especialista em solução de problemas, administrativos e de fábrica, capaz de resolver não só os da sua área, mas de áreas que você nunca conheceu antes.\n\n" +
          "Esse é o profissional raro: a pessoa que a empresa chama quando ninguém mais sabe o que fazer. Que entra numa operação estranha, entende rápido, acha a causa e entrega a solução. Com tudo o que você aprendeu nas trilhas anteriores, você tem exatamente esse repertório.\n\n" +
          "E olha até onde isso pode ir: se você quiser, o futuro é a consultoria. Resolver problema dos outros, no seu tempo, cobrando bem por isso. Essa formação te dá a base pra chegar lá.\n\n" +
          "[botao: Chegar ao topo | " + APP_URL + "]\n\n" +
          "Israel\n\n" +
          "P.S. Você começou querendo se virar numa área nova. Terminou capaz de resolver o problema de qualquer empresa. Foi uma honra te acompanhar.",
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

  // Nº do dia de calendário no fuso da NOVA ZELÂNDIA (dias desde a epoch, na TZ NZ).
  // Usado pra contar a régua no MESMO fuso em que o motor dispara (23:59 NZ), pra
  // "1 disparo diário = +1 dia = 1 e-mail", sem descompasso de fuso.
  function diaCalendarioNZ(ms: number): number {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit",
    });
    const p: Record<string, string> = {};
    for (const part of fmt.formatToParts(new Date(ms))) p[part.type] = part.value;
    // usa Date.UTC só pra transformar a data-calendário NZ num nº de dia estável
    return Math.floor(Date.UTC(+p.year, +p.month - 1, +p.day) / (24 * 3600 * 1000));
  }
  // Dias de calendário (fuso NZ) entre a régua e hoje. Virou o dia na NZ = +1,
  // independente da HORA que a régua começou. Corrige o atraso de 1 dia que
  // existia quando se contava 24h exatas.
  function diasDesde(iso: string): number {
    const t = Date.parse(iso);
    if (isNaN(t)) return -1;
    return diaCalendarioNZ(Date.now()) - diaCalendarioNZ(t);
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
  // Nome do curso da Trilha 1 (mesma string do PACOTE_KIT90_NOME do webhook).
  const CURSO_TRILHA1 = "Como Resolver Problemas no Trabalho - Kit 90 dias";
  // A pessoa tem MESMO a Trilha 1? Olha a lista de cursos liberados, nos dois
  // formatos que convivem hoje: cursosLiberados (nomes) e cursosAcesso (objetos).
  // Normaliza porque o mesmo curso aparece com caixa diferente entre registros
  // ("Estatística Aplicada..." e "Estatística aplicada...").
  function temCursoTrilha1(u: any): boolean {
    const semAcento = (v: unknown) =>
      String(v || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const alvo = semAcento(CURSO_TRILHA1);
    const nomes = [
      ...(Array.isArray(u?.cursosLiberados) ? u.cursosLiberados : []),
      ...(Array.isArray(u?.cursosAcesso) ? u.cursosAcesso.map((c: any) => c?.curso) : []),
    ];
    return nomes.some((n) => semAcento(n) === alvo);
  }
  // videosPorUid: mapa uid → nº de vídeos assistidos (de userProgress). Opcional:
  // se não vier, trata todo Trilha 1 como "gratis" (novo) — fallback seguro.
  function classificarSequencia(u: any, videosPorUid?: Record<string, number>): "gratis" | "gratisEngajado" | "pago7" | "pago" | null {
    if (!u || !u.email) return null;
    if (u.tipoUsuario === "admin" || u.tipoUsuario === "coordenador") return null;
    // A sequência é decidida pelo PRODUTO que a pessoa tem, não por ter pago:
    //   - Tem só a Trilha 1 (comprou o Kit 90 OU ganhou de cortesia) → aba "Trilha 1"
    //   - Tem o Completo (comprou OU ganhou de cortesia)             → aba "Completo"
    if (u.plano !== "completo") {
      // As sequências "gratis" e "gratisEngajado" falam SÓ da Trilha 1 (Kit 90
      // Dias): citam as fases dela e mandam abrir aquele conteúdo. Antes bastava
      // não ser "completo" pra cair aqui — o que fazia sentido quando só
      // existiam dois produtos. Com os cursos avulsos e o modelo por_curso,
      // isso passou a mandar a régua do Kit 90 para 102 de 110 usuários, sendo
      // que só 1 tinha o curso. Quem entrou pelo grátis de Estatística Aplicada
      // recebia e-mail mandando abrir fases que ele nem tem acesso.
      // Agora só entra quem REALMENTE tem a Trilha 1. Os demais ficam sem
      // sequência até existirem réguas por curso.
      if (!temCursoTrilha1(u)) return null;
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
  // LIGADO POR PADRÃO (decisão do Israel, 17/jul/2026 — prevalece sobre a decisão
  // antiga de "OFF por padrão"): o motor roda sozinho às 23:59 NZ, sem depender de
  // env var. A segurança agora é POR ESTÁGIO: só dispara os estágios ligados em
  // config/marketingEstagiosAtivos (hoje: só 'gratis' = Trilha 1 novo). Os grupos
  // engajado/completo ficam OFF até o Israel liberar pela tela.
  // FREIO DE EMERGÊNCIA: setar MOTOR_EMAIL_PAUSADO=true no Railway pausa TUDO na hora.
  const MOTOR_ATIVO = String(process.env.MOTOR_EMAIL_PAUSADO || "").toLowerCase() !== "true";
  if (!MOTOR_ATIVO) {
    console.warn("[motor-email] PAUSADO (MOTOR_EMAIL_PAUSADO=true) — nenhum envio automático até remover a flag.");
  } else {
    console.log("[motor-email] ATIVO — dispara 23:59 NZ os estágios ligados (config/marketingEstagiosAtivos).");
  }
  // Agendador no fuso da NOVA ZELÂNDIA (Pacific/Auckland). Dispara 1x/dia às
  // ~23:59 horário local NZ (trata horário de verão sozinho via Intl). Checa a
  // cada 10 min; quando a hora local NZ é 23 e ainda não rodou HOJE (dia NZ),
  // dispara. O "dia" é a data de calendário na NZ, pra não repetir nem pular.
  const TZ_NZ = "Pacific/Auckland";
  function partesNZ(): { dia: string; hora: number } {
    // pega data/hora "agora" já convertida pro fuso da NZ
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ_NZ, year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", hour12: false,
    });
    const p: Record<string, string> = {};
    for (const part of fmt.formatToParts(new Date())) p[part.type] = part.value;
    return { dia: `${p.year}-${p.month}-${p.day}`, hora: parseInt(p.hour, 10) || 0 };
  }
  let ultimoDiaProcessado = "";
  const HORA_ALVO_NZ = 23; // 23h NZ (a checagem de 10 min pega ~23:59)
  setInterval(() => {
    if (!MOTOR_ATIVO) return; // motor desligado por padrão: não dispara nada
    const { dia, hora } = partesNZ();
    if (hora >= HORA_ALVO_NZ && ultimoDiaProcessado !== dia) {
      ultimoDiaProcessado = dia;
      console.log(`[motor-email] disparando ciclo diário (${dia} 23h NZ)`);
      processarEnviosDiarios().catch((e) => console.error("[motor-email] erro no ciclo agendado:", e?.message || e));
    }
  }, 10 * 60 * 1000); // a cada 10 minutos

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
    const transacao = String(body.transacao || body.transaction || body?.data?.purchase?.transaction || "").trim();
    const eventId = String(body.eventId || body.id || "").trim();
    // O mesmo workflow do n8n pode encaminhar aprovação, pedido de reembolso,
    // reembolso e chargeback. Somente a aprovação pode criar/ ampliar acesso.
    // Antes, o endpoint ignorava o evento e tratava qualquer notificação como
    // compra aprovada — inclusive um reembolso.
    const evento = String(body.evento || body.event || "PURCHASE_APPROVED").toUpperCase().trim();
    const eventosSemLiberacao = new Set([
      "PURCHASE_REFUND_REQUESTED",
      "PURCHASE_REFUND_REQUEST",
      "PURCHASE_REFUNDED",
      "PURCHASE_CHARGEBACK",
      "PURCHASE_CANCELED",
      "PURCHASE_CANCELLED",
      "PURCHASE_EXPIRED",
    ]);
    const eventosQueRevogam = new Set([
      "PURCHASE_REFUNDED",
      "PURCHASE_CHARGEBACK",
      "PURCHASE_CANCELED",
      "PURCHASE_CANCELLED",
      "PURCHASE_EXPIRED",
    ]);
    const eventoRevogacao = eventosQueRevogam.has(evento);
    const eventoApenasInformativo = eventosSemLiberacao.has(evento) && !eventoRevogacao;
    const eventosQueLiberam = new Set(["PURCHASE_APPROVED"]);
    if (eventoApenasInformativo) {
      return res.status(200).json({
        ok: true,
        status: "evento-recebido-sem-revogacao",
        evento,
        acessoAlterado: false,
        mensagem: "Pedido de reembolso recebido. O acesso permanece ativo ate a confirmacao do reembolso.",
      });
    }
    if (!eventoRevogacao && !eventosQueLiberam.has(evento)) {
      return res.status(422).json({
        error: "Evento Hotmart não habilitado para liberação.",
        evento,
        aceitos: Array.from(eventosQueLiberam),
      });
    }
    // plano recebido do n8n:
    //   'completo'  -> curso especialista (nome comercial legado da Hotmart)
    //   'trilha1'   -> COMPRA da Trilha 1 (R$67). Acesso = mesma Trilha 1 do grátis,
    //                  mas conta como venda (origem + validade 1 ano).
    //   'gratuito'  -> Trilha 1 grátis (fluxo antigo). Default.
    const nomeProdutoHotmart = String(body?.data?.product?.name || "").trim();
    // O plano pode vir normalizado pelo n8n ou, como fallback seguro, do nome
    // real do produto enviado pela Hotmart.
    const planoRaw = String(body.plano || nomeProdutoHotmart || "").toLowerCase().trim();
    const normalizarPacote = (valor: string) => valor.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    const PACOTE_KIT90_ID = "como-resolver-problemas-no-trabalho-kit-90-dias";
    const PACOTE_KIT90_NOME = "Como Resolver Problemas no Trabalho - Kit 90 dias";
    const isCompraTrilha1 = planoRaw === "trilha1"
      || planoRaw === "trilha-1"
      || planoRaw === "trilha1-pago"
      || normalizarPacote(planoRaw) === PACOTE_KIT90_ID
      || normalizarPacote(planoRaw) === "kit-90-dias";
    const PACOTE_CAPABILIDADE_ID = "capabilidade-processo-avancado";
    const PACOTE_CAPABILIDADE_NOME = "Capabilidade de Processo Avançado";
    // Compatibilidade: o fluxo antigo pode ainda enviar "capabilidade".
    // O novo fluxo deve enviar o ID ou o nome oficial do pacote.
    const isCompraCapabilidade = planoRaw === "capabilidade"
      || normalizarPacote(planoRaw) === "capabilidade-de-processo"
      || normalizarPacote(planoRaw) === PACOTE_CAPABILIDADE_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_CAPABILIDADE_NOME);
    const PACOTE_ESTATISTICA_ID = "estatistica-aplicada-ferramentas-qualidade";
    const PACOTE_ESTATISTICA_NOME = "Estatística Aplicada e Ferramentas da Qualidade";
    const isCompraEstatistica = planoRaw === "estatistica-aplicada"
      || normalizarPacote(planoRaw) === PACOTE_ESTATISTICA_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_ESTATISTICA_NOME);
    const PACOTE_INFERENCIAL_ID = "analise-inferencial-testes-hipoteses";
    const PACOTE_INFERENCIAL_NOME = "Análise Inferencial - Testes de Hipóteses";
    const PACOTE_INFERENCIAL_ID_NORMALIZADO = "analise-inferencial-testes-de-hipoteses";
    const isCompraInferencial = planoRaw === "analise-inferencial"
      || normalizarPacote(planoRaw) === PACOTE_INFERENCIAL_ID
      || normalizarPacote(planoRaw) === PACOTE_INFERENCIAL_ID_NORMALIZADO
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_INFERENCIAL_NOME)
      || normalizarPacote(planoRaw) === "teste-de-hipoteses"
      || normalizarPacote(planoRaw) === "testes-de-hipoteses";
    const PACOTE_CEP_ID = "controle-estatistico-processo";
    const PACOTE_CEP_NOME = "Controle Estatístico de Processo";
    const CURSO_CEP_NOME = "CEP - Controle Estatístico de Processo";
    const isCompraCep = planoRaw === "cep"
      || normalizarPacote(planoRaw) === PACOTE_CEP_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_CEP_NOME)
      || normalizarPacote(planoRaw) === normalizarPacote(CURSO_CEP_NOME);
    const PACOTE_PREDITIVA_ID = "analise-preditiva-regressoes-correlacoes-series-temporais";
    const PACOTE_PREDITIVA_NOME = "Análise Preditiva - Regressões, Correlações e Séries Temporais";
    const PACOTE_PREDITIVA_ID_ANTIGO = "analise-preditiva-regressao-correlacao";
    const PACOTE_PREDITIVA_NOME_ANTIGO = "Análise Preditiva - Regressão e Correlação";
    const isCompraPreditiva = planoRaw === "preditiva"
      || normalizarPacote(planoRaw) === PACOTE_PREDITIVA_ID
      || normalizarPacote(planoRaw) === PACOTE_PREDITIVA_ID_ANTIGO
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_PREDITIVA_NOME)
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_PREDITIVA_NOME_ANTIGO)
      || normalizarPacote(planoRaw) === "regressoes-e-correlacoes";
    const PACOTE_MSA_ID = "msa-analise-sistema-medicao";
    const PACOTE_MSA_NOME = "MSA - Análise do Sistema de Medição";
    const CURSO_MSA_NOME = "MSA- Análise  do Sistema de Medição";
    const isCompraMsa = planoRaw === "msa"
      || normalizarPacote(planoRaw) === PACOTE_MSA_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_MSA_NOME)
      || normalizarPacote(planoRaw) === normalizarPacote(CURSO_MSA_NOME)
      || normalizarPacote(planoRaw) === "analise-de-medicao"
      || normalizarPacote(planoRaw) === "analise-do-sistema-de-medicao";
    // Software LBW Completo: NÃO libera curso nenhum (conferido em
    // PLANO-PLATAFORMA-LBW.md: "Não inclui cursos da Formação Profissional") — só os 8
    // módulos de Data Analysis. Estruturalmente diferente dos demais pacotes,
    // que sempre amarram exatamente 1 curso.
    // Degrau 2 da escada: cursos + Software LBW. O ID interno segue
    // "software-lbw-completo" pra não quebrar compras e acessos já gravados;
    // o nome comercial visível é o do degrau.
    const PACOTE_SOFTWARE_ID = "software-lbw-completo";
    const PACOTE_SOFTWARE_NOME = "Formação Profissional + Software LBW";
    const isCompraSoftware = planoRaw === "softwarelbw"
      || planoRaw === "software-lbw"
      || normalizarPacote(planoRaw) === PACOTE_SOFTWARE_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_SOFTWARE_NOME)
      || normalizarPacote(planoRaw) === "software-lbw"
      // Aceita o nome do próprio webhook (/webhook/softwareeformacao), com um "e"
      // ou dois — é o valor que o n8n envia hoje.
      || normalizarPacote(planoRaw) === "softwareformacao"
      || normalizarPacote(planoRaw) === "softwareeformacao"
      || normalizarPacote(planoRaw) === "software-e-formacao";
    const PACOTE_GATE_ID = "como-recomendar-melhorias-base-dados-gate";
    const PACOTE_GATE_NOME = "Como Recomendar Melhorias com Base em Dados - GATE";
    const isCompraGate = planoRaw === "gate"
      || normalizarPacote(planoRaw) === PACOTE_GATE_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_GATE_NOME);
    const PACOTE_MUDANCA_ID = "como-conduzir-mudancas-com-menos-resistencia";
    const PACOTE_MUDANCA_NOME = "Como Conduzir Mudanças com Menos Resistência";
    const isCompraMudanca = planoRaw === "gestao-mudanca"
      || planoRaw === "gestaodemudanca"
      || normalizarPacote(planoRaw) === PACOTE_MUDANCA_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_MUDANCA_NOME);
    const PACOTE_RISCO_ID = "como-antecipar-riscos-antes-que-virem-problemas";
    const PACOTE_RISCO_NOME = "Como Antecipar Riscos Antes que Virem Problemas";
    const isCompraRisco = planoRaw === "gerenciamento-risco"
      || planoRaw === "gerenciamentoderisco"
      || normalizarPacote(planoRaw) === PACOTE_RISCO_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_RISCO_NOME);
    const PACOTE_CULTURA_LEAN_ID = "como-aplicar-a-cultura-lean";
    const PACOTE_CULTURA_LEAN_NOME = "Como Aplicar a Cultura Lean";
    const isCompraCulturaLean = planoRaw === "cultura-lean"
      || planoRaw === "culturalean"
      || normalizarPacote(planoRaw) === PACOTE_CULTURA_LEAN_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_CULTURA_LEAN_NOME);
    const PACOTE_APRESENTACOES_ID = "como-criar-apresentacoes-que-convencem";
    const PACOTE_APRESENTACOES_NOME = "Como Criar Apresentações que Convencem";
    const isCompraApresentacoes = planoRaw === "apresentacoes"
      || planoRaw === "apresentacoes-eficazes"
      || normalizarPacote(planoRaw) === PACOTE_APRESENTACOES_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_APRESENTACOES_NOME)
      || normalizarPacote(planoRaw) === "apresentacoes-eficazes"
      || normalizarPacote(planoRaw) === "apresentacoes-que-convencem"
      // Aceita o nome da rota do n8n (/webhook/apresentacoeseficazes) grudado,
      // com e sem "que": normalizarPacote não separa palavras coladas, então
      // "apresentacoes-eficazes" não cobre "apresentacoeseficazes". Mesmo
      // cuidado que já existe para softwareformacao/softwareeformacao.
      || normalizarPacote(planoRaw) === "apresentacoeseficazes"
      || normalizarPacote(planoRaw) === "apresentacoesqueconvencem";
    const PACOTE_PLATAFORMA_COMPLETA_ID = "plataforma-profissional-gestao-projetos-melhoria";
    const PACOTE_PLATAFORMA_COMPLETA_NOME = "Plataforma Profissional em Gestão de Projetos de Melhoria";
    const isCompraPlataformaCompleta = planoRaw === "plataforma-completa"
      || normalizarPacote(planoRaw) === PACOTE_PLATAFORMA_COMPLETA_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_PLATAFORMA_COMPLETA_NOME);
    // O identificador interno antigo é mantido para não quebrar compras, reembolsos
    // nem acessos já gravados. O nome comercial e visível é a Formação Profissional.
    const PACOTE_ACADEMY_ID = "lbw-academy";
    const PACOTE_ACADEMY_NOME = "Formação Profissional em Gestão de Projetos de Melhoria";
    const PACOTE_ACADEMY_NOME_ANTIGO = "LBW Academy";
    const isCompraAcademy = planoRaw === "lbw-academy"
      || normalizarPacote(planoRaw) === PACOTE_ACADEMY_ID
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_ACADEMY_NOME)
      || normalizarPacote(planoRaw) === normalizarPacote(PACOTE_ACADEMY_NOME_ANTIGO)
      || normalizarPacote(planoRaw) === "formacao-profissional-gestao-projetos-melhoria"
      || normalizarPacote(planoRaw) === "todos-os-cursos-da-plataforma";
    const planoConhecido = planoRaw === "completo"
      || planoRaw === "gratuito"
      || isCompraTrilha1
      || isCompraCapabilidade
      || isCompraEstatistica
      || isCompraInferencial
      || isCompraCep
      || isCompraPreditiva
      || isCompraMsa
      || isCompraSoftware
      || isCompraGate
      || isCompraMudanca
      || isCompraRisco
      || isCompraCulturaLean
      || isCompraApresentacoes
      || isCompraPlataformaCompleta
      || isCompraAcademy;
    if (!planoConhecido && !eventoRevogacao) {
      // Registrar no servidor, não só devolver pro n8n: uma venda recusada some
      // se o único vestígio for a tela de execução do n8n. Com o nome exato no
      // log dá pra mapear o produto e reprocessar.
      const aceitos = [
        "completo", "gratuito", "trilha1", PACOTE_KIT90_NOME, PACOTE_KIT90_ID,
        PACOTE_CAPABILIDADE_NOME, PACOTE_CAPABILIDADE_ID,
        PACOTE_ESTATISTICA_NOME, PACOTE_ESTATISTICA_ID,
        PACOTE_INFERENCIAL_NOME, PACOTE_INFERENCIAL_ID, PACOTE_INFERENCIAL_ID_NORMALIZADO,
        PACOTE_CEP_NOME, PACOTE_CEP_ID, CURSO_CEP_NOME,
        PACOTE_PREDITIVA_NOME, PACOTE_PREDITIVA_ID,
        PACOTE_PREDITIVA_NOME_ANTIGO, PACOTE_PREDITIVA_ID_ANTIGO,
        PACOTE_MSA_NOME, PACOTE_MSA_ID, CURSO_MSA_NOME,
        PACOTE_SOFTWARE_NOME, PACOTE_SOFTWARE_ID, "softwarelbw", "softwareformacao",
        PACOTE_GATE_NOME, PACOTE_GATE_ID, "gate",
        PACOTE_MUDANCA_NOME, PACOTE_MUDANCA_ID, "gestao-mudanca", "gestaodemudanca",
        PACOTE_RISCO_NOME, PACOTE_RISCO_ID, "gerenciamento-risco", "gerenciamentoderisco",
        PACOTE_CULTURA_LEAN_NOME, PACOTE_CULTURA_LEAN_ID, "cultura-lean", "culturalean",
        PACOTE_APRESENTACOES_NOME, PACOTE_APRESENTACOES_ID, "apresentacoes", "apresentacoes-eficazes",
        PACOTE_PLATAFORMA_COMPLETA_NOME, PACOTE_PLATAFORMA_COMPLETA_ID, "plataforma-completa",
        PACOTE_ACADEMY_NOME, PACOTE_ACADEMY_NOME_ANTIGO, PACOTE_ACADEMY_ID,
        "formacao-profissional-gestao-projetos-melhoria", "todos-os-cursos-da-plataforma",
      ];
      console.error(
        `[acesso/liberar] RECUSADO produto="${nomeProdutoHotmart || planoRaw}" ` +
        `email="${email}" | planoRaw="${planoRaw}" | aceitos: ${aceitos.join(" | ")}`
      );
      return res.status(422).json({
        error: "Produto Hotmart não mapeado.",
        produto: nomeProdutoHotmart || planoRaw || null,
        planoRecebido: planoRaw || null,
        aceitos,
      });
    }
    const planoSolicitado: "completo" | "gratuito" | "capabilidade" | "estatistica-aplicada" | "analise-inferencial" | "cep" | "preditiva" | "msa" | "software-lbw" | "gate" | "gestao-mudanca" | "gerenciamento-risco" | "cultura-lean" | "apresentacoes" | "plataforma-completa" | "lbw-academy" = planoRaw === "completo"
      ? "completo"
      : isCompraCapabilidade ? "capabilidade"
      : isCompraEstatistica ? "estatistica-aplicada"
      : isCompraInferencial ? "analise-inferencial"
      : isCompraCep ? "cep"
      : isCompraPreditiva ? "preditiva"
      : isCompraMsa ? "msa"
      : isCompraSoftware ? "software-lbw"
      : isCompraGate ? "gate"
      : isCompraMudanca ? "gestao-mudanca"
      : isCompraRisco ? "gerenciamento-risco"
      : isCompraCulturaLean ? "cultura-lean"
      : isCompraApresentacoes ? "apresentacoes"
      : isCompraPlataformaCompleta ? "plataforma-completa"
      : isCompraAcademy ? "lbw-academy" : "gratuito";
    const consultorCompraId = "israel";
    const acessoAteCompra = planoSolicitado === "completo" || isCompraTrilha1 || isCompraCapabilidade || isCompraEstatistica || isCompraInferencial || isCompraCep || isCompraPreditiva || isCompraMsa || isCompraSoftware || isCompraGate || isCompraMudanca || isCompraRisco || isCompraCulturaLean || isCompraApresentacoes || isCompraPlataformaCompleta || isCompraAcademy
      ? new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString()
      : undefined;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "E-mail ausente ou inválido no payload." });
    }

    const CURSO_KIT_90 = PACOTE_KIT90_NOME;
    const CURSO_ESPECIALISTA = "Formação Profissional em Gestão de Projetos de Melhoria";
    const CURSO_CAPABILIDADE = PACOTE_CAPABILIDADE_NOME;
    const CURSO_ESTATISTICA = PACOTE_ESTATISTICA_NOME;
    const CURSO_INFERENCIAL = PACOTE_INFERENCIAL_NOME;
    const CURSO_CONTROLE_ESTATISTICO = CURSO_CEP_NOME;
    const CURSO_PREDITIVA = PACOTE_PREDITIVA_NOME;
    const CURSO_MSA = CURSO_MSA_NOME;
    const CURSO_GATE = PACOTE_GATE_NOME;
    const CURSO_MUDANCA = PACOTE_MUDANCA_NOME;
    const CURSO_RISCO = PACOTE_RISCO_NOME;
    const CURSO_CULTURA_LEAN = PACOTE_CULTURA_LEAN_NOME;
    const CURSO_APRESENTACOES = PACOTE_APRESENTACOES_NOME;
    let catalogoCompleto: any[] = [];
    if (isCompraPlataformaCompleta || isCompraAcademy) {
      try {
        const snapshot = await adminFirestore().collection("initiatives").get();
        catalogoCompleto = snapshot.docs
          .map((doc: any) => ({ id: doc.id, ...doc.data() }))
          .filter((item: any) => String(item.consultorId || "israel") === consultorCompraId);
      } catch (err: any) {
        console.error("[acesso/liberar] Falha ao montar catálogo completo:", err?.message || err);
        return res.status(500).json({ error: "Não foi possível carregar o catálogo completo da plataforma." });
      }
    }
    const cursosCatalogoCompleto = catalogoCompleto
      .filter((item: any) => item.somenteProjeto !== true && (!item.cursoAssociadoId || item.cursoAssociadoId === item.id))
      .map((item: any) => String(item.name || "").trim())
      .filter(Boolean)
      .filter((nome: string, index: number, lista: string[]) => lista.findIndex((item) => normalizarPacote(item) === normalizarPacote(nome)) === index);
    const projetosCatalogoCompleto = catalogoCompleto
      .filter((item: any) => item.temProjeto !== false)
      .filter((item: any, index: number, lista: any[]) => lista.findIndex((outro: any) => String(outro.id) === String(item.id)) === index)
      .map((item: any) => ({
        projeto: String(item.id),
        nome: String(item.name || item.id).trim(),
        vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null,
        valor: 0,
      }));
    if (isCompraPlataformaCompleta && (cursosCatalogoCompleto.length === 0 || projetosCatalogoCompleto.length === 0)) {
      console.error(`[acesso/liberar] Catálogo completo inconsistente: cursos=${cursosCatalogoCompleto.length}, projetos=${projetosCatalogoCompleto.length}`);
      return res.status(500).json({ error: "O catálogo completo está vazio ou incompleto. Nenhum acesso foi alterado." });
    }
    if ((isCompraAcademy || isCompraSoftware) && cursosCatalogoCompleto.length === 0) {
      console.error("[acesso/liberar] Catálogo de cursos vazio — pacote com cursos não pode ser liberado.");
      return res.status(500).json({ error: "O catálogo de cursos está vazio. Nenhum acesso foi alterado." });
    }
    const nomePacoteComercial = isCompraTrilha1
      ? PACOTE_KIT90_NOME
      : isCompraCapabilidade ? PACOTE_CAPABILIDADE_NOME
      : isCompraEstatistica
        ? PACOTE_ESTATISTICA_NOME
        : isCompraInferencial
          ? PACOTE_INFERENCIAL_NOME
          : isCompraCep
            ? PACOTE_CEP_NOME
            : isCompraPreditiva
              ? PACOTE_PREDITIVA_NOME
              : isCompraMsa ? PACOTE_MSA_NOME
              : isCompraSoftware ? PACOTE_SOFTWARE_NOME
              : isCompraGate ? PACOTE_GATE_NOME
              : isCompraMudanca ? PACOTE_MUDANCA_NOME
              : isCompraRisco ? PACOTE_RISCO_NOME
              : isCompraCulturaLean ? PACOTE_CULTURA_LEAN_NOME
              : isCompraApresentacoes ? PACOTE_APRESENTACOES_NOME
              : isCompraPlataformaCompleta ? PACOTE_PLATAFORMA_COMPLETA_NOME
              : isCompraAcademy ? PACOTE_ACADEMY_NOME : planoSolicitado;
    const dadosPacoteComercial = isCompraTrilha1
      ? { pacoteId: PACOTE_KIT90_ID, pacoteNome: PACOTE_KIT90_NOME }
      : isCompraCapabilidade ? { pacoteId: PACOTE_CAPABILIDADE_ID, pacoteNome: PACOTE_CAPABILIDADE_NOME }
      : isCompraEstatistica
        ? { pacoteId: PACOTE_ESTATISTICA_ID, pacoteNome: PACOTE_ESTATISTICA_NOME }
        : isCompraInferencial
          ? { pacoteId: PACOTE_INFERENCIAL_ID, pacoteNome: PACOTE_INFERENCIAL_NOME }
        : isCompraCep
          ? { pacoteId: PACOTE_CEP_ID, pacoteNome: PACOTE_CEP_NOME }
        : isCompraPreditiva
          ? { pacoteId: PACOTE_PREDITIVA_ID, pacoteNome: PACOTE_PREDITIVA_NOME }
        : isCompraMsa
          ? { pacoteId: PACOTE_MSA_ID, pacoteNome: PACOTE_MSA_NOME }
        : isCompraSoftware
          ? { pacoteId: PACOTE_SOFTWARE_ID, pacoteNome: PACOTE_SOFTWARE_NOME }
        : isCompraGate
          ? { pacoteId: PACOTE_GATE_ID, pacoteNome: PACOTE_GATE_NOME }
        : isCompraMudanca
          ? { pacoteId: PACOTE_MUDANCA_ID, pacoteNome: PACOTE_MUDANCA_NOME }
        : isCompraRisco
          ? { pacoteId: PACOTE_RISCO_ID, pacoteNome: PACOTE_RISCO_NOME }
        : isCompraCulturaLean
          ? { pacoteId: PACOTE_CULTURA_LEAN_ID, pacoteNome: PACOTE_CULTURA_LEAN_NOME }
        : isCompraApresentacoes
          ? { pacoteId: PACOTE_APRESENTACOES_ID, pacoteNome: PACOTE_APRESENTACOES_NOME }
        : isCompraPlataformaCompleta
          ? { pacoteId: PACOTE_PLATAFORMA_COMPLETA_ID, pacoteNome: PACOTE_PLATAFORMA_COMPLETA_NOME }
        : isCompraAcademy
          ? { pacoteId: PACOTE_ACADEMY_ID, pacoteNome: PACOTE_ACADEMY_NOME }
        : {};
    const nomePlanoResposta = isCompraTrilha1
      ? PACOTE_KIT90_NOME
      : isCompraCapabilidade ? PACOTE_CAPABILIDADE_NOME
      : isCompraEstatistica
        ? PACOTE_ESTATISTICA_NOME
        : isCompraInferencial
          ? PACOTE_INFERENCIAL_NOME
          : isCompraCep
            ? PACOTE_CEP_NOME
            : isCompraPreditiva
              ? PACOTE_PREDITIVA_NOME
              : isCompraMsa ? PACOTE_MSA_NOME
              : isCompraSoftware ? PACOTE_SOFTWARE_NOME
              : isCompraGate ? PACOTE_GATE_NOME
              : isCompraMudanca ? PACOTE_MUDANCA_NOME
              : isCompraRisco ? PACOTE_RISCO_NOME
              : isCompraCulturaLean ? PACOTE_CULTURA_LEAN_NOME
              : isCompraApresentacoes ? PACOTE_APRESENTACOES_NOME
              : isCompraPlataformaCompleta ? PACOTE_PLATAFORMA_COMPLETA_NOME
              : isCompraAcademy ? PACOTE_ACADEMY_NOME : planoSolicitado;
    const origemAcesso = planoSolicitado === "completo" || isCompraCapabilidade || isCompraEstatistica || isCompraInferencial || isCompraCep || isCompraPreditiva || isCompraMsa || isCompraSoftware || isCompraGate || isCompraMudanca || isCompraRisco || isCompraCulturaLean || isCompraApresentacoes || isCompraPlataformaCompleta || isCompraAcademy
      ? "compra-hotmart"
      : (isCompraTrilha1 ? "compra-trilha1" : "gratuito-landing");
    // Software LBW não possui curso; a Plataforma Completa possui vários. Os dois
    // usam null aqui e são tratados pelas listas de cursos logo abaixo.
    const cursoComprado: string | null = planoSolicitado === "completo"
      ? CURSO_ESPECIALISTA
      : isCompraCapabilidade
        ? CURSO_CAPABILIDADE
        : isCompraEstatistica ? CURSO_ESTATISTICA
        : isCompraInferencial ? CURSO_INFERENCIAL
        : isCompraCep ? CURSO_CONTROLE_ESTATISTICO
        : isCompraPreditiva ? CURSO_PREDITIVA
        : isCompraMsa ? CURSO_MSA
        : isCompraSoftware || isCompraPlataformaCompleta || isCompraAcademy ? null
        : isCompraGate ? CURSO_GATE
        : isCompraMudanca ? CURSO_MUDANCA
        : isCompraRisco ? CURSO_RISCO
        : isCompraCulturaLean ? CURSO_CULTURA_LEAN
        : isCompraApresentacoes ? CURSO_APRESENTACOES : CURSO_KIT_90;
    const analyticsComprado = isCompraTrilha1
      ? [
          { modulo: "graficos", nome: "Gráficos", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
          { modulo: "diversas", nome: "Análises Diversas", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
        ]
      : isCompraCapabilidade
        ? [
          { modulo: "capabilidade", nome: "Capabilidade", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
          { modulo: "graficos", nome: "Gráficos", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
          { modulo: "diversas", nome: "Análises Diversas", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
        ]
      : isCompraEstatistica
        ? [
            { modulo: "diversas", nome: "Análises Diversas", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
            { modulo: "graficos", nome: "Gráficos", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
          ]
      : isCompraInferencial
        ? [
            { modulo: "inferencial", nome: "Análise Inferencial", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
            { modulo: "graficos", nome: "Gráficos", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
            { modulo: "diversas", nome: "Análises Diversas", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
          ]
      : isCompraCep
        ? [
            { modulo: "cep", nome: "Controle de Processo", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
            { modulo: "graficos", nome: "Gráficos", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
            { modulo: "diversas", nome: "Análises Diversas", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
          ]
      : isCompraPreditiva
        ? [
            { modulo: "preditiva", nome: "Análise Preditiva", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
            { modulo: "graficos", nome: "Gráficos", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
            { modulo: "diversas", nome: "Análises Diversas", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
          ]
      : isCompraMsa
        ? [
            { modulo: "msa", nome: "MSA", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
            { modulo: "graficos", nome: "Gráficos", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
            { modulo: "diversas", nome: "Análises Diversas", vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0 },
          ]
      // Software LBW: TODOS os módulos, "aba inteira" como pedido. Gerado a partir de
      // ANALYTICS_MODULOS pra nunca ficar desalinhado se um módulo novo nascer lá —
      // mesmo cuidado do commit que corrigiu o desalinhamento módulo↔grupo no
      // Data Analysis (a checagem em DEV que existe hoje em DataAnalysis.tsx).
      : isCompraSoftware || isCompraPlataformaCompleta
        ? ANALYTICS_MODULOS.map(({ id, nome }) => ({
            modulo: id, nome, vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null, valor: 0,
          }))
      : [];
    const cursoAcessoComprado = cursoComprado ? {
      curso: cursoComprado,
      vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null,
      valor: 0,
      quantidade: 1,
    } : null;
    // isCompraSoftware entra aqui junto com os outros dois: o degrau 2 da escada
    // comercial é "cursos + Software LBW", então ele libera o catálogo INTEIRO de
    // cursos além dos módulos de Data Analysis. Sem isso, quem comprasse o degrau 2
    // pagava por cursos e recebia só a aba de análise.
    const cursosAcessoComprados = isCompraPlataformaCompleta || isCompraAcademy || isCompraSoftware
      ? cursosCatalogoCompleto.map((curso: string) => ({
          curso,
          vencimento: acessoAteCompra ? acessoAteCompra.slice(0, 10) : null,
          valor: 0,
          quantidade: 1,
        }))
      : cursoAcessoComprado ? [cursoAcessoComprado] : [];
    const projetosComprados = isCompraPlataformaCompleta ? projetosCatalogoCompleto : [];
    const snapshotAcessoAntesDoHistorico = (vinculo: any) => ({
      cursosAcesso: Array.isArray(vinculo?.cursosAcesso) ? vinculo.cursosAcesso : [],
      cursosLiberados: Array.isArray(vinculo?.cursosLiberados) ? vinculo.cursosLiberados : [],
      acessoProdutos: vinculo?.acessoProdutos || {},
      projetosAcesso: Array.isArray(vinculo?.projetosAcesso) ? vinculo.projetosAcesso : [],
      projetosAcessoConfigurado: vinculo?.projetosAcessoConfigurado === true,
      acessoCompletoAte: vinculo?.acessoCompletoAte || null,
    });
    // O historico usa a transacao como chave. Assim, reenvios do mesmo evento
    // Hotmart sao idempotentes e nao duplicam acessos.
    const compraHotmartAtual = evento === "PURCHASE_APPROVED" && transacao
      ? {
          transacao,
          eventId: eventId || null,
          produtoUcode: String(body.produtoUcode || body?.data?.product?.ucode || "").trim() || null,
          pacoteId: String((dadosPacoteComercial as any).pacoteId || normalizarPacote(nomePlanoResposta)),
          pacoteNome: String((dadosPacoteComercial as any).pacoteNome || nomePlanoResposta),
          plano: planoSolicitado,
          status: "approved",
          aprovadoEm: new Date().toISOString(),
          acessoAte: acessoAteCompra || null,
          cursosAcesso: cursosAcessoComprados,
          cursosLiberados: cursosAcessoComprados.map((item: any) => item.curso),
          analytics: analyticsComprado,
          projetosAcesso: projetosComprados,
          projetosAcessoConfigurado: isCompraSoftware || isCompraPlataformaCompleta || isCompraAcademy,
        }
      : null;
    const anexarCompraHotmart = (vinculoBase: any, patch: Record<string, any>) => {
      if (!compraHotmartAtual) return patch;
      const comprasAnteriores = Array.isArray(vinculoBase?.comprasHotmart) ? vinculoBase.comprasHotmart : [];
      const indice = comprasAnteriores.findIndex((item: any) => String(item?.transacao || "") === transacao);
      const comprasAtualizadas = [...comprasAnteriores];
      if (indice >= 0) comprasAtualizadas[indice] = { ...comprasAtualizadas[indice], ...compraHotmartAtual };
      else comprasAtualizadas.push(compraHotmartAtual);
      return {
        ...patch,
        ...(vinculoBase?.acessoLegadoAntesCompras ? {} : { acessoLegadoAntesCompras: snapshotAcessoAntesDoHistorico(vinculoBase) }),
        comprasHotmart: comprasAtualizadas,
      };
    };
    const historicoCompraInicial = compraHotmartAtual
      ? { comprasHotmart: [compraHotmartAtual], acessoLegadoAntesCompras: snapshotAcessoAntesDoHistorico(null) }
      : {};
    // Reembolso so remove a compra identificada pela transacao. Se o aluno
    // ainda nao possui historico, mantemos o acesso legado por seguranca.
    if (eventoRevogacao) {
      if (!email || !email.includes("@")) return res.status(400).json({ error: "E-mail ausente ou invalido no payload." });
      if (!transacao) {
        return res.status(200).json({ ok: true, status: "evento-sem-transacao", evento, acessoAlterado: false });
      }
      let userParaRevogar: any = null;
      try {
        userParaRevogar = await adminAuth().getUserByEmail(email);
      } catch (e: any) {
        if (e?.code !== "auth/user-not-found") throw e;
      }
      if (!userParaRevogar) return res.status(200).json({ ok: true, status: "aluno-nao-encontrado", evento, acessoAlterado: false });
      const docRefRevogacao = adminFirestore().collection("users").doc(userParaRevogar.uid);
      const snapRevogacao = await docRefRevogacao.get();
      const baseRevogacao = snapRevogacao.exists ? snapRevogacao.data() as any : null;
      const vinculoRevogacao = baseRevogacao?.vinculos?.israel
        || (String(baseRevogacao?.consultorId || "") === "israel" ? baseRevogacao : null);
      const comprasRevogacao = Array.isArray(vinculoRevogacao?.comprasHotmart) ? vinculoRevogacao.comprasHotmart : [];
      const indiceCompra = comprasRevogacao.findIndex((item: any) => String(item?.transacao || "") === transacao);
      if (indiceCompra < 0) {
        return res.status(200).json({ ok: true, status: "compra-nao-registrada", evento, transacao, acessoAlterado: false });
      }
      const compraEncontrada = comprasRevogacao[indiceCompra];
      const statusRevogacao = evento.includes("CHARGEBACK") ? "chargeback" : evento.includes("EXPIRED") ? "expired" : "refunded";
      if (compraEncontrada.status === statusRevogacao) {
        return res.status(200).json({ ok: true, status: "revogacao-ja-processada", evento, transacao, acessoAlterado: false });
      }
      const comprasAtualizadas = comprasRevogacao.map((item: any, index: number) => index === indiceCompra
        ? { ...item, status: statusRevogacao, revogadoEm: new Date().toISOString(), eventoRevogacao: evento }
        : item);
      const comprasAtivas = comprasAtualizadas.filter((item: any) => {
        if (item?.status !== "approved") return false;
        if (!item?.acessoAte) return true;
        return new Date(item.acessoAte).getTime() > Date.now();
      });
      const legado = vinculoRevogacao?.acessoLegadoAntesCompras || {};
      const mesclarPorChave = (listas: any[], chave: (item: any) => string) => {
        const mapa = new Map<string, any>();
        listas.flat().forEach((item: any) => {
          const id = chave(item);
          if (id) mapa.set(id, item);
        });
        return Array.from(mapa.values());
      };
      const cursosAposRevogacao = mesclarPorChave([
        legado.cursosAcesso || [],
        ...comprasAtivas.map((item: any) => item.cursosAcesso || []),
      ], (item: any) => normalizarPacote(String(item?.curso || item || "")));
      const analyticsAposRevogacao = mesclarPorChave([
        legado.acessoProdutos?.analytics || [],
        ...comprasAtivas.map((item: any) => item.analytics || []),
      ], (item: any) => String(item?.modulo || item?.id || item || "").trim());
      const temProjetosExplicitos = legado.projetosAcessoConfigurado === true
        || comprasAtivas.some((item: any) => item.projetosAcessoConfigurado === true);
      const projetosAposRevogacao = mesclarPorChave([
        legado.projetosAcesso || [],
        ...comprasAtivas.map((item: any) => item.projetosAcesso || []),
      ], (item: any) => String(item?.projeto || item?.projetoId || "").trim());
      const datasDeAcesso = [legado.acessoCompletoAte, ...comprasAtivas.map((item: any) => item.acessoAte)].filter(Boolean);
      const acessoCompletoAte = datasDeAcesso.length > 0
        ? datasDeAcesso.sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null;
      const vinculoAtualizado = {
        ...vinculoRevogacao,
        comprasHotmart: comprasAtualizadas,
        cursosAcesso: cursosAposRevogacao,
        cursosLiberados: cursosAposRevogacao.map((item: any) => item.curso),
        acessoProdutos: { ...(vinculoRevogacao?.acessoProdutos || {}), analytics: analyticsAposRevogacao },
        projetosAcesso: projetosAposRevogacao,
        projetosAcessoConfigurado: temProjetosExplicitos,
        acessoCompletoAte,
      };
      const vinculosRevogados = { ...(baseRevogacao?.vinculos || {}), israel: vinculoAtualizado };
      const principalEhIsrael = !baseRevogacao?.consultorId || String(baseRevogacao.consultorId) === "israel";
      await docRefRevogacao.set({
        vinculos: vinculosRevogados,
        ...(principalEhIsrael ? {
          cursosAcesso: cursosAposRevogacao,
          cursosLiberados: cursosAposRevogacao.map((item: any) => item.curso),
          acessoProdutos: { ...(baseRevogacao?.acessoProdutos || {}), analytics: analyticsAposRevogacao },
          projetosAcesso: projetosAposRevogacao,
          projetosAcessoConfigurado: temProjetosExplicitos,
          acessoCompletoAte,
        } : {}),
      }, { merge: true });
      console.warn(`[acesso/liberar] ACESSO REVOGADO evento=${evento} transacao=${transacao} email=${email}`);
      return res.status(200).json({ ok: true, status: "acesso-revogado", evento, transacao, uid: userParaRevogar.uid, pacote: compraEncontrada.pacoteNome, acessoAlterado: true });
    }
    const mesclarCursoComprado = (lista: any) => {
      const existentes = Array.isArray(lista) ? lista.filter((c: any) => c?.curso) : [];
      if (!cursoComprado || !cursoAcessoComprado) return existentes;
      const semDuplicar = existentes.filter((c: any) => String(c.curso).trim() !== cursoComprado);
      return [...semDuplicar, cursoAcessoComprado];
    };
    const mesclarCursosCatalogo = (lista: any) => {
      const existentes = Array.isArray(lista) ? lista.filter((c: any) => c?.curso) : [];
      if (cursosAcessoComprados.length === 0) return existentes;
      const nomesNovos = new Set(cursosAcessoComprados.map((c: any) => normalizarPacote(String(c.curso || ""))));
      const semDuplicar = existentes.filter((c: any) => !nomesNovos.has(normalizarPacote(String(c.curso || ""))));
      return [...semDuplicar, ...cursosAcessoComprados];
    };
    const mesclarProjetosComprados = (lista: any) => {
      const existentes = Array.isArray(lista) ? lista.filter((p: any) => p?.projeto || p?.projetoId) : [];
      if (projetosComprados.length === 0) return existentes;
      const idsNovos = new Set(projetosComprados.map((p: any) => String(p.projeto)));
      const semDuplicar = existentes.filter((p: any) => !idsNovos.has(String(p.projeto || p.projetoId)));
      return [...semDuplicar, ...projetosComprados];
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
        const senhaProvisoria = gerarSenhaProvisoria();
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
          consultorId: consultorCompraId,
          consultorIds: [consultorCompraId],
          plano: "por_curso",
           planoComercialLegado: nomePacoteComercial,
           ...dadosPacoteComercial,
          modeloAcesso: "por_curso",
          // O degrau 2 (cursos + Software) também libera o catálogo inteiro.
          // Sem ele nestas duas condições, um comprador novo receberia os
          // módulos de Analytics, mas nenhum curso — diferente de quem já
          // possuía uma conta e fazia upgrade.
          cursosAcesso: isCompraPlataformaCompleta || isCompraAcademy || isCompraSoftware ? cursosAcessoComprados : cursoAcessoComprado ? [cursoAcessoComprado] : [],
          cursosLiberados: isCompraPlataformaCompleta || isCompraAcademy || isCompraSoftware ? cursosAcessoComprados.map((item: any) => item.curso) : cursoComprado ? [cursoComprado] : [],
          ...(isCompraAcademy ? { projetosAcesso: [], projetosAcessoConfigurado: true } : {}),
          ...(projetosComprados.length > 0 ? { projetosAcesso: projetosComprados } : {}),
          ...(analyticsComprado.length > 0 ? { acessoProdutos: { analytics: analyticsComprado } } : {}),
          creditoIA: {
            limite: planoSolicitado === "completo" || isCompraPlataformaCompleta ? 1000 : 100,
            usado: 0,
            resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
          },
          senhaProvisoria: true, // força troca obrigatória no 1º acesso
          criadoEm: new Date().toISOString(),
          origem: origemAcesso,
          ...historicoCompraInicial,
          // Compra (completa OU Trilha 1) = 1 ano de acesso. Só exibição por enquanto;
          // o rebaixamento automático ao vencer ainda é pendência (cron, Camada B).
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
          vinculos: {
            [consultorCompraId]: {
              tipoUsuario: "aluno", consultorId: consultorCompraId,
               plano: "por_curso", planoComercialLegado: nomePacoteComercial, modeloAcesso: "por_curso", ...dadosPacoteComercial,
              cursosAcesso: isCompraPlataformaCompleta || isCompraAcademy || isCompraSoftware ? cursosAcessoComprados : cursoAcessoComprado ? [cursoAcessoComprado] : [],
              cursosLiberados: isCompraPlataformaCompleta || isCompraAcademy || isCompraSoftware ? cursosAcessoComprados.map((item: any) => item.curso) : cursoComprado ? [cursoComprado] : [],
              ...(isCompraAcademy ? { projetosAcesso: [], projetosAcessoConfigurado: true } : {}),
              ...(projetosComprados.length > 0 ? { projetosAcesso: projetosComprados } : {}),
              ...(analyticsComprado.length > 0 ? { acessoProdutos: { analytics: analyticsComprado } } : {}),
              origem: origemAcesso,
              ...historicoCompraInicial,
              ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
            },
          },
        });
        const emailEnviado = await sendAcessoEmail({
          para: email, nome, senhaProvisoria, plano: planoSolicitado, contexto: "novo",
        });
        console.log(`[acesso/liberar] CRIADO ${email} (${planoSolicitado}) email=${emailEnviado}`);
        return res.json({ ok: true, status: "criado", uid: novo.uid, email, plano: nomePlanoResposta, ...dadosPacoteComercial, emailEnviado });
      }

      // ---- CASO B: usuário JÁ existe ----
      const uid = userRecord.uid;
      const docRef = usersCol.doc(uid);
      const snap = await docRef.get();

      // Garante que o doc Firestore exista (se a conta só estava no Auth, regulariza)
      if (!snap.exists) {
        await docRef.set({
          uid, email, nome: nome || userRecord.displayName || "",
          tipoUsuario: "aluno",
          consultorId: consultorCompraId,
          consultorIds: [consultorCompraId],
          plano: "por_curso",
           planoComercialLegado: nomePacoteComercial,
           ...dadosPacoteComercial,
          modeloAcesso: "por_curso",
          cursosAcesso: isCompraPlataformaCompleta || isCompraAcademy || isCompraSoftware ? cursosAcessoComprados : cursoAcessoComprado ? [cursoAcessoComprado] : [],
          cursosLiberados: isCompraPlataformaCompleta || isCompraAcademy || isCompraSoftware ? cursosAcessoComprados.map((item: any) => item.curso) : cursoComprado ? [cursoComprado] : [],
          ...(isCompraAcademy ? { projetosAcesso: [], projetosAcessoConfigurado: true } : {}),
          ...(projetosComprados.length > 0 ? { projetosAcesso: projetosComprados } : {}),
          ...(analyticsComprado.length > 0 ? { acessoProdutos: { analytics: analyticsComprado } } : {}),
          creditoIA: { limite: planoSolicitado === "completo" || isCompraPlataformaCompleta ? 1000 : 100, usado: 0, resetEm: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() },
          criadoEm: new Date().toISOString(),
          origem: "regularizado",
          ...historicoCompraInicial,
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
          vinculos: {
            [consultorCompraId]: {
              tipoUsuario: "aluno", consultorId: consultorCompraId,
               plano: "por_curso", planoComercialLegado: nomePacoteComercial, modeloAcesso: "por_curso", ...dadosPacoteComercial,
              cursosAcesso: isCompraPlataformaCompleta || isCompraAcademy || isCompraSoftware ? cursosAcessoComprados : cursoAcessoComprado ? [cursoAcessoComprado] : [],
              cursosLiberados: isCompraPlataformaCompleta || isCompraAcademy || isCompraSoftware ? cursosAcessoComprados.map((item: any) => item.curso) : cursoComprado ? [cursoComprado] : [],
              ...(isCompraAcademy ? { projetosAcesso: [], projetosAcessoConfigurado: true } : {}),
              ...(projetosComprados.length > 0 ? { projetosAcesso: projetosComprados } : {}),
              ...(analyticsComprado.length > 0 ? { acessoProdutos: { analytics: analyticsComprado } } : {}),
              origem: "regularizado",
              ...historicoCompraInicial,
              ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
            },
          },
        });
        // Nota: não marca senhaProvisoria aqui — conta já existia no Auth com senha própria.
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: planoSolicitado, contexto: "existente" });
        console.log(`[acesso/liberar] REGULARIZADO ${email} (${planoSolicitado})`);
        return res.json({ ok: true, status: "regularizado", uid, email, plano: nomePlanoResposta, ...dadosPacoteComercial, emailEnviado });
      }

      const base = snap.data() as any;
      const vinculoIsraelAnterior = base.vinculos?.[consultorCompraId]
        || (String(base.consultorId || "israel") === consultorCompraId ? base : null);
      const compraJaRevogada = evento === "PURCHASE_APPROVED"
        && transacao
        && Array.isArray(vinculoIsraelAnterior?.comprasHotmart)
        && vinculoIsraelAnterior.comprasHotmart.find((item: any) => String(item?.transacao || "") === transacao && item?.status !== "approved");
      if (compraJaRevogada) {
        return res.status(200).json({ ok: true, status: "compra-ja-revogada", transacao, acessoAlterado: false });
      }
      const planoAtual = vinculoIsraelAnterior?.plano || null;
      const vinculosExistentes = { ...(base.vinculos || {}) };
      // Converte o vínculo principal legado antes de acrescentar Israel.
      if (base.consultorId && !vinculosExistentes[base.consultorId]) {
        vinculosExistentes[base.consultorId] = {
          tipoUsuario: base.tipoUsuario || "aluno", consultorId: base.consultorId,
          empresaId: base.empresaId || null, empresaNome: base.empresaNome || null,
          plano: base.plano || "gratuito", formacoes: base.formacoes || [],
          cursosAcesso: base.cursosAcesso || [], acessoCompletoAte: base.acessoCompletoAte || null,
        };
      }
      const salvarAcessoIsrael = async (patch: Record<string, any>) => {
        const papelAtual = vinculoIsraelAnterior?.tipoUsuario;
        const patchComHistorico = anexarCompraHotmart(
          vinculoIsraelAnterior || (String(base.consultorId || "") === consultorCompraId ? base : {}),
          patch,
        );
        const vinculoIsrael = {
          ...(vinculoIsraelAnterior || {}),
          ...patchComHistorico,
          tipoUsuario: papelAtual === "consultor" || papelAtual === "coordenador" ? papelAtual : "aluno",
          consultorId: consultorCompraId,
        };
        const consultorIds = Array.from(new Set([...(Array.isArray(base.consultorIds) ? base.consultorIds : []), base.consultorId, consultorCompraId].filter(Boolean)));
        const principalEhIsrael = !base.consultorId || String(base.consultorId) === consultorCompraId;
        await docRef.set({
          consultorIds,
          vinculos: { ...vinculosExistentes, [consultorCompraId]: vinculoIsrael },
          ...(principalEhIsrael ? patchComHistorico : {}),
        }, { merge: true });
      };

      // Conta existente de outro consultor: cria o novo papel de aluno de Israel,
      // sem tocar na senha nem no papel principal.
      if (!vinculoIsraelAnterior) {
        const origem = origemAcesso;
        await salvarAcessoIsrael({ plano: "por_curso", planoComercialLegado: nomePacoteComercial, modeloAcesso: "por_curso", ...dadosPacoteComercial, cursosAcesso: isCompraPlataformaCompleta || isCompraAcademy || isCompraSoftware ? cursosAcessoComprados : cursoAcessoComprado ? [cursoAcessoComprado] : [], cursosLiberados: isCompraPlataformaCompleta || isCompraAcademy || isCompraSoftware ? cursosAcessoComprados.map((item: any) => item.curso) : cursoComprado ? [cursoComprado] : [], ...(analyticsComprado.length > 0 ? { acessoProdutos: { analytics: analyticsComprado } } : {}), ...(projetosComprados.length > 0 ? { projetosAcesso: projetosComprados } : {}), ...(isCompraAcademy ? { projetosAcesso: [], projetosAcessoConfigurado: true } : {}), origem });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: planoSolicitado, contexto: "existente" });
        console.log(`[acesso/liberar] NOVO-VINCULO-ISRAEL ${email} (${planoSolicitado})`);
        const statusCompat = planoSolicitado === "completo" ? "atualizado-completo" : (isCompraTrilha1 ? "compra-trilha1-registrada" : "ja-existia");
        return res.json({ ok: true, status: statusCompat, vinculoCriado: true, uid, email, plano: nomePlanoResposta, ...dadosPacoteComercial, emailEnviado });
      }

      // COMPRA da Capabilidade de Processo Avançado: preserva cursos anteriores e
      // acrescenta o curso e o módulo estatístico correspondente.
      if (isCompraCapabilidade) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        const analyticsAnteriores = Array.isArray(vinculoIsraelAnterior?.acessoProdutos?.analytics)
          ? vinculoIsraelAnterior.acessoProdutos.analytics
          : [];
        const analyticsMesclados = [
          ...analyticsAnteriores.filter((item: any) => String(item?.modulo || item?.id || item).trim() !== "capabilidade"),
          ...analyticsComprado,
        ];
        await salvarAcessoIsrael({
          plano: "por_curso",
           planoComercialLegado: PACOTE_CAPABILIDADE_NOME,
           pacoteId: PACOTE_CAPABILIDADE_ID,
           pacoteNome: PACOTE_CAPABILIDADE_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          acessoProdutos: { ...(vinculoIsraelAnterior?.acessoProdutos || {}), analytics: analyticsMesclados },
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "capabilidade", contexto: "existente" });
        console.log(`[acesso/liberar] CAPABILIDADE ${email} email=${emailEnviado}`);
        return res.json({ ok: true, status: "capabilidade-liberada", uid, email, plano: PACOTE_CAPABILIDADE_NOME, pacoteId: PACOTE_CAPABILIDADE_ID, pacoteNome: PACOTE_CAPABILIDADE_NOME, emailEnviado });
      }

      // COMPRA de Estatística Aplicada e Ferramentas da Qualidade: preserva
      // cursos anteriores e acrescenta somente os módulos Diversas e Gráficos.
      if (isCompraEstatistica) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        const modulosEstatistica = new Set(["diversas", "graficos"]);
        const analyticsAnteriores = Array.isArray(vinculoIsraelAnterior?.acessoProdutos?.analytics)
          ? vinculoIsraelAnterior.acessoProdutos.analytics
          : [];
        const analyticsMesclados = [
          ...analyticsAnteriores.filter((item: any) => !modulosEstatistica.has(String(item?.modulo || item?.id || item).trim())),
          ...analyticsComprado,
        ];
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_ESTATISTICA_NOME,
          pacoteId: PACOTE_ESTATISTICA_ID,
          pacoteNome: PACOTE_ESTATISTICA_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          acessoProdutos: { ...(vinculoIsraelAnterior?.acessoProdutos || {}), analytics: analyticsMesclados },
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "estatistica-aplicada", contexto: "existente" });
        console.log(`[acesso/liberar] ESTATISTICA APLICADA ${email} email=${emailEnviado}`);
        return res.json({ ok: true, status: "estatistica-aplicada-liberada", uid, email, plano: PACOTE_ESTATISTICA_NOME, pacoteId: PACOTE_ESTATISTICA_ID, pacoteNome: PACOTE_ESTATISTICA_NOME, emailEnviado });
      }

      // COMPRA de Análise Inferencial - Testes de Hipóteses: preserva cursos
      // anteriores e libera os módulos Inferencial, Gráficos e Análises Diversas.
      if (isCompraInferencial) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        const modulosInferencial = new Set(["inferencial", "graficos", "diversas"]);
        const analyticsAnteriores = Array.isArray(vinculoIsraelAnterior?.acessoProdutos?.analytics)
          ? vinculoIsraelAnterior.acessoProdutos.analytics
          : [];
        const analyticsMesclados = [
          ...analyticsAnteriores.filter((item: any) => !modulosInferencial.has(String(item?.modulo || item?.id || item).trim())),
          ...analyticsComprado,
        ];
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_INFERENCIAL_NOME,
          pacoteId: PACOTE_INFERENCIAL_ID,
          pacoteNome: PACOTE_INFERENCIAL_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          acessoProdutos: { ...(vinculoIsraelAnterior?.acessoProdutos || {}), analytics: analyticsMesclados },
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "analise-inferencial", contexto: "existente" });
        console.log(`[acesso/liberar] ANALISE INFERENCIAL ${email} email=${emailEnviado}`);
        return res.json({ ok: true, status: "analise-inferencial-liberada", uid, email, plano: PACOTE_INFERENCIAL_NOME, pacoteId: PACOTE_INFERENCIAL_ID, pacoteNome: PACOTE_INFERENCIAL_NOME, emailEnviado });
      }

      // COMPRA de Controle Estatístico de Processo: preserva cursos anteriores
      // e libera Controle de Processo, Gráficos e Análises Diversas.
      if (isCompraCep) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        const modulosCep = new Set(["cep", "graficos", "diversas"]);
        const analyticsAnteriores = Array.isArray(vinculoIsraelAnterior?.acessoProdutos?.analytics)
          ? vinculoIsraelAnterior.acessoProdutos.analytics
          : [];
        const analyticsMesclados = [
          ...analyticsAnteriores.filter((item: any) => !modulosCep.has(String(item?.modulo || item?.id || item).trim())),
          ...analyticsComprado,
        ];
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_CEP_NOME,
          pacoteId: PACOTE_CEP_ID,
          pacoteNome: PACOTE_CEP_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          acessoProdutos: { ...(vinculoIsraelAnterior?.acessoProdutos || {}), analytics: analyticsMesclados },
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "cep", contexto: "existente" });
        console.log(`[acesso/liberar] CEP ${email} email=${emailEnviado}`);
        return res.json({ ok: true, status: "cep-liberado", uid, email, plano: PACOTE_CEP_NOME, pacoteId: PACOTE_CEP_ID, pacoteNome: PACOTE_CEP_NOME, emailEnviado });
      }

      // COMPRA de Análise Preditiva - Regressões, Correlações e Séries Temporais: preserva cursos
      // anteriores e libera Análise Preditiva, Gráficos e Análises Diversas.
      if (isCompraPreditiva) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        const modulosPreditiva = new Set(["preditiva", "graficos", "diversas"]);
        const analyticsAnteriores = Array.isArray(vinculoIsraelAnterior?.acessoProdutos?.analytics)
          ? vinculoIsraelAnterior.acessoProdutos.analytics
          : [];
        const analyticsMesclados = [
          ...analyticsAnteriores.filter((item: any) => !modulosPreditiva.has(String(item?.modulo || item?.id || item).trim())),
          ...analyticsComprado,
        ];
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_PREDITIVA_NOME,
          pacoteId: PACOTE_PREDITIVA_ID,
          pacoteNome: PACOTE_PREDITIVA_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          acessoProdutos: { ...(vinculoIsraelAnterior?.acessoProdutos || {}), analytics: analyticsMesclados },
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "preditiva", contexto: "existente" });
        console.log(`[acesso/liberar] ANALISE PREDITIVA ${email} email=${emailEnviado}`);
        return res.json({ ok: true, status: "analise-preditiva-liberada", uid, email, plano: PACOTE_PREDITIVA_NOME, pacoteId: PACOTE_PREDITIVA_ID, pacoteNome: PACOTE_PREDITIVA_NOME, emailEnviado });
      }

      // COMPRA de MSA - Análise do Sistema de Medição: preserva cursos
      // anteriores e libera MSA, Gráficos e Análises Diversas.
      if (isCompraMsa) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        const modulosMsa = new Set(["msa", "graficos", "diversas"]);
        const analyticsAnteriores = Array.isArray(vinculoIsraelAnterior?.acessoProdutos?.analytics)
          ? vinculoIsraelAnterior.acessoProdutos.analytics
          : [];
        const analyticsMesclados = [
          ...analyticsAnteriores.filter((item: any) => !modulosMsa.has(String(item?.modulo || item?.id || item).trim())),
          ...analyticsComprado,
        ];
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_MSA_NOME,
          pacoteId: PACOTE_MSA_ID,
          pacoteNome: PACOTE_MSA_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          acessoProdutos: { ...(vinculoIsraelAnterior?.acessoProdutos || {}), analytics: analyticsMesclados },
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "msa", contexto: "existente" });
        console.log(`[acesso/liberar] MSA ${email} email=${emailEnviado}`);
        return res.json({ ok: true, status: "msa-liberado", uid, email, plano: PACOTE_MSA_NOME, pacoteId: PACOTE_MSA_ID, pacoteNome: PACOTE_MSA_NOME, emailEnviado });
      }

      // COMPRA de Software LBW Completo: NÃO mexe em cursosAcesso (cursoComprado é
      // null pra esse pacote — mesclarCursoComprado já devolve a lista intacta) e
      // libera os 8 módulos de Data Analysis de uma vez.
      if (isCompraSoftware) {
        // Catálogo inteiro de cursos (não mesclarCursoComprado, que serve pros
        // pacotes de 1 curso só): este degrau entrega cursos + Data Analysis.
        const cursosMesclados = mesclarCursosCatalogo(vinculoIsraelAnterior?.cursosAcesso);
        // Projetos guiados NÃO entram neste degrau (são o degrau 3). Sem gravar
        // projetosAcesso explicitamente, canUseInitiative cairia na checagem por
        // CURSO — e como este pacote libera todos os cursos, inclusive o curso a
        // que os projetos Yellow/Green/Black estão vinculados, o aluno receberia
        // os Belts de graça e o degrau 3 perderia o sentido. Grava o que ele já
        // tinha (upgrade preserva) ou vazio (compra nova não ganha Belt).
        const projetosPreservados = Array.isArray(vinculoIsraelAnterior?.projetosAcesso)
          ? vinculoIsraelAnterior.projetosAcesso
          : [];
        const modulosSoftware = new Set(ANALYTICS_MODULOS.map((m) => m.id));
        const analyticsAnteriores = Array.isArray(vinculoIsraelAnterior?.acessoProdutos?.analytics)
          ? vinculoIsraelAnterior.acessoProdutos.analytics
          : [];
        const analyticsMesclados = [
          ...analyticsAnteriores.filter((item: any) => !modulosSoftware.has(String(item?.modulo || item?.id || item).trim())),
          ...analyticsComprado,
        ];
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_SOFTWARE_NOME,
          pacoteId: PACOTE_SOFTWARE_ID,
          pacoteNome: PACOTE_SOFTWARE_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          acessoProdutos: { ...(vinculoIsraelAnterior?.acessoProdutos || {}), analytics: analyticsMesclados },
          projetosAcesso: projetosPreservados,
          projetosAcessoConfigurado: true,
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "software-lbw", contexto: "existente" });
        console.log(`[acesso/liberar] SOFTWARE LBW ${email} email=${emailEnviado}`);
        return res.json({ ok: true, status: "software-lbw-liberado", uid, email, plano: PACOTE_SOFTWARE_NOME, pacoteId: PACOTE_SOFTWARE_ID, pacoteNome: PACOTE_SOFTWARE_NOME, emailEnviado });
      }

      // COMPRA de Como Recomendar Melhorias com Base em Dados - GATE: preserva
      // os acessos anteriores e acrescenta somente o curso. O projeto guiado e
      // suas ferramentas continuam obedecendo à associação já configurada no curso.
      if (isCompraGate) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_GATE_NOME,
          pacoteId: PACOTE_GATE_ID,
          pacoteNome: PACOTE_GATE_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "gate", contexto: "existente" });
        console.log(`[acesso/liberar] GATE ${email} email=${emailEnviado}`);
        return res.json({ ok: true, status: "gate-liberado", uid, email, plano: PACOTE_GATE_NOME, pacoteId: PACOTE_GATE_ID, pacoteNome: PACOTE_GATE_NOME, emailEnviado });
      }

      // COMPRA de Como Conduzir Mudanças com Menos Resistência: preserva os
      // acessos anteriores e acrescenta somente o curso. Projetos e ferramentas
      // associados continuam seguindo a configuração administrativa do curso.
      if (isCompraMudanca) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_MUDANCA_NOME,
          pacoteId: PACOTE_MUDANCA_ID,
          pacoteNome: PACOTE_MUDANCA_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "gestao-mudanca", contexto: "existente" });
        console.log(`[acesso/liberar] GESTÃO DE MUDANÇA ${email} email=${emailEnviado}`);
        return res.json({
          ok: true,
          status: "gestao-mudanca-liberada",
          uid,
          email,
          plano: PACOTE_MUDANCA_NOME,
          pacoteId: PACOTE_MUDANCA_ID,
          pacoteNome: PACOTE_MUDANCA_NOME,
          emailEnviado,
        });
      }

      // COMPRA de Como Antecipar Riscos Antes que Virem Problemas: preserva os
      // acessos anteriores e acrescenta somente o curso. Projetos e ferramentas
      // associados continuam seguindo a configuração administrativa do curso.
      if (isCompraRisco) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_RISCO_NOME,
          pacoteId: PACOTE_RISCO_ID,
          pacoteNome: PACOTE_RISCO_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "gerenciamento-risco", contexto: "existente" });
        console.log(`[acesso/liberar] GERENCIAMENTO DE RISCO ${email} email=${emailEnviado}`);
        return res.json({
          ok: true,
          status: "gerenciamento-risco-liberado",
          uid,
          email,
          plano: PACOTE_RISCO_NOME,
          pacoteId: PACOTE_RISCO_ID,
          pacoteNome: PACOTE_RISCO_NOME,
          emailEnviado,
        });
      }

      // COMPRA de Como Aplicar a Cultura Lean: preserva os acessos anteriores e
      // acrescenta somente o curso. Projetos e ferramentas associados continuam
      // seguindo a configuração administrativa do curso.
      if (isCompraCulturaLean) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_CULTURA_LEAN_NOME,
          pacoteId: PACOTE_CULTURA_LEAN_ID,
          pacoteNome: PACOTE_CULTURA_LEAN_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "cultura-lean", contexto: "existente" });
        console.log(`[acesso/liberar] CULTURA LEAN ${email} email=${emailEnviado}`);
        return res.json({
          ok: true,
          status: "cultura-lean-liberada",
          uid,
          email,
          plano: PACOTE_CULTURA_LEAN_NOME,
          pacoteId: PACOTE_CULTURA_LEAN_ID,
          pacoteNome: PACOTE_CULTURA_LEAN_NOME,
          emailEnviado,
        });
      }

      // COMPRA da Plataforma Profissional completa: mescla o catálogo vigente do
      // Israel com os acessos anteriores do aluno e libera cursos, Analytics e Projects.
      if (isCompraPlataformaCompleta) {
        const cursosMesclados = mesclarCursosCatalogo(vinculoIsraelAnterior?.cursosAcesso);
        const projetosMesclados = mesclarProjetosComprados(vinculoIsraelAnterior?.projetosAcesso);
        const modulosCompletos = new Set(ANALYTICS_MODULOS.map((m) => m.id));
        const analyticsAnteriores = Array.isArray(vinculoIsraelAnterior?.acessoProdutos?.analytics)
          ? vinculoIsraelAnterior.acessoProdutos.analytics
          : [];
        const analyticsMesclados = [
          ...analyticsAnteriores.filter((item: any) => !modulosCompletos.has(String(item?.modulo || item?.id || item).trim())),
          ...analyticsComprado,
        ];
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_PLATAFORMA_COMPLETA_NOME,
          pacoteId: PACOTE_PLATAFORMA_COMPLETA_ID,
          pacoteNome: PACOTE_PLATAFORMA_COMPLETA_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          acessoProdutos: { ...(vinculoIsraelAnterior?.acessoProdutos || {}), analytics: analyticsMesclados },
          projetosAcesso: projetosMesclados,
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "plataforma-completa", contexto: "existente" });
        console.log(`[acesso/liberar] PLATAFORMA COMPLETA ${email} cursos=${cursosMesclados.length} projetos=${projetosMesclados.length} email=${emailEnviado}`);
        return res.json({
          ok: true,
          status: "plataforma-completa-liberada",
          uid,
          email,
          plano: PACOTE_PLATAFORMA_COMPLETA_NOME,
          pacoteId: PACOTE_PLATAFORMA_COMPLETA_ID,
          pacoteNome: PACOTE_PLATAFORMA_COMPLETA_NOME,
          cursosLiberados: cursosMesclados.length,
          modulosAnalyticsLiberados: analyticsMesclados.length,
          projetosLiberados: projetosMesclados.length,
          emailEnviado,
        });
      }

      // COMPRA da Formação Profissional: libera todos os cursos, avaliações e certificados,
      // sem acrescentar Analytics ou Projects. Projetos que o aluno já possuía por
      // outra compra são materializados e preservados antes de ampliar os cursos.
      if (isCompraAcademy) {
        const cursosAnteriores = Array.isArray(vinculoIsraelAnterior?.cursosAcesso)
          ? vinculoIsraelAnterior.cursosAcesso.map((item: any) => normalizarPacote(String(item?.curso || "")))
          : [];
        const projetosAnterioresExplicitos = Array.isArray(vinculoIsraelAnterior?.projetosAcesso)
          ? vinculoIsraelAnterior.projetosAcesso
          : [];
        const projetosHerdadosDosCursos = projetosAnterioresExplicitos.length > 0
          ? projetosAnterioresExplicitos
          : projetosCatalogoCompleto.filter((projeto: any) => {
              const iniciativa = catalogoCompleto.find((item: any) => String(item.id) === String(projeto.projeto));
              if (!iniciativa) return false;
              const cursoAssociado = iniciativa.cursoAssociadoId
                ? catalogoCompleto.find((item: any) => String(item.id) === String(iniciativa.cursoAssociadoId))
                : iniciativa;
              return cursoAssociado && cursosAnteriores.includes(normalizarPacote(String(cursoAssociado.name || "")));
            });
        const cursosMesclados = mesclarCursosCatalogo(vinculoIsraelAnterior?.cursosAcesso);
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_ACADEMY_NOME,
          pacoteId: PACOTE_ACADEMY_ID,
          pacoteNome: PACOTE_ACADEMY_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          projetosAcesso: projetosHerdadosDosCursos,
          projetosAcessoConfigurado: true,
          origem: "compra-hotmart",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "lbw-academy", contexto: "existente" });
        console.log(`[acesso/liberar] FORMAÇÃO PROFISSIONAL ${email} cursos=${cursosMesclados.length} email=${emailEnviado}`);
        return res.json({
          ok: true,
          status: "lbw-academy-liberada",
          uid,
          email,
          plano: PACOTE_ACADEMY_NOME,
          pacoteId: PACOTE_ACADEMY_ID,
          pacoteNome: PACOTE_ACADEMY_NOME,
          cursosLiberados: cursosMesclados.length,
          emailEnviado,
        });
      }

      // O produto historicamente chamado "completo" agora libera literalmente
      // somente o curso especialista, preservando qualquer curso anterior.
      if (planoSolicitado === "completo" && !(Array.isArray(vinculoIsraelAnterior?.cursosAcesso) && vinculoIsraelAnterior.cursosAcesso.some((c: any) => String(c?.curso || "").trim() === cursoComprado))) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        await salvarAcessoIsrael({ plano: "por_curso", planoComercialLegado: "completo", modeloAcesso: "por_curso", cursosAcesso: cursosMesclados, cursosLiberados: cursosMesclados.map((c: any) => c.curso), origem: "compra-hotmart" });
        const emailEnviado = await sendAcessoEmail({ para: email, nome, plano: "completo", contexto: "upgrade" });
        console.log(`[acesso/liberar] UPGRADE ${email}: ${planoAtual} -> completo`);
        return res.json({ ok: true, status: "atualizado-completo", uid, email, plano: "completo", emailEnviado });
      }

      // COMPRA da Trilha 1 por quem já existia: preserva os acessos anteriores,
      // libera o curso e os módulos Gráficos e Análises Diversas e registra a
      // compra com sua validade. Não rebaixa quem já possui outros produtos.
      if (isCompraTrilha1) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        const modulosKit90 = new Set(["graficos", "diversas"]);
        const analyticsAnteriores = Array.isArray(vinculoIsraelAnterior?.acessoProdutos?.analytics)
          ? vinculoIsraelAnterior.acessoProdutos.analytics
          : [];
        const analyticsMesclados = [
          ...analyticsAnteriores.filter((item: any) => !modulosKit90.has(String(item?.modulo || item?.id || item).trim())),
          ...analyticsComprado,
        ];
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: PACOTE_KIT90_NOME,
          pacoteId: PACOTE_KIT90_ID,
          pacoteNome: PACOTE_KIT90_NOME,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          acessoProdutos: { ...(vinculoIsraelAnterior?.acessoProdutos || {}), analytics: analyticsMesclados },
          origem: "compra-trilha1",
          ...(acessoAteCompra ? { acessoCompletoAte: acessoAteCompra } : {}),
        });
        console.log(`[acesso/liberar] COMPRA-TRILHA1 (ja existia) ${email}`);
        return res.json({ ok: true, status: "compra-trilha1-registrada", uid, email, plano: PACOTE_KIT90_NOME, pacoteId: PACOTE_KIT90_ID, pacoteNome: PACOTE_KIT90_NOME });
      }

      // Materializa usuários legados no modelo de vínculos, mesmo sem mudança de plano.
      if (!base.vinculos?.[consultorCompraId]) {
        const cursosMesclados = mesclarCursoComprado(vinculoIsraelAnterior?.cursosAcesso);
        await salvarAcessoIsrael({
          plano: "por_curso",
          planoComercialLegado: planoSolicitado,
          modeloAcesso: "por_curso",
          cursosAcesso: cursosMesclados,
          cursosLiberados: cursosMesclados.map((c: any) => c.curso),
          origem: vinculoIsraelAnterior?.origem || base.origem || "legado-israel",
        });
      }

      // Já tinha o plano pedido (ou já é completo): nada a fazer, não duplica nem reenvia senha
      console.log(`[acesso/liberar] JA_EXISTIA ${email} (plano atual: ${planoAtual})`);
      return res.json({ ok: true, status: "ja-existia", uid, email, plano: planoAtual });
    } catch (err: any) {
      console.error("[acesso/liberar] ERRO:", err?.message || err);
      return res.status(500).json({ error: err?.message || "Falha ao liberar acesso." });
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
