# Copiloto Corporativo Inteligente

Assistente que responde perguntas em linguagem natural sobre documentos internos
(PDF, Word, planilhas, CSV, texto e imagens), com **memória persistente**: os
documentos enviados ficam armazenados e continuam disponíveis entre sessões.

A IA (RAG — *Retrieval-Augmented Generation*) é a funcionalidade principal: o
sistema busca os trechos mais relevantes da base e gera a resposta com base neles,
citando o documento de origem.

> Base **única e compartilhada** — sem login e sem controle por usuário. Todos os
> documentos enviados formam um único acervo consultável.

---

## 1. Arquitetura (100% Netlify)

```
Navegador (React)
      │  upload / pergunta
      ▼
Netlify Functions (serverless)
   ├── armazena arquivo bruto ──► Netlify Blobs
   ├── extrai texto ──► (por tipo de arquivo)
   ├── gera embeddings ──► Gemini (embedding)
   ├── grava chunks + vetor ──► Netlify DB (Neon Postgres + pgvector)
   └── responde pergunta ──► busca vetorial ► Gemini (geração)
```

Nada roda em servidor próprio: a Netlify gerencia hospedagem, funções, banco e
storage. O Claude Code escreve o código; o **Netlify MCP** cria o site, provisiona
o banco, define os secrets e publica.

---

## 2. Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Netlify Functions (Node.js) |
| Banco de dados | Netlify DB (Postgres serverless via Neon) |
| Busca vetorial | extensão `pgvector` |
| Armazenamento de arquivos | Netlify Blobs |
| Hospedagem / deploy | Netlify |

## 3. Ferramentas de IA

| Uso | Ferramenta |
|---|---|
| Desenvolvimento (escreve o código) | **Claude Code** (CLI) |
| Orquestração de deploy/infra | **Netlify MCP** |
| LLM de runtime — geração | **Gemini 2.5 Flash-Lite** (free tier) |
| LLM de runtime — embeddings | **Gemini embedding** (ex.: `text-embedding-004`, 768 dim) |

> **Dois LLMs distintos:** o Claude Code é a *fábrica* (custo: sua assinatura). O
> Gemini é o modelo que o app publicado chama para responder (custo: free tier =
> R$ 0). Eles nunca se misturam.

---

## 4. Fluxo funcional

**Ingestão (upload):**
1. Usuário envia um arquivo.
2. O arquivo bruto é salvo no Netlify Blobs.
3. O texto é extraído conforme o tipo (ver §7).
4. O texto é quebrado em *chunks* (~600 caracteres, com pequena sobreposição).
5. Cada chunk é convertido em embedding (Gemini) e gravado no Postgres.

**Consulta (pergunta):**
1. A pergunta vira embedding (Gemini).
2. Busca por similaridade no `pgvector` retorna os *top-k* chunks.
3. Os chunks + a pergunta são enviados ao Gemini Flash-Lite.
4. A resposta volta citando os documentos de origem.

---

## 5. Schema do banco

```sql
-- habilitar a extensão (uma vez)
create extension if not exists vector;

-- metadados dos documentos
create table documents (
  id           bigint generated always as identity primary key,
  filename     text not null,
  mime_type    text not null,
  blob_key     text not null,          -- chave no Netlify Blobs
  uploaded_at  timestamptz default now()
);

-- trechos + embeddings
create table chunks (
  id           bigint generated always as identity primary key,
  document_id  bigint references documents(id) on delete cascade,
  content      text not null,
  embedding    vector(768)             -- ajustar à dimensão do modelo usado
);

-- índice de similaridade (cosseno)
create index on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);
```

Função SQL de busca (chamada pela function de consulta):

```sql
create or replace function match_chunks(query_embedding vector(768), match_count int)
returns table (content text, filename text, distance float)
language sql stable as $$
  select c.content, d.filename, c.embedding <=> query_embedding as distance
  from chunks c
  join documents d on d.id = c.document_id
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
```

---

## 6. Funções serverless (Netlify Functions)

| Função | Responsabilidade |
|---|---|
| `upload` | recebe o arquivo, grava no Blobs, cria registro em `documents` |
| `ingest` | extrai texto, faz chunk, gera embeddings, grava em `chunks` |
| `query` | embeda a pergunta, busca no pgvector, chama o Gemini, devolve resposta + fontes |
| `documents` | lista os documentos do acervo (para exibir na interface) |

