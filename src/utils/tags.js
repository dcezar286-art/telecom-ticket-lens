import { safeStr } from "./normalize.js";

/**
 * Aqui você pode evoluir depois.
 * A ideia é: bater palavras-chave nas "Etiquetas do atendimento" e classificar.
 */
export const TAG_RULES = [
  { key: "REPARO", match: ["SEM CONEXÃO", "INTERNET LENTA", "OSCILAÇÃO", "SINAL", "QUEDA"], color: "danger" },
  { key: "INSTALAÇÃO", match: ["INSTALA", "ATIVAÇÃO", "NOVO PONTO", "MUDANÇA"], color: "accent" },
  { key: "VISITA TÉCNICA", match: ["VISITA", "TÉCNICA", "TÉCNICO", "AGENDAMENTO"], color: "warn" },
  { key: "FINANCEIRO", match: ["FINANCEIRO", "BOLETO", "PAGAMENTO", "FATURA"], color: "accent2" },
  { key: "SUPORTE/CONTA", match: ["TROCA DE SENHA", "SENHA", "WI-FI", "CONFIGURA"], color: "ok" },
];

export function splitTags(v) {
  const s = safeStr(v);
  if (!s) return [];
  // No OPA costuma vir como "TAG1; TAG2; TAG3" ou "TAG1, TAG2"
  return s
    .split(/[;,|]/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function classifyTag(tag) {
  const up = safeStr(tag).toUpperCase();
  for (const r of TAG_RULES) {
    for (const m of r.match) {
      if (up.includes(m.toUpperCase())) return r;
    }
  }
  return { key: "OUTROS", color: "muted" };
}

export function colorToken(color) {
  if (color === "danger") return { bg: "rgba(255,77,109,.16)", bd: "rgba(255,77,109,.35)" };
  if (color === "warn") return { bg: "rgba(255,183,3,.16)", bd: "rgba(255,183,3,.35)" };
  if (color === "ok") return { bg: "rgba(46,204,113,.16)", bd: "rgba(46,204,113,.35)" };
  if (color === "accent2") return { bg: "rgba(0,194,255,.14)", bd: "rgba(0,194,255,.35)" };
  if (color === "accent") return { bg: "rgba(43,116,255,.16)", bd: "rgba(43,116,255,.35)" };
  return { bg: "rgba(255,255,255,.08)", bd: "rgba(255,255,255,.15)" };
}
