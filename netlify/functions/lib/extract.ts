// Extração de texto por tipo de arquivo. Os parsers são importados de forma
// dinâmica (lazy) para que, p.ex., um .txt não carregue bibliotecas de PDF/Excel
// — isso reduz cold start e evita efeitos colaterais de import.

export function isImage(mimeType: string, filename: string): boolean {
  if (mimeType.startsWith("image/")) return true;
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(filename);
}

function ext(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

/**
 * Extrai texto de arquivos não-imagem. Para imagens use gemini.describeImage,
 * pois a extração é multimodal (ver §7 da especificação).
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<string> {
  const e = ext(filename);

  // PDF — unpdf é feito para serverless (sem dependências de DOM)
  if (e === "pdf" || mimeType === "application/pdf") {
    const { extractText: pdfExtract, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { text } = await pdfExtract(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  }

  // Word
  if (e === "docx" || e === "doc" || mimeType.includes("wordprocessingml")) {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer });
    return value ?? "";
  }

  // Excel → texto por planilha
  if (
    e === "xlsx" ||
    e === "xls" ||
    mimeType.includes("spreadsheetml") ||
    mimeType.includes("ms-excel")
  ) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(buffer, { type: "buffer" });
    const parts: string[] = [];
    for (const name of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name]);
      if (csv.trim()) parts.push(`## Planilha: ${name}\n${csv}`);
    }
    return parts.join("\n\n");
  }

  // CSV
  if (e === "csv" || mimeType === "text/csv") {
    const Papa = (await import("papaparse")).default;
    const text = buffer.toString("utf-8");
    const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
    return (parsed.data as string[][]).map((row) => row.join(" | ")).join("\n");
  }

  // Texto / Markdown / fallback
  return buffer.toString("utf-8");
}
