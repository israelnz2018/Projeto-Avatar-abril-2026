/**
 * Procura hooks do React depois de um `return` — o erro que derrubou a aba de
 * marketing com "Minified React error #310".
 *
 * POR QUE ISTO EXISTE: o TypeScript não pega (é código perfeitamente válido) e o
 * projeto não usa ESLint, então a regra react-hooks/rules-of-hooks não roda em
 * lugar nenhum. O erro só aparece em tempo de execução, e só depois de o estado
 * mudar uma vez — quando `loading` vira false e o hook que estava sendo pulado
 * passa a rodar. Até lá a tela parece sã.
 *
 * A conta é a do React: um componente precisa chamar os mesmos hooks, na mesma
 * ordem, em toda renderização. Um `return` antes de um hook quebra isso.
 *
 * USA O PARSER DO TYPESCRIPT, e não expressão regular. A primeira versão disto
 * procurava `return` no começo da linha e não pegou o caso real, que era
 * `if (loading) return <div/>;` — uma linha só. Quem decide o que é um return é
 * a árvore sintática, não o recuo do texto.
 *
 * Uso: node scripts/conferir-hooks.cjs [pasta ou arquivo...]
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const EH_HOOK = (nome) => /^use[A-Z]/.test(nome);

/** Um nome de componente: começa com maiúscula. */
const EH_COMPONENTE = (nome) => typeof nome === 'string' && /^[A-Z]/.test(nome);

/**
 * Percorre um nó SEM entrar em funções aninhadas.
 *
 * Um hook dentro de um callback não é um hook de renderização — entrar ali
 * encheria o relatório de coisa que não é o problema.
 */
function percorrerSemFuncoes(no, visitar) {
  no.forEachChild((filho) => {
    if (
      ts.isFunctionDeclaration(filho)
      || ts.isFunctionExpression(filho)
      || ts.isArrowFunction(filho)
      || ts.isClassDeclaration(filho)
    ) return;
    visitar(filho);
    percorrerSemFuncoes(filho, visitar);
  });
}

/**
 * Uma declaração de função ou classe dentro do componente.
 *
 * O corpo dela não roda na renderização: o `return` de uma função auxiliar não sai
 * do componente, e um hook lá dentro não é hook de renderização. Sem esta
 * distinção, um `async function salvar() { ... return; }` no meio do componente
 * fazia tudo o que vinha depois parecer erro — seis falsos positivos em Comunidade.tsx.
 */
function ehDeclaracaoDeFuncao(no) {
  return ts.isFunctionDeclaration(no) || ts.isClassDeclaration(no);
}

/** Os hooks chamados diretamente no corpo deste nó. */
function hooksEm(no) {
  if (ehDeclaracaoDeFuncao(no)) return [];
  const achados = [];
  const olhar = (n) => {
    if (ts.isCallExpression(n)) {
      const alvo = n.expression;
      const nome = ts.isIdentifier(alvo) ? alvo.text
        : (ts.isPropertyAccessExpression(alvo) && ts.isIdentifier(alvo.name) ? alvo.name.text : null);
      if (nome && EH_HOOK(nome)) achados.push({ nome, no: n });
    }
  };
  olhar(no);
  percorrerSemFuncoes(no, olhar);
  return achados;
}

/** Este comando pode sair da função antes do fim? */
function podeRetornar(comando) {
  if (ehDeclaracaoDeFuncao(comando)) return false;
  if (ts.isReturnStatement(comando)) return true;
  let achou = false;
  percorrerSemFuncoes(comando, (n) => { if (ts.isReturnStatement(n)) achou = true; });
  return achou;
}

function conferirArquivo(arquivo) {
  const fonte = ts.createSourceFile(
    arquivo, fs.readFileSync(arquivo, 'utf8'), ts.ScriptTarget.Latest, true,
    /\.tsx$/.test(arquivo) ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const problemas = [];

  /** Analisa o corpo de um possível componente, comando a comando, na ordem. */
  function analisar(nome, corpo) {
    if (!corpo || !ts.isBlock(corpo)) return;
    let linhaDoReturn = null;

    for (const comando of corpo.statements) {
      if (linhaDoReturn !== null) {
        for (const h of hooksEm(comando)) {
          problemas.push({
            arquivo, componente: nome, hook: h.nome,
            linhaHook: fonte.getLineAndCharacterOfPosition(h.no.getStart(fonte)).line + 1,
            linhaReturn: linhaDoReturn,
          });
        }
      }
      // O último comando ser um return é o normal — não marca nada depois dele.
      if (comando !== corpo.statements[corpo.statements.length - 1] && podeRetornar(comando)) {
        if (linhaDoReturn === null) {
          linhaDoReturn = fonte.getLineAndCharacterOfPosition(comando.getStart(fonte)).line + 1;
        }
      }
    }
  }

  const visitar = (no) => {
    if (ts.isFunctionDeclaration(no) && no.name && EH_COMPONENTE(no.name.text)) {
      analisar(no.name.text, no.body);
    }
    if (ts.isVariableDeclaration(no) && ts.isIdentifier(no.name) && EH_COMPONENTE(no.name.text)) {
      const valor = no.initializer;
      if (valor && (ts.isArrowFunction(valor) || ts.isFunctionExpression(valor))) {
        analisar(no.name.text, valor.body);
      }
    }
    no.forEachChild(visitar);
  };
  visitar(fonte);

  return problemas;
}

function varrer(alvo, arquivos = []) {
  if (fs.statSync(alvo).isFile()) { arquivos.push(alvo); return arquivos; }
  for (const nome of fs.readdirSync(alvo)) {
    if (nome === 'node_modules' || nome.startsWith('.')) continue;
    const completo = path.join(alvo, nome);
    if (fs.statSync(completo).isDirectory()) varrer(completo, arquivos);
    else if (/\.tsx$/.test(nome)) arquivos.push(completo);
  }
  return arquivos;
}

const pastas = process.argv.slice(2).length ? process.argv.slice(2) : ['src'];
const arquivos = pastas.flatMap((p) => varrer(p));
const problemas = arquivos.flatMap(conferirArquivo);

if (!problemas.length) {
  console.log(`ok — ${arquivos.length} arquivo(s) conferido(s), nenhum hook depois de return.`);
  process.exit(0);
}

console.error(`${problemas.length} hook(s) depois de um return:\n`);
for (const p of problemas) {
  console.error(`  ${p.arquivo}:${p.linhaHook}`);
  console.error(`    ${p.componente} chama ${p.hook}() depois do return da linha ${p.linhaReturn}.`);
  console.error('    Mova o hook para antes de qualquer return do componente.\n');
}
process.exit(1);
