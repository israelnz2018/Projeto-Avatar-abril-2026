# Padrão dos cartões e botões das ferramentas de projeto

Vale para toda ferramenta da jornada do projeto (Entendendo o Problema,
Contrato, SIPOC, Atividades Detalhadas…). Antes de criar ou mudar um cartão ou
botão, conferir aqui e seguir o mesmo padrão. **Não inventar botão nem tipo de
botão novo.** Se o caso não estiver coberto, olhar duas ou três ferramentas
parecidas e atualizar este documento junto com a mudança.

Código de referência: `src/components/projects/ToolWrapper.tsx`.

---

## 1. Cor do cartão diz o que ele faz

| Cor | Componente | Título | Botão | Faz |
|---|---|---|---|---|
| **Verde** | `AIPromptCard` | "Gerar {ferramenta}" | "Gerar" | **CRIA** conteúdo |
| **Azul** | `MigratePromptCard` | "Sincronizar com {origem}" | "Sincronizar" | **TRAZ** da ferramenta anterior |

**Verde (criar)**
- Fundo `bg-[#f0fdf4]`, borda `border-emerald-100`, ícone `Wand2`, título em
  maiúsculas `text-emerald-700`.
- Botão grande: `h-16 min-w-[240px] bg-emerald-600 hover:bg-emerald-700`,
  ícone `Sparkles`.
- Aparece **só com a ferramenta vazia**. Depois de usado, some — não fica barra
  nem botão de "gerar de novo".
- Se precisa de uma escolha antes de gerar, ela fica **dentro do cartão, antes
  do botão**. Exemplos: a data de início no "Gerar Cronograma", o projeto no
  Entendendo o Problema, os meses em Atividades Detalhadas.

**Azul (trazer)**
- Fundo `bg-blue-50`, borda `border-blue-100`, ícone `ArrowDownToLine`.
- Botão: `bg-blue-600 hover:bg-blue-700`.
- Nas ferramentas que sincronizam lista (`TOOLS_QUE_SINCRONIZAM_LISTA`), depois
  de preenchida vira uma **barra azul fina** com "Sincronizar", porque trazer só
  acrescenta e nunca sobrescreve.

**Cartão próprio da ferramenta.** Algumas ferramentas têm o cartão dentro do
próprio componente (Espinha de Peixe, Brainstorming, Atividades Detalhadas).
Elas entram em `temCardProprioDeIA` para o cartão genérico não aparecer junto.
O cartão próprio usa **o mesmo visual** do verde ou do azul acima.

**Só o botão próprio.** `SO_BOTAO_PROPRIO` lista as ferramentas sem "trazer da
anterior" nem cartão genérico. Use quando a migração não tem regra para a
ferramenta — sem regra, ela grava um objeto vazio por cima.

## 2. Barra do topo: Salvar, Excluir, status

- **Salvar** (botão branco) **não salva sozinho**. Ele procura na página o
  elemento com `data-save-trigger` e clica nele. **Toda ferramenta precisa ter
  exatamente um**, chamando `onSave(dados)` sem `silent`. Se a ferramenta não
  tem botão de salvar visível, usar um gatilho invisível:
  `<button type="button" data-save-trigger onClick={salvar} className="hidden" aria-hidden="true" tabIndex={-1} />`
- **Excluir** pede confirmação, esvazia os dados (`onSave(null)`) e remonta a
  ferramenta (`clearKey`). Com isso o cartão verde volta. É o jeito de
  recomeçar do zero — não criar outro botão para isso.
- **Status salvo / não salvo**: `onSave(dados, { silent: true })` marca como
  "não salvo" (edição em andamento); `onSave(dados)` marca como salvo.

## 3. Salvamento enquanto edita

A edição do aluno se salva sozinha com `{ silent: true }` — no Entendendo o
Problema a cada mudança, em Atividades Detalhadas 700 ms depois de parar de
digitar. Sem isso, sair da tela perde o que foi feito.

## 4. Word e PowerPoint

- **Word** (azul escuro, `bg-blue-700`) e **Gerar PPT** (laranja,
  `bg-orange-500`) ficam **desabilitados até a ferramenta estar salva**.
- O PowerPoint passa por `services/exportPPTRouter.ts`:
  - se a ferramenta está em `TOOL_HANDLERS` (`services/pptToolHandlers.ts`),
    usa o exportador próprio dela;
  - senão, cai no gerador genérico `generateFullPPTReport` (`reportService.ts`).
- **Mudou campo, rótulo ou formato dos dados? Revisar o exportador** e gerar um
  slide de teste. Para olhar o resultado: gerar o `.pptx` pelo exportador real
  e exportar para PNG com o PowerPoint (COM `PowerPoint.Application`).
- O relatório Word (`reportService.ts`) também lê os dados de cada ferramenta.

## 5. Outros elementos fixos

- **Ver exemplo**: botão `bg-[#1E2D6E] hover:bg-[#0033CC]`, ícone `BookOpen`.
  Abre um modal só de leitura com as abas Escritório / Manufatura, que nunca
  altera os dados do aluno. Mudou as perguntas da ferramenta? Mudar o exemplo.
- **Gerado com IA**: ponto verde + "Gerado com IA" e "Limpar dados da IA" em
  vermelho, quando a ferramenta veio da IA.

## 6. Checklist antes de publicar uma mudança de botão ou cartão

- [ ] A cor segue a regra: verde cria, azul traz.
- [ ] Nenhum botão novo que não foi pedido.
- [ ] O Salvar do topo ainda encontra um `data-save-trigger` nesta ferramenta.
- [ ] O Excluir esvazia e o cartão verde volta.
- [ ] A edição se salva sozinha (`silent`).
- [ ] O PowerPoint foi gerado e conferido (exportador próprio ou genérico).
- [ ] O Word ainda lê os campos certos.
- [ ] O exemplo ("Ver exemplo") bate com as perguntas atuais.
- [ ] O que a ferramenta passa para as próximas (Contrato, SIPOC…) continua igual.

## Pendente

- **Atividades Detalhadas** não tem exportador de PowerPoint próprio — cai no
  gerador genérico. Conferir o slide que ele gera e decidir se precisa de um.
