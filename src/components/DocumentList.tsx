import { useState } from "react";
import type { DocumentMeta } from "../types";

interface Props {
  documents: DocumentMeta[];
  loading: boolean;
  onDelete: (id: number) => Promise<void>;
}

const ICONS: Record<string, string> = {
  pdf: "📕",
  doc: "📘",
  docx: "📘",
  xls: "📊",
  xlsx: "📊",
  csv: "📈",
  txt: "📄",
  md: "📝",
  png: "🖼️",
  jpg: "🖼️",
  jpeg: "🖼️",
};

function iconFor(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ICONS[ext] ?? "📎";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function DocumentList({ documents, loading, onDelete }: Props) {
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function confirmDelete(id: number) {
    setConfirmingId(null);
    setDeletingId(id);
    setError(null);
    try {
      await onDelete(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao excluir.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Acervo</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          {documents.length}
        </span>
      </div>

      {loading ? (
        <p className="py-4 text-center text-sm text-slate-400">Carregando…</p>
      ) : documents.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">
          Nenhum documento ainda. Envie um arquivo para começar.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="group flex items-start gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 text-sm transition hover:border-slate-200 hover:shadow-sm"
            >
              <span className="text-base leading-5">{iconFor(doc.filename)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-700" title={doc.filename}>
                  {doc.filename}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDate(doc.uploaded_at)}
                  {typeof doc.chunk_count === "number" && ` · ${doc.chunk_count} trechos`}
                </p>
              </div>
              {deletingId === doc.id ? (
                <span className="shrink-0 p-1 text-base">⏳</span>
              ) : confirmingId === doc.id ? (
                <span className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => confirmDelete(doc.id)}
                    title="Confirmar exclusão"
                    aria-label={`Confirmar exclusão de ${doc.filename}`}
                    className="rounded-md bg-rose-500 px-1.5 py-0.5 text-xs font-medium text-white transition hover:bg-rose-600"
                  >
                    Excluir
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingId(null)}
                    title="Cancelar"
                    aria-label="Cancelar"
                    className="rounded-md px-1.5 py-0.5 text-xs text-slate-400 transition hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingId(doc.id)}
                  disabled={deletingId !== null}
                  title="Excluir documento"
                  aria-label={`Excluir ${doc.filename}`}
                  className="shrink-0 rounded-md p-1 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50 group-hover:text-slate-400"
                >
                  🗑️
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
