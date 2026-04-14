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

export type KnowledgeBaseChunk = {
  chunk_id: number;
  text: string;
  chunk_type: string;
}

export type KnowledgeBaseMetadata = {
  page_count: number;
  word_count: number;
}

export type KnowledgeBaseStructuredInfo = {
  chunks: KnowledgeBaseChunk[];
  metadata: KnowledgeBaseMetadata;
}

export type KnowledgeBaseDetail = {
  id: string;
  filename: string;
  status: string;
  structured_info: KnowledgeBaseStructuredInfo;
  parsed_data: {
    pages: any[];
  };
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

export type Rule = {
  id: number;
  title: string;
  content: string;
  rule_type: 'global' | 'conversation';
  conversation_id: number | null;
  category: string;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type RuleListResponse = {
  total: number;
  items: Rule[];
}

export type RuleCreateRequest = {
  title: string;
  content: string;
  rule_type?: 'global' | 'conversation';
  conversation_id?: number | null;
  category?: string;
  priority?: number;
}

export type RuleUpdateRequest = {
  title?: string;
  content?: string;
  rule_type?: 'global' | 'conversation';
  category?: string;
  priority?: number;
  is_active?: boolean;
}

export type AuditTask = {
  id: number;
  document_name: string;
  document_path: string;
  status: 'pending' | 'parsing' | 'analyzing' | 'completed' | 'failed';
  audit_type: 'draft' | 'revision' | 'current';
  progress: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export type AuditTaskListResponse = {
  total: number;
  items: AuditTask[];
}

export type AuditResult = {
  id: number;
  task_id: number;
  document_name: string;
  risk_level: 'high' | 'medium' | 'low';
  total_issues: number;
  compliance_issues: number;
  consistency_issues: number;
  format_issues: number;
  status: 'pending_review' | 'reviewing' | 'completed';
  created_at: string;
  updated_at: string;
}

export type AuditIssue = {
  id: number;
  result_id: number;
  issue_type: 'compliance' | 'consistency' | 'format';
  severity: 'high' | 'medium' | 'low';
  location: string;
  original_text: string;
  issue_description: string;
  legal_basis?: string;
  suggestion: string;
  status: 'pending' | 'accepted' | 'rejected' | 'partial_accepted';
  created_at: string;
}

export type AuditConfig = {
  id: number;
  name: string;
  audit_dimensions: ('compliance' | 'consistency' | 'format' | 'version_compare')[];
  focus_keywords?: string[];
  checklist_ids: number[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export type Checklist = {
  id: number;
  name: string;
  category: 'general' | 'special' | 'scenario';
  items: ChecklistItem[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type ChecklistItem = {
  id: number;
  content: string;
  category: string;
  is_required: boolean;
}

export type AuditStatistics = {
  today_count: number;
  batch_count: number;
  risk_count: number;
  completed_count: number;
  compliance_ratio: number;
  consistency_ratio: number;
  format_ratio: number;
}

export type AuditHistory = {
  id: number;
  task_id: number;
  document_name: string;
  audit_type?: 'draft' | 'revision' | 'current';
  audit_time?: string;
  risk_level: 'high' | 'medium' | 'low' | null;
  total_issues: number;
  compliance_issues: number;
  consistency_issues: number;
  format_issues: number;
  issue_count?: number;
  status: 'pending_review' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
  auditor?: string;
}

export type AuditHistoryListResponse = {
  total: number;
  items: AuditHistory[];
}

export type DocumentUpload = {
  file: File;
  name: string;
  size: number;
  type: string;
}

export type VersionCompareRequest = {
  old_document_path: string;
  new_document_path: string;
  config_id?: number;
}

export type VersionCompareResult = {
  id: number;
  old_document_name: string;
  new_document_name: string;
  additions: string[];
  deletions: string[];
  modifications: string[];
  consistency_issues: AuditIssue[];
  created_at: string;
}

export type AuditReport = {
  id: number;
  task_id: number;
  document_name: string;
  audit_time: string;
  risk_level: 'high' | 'medium' | 'low';
  total_issues: number;
  compliance_issues: AuditIssue[];
  consistency_issues: AuditIssue[];
  format_issues: AuditIssue[];
  summary: string;
  recommendations: string[];
}

export type AuditTrail = {
  id: number;
  task_id: number;
  action: string;
  actor?: string;
  timestamp: string;
  details?: string;
}

// 用户相关类型
export type User = {
  id: number;
  username: string;
  account: string;
  phone?: string | null;
  department?: string | null;
  role: 'admin' | 'user';
  is_active: boolean;
  last_login?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export type UserRegister = {
  username: string;
  account: string;
  password: string;
  phone?: string;
  department?: string;
}

export type UserLogin = {
  account: string;
  password: string;
}

export type UserListResponse = {
  total: number;
  items: User[];
}

// 审核确认相关类型
export type ResultStatus = 'pending_review' | 'reviewing' | 'completed';

export type IssueStatus = 'pending' | 'accepted' | 'rejected' | 'partial_accepted';

export type ReviewStatistics = {
  total_issues: number;
  pending_issues: number;
  accepted_issues: number;
  rejected_issues: number;
  partial_accepted_issues: number;
  review_progress: number;
  all_reviewed: boolean;
}

export type ReviewConfirmRequest = {
  comment?: string;
}

export type ReviewRejectRequest = {
  reason: string;
}

export type BatchUpdateIssuesRequest = {
  issue_ids: number[];
  status: IssueStatus;
}

export type ReviewAuditResult = {
  id: number;
  task_id: number;
  document_name: string;
  risk_level: string;
  total_issues: number;
  compliance_issues: number;
  consistency_issues: number;
  format_issues: number;
  status: ResultStatus;
  created_at: string;
  updated_at: string;
}

// 智能编制助手相关类型
export type SystemDocumentStatus = 'drafting' | 'pending_review' | 'published' | 'needs_revision';

export type SystemDocumentType = '人事管理' | '业务流程' | '财务管理' | '安全管理' | '其他';

export type SystemDocument = {
  id: number;
  name: string;
  type: SystemDocumentType;
  status: SystemDocumentStatus;
  author: string;
  updated_at: string;
  created_at?: string;
}

export type DocumentStatistics = {
  total: number;
  drafting_count: number;
  drafting_week_new: number;
  completed_count: number;
  completed_month_count: number;
  archived_count: number;
  pending_review_count: number;
}

export type UserPermission = {
  id: number;
  username: string;
  department: string;
  can_view: boolean;
  can_edit: boolean;
}
