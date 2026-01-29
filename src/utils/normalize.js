export function safeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export function normalizePhone(v) {
  const s = safeStr(v);
  // mantém só números
  const digits = s.replace(/\D+/g, "");
  return digits;
}

export function normalizeName(v) {
  return safeStr(v).replace(/\s+/g, " ").trim();
}

export function clientKeyFromRow(row) {
  const name = normalizeName(row["Nome do cliente"] ?? row["Cliente"] ?? row["Nome"] ?? "");
  const phone = normalizePhone(row["Número do contato"] ?? row["Telefone"] ?? row["Contato"] ?? "");
  // chave estável (para URL)
  return encodeURIComponent(`${name}__${phone}`);
}

export function parseDateLoose(v) {
  // tenta lidar com "2026-01-29 10:00", "29/01/2026 10:00", etc.
  const s = safeStr(v);
  if (!s) return null;

  // ISO-like
  const d1 = new Date(s);
  if (!Number.isNaN(d1.getTime())) return d1;

  // dd/mm/yyyy hh:mm(:ss)?
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const dd = Number(m[1]), mm = Number(m[2]) - 1, yyyy = Number(m[3]);
    const HH = Number(m[4] ?? 0), MI = Number(m[5] ?? 0), SS = Number(m[6] ?? 0);
    const d2 = new Date(yyyy, mm, dd, HH, MI, SS);
    if (!Number.isNaN(d2.getTime())) return d2;
  }
  return null;
}

export function fmtDate(d) {
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const dd = pad(d.getDate());
  const mm = pad(d.getMonth() + 1);
  const yyyy = d.getFullYear();
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

export function uniq(arr) {
  return Array.from(new Set(arr));
}
