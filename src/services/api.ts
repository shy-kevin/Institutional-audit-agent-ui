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
  User,
  UserRegister,
  UserLogin,
  UserListResponse,
  ReviewStatistics,
  ReviewConfirmRequest,
  ReviewRejectRequest,
  BatchUpdateIssuesRequest,
  ReviewAuditResult,
} from '../types/index';

const API_BASE_URL = 'http://localhost:8000';

export const getApiBaseUrl = () => API_BASE_URL;

// 获取存储的 Token
export const getToken = (): string | null => {
  return localStorage.getItem('access_token');
};

// 保存 Token
export const setToken = (token: string): void => {
  localStorage.setItem('access_token', token);
};

// 移除 Token
export const removeToken = (): void => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_info');
};

// 获取当前用户信息
export const getCurrentUser = (): User | null => {
  const userInfo = localStorage.getItem('user_info');
  if (userInfo) {
    try {
      return JSON.parse(userInfo);
    } catch {
      return null;
    }
  }
  return null;
};

// 保存当前用户信息
export const setCurrentUser = (user: User): void => {
  localStorage.setItem('user_info', JSON.stringify(user));
};

// 检查是否已登录
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// 检查是否是管理员
export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'admin';
};

// 获取认证头
const getAuthHeaders = (contentType: string = 'application/json') => {
  const token = getToken();
  return {
    'Content-Type': contentType,
    'Authorization': token ? `Bearer ${token}` : '',
  };
};

// 全局响应处理函数
const handleResponse = async (response: Response, skipAuthRedirect: boolean = false) => {
  if (response.status === 401 && !skipAuthRedirect) {
    removeToken();
    alert('登录已过期，请重新登录');
    window.location.href = '/#/login';
    throw new Error('Unauthorized');
  }
  return response.json();
};

