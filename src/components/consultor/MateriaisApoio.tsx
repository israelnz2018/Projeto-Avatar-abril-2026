import { useEffect, useState } from 'react';
import { FileUp, Loader2, Trash2, ExternalLink, Pencil, X, Check } from 'lucide-react';
import { useConsultor } from '../../contexts/ConsultorContext';
import {
  CategoriaMaterial,
  NivelMaterial,
  SupportMaterial,
  deleteSupportMaterial,
  listSupportMaterials,
  updateSupportMaterial,
  uploadSupportMaterial,
} from '../../services/supportMaterialService';

const CATEGORIAS: CategoriaMaterial[] = ['Material', 'Mapa', 'Planilha', 'PPT'];
const NIVEIS: { value: NivelMaterial; label: string }[] = [
  { value: 'todos', label: 'Todos os alunos' },
  { value: 'trilha1', label: 'Trilha 1 (Kit 90) ou superior' },
  { value: 'completo', label: 'Só plano Completo' },
];

export default function MateriaisApoio() {
  const { consultorId } = useConsultor();
  const [items, setItems] = useState<SupportMaterial[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaMaterial>('Material');
  const [nivel, setNivel] = useState<NivelMaterial>('todos');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Edição inline
  const [editId, setEditId] = useState<string | null>(null);
  const [eTitulo, setETitulo] = useState('');
  const [eDescricao, setEDescricao] = useState('');
  const [eCategoria, setECategoria] = useState<CategoriaMaterial>('Material');
  const [eNivel, setENivel] = useState<NivelMaterial>('todos');
  const [eFile, setEFile] = useState<File | null>(null);
  const [eSaving, setESaving] = useState(false);

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
      await uploadSupportMaterial({ titulo, descricao, file, consultorId, categoria, nivel });
      setTitulo(''); setDescricao(''); setFile(null); setCategoria('Material'); setNivel('todos');
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

  const abrirEdicao = (material: SupportMaterial) => {
    setEditId(material.id);
    setETitulo(material.titulo);
    setEDescricao(material.descricao);
    setECategoria(material.categoria || 'Material');
    setENivel(material.nivel || 'todos');
    setEFile(null);
  };

  const salvarEdicao = async (material: SupportMaterial) => {
    if (!eTitulo.trim()) { setMessage('Informe o título.'); return; }
    setESaving(true);
    try {
      await updateSupportMaterial(material, { titulo: eTitulo, descricao: eDescricao, categoria: eCategoria, nivel: eNivel }, eFile || undefined);
      setEditId(null);
      await load();
    } catch (error: any) { setMessage(`Erro: ${error?.message || error}`); }
    finally { setESaving(false); }
  };

  const campo = 'mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 font-normal text-sm';
  const label = 'text-sm font-bold text-gray-700';

  return (
    <div className="max-w-5xl mx-auto p-2 md:p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-900">Material de Apoio</h2>
        <p className="text-sm text-gray-500 mt-1">
          Publique arquivos (mapas, planilhas, PPTs, materiais em geral) que aparecerão pros seus alunos em
          <b> Checklists, Mapas e PPTs</b>. Defina o nível de acesso de cada um.
        </p>
      </div>

      <form onSubmit={submit} className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 grid gap-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className={label}>Título
            <input value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120}
              className={campo} placeholder="Ex.: Apostila da Trilha 1" />
          </label>
          <label className={label}>Arquivo
            <input type="file" onChange={e => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.zip,image/*"
              className="mt-1 block w-full text-sm font-normal" />
          </label>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <label className={label}>Categoria
            <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaMaterial)} className={campo}>
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className={label}>Quem pode acessar
            <select value={nivel} onChange={e => setNivel(e.target.value as NivelMaterial)} className={campo}>
              {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
            </select>
          </label>
        </div>
        <label className={label}>Descrição
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} maxLength={500} rows={3}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 font-normal resize-y text-sm" placeholder="Explique brevemente como o aluno deve usar este material." />
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
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4">
              {editId === item.id ? (
                <div className="grid gap-3">
                  <div className="grid md:grid-cols-2 gap-3">
                    <input value={eTitulo} onChange={e => setETitulo(e.target.value)} maxLength={120} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Título" />
                    <input type="file" onChange={e => setEFile(e.target.files?.[0] || null)} className="text-sm" title="Deixe vazio pra manter o arquivo atual" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <select value={eCategoria} onChange={e => setECategoria(e.target.value as CategoriaMaterial)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                      {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={eNivel} onChange={e => setENivel(e.target.value as NivelMaterial)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                      {NIVEIS.map(n => <option key={n.value} value={n.value}>{n.label}</option>)}
                    </select>
                  </div>
                  <textarea value={eDescricao} onChange={e => setEDescricao(e.target.value)} maxLength={500} rows={2} className="rounded-lg border border-gray-300 px-3 py-2 text-sm resize-y" placeholder="Descrição" />
                  <div className="flex items-center gap-2">
                    <button onClick={() => salvarEdicao(item)} disabled={eSaving} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-bold disabled:opacity-60">
                      {eSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Salvar
                    </button>
                    <button onClick={() => setEditId(null)} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 text-gray-700 px-3 py-1.5 text-xs font-bold">
                      <X size={14} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <FileUp className="text-blue-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 truncate m-0">{item.titulo}</p>
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{item.categoria || 'Material'}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        {NIVEIS.find(n => n.value === (item.nivel || 'todos'))?.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{item.descricao || item.arquivoNome}</p>
                  </div>
                  <a href={item.arquivoUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-blue-700" title="Abrir"><ExternalLink size={18} /></a>
                  <button onClick={() => abrirEdicao(item)} className="p-2 text-gray-500 hover:text-blue-700" title="Editar"><Pencil size={18} /></button>
                  <button onClick={() => remove(item)} className="p-2 text-red-600" title="Excluir"><Trash2 size={18} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
