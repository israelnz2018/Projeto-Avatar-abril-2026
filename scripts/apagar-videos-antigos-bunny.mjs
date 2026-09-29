#!/usr/bin/env node
/**
 * Apaga do Bunny os vídeos ANTIGOS (baixa resolução) já substituídos pela
 * atualização de qualidade — só os confirmados pela auditoria em
 * scripts/auditoria-repontamento.json (nenhum doc do knowledge_base aponta
 * mais para o guid antigo, e o guid novo está de fato em uso).
 *
 * Reconfirma no Bunny, na hora, que o guid novo continua existindo e com boa
 * resolução ANTES de apagar o antigo — defesa contra o arquivo de auditoria
 * ter ficado desatualizado entre a checagem e esta execução.
 */
import "dotenv/config";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const KEY = process.env.BUNNY_STREAM_API_KEY;
const LIB = process.env.BUNNY_LIBRARY_ID;
if (!KEY || !LIB) { console.error("Faltam BUNNY_STREAM_API_KEY e/ou BUNNY_LIBRARY_ID no .env"); process.exit(1); }
const base = `https://video.bunnycdn.com/library/${LIB}/videos`;

async function bunnyGet(guid) {
  const r = await fetch(`${base}/${guid}`, { headers: { AccessKey: KEY } });
  if (!r.ok) return null;
  return r.json();
}
async function bunnyApagar(guid) {
  const r = await fetch(`${base}/${guid}`, { method: "DELETE", headers: { AccessKey: KEY } });
  return r.ok;
}

const AUDITORIA_PATH = "scripts/auditoria-repontamento.json";
if (!existsSync(AUDITORIA_PATH)) { console.error("Rode a auditoria antes (scripts/auditoria-repontamento.json não existe)."); process.exit(1); }
const auditoria = JSON.parse(readFileSync(AUDITORIA_PATH, "utf8"));
const lista = auditoria.confirmadosSeguro || [];
console.log(`${lista.length} vídeo(s) confirmados pela auditoria.\n`);

const LOG_PATH = "scripts/log-exclusao-videos-antigos.json";
const log = existsSync(LOG_PATH) ? JSON.parse(readFileSync(LOG_PATH, "utf8")) : {};
function salvarLog() { writeFileSync(LOG_PATH, JSON.stringify(log, null, 2)); }

let apagados = 0, pulados = 0;
for (const [i, item] of lista.entries()) {
  if (log[item.guidAntigo]?.status === "apagado") { continue; }
  const prefixo = `[${i + 1}/${lista.length}]`;
  try {
    // Reconfirma AGORA, não confia só no arquivo de auditoria: o novo precisa
    // existir e estar em resolução igual ou melhor que a registrada.
    const novo = await bunnyGet(item.guidNovo);
    if (!novo) throw new Error("o vídeo novo não existe mais no Bunny — não apago o antigo");
    if (!novo.width || !novo.height) throw new Error("o vídeo novo está sem dimensões no Bunny — ainda processando?");

    const ok = await bunnyApagar(item.guidAntigo);
    if (!ok) throw new Error("o Bunny recusou a exclusão");

    log[item.guidAntigo] = { status: "apagado", guidNovo: item.guidNovo, quando: new Date().toISOString() };
    apagados++;
    console.log(`${prefixo} apagado ${item.guidAntigo} (substituído por ${item.guidNovo}, ${novo.width}x${novo.height})`);
  } catch (e) {
    log[item.guidAntigo] = { status: "erro", motivo: String(e.message).slice(0, 300), quando: new Date().toISOString() };
    pulados++;
    console.log(`${prefixo} PULADO ${item.guidAntigo}: ${e.message}`);
  }
  salvarLog();
}
console.log(`\nApagados: ${apagados} | Pulados: ${pulados} | Total: ${lista.length}`);
