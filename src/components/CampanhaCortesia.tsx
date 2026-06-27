/**
 * CampanhaCortesia — seção na aba Marketing (admin) pra a campanha de
 * agradecimento (acesso cortesia até 31/12). Permite ENVIAR TESTE pra 1 e-mail
 * antes do disparo em massa pros 80 cortesia.
 */
import { useState } from 'react';
import { Gift, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { campanhaCortesiaHtml, CAMPANHA_ASSUNTO } from '../services/campanhaCortesiaEmail';

async function authedPost(url: string, body: any): Promise<Response> {
  const user = auth.currentUser;
  if (!user) throw new Error('Não autenticado.');
  const token = await user.getIdToken();
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

export default function CampanhaCortesia() {
  const [emailTeste, setEmailTeste] = useState('israelpb@yahoo.com.br');
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ ok: boolean; msg: string } | null>(null);

  // Disparo em massa (cortesia) — confirmação em 2 passos.
  const [disparando, setDisparando] = useState(false);
  const [previa, setPrevia] = useState<string[] | null>(null);
  const [resultadoMassa, setResultadoMassa] = useState<{ ok: boolean; msg: string } | null>(null);

  const enviarTeste = async () => {
    const to = emailTeste.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setResultado({ ok: false, msg: 'Informe um e-mail válido.' });
      return;
    }
    setEnviando(true); setResultado(null);
    try {
      const html = campanhaCortesiaHtml(to);
      const r = await authedPost('/api/campanha/teste', { to, assunto: CAMPANHA_ASSUNTO, html });
      const b = await r.json().catch(() => ({}));
      if (r.ok && b.ok) setResultado({ ok: true, msg: `E-mail de teste enviado para ${to}. Confira a caixa de entrada (e o spam).` });
      else setResultado({ ok: false, msg: b?.error || b?.body || 'Falha ao enviar o teste.' });
    } catch (e: any) {
      setResultado({ ok: false, msg: e?.message || 'Erro ao enviar.' });
    } finally {
      setEnviando(false);
    }
  };

  // Passo 1: prévia (dryRun) — mostra a lista exata de quem receberia, sem enviar.
  const verPrevia = async () => {
    setDisparando(true); setResultadoMassa(null); setPrevia(null);
    try {
      // mesmo template do teste; o e-mail de cada destinatário é injetado pelo server.
      const html = campanhaCortesiaHtml('__EMAIL_DESTINO__');
      const r = await authedPost('/api/campanha/cortesia', { assunto: CAMPANHA_ASSUNTO, html, dryRun: true });
      const b = await r.json().catch(() => ({}));
      if (r.ok && Array.isArray(b.emails)) setPrevia(b.emails);
      else setResultadoMassa({ ok: false, msg: b?.error || 'Falha ao carregar a prévia.' });
    } catch (e: any) {
      setResultadoMassa({ ok: false, msg: e?.message || 'Erro ao carregar a prévia.' });
    } finally {
      setDisparando(false);
    }
  };

  // Passo 2: disparo de verdade — só depois da prévia + confirmação dupla.
  const dispararMassa = async () => {
    const n = previa?.length || 0;
    if (!window.confirm(`Confirmar o disparo da campanha cortesia para ${n} pessoas? Esta ação é IRREVERSÍVEL.`)) return;
    setDisparando(true); setResultadoMassa(null);
    try {
      const html = campanhaCortesiaHtml('__EMAIL_DESTINO__');
      const r = await authedPost('/api/campanha/cortesia', { assunto: CAMPANHA_ASSUNTO, html });
      const b = await r.json().catch(() => ({}));
      if (r.ok) setResultadoMassa({ ok: true, msg: `Disparo concluído: ${b.enviados} enviados, ${b.falhas} falhas (de ${b.total}).` });
      else setResultadoMassa({ ok: false, msg: b?.error || 'Falha no disparo.' });
    } catch (e: any) {
      setResultadoMassa({ ok: false, msg: e?.message || 'Erro no disparo.' });
    } finally {
      setDisparando(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 mt-5">
      <div className="flex items-center gap-3 mb-1">
        <Gift className="w-5 h-5 text-blue-700" />
        <h2 className="font-semibold text-gray-900">Campanha de cortesia (acesso grátis até 31/12)</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        E-mail de agradecimento aos convidados (acesso completo cortesia). Teste primeiro, depois dispare pros 80.
      </p>

      <div className="rounded-xl border border-gray-200 p-4 bg-gray-50">
        <div className="text-xs font-semibold text-gray-500 mb-1">Assunto</div>
        <div className="text-sm text-gray-800 mb-3">{CAMPANHA_ASSUNTO}</div>

        <label className="block text-xs font-semibold text-gray-500 mb-1">Enviar e-mail de teste para:</label>
        <div className="flex flex-wrap gap-2">
          <input
            value={emailTeste}
            onChange={(e) => setEmailTeste(e.target.value)}
            placeholder="email@teste.com"
            className="flex-1 min-w-[220px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={enviarTeste}
            disabled={enviando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            <Send className="w-4 h-4" /> {enviando ? 'Enviando…' : 'Enviar teste'}
          </button>
        </div>

        {resultado && (
          <div className={`mt-3 text-sm rounded-lg px-3 py-2 flex items-start gap-2 ${resultado.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {resultado.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
            <span>{resultado.msg}</span>
          </div>
        )}
      </div>

      {/* ── DISPARO EM MASSA (cortesia) ── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mt-4">
        <div className="text-sm font-semibold text-amber-900 mb-1">Disparo em massa (cortesia)</div>
        <p className="text-xs text-amber-800 mb-3">
          Envia só pros usuários cortesia (acesso completo até 31/12). Emerson, Mariana e seus e-mails ficam <strong>sempre fora</strong>.
          Veja a lista antes de disparar.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={verPrevia}
            disabled={disparando}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-amber-300 text-amber-900 text-sm font-semibold hover:bg-amber-100 disabled:opacity-60"
          >
            {disparando && !previa ? 'Carregando…' : 'Ver quem vai receber'}
          </button>

          {previa && (
            <button
              onClick={dispararMassa}
              disabled={disparando || previa.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
            >
              <Send className="w-4 h-4" /> {disparando ? 'Disparando…' : `Disparar agora (${previa.length})`}
            </button>
          )}
        </div>

        {previa && (
          <div className="mt-3 text-xs bg-white border border-amber-200 rounded-lg p-3 max-h-44 overflow-y-auto">
            <div className="font-semibold text-gray-700 mb-1">{previa.length} destinatário(s):</div>
            <ul className="space-y-0.5 text-gray-600">
              {previa.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}

        {resultadoMassa && (
          <div className={`mt-3 text-sm rounded-lg px-3 py-2 flex items-start gap-2 ${resultadoMassa.ok ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {resultadoMassa.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertTriangle className="w-4 h-4 mt-0.5" />}
            <span>{resultadoMassa.msg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
