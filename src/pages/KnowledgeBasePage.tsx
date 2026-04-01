import { useState, useEffect, useRef } from 'react';
import type { KnowledgeBase } from '../types/index';
import { api } from '../services/api';

interface KnowledgeBasePageProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function KnowledgeBasePage({ onNavigate }: KnowledgeBasePageProps) {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    file: null as File | null,
  });
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadKnowledgeBases();
  }, []);

  const loadKnowledgeBases = async () => {
    try {
      setLoading(true);
      const data = await api.getKnowledgeBases();
      setKnowledgeBases(data.items || []);
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.file) {
      alert('请填写名称并选择文件');
      return;
    }

    try {
      await api.uploadKnowledgeBase(formData.file, formData.name, formData.description);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', file: null });
      loadKnowledgeBases();
    } catch (error) {
      console.error('Failed to create knowledge base:', error);
      alert('创建知识库失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此知识库吗？')) return;

    try {
      await api.deleteKnowledgeBase(id);
      loadKnowledgeBases();
    } catch (error) {
      console.error('Failed to delete knowledge base:', error);
      alert('删除失败');
    }
  };

  const handleViewDetail = (kb: KnowledgeBase) => {
    onNavigate('knowledge-base-detail', { docId: String(kb.id) });
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      processing: '处理中',
      completed: '已完成',
      failed: '失败',
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classMap: Record<string, string> = {
      processing: 'kb-status-processing',
      completed: 'kb-status-completed',
      failed: 'kb-status-failed',
    };
    return classMap[status] || '';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredKnowledgeBases = knowledgeBases.filter((kb) => {
    const matchKeyword = kb.name.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = statusFilter === 'all' || kb.status === statusFilter;
    return matchKeyword && matchStatus;
  });

  const stats = {
    total: knowledgeBases.length,
    completed: knowledgeBases.filter(kb => kb.status === 'completed').length,
    processing: knowledgeBases.filter(kb => kb.status === 'processing').length,
    totalSize: knowledgeBases.reduce((sum, kb) => sum + (kb.file_size || 0), 0),
  };

  if (loading) {
    return (
      <div className="knowledge-base-page loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="knowledge-base-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('dashboard')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>知识库管理</h1>
          <p>管理和维护制度审查相关的知识库，支持文档上传和智能解析</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span>创建知识库</span>
          </button>
        </div>
      </div>

      <div className="kb-stats-row">
        <div className="kb-stat-card kb-stat-total">
          <div className="kb-stat-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
            </svg>
          </div>
          <div className="kb-stat-info">
            <div className="kb-stat-value">{stats.total}</div>
            <div className="kb-stat-label">知识库总数</div>
          </div>
        </div>
        <div className="kb-stat-card kb-stat-completed">
          <div className="kb-stat-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
          <div className="kb-stat-info">
            <div className="kb-stat-value">{stats.completed}</div>
            <div className="kb-stat-label">已完成</div>
          </div>
        </div>
        <div className="kb-stat-card kb-stat-processing">
          <div className="kb-stat-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
          </div>
          <div className="kb-stat-info">
            <div className="kb-stat-value">{stats.processing}</div>
            <div className="kb-stat-label">处理中</div>
          </div>
        </div>
        <div className="kb-stat-card kb-stat-size">
          <div className="kb-stat-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
          </div>
          <div className="kb-stat-info">
            <div className="kb-stat-value">{formatFileSize(stats.totalSize)}</div>
            <div className="kb-stat-label">总文件大小</div>
          </div>
        </div>
      </div>

      <div className="kb-filter-section">
        <div className="kb-filter-row">
          <div className="kb-filter-group kb-search-group">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="kb-search-icon">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索知识库名称..."
              className="kb-search-input"
            />
          </div>
          <div className="kb-filter-group">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="kb-filter-select"
            >
              <option value="all">全部状态</option>
              <option value="completed">已完成</option>
              <option value="processing">处理中</option>
              <option value="failed">失败</option>
            </select>
          </div>
        </div>
      </div>

      <div className="kb-content">
        {filteredKnowledgeBases.length === 0 ? (
          <div className="kb-empty-state">
            <div className="kb-empty-icon">
              <svg viewBox="0 0 24 24" width="80" height="80" fill="currentColor">
                <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
              </svg>
            </div>
            <h3>暂无知识库</h3>
            <p>点击上方"创建知识库"按钮添加您的第一个知识库</p>
          </div>
        ) : (
          <div className="kb-grid">
            {filteredKnowledgeBases.map((kb) => (
              <div key={kb.id} className="kb-card">
                <div className="kb-card-header">
                  <div className="kb-card-icon">
                    <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                      <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                  </div>
                  <div className="kb-card-title-area">
                    <h3 className="kb-card-title">{kb.name}</h3>
                    <span className={`kb-status-badge ${getStatusClass(kb.status)}`}>
                      {getStatusText(kb.status)}
                    </span>
                  </div>
                </div>
                <div className="kb-card-body">
                  <p className="kb-card-desc">{kb.description || '暂无描述'}</p>
                  <div className="kb-card-meta">
                    <div className="kb-meta-item">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                      <span>{kb.file_name}</span>
                    </div>
                    <div className="kb-meta-item">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
                      </svg>
                      <span>{formatFileSize(kb.file_size)}</span>
                    </div>
                    <div className="kb-meta-item">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                      </svg>
                      <span>{new Date(kb.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="kb-card-footer">
                  <button className="kb-action-btn kb-view-btn" title="查看详情" onClick={() => handleViewDetail(kb)}>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                    查看
                  </button>
                  <button
                    className="kb-action-btn kb-delete-btn"
                    onClick={() => handleDelete(kb.id)}
                    title="删除"
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content kb-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>创建知识库</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>知识库名称 <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入知识库名称"
                />
              </div>
              <div className="form-group">
                <label>描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="请输入知识库描述（可选）"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>上传文件 <span className="required">*</span></label>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                  accept=".pdf,.doc,.docx,.txt,.xlsx,.xls"
                />
                <div
                  className="kb-upload-area"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {formData.file ? (
                    <div className="kb-file-preview">
                      <div className="kb-file-icon">
                        <svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor">
                          <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                        </svg>
                      </div>
                      <div className="kb-file-info">
                        <p className="kb-file-name">{formData.file.name}</p>
                        <p className="kb-file-size">{formatFileSize(formData.file.size)}</p>
                      </div>
                      <button
                        className="kb-remove-file"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, file: null });
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="kb-upload-placeholder">
                      <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                        <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                      </svg>
                      <p>点击或拖拽文件到此处上传</p>
                      <span>支持 PDF、Word、Excel、TXT 格式，单文件最大 50MB</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                取消
              </button>
              <button className="btn-primary" onClick={handleCreate}>
                创建知识库
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
