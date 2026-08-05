import { useEffect, useState } from 'react';
import { FileUp, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';
import {
  deleteSupportMaterial,
  listSupportMaterials,
  SupportMaterial,
  uploadSupportMaterial,
} from '../../services/supportMaterialService';

export default function MateriaisApoio() {
  const { consultorId } = useConsultor();
  const [items, setItems] = useState<SupportMaterial[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try { setItems(await listSupportMaterials(consultorId)); }
    catch (error: any) { setMessage(`Erro: ${error?.message || error}`); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [consultorId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!titulo.trim() || !file) {
      setMessage('Informe o título e escolha um arquivo.');
      return;
    }
    setSaving(true);
    setMessage('');
    try {
      await uploadSupportMaterial({ titulo, descricao, file, consultorId });
      setTitulo(''); setDescricao(''); setFile(null);
      setMessage('Material publicado com sucesso.');
      await load();
    } catch (error: any) {
      setMessage(`Erro: ${error?.message || error}`);
    } finally { setSaving(false); }
  };

  const remove = async (material: SupportMaterial) => {
    if (!window.confirm(`Excluir "${material.titulo}"?`)) return;
    try {
      await deleteSupportMaterial(material);
      setItems(current => current.filter(item => item.id !== material.id));
    } catch (error: any) { setMessage(`Erro: ${error?.message || error}`); }
  };

  return (
    <div className="max-w-5xl mx-auto p-2 md:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900">Material de Apoio</h2>
        <p className="text-sm text-gray-500 mt-1">Publique arquivos que aparecerão na aba Material de Apoio dos seus alunos.</p>
      </div>

      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 grid gap-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="text-sm font-bold text-gray-700">Título
            <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 font-normal" placeholder="Ex.: Apostila da Trilha 1" />
          </label>
          <label className="text-sm font-bold text-gray-700">Arquivo
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,image/*"
              className="mt-1 block w-full text-sm font-normal" />
          </label>
        </div>
        <label className="text-sm font-bold text-gray-700">Descrição
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} maxLength={500} rows={3}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 font-normal resize-y" placeholder="Explique brevemente como o aluno deve usar este material." />
        </label>
        <div className="flex items-center gap-3">
          <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 text-white px-4 py-2.5 font-bold disabled:opacity-60">
            {saving ? <Loader2 size={17} className="animate-spin" /> : <FileUp size={17} />} Publicar material
          </button>
          {message && <span className="text-sm text-gray-600">{message}</span>}
        </div>
      </form>

      {loading ? <div className="py-10 text-center text-gray-500">Carregando materiais...</div> : (
        <div className="space-y-3">
          {items.length === 0 && <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-10 text-center text-gray-500">Nenhum material publicado.</div>}
          {items.map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
              <FileUp className="text-blue-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{item.titulo}</p>
                <p className="text-xs text-gray-500 truncate">{item.descricao || item.arquivoNome}</p>
              </div>
              <a href={item.arquivoUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-700" title="Abrir"><ExternalLink size={18} /></a>
              <button onClick={() => remove(item)} className="p-2 text-red-600" title="Excluir"><Trash2 size={18} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
