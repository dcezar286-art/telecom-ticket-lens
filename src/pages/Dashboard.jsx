import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FileUploader from "../components/FileUploader.jsx";
import DataTable from "../components/DataTable.jsx";
import TagLegend from "../components/TagLegend.jsx";
import { exportCsv } from "../utils/excel.js";
import {
  parseDateLoose,
  fmtDate,
  uniq,
  safeStr
} from "../utils/normalize.js";

/** Normaliza nome+telefone (chave do cliente) */
function normalizeName(v) {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  const up = s.toUpperCase();
  if (up === "-" || up === "N/A" || up === "NA" || up === "NULL") return "";
  return s;
}
function normalizePhone(v) {
  return String(v ?? "").replace(/\D+/g, "").trim();
}

/** Normaliza atendente pra agrupar sem duplicar por maiúscula/minúscula */
function normalizeAttendant(v) {
  const s = String(v ?? "").trim();
  if (!s || s.toLowerCase() === "nan") return "-";
  return s.toUpperCase();
}

function buildClients(rows) {
  const map = new Map();

  for (const row of rows) {
  let name = normalizeName(row["Nome do cliente"]);
  const phone = normalizePhone(row["Número do contato"]);

  if (!name && !phone) continue;

  // ✅ AQUI é o lugar certo
  if (!name) {
    name = phone ? `SEM NOME (${phone})` : "SEM NOME";
  }

    const key = `${name}__${phone}`;
    const protocolo = safeStr(row["Protocolo"]);
    const atendenteRaw = safeStr(row["Último atendente"]);
    const atendenteKey = normalizeAttendant(atendenteRaw);

    const depto = safeStr(row["Último departamento"]);
    const motivo = safeStr(row["Motivos do atendimento"]);
    const etiquetas = safeStr(row["Etiquetas do atendimento"]);

    const aberto = parseDateLoose(row["Aberto em"]);
    const encerrado = parseDateLoose(row["Encerrado em"]);

    if (!map.has(key)) {
      map.set(key, {
        keyEncoded: encodeURIComponent(key),
        name,
        phone,
        total: 0,
        attendants: new Set(),
        attendantsCount: {},
        first: null,
        last: null,
      });
    }

    const c = map.get(key);
    c.total += 1;

    if (atendenteKey) {
      c.attendants.add(atendenteKey);
      c.attendantsCount[atendenteKey] = (c.attendantsCount[atendenteKey] ?? 0) + 1;
    }

    const when = aberto ?? encerrado;
    if (when) {
      if (!c.first || when < c.first) c.first = when;
      if (!c.last || when > c.last) c.last = when;
    }
  }

  const clients = Array.from(map.values()).map((c) => ({
    ...c,
    attendantsList: uniq(Array.from(c.attendants)).join(", "),
    firstFmt: fmtDate(c.first),
    lastFmt: fmtDate(c.last),
  }));

  clients.sort((a, b) => b.total - a.total);
  return clients;
}

function buildAttendantsStats(rows) {
  const totals = {};
  const clientsSet = {}; // attendant -> Set(clientKey)

  for (const row of rows) {
    const att = normalizeAttendant(row["Último atendente"]);
    totals[att] = (totals[att] ?? 0) + 1;

    const name = normalizeName(row["Nome do cliente"]);
    const phone = normalizePhone(row["Número do contato"]);
    const ck = `${name}__${phone}`;

    if (!clientsSet[att]) clientsSet[att] = new Set();
    clientsSet[att].add(ck);
  }

  const list = Object.keys(totals).map((att) => ({
    attendant: att,
    totalCalls: totals[att],
    uniqueClients: clientsSet[att] ? clientsSet[att].size : 0
  }));

  list.sort((a, b) => b.totalCalls - a.totalCalls);

  return { list, attendants: list.map(x => x.attendant) };
}


