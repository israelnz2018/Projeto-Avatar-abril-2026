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

      <p className="text-xs text-gray-400 mt-3">
        O disparo em massa (pros 80) será liberado depois que você aprovar o teste.
      </p>
    </div>
  );
}
