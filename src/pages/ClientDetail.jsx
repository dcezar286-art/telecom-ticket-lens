import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ColumnPicker from "../components/ColumnPicker.jsx";
import DataTable from "../components/DataTable.jsx";
import TagPill from "../components/TagPill.jsx";
import { buildClientPdf } from "../utils/pdf.js";
import { splitTags } from "../utils/tags.js";
import {
  normalizeName,
  normalizePhone,
  safeStr,
  parseDateLoose,
  fmtDate,
} from "../utils/normalize.js";

function keyDecode(encoded) {
  try { return decodeURIComponent(encoded); } catch { return encoded; }
}

function buildClient(rows, rawKey) {
  const [nameRaw, phoneRaw] = rawKey.split("__");
  const name = normalizeName(nameRaw);
  const phone = normalizePhone(phoneRaw);

  const calls = [];

  const attendantsCount = {};
  for (const row of rows) {
    const n = normalizeName(row["Nome do cliente"] ?? row["Cliente"] ?? row["Nome"] ?? "");
    const p = normalizePhone(row["Número do contato"] ?? row["Telefone"] ?? row["Contato"] ?? "");
    if (n !== name || p !== phone) continue;

    const protocolo = safeStr(row["Protocolo"] ?? row["Protocolo do atendimento"] ?? row["Ticket"] ?? "");
    const atendente = safeStr(row["Último atendente"] ?? row["Atendente"] ?? "") || "-";
    const depto = safeStr(row["Último departamento"] ?? row["Departamento"] ?? "") || "-";
    const motivo = safeStr(row["Motivos do atendimento"] ?? row["Motivo"] ?? "") || "-";
    const etiquetasRaw = safeStr(row["Etiquetas do atendimento"] ?? row["Etiquetas"] ?? "");
    const tags = splitTags(etiquetasRaw);

    const aberto = parseDateLoose(row["Aberto em"] ?? row["Data abertura"] ?? "");
    const encerrado = parseDateLoose(row["Encerrado em"] ?? row["Data encerramento"] ?? "");

    attendantsCount[atendente] = (attendantsCount[atendente] ?? 0) + 1;

    calls.push({
      protocolo: protocolo || "-",
      abertoEm: fmtDate(aberto) || "-",
      encerradoEm: fmtDate(encerrado) || "-",
      atendente,
      departamento: depto,
      motivo,
      tags,
      etiquetasRaw,
    });
  }

  // ordena por data (se der)
  calls.sort((a, b) => (a.abertoEm > b.abertoEm ? -1 : 1));

  return {
    name,
    phone,
    total: calls.length,
    attendantsCount,
    calls,
  };
}

