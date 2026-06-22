import { useCallback, useEffect, useState } from "react";
import { listDocuments, deleteDocument, USE_MOCK } from "./api";
import type { DocumentMeta, UploadResult } from "./types";
import UploadPanel from "./components/UploadPanel";
import DocumentList from "./components/DocumentList";
import ChatPanel from "./components/ChatPanel";

export default function App() {
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  const refreshDocs = useCallback(async () => {
    setLoadingDocs(true);
    try {
      setDocuments(await listDocuments());
    } catch {
      setDocuments([]);
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    refreshDocs();
  }, [refreshDocs]);

  const handleUploaded = (result: UploadResult) => {
    setDocuments((prev) => [result.document, ...prev.filter((d) => d.id !== result.document.id)]);
  };

  const handleDelete = async (id: number) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="flex h-full flex-col">
      {/* Cabeçalho */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-600 text-lg text-white">
            🤖
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight text-slate-800">
              Copiloto Corporativo Inteligente
            </h1>
            <p className="text-xs text-slate-400">
              Perguntas em linguagem natural sobre seus documentos
            </p>
          </div>
        </div>
        {USE_MOCK && (
          <span className="hidden rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 sm:inline">
            modo demo (sem backend)
          </span>
        )}
      </header>

      {/* Corpo */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 gap-4 overflow-hidden p-4 sm:gap-6 sm:p-6">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 flex-col gap-6 overflow-y-auto md:flex">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <UploadPanel onUploaded={handleUploaded} />
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <DocumentList documents={documents} loading={loadingDocs} onDelete={handleDelete} />
          </section>
        </aside>

        {/* Chat */}
        <section className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
          <ChatPanel docCount={documents.length} />
        </section>
      </main>
    </div>
  );
}
