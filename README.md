# 🤖 Copiloto Corporativo Inteligente

Assistente corporativo que responde **perguntas em linguagem natural** sobre documentos
internos (PDF, Word, planilhas, CSV, texto e imagens), usando **RAG** (*Retrieval-Augmented
Generation*): o sistema recupera os trechos mais relevantes do acervo e gera a resposta
com base neles, **citando o documento de origem**.

🔗 **Aplicação publicada:** https://copiloto-corporativo-inteligente.netlify.app

> Base **única e compartilhada** — sem login. Todos os documentos enviados formam um
> único acervo consultável, com **memória persistente** entre sessões (ficam no storage).

---

## 📑 Descrição da aplicação

O colaborador envia documentos pela interface; o sistema extrai o texto e o divide em
trechos (*chunks*), guardados no storage. Ao fazer uma pergunta, a aplicação recupera os
trechos mais relevantes do acervo (busca **BM25**) e os envia, junto com a pergunta, ao
modelo de linguagem, que produz uma resposta **ancorada nas fontes**.

**Funcionalidades:**
- Upload de múltiplos formatos (PDF, DOCX, XLSX/XLS, CSV, TXT/MD, imagens).
- Chat com perguntas em linguagem natural e **citação das fontes**.
- Lista do acervo com contagem de trechos por documento.
- Imagens processadas por **IA multimodal** (sem stack de OCR).

---

## 🏗️ Arquitetura (100% Netlify)

```
Navegador (React)
      │  upload / pergunta
      ▼
Netlify Functions (serverless)
   ├── armazena arquivo bruto ──► Netlify Blobs
   ├── extrai texto ──► (por tipo de arquivo)
   ├── grava trechos ──► Netlify Blobs (acervo)
   └── responde pergunta ──► busca BM25 (em JS) ► LLM via Netlify AI Gateway (geração)
```

Nada roda em servidor próprio nem depende de chave de IA externa: a Netlify gerencia
hospedagem, funções, storage **e a própria IA** (AI Gateway).

