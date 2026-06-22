import { jsonResponse, errorResponse } from "./lib/http";
import { getIndex } from "./lib/store";

// Lista os documentos do acervo (para a interface).
export default async function handler(): Promise<Response> {
  try {
    const documents = await getIndex();
    return jsonResponse({ documents });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Falha ao listar documentos.");
  }
}