export default function Dashboard({ ctx }) {
  const nav = useNavigate();

  const [search, setSearch] = useState("");
  const [minCalls, setMinCalls] = useState(1);

  // NOVO: filtro por atendente
  const [attendant, setAttendant] = useState("TODOS");

  const [onlyThisAttendant, setOnlyThisAttendant] = useState(false);


  // NOVO: paginação
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  

  const clients = useMemo(() => buildClients(ctx.rawRows), [ctx.rawRows]);
  const attendantsStats = useMemo(() => buildAttendantsStats(ctx.rawRows), [ctx.rawRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return clients.filter((c) => {
      if (c.total < minCalls) return false;

      // filtro por atendente
     if (attendant !== "TODOS") {
      const hasThis = !!c.attendantsCount?.[attendant];
      if (!hasThis) return false;

      if (onlyThisAttendant) {
        const allAtts = Object.keys(c.attendantsCount || {});
        if (!(allAtts.length === 1 && allAtts[0] === attendant)) return false;
      }
    }


      // busca por nome/telefone
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
      );
    });
  }, [clients, search, minCalls, attendant]);

  // reset de página quando muda filtro
  useMemo(() => { setPage(1); }, [search, minCalls, attendant, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (pageSafe - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, pageSafe, pageSize]);

  const tableRows = useMemo(() => {
    return paged.map((c) => ({
      "Cliente": c.name,
      "Telefone": c.phone || "-",
      "Chamados": c.total,
      "Atendentes": c.attendantsList || "-",
      "Primeiro contato": c.firstFmt || "-",
      "Último contato": c.lastFmt || "-",
      "__key": c.keyEncoded,
    }));
  }, [paged]);

  const tableCols = ["Cliente", "Telefone", "Chamados", "Atendentes", "Primeiro contato", "Último contato"];

  const kpis = useMemo(() => {
    const totalCalls = ctx.rawRows.length;
    const totalClients = clients.length;
    const top = clients[0]?.total ?? 0;
    const topName = clients[0]?.name ?? "-";

    // KPI do atendente selecionado
    let attCalls = totalCalls;
    if (attendant !== "TODOS") {
      const found = attendantsStats.list.find(x => x.attendant === attendant);
      attCalls = found?.totalCalls ?? 0;
    }

    return { totalCalls, totalClients, top, topName, attCalls };
  }, [ctx.rawRows.length, clients, attendant, attendantsStats.list]);

  function exportRanking() {
    const rows = filtered.map((c) => ({
      Cliente: c.name,
      Telefone: c.phone || "-",
      Chamados: c.total,
      Atendentes: c.attendantsList || "-",
      PrimeiroContato: c.firstFmt || "-",
      UltimoContato: c.lastFmt || "-",
    }));
    exportCsv(rows, "ranking_clientes.csv");
  }

  return (
    <div className="container">
      <div className="header">
        <div className="title">
          <h1>Telecom Ticket Lens</h1>
          <p>Upload do OPA → ranking por cliente (Nome + Telefone) → detalhe → relatório PDF</p>
        </div>
        <div className="small">
          {ctx.meta.sourceName ? `Arquivo: ${ctx.meta.sourceName}` : "Nenhum arquivo carregado"}
        </div>
      </div>

      <FileUploader
        onLoaded={({ rows, sourceName }) => {
          ctx.setRawRows(rows);
          ctx.setMeta({ sourceName });
        }}
        onClear={() => {
          ctx.setRawRows([]);
          ctx.setMeta({ sourceName: "" });
          setSearch("");
          setMinCalls(1);
          setAttendant("TODOS");
          setPage(1);
        }}
      />

      <div style={{ height: 12 }} />

      <div className="kpis">
        <div className="kpi">
          <div className="v">{kpis.totalCalls}</div>
          <div className="k">Total de chamados (linhas)</div>
        </div>
        <div className="kpi">
          <div className="v">{kpis.totalClients}</div>
          <div className="k">Clientes únicos</div>
        </div>
        <div className="kpi">
          <div className="v">{kpis.attCalls}</div>
          <div className="k">Chamados (atendente filtrado)</div>
        </div>
        <div className="kpi">
          <div className="v">{kpis.top}</div>
          <div className="k">Maior volume (cliente)</div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="dashboardGrid">
        <div className="col">
          <div className="card">
            <div className="cardInner">
              <div className="filtersGrid">
                <div className="col" style={{ minWidth: 320, flex: 1 }}>
                  <div className="label">Buscar cliente (nome ou telefone)</div>
                  <input
                    className="input"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Ex: João / 11999998888"
                  />
                </div>

                <div style={{ width: 180, minWidth: 180 }}>
                  <div className="label">Mín. chamados</div>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={minCalls}
                    onChange={(e) => setMinCalls(Number(e.target.value || 1))}
                  />
                </div>

                <div style={{ width: 240 }}>
                  <div className="label">Filtrar por atendente</div>
                  <select className="select" value={attendant} onChange={(e) => setAttendant(e.target.value)}>
                    <option value="TODOS">TODOS</option>
                    {attendantsStats.attendants
                      .filter(a => a !== "TODOS")
                      .map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                  </select>
                </div>
                <div style={{ width: 240 }}>
                  <label style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 6 }}>
                    <input
                      type="checkbox"
                      checked={onlyThisAttendant}
                      onChange={(e) => setOnlyThisAttendant(e.target.checked)}
                      disabled={attendant === "TODOS"}
                    />
                    <span className="small">Somente este atendente</span>
                  </label>
                </div>


                <div style={{ width: 160 }}>
                  <div className="label">Por página</div>
                  <select className="select" value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>

                <div style={{ width: 220, display: "flex", gap: 10 }}>
                  <button className="btn btnSecondary" onClick={exportRanking} disabled={!filtered.length}>
                    Exportar Ranking (CSV)
                  </button>
                </div>
              </div>

              <div className="hr" />

              {/* Paginação */}
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div className="small">
                  Resultados: <b>{filtered.length}</b> clientes | Página <b>{pageSafe}</b> de <b>{totalPages}</b>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btnSecondary" onClick={() => setPage(1)} disabled={pageSafe === 1}>⏮</button>
                  <button className="btn btnSecondary" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={pageSafe === 1}>◀</button>
                  <button className="btn btnSecondary" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={pageSafe === totalPages}>▶</button>
                  <button className="btn btnSecondary" onClick={() => setPage(totalPages)} disabled={pageSafe === totalPages}>⏭</button>
                </div>
              </div>

              <div style={{ height: 10 }} />

              <DataTable
                columns={tableCols}
                rows={tableRows}
                onRowClick={(r) => nav(`/cliente/${r.__key}`)}
                maxHeight="62vh"
              />

              <div className="small" style={{ marginTop: 10 }}>
                Dica: com arquivo grande, use a paginação e o filtro por atendente para achar rápido.
              </div>
            </div>
          </div>
        </div>

        <div>
          <TagLegend />

          <div style={{ height: 12 }} />

          {/* Ranking de atendentes */}
          <div className="card">
            <div className="cardInner">
              <div style={{ fontWeight: 800 }}>Ranking de Atendentes</div>
              <div className="small">Total de chamados e clientes únicos atendidos</div>
              <div className="hr" />

              <div className="tableWrap" style={{ maxHeight: "40vh", overflow: "auto" }}>
                <table style={{ minWidth: 0 }}>
                  <thead>
                    <tr>
                      <th>Atendente</th>
                      <th>Chamados</th>
                      <th>Clientes únicos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendantsStats.list.slice(0, 30).map((a) => (
                      <tr key={a.attendant} className="trHover" onClick={() => setAttendant(a.attendant)}>
                        <td>{a.attendant}</td>
                        <td>{a.totalCalls}</td>
                        <td>{a.uniqueClients}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="small" style={{ marginTop: 10 }}>
                Clique em um atendente no ranking para filtrar a tabela de clientes.
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
