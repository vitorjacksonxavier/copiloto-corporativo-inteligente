import { useRef, useState } from "react";
import { uploadDocument } from "../api";
import type { UploadResult } from "../types";

interface Props {
  onUploaded: (result: UploadResult) => void;
}

const ACCEPT = ".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md,.png,.jpg,.jpeg";

export default function UploadPanel({ onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        setStatus(`Processando ${file.name}…`);
        const result = await uploadDocument(file);
        onUploaded(result);
        setStatus(`✓ ${file.name} (${result.chunks} trechos)`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload");
      setStatus(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-slate-700">Enviar documento</h2>

      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={[
          "flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-4 py-6 text-center transition",
          dragging
            ? "border-brand-500 bg-brand-50"
            : "border-slate-200 bg-slate-50 hover:border-brand-500 hover:bg-brand-50",
          busy ? "cursor-wait opacity-70" : "cursor-pointer",
        ].join(" ")}
      >
        <span className="text-2xl">{busy ? "⏳" : "📤"}</span>
        <span className="text-sm font-medium text-slate-600">
          {busy ? "Enviando…" : "Arraste ou clique para enviar"}
        </span>
        <span className="text-xs text-slate-400">PDF, Word, Excel, CSV, texto, imagens</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {status && !error && <p className="text-xs text-emerald-600">{status}</p>}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
