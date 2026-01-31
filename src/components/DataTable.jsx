import React from "react";

export default function DataTable({ columns, rows, onRowClick, maxHeight = "60vh" }) {
  return (
    <div className="tableWrap" style={{ maxHeight, overflow: "auto" }}>
      <table>
        <thead>
          <tr>
            {columns.map((c) => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={idx}
              className={onRowClick ? "trHover" : ""}
              onClick={() => onRowClick?.(r)}
            >
              {columns.map((c) => <td key={c}>{r[c]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
