// Busca léxica BM25 (sem API/embeddings). Suficiente para recuperar trechos
// relevantes do acervo e alimentar o LLM gerador.

const K1 = 1.5;
const B = 0.75;

// Regex de diacríticos combinantes (escape ASCII para evitar problemas de encoding).
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

// Stopwords PT-BR comuns (lista curta — o suficiente para reduzir ruído).
const STOPWORDS = new Set(
  ("a o e de da do das dos em no na nos nas um uma uns umas para por com sem sob " +
    "que se ao aos a as como mais menos muito pouco ja nao sim ou nem entre " +
    "the of and to in is are for on at this that").split(/\s+/),
);

export function tokenize(text: string): string[] {
  return (
    text
      .normalize("NFD")
      .replace(DIACRITICS, "") // remove acentos
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((t) => t.length >= 2 && !STOPWORDS.has(t)) ?? []
  );
}

export interface SearchDoc {
  filename: string;
  content: string;
}

export interface ScoredChunk {
  filename: string;
  content: string;
  score: number;
}

/** Ranqueia os trechos por BM25 contra a pergunta e devolve os top-k. */
export function bm25TopK(question: string, docs: SearchDoc[], k: number): ScoredChunk[] {
  if (docs.length === 0) return [];

  const tokenized = docs.map((d) => tokenize(d.content));
  const N = docs.length;
  const lengths = tokenized.map((t) => t.length);
  const avgdl = lengths.reduce((a, b) => a + b, 0) / N || 1;

  // document frequency por termo
  const df = new Map<string, number>();
  for (const tokens of tokenized) {
    for (const t of new Set(tokens)) df.set(t, (df.get(t) ?? 0) + 1);
  }

  const queryTerms = [...new Set(tokenize(question))];

  const scored = docs.map((d, i) => {
    const tokens = tokenized[i];
    const dl = lengths[i];
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

    let score = 0;
    for (const term of queryTerms) {
      const f = tf.get(term);
      if (!f) continue;
      const n = df.get(term) ?? 0;
      const idf = Math.log((N - n + 0.5) / (n + 0.5) + 1);
      score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * dl) / avgdl)));
    }
    return { filename: d.filename, content: d.content, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
