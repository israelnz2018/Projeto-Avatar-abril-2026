# PLANO — Plataforma White-Label Multi-Consultor (LBW)

> Fonte de verdade da transformação da LBW de single-tenant (só LBW) para
> multi-tenant white-label (vários consultores, cada um com seu site).
> Companion do `PLANO-B2B.md`. Nada de código antes das decisões confirmadas.

---

## 1. Visão

A **LBW** deixa de ser "a plataforma do Israel" e passa a ser **a plataforma-mãe**
que hospeda **vários consultores**. Cada consultor tem o seu próprio site
(`consultor.educacaopelotrabalho.com`), sua marca (logo + cores), seus cursos e
seus clientes. O **Israel vira o consultor #0** — apenas mais um tenant
(dogfooding: se funciona pra ele, funciona pra todos).

**Objetivo de negócio:** uma plataforma com **muitas fontes de renda** (ver §6),
ancorada em receita recorrente previsível (SaaS) e complementada por uso,
upgrades, conteúdo, marketplace e serviços.

---

## 2. Papéis (hierarquia definitiva)

**Invariante que define tudo:** _dono de curso = consultor; não é dono de curso = coordenador._

| Papel | Dono de curso? | Coordena time? | Tenant/subdomínio? | Concedido por |
|---|---|---|---|---|
| **LBW** (super-admin) | dono da plataforma + catálogo de ferramentas | — | — | (Israel/dono) |
| **Consultor** | ✅ sim | ✅ pode | ✅ `consultor.educacaopelotrabalho.com` | **LBW** |
| **Coordenador** | ❌ usa os cursos de UM consultor | ✅ sim | ❌ vive dentro de um consultor | um consultor (ou LBW) |
| **Aluno** | ❌ | ❌ | ❌ | consultor/coordenador |

Regras derivadas:
- **Consultor é superconjunto do coordenador.** Ele já coordena os próprios alunos direto.
- **Coordenador NÃO vira consultor sozinho** — virar consultor = ganhar curso próprio, e isso é **concedido pelo LBW**. Sem auto-upgrade.
- Empresa que só usa cursos de alguém = **coordenador**. Empresa que traz cursos próprios = **consultor** (promovida pelo LBW).

---

## 3. O que é global vs. por-tenant (o coração do modelo)

| Recurso | Dono | Como funciona |
|---|---|---|
| **Ferramentas** (qualidade + estatística) | **LBW** (catálogo global) | Todas disponíveis pra todo consultor. Ele só **liga/desliga** o que quer. Ferramenta nova → **pede ao LBW**. |
| **Conteúdo** (cursos/vídeos) + **fases/metodologias** | **Cada consultor** | Vídeos e fases dele. Dentro do site dele, ele escolhe cursos, monta fases e liga as ferramentas. |
| **Motor do PDF/PPT** | **LBW** | Estrutura/engine é do LBW; cada consultor troca só **logo + cores**. |

Consequência boa: **ferramenta é capacidade compartilhada, não conteúdo clonado.**
Só guardamos **quais ferramentas cada consultor ligou** (encaixa na config
`initiative_configs` que já existe).

> ⚠️ Isso muda a regra atual do `CLAUDE.md` ("paleta LBW obrigatória no PPT").
> Passa a ser: **engine/estrutura LBW + logo/cores por tenant.** Atualizar quando implementar.

---

## 4. Isolamento (segurança) + Vitrine

- **Coordenador e aluno:** só enxergam o mundo do **próprio consultor**. Zero
  visibilidade de outros consultores (evita conflito/concorrência).
- **Consultor ↔ consultor:** NÃO veem clientes/alunos/dados um do outro. Veem
  apenas a **vitrine**.
- Todo dado (users, projects, courses, knowledge_base, certificados…) carrega
  `consultorId`. As regras do Firestore isolam por `consultorId`.

### Vitrine — vista por consultores E empresas externas
Duas funções na mesma prateleira:
1. **Marketing/descoberta:** empresa externa entra e encontra consultores/cursos.
2. **Negociação:** consultor navega as vitrines dos outros pra trocar/licenciar.

