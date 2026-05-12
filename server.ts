import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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
