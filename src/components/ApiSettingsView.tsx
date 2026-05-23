import React, { useEffect, useState } from 'react';
import { Key, Save, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, BarChart3, RefreshCw } from 'lucide-react';
import { auth } from '../lib/firebase';
import {
  ApiSettings,
  DEFAULT_GEMINI_MODEL,
  DEFAULT_ANTHROPIC_HAIKU,
  DEFAULT_ANTHROPIC_SONNET,
  DEFAULT_ANTHROPIC_OPUS,
  getApiSettings,
  updateApiSettings,
} from '../services/apiSettingsService';
import { getUsageLastNDays, trackAnthropicUsage, UsageDoc } from '../services/apiUsageService';
import { getGeminiPrice, getAnthropicPrice, estimateCostUSD, formatUSD } from '../services/pricing';

const ANTHROPIC_HAIKU_OPTIONS = ['claude-haiku-4-5-20251001', 'claude-haiku-4-5', 'claude-3-5-haiku-latest'];
const ANTHROPIC_SONNET_OPTIONS = ['claude-sonnet-4-6', 'claude-sonnet-4-5', 'claude-3-7-sonnet-latest'];
const ANTHROPIC_OPUS_OPTIONS = ['claude-opus-4-7', 'claude-opus-4-1', 'claude-3-opus-latest'];

