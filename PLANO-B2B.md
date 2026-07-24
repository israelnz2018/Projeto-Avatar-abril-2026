# Plano B2B — LBW (Bloco 1: Plataforma · Bloco 2: Hotmart/n8n)

> Foco inicial: **Brasil**. Modelo: **100% auto-serviço** (zero tempo do fundador — CLT na NZ).
> LinkedIn (Bloco 3) e a indicação do profissional (item 1 dos públicos) ficam para **depois**.
> Documento vivo — atualizar conforme decisões.

---

## 0. Decisões já travadas (contexto)

- **3 públicos**, priorização:
  1. Profissional individual (Completo) que indica pra empresa → **ADIADO** (só faz sentido com volume).
  2. Consultor **como afiliado** (recomenda pra pessoa e pra empresa = 2 comissões) → **FAZER**.
  3. Empresarial: **coordenador** gerencia profissionais e projetos da empresa dentro da plataforma → **FAZER (núcleo)**.
- **Consultor = "super-coordenador"**, mas no MVP: consultor com vários clientes = cada cliente é **um workspace/coordenador próprio**, e o consultor **ganha comissão de afiliado** por cada um. Multi-cliente sob um login + white-label = **ADIADO (2b)**.
- **Dinheiro:** fluxo padrão via **Hotmart** (assinatura recorrente + afiliado com split automático). Contratos "por fora" (empresa grande, NF pela PJ) = manuais.
- **Cobrança:** **plano empresa = assinatura ANUAL, por vaga, parcelável 12x no cartão** (sensação mensal, compromisso anual). PIX/boleto à vista com desconto.
- **Núcleo do app a construir:** painel do coordenador (equipe → projetos → progresso → **ROI em R$** via ferramenta Ganhos Tangíveis).

---

## BLOCO 1 — PLATAFORMA (app)

### 1.1 Estado atual (REAPROVEITAR — já existe no código)

| O que | Onde | Observação |
|---|---|---|
| Papel de coordenador | `users/{uid}`: `tipoUsuario:'coordenador'`, `plano:'coordenador'`, `empresaId`, `empresaNome`, `maxAlunos` | Definido em `adminUserService.ts` |
| Vínculo de equipe | por **`empresaId`** (mesmo empresaId = mesma empresa) | Sem campo `coordenadorId` — modelo atual |
| Dono do projeto | `projects/{id}.ownerUid` | `getProjectsByOwner(uid)` em `dashboardDataService.ts` |
| Equipe do coordenador | `getEquipeDoCoordenador(empresaId, coordenadorUid)` | `dashboardDataService.ts` — já pronto |
| Coordenador vê tudo | `canAccessInitiative` trata coordenador como completo | `dashboardDataService.ts:91` |
| Última atividade do projeto | `getLastProjectActivityMs(projectId)` | `dashboardDataService.ts` |
| ROI em R$ por projeto | `projects/{id}/data/tangibleGains` → `content.toolData` (accReal, etc.) | Ferramenta **Ganhos Tangíveis** já entregue |
| Gestão de time (admin) | Aba "Equipes de Coordenadores" | `UserManagementView.tsx` (rota `/users`) — hoje **admin-only** |
| Convite de usuário | `invites/{emailKey}` consumido por `ensureUserDocument` no 1º login | Já existe |
| Envio de e-mail | `POST /api/send-invite` (tipo `time_coordenador`) | `server.ts` |

**Conclusão:** o "difícil" (dados de equipe, projetos por dono, ROI) **já está pronto**. Falta **a tela do coordenador** e um **agregador de ROI**.

### 1.2 O que FALTA construir

**a) Agregador de ROI do time** (`dashboardDataService.ts`, função nova)
- Para cada membro (`getEquipeDoCoordenador`) → `getProjectsByOwner(uid)` → ler `projects/{id}/data/tangibleGains` → somar `accReal` (ganho real acumulado).
- Retorna: ROI por membro + total do time + nº de projetos + última atividade.

**b) Tela do Coordenador** — nova rota `/equipe` (ou `/time`), visível só p/ `tipoUsuario:'coordenador'`
- **Topo (consolidado):** vagas usadas / `maxAlunos`, **ganho total do time em R$**, projetos ativos, membros ativos/inativos.
- **Lista de membros:** por membro → nº projetos, **% progresso** (reusar lógica `toolProgress` do `ProjectJourney.tsx`), última atividade, **ROI em R$**.
- **Drill-down:** clicar num membro → ver os projetos dele e abrir (read-only) o painel de Ganhos Tangíveis de cada projeto.

**c) Segurança de leitura do time** (decisão de arquitetura)
- Hoje `getProjectsByOwner` roda **client-side**. Coordenador lendo projetos de OUTROS uids exige:
  - **Opção recomendada:** endpoint server `GET /api/coordenador/equipe` com **Admin SDK** (`firebaseAdmin`), que valida `req.user` é coordenador e só devolve dados do **seu `empresaId`**. Mais seguro, não abre Firestore Rules.
  - Alternativa: Firestore Rules permitindo coordenador ler `projects` onde `ownerUid` ∈ equipe (mais frágil).

