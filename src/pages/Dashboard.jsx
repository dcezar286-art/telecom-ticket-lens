import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import FileUploader from "../components/FileUploader.jsx";
import DataTable from "../components/DataTable.jsx";
import TagLegend from "../components/TagLegend.jsx";
import { exportCsv } from "../utils/excel.js";
import {
  clientKeyFromRow,
  normalizeName,
  normalizePhone,
  parseDateLoose,
  fmtDate,
  uniq,
  safeStr
} from "../utils/normalize.js";

function buildClients(rows) {
  const map = new Map();

  for (const row of rows) {
    const name = normalizeName(row["Nome do cliente"] ?? row["Cliente"] ?? row["Nome"] ?? "");
    const phone = normalizePhone(row["Número do contato"] ?? row["Telefone"] ?? row["Contato"] ?? "");
    if (!name && !phone) continue;

    const key = `${name}__${phone}`;
    const protocolo = safeStr(row["Protocolo"] ?? row["Protocolo do atendimento"] ?? row["Ticket"] ?? "");
    const atendente = safeStr(row["Último atendente"] ?? row["Atendente"] ?? "");
    const depto = safeStr(row["Último departamento"] ?? row["Departamento"] ?? "");
    const motivo = safeStr(row["Motivos do atendimento"] ?? row["Motivo"] ?? "");
    const etiquetas = safeStr(row["Etiquetas do atendimento"] ?? row["Etiquetas"] ?? "");
    const aberto = parseDateLoose(row["Aberto em"] ?? row["Data abertura"] ?? "");
    const encerrado = parseDateLoose(row["Encerrado em"] ?? row["Data encerramento"] ?? "");

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
        calls: [],
      });
    }

    const c = map.get(key);
    c.total += 1;

    if (atendente) {
      c.attendants.add(atendente);
      c.attendantsCount[atendente] = (c.attendantsCount[atendente] ?? 0) + 1;
    }

    const when = aberto ?? encerrado;
    if (when) {
      if (!c.first || when < c.first) c.first = when;
      if (!c.last || when > c.last) c.last = when;
    }

    c.calls.push({
      protocolo,
      abertoEm: fmtDate(aberto),
      encerradoEm: fmtDate(encerrado),
      atendente: atendente || "-",
      departamento: depto || "-",
      motivo: motivo || "-",
      etiquetasRaw: etiquetas,
      rowOriginal: row,
    });
  }

  // to array
  const clients = Array.from(map.values()).map((c) => ({
    ...c,
    attendantsList: uniq(Array.from(c.attendants)).join(", "),
    firstFmt: fmtDate(c.first),
    lastFmt: fmtDate(c.last),
  }));

  // ranking
  clients.sort((a, b) => b.total - a.total);
  return clients;
}

export default function Dashboard({ ctx }) {
  const nav = useNavigate();
  const [search, setSearch] = useState("");
  const [minCalls, setMinCalls] = useState(1);

  const clients = useMemo(() => buildClients(ctx.rawRows), [ctx.rawRows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (c.total < minCalls) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        (c.phone || "").includes(q)
      );
    });
  }, [clients, search, minCalls]);

  const tableRows = useMemo(() => {
    return filtered.map((c) => ({
      "Cliente": c.name,
      "Telefone": c.phone || "-",
      "Chamados": c.total,
      "Atendentes": c.attendantsList || "-",
      "Primeiro contato": c.firstFmt || "-",
      "Último contato": c.lastFmt || "-",
      "__key": c.keyEncoded,
    }));
  }, [filtered]);

  const tableCols = ["Cliente", "Telefone", "Chamados", "Atendentes", "Primeiro contato", "Último contato"];

  const kpis = useMemo(() => {
    const totalCalls = ctx.rawRows.length;
    const totalClients = clients.length;
    const top = clients[0]?.total ?? 0;
    const topName = clients[0]?.name ?? "-";
    return { totalCalls, totalClients, top, topName };
  }, [ctx.rawRows.length, clients]);

  return (
    <div className="container">
      <div className="header">
        <div className="title">
          <h1>Telecom Ticket Lens</h1>
          <p>Upload do OPA → ranking por cliente (Nome + Telefone) → detalhe por chamado → relatório PDF</p>
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
          <div className="v">{kpis.top}</div>
          <div className="k">Maior volume (cliente)</div>
        </div>
        <div className="kpi">
          <div className="v" style={{ fontSize: 14, fontWeight: 700 }}>{kpis.topName}</div>
          <div className="k">Top 1</div>
        </div>
      </div>

      <div style={{ height: 12 }} />

      <div className="row">
        <div className="col">
          <div className="card">
            <div className="cardInner">
              <div className="row">
                <div className="col">
                  <div className="label">Buscar cliente (nome ou telefone)</div>
                  <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ex: João / 11999998888" />
                </div>
                <div style={{ width: 180 }}>
                  <div className="label">Mín. chamados</div>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={minCalls}
                    onChange={(e) => setMinCalls(Number(e.target.value || 1))}
                  />
                </div>
                <div style={{ width: 220, display: "flex", alignItems: "end", gap: 10 }}>
                  <button
                    className="btn btnSecondary"
                    onClick={() => exportCsv(tableRows.map(({ __key, ...rest }) => rest), "ranking_clientes.csv")}
                    disabled={!tableRows.length}
                  >
                    Exportar Ranking (CSV)
                  </button>
                </div>
              </div>

              <div className="hr" />

              <DataTable
                columns={tableCols}
                rows={tableRows.slice(0, 500)}  // preview para leveza
                onRowClick={(r) => nav(`/cliente/${r.__key}`)}
              />
              <div className="small" style={{ marginTop: 10 }}>
                Mostrando até 500 clientes na tela (pra ficar rápido). Clique em um cliente para ver detalhes.
              </div>
            </div>
          </div>
        </div>

        <div style={{ width: 360 }}>
          <TagLegend />
          <div style={{ height: 12 }} />
          <div className="card">
            <div className="cardInner">
              <div style={{ fontWeight: 800 }}>Próximos upgrades (quando você mandar o relatório completo)</div>
              <ul className="small" style={{ marginTop: 10, lineHeight: 1.55 }}>
                <li>Filtro por período (mês/ano)</li>
                <li>Dashboard por atendente (quem atendeu mais)</li>
                <li>Ranking por “tipo de chamado” (reparo/instalação/visita)</li>
                <li>Export Excel do detalhe + PDF com gráfico</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
