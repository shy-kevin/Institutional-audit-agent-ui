import { useState, useEffect, useRef } from 'react';
import type { AuditResult, AuditIssue } from '../types/index';
import { api, getApiBaseUrl } from '../services/api';

interface AuditResultPageProps {
  resultId: number;
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function AuditResultPage({ resultId, onNavigate }: AuditResultPageProps) {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'compliance' | 'consistency' | 'format'>('compliance');
  const [selectedIssue, setSelectedIssue] = useState<AuditIssue | null>(null);
  const [loading, setLoading] = useState(true);
  const documentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadResult();
  }, [resultId]);

  const loadResult = async () => {
    try {
      setLoading(true);
      const [resultData, issuesData, docContent] = await Promise.all([
        api.getAuditResult(resultId),
        api.getAuditIssues(resultId),
        api.getDocumentContent(resultId),
      ]);
      setResult(resultData);
      setIssues(issuesData.items || []);
      setDocumentContent(docContent.content || '');
    } catch (error) {
      console.error('Failed to load result:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredIssues = () => {
    return issues.filter((issue) => issue.issue_type === activeTab);
  };

  const getRiskLevelClass = (level: string) => {
    const classMap: Record<string, string> = {
      high: 'risk-high',
      medium: 'risk-medium',
      low: 'risk-low',
    };
    return classMap[level] || '';
  };

  const getRiskLevelText = (level: string) => {
    const levelMap: Record<string, string> = {
      high: '高风险',
      medium: '中风险',
      low: '低风险',
    };
    return levelMap[level] || level;
  };

  const getSeverityClass = (severity: string) => {
    const classMap: Record<string, string> = {
      high: 'severity-high',
      medium: 'severity-medium',
      low: 'severity-low',
    };
    return classMap[severity] || '';
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待处理',
      accepted: '已采纳',
      rejected: '已驳回',
      partial_accepted: '部分采纳',
    };
    return statusMap[status] || status;
  };

  const handleIssueClick = (issue: AuditIssue) => {
    setSelectedIssue(issue);
    scrollToLocation(issue.location);
  };

  const scrollToLocation = (location: string) => {
    if (documentRef.current) {
      const element = documentRef.current.querySelector(`[data-location="${location}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('highlight');
        setTimeout(() => element.classList.remove('highlight'), 2000);
      }
    }
  };

  const handleExport = async (format: 'word' | 'pdf' | 'report') => {
    try {
      const exportData = await api.exportAuditReport(resultId, format);
      const link = document.createElement('a');
      link.href = `${getApiBaseUrl()}${exportData.download_url}`;
      link.download = exportData.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to export:', error);
      alert('导出失败');
    }
  };

  const highlightDocument = (content: string) => {
    let highlighted = content;
    issues.forEach((issue) => {
      const colorClass = issue.severity === 'high' ? 'highlight-red' : 
                        issue.severity === 'medium' ? 'highlight-yellow' : 'highlight-blue';
      const regex = new RegExp(issue.original_text, 'g');
      highlighted = highlighted.replace(
        regex,
        `<span class="highlight-text ${colorClass}" data-location="${issue.location}" data-issue-id="${issue.id}">${issue.original_text}</span>`
      );
    });
    return highlighted;
  };

  if (loading) {
    return (
      <div className="audit-result-page loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="audit-result-page error">
        <p>未找到审查结果</p>
        <button onClick={() => onNavigate('dashboard')}>返回首页</button>
      </div>
    );
  }

  return (
    <div className="audit-result-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('history')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>审查结果详情</h1>
          <p>{result.document_name}</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => onNavigate('review', { resultId })}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            <span>校验修订</span>
          </button>
          <button className="btn-primary" onClick={() => handleExport('report')}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
            <span>导出报告</span>
          </button>
        </div>
      </div>

      <div className="risk-summary">
        <div className={`risk-badge ${getRiskLevelClass(result.risk_level)}`}>
          <div className="risk-icon">
            {result.risk_level === 'high' ? '🔴' : result.risk_level === 'medium' ? '🟡' : '🔵'}
          </div>
          <div className="risk-info">
            <div className="risk-label">风险等级</div>
            <div className="risk-value">{getRiskLevelText(result.risk_level)}</div>
          </div>
        </div>
        <div className="issue-stats">
          <div className="stat-item">
            <div className="stat-value">{result.total_issues}</div>
            <div className="stat-label">问题总数</div>
          </div>
          <div className="stat-item compliance">
            <div className="stat-value">{result.compliance_issues}</div>
            <div className="stat-label">合规问题</div>
          </div>
          <div className="stat-item consistency">
            <div className="stat-value">{result.consistency_issues}</div>
            <div className="stat-label">一致性问题</div>
          </div>
          <div className="stat-item format">
            <div className="stat-value">{result.format_issues}</div>
            <div className="stat-label">形式问题</div>
          </div>
        </div>
      </div>

      <div className="result-content">
        <div className="document-panel">
          <div className="panel-header">
            <h3>制度原文</h3>
            <div className="legend">
              <span className="legend-item red">🔴 合规冲突</span>
              <span className="legend-item yellow">🟡 格式问题</span>
              <span className="legend-item blue">🔵 建议优化</span>
            </div>
          </div>
          <div 
            className="document-content" 
            ref={documentRef}
            dangerouslySetInnerHTML={{ __html: highlightDocument(documentContent) }}
          />
        </div>

        <div className="result-panel">
          <div className="panel-header">
            <div className="tab-buttons">
              <button
                className={`tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
                onClick={() => setActiveTab('compliance')}
              >
                合规性审查 ({result.compliance_issues})
              </button>
              <button
                className={`tab-btn ${activeTab === 'consistency' ? 'active' : ''}`}
                onClick={() => setActiveTab('consistency')}
              >
                一致性审查 ({result.consistency_issues})
              </button>
              <button
                className={`tab-btn ${activeTab === 'format' ? 'active' : ''}`}
                onClick={() => setActiveTab('format')}
              >
                形式审查 ({result.format_issues})
              </button>
            </div>
          </div>

          <div className="issues-list">
            {getFilteredIssues().length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <p>未发现{activeTab === 'compliance' ? '合规性' : activeTab === 'consistency' ? '一致性' : '形式'}问题</p>
              </div>
            ) : (
              getFilteredIssues().map((issue) => (
                <div
                  key={issue.id}
                  className={`issue-card ${selectedIssue?.id === issue.id ? 'selected' : ''} ${getSeverityClass(issue.severity)}`}
                  onClick={() => handleIssueClick(issue)}
                >
                  <div className="issue-header">
                    <span className={`severity-badge ${getSeverityClass(issue.severity)}`}>
                      {issue.severity === 'high' ? '严重' : issue.severity === 'medium' ? '中等' : '轻微'}
                    </span>
                    <span className="issue-location">{issue.location}</span>
                    <span className={`issue-status ${issue.status}`}>
                      {getStatusText(issue.status)}
                    </span>
                  </div>
                  <div className="issue-content">
                    <div className="issue-section">
                      <div className="section-label">原文内容：</div>
                      <div className="original-text">{issue.original_text}</div>
                    </div>
                    <div className="issue-section">
                      <div className="section-label">问题描述：</div>
                      <div className="issue-description">{issue.issue_description}</div>
                    </div>
                    {issue.legal_basis && (
                      <div className="issue-section">
                        <div className="section-label">违反依据：</div>
                        <div className="legal-basis">{issue.legal_basis}</div>
                      </div>
                    )}
                    <div className="issue-section">
                      <div className="section-label">修改建议：</div>
                      <div className="suggestion">{issue.suggestion}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="export-options">
        <h3>导出选项</h3>
        <div className="export-buttons">
          <button className="export-btn" onClick={() => handleExport('word')}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            <span>导出带批注 Word</span>
          </button>
          <button className="export-btn" onClick={() => handleExport('pdf')}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5V11H19v2h-1.5V7h3v1.5zM9 9.5h1v-1H9v1zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm10 5.5h1v-3h-1v3z"/>
            </svg>
            <span>导出带批注 PDF</span>
          </button>
          <button className="export-btn primary" onClick={() => handleExport('report')}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <span>导出正式审查报告</span>
          </button>
        </div>
      </div>
    </div>
  );
}
