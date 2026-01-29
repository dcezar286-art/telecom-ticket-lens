import React, { useState } from "react";
import { readOpaFile } from "../utils/excel.js";

export default function FileUploader({ onLoaded, onClear }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onPick(e) {
    setErr("");
    const f = e.target.files?.[0];
    if (!f) return;

    try {
      setBusy(true);
      const result = await readOpaFile(f);
      onLoaded(result);
    } catch (ex) {
      console.error(ex);
      setErr("Não consegui ler esse arquivo. Envie CSV/XLSX do OPA.");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="card">
      <div className="cardInner">
        <div className="row" style={{ alignItems: "center" }}>
          <div className="col">
            <div className="label">Importar arquivo do OPA (CSV/XLSX)</div>
            <input
              className="input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onPick}
              disabled={busy}
            />
            {err && <div style={{ marginTop: 8, color: "rgba(255,77,109,.95)" }}>{err}</div>}
            <div className="small" style={{ marginTop: 8 }}>
              Dica: arquivos grandes funcionam, mas a tabela na tela mostra prévia para ficar leve.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btnSecondary" onClick={onClear} disabled={busy}>
              Limpar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
