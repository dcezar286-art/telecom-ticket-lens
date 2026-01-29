import React from "react";

export default function ColumnPicker({ title="Colunas", columns, visibleMap, setVisibleMap }) {
  function showAll() {
    const m = {};
    columns.forEach((c) => (m[c] = true));
    setVisibleMap(m);
  }
  function hideAll() {
    const m = {};
    columns.forEach((c) => (m[c] = false));
    setVisibleMap(m);
  }

  return (
    <div className="card">
      <div className="cardInner">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 800 }}>{title}</div>
            <div className="small">Marque para mostrar / desmarque para ocultar</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btnSecondary" onClick={showAll}>Mostrar</button>
            <button className="btn btnSecondary" onClick={hideAll}>Ocultar</button>
          </div>
        </div>

        <div className="hr" />

        <div style={{ maxHeight: 300, overflow: "auto" }}>
          {columns.map((c) => (
            <label key={c} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0" }}>
              <input
                type="checkbox"
                checked={!!visibleMap[c]}
                onChange={(ev) => setVisibleMap((m) => ({ ...m, [c]: ev.target.checked }))}
              />
              <span style={{ fontSize: 13 }}>{c}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