Design seguro: cada consultor publica um doc **`vitrine`** (nome, cursos oferecidos,
contato). O doc é **público (leitura aberta)** — pode, porque só tem a "prateleira",
nunca clientes/alunos/dados. Os **dados reais** continuam **100% isolados** por
`consultorId`. Existe como **página pública** (no hub, pra empresa externa) e como
**aba interna** (pro consultor logado navegar).

---

## 5. Domínios / resolução por subdomínio

- **Hub + vitrine + estrutura geral:** `app.educacaopelotrabalho.com`.
- **Cada consultor:** `consultor.educacaopelotrabalho.com`
  (ex.: `israel.educacaopelotrabalho.com`).
- **Reservados:** `app`, `www` e o raiz (marketing/Jornada, já existe). Qualquer
  outro subdomínio = um consultor. O app resolve o `consultorId` pelo **hostname**.
- **Infra necessária (além de código):** DNS curinga `*.educacaopelotrabalho.com`,
  **SSL curinga**, config de wildcard no Railway.

---

## 5b. Abas por papel (navegação + visibilidade)

| Aba | Quem vê | Função |
|---|---|---|
| 🛡️ **Administrador** | admin (você) | Gestão de Consultores, visão global, catálogo de ferramentas, monetização |
| 📣 **Marketing** | admin (você) | *(a aba de hoje, admin-only)* Resend, motor, campanhas — LBW-only |
| 🎓 **Consultor** | cada consultor (só o próprio mundo) | Cursos, Fases/Ferramentas, **Minha Marca (logo/imagens/cores)**, Coordenadores, Alunos, Super-relatório, **Minha Vitrine (edita a própria)** |
| 🖼️ **Vitrine** | consultores **+ empresas externas** | Navegar as prateleiras dos consultores (pública + aba interna) |
| 👥 **Coordenador** | cada coordenador (só o time) | Minha Equipe *(já existe)* |
| 🎒 **Demais abas** | alunos | Projetos, Educação, Data & Analysis, etc. |

**Correções travadas:**
- **Marca (logo/imagens/cores) vive DENTRO do Consultor** — o Admin só cria o
  tenant; quem estiliza é o consultor ("Minha Marca").
- **Marketing = a aba de hoje**, apenas restrita ao admin. Não vira sub-console.
- **Vitrine = aba nova**, vista por consultores + empresas externas (edição da
  própria vitrine fica na aba Consultor; a navegação, na aba Vitrine).

### Matriz de visibilidade (= espec. de segurança das regras Firestore)
| Papel | Enxerga |
|---|---|
| Admin (você) | **tudo** — todos consultores, coordenadores, alunos, dados |
| Consultor | só o **mundo dele** — seus coordenadores + **todos os seus alunos** (inclusive os sob coordenadores) |
| Coordenador | só o **time dele** |
| Aluno | só **ele mesmo** |

---

## 6. Monetização — MUITAS fontes de renda 💰

> Princípio: **ancorar no recorrente limpo**, empilhar as outras por cima.
> Coluna fiscal: ✅ = só uma cobrança de *software* pra sua empresa NZ (limpo);
> ⚠️ = dinheiro passa por você (complexo — evitar/adiar).

### A. Recorrente (o motor)
| # | Fonte | Como | Fiscal | Quando |
|---|---|---|---|---|
| 1 | **Assinatura SaaS por consultor** | Mensalidade/anuidade fixa por faixa de alunos (`maxAlunos` já existe) | ✅ | Núcleo |
| 2 | **Faixas/upgrades de tamanho** | Mais alunos / coordenadores / projetos = faixa maior | ✅ | Núcleo |

> Pitch matador ao consultor: *"você fica com 100% do que cobra dos clientes; só paga uma mensalidade fixa da ferramenta"* — ganha de Kajabi/Hotmart (que mordem 10–30%).

### B. Uso (escala com o consumo)
| # | Fonte | Como | Fiscal | Quando |
|---|---|---|---|---|
| 3 | **Créditos de IA** | Packs de crédito (`creditoIA` já existe no sistema!) | ✅ | Cedo |
| 4 | **Host de vídeo premium** | Markup sobre hospedagem premium (ex.: Panda) | ✅ | Médio |
| 5 | **Armazenamento / limites** | Mais storage, mais exportações | ✅ | Médio |

