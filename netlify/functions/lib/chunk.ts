// Quebra texto em chunks de ~600 caracteres com pequena sobreposição,
// tentando cortar em fronteiras de parágrafo/sentença quando possível.
const TARGET = 600;
const OVERLAP = 80;

export function chunkText(text: string, target = TARGET, overlap = OVERLAP): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length === 0) return [];
  if (clean.length <= target) return [clean];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + target, clean.length);

    // Tenta terminar numa quebra natural dentro da janela final.
    if (end < clean.length) {
      const window = clean.slice(start, end);
      const breakAt = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf("\n"),
        window.lastIndexOf(". "),
      );
      if (breakAt > target * 0.5) {
        end = start + breakAt + 1;
      }
    }

    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);

    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}