> `upload` e `ingest` podem ser unificados em uma única chamada para documentos pequenos.

---

## 7. Tratamento por tipo de arquivo

| Tipo | Extração |
|---|---|
| `.pdf` | `pdf-parse` (ou `unpdf`) |
| `.docx` | `mammoth` |
| `.xlsx` / `.xls` | `xlsx` (SheetJS) → converter para texto/markdown |
| `.csv` | `papaparse` (ou leitura direta) |
| `.txt` / `.md` | leitura direta |
| imagens (`.png`, `.jpg`) | **enviar a imagem direto ao Gemini (multimodal)** e usar o texto/descrição retornado — sem stack de OCR |

---

## 8. Variáveis de ambiente (secrets)

| Variável | Origem |
|---|---|
| `GEMINI_API_KEY` | criar em Google AI Studio (free tier, sem cartão) |
| `NETLIFY_DATABASE_URL` | injetada automaticamente ao provisionar o Netlify DB |

Definidas via Netlify MCP (`manage-env-vars`) ou `netlify env:set`. **Nunca**
expor a chave no frontend — toda chamada ao Gemini acontece dentro das Functions.

---

## 9. Como construir com o Claude Code

**Pré-requisitos:** Node.js 22+, Netlify CLI (`npm i -g netlify-cli`) e uma conta Netlify.

**1. Conectar o Netlify MCP ao Claude Code** (`~/.claude/settings.json` ou via `claude mcp add`):

```json
{
  "mcpServers": {
    "netlify": {
      "command": "npx",
      "args": ["-y", "@netlify/mcp"]
    }
  }
}
```

**2. Prompts sugeridos, em sequência** (2–3 pedidos por vez):

1. *"Crie a estrutura de um app React + Vite + Tailwind com uma tela de chat e uma área de upload de arquivos. Sem autenticação. Ainda sem backend."*
2. *"Via Netlify MCP: crie o site na Netlify, provisione o Netlify DB e habilite a extensão pgvector. Crie as tabelas `documents` e `chunks` e a função SQL `match_chunks` conforme o schema do README."*
3. *"Crie as Netlify Functions `upload` e `ingest`: salvar no Netlify Blobs, extrair texto por tipo (pdf/docx/xlsx/csv/txt; imagens via Gemini multimodal), chunk de ~600 chars, embeddings com Gemini e gravação em `chunks`."*
4. *"Crie a Netlify Function `query`: embeddar a pergunta, chamar `match_chunks` (top-k = 5), montar o prompt com os trechos e chamar `gemini-2.5-flash-lite`. Retornar a resposta e a lista de documentos-fonte."*
5. *"Via Netlify MCP: defina o secret `GEMINI_API_KEY` e faça o deploy de produção."*

---

## 10. Como rodar / acessar

```bash
# local
netlify dev

# deploy de produção (ou peça ao Claude Code via MCP)
netlify deploy --prod
```

Ao final, a Netlify devolve a URL pública (`https://<seu-site>.netlify.app`) —
esse é o **link da aplicação publicada** exigido na entrega.

---

## 11. Limitações conhecidas

- **Timeout de 10s** nas Netlify Functions no plano free: mantenha documentos
  modestos ou processe os embeddings em lote; documentos muito grandes podem
  estourar o limite na ingestão.
- **Free tier compartilhado** (créditos da Netlify): suficiente para uma demo de
  baixo tráfego; deploys e banda saem do mesmo pote.
- **Privacidade do free tier do Gemini:** os prompts podem ser usados para treino —
  por isso a base é de conteúdo não sensível.
- **Sem autenticação:** acervo único e público para quem tiver o link.

## 12. Custos

| Item | Custo |
|---|---|
| Hospedagem + Functions + DB + Blobs (Netlify free) | R$ 0 |
| LLM de runtime (Gemini free tier) | R$ 0 |
| Desenvolvimento (Claude Code) | assinatura que você já possui |

---

## 13. Governança e uso responsável

Base restrita a conteúdo institucional não sensível; chave de API protegida no
servidor (nunca no cliente); respostas ancoradas nos documentos recuperados, com
citação da fonte, reduzindo alucinação. Para um cenário real de dados sensíveis, a
recomendação seria *self-hosting* / banco sob controle próprio e um modelo com
garantia de não-treinamento — exatamente o trade-off de soberania de dados que
justifica não usar free tiers públicos em produção.