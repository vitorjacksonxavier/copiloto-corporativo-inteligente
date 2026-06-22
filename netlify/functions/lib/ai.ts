// Cliente do Netlify AI Gateway (API compatível com OpenAI).
// As credenciais (OPENAI_BASE_URL / OPENAI_API_KEY) são injetadas pela Netlify
// em runtime — não há chave externa nem configuração manual.

export const MODEL = "gpt-4o-mini";

type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };
type Content = string | (TextPart | ImagePart)[];
interface Message {
  role: "system" | "user" | "assistant";
  content: Content;
}

function gateway(): { base: string; key: string } {
  const base = process.env.OPENAI_BASE_URL;
  const key = process.env.OPENAI_API_KEY;
  if (!base || !key) {
    throw new Error("Netlify AI Gateway indisponível (OPENAI_BASE_URL/OPENAI_API_KEY ausentes).");
  }
  return { base, key };
}

async function chat(messages: Message[]): Promise<string> {
  const { base, key } = gateway();
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.2 }),
  });
  if (!res.ok) throw new Error(`Netlify AI (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/** Gera a resposta a partir de uma instrução de sistema e do prompt do usuário. */
export async function generateAnswer(system: string, user: string): Promise<string> {
  return chat([
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
}

/**
 * Transcreve/descreve uma imagem usando o modelo multimodal (gpt-4o-mini) —
 * sem stack de OCR. A imagem vai como data URL.
 */
export async function describeImage(base64: string, mimeType: string): Promise<string> {
  return chat([
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            "Transcreva todo o texto visível nesta imagem. Se houver tabelas, " +
            "represente-as em texto. Em seguida, descreva objetivamente o conteúdo " +
            "relevante (gráficos, diagramas, fotos) para fins de busca. Responda em português.",
        },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
      ],
    },
  ]);
}
