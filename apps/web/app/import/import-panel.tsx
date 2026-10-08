"use client";

import { useState } from "react";

export function ImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [pending, setPending] = useState(false);

  async function upload() {
    if (!file) return;
    setPending(true);
    setError("");
    setResult("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/import/excel", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(Array.isArray(data.message) ? data.message.join(", ") : data.message);
      }
      setResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="panel">
      <h2>Excel workbook</h2>
      <p className="lede">
        Sheets named <code>forecasts</code> and/or <code>commits</code>. Required
        cells must be filled — empty values are rejected, never guessed.
      </p>
      <input
        type="file"
        accept=".xlsx"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <div className="form-actions">
        <button type="button" className="btn btn-primary" disabled={!file || pending} onClick={upload}>
          Import
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      {result ? <pre className="mono">{result}</pre> : null}
    </section>
  );
}
