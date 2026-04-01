import type {
  AuditTask,
  AuditTaskListResponse,
  AuditResult,
  AuditIssue,
  AuditConfig,
  Checklist,
  AuditStatistics,
  AuditHistoryListResponse,
  VersionCompareResult,
  AuditTrail,
} from '../types/index';

const API_BASE_URL = 'http://localhost:8000';

export const getApiBaseUrl = () => API_BASE_URL;

export const api = {
  async getKnowledgeBases(): Promise<{ total: number; items: any[] }> {
    const response = await fetch(`${API_BASE_URL}/api/knowledge-base/list`);
    return response.json();
  },

  async uploadKnowledgeBase(file: File, name: string, description?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (description) {
      formData.append('description', description);
    }
    const response = await fetch(`${API_BASE_URL}/api/knowledge-base/upload`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  async deleteKnowledgeBase(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/knowledge-base/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async getKnowledgeBaseDetail(docId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/knowledge-base/detail/${docId}`);
    return response.json();
  },

  async getConversations(): Promise<{ total: number; items: any[] }> {
    const response = await fetch(`${API_BASE_URL}/api/conversation/list`);
    return response.json();
  },

  async createConversation(title: string, description?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/conversation/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description }),
    });
    return response.json();
  },

  async deleteConversation(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/conversation/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async updateConversation(id: number, data: { title?: string; description?: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/conversation/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getMessages(conversationId: number): Promise<{ total: number; items: any[] }> {
    const response = await fetch(`${API_BASE_URL}/api/conversation/${conversationId}/messages`);
    return response.json();
  },

  async chatSync(data: {
    conversation_id: number;
    message: string;
    knowledge_base_id?: number;
    file_paths?: string[];
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/chat/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async *chatStream(data: {
    conversation_id: number;
    message: string;
    knowledge_base_id?: number;
    file_paths?: string[];
  }): AsyncGenerator<{ content: string; is_end: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (buffer.trim()) {
            const parsed = parseSSELine(buffer);
            if (parsed) yield parsed;
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const parsed = parseSSELine(line);
          if (parsed) {
            yield parsed;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async uploadFile(file: File): Promise<{ file_path: string; file_name: string; file_size: number }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE_URL}/api/knowledge-base/upload-file`, {
      method: 'POST',
      body: formData,
    });
    return response.json();
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.json();
  },

  async convertToPdf(filePath: string): Promise<{ pdf_path: string }> {
    const response = await fetch(`${API_BASE_URL}/api/file/convert-to-pdf`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_path: filePath }),
    });
    return response.json();
  },

  async getRules(params?: {
    skip?: number;
    limit?: number;
    rule_type?: string;
    conversation_id?: number;
    category?: string;
    is_active?: boolean;
  }): Promise<{ total: number; items: any[] }> {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.rule_type) searchParams.append('rule_type', params.rule_type);
    if (params?.conversation_id !== undefined) searchParams.append('conversation_id', params.conversation_id.toString());
    if (params?.category) searchParams.append('category', params.category);
    if (params?.is_active !== undefined) searchParams.append('is_active', params.is_active.toString());
    
    const url = `${API_BASE_URL}/api/rule/list${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    return response.json();
  },

  async getRule(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/rule/${id}`);
    return response.json();
  },

  async createRule(data: {
    title: string;
    content: string;
    rule_type?: string;
    conversation_id?: number | null;
    category?: string;
    priority?: number;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/rule/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async updateRule(id: number, data: {
    title?: string;
    content?: string;
    rule_type?: string;
    category?: string;
    priority?: number;
    is_active?: boolean;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/rule/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async deleteRule(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/rule/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  async toggleRule(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/rule/${id}/toggle`, {
      method: 'POST',
    });
    return response.json();
  },

  async getActiveRules(conversationId: number): Promise<{ total: number; items: any[] }> {
    const response = await fetch(`${API_BASE_URL}/api/rule/conversation/${conversationId}/active`);
    return response.json();
  },

  async getAuditStatistics(): Promise<AuditStatistics> {
    const response = await fetch(`${API_BASE_URL}/api/audit/statistics`);
    return response.json();
  },

  async getAuditTasks(params?: { limit?: number; status?: string }): Promise<AuditTaskListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    
    const url = `${API_BASE_URL}/api/audit/tasks${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    return response.json();
  },

  async getAuditTask(id: number): Promise<AuditTask> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${id}`);
    return response.json();
  },

  async createAuditTask(data: {
    document_path: string;
    document_name: string;
    audit_type: 'draft' | 'revision' | 'current';
    config_id?: number;
  }): Promise<AuditTask> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async startAudit(taskId: number, data: { config_id?: number; knowledge_base_ids?: number[] }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async pauseAuditTask(taskId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/pause`, {
      method: 'POST',
    });
    return response.json();
  },

  async cancelAuditTask(taskId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/cancel`, {
      method: 'POST',
    });
    return response.json();
  },

  async *streamAuditResult(taskId: number): AsyncGenerator<{ content: string; is_end: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/stream`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          if (buffer.trim()) {
            const parsed = parseSSELine(buffer);
            if (parsed) yield parsed;
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const parsed = parseSSELine(line);
          if (parsed) {
            yield parsed;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async getAuditResult(resultId: number): Promise<AuditResult> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}`);
    return response.json();
  },

  async getAuditIssues(resultId: number): Promise<{ total: number; items: AuditIssue[] }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/issues`);
    return response.json();
  },

  async updateIssueStatus(issueId: number, data: {
    status: 'accepted' | 'rejected' | 'partial_accepted';
    suggestion?: string;
    reject_reason?: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/audit/issue/${issueId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getDocumentContent(resultId: number): Promise<{ content: string }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/document`);
    return response.json();
  },

  async exportAuditReport(resultId: number, format: 'word' | 'pdf' | 'report'): Promise<{
    download_url: string;
    file_name: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format }),
    });
    return response.json();
  },

  async getChecklists(): Promise<{ total: number; items: Checklist[] }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/checklists`);
    return response.json();
  },

  async createAuditConfig(data: {
    name: string;
    audit_dimensions: ('compliance' | 'consistency' | 'format' | 'version_compare')[];
    focus_keywords?: string[];
    checklist_ids: number[];
    is_default: boolean;
    knowledge_base_ids?: number[];
  }): Promise<AuditConfig> {
    const response = await fetch(`${API_BASE_URL}/api/audit/config/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async createVersionCompareTask(data: {
    old_document_path: string;
    new_document_path: string;
    config_id?: number;
  }): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/version-compare/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getVersionCompareResult(taskId: number): Promise<VersionCompareResult> {
    const response = await fetch(`${API_BASE_URL}/api/audit/version-compare/${taskId}`);
    return response.json();
  },

  async getAuditHistory(params: {
    date_range?: string;
    audit_type?: string;
    risk_level?: string;
    keyword?: string;
  }): Promise<AuditHistoryListResponse> {
    const searchParams = new URLSearchParams();
    if (params.date_range) searchParams.append('date_range', params.date_range);
    if (params.audit_type) searchParams.append('audit_type', params.audit_type);
    if (params.risk_level) searchParams.append('risk_level', params.risk_level);
    if (params.keyword) searchParams.append('keyword', params.keyword);
    
    const url = `${API_BASE_URL}/api/audit/history${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url);
    return response.json();
  },

  async getAuditTrails(taskId: number): Promise<{ total: number; items: AuditTrail[] }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/trails`);
    return response.json();
  },

  async exportAuditTrail(taskId: number): Promise<{
    download_url: string;
    file_name: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/trail/export`, {
      method: 'POST',
    });
    return response.json();
  },
};

function parseSSELine(line: string): { content: string; is_end: boolean } | null {
  const trimmedLine = line.trim();
  if (!trimmedLine) return null;
  
  if (trimmedLine.startsWith('data: ')) {
    try {
      const jsonStr = trimmedLine.slice(6);
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse SSE data:', trimmedLine, e);
      return null;
    }
  }
  
  try {
    return JSON.parse(trimmedLine);
  } catch {
    return null;
  }
}
