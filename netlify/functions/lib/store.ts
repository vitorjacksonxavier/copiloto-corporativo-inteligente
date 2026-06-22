import { getStore } from "@netlify/blobs";

// Armazém de vetores sobre Netlify Blobs (sem banco externo).
// - índice de documentos:  index.json   → StoredDoc[]
// - trechos por documento:  chunks/<id>.json → StoredChunk[]
// - arquivo bruto:          files/<key>  (binário, store separado)
//
// A busca por similaridade (cosseno) é feita em JS na função `query`.

const RAG_STORE = "rag-store";
const FILES_STORE = "raw-files";
const INDEX_KEY = "index.json";

// consistency "strong" garante read-after-write entre invocações de Functions.
const rag = () => getStore({ name: RAG_STORE, consistency: "strong" });
const files = () => getStore({ name: FILES_STORE, consistency: "strong" });

export interface StoredDoc {
  id: number;
  filename: string;
  mime_type: string;
  blob_key: string;
  uploaded_at: string;
  chunk_count: number;
}

export interface StoredChunk {
  content: string;
}

// ---- Documentos (índice) --------------------------------------------------
export async function getIndex(): Promise<StoredDoc[]> {
  const idx = (await rag().get(INDEX_KEY, { type: "json" })) as StoredDoc[] | null;
  return idx ?? [];
}

export async function addToIndex(doc: StoredDoc): Promise<void> {
  const idx = await getIndex();
  await rag().setJSON(INDEX_KEY, [doc, ...idx.filter((d) => d.id !== doc.id)]);
}

// ---- Arquivo bruto --------------------------------------------------------
export async function saveRawFile(key: string, data: ArrayBuffer): Promise<void> {
  await files().set(key, data);
}

// ---- Trechos + embeddings -------------------------------------------------
export async function saveChunks(docId: number, chunks: StoredChunk[]): Promise<void> {
  await rag().setJSON(`chunks/${docId}.json`, chunks);
}

/** Remove um documento do acervo: índice, trechos e arquivo bruto. */
export async function deleteDocument(id: number): Promise<boolean> {
  const idx = await getIndex();
  const doc = idx.find((d) => d.id === id);
  if (!doc) return false;

  await rag().setJSON(
    INDEX_KEY,
    idx.filter((d) => d.id !== id),
  );
  await rag().delete(`chunks/${id}.json`);
  if (doc.blob_key) await files().delete(doc.blob_key);
  return true;
}

/** Carrega todos os trechos de todos os documentos (com o nome do arquivo). */
export async function getAllChunks(): Promise<{ filename: string; content: string }[]> {
  const docs = await getIndex();
  const all: { filename: string; content: string }[] = [];
  for (const d of docs) {
    const chunks = (await rag().get(`chunks/${d.id}.json`, { type: "json" })) as
      | StoredChunk[]
      | null;
    if (chunks) {
      for (const c of chunks) all.push({ filename: d.filename, content: c.content });
    }
  }
  return all;
}
