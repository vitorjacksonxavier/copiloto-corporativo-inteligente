import { jsonResponse, errorResponse } from "./lib/http";
import { deleteDocument } from "./lib/store";

// Remove um documento do acervo. Aceita DELETE/POST com o id via query (?id=)
// ou no corpo JSON ({ id }).
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "DELETE" && req.method !== "POST") {
    return errorResponse("Use DELETE ou POST.", 405);
  }

  let id: number | undefined;
  const qid = new URL(req.url).searchParams.get("id");
  if (qid) {
    id = Number(qid);
  } else {
    try {
      const body = (await req.json()) as { id?: number };
      id = body.id;
    } catch {
      // sem corpo — segue com id indefinido
    }
  }

  if (!id || Number.isNaN(id)) return errorResponse("id inválido.", 400);

  try {
    const ok = await deleteDocument(id);
    if (!ok) return errorResponse("Documento não encontrado.", 404);
    return jsonResponse({ ok: true, id });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Falha ao excluir.");
  }
}