### C. Upgrades white-label
| # | Fonte | Como | Fiscal | Quando |
|---|---|---|---|---|
| 6 | **Domínio próprio** | Domínio do consultor em vez de subdomínio | ✅ | Médio |
| 7 | **Remover marca LBW** | White-label total ("powered by" some) | ✅ | Médio |
| 8 | **Ferramentas/relatórios premium** | Catálogo base + avançadas pagas | ✅ | Médio |
| 9 | **Certificados premium** | Selo/branding, verificação | ✅ | Médio |

### D. One-time
| # | Fonte | Como | Fiscal | Quando |
|---|---|---|---|---|
| 10 | **Taxa de setup** | Onboarding, subdomínio, branding | ✅ | Cedo |
| 11 | **Implantação "done-for-you"** | Você/terceiro monta o site + cursos do consultor | ✅ | Médio |

### E. Conteúdo & marketplace
| # | Fonte | Como | Fiscal | Quando |
|---|---|---|---|---|
| 12 | **Licenciar os cursos do Israel** (consultor #0) | Outro consultor usa seu conteúdo, pagamento à parte | ✅ | Médio |
| 13 | **Take-rate da vitrine** | % quando um consultor licencia conteúdo de outro pela plataforma | ⚠️ | Etapa 2 |
| 14 | **Marketplace de leads** | Vitrine pública gera leads → distribuir aos consultores (fee/take-rate) | ⚠️ | Etapa 2 |

### F. Distribuição
| # | Fonte | Como | Fiscal | Quando |
|---|---|---|---|---|
| 15 | **Israel consultor #0 — venda direta** | Kit 90, formação 8 trilhas, planos empresa (já existe/PLANO-B2B) | ✅/Hotmart | Já |
| 16 | **Afiliados por consultor** | Cada consultor afilia o próprio produto; LBW com take-rate | ⚠️ | Etapa 2 |

### G. Serviços & comunidade
| # | Fonte | Como | Fiscal | Quando |
|---|---|---|---|---|
| 17 | **Treinar os consultores** | Curso pago "como usar/vender na plataforma" | ✅ | Médio |
| 18 | **Certificação / selo LBW** | Certificação oficial reconhecida (selo FORMAÇÃO LBW) | ✅ | Médio |
| 19 | **Comunidade premium / eventos** | A Comunidade LBW já existe; tier premium, mentorias, eventos | ✅ | Médio |

### H. Enterprise
| # | Fonte | Como | Fiscal | Quando |
|---|---|---|---|---|
| 20 | **Contratos enterprise white-label** | Grande empresa/consultoria quer a plataforma inteira sob a marca dela, anual | ✅ | Oportunista |

> ⚠️ **Sequenciar, não lançar 20 de uma vez.** A "muitas fontes" é a visão. A
> execução é em camadas: começa pelo **recorrente limpo (1, 2) + créditos de IA (3)
> + setup (10)** e a venda direta do Israel (15, que já roda). O resto entra
> conforme a plataforma amadurece. Lançar tudo junto = over-build.

---

## 7. Hospedagem de vídeo

- **Agora: YouTube** (não listado). Grátis, já integrado (transcrição,
  KnowledgeManager, multi-curso). Israel conversa com os consultores.
- **NÃO misturar providers.** Nada de multi-provider simultâneo. Se um dia migrar,
  migra a plataforma **inteira pra UM** host (ex.: Panda Video), de uma vez.
- Portanto **não construir abstração de provider agora** — YouTube puro. Uma
  eventual troca = projeto de migração única (com anti-pirataria/DRM como bônus
  de venda pro consultor premium).

---

## 8. Estado atual (ponto de partida)

- **Sem conceito de tenant.** `initiatives`, `courses`, `playlists`,
  `knowledge_base` são **globais**; `initiatives`/`initiative_configs` são
  `allow read, write: if true`.
- **Admin = e-mail do Israel cravado** no código (App.tsx, projectService,
  server.ts) E nas regras (`isAdmin()`) com override global `match /{document=**}`.
- **Branding LBW hardcoded em ~95 pontos / 20 arquivos** (logo, rodapé, login,
  certificado, paleta do PPT, domínio).
- **Camada de coordenador JÁ EXISTE** — time por `empresaId` (Minha Equipe,
  super-relatório, convidar membros, `maxAlunos`, drill-down, ganho em R$).
  É exatamente o "coordenador que não é dono de nada, só gerencia o time".
- **`creditoIA` já existe** — alavanca de monetização pronta (fonte #3).

**Boa notícia:** coordenador pronto + créditos de IA prontos. O trabalho novo é a
camada de **consultor** (dono de conteúdo + tenant + subdomínio + branding).

---

## 9. Riscos (os 3 que importam)

- 🔴 **Migração em produção** — app no ar com alunos pagando. Carimbar todo dado
  com `consultorId: 'israel'` sem quebrar acesso. → **backup obrigatório**
  (branch/tag + export Firestore) antes de qualquer escrita.
- 🔴 **Regras do Firestore** — hoje frouxas. Isolamento por tenant é onde bug =
  vazamento entre clientes.
- 🟡 **Over-build** — construir self-serve (ou 20 fontes de renda) antes do 1º
  consultor assinar = "fiz a plataforma e ninguém veio". Validar leve primeiro.

---

## 10. Plano em fases

**Fase 0 — Trilho invisível** _(seguro, nada muda visível)_
- Coleção `consultores` com Israel = #0 (marca, cores, logo).
- `consultorId: 'israel'` em todo dado existente. App idêntico (1 tenant só). Backup antes.

**Fase 1 — Branding por config** _(ainda só Israel aparece)_
- Trocar os ~95 LBW hardcoded por leitura da config do consultor atual.
- Teste: "consultor teste", virar a chave → app inteiro re-veste.

**Fase 2 — Papéis + regras de isolamento** _(segurança)_
- Super-admin (LBW) vs consultor-admin (tenant).
- Reescrita das regras Firestore com isolamento por `consultorId`. Testar a fundo.

**⏸️ PORTÃO DE VALIDAÇÃO — só passar daqui com 1 consultor real interessado.**

**Fase 3 — Primeiro consultor (concierge)**
- Super-admin cria consultor #1 na mão: tenant, marca, 1º admin, metodologias,
  cursos dele. **Valida com dinheiro** (assinatura SaaS + setup).

**Fase 4 — Self-serve + escala**
- Cadastro self-serve, provisionamento Hotmart/n8n, subdomínio automático,
  vitrine pública, créditos de IA, upgrades. Depois: marketplace, afiliados, i18n.

**Corte recomendado:** **Fase 0 + 1 agora** (fundação segura), segurar 2→4 até o
primeiro consultor comprometido.

---

## 11. Decisões

**Confirmadas:**
- Resolução por **subdomínio** `consultor.educacaopelotrabalho.com`; hub em `app.`.
- LBW = plataforma-mãe; Israel = consultor #0.
- Ferramentas globais (LBW); conteúdo + fases por consultor; PDF engine LBW + logo/cores por tenant.
- Invariante dono-de-curso; consultor ⊇ coordenador; coordenador não vira consultor sozinho.
- Isolamento duro para coordenador/aluno; vitrine dupla (consultores + marketing público).
- **Vídeo: YouTube agora, sem multi-provider; migração futura = 1 host só.**
- **Monetização: SaaS recorrente como núcleo + muitas fontes empilhadas (§6), sequenciadas.**

**A confirmar / detalhar:**
- Valores das faixas SaaS (âncora BR: ~R$97 / R$297 / R$497+).
- E-mail/marketing (Resend, motor): fica **LBW-only** no início? (recomendado)
- Vitrine: modelo exato do doc público.
- Migração: janela e roteiro do backup.

---

## 12. Internacionalização (futuro)

Traduzir tudo pro **inglês** é uma **fase própria** — o app é todo em português
cravado. Fazer com framework de i18n (react-i18next) lá na frente. Cuidado só:
nas Fases 0/1 não piorar isso (não espalhar mais texto hardcoded desnecessário).

---

## 13. Próximo passo

Com o corte "Fase 0+1 agora" aprovado, detalhar a **Fase 0 arquivo por arquivo**
(modelo de dados, coleção `consultores`, script de migração com backup) antes de
tocar em qualquer código.
