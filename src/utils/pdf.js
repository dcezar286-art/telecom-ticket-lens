import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { fmtDate } from "./normalize.js";

export function buildClientPdf({ client, calls, meta }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Relatório de Atendimento (OPA)", 40, 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Fonte: ${meta?.sourceName || "arquivo"}`, 40, 66);
  doc.text(`Gerado em: ${fmtDate(new Date())}`, 40, 82);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Cliente", 40, 110);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Nome: ${client.name}`, 40, 130);
  doc.text(`Telefone: ${client.phone || "-"}`, 40, 146);
  doc.text(`Total de chamados: ${client.total}`, 40, 162);

  // Atendentes
  doc.setFont("helvetica", "bold");
  doc.text("Atendentes (quantidade)", 40, 190);
  doc.setFont("helvetica", "normal");

  const attendantsLines = Object.entries(client.attendantsCount)
    .sort((a,b)=> b[1]-a[1])
    .slice(0, 12)
    .map(([k,v]) => `${k}: ${v}`);

  const text = attendantsLines.length ? attendantsLines.join("  |  ") : "-";
  doc.setFontSize(10);
  doc.text(doc.splitTextToSize(text, 520), 40, 208);

  // Table
  const rows = calls.map((c) => ([
    c.protocolo,
    c.abertoEm,
    c.atendente,
    c.departamento,
    c.motivo,
    (c.tags || []).slice(0, 3).join(" | "),
  ]));

  autoTable(doc, {
    startY: 240,
    head: [["Protocolo", "Aberto em", "Atendente", "Depto", "Motivo", "Tags (top 3)"]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [20, 30, 55] },
    theme: "grid",
    margin: { left: 40, right: 40 },
  });

  return doc;
}