export const api = {
  // 认证相关
  async login(data: UserLogin): Promise<{ access_token: string; token_type: string; user: User }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await handleResponse(response, true);
      throw new Error(error.detail || '登录失败');
    }
    return handleResponse(response, true);
  },

  async register(data: UserRegister): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await handleResponse(response, true);
      throw new Error(error.detail || '注册失败');
    }
    return handleResponse(response, true);
  },

  async getCurrentUser(): Promise<User> {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('获取用户信息失败');
    }
    return handleResponse(response);
  },

  async updateCurrentUser(data: { username?: string; phone?: string; department?: string }): Promise<User> {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await handleResponse(response);
      throw new Error(error.detail || '更新用户信息失败');
    }
    return handleResponse(response);
  },

  async changePassword(data: { old_password: string; new_password: string }): Promise<{ message: string }> {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await handleResponse(response);
      throw new Error(error.detail || '修改密码失败');
    }
    return handleResponse(response);
  },

  async getUserList(params?: { skip?: number; limit?: number; role?: string; department?: string }): Promise<UserListResponse> {
    const token = getToken();
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.role) searchParams.append('role', params.role);
    if (params?.department) searchParams.append('department', params.department);
    
    const url = `${API_BASE_URL}/api/auth/list${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      throw new Error('获取用户列表失败');
    }
    return handleResponse(response);
  },

  async resetUserPassword(userId: number, newPassword: string): Promise<{ message: string }> {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/auth/${userId}/reset-password?new_password=${encodeURIComponent(newPassword)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const error = await handleResponse(response);
      throw new Error(error.detail || '重置密码失败');
    }
    return handleResponse(response);
  },

  async updateUserStatus(userId: number, isActive: boolean): Promise<{ message: string }> {
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/auth/${userId}/status?is_active=${isActive}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      const error = await handleResponse(response);
      throw new Error(error.detail || '更新用户状态失败');
    }
    return handleResponse(response);
  },
  async getKnowledgeBases(): Promise<{ total: number; items: any[] }> {
    const response = await fetch(`${API_BASE_URL}/api/knowledge-base/list`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async uploadKnowledgeBase(file: File, name: string, description?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (description) {
      formData.append('description', description);
    }
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/knowledge-base/upload`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });
    return handleResponse(response);
  },

  async deleteKnowledgeBase(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/knowledge-base/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getKnowledgeBaseDetail(docId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/knowledge-base/detail/${docId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getConversations(): Promise<{ total: number; items: any[] }> {
    const response = await fetch(`${API_BASE_URL}/api/conversation/list`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async createConversation(title: string, description?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/conversation/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ title, description }),
    });
    return handleResponse(response);
  },

  async deleteConversation(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/conversation/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async updateConversation(id: number, data: { title?: string; description?: string }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/conversation/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getMessages(conversationId: number): Promise<{ total: number; items: any[] }> {
    const response = await fetch(`${API_BASE_URL}/api/conversation/${conversationId}/messages`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async chatSync(data: {
    conversation_id: number;
    message: string;
    knowledge_base_id?: number;
    file_paths?: string[];
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/chat/sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async *chatStream(data: {
    conversation_id: number;
    message: string;
    knowledge_base_id?: number;
    file_paths?: string[];
  }): AsyncGenerator<{ content: string; is_end: boolean }> {
    const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/knowledge-base/upload-file`, {
      method: 'POST',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: formData,
    });
    return handleResponse(response);
  },

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleResponse(response);
  },

  async convertToPdf(filePath: string): Promise<{ pdf_path: string }> {
    const response = await fetch(`${API_BASE_URL}/api/file/convert-to-pdf`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ file_path: filePath }),
    });
    return handleResponse(response);
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
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getRule(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/rule/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
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
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
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
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deleteRule(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/rule/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async toggleRule(id: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/rule/${id}/toggle`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getActiveRules(conversationId: number): Promise<{ total: number; items: any[] }> {
    const response = await fetch(`${API_BASE_URL}/api/rule/conversation/${conversationId}/active`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getAuditStatistics(): Promise<AuditStatistics> {
    const response = await fetch(`${API_BASE_URL}/api/audit/statistics`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getAuditTasks(params?: { limit?: number; status?: string }): Promise<AuditTaskListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.status) searchParams.append('status', params.status);
    
    const url = `${API_BASE_URL}/api/audit/tasks${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getAuditTask(id: number): Promise<AuditTask> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async createAuditTask(data: {
    document_path: string;
    document_name: string;
    audit_type: 'draft' | 'revision' | 'current';
    config_id?: number;
  }): Promise<AuditTask> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async batchCreateAuditTasks(data: {
    documents: Array<{ document_path: string; document_name: string }>;
    audit_type: 'draft' | 'revision' | 'current';
    auto_start?: boolean;
    config_id?: number;
    knowledge_base_ids?: number[];
  }): Promise<{
    success: boolean;
    total: number;
    auto_started: boolean;
    tasks: AuditTask[];
  }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/batch-create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async startAudit(taskId: number, data: { config_id?: number; knowledge_base_ids?: number[] }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async pauseAuditTask(taskId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/pause`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async cancelAuditTask(taskId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async *streamAuditResult(taskId: number): AsyncGenerator<{ content: string; is_end: boolean; progress?: number; status?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/stream`, {
      method: 'GET',
      headers: getAuthHeaders(),
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
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getAuditIssues(resultId: number): Promise<{ total: number; items: AuditIssue[] }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/issues`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async updateIssueStatus(issueId: number, data: {
    status: 'accepted' | 'rejected' | 'partial_accepted';
    suggestion?: string;
    reject_reason?: string;
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/audit/issue/${issueId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getDocumentContent(resultId: number): Promise<{ content: string }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/document`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async exportAuditReport(resultId: number, format: 'word' | 'pdf' | 'report'): Promise<{
    download_url: string;
    file_name: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/export`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ format }),
    });
    return handleResponse(response);
  },

  async getChecklists(): Promise<{ total: number; items: Checklist[] }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/checklists`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
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
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async createVersionCompareTask(data: {
    old_document_path: string;
    new_document_path: string;
    config_id?: number;
  }): Promise<{ id: number }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/version-compare/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getVersionCompareResult(taskId: number): Promise<VersionCompareResult> {
    const response = await fetch(`${API_BASE_URL}/api/audit/version-compare/${taskId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
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
    const response = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getAuditTrails(taskId: number): Promise<{ total: number; items: AuditTrail[] }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/trails`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async exportAuditTrail(taskId: number): Promise<{
    download_url: string;
    file_name: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/task/${taskId}/trail/export`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // 审核确认相关接口
  async startReview(resultId: number): Promise<{ success: boolean; message: string; result: ReviewAuditResult }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/start-review`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async confirmReviewResult(resultId: number, data: ReviewConfirmRequest): Promise<{ success: boolean; message: string; result: ReviewAuditResult }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/confirm`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async rejectReviewResult(resultId: number, data: ReviewRejectRequest): Promise<{ success: boolean; message: string; result: ReviewAuditResult }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getReviewStatistics(resultId: number): Promise<ReviewStatistics> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/review-statistics`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async batchUpdateIssues(resultId: number, data: BatchUpdateIssuesRequest): Promise<{ success: boolean; message: string; updated_count: number }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/issues/batch`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async acceptAllIssues(resultId: number): Promise<{ success: boolean; message: string; updated_count: number }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/result/${resultId}/issues/accept-all`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async acceptIssue(issueId: number, suggestion?: string): Promise<{ success: boolean; message: string; issue: AuditIssue }> {
    const url = suggestion 
      ? `${API_BASE_URL}/api/audit/issue/${issueId}/accept?suggestion=${encodeURIComponent(suggestion)}`
      : `${API_BASE_URL}/api/audit/issue/${issueId}/accept`;
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async rejectIssue(issueId: number, rejectReason: string): Promise<{ success: boolean; message: string; issue: AuditIssue }> {
    const response = await fetch(`${API_BASE_URL}/api/audit/issue/${issueId}/reject?reject_reason=${encodeURIComponent(rejectReason)}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // ==================== 智能编制助手模块接口 ====================

  // 1. 主页面相关接口
  async getDocumentStatistics(): Promise<{
    total: number;
    drafting_count: number;
    drafting_week_new: number;
    completed_count: number;
    completed_month_count: number;
    archived_count: number;
    pending_review_count: number;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/document/statistics`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getDocumentList(params?: {
    keyword?: string;
    status?: string;
    type?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ total: number; items: SystemDocument[] }> {
    const searchParams = new URLSearchParams();
    if (params?.keyword) searchParams.append('keyword', params.keyword);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.type) searchParams.append('type', params.type);
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());

    const url = `${API_BASE_URL}/api/document/list${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async getAvailableUsers(docId: number, keyword?: string): Promise<{ total: number; items: UserPermission[] }> {
    const searchParams = new URLSearchParams();
    if (keyword) searchParams.append('keyword', keyword);

    const url = `${API_BASE_URL}/api/document/${docId}/available-users${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async setDocumentPermissions(docId: number, userPermissions: Array<{ user_id: number; can_view: boolean; can_edit: boolean }>): Promise<{ success: boolean; message: string; affected_users: number }> {
    const response = await fetch(`${API_BASE_URL}/api/document/${docId}/permissions`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ user_permissions: userPermissions }),
    });
    return handleResponse(response);
  },

  // 2. 选择模板页面接口
  async getTemplateDetail(templateId: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/template/${templateId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async uploadCustomTemplate(file: File, name: string, category?: string, description?: string): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    if (category) formData.append('category', category);
    if (description) formData.append('description', description);

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/template/upload-custom`, {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: formData,
    });
    return handleResponse(response);
  },

  // 3. 关联上下位制度页面接口
  async searchUpperDocuments(keyword: string, documentType?: string, limit?: number): Promise<{ total: number; items: any[] }> {
    const searchParams = new URLSearchParams();
    searchParams.append('keyword', keyword);
    if (documentType) searchParams.append('document_type', documentType);
    if (limit) searchParams.append('limit', limit.toString());

    const url = `${API_BASE_URL}/api/document/search-upper?${searchParams.toString()}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async searchLowerDocuments(keyword: string, parentDocType?: string, limit?: number): Promise<{ total: number; items: any[] }> {
    const searchParams = new URLSearchParams();
    searchParams.append('keyword', keyword);
    if (parentDocType) searchParams.append('parent_doc_type', parentDocType);
    if (limit) searchParams.append('limit', limit.toString());

    const url = `${API_BASE_URL}/api/document/search-lower?${searchParams.toString()}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async saveDocumentRelations(
    docId: string,
    upperDocs: Array<{ document_id: string; document_name: string; relation_type: string; notes?: string }>,
    lowerDocs: Array<{ document_id: string; document_name: string; relation_type: string; notes?: string }>,
    workflowNotes?: string
  ): Promise<{ success: boolean; message: string; saved_relations: { upper_count: number; lower_count: number } }> {
    const response = await fetch(`${API_BASE_URL}/api/document/${docId}/relations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        upper_documents: upperDocs,
        lower_documents: lowerDocs,
        workflow_notes: workflowNotes || '',
      }),
    });
    return handleResponse(response);
  },

  // 4. 上传资料页面接口
  async uploadDraftMaterials(draftId: string, files: File[], materialType?: string): Promise<{ success: boolean; uploaded_files: Array<{ file_id: string; file_name: string; file_size: number; file_path: string }> }> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (materialType) formData.append('material_type', materialType);

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/draft/${draftId}/upload-materials`, {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: formData,
    });
    return handleResponse(response);
  },

  async deleteDraftMaterial(draftId: string, fileId: string): Promise<{ success: boolean; message: string; deleted_file_id: string }> {
    const response = await fetch(`${API_BASE_URL}/api/draft/${draftId}/material/${fileId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async saveDraftRequirements(draftId: string, requirements: string, additionalNotes?: string, specialConstraints?: string[]): Promise<{ success: boolean; message: string; saved_at: string }> {
    const response = await fetch(`${API_BASE_URL}/api/draft/${draftId}/requirements`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        requirements,
        additional_notes: additionalNotes || '',
        special_constraints: specialConstraints || [],
      }),
    });
    return handleResponse(response);
  },

  // 5. 生成大纲页面接口
  async createDraftSession(data: {
    template_id: number;
    template_name: string;
    document_type: string;
    custom_name?: string;
    creator_id: number;
  }): Promise<{ success: boolean; draft_session: { session_id: string; status: string; created_at: string } }> {
    const response = await fetch(`${API_BASE_URL}/api/draft/create-session`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async *generateOutlineStream(sessionId: string, data: {
    document_title: string;
    generation_options?: { include_examples?: boolean; detail_level?: string; style?: string };
  }): AsyncGenerator<any> {
    const response = await fetch(`${API_BASE_URL}/api/draft/${sessionId}/generate-outline`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

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
          if (parsed) yield parsed;
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async regenerateOutline(sessionId: string, data: {
    document_title: string;
    generation_options?: { include_examples?: boolean; detail_level?: string; style?: string };
  }): Promise<void> {
    // 返回AsyncGenerator供调用方使用流式响应
    return;
  },

  async getDraftOutline(sessionId: string, format?: string): Promise<any> {
    const searchParams = format ? `?format=${format}` : '';
    const response = await fetch(`${API_BASE_URL}/api/draft/${sessionId}/outline${searchParams}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async exportOutlineToWord(sessionId: string, options?: {
    include_toc?: boolean;
    include_header_footer?: boolean;
    header_text?: string;
    footer_text?: string;
  }): Promise<{ success: boolean; download_url: string; file_name: string }> {
    const response = await fetch(`${API_BASE_URL}/api/draft/${sessionId}/export-outline-word`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(options || {}),
    });
    return handleResponse(response);
  },

  // 6. 编辑完善页面接口
  async saveDraftContent(sessionId: string, content: string, lastEditedChapter?: string, autoSave?: boolean): Promise<{ success: boolean; message: string; version: number; word_count: number }> {
    const response = await fetch(`${API_BASE_URL}/api/draft/${sessionId}/save-draft`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        content,
        content_format: 'markdown',
        last_edited_chapter: lastEditedChapter || '',
        auto_save: autoSave || false,
      }),
    });
    return handleResponse(response);
  },

  async exportFinalDocument(sessionId: string, format: string = 'docx', options?: any): Promise<{ success: boolean; download_url: string; file_name: string }> {
    const response = await fetch(`${API_BASE_URL}/api/draft/${sessionId}/export-final`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ format, options: options || {} }),
    });
    return handleResponse(response);
  },

  async submitForReview(sessionId: string, data: {
    document_name: string;
    document_type: string;
    reviewers: number[];
    review_deadline?: string;
    priority?: string;
    submission_note?: string;
  }): Promise<{ success: boolean; document_id: number; status: string }> {
    const response = await fetch(`${API_BASE_URL}/api/draft/${sessionId}/submit-review`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async *aiChatStream(sessionId: string, data: {
    message: string;
    context?: { current_chapter?: string; selected_text?: string; conversation_history?: Array<{ role: string; content: string }> };
    mode?: string;
  }): AsyncGenerator<any> {
    const response = await fetch(`${API_BASE_URL}/api/draft/${sessionId}/ai-chat`, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No reader available');

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
          if (parsed) yield parsed;
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async complianceCheck(sessionId: string, checkScope: string[], referenceDocuments?: string[]): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/draft/${sessionId}/compliance-check`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        check_scope: checkScope,
        reference_documents: referenceDocuments || [],
      }),
    });
    return handleResponse(response);
  },

  async getDraftReferences(sessionId: string, referenceId?: string): Promise<any> {
    const searchParams = referenceId ? `?reference_id=${referenceId}` : '';
    const response = await fetch(`${API_BASE_URL}/api/draft/${sessionId}/references${searchParams}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  // 7. 通用文件上传接口
  async uploadDraftAttachment(sessionId: string, file: File, attachmentType?: string): Promise<{ success: boolean; attachment: { attachment_id: string; markdown_reference: string } }> {
    const formData = new FormData();
    formData.append('file', file);
    if (attachmentType) formData.append('attachment_type', attachmentType);

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/draft/${sessionId}/upload-attachment`, {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: formData,
    });
    return handleResponse(response);
  },

  // ==================== 模板管理模块接口 ====================

  async createTemplate(templateData: any): Promise<{ success: boolean; template: any }> {
    const response = await fetch(`${API_BASE_URL}/api/template/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(templateData),
    });
    return handleResponse(response);
  },

  async getTemplate(templateId: string): Promise<{ success: boolean; template: any }> {
    const response = await fetch(`${API_BASE_URL}/api/template/${templateId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async updateTemplate(templateId: string, templateData: any): Promise<{ success: boolean; template: any }> {
    const response = await fetch(`${API_BASE_URL}/api/template/${templateId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(templateData),
    });
    return handleResponse(response);
  },

  async deleteTemplate(templateId: string): Promise<{ success: boolean; message: string; deleted_template_id: string }> {
    const response = await fetch(`${API_BASE_URL}/api/template/${templateId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getTemplateList(params?: {
    keyword?: string;
    category?: string;
    creator_id?: number;
    is_public?: boolean;
    tags?: string;
    sort_by?: string;
    sort_order?: string;
    skip?: number;
    limit?: number;
  }): Promise<{ success: boolean; total: number; items: any[]; page: number; page_size: number; total_pages: number }> {
    const searchParams = new URLSearchParams();
    if (params?.keyword) searchParams.append('keyword', params.keyword);
    if (params?.category) searchParams.append('category', params.category);
    if (params?.creator_id) searchParams.append('creator_id', params.creator_id.toString());
    if (params?.is_public !== undefined) searchParams.append('is_public', params.is_public.toString());
    if (params?.tags) searchParams.append('tags', params.tags);
    if (params?.sort_by) searchParams.append('sort_by', params.sort_by);
    if (params?.sort_order) searchParams.append('sort_order', params.sort_order);
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());

    const url = `${API_BASE_URL}/api/template/list${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, { headers: getAuthHeaders() });
    return handleResponse(response);
  },

  async getTemplateCategories(): Promise<{ success: boolean; categories: any[] }> {
    const response = await fetch(`${API_BASE_URL}/api/template/categories`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async getPopularTags(limit?: number): Promise<{ success: boolean; tags: any[] }> {
    const searchParams = limit ? `?limit=${limit}` : '';
    const response = await fetch(`${API_BASE_URL}/api/template/popular-tags${searchParams}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async exportTemplateMarkdown(templateId: string, options?: {
    include_metadata?: boolean;
    include_format_section?: boolean;
    include_creator_info?: boolean;
  }): Promise<{ success: boolean; download_url: string; file_name: string; file_size: number; expires_at: string }> {
    const response = await fetch(`${API_BASE_URL}/api/template/${templateId}/export-markdown`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(options || {}),
    });
    return handleResponse(response);
  },

  async exportTemplateJson(templateId: string): Promise<{ success: boolean; download_url: string; file_name: string }> {
    const response = await fetch(`${API_BASE_URL}/api/template/${templateId}/export-json`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(response);
  },

  async importTemplateJson(file: File, overwrite?: boolean): Promise<{ success: boolean; template: any }> {
    const formData = new FormData();
    formData.append('file', file);
    if (overwrite !== undefined) formData.append('overwrite', overwrite.toString());

    const token = getToken();
    const response = await fetch(`${API_BASE_URL}/api/template/import-json`, {
      method: 'POST',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
      body: formData,
    });
    return handleResponse(response);
  },
};

function parseSSELine(line: string): { content: string; is_end: boolean; progress?: number; status?: string } | null {
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
