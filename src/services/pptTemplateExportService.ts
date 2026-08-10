/** Geração usando o PPTX real do consultor. O servidor resolve o modelo pelo tenant
 * autenticado; o browser nunca recebe credenciais nem manipula o arquivo original. */
import { auth } from '../lib/firebase';

let templateAtivo = false;

export function setPptTemplateAtivo(capaUrl?: string, internaUrl?: string): void {
  templateAtivo = /\.pptx(?:\?|$)/i.test(capaUrl || '') && /\.pptx(?:\?|$)/i.test(internaUrl || '');
}

export function temPptTemplateAtivo(): boolean { return templateAtivo; }

function baixar(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = fileName; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportarFerramentaNoTemplate(payload: {
  toolId: string; project: any; localData: any; aiAnalysis: string; options?: any;
}): Promise<void> {
  return exportar('/api/ppt/gerar-ferramenta', payload, 'Apresentacao.pptx');
}

export async function exportarApresentacaoNoTemplate(payload: { project: any; jobs: any[] }): Promise<void> {
  return exportar('/api/ppt/gerar-apresentacao', payload, 'Apresentacao_Final.pptx');
}

async function exportar(endpoint: string, payload: any, fallbackName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente para gerar o PowerPoint.');
  const token = await user.getIdToken();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Não foi possível gerar o PowerPoint no seu template.');
  }
  const disp = response.headers.get('content-disposition') || '';
  const match = /filename="?([^";]+)"?/i.exec(disp);
  baixar(await response.blob(), match?.[1] || fallbackName);
}