**d) Convite self-serve de membros** (o coordenador, não o admin)
- UI em `/equipe`: "Adicionar profissional" (e-mail) até `maxAlunos`.
- Grava `invites/{emailKey}` com o `empresaId` do coordenador + dispara `POST /api/send-invite` (`time_coordenador`).
- `ensureUserDocument` já consome o convite no 1º login e vincula pelo `empresaId`.

**e) Rota + menu**
- Item de menu "Minha Equipe" só quando `tipoUsuario==='coordenador'`. Rota nova em `App.tsx`.

### 1.3 Fases do Bloco 1 (ordem de entrega)

- **1A — Painel do coordenador (read-only):** equipe + progresso + ROI. Reaproveita quase tudo. **É o que vende.** ⭐ começar aqui.
- **1B — Convite self-serve** de membros até `maxAlunos`.
- **1C — Refinos:** filtros, e **exportar o ROI consolidado do time** (PPT/Excel) — poderosíssimo pra o gestor justificar a renovação.

---

## BLOCO 2 — HOTMART + n8n (dinheiro e provisionamento)

> Quase tudo de "grana" vive **fora do app**. É configuração, roda em paralelo ao Bloco 1.

### 2.1 Dois produtos (mapeiam as 2 comissões do afiliado)

| Produto | O que é | Cobrança | Comissão afiliado |
|---|---|---|---|
| **A — Completo individual** | acesso individual às 8 trilhas | único ou assinatura anual do indivíduo | X% (uma vez) |
| **B — Plano Empresa** | coordenador + N vagas p/ o time | **assinatura ANUAL, por vaga, 12x no cartão** | **Y% recorrente** (enquanto ativa) |

- Consultor recomenda **pessoa** → comissão do Produto A. Recomenda **empresa** → comissão recorrente do Produto B.
- **Split automático da Hotmart** — você não gerencia repasse (comissão recorrente 10–20%, só enquanto a assinatura está adimplente).

### 2.2 Preço (modelo — número a definir)
- **Por vaga/ano**, em faixas (ex.: 1–5, 6–20, 21+). `maxAlunos` = vagas contratadas.
- **Anual parcelado 12x** no cartão (sensação mensal). **PIX/boleto à vista com desconto.**
- **NF/CNPJ:** Hotmart emite NF no fluxo padrão; contrato "por fora" (empresa grande) → NF pela sua PJ.

### 2.3 Afiliado (2 comissões) — Hotmart nativo
- Cada produto com seu %. Nada de código de dinheiro no app.
- Rastreio, cobrança recorrente e pagamento do afiliado = **Hotmart faz tudo**.

### 2.4 Provisionamento automático (webhook → n8n → Firestore)
> Regra do projeto: **n8n é o único que escreve no Firestore** nos fluxos automáticos.

- **Compra aprovada Produto B (empresa):** webhook → n8n → cria `users/{uid}` do coordenador:
  `tipoUsuario:'coordenador'`, `plano:'coordenador'`, `empresaId` (gerar, único), `empresaNome`, `maxAlunos` = vagas compradas, `formacoes` = todas as trilhas.
- **Compra aprovada Produto A (individual):** fluxo do Completo já existente.
- **Eventos de assinatura (Produto B):**
  - Renovação aprovada → mantém ativo.
  - Cancelamento / inadimplência → n8n **rebaixa** o coordenador (bloqueia o time) após **grace period** (definir, ex.: 7 dias).
- **Vagas:** membros entram por convite (1B) até `maxAlunos`; upsell = comprar mais vagas (aumenta `maxAlunos`).

### 2.5 Pré-requisito a confirmar
- A conta Hotmart hoje é usada **só p/ Kit avulso (pagamento único)**? Então **assinatura recorrente é setup novo** (Produto B). Confirmar antes de ligar o webhook de renovação.

---

## SEQUÊNCIA DE EXECUÇÃO (recomendada)

1. **Bloco 2 (config Hotmart):** criar Produto B (assinatura anual 12x) + afiliado 2 comissões. *(paralelo, não é código do app)*
2. **Bloco 1A:** painel do coordenador read-only (equipe + progresso + ROI). *(o que vende)*
3. **n8n:** provisionamento — compra do Produto B cria o coordenador com `empresaId` + `maxAlunos`.
4. **Bloco 1B:** convite self-serve de membros.
5. **Bloco 1C + 2.4 (eventos de assinatura):** export de ROI + rebaixa por inadimplência.

---

## RISCOS / DECISÕES PENDENTES

- [ ] **Segurança:** endpoint server (recomendado) vs Firestore Rules p/ coordenador ler projetos do time.
- [ ] **Preço por vaga** (número) e faixas.
- [ ] **Grace period** de inadimplência.
- [ ] **empresaId:** estratégia de geração única no provisionamento.
- [ ] **Hotmart recorrente:** confirmar suporte/configuração na conta atual.
- [ ] **NF "por fora":** ter a PJ pronta pra emitir nos contratos grandes.

---

## FORA DE ESCOPO (adiado — não construir agora)

- Indicação do profissional → empresa (item 1 dos públicos).
- Consultor gerenciando **vários clientes sob um login** + **white-label** (2b) + repasse de comissão de consultor.
- Bloco 3 — **LinkedIn** (funil de conteúdo). Vem depois.
