# Plano de Migração YouTube → Bunny Stream (LBW)

> Objetivo: sair do YouTube (sem white-label) para o **Bunny Stream** — player com a
> marca de cada consultor, biblioteca isolada por tenant, custo baixo pay-as-you-go.
> Migração **incremental e reversível** (mantém o link do YouTube como fallback/rollback).

## Números de referência
- **~1.000 vídeos**, **~204 horas** (270 vídeos ≈ 54h + 150h).
- **Storage:** ~160–610 GB → **~$6–8/mês fixo**.
- **Encoding:** ~$12 **uma vez** (no upload).
- **Banda:** dirigida por audiência (~$3 a ~$175/mês) — sem aluno = ~$0.
- **Transcrição:** vídeos atuais já têm transcript no Firestore (**preservado**); novos via **Whisper**.

---

## Princípios da migração
0. **🔒 REGRA DE OURO — NADA MUDA PRO ALUNO.** Do ponto de vista de **funcionalidade e usabilidade do cliente final**, tudo tem que continuar **exatamente igual** (ou melhor, nunca pior): mesma tela, mesmos controles, mesmo "retomar de onde parou", mesma contagem de progresso, mesmo cadeado, mesmo certificado. A troca de host é **invisível** — é só infraestrutura por baixo. Se o aluno perceber QUALQUER diferença de comportamento, a migração falhou.
1. **Incremental:** vídeo migrado toca pelo Bunny; vídeo não migrado continua no YouTube. O app decide pelo campo `bunnyVideoId`.
2. **Reversível:** o `sourceUrl` (YouTube) **nunca é apagado** durante a migração → rollback é um flag.
3. **Multi-tenant:** **1 Video Library do Bunny por consultor** (isolamento real). O `consultorId` do `knowledge_base` decide a library.
4. **Sem downtime:** o fallback YouTube garante que nada quebra enquanto migra.

---

## FASE 0 — Preparação (não toca no app)
- [ ] Criar conta **Bunny.net** + **Video Library** (uma pro piloto = mundo Israel).
- [ ] Anotar: **API Key**, **Library ID**, **CDN Hostname** (ex.: `vz-xxxx.b-cdn.net`), **Pull Zone**.
- [ ] Definir convenção multi-tenant: `bunnyLibraryId` por consultor (mapa `consultorId → libraryId`).

**Israel entrega:** conta criada + API Key + Library ID quando for a hora de codar.

---

## FASE 1 — Piloto (1 curso, valida tudo)
Escolher **1 curso** (de preferência o menor) e provar a esteira ponta a ponta.

1. **Modelo de dados** (`knowledge_base`): adicionar campos, **sem remover** `sourceUrl`:
   - `bunnyVideoId?: string` (GUID do Bunny)
   - `bunnyLibraryId?: string`
2. **Script de migração** (Node, roda offline — ver esboço abaixo):
   - lê os docs do curso → `yt-dlp` baixa pelo `sourceUrl` → upload/fetch no Bunny → grava `bunnyVideoId` + `bunnyLibraryId`.
3. **Player novo** (`BunnyPlayer`): toca por `bunnyVideoId` (iframe `mediadelivery.net` ou HLS via hls.js). **Fallback:** sem `bunnyVideoId` → usa o player do YouTube atual.
4. **Watch tracker:** adaptar do `useYouTubeWatchTracker` pros eventos do player Bunny (progresso, % assistido, retomar posição). É o item mais delicado — precisa manter o gatilho de certificado.
5. **Thumbnails:** Bunny gera automático (troca o `youtubeThumb`).
6. **Validar:** assistir, tracker contando, % de conclusão, **certificado emitindo**, e o **custo real** no dashboard do Bunny.

**Critério de sucesso do piloto:** um aluno assiste um vídeo do Bunny, o progresso conta igual ao YouTube, e o certificado sai normalmente.

### ✅ Checklist de PARIDADE (regra de ouro — tem que estar TUDO igual)
Antes de escalar, cada item abaixo tem que funcionar **idêntico** ao YouTube de hoje:
- [ ] Play / pause / seek / tela cheia
- [ ] **Retomar de onde parou** (`lastPosition`) — mesmo comportamento
- [ ] Contagem de **% assistido** e marca "assistido" no limiar (70%)
- [ ] **Certificado** dispara igual ao completar
- [ ] **Cadeado** nos cursos bloqueados (overlay + popup) — abre o vídeo só se liberado
- [ ] Badge "assistido", grid/lista, busca — tudo igual
- [ ] Deep-link `/education?video=<id>` continua abrindo o vídeo certo
- [ ] Velocidade/qualidade (se o aluno usa) — sem regressão
- [ ] Nada de logo/recomendação/"assistir no YouTube" (isso pode **melhorar**, nunca piorar)

