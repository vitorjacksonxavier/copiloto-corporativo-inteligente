import { useEffect, useRef, useState } from "react";
import { askQuestion } from "../api";
import type { ChatMessage } from "../types";
import MessageBubble from "./MessageBubble";

const SUGGESTIONS = [
  "Qual é a política de férias?",
  "Como funciona o processo de onboarding?",
  "Quais benefícios a empresa oferece?",
];

export default function ChatPanel({ docCount }: { docCount: number }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || busy) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: q };
    const pendingMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((m) => [...m, userMsg, pendingMsg]);
    setInput("");
    setBusy(true);

    try {
      const res = await askQuestion(q);
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingMsg.id
            ? { ...msg, content: res.answer, sources: res.sources, pending: false }
            : msg,
        ),
      );
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === pendingMsg.id
            ? {
                ...msg,
                content: `⚠️ ${e instanceof Error ? e.message : "Erro ao consultar."}`,
                pending: false,
              }
            : msg,
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Histórico */}
      <div ref={scrollRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-3 text-4xl">💬</div>
            <h3 className="text-lg font-semibold text-slate-700">
              Pergunte sobre seus documentos
            </h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              Faça perguntas em linguagem natural. As respostas são geradas a partir do
              acervo enviado, com citação das fontes.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-brand-500 hover:text-brand-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
      </div>

      {/* Caixa de entrada */}
      <div className="border-t border-slate-100 bg-white/60 p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={
              docCount === 0
                ? "Envie um documento e faça sua pergunta…"
                : "Digite sua pergunta… (Enter envia, Shift+Enter quebra linha)"
            }
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={busy || input.trim() === ""}
            className="grid h-11 w-11 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Enviar"
          >
            {busy ? "⏳" : "➤"}
          </button>
        </form>
      </div>
    </div>
  );
}
