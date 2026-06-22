import type { DocumentMeta, QueryResponse, UploadResult } from "./types";

const FN_BASE = "/.netlify/functions";

// Enquanto o backend não existe (Fase 1), trabalhamos com dados simulados.
// Em Fase 5 basta definir VITE_USE_MOCK=false (ou remover a flag).
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";

// ---------------------------------------------------------------------------
// Camada mock (in-memory) — some quando USE_MOCK = false
// ---------------------------------------------------------------------------
let mockDocs: DocumentMeta[] = [
  {
    id: 1,
    filename: "Politica-de-Ferias.pdf",
    mime_type: "application/pdf",
    uploaded_at: new Date(Date.now() - 86_400_000).toISOString(),
    chunk_count: 12,
  },
  {
    id: 2,
    filename: "Manual-de-Onboarding.docx",
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    uploaded_at: new Date(Date.now() - 3_600_000).toISOString(),
    chunk_count: 34,
  },
];

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function mockUpload(file: File): Promise<UploadResult> {
  await delay(900);
  const doc: DocumentMeta = {
    id: mockDocs.length + 1,
    filename: file.name,
    mime_type: file.type || "application/octet-stream",
    uploaded_at: new Date().toISOString(),
    chunk_count: Math.max(1, Math.round(file.size / 600)),
  };
  mockDocs = [doc, ...mockDocs];
  return { document: doc, chunks: doc.chunk_count ?? 0 };
}

async function mockQuery(question: string): Promise<QueryResponse> {
  await delay(1100);
  return {
    answer:
      `*(resposta simulada — backend ainda não conectado)*\n\n` +
      `Você perguntou: "${question}". Quando as Netlify Functions estiverem ativas, ` +
      `a resposta virá do Gemini com base nos trechos recuperados do acervo.`,
    sources: mockDocs.slice(0, 2).map((d) => ({
      filename: d.filename,
      snippet: "Trecho relevante do documento aparecerá aqui…",
    })),
  };
}

// ---------------------------------------------------------------------------
// Helpers HTTP reais
// ---------------------------------------------------------------------------
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${FN_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} falhou: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API pública usada pelos componentes
// ---------------------------------------------------------------------------
export async function listDocuments(): Promise<DocumentMeta[]> {
  if (USE_MOCK) {
    await delay(300);
    return mockDocs;
  }
  const res = await fetch(`${FN_BASE}/documents`);
  if (!res.ok) throw new Error(`documents falhou: ${res.status}`);
  const data = (await res.json()) as { documents: DocumentMeta[] };
  return data.documents;
}

export async function uploadDocument(file: File): Promise<UploadResult> {
  if (USE_MOCK) return mockUpload(file);

  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${FN_BASE}/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`upload falhou: ${res.status} ${await res.text()}`);
  return res.json() as Promise<UploadResult>;
}

export async function askQuestion(question: string): Promise<QueryResponse> {
  if (USE_MOCK) return mockQuery(question);
  return postJson<QueryResponse>("query", { question });
}

export async function deleteDocument(id: number): Promise<void> {
  if (USE_MOCK) {
    await delay(300);
    mockDocs = mockDocs.filter((d) => d.id !== id);
    return;
  }
  const res = await fetch(`${FN_BASE}/delete-document?id=${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`exclusão falhou: ${res.status} ${await res.text()}`);
}

export { USE_MOCK };