---

## FASE 2 — Transcrição dos vídeos NOVOS
> Os ~1.000 atuais **já têm transcript** no Firestore → nada a fazer.

- Trocar `/api/youtube-transcript` (legenda do YouTube) por **`/api/transcribe`** rodando **Whisper**:
  - **Migração/lote:** Whisper **open-source self-host** (grátis) se um dia quiser re-transcrever.
  - **Dia a dia (vídeo novo):** Whisper API (~$0,07/vídeo) — no upload, extrai áudio → transcript com tempos → **Gemini continua igual** (índice + resumo).

---

## FASE 3 — Migração completa (~1.000 vídeos)
- Rodar o script **curso a curso**, com **log e retomável** (marca o que já foi).
- **Throttle** pra não tomar bloqueio do YouTube; **retry** nos que falharem.
- Monitorar **custo** (storage/encoding) e **erros** no painel.
- Roda numa máquina/VPS com banda (baixa ~250 GB, re-sobe pro Bunny). Automático, mas leva horas.

---

## FASE 4 — Multi-tenant (1 library por consultor)
- Cada consultor = **uma Video Library** própria → isolamento total (player e biblioteca com a marca dele).
- O `knowledge_base` já tem `consultorId` → o script/app escolhe a `bunnyLibraryId` certa.
- Novos consultores: cria library nova, aponta o mapa.

---

## FASE 5 — Cleanup (depois de validado)
- Com tudo tocando pelo Bunny, o `sourceUrl` (YouTube) vira **histórico/rollback**.
- Opcional: deixar os vídeos do YouTube **não listados** como backup (não apagar de cara).

---

## Pontos de código que mudam
| Peça | Hoje | Depois | Esforço |
|---|---|---|---|
| `knowledge_base` (tipo) | `sourceUrl` (YouTube) | + `bunnyVideoId`, `bunnyLibraryId` | Baixo |
| Player (`LearningView`, preview do `KnowledgeManagerView`) | iframe YouTube + postMessage | `BunnyPlayer` (iframe/HLS), fallback YouTube | Médio |
| `useYouTubeWatchTracker` | API do iframe YT | eventos do player Bunny | **Médio-alto** |
| `getYoutubeId` / `youtubeThumb` | ID/thumb YouTube | GUID/thumb Bunny | Baixo |
| `/api/youtube-transcript` | legenda YouTube | `/api/transcribe` (Whisper) | Médio |
| **Script de migração** (novo) | — | Firestore → yt-dlp → Bunny → Firestore | Médio |

---

## Esboço do script de migração
```
para cada consultorId:
  libraryId = mapa[consultorId]
  para cada doc em knowledge_base (consultorId, sem bunnyVideoId):
    tenta:
      arquivo = yt-dlp(doc.sourceUrl)          # baixa do YouTube (vídeo seu)
      guid    = bunny.createVideo(libraryId, doc.title)
      bunny.upload(libraryId, guid, arquivo)   # ou fetch por URL direta
      updateDoc(doc.id, { bunnyVideoId: guid, bunnyLibraryId: libraryId })
      log.ok(doc)
    exceto erro:
      log.falha(doc)   # retomável: re-roda só os que faltam
```

---

## Riscos & mitigação
| Risco | Mitigação |
|---|---|
| `yt-dlp` / rate limit do YouTube | throttle + retry; são vídeos seus; ou Google Takeout |
| Paridade player/tracker (seek, retomar, % → certificado) | validar no piloto antes de escalar |
| Custo fugir do previsto | dashboard do Bunny + começar pelo piloto |
| Transcrição de novos incompleta | **Whisper** (ASR de verdade), não Gemini — Gemini só resume |
| Quebrar aluno durante a migração | **fallback YouTube** + `sourceUrl` preservado = rollback |

---

## Decisões que preciso de você
1. **Conta Bunny** criada? (precisa da API Key + Library ID pra codar a Fase 1)
2. **Qual curso** vai de piloto?
3. Confirma o **caminho reversível** (mantém YouTube como fallback até validar tudo)?
