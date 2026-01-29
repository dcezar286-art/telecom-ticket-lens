import React from "react";
import { TAG_RULES, colorToken } from "../utils/tags.js";

export default function TagLegend() {
  return (
    <div className="card">
      <div className="cardInner">
        <div style={{ fontWeight: 800 }}>Legenda de cores (Tags)</div>
        <div className="small">Baseado em palavras-chave nas etiquetas. Dá pra ajustar depois.</div>

        <div className="hr" />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {TAG_RULES.map((r) => {
            const c = colorToken(r.color);
            return (
              <span key={r.key} className="badge" style={{ background: c.bg, borderColor: c.bd }}>
                {r.key}
              </span>
            );
          })}
          <span className="badge" style={{ background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.15)" }}>
            OUTROS
          </span>
        </div>
      </div>
    </div>
  );
}
