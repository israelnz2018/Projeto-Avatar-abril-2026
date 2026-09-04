/**
 * Converte para texto o que a ferramenta espera como string.
 *
 * A IA às vezes devolve `[{id:"s1", name:"Área Fiscal", description:"..."}]` onde
 * a tela espera `["Área Fiscal"]` — sem conversão a célula imprime "[object Object]".
 *
 * A ordem das chaves importa: pegar "o primeiro campo de texto" faz a linha virar
 * "s4" ou "p1" quando o `id` aparece primeiro no objeto. Por isso a busca é por
 * chave conhecida, em ordem de preferência, e `id` nunca é resposta.
 */

const CHAVES_PREFERIDAS = [
  'name', 'nome', 'title', 'titulo', 'label', 'rotulo',
  'step', 'etapa', 'passo', 'text', 'texto',
  'descricao', 'description', 'value', 'valor',
];

const CHAVES_PROIBIDAS = new Set(['id', 'key', 'uid', 'ref', 'supplier', 'customer']);

const ehTextoUtil = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;

export function textoDeValor(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'string') return valor.trim();
  if (typeof valor === 'number' || typeof valor === 'boolean') return String(valor);
  if (Array.isArray(valor)) return valor.map(textoDeValor).filter(Boolean).join(' — ');

  if (typeof valor === 'object') {
    const obj = valor as Record<string, unknown>;

    for (const chave of CHAVES_PREFERIDAS) {
      if (ehTextoUtil(obj[chave])) return obj[chave].trim();
    }
    // Nenhuma chave conhecida: aceita qualquer texto, menos os campos de referência
    // (id, key…) que não significam nada para quem lê.
    for (const [chave, v] of Object.entries(obj)) {
      if (!CHAVES_PROIBIDAS.has(chave.toLowerCase()) && ehTextoUtil(v)) return v.trim();
    }
  }

  return '';
}

/** Lista de texto, sem itens vazios. Coluna sem informação fica vazia. */
export function listaDeTextos(valor: unknown): string[] {
  return (Array.isArray(valor) ? valor : []).map(textoDeValor).filter((t) => t.length > 0);
}
