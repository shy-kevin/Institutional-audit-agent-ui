import { useState, useEffect } from 'react';
import type { AuditResult, AuditIssue } from '../types/index';
import { api, getApiBaseUrl } from '../services/api';

interface AuditReviewPageProps {
  resultId: number;
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function AuditReviewPage({ resultId, onNavigate }: AuditReviewPageProps) {
  const [result, setResult] = useState<AuditResult | null>(null);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [documentContent, setDocumentContent] = useState<string>('');
  const [selectedIssue, setSelectedIssue] = useState<AuditIssue | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [rejectReason, setRejectReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const getSeverityClass = (severity: string) => {
    const classMap: Record<string, string> = {
      high: 'severity-high',
      medium: 'severity-medium',
      low: 'severity-low',
    };
    return classMap[severity] || '';
  };

  const getStatusClass = (status: string) => {
    const classMap: Record<string, string> = {
      pending: 'status-pending',
      accepted: 'status-accepted',
      rejected: 'status-rejected',
      partial_accepted: 'status-partial',
    };
    return classMap[status] || '';
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

  const handleAccept = async (issue: AuditIssue) => {
    try {
      setSaving(true);
      await api.updateIssueStatus(issue.id, {
        status: 'accepted',
        suggestion: issue.suggestion,
      });
      
      const updatedIssues = issues.map((i) =>
        i.id === issue.id ? { ...i, status: 'accepted' as const } : i
      );
      setIssues(updatedIssues);
      
      const updatedContent = documentContent.replace(
        issue.original_text,
        issue.suggestion
      );
      setDocumentContent(updatedContent);
      
      setSelectedIssue(null);
    } catch (error) {
      console.error('Failed to accept issue:', error);
      alert('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handlePartialAccept = async () => {
    if (!selectedIssue || !editedContent.trim()) {
      alert('请输入修订内容');
      return;
    }

    try {
      setSaving(true);
      await api.updateIssueStatus(selectedIssue.id, {
        status: 'partial_accepted',
        suggestion: editedContent,
      });
      
      const updatedIssues = issues.map((i) =>
        i.id === selectedIssue.id ? { ...i, status: 'partial_accepted' as const, suggestion: editedContent } : i
      );
      setIssues(updatedIssues);
      
      const updatedContent = documentContent.replace(
        selectedIssue.original_text,
        editedContent
      );
      setDocumentContent(updatedContent);
      
      setSelectedIssue(null);
      setEditedContent('');
    } catch (error) {
      console.error('Failed to partial accept issue:', error);
      alert('操作失败');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!selectedIssue || !rejectReason.trim()) {
      alert('请输入驳回原因');
      return;
    }

    try {
      setSaving(true);
      await api.updateIssueStatus(selectedIssue.id, {
        status: 'rejected',
        reject_reason: rejectReason,
      });
      
      const updatedIssues = issues.map((i) =>
        i.id === selectedIssue.id ? { ...i, status: 'rejected' as const } : i
      );
      setIssues(updatedIssues);
      
      setSelectedIssue(null);
      setRejectReason('');
    } catch (error) {
      console.error('Failed to reject issue:', error);
      alert('操作失败');
    } finally {
      setSaving(false);
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

  const getPendingCount = () => issues.filter((i) => i.status === 'pending').length;
  const getAcceptedCount = () => issues.filter((i) => i.status === 'accepted' || i.status === 'partial_accepted').length;
  const getRejectedCount = () => issues.filter((i) => i.status === 'rejected').length;

  if (loading) {
    return (
      <div className="audit-review-page loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="audit-review-page error">
        <p>未找到审查结果</p>
        <button onClick={() => onNavigate('dashboard')}>返回首页</button>
      </div>
    );
  }

  return (
    <div className="audit-review-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('result', { resultId })}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>审查结果校验与修订</h1>
          <p>{result.document_name}</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={() => handleExport('word')}>
            导出带批注 Word
          </button>
          <button className="btn-secondary" onClick={() => handleExport('pdf')}>
            导出带批注 PDF
          </button>
          <button className="btn-primary" onClick={() => handleExport('report')}>
            导出正式审查报告
          </button>
        </div>
      </div>

      <div className="review-stats">
        <div className="stat-item pending">
          <div className="stat-value">{getPendingCount()}</div>
          <div className="stat-label">待处理</div>
        </div>
        <div className="stat-item accepted">
          <div className="stat-value">{getAcceptedCount()}</div>
          <div className="stat-label">已采纳</div>
        </div>
        <div className="stat-item rejected">
          <div className="stat-value">{getRejectedCount()}</div>
          <div className="stat-label">已驳回</div>
        </div>
      </div>

      <div className="review-content">
        <div className="issues-panel">
          <div className="panel-header">
            <h3>审查意见列表</h3>
          </div>
          <div className="issues-list">
            {issues.length === 0 ? (
              <div className="empty-state">暂无审查意见</div>
            ) : (
              issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`issue-item ${selectedIssue?.id === issue.id ? 'selected' : ''} ${getStatusClass(issue.status)}`}
                  onClick={() => {
                    setSelectedIssue(issue);
                    setEditedContent(issue.suggestion);
                    setRejectReason('');
                  }}
                >
                  <div className="issue-header">
                    <span className={`severity-badge ${getSeverityClass(issue.severity)}`}>
                      {issue.severity === 'high' ? '严重' : issue.severity === 'medium' ? '中等' : '轻微'}
                    </span>
                    <span className="issue-type">
                      {issue.issue_type === 'compliance' ? '合规' : 
                       issue.issue_type === 'consistency' ? '一致性' : '形式'}
                    </span>
                    <span className={`status-badge ${getStatusClass(issue.status)}`}>
                      {getStatusText(issue.status)}
                    </span>
                  </div>
                  <div className="issue-body">
                    <div className="issue-row">
                      <span className="label">原文：</span>
                      <span className="content original">{issue.original_text}</span>
                    </div>
                    <div className="issue-row">
                      <span className="label">建议：</span>
                      <span className="content suggestion">{issue.suggestion}</span>
                    </div>
                  </div>
                  {issue.status === 'pending' && (
                    <div className="issue-actions">
                      <button
                        className="action-btn accept"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAccept(issue);
                        }}
                        disabled={saving}
                      >
                        采纳
                      </button>
                      <button
                        className="action-btn partial"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIssue(issue);
                          setEditedContent(issue.suggestion);
                        }}
                        disabled={saving}
                      >
                        部分采纳
                      </button>
                      <button
                        className="action-btn reject"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIssue(issue);
                          setRejectReason('');
                        }}
                        disabled={saving}
                      >
                        驳回
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="document-panel">
          <div className="panel-header">
            <h3>文档预览</h3>
          </div>
          <div className="document-content">
            <pre>{documentContent}</pre>
          </div>
        </div>
      </div>

      {selectedIssue && selectedIssue.status === 'pending' && (
        <div className="review-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>处理审查意见</h3>
              <button className="close-btn" onClick={() => setSelectedIssue(null)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>原文内容</label>
                <div className="original-text">{selectedIssue.original_text}</div>
              </div>
              <div className="form-group">
                <label>修改建议</label>
                <div className="suggestion-text">{selectedIssue.suggestion}</div>
              </div>
              <div className="form-group">
                <label>修订内容</label>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  placeholder="输入修订后的内容"
                  rows={4}
                />
              </div>
              <div className="form-group">
                <label>驳回原因（可选）</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="如需驳回，请输入驳回原因"
                  rows={2}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedIssue(null)}>
                取消
              </button>
              {rejectReason.trim() ? (
                <button className="btn-danger" onClick={handleReject} disabled={saving}>
                  {saving ? '处理中...' : '确认驳回'}
                </button>
              ) : (
                <button className="btn-primary" onClick={handlePartialAccept} disabled={saving}>
                  {saving ? '处理中...' : '确认修订'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
