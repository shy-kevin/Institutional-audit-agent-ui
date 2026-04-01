import { useState, useEffect } from 'react';
import type { KnowledgeBaseDetail, KnowledgeBaseChunk } from '../types/index';
import { api } from '../services/api';

interface KnowledgeBaseDetailPageProps {
  docId: string;
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function KnowledgeBaseDetailPage({ docId, onNavigate }: KnowledgeBaseDetailPageProps) {
  const [detail, setDetail] = useState<KnowledgeBaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chunks' | 'content'>('chunks');
  const [selectedChunk, setSelectedChunk] = useState<KnowledgeBaseChunk | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');

  useEffect(() => {
    loadDetail();
  }, [docId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      const data = await api.getKnowledgeBaseDetail(docId);
      setDetail(data);
    } catch (error) {
      console.error('Failed to load knowledge base detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredChunks = detail?.structured_info?.chunks?.filter(chunk => 
    searchKeyword === '' || 
    chunk.text.toLowerCase().includes(searchKeyword.toLowerCase())
  ) || [];

  const highlightText = (text: string, keyword: string) => {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword})`, 'gi');
    return text.split(regex).map((part, index) => 
      part.toLowerCase() === keyword.toLowerCase() 
        ? <mark key={index} className="highlight">{part}</mark>
        : part
    );
  };

  const getChunkTypeLabel = (type: string) => {
    const typeMap: Record<string, { label: string; className: string }> = {
      clause: { label: '条款', className: 'chunk-type-clause' },
      title: { label: '标题', className: 'chunk-type-title' },
      paragraph: { label: '段落', className: 'chunk-type-paragraph' },
      table: { label: '表格', className: 'chunk-type-table' },
    };
    return typeMap[type] || { label: type, className: '' };
  };

  if (loading) {
    return (
      <div className="kb-detail-page loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="kb-detail-page">
        <div className="kb-detail-empty">
          <p>未找到知识库详情</p>
          <button className="btn-primary" onClick={() => onNavigate('knowledge-base')}>
            返回知识库列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kb-detail-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('knowledge-base')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>知识库详情</h1>
          <p>{detail.filename}</p>
        </div>
        <div className="header-actions">
          <span className={`kb-detail-status status-${detail.status}`}>
            {detail.status === 'active' ? '已激活' : detail.status}
          </span>
        </div>
      </div>

      <div className="kb-detail-stats">
        <div className="kb-detail-stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{detail.structured_info?.metadata?.page_count || 0}</div>
            <div className="stat-label">页数</div>
          </div>
        </div>
        <div className="kb-detail-stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{detail.structured_info?.metadata?.word_count || 0}</div>
            <div className="stat-label">字数</div>
          </div>
        </div>
        <div className="kb-detail-stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
            </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{detail.structured_info?.chunks?.length || 0}</div>
            <div className="stat-label">切片数量</div>
          </div>
        </div>
        <div className="kb-detail-stat-card">
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          </div>
          <div className="stat-info">
            <div className="stat-value">{detail.id.substring(0, 8)}</div>
            <div className="stat-label">文档ID</div>
          </div>
        </div>
      </div>

      <div className="kb-detail-tabs">
        <button 
          className={`kb-tab ${activeTab === 'chunks' ? 'active' : ''}`}
          onClick={() => setActiveTab('chunks')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
          </svg>
          文档切片
        </button>
        <button 
          className={`kb-tab ${activeTab === 'content' ? 'active' : ''}`}
          onClick={() => setActiveTab('content')}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
          原始内容
        </button>
      </div>

      {activeTab === 'chunks' && (
        <div className="kb-detail-content">
          <div className="kb-search-bar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="search-icon">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="搜索切片内容..."
              className="kb-search-input"
            />
            {searchKeyword && (
              <span className="search-result-count">
                找到 {filteredChunks.length} 个结果
              </span>
            )}
          </div>

          <div className="kb-chunks-container">
            <div className="kb-chunks-list">
              {filteredChunks.length === 0 ? (
                <div className="kb-no-chunks">
                  <p>未找到匹配的切片</p>
                </div>
              ) : (
                filteredChunks.map((chunk) => {
                  const typeInfo = getChunkTypeLabel(chunk.chunk_type);
                  return (
                    <div 
                      key={chunk.chunk_id}
                      className={`kb-chunk-item ${selectedChunk?.chunk_id === chunk.chunk_id ? 'selected' : ''}`}
                      onClick={() => setSelectedChunk(chunk)}
                    >
                      <div className="chunk-header">
                        <span className="chunk-id">#{chunk.chunk_id}</span>
                        <span className={`chunk-type ${typeInfo.className}`}>{typeInfo.label}</span>
                      </div>
                      <div className="chunk-preview">
                        {chunk.text.substring(0, 150)}...
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {selectedChunk && (
              <div className="kb-chunk-detail">
                <div className="chunk-detail-header">
                  <h3>切片 #{selectedChunk.chunk_id} 详情</h3>
                  <span className={`chunk-type ${getChunkTypeLabel(selectedChunk.chunk_type).className}`}>
                    {getChunkTypeLabel(selectedChunk.chunk_type).label}
                  </span>
                </div>
                <div className="chunk-detail-content">
                  {highlightText(selectedChunk.text, searchKeyword)}
                </div>
                <div className="chunk-detail-meta">
                  <span>字符数: {selectedChunk.text.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="kb-detail-content">
          <div className="kb-raw-content">
            {detail.parsed_data?.pages?.map((page: any, index: number) => (
              <div key={index} className="kb-page">
                <div className="page-header">第 {index + 1} 页</div>
                <div className="page-content">
                  {page.content || page.text || JSON.stringify(page, null, 2)}
                </div>
              </div>
            )) || (
              <div className="kb-no-content">
                <p>暂无原始内容</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
