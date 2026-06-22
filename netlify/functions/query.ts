import { jsonResponse, errorResponse } from "./lib/http";
import { getAllChunks } from "./lib/store";
import { bm25TopK, type ScoredChunk } from "./lib/search";
import { generateAnswer } from "./lib/ai";

const TOP_K = 6;

const SYSTEM =
  "Você é um copiloto corporativo. Responda à pergunta do colaborador com base nos " +
  "trechos de contexto fornecidos (extraídos dos documentos internos). Você PODE e DEVE " +
  "fazer inferências e conexões razoáveis a partir do que está nos trechos — por exemplo, " +
  "se um item aparece listado como uma infração/irregularidade, então deixar de cumpri-lo " +
  "(ou praticá-lo) configura essa irregularidade, e você deve explicar isso. " +
  "Responda em português, de forma objetiva e útil, e cite as fontes usadas como [Fonte N]. " +
  "Só diga que não encontrou a informação quando realmente não houver NENHUMA base " +
  "relacionada nos trechos.";

function buildUserPrompt(question: string, rows: ScoredChunk[]): string {
  const context = rows
    .map((r, i) => `[Fonte ${i + 1} — ${r.filename}]\n${r.content}`)
    .join("\n\n");
  return `=== CONTEXTO ===\n${context}\n=== FIM DO CONTEXTO ===\n\nPergunta: ${question}`;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return errorResponse("Use POST.", 405);

  let question: string;
  try {
    const body = (await req.json()) as { question?: string };
    question = (body.question ?? "").trim();
  } catch {
    return errorResponse("JSON inválido.", 400);
  }
  if (!question) return errorResponse("Pergunta vazia.", 400);

  try {
    // 1) Carregar o acervo e ranquear por BM25
    const chunks = await getAllChunks();
    if (chunks.length === 0) {
      return jsonResponse({
        answer: "Ainda não há documentos no acervo. Envie documentos e tente novamente.",
        sources: [],
      });
    }

    let rows = bm25TopK(question, chunks, TOP_K);
    // Fallback: se o BM25 não pontuou nenhum trecho (ex.: pergunta muito curta
    // ou sem termos em comum), ainda assim enviamos os primeiros trechos do
    // acervo ao modelo, deixando que ele avalie a relevância.
    if (rows.length === 0) {
      rows = chunks.slice(0, TOP_K).map((c) => ({ ...c, score: 0 }));
    }

    // 2) Geração com o Netlify AI Gateway
    const answer = await generateAnswer(SYSTEM, buildUserPrompt(question, rows));

    // 3) Fontes únicas por documento
    const seen = new Set<string>();
    const sources = rows
      .filter((r) => (seen.has(r.filename) ? false : (seen.add(r.filename), true)))
      .map((r) => ({ filename: r.filename, snippet: r.content.slice(0, 160) }));

    return jsonResponse({ answer, sources });
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : "Falha ao consultar.");
  }
}