> **Nota de arquitetura — decisões tomadas durante o desenvolvimento.**
> O projeto foi concebido (ver [`specs.md`](specs.md)) para usar Netlify DB (Neon Postgres
> + `pgvector`) e o Gemini. Durante a construção surgiram dois fatos:
> 1. A **extensão Netlify DB foi descontinuada** ("New database creation is no longer
>    available"), inviabilizando o provisionamento automático do Postgres.
> 2. A Netlify disponibiliza um **AI Gateway** próprio (credenciais gerenciadas, injetadas
>    em runtime) — eliminando a necessidade de uma chave de IA externa.
>
> A solução foi adaptada para ser **100% Netlify e sem chave externa**: o acervo vive no
> **Netlify Blobs**, a recuperação usa **BM25** (léxica, em JavaScript) e a geração usa o
> **Netlify AI Gateway** (modelo `gpt-4o-mini`). Resultado: sem banco externo, sem cadastro
> em terceiros e sem custo de API — adequado ao volume de uma demonstração.

---

## 🧰 Tecnologias utilizadas

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 6 + Tailwind CSS v4 + TypeScript |
| Backend | Netlify Functions (Node.js 22, TypeScript) |
| Armazenamento (arquivos + acervo) | Netlify Blobs |
| Recuperação (busca) | **BM25** léxico em JavaScript |
| Geração (LLM) | **Netlify AI Gateway** — `gpt-4o-mini` (compatível com OpenAI) |
| Extração de texto | `unpdf`, `mammoth`, `xlsx` (SheetJS), `papaparse` |
| Hospedagem / deploy | Netlify |

### Funções serverless

| Função | Responsabilidade |
|---|---|
| `upload` | recebe o arquivo, grava no Blobs, extrai texto (imagens via IA multimodal), faz chunk e guarda os trechos (ingestão unificada) |
| `query` | recupera os trechos por BM25 (top-k=5), chama o LLM via Netlify AI Gateway e devolve resposta + fontes |
| `documents` | lista os documentos do acervo |
| `delete-document` | remove um documento do acervo (índice, trechos e arquivo bruto) |

---

## 🧠 Ferramentas de IA utilizadas

**Dois papéis distintos de IA:**

1. **IA no desenvolvimento (a "fábrica"):**
   - **Claude Code** (CLI, modelo Claude Opus) — escreveu praticamente todo o código:
     scaffold do frontend, componentes React, Netlify Functions, busca BM25 e integração
     com a IA. Também **diagnosticou e contornou** os imprevistos de plataforma (extensão
     de banco descontinuada, AI Gateway interceptando chaves) — registro real de
     *engenharia assistida por IA*.
   - **Netlify MCP (Model Context Protocol)** — usado pelo Claude Code para **orquestrar a
     infraestrutura** sem sair do editor: criar o site, gerenciar variáveis e publicar os
     deploys de produção. É o uso de **agente + automação** sobre infraestrutura real.

2. **IA como funcionalidade principal da aplicação (runtime):**
   - **Netlify AI Gateway** com **`gpt-4o-mini`** — geração das respostas a partir dos
     trechos recuperados, e **transcrição/descrição multimodal** de imagens enviadas.

### Como a IA auxiliou no desenvolvimento
- Geração de código a partir de uma especificação em linguagem natural ([`specs.md`](specs.md)).
- **Agentes / automação:** o Netlify MCP atua como agente de infraestrutura, executando
  ações reais (site, env vars, deploy) a partir de instruções do desenvolvedor.
- **Gerenciamento de contexto:** RAG ancora as respostas nos documentos, reduzindo alucinação.

---

## ▶️ Como executar / acessar

### Acesso direto (produção)
Abra: **https://copiloto-corporativo-inteligente.netlify.app**

### Rodar localmente
**Pré-requisitos:** Node.js 22+ e uma conta Netlify.

```bash
# 1. Instalar dependências
npm install

# 2. Frontend isolado (modo demo, sem backend — usa dados simulados)
npm run dev

# 3. App completo (frontend + functions + storage + AI Gateway), via Netlify CLI
npm i -g netlify-cli
netlify link            # vincular ao site existente
netlify dev             # http://localhost:8888
```

### Variáveis de ambiente
| Variável | Origem |
|---|---|
| `VITE_USE_MOCK` | `false` em produção (usa as Functions reais) — definido no `netlify.toml` |
| `OPENAI_BASE_URL` / `OPENAI_API_KEY` | **injetadas automaticamente** pelo Netlify AI Gateway em runtime |

> Não há banco externo, connection string nem chave de IA própria: storage (Netlify Blobs)
> e IA (AI Gateway) são providos e credenciados pela própria Netlify.

---

## ⚖️ Governança e uso responsável

- Base restrita a **conteúdo institucional não sensível**.
- **Nenhuma credencial de IA exposta no frontend** — a geração ocorre nas Functions, com
  credenciais gerenciadas pela Netlify (AI Gateway).
- Respostas **ancoradas nos documentos recuperados**, com citação da fonte, reduzindo
  alucinação. Quando não há trecho relevante, o assistente declara que não encontrou.
- **Limitações conhecidas:**
  - Recuperação **léxica (BM25)**: encontra trechos por correspondência de termos; não
    captura sinônimos como uma busca semântica (embeddings) faria. Suficiente para o volume
    da demonstração.
  - **Timeout de 10s** nas Functions (free tier) limita o tamanho dos documentos.
  - **Sem autenticação** (acervo público para quem tiver o link). A remoção de documentos
    pela interface está disponível (botão de excluir, com confirmação).
  - O uso do **AI Gateway** consome a franquia de IA da conta Netlify.
- Para um cenário real com dados sensíveis, recomenda-se *self-hosting* / banco vetorial sob
  controle próprio e um modelo com garantia de não-treinamento.

---

## 📂 Estrutura do projeto

```
.
├── src/                      # Frontend React
│   ├── components/           # UploadPanel, ChatPanel, DocumentList, MessageBubble
│   ├── api.ts                # cliente das Functions (com fallback mock)
│   ├── types.ts
│   └── App.tsx
├── netlify/functions/        # Backend serverless (TypeScript)
│   ├── lib/                  # store (Blobs), search (BM25), ai (AI Gateway), extract, chunk, http
│   ├── upload.ts
│   ├── query.ts
│   ├── documents.ts
│   └── delete-document.ts
├── netlify.toml              # build, functions e variáveis
└── specs.md                  # especificação original (design inicial)
```
