export interface DocumentMeta {
  id: number;
  filename: string;
  mime_type: string;
  uploaded_at: string;
  chunk_count?: number;
}

export interface Source {
  filename: string;
  snippet?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  pending?: boolean;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
}

export interface UploadResult {
  document: DocumentMeta;
  chunks: number;
}
