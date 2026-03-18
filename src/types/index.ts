export type KnowledgeBase = {
  id: number;
  name: string;
  description: string;
  file_name: string;
  file_size: number;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

export type Conversation = {
  id: number;
  title: string;
  description: string;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
}

export type Message = {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  file_paths: string | null;
  knowledge_base_id: number | null;
  created_at: string;
}

export type ChatRequest = {
  conversation_id: number;
  message: string;
  knowledge_base_id?: number;
  file_paths?: string[];
}

export type StreamResponse = {
  content: string;
  is_end: boolean;
}

export type KnowledgeBaseListResponse = {
  total: number;
  items: KnowledgeBase[];
}

export type ConversationListResponse = {
  total: number;
  items: Conversation[];
}

export type MessageListResponse = {
  total: number;
  items: Message[];
}
