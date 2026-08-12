import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { FileUp, Loader2, Trash2, ExternalLink, Pencil, X, Check } from 'lucide-react';
import { db } from '../../lib/firebase';
import { useConsultor } from '../../contexts/ConsultorContext';
import { isIntroCourse } from '../../services/knowledgeService';
import {
  CategoriaMaterial,
  SupportMaterial,
  deleteSupportMaterial,
  listSupportMaterials,
  updateSupportMaterial,
  uploadSupportMaterial,
} from '../../services/supportMaterialService';

const CATEGORIAS: CategoriaMaterial[] = ['Material', 'Mapa', 'Planilha', 'PPT'];

/** Seletor de cursos: checkbox por curso + "Selecionar todos de uma vez" (cursos = []). */
function SeletorCursos({ cursos, selecionados, onChange }: { cursos: string[]; selecionados: string[]; onChange: (c: string[]) => void }) {
  const todos = selecionados.length === 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-gray-700">Quais cursos têm acesso a este material?</span>
        <button
          type="button"
          onClick={() => onChange(todos ? [...cursos] : [])}
          className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1"
        >
          {todos ? 'Marcar individualmente' : 'Todos de uma vez'}
        </button>
      </div>
      {todos ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700">
          Disponível para todos os cursos.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200 p-3">
          {cursos.length === 0 && <span className="text-xs text-gray-400 col-span-full">Nenhum curso cadastrado ainda.</span>}
          {cursos.map(curso => {
            const marcado = selecionados.includes(curso);
            return (
              <label key={curso} className="flex items-start gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={marcado}
                  onChange={() => onChange(marcado ? selecionados.filter(c => c !== curso) : [...selecionados, curso])}
                />
                <span>{curso}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MateriaisApoio() {
  const { consultorId } = useConsultor();
  const [items, setItems] = useState<SupportMaterial[]>([]);
  const [cursosDisponiveis, setCursosDisponiveis] = useState<string[]>([]);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<CategoriaMaterial>('Material');
  const [cursosSelecionados, setCursosSelecionados] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Edição inline
  const [editId, setEditId] = useState<string | null>(null);
  const [eTitulo, setETitulo] = useState('');
  const [eDescricao, setEDescricao] = useState('');
  const [eCategoria, setECategoria] = useState<CategoriaMaterial>('Material');
  const [eCursos, setECursos] = useState<string[]>([]);
  const [eFile, setEFile] = useState<File | null>(null);
  const [eSaving, setESaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [materiais, kbSnap] = await Promise.all([
        listSupportMaterials(consultorId),
        getDocs(query(collection(db, 'knowledge_base'), where('consultorId', '==', consultorId))),
      ]);
      setItems(materiais);
      setCursosDisponiveis(
        Array.from(new Set(kbSnap.docs.map(d => ((d.data() as any).course || '').trim()).filter((course): course is string => Boolean(course && !isIntroCourse(course))))).sort()
      );
    } catch (error: any) { setMessage(`Erro: ${error?.message || error}`); }
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
      await uploadSupportMaterial({ titulo, descricao, file, consultorId, categoria, cursos: cursosSelecionados });
      setTitulo(''); setDescricao(''); setFile(null); setCategoria('Material'); setCursosSelecionados([]);
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
    setECursos(material.cursos || []);
    setEFile(null);
  };

  const salvarEdicao = async (material: SupportMaterial) => {
    if (!eTitulo.trim()) { setMessage('Informe o título.'); return; }
    setESaving(true);
    try {
      await updateSupportMaterial(material, { titulo: eTitulo, descricao: eDescricao, categoria: eCategoria, cursos: eCursos }, eFile || undefined);
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
          <b> Checklists, Mapas e PPTs</b>. Escolha quais cursos têm acesso a cada um.
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
        <label className={label}>Categoria
          <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaMaterial)} className={`${campo} md:w-64`}>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <SeletorCursos cursos={cursosDisponiveis} selecionados={cursosSelecionados} onChange={setCursosSelecionados} />
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
                  <select value={eCategoria} onChange={e => setECategoria(e.target.value as CategoriaMaterial)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm md:w-64">
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <SeletorCursos cursos={cursosDisponiveis} selecionados={eCursos} onChange={setECursos} />
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
                        {(item.cursos && item.cursos.length > 0) ? `${item.cursos.length} curso${item.cursos.length > 1 ? 's' : ''}` : 'Todos os cursos'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{item.descricao || item.arquivoNome}</p>
                    {item.cursos && item.cursos.length > 0 && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.cursos.join(' · ')}</p>
                    )}
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