// Lista atualizada em 2026-05-23. Só modelos STABLE (GA) — sem preview/experimental.
// Ordem: do mais recomendado pro nosso uso (estruturação barata) ao mais avançado.
const GEMINI_MODELS: Array<{ id: string; label: string }> = [
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite — $0.04 in / $0.15 out · 💰 mais barato (recomendado)' },
  { id: 'gemini-2.5-flash',      label: 'Gemini 2.5 Flash — $0.075 in / $0.30 out · equilibrado' },
  { id: 'gemini-2.5-pro',        label: 'Gemini 2.5 Pro — $1.25 in / $5.00 out · reasoning avançado' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash-Lite — $0.05 in / $0.20 out · 3.x cost-effective' },
  { id: 'gemini-3.5-flash',      label: 'Gemini 3.5 Flash — $0.15 in / $0.60 out · ⭐ top stable 3.x' },
];
const GEMINI_MODEL_IDS = GEMINI_MODELS.map(m => m.id);

function maskKey(key: string): string {
  if (!key) return '(não configurada)';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

export default function ApiSettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'gemini' | 'anthropic' | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testingAnthropic, setTestingAnthropic] = useState(false);
  const [testResultAnthropic, setTestResultAnthropic] = useState<{ ok: boolean; message: string } | null>(null);

  const [geminiKey, setGeminiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState(DEFAULT_GEMINI_MODEL);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [modelHaiku, setModelHaiku] = useState(DEFAULT_ANTHROPIC_HAIKU);
  const [modelSonnet, setModelSonnet] = useState(DEFAULT_ANTHROPIC_SONNET);
  const [modelOpus, setModelOpus] = useState(DEFAULT_ANTHROPIC_OPUS);

  const [showGemini, setShowGemini] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  const [savedSettings, setSavedSettings] = useState<ApiSettings | null>(null);
  const [usage, setUsage] = useState<UsageDoc[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getApiSettings();
      setSavedSettings(s);
      setGeminiKey(s.gemini.apiKey);
      setGeminiModel(s.gemini.model || DEFAULT_GEMINI_MODEL);
      setAnthropicKey(s.anthropic.apiKey);
      setModelHaiku(s.anthropic.modelHaiku || DEFAULT_ANTHROPIC_HAIKU);
      setModelSonnet(s.anthropic.modelSonnet || DEFAULT_ANTHROPIC_SONNET);
      setModelOpus(s.anthropic.modelOpus || DEFAULT_ANTHROPIC_OPUS);
      setLoading(false);
      loadUsage();
    })();
  }, []);

  const loadUsage = async () => {
    setUsageLoading(true);
    try {
      const data = await getUsageLastNDays(30);
      setUsage(data);
    } catch (err) {
      console.error('Erro ao carregar consumo:', err);
    } finally {
      setUsageLoading(false);
    }
  };

  const handleSaveGemini = async () => {
    setSaving('gemini');
    setTestResult(null);
    try {
      await updateApiSettings(
        { gemini: { apiKey: geminiKey.trim(), model: geminiModel } },
        auth.currentUser?.email || 'unknown'
      );
      const s = await getApiSettings();
      setSavedSettings(s);
      alert('✅ Configurações do Gemini salvas.');
    } catch (err: any) {
      alert(`Erro ao salvar: ${err?.message || 'desconhecido'}`);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAnthropic = async () => {
    setSaving('anthropic');
    try {
      await updateApiSettings(
        {
          anthropic: {
            apiKey: anthropicKey.trim(),
            modelHaiku: modelHaiku.trim() || DEFAULT_ANTHROPIC_HAIKU,
            modelSonnet: modelSonnet.trim() || DEFAULT_ANTHROPIC_SONNET,
            modelOpus: modelOpus.trim() || DEFAULT_ANTHROPIC_OPUS,
          },
        },
        auth.currentUser?.email || 'unknown'
      );
      const s = await getApiSettings();
      setSavedSettings(s);
      alert('✅ Configurações da Anthropic salvas.');
    } catch (err: any) {
      alert(`Erro ao salvar: ${err?.message || 'desconhecido'}`);
    } finally {
      setSaving(null);
    }
  };

  const handleTestAnthropic = async () => {
    setTestingAnthropic(true);
    setTestResultAnthropic(null);
    const testModel = modelHaiku.trim() || DEFAULT_ANTHROPIC_HAIKU;
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicKey.trim(),
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: testModel,
          max_tokens: 32,
          messages: [{ role: 'user', content: 'Responda apenas com a palavra OK.' }],
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        await trackAnthropicUsage({ failed: true });
        const errMsg = body?.error?.message || `HTTP ${res.status}`;
        setTestResultAnthropic({ ok: false, message: errMsg });
        return;
      }
      const usage = body?.usage || {};
      await trackAnthropicUsage({
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
      });
      const text = body?.content?.[0]?.text || '';
      setTestResultAnthropic({
        ok: true,
        message: `Conexão OK · modelo ${testModel} · resposta: "${text.trim().slice(0, 40)}"`,
      });
      loadUsage();
    } catch (err: any) {
      await trackAnthropicUsage({ failed: true });
      setTestResultAnthropic({
        ok: false,
        message: err?.message || 'Erro desconhecido (verifique CORS/rede)',
      });
    } finally {
      setTestingAnthropic(false);
    }
  };

  const handleTestGemini = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiKey.trim() });
      const res = await ai.models.generateContent({
        model: geminiModel,
        contents: 'Responda apenas com a palavra OK.',
      });
      const text = res?.text || '';
      setTestResult({
        ok: true,
        message: `Conexão OK · modelo ${geminiModel} · resposta: "${text.trim().slice(0, 40)}"`,
      });
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err?.message || 'Erro desconhecido',
      });
    } finally {
      setTesting(false);
    }
  };

  const totals = usage.reduce(
    (acc, d) => ({
      calls: acc.calls + d.geminiCalls,
      prompt: acc.prompt + d.geminiPromptTokens,
      candidates: acc.candidates + d.geminiCandidatesTokens,
      total: acc.total + d.geminiTotalTokens,
      failures: acc.failures + d.geminiFailures,
    }),
    { calls: 0, prompt: 0, candidates: 0, total: 0, failures: 0 }
  );

  const totalsAnthropic = usage.reduce(
    (acc, d) => ({
      calls: acc.calls + d.anthropicCalls,
      input: acc.input + d.anthropicInputTokens,
      output: acc.output + d.anthropicOutputTokens,
      total: acc.total + d.anthropicTotalTokens,
      failures: acc.failures + d.anthropicFailures,
    }),
    { calls: 0, input: 0, output: 0, total: 0, failures: 0 }
  );

  // Custo estimado — usa o modelo "default" de cada provider como referência.
  // Anthropic usa o tier "sonnet" (mais comum no app). Gemini usa o model configurado.
  const geminiPrice = getGeminiPrice(savedSettings?.gemini.model || geminiModel);
  const anthropicPrice = getAnthropicPrice(savedSettings?.anthropic.modelSonnet || modelSonnet);
  const geminiCostUSD = estimateCostUSD(geminiPrice, totals.prompt, totals.candidates);
  const anthropicCostUSD = estimateCostUSD(anthropicPrice, totalsAnthropic.input, totalsAnthropic.output);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="bg-white p-6 border border-[#ccc] rounded-[4px]">
        <h1 className="text-[1.5rem] font-bold text-[#333] m-0 flex items-center gap-2">
          <Key size={24} className="text-indigo-600" />
          APIs &amp; Consumo
        </h1>
        <p className="text-[#666] mt-1 text-sm">
          Gerencie as chaves de API usadas pelo aplicativo e acompanhe o consumo de tokens. Visível apenas para administradores.
        </p>
      </header>

      {/* Gemini */}
      <section className="bg-white p-6 border border-[#ccc] rounded-[4px] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
              Google Gemini
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Usada em: índices de vídeo, resumos, mentor IA, análise de processos.
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Atual: <span className="font-mono">{maskKey(savedSettings?.gemini.apiKey || '')}</span></div>
            <div>Modelo: <span className="font-mono">{savedSettings?.gemini.model || '—'}</span></div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <div className="flex gap-2">
            <input
              type={showGemini ? 'text' : 'password'}
              value={geminiKey}
              onChange={e => { setGeminiKey(e.target.value); setTestResult(null); }}
              placeholder="AIza…"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-[4px] font-mono text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={() => setShowGemini(s => !s)}
              className="px-3 py-2 border border-gray-300 rounded-[4px] hover:bg-gray-50 cursor-pointer"
              title={showGemini ? 'Ocultar' : 'Mostrar'}
            >
              {showGemini ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Obter em <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline">aistudio.google.com/apikey</a> ou no Google Cloud Console (Credentials → API key, com a Generative Language API habilitada).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Modelo</label>
          <select
            value={geminiModel}
            onChange={e => { setGeminiModel(e.target.value); setTestResult(null); }}
            className="w-full md:w-auto min-w-[480px] px-3 py-2 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:border-blue-500"
          >
            {GEMINI_MODELS.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
          {!GEMINI_MODEL_IDS.includes(geminiModel) && (
            <span className="ml-2 text-xs text-amber-600">Modelo customizado: {geminiModel}</span>
          )}
          <p className="text-[10px] text-gray-500 mt-1">
            Preço em USD por 1M de tokens (entrada / saída) · fonte: maio/2026
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSaveGemini}
            disabled={saving === 'gemini'}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-[4px] font-bold cursor-pointer disabled:opacity-60"
          >
            {saving === 'gemini' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar
          </button>
          <button
            onClick={handleTestGemini}
            disabled={testing || !geminiKey.trim()}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-[4px] font-bold cursor-pointer disabled:opacity-60"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Testar Conexão
          </button>
          {testResult && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-[4px] ${
              testResult.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {testResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {testResult.message}
            </div>
          )}
        </div>
      </section>

      {/* Anthropic */}
      <section className="bg-white p-6 border border-[#ccc] rounded-[4px] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-orange-500 rounded-full" />
              Anthropic (Claude)
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Reservada para integrações futuras com a API da Anthropic.
            </p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Atual: <span className="font-mono">{maskKey(savedSettings?.anthropic.apiKey || '')}</span></div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
          <div className="flex gap-2">
            <input
              type={showAnthropic ? 'text' : 'password'}
              value={anthropicKey}
              onChange={e => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-…"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-[4px] font-mono text-sm focus:outline-none focus:border-orange-500"
            />
            <button
              type="button"
              onClick={() => setShowAnthropic(s => !s)}
              className="px-3 py-2 border border-gray-300 rounded-[4px] hover:bg-gray-50 cursor-pointer"
              title={showAnthropic ? 'Ocultar' : 'Mostrar'}
            >
              {showAnthropic ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Obter em <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-blue-600 underline">console.anthropic.com/settings/keys</a>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Haiku (barato)</label>
            <select
              value={ANTHROPIC_HAIKU_OPTIONS.includes(modelHaiku) ? modelHaiku : 'custom'}
              onChange={e => e.target.value !== 'custom' && setModelHaiku(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:border-orange-500"
            >
              {ANTHROPIC_HAIKU_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              {!ANTHROPIC_HAIKU_OPTIONS.includes(modelHaiku) && <option value="custom">{modelHaiku} (custom)</option>}
            </select>
            <p className="text-[10px] text-gray-500 mt-1">Usado em: <strong>gerar índice de vídeo</strong> (mais barato — ~10× menos que Sonnet)</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Sonnet (padrão)</label>
            <select
              value={ANTHROPIC_SONNET_OPTIONS.includes(modelSonnet) ? modelSonnet : 'custom'}
              onChange={e => e.target.value !== 'custom' && setModelSonnet(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:border-orange-500"
            >
              {ANTHROPIC_SONNET_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              {!ANTHROPIC_SONNET_OPTIONS.includes(modelSonnet) && <option value="custom">{modelSonnet} (custom)</option>}
            </select>
            <p className="text-[10px] text-gray-500 mt-1">Usado em: chat IA, mentor, preencher ferramenta com IA</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Opus (top)</label>
            <select
              value={ANTHROPIC_OPUS_OPTIONS.includes(modelOpus) ? modelOpus : 'custom'}
              onChange={e => e.target.value !== 'custom' && setModelOpus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-[4px] text-sm focus:outline-none focus:border-orange-500"
            >
              {ANTHROPIC_OPUS_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              {!ANTHROPIC_OPUS_OPTIONS.includes(modelOpus) && <option value="custom">{modelOpus} (custom)</option>}
            </select>
            <p className="text-[10px] text-gray-500 mt-1">Usado em: criar nova ferramenta (código React e PPT)</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSaveAnthropic}
            disabled={saving === 'anthropic'}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-[4px] font-bold cursor-pointer disabled:opacity-60"
          >
            {saving === 'anthropic' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Salvar
          </button>
          <button
            onClick={handleTestAnthropic}
            disabled={testingAnthropic || !anthropicKey.trim()}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-[4px] font-bold cursor-pointer disabled:opacity-60"
          >
            {testingAnthropic ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Testar Conexão
          </button>
          {testResultAnthropic && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-[4px] ${
              testResultAnthropic.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}>
              {testResultAnthropic.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {testResultAnthropic.message}
            </div>
          )}
        </div>
      </section>

      {/* Consumo Gemini */}
      <section className="bg-white p-6 border border-[#ccc] rounded-[4px] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-blue-500 rounded-full" />
            <BarChart3 size={20} className="text-blue-600" />
            Consumo do Gemini · últimos 30 dias
          </h2>
          <button
            onClick={loadUsage}
            disabled={usageLoading}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-50 bg-transparent border-none"
          >
            <RefreshCw size={14} className={usageLoading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Chamadas" value={totals.calls.toLocaleString('pt-BR')} />
          <Stat label="Falhas" value={totals.failures.toLocaleString('pt-BR')} tone={totals.failures > 0 ? 'warn' : 'normal'} />
          <Stat label="Tokens entrada" value={totals.prompt.toLocaleString('pt-BR')} />
          <Stat label="Tokens saída" value={totals.candidates.toLocaleString('pt-BR')} />
          <Stat label="Tokens totais" value={totals.total.toLocaleString('pt-BR')} tone="accent" />
          <Stat label="Custo (USD)" value={formatUSD(geminiCostUSD)} tone="accent" />
        </div>
        <p className="text-[10px] text-gray-500 italic">
          Custo estimado usando preço de <span className="font-mono">{savedSettings?.gemini.model || geminiModel}</span>: ${geminiPrice.inputPerMTok}/MTok entrada, ${geminiPrice.outputPerMTok}/MTok saída.
        </p>

        {usage.every(d => d.geminiCalls === 0) ? (
          <p className="text-sm text-gray-500 italic">Nenhum consumo Gemini registrado nos últimos 30 dias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b">
                  <th className="py-2">Data</th>
                  <th className="py-2 text-right">Chamadas</th>
                  <th className="py-2 text-right">Falhas</th>
                  <th className="py-2 text-right">Entrada</th>
                  <th className="py-2 text-right">Saída</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {usage.filter(d => d.geminiCalls > 0 || d.geminiFailures > 0).map(d => (
                  <tr key={d.date} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 font-mono">{d.date}</td>
                    <td className="py-2 text-right">{d.geminiCalls.toLocaleString('pt-BR')}</td>
                    <td className={`py-2 text-right ${d.geminiFailures > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                      {d.geminiFailures.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 text-right">{d.geminiPromptTokens.toLocaleString('pt-BR')}</td>
                    <td className="py-2 text-right">{d.geminiCandidatesTokens.toLocaleString('pt-BR')}</td>
                    <td className="py-2 text-right font-bold">{d.geminiTotalTokens.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Consumo Anthropic */}
      <section className="bg-white p-6 border border-[#ccc] rounded-[4px] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-orange-500 rounded-full" />
            <BarChart3 size={20} className="text-orange-600" />
            Consumo da Anthropic · últimos 30 dias
          </h2>
          <button
            onClick={loadUsage}
            disabled={usageLoading}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-50 bg-transparent border-none"
          >
            <RefreshCw size={14} className={usageLoading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Stat label="Chamadas" value={totalsAnthropic.calls.toLocaleString('pt-BR')} />
          <Stat label="Falhas" value={totalsAnthropic.failures.toLocaleString('pt-BR')} tone={totalsAnthropic.failures > 0 ? 'warn' : 'normal'} />
          <Stat label="Tokens entrada" value={totalsAnthropic.input.toLocaleString('pt-BR')} />
          <Stat label="Tokens saída" value={totalsAnthropic.output.toLocaleString('pt-BR')} />
          <Stat label="Tokens totais" value={totalsAnthropic.total.toLocaleString('pt-BR')} tone="accentOrange" />
          <Stat label="Custo (USD)" value={formatUSD(anthropicCostUSD)} tone="accentOrange" />
        </div>
        <p className="text-[10px] text-gray-500 italic">
          Custo estimado usando preço de <span className="font-mono">{savedSettings?.anthropic.modelSonnet || modelSonnet}</span> (tier padrão): ${anthropicPrice.inputPerMTok}/MTok entrada, ${anthropicPrice.outputPerMTok}/MTok saída. Tarefas que rodam em opus (criar ferramenta) custam ~5× mais.
        </p>

        {usage.every(d => d.anthropicCalls === 0) ? (
          <p className="text-sm text-gray-500 italic">Nenhum consumo Anthropic registrado nos últimos 30 dias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase text-gray-500 border-b">
                  <th className="py-2">Data</th>
                  <th className="py-2 text-right">Chamadas</th>
                  <th className="py-2 text-right">Falhas</th>
                  <th className="py-2 text-right">Entrada</th>
                  <th className="py-2 text-right">Saída</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {usage.filter(d => d.anthropicCalls > 0 || d.anthropicFailures > 0).map(d => (
                  <tr key={d.date} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 font-mono">{d.date}</td>
                    <td className="py-2 text-right">{d.anthropicCalls.toLocaleString('pt-BR')}</td>
                    <td className={`py-2 text-right ${d.anthropicFailures > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                      {d.anthropicFailures.toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 text-right">{d.anthropicInputTokens.toLocaleString('pt-BR')}</td>
                    <td className="py-2 text-right">{d.anthropicOutputTokens.toLocaleString('pt-BR')}</td>
                    <td className="py-2 text-right font-bold">{d.anthropicTotalTokens.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone = 'normal' }: { label: string; value: string; tone?: 'normal' | 'accent' | 'accentOrange' | 'warn' }) {
  const colors = {
    normal: 'bg-gray-50 text-gray-900',
    accent: 'bg-indigo-50 text-indigo-900',
    accentOrange: 'bg-orange-50 text-orange-900',
    warn: 'bg-amber-50 text-amber-900',
  }[tone];
  return (
    <div className={`p-3 rounded-[4px] ${colors}`}>
      <div className="text-xs uppercase opacity-70">{label}</div>
      <div className="text-xl font-bold mt-1">{value}</div>
    </div>
  );
}
