import React, { useMemo, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import ClientDetail from "./pages/ClientDetail.jsx";

export default function App() {
  const [rawRows, setRawRows] = useState([]);
  const [meta, setMeta] = useState({ sourceName: "" });

  const ctx = useMemo(() => ({ rawRows, setRawRows, meta, setMeta }), [rawRows, meta]);

  return (
    <Routes>
      <Route path="/" element={<Dashboard ctx={ctx} />} />
      <Route path="/cliente/:key" element={<ClientDetail ctx={ctx} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
