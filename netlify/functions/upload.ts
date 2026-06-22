import { jsonResponse, errorResponse } from "./lib/http";
import {
  saveRawFile,
  saveChunks,
  addToIndex,
  type StoredChunk,
  type StoredDoc,
} from "./lib/store";
import { extractText, isImage } from "./lib/extract";
import { chunkText } from "./lib/chunk";
import { describeImage } from "./lib/ai";

// upload (com ingest unificado): salva no Blobs, extrai texto (imagens via IA
// multimodal), faz chunk e guarda os trechos no armazém (Blobs). A busca é
// léxica (BM25), então não geramos embeddings.
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return errorResponse("Use POST.", 405);

  // 1) Ler o arquivo do multipart/form-data
  let file: File;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File)) return errorResponse("Campo 'file' ausente.", 400);
    file = f;
  } catch {
    return errorResponse("Falha ao ler o formulário.", 400);
  }

  const filename = file.name || "documento";
  const mimeType = file.type || "application/octet-stream";
  const arrayBuf = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuf);

  try {
    const id = Date.now();
    const blobKey = `${id}-${filename}`;

    // 2) Salvar o arquivo bruto
    await saveRawFile(blobKey, arrayBuf);

    // 3) Extrair texto (imagens via IA multimodal)
    const text = isImage(mimeType, filename)
      ? await describeImage(buffer.toString("base64"), mimeType || "image/png")
      : await extractText(buffer, mimeType, filename);

    // 4) Chunk
    const chunks = chunkText(text);

    const doc: StoredDoc = {
      id,
      filename,
      mime_type: mimeType,
      blob_key: blobKey,
      uploaded_at: new Date().toISOString(),
      chunk_count: chunks.length,
    };

    if (chunks.length > 0) {
      const stored: StoredChunk[] = chunks.map((content) => ({ content }));
      await saveChunks(id, stored);
    }
    await addToIndex(doc);

    return jsonResponse({
      document: doc,
      chunks: chunks.length,
      ...(chunks.length === 0 ? { warning: "Nenhum texto extraído do documento." } : {}),
    });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Falha no processamento do upload.");
  }
}
