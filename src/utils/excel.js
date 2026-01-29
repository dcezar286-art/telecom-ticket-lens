import * as XLSX from "xlsx";

function looksLikeCsv(name = "") {
  return name.toLowerCase().endsWith(".csv");
}

export async function readOpaFile(file) {
  const name = file?.name || "arquivo";
  const buf = await file.arrayBuffer();

  if (looksLikeCsv(name)) {
    const text = new TextDecoder("utf-8").decode(new Uint8Array(buf));
    const wb = XLSX.read(text, { type: "string" });
    const sheet = wb.SheetNames[0];
    const ws = wb.Sheets[sheet];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
    return { rows, sheetName: sheet, sourceName: name };
  }

  // xlsx/xls
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.SheetNames[0];
  const ws = wb.Sheets[sheet];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });

  return { rows, sheetName: sheet, sourceName: name };
}

export function exportCsv(rows, filename = "ranking.csv") {
  if (!rows?.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const lines = [
    cols.map(esc).join(","),
    ...rows.map((r) => cols.map((c) => esc(r[c])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
