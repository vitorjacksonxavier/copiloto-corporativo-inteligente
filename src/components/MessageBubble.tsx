import type { ChatMessage } from "../types";

// Renderização leve de markdown: **negrito**, *itálico* e quebras de linha.
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderContent(content: string): React.ReactNode {
  return content.split("\n").map((line, i) => (
    <p key={i} className={line.trim() === "" ? "h-2" : ""}>
      {renderInline(line)}
    </p>
  ));
}

export default function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-brand-600 text-white rounded-br-sm"
            : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-100 rounded-bl-sm",
        ].join(" ")}
      >
        {message.pending ? (
          <span className="flex items-center gap-1 text-slate-400">
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.2s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.1s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
          </span>
        ) : (
          <div className="space-y-0.5">{renderContent(message.content)}</div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            <p className="mb-1 text-xs font-semibold text-slate-400">Fontes</p>
            <ul className="flex flex-wrap gap-1.5">
              {message.sources.map((s, i) => (
                <li
                  key={i}
                  title={s.snippet}
                  className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700"
                >
                  📎 {s.filename}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