export default function ClientDetail({ ctx }) {
  const { key } = useParams();
  const rawKey = keyDecode(key);

  const client = useMemo(() => buildClient(ctx.rawRows, rawKey), [ctx.rawRows, rawKey]);

  const allCols = [
    "Protocolo",
    "Aberto em",
    "Encerrado em",
    "Atendente",
    "Departamento",
    "Motivo",
    "Tags",
  ];

  const [visibleMap, setVisibleMap] = useState(() => {
    const m = {};
    allCols.forEach((c) => (m[c] = true));
    return m;
  });

  const visibleCols = useMemo(() => allCols.filter((c) => visibleMap[c]), [allCols, visibleMap]);

  const rows = useMemo(() => {
    return client.calls.map((c) => ({
      "Protocolo": c.protocolo,
      "Aberto em": c.abertoEm,
      "Encerrado em": c.encerradoEm,
      "Atendente": c.atendente,
      "Departamento": c.departamento,
      "Motivo": c.motivo,
      "Tags": c.tags, // array pra render custom
      "__raw": c,
    }));
  }, [client.calls]);

  const tableRowsForRender = useMemo(() => {
    // DataTable é simples, então vamos transformar "Tags" em string, e render as pills abaixo da tabela também.
    return rows.map((r) => {
      const copy = { ...r };
      copy["Tags"] = Array.isArray(r["Tags"]) ? r["Tags"].slice(0, 4).join(" | ") : "-";
      return copy;
    });
  }, [rows]);

  const attendantsList = useMemo(() => {
    return Object.entries(client.attendantsCount)
      .sort((a,b) => b[1]-a[1])
      .map(([k,v]) => ({ k, v }));
  }, [client.attendantsCount]);

  function downloadPdf() {
    const doc = buildClientPdf({ client, calls: client.calls, meta: ctx.meta });
    const safe = (s) => String(s).replace(/[\\/:*?"<>|]/g, "-");
    doc.save(`Relatorio_${safe(client.name)}_${client.phone || "sem-telefone"}.pdf`);
  }

  return (
    <div className="container">
      <div className="header">
        <div className="title">
          <h1>Detalhe do Cliente</h1>
          <p>Chamados, atendentes e etiquetas (reparo/instalação/visita etc.)</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn btnSecondary" to="/">← Voltar</Link>
          <button className="btn" onClick={downloadPdf} disabled={!client.total}>
            Baixar PDF
          </button>
        </div>
      </div>

      <div className="row">
        <div className="col">
          <div className="card">
            <div className="cardInner">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div className="small">Cliente</div>
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{client.name || "-"}</div>
                  <div className="small">Telefone: <span className="badge">{client.phone || "-"}</span></div>
                </div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div className="kpi" style={{ minWidth: 220 }}>
                    <div className="v">{client.total}</div>
                    <div className="k">Total de chamados</div>
                  </div>
                  <div className="kpi" style={{ minWidth: 220 }}>
                    <div className="v">{attendantsList.length}</div>
                    <div className="k">Atendentes envolvidos</div>
                  </div>
                </div>
              </div>

              <div className="hr" />

              <div className="row">
                <div className="col">
                  <div style={{ fontWeight: 800 }}>Atendentes (quantidade)</div>
                  <div className="small" style={{ marginTop: 6 }}>
                    {attendantsList.length
                      ? attendantsList.map((a) => (
                          <span key={a.k} className="badge" style={{ marginRight: 8 }}>
                            {a.k}: {a.v}
                          </span>
                        ))
                      : "-"}
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div style={{ height: 12 }} />

          <div className="card">
            <div className="cardInner">
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 800 }}>Chamados</div>
                  <div className="small">Prévia na tela para performance (até 500 linhas)</div>
                </div>
              </div>

              <div className="hr" />

              <DataTable
                columns={visibleCols}
                rows={tableRowsForRender.map((r) => {
                  const out = {};
                  visibleCols.forEach((c) => (out[c] = r[c]));
                  return out;
                }).slice(0, 500)}
              />

              <div className="hr" />

              <div style={{ fontWeight: 800, marginBottom: 8 }}>Tags por chamado (visual)</div>
              <div className="small">Mostrando até 15 chamados recentes com tags coloridas</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {client.calls.slice(0, 15).map((c, i) => (
                  <div key={i} className="kpi" style={{ padding: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <div>
                        <span className="badge">Protocolo: {c.protocolo}</span>{" "}
                        <span className="badge">Aberto: {c.abertoEm}</span>{" "}
                        <span className="badge">Atendente: {c.atendente}</span>
                      </div>
                      <div className="small">{c.departamento}</div>
                    </div>
                    <div className="small" style={{ marginTop: 6 }}>Motivo: {c.motivo}</div>
                    <div className="pills" style={{ marginTop: 8 }}>
                      {(c.tags?.length ? c.tags : ["(sem tags)"]).slice(0, 12).map((t, idx) => (
                        <TagPill key={idx} tag={t} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>

        <div style={{ width: 360 }}>
          <ColumnPicker
            title="Ocultar/Mostrar colunas (tabela de chamados)"
            columns={allCols}
            visibleMap={visibleMap}
            setVisibleMap={setVisibleMap}
          />

          <div style={{ height: 12 }} />

          <div className="card">
            <div className="cardInner">
              <div style={{ fontWeight: 800 }}>Observação</div>
              <div className="small" style={{ marginTop: 8, lineHeight: 1.6 }}>
                Quando você mandar o relatório completo (mês/ano), a gente melhora:
                <ul style={{ marginTop: 8, lineHeight: 1.6 }}>
                  <li>Filtro por período</li>
                  <li>Classificação “cliente agressivo” (faixas)</li>
                  <li>Mapeamento fino: reparo/instalação/visita/troca de cômodo</li>
                  <li>PDF com gráficos (barras por atendente e por tipo)</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
