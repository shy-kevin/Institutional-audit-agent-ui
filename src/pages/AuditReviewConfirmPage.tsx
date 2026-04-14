import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ReviewStatistics, AuditIssue, IssueStatus } from '../types/index';

interface AuditReviewConfirmPageProps {
  resultId: number;
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
  onBack: () => void;
}

export function AuditReviewConfirmPage({ resultId, onNavigate, onBack }: AuditReviewConfirmPageProps) {
  const [statistics, setStatistics] = useState<ReviewStatistics | null>(null);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewStarted, setReviewStarted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [confirmComment, setConfirmComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<IssueStatus | ''>('');

  useEffect(() => {
    loadReviewData();
  }, [resultId]);

  const loadReviewData = async () => {
    try {
      setLoading(true);
      const [statsResponse, issuesResponse] = await Promise.all([
        api.getReviewStatistics(resultId),
        api.getAuditIssues(resultId),
      ]);
      setStatistics(statsResponse);
      setIssues(issuesResponse.items || []);
      
      // 检查是否已经开始审核
      const resultResponse = await api.getAuditResult(resultId);
      if (resultResponse.status === 'reviewing' || resultResponse.status === 'completed') {
        setReviewStarted(true);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '加载数据失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = async () => {
    try {
      await api.startReview(resultId);
      setReviewStarted(true);
      setMessage({ type: 'success', text: '已开始审核' });
      loadReviewData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '开始审核失败' });
    }
  };

  const handleConfirmResult = async () => {
    if (!reviewStarted) {
      setMessage({ type: 'error', text: '请先开始审核' });
      return;
    }
    setShowConfirmModal(true);
  };

  const submitConfirm = async () => {
    try {
      await api.confirmReviewResult(resultId, { comment: confirmComment || undefined });
      setMessage({ type: 'success', text: '审查结果已确认' });
      setShowConfirmModal(false);
      setConfirmComment('');
      setTimeout(() => onBack(), 1500);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '确认失败' });
    }
  };

  const handleRejectResult = async () => {
    if (!reviewStarted) {
      setMessage({ type: 'error', text: '请先开始审核' });
      return;
    }
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      setMessage({ type: 'error', text: '请输入驳回原因' });
      return;
    }
    try {
      await api.rejectReviewResult(resultId, { reason: rejectReason });
      setMessage({ type: 'success', text: '审查结果已驳回，将重新审查' });
      setShowRejectModal(false);
      setRejectReason('');
      setReviewStarted(false);
      loadReviewData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '驳回失败' });
    }
  };

  const handleAcceptIssue = async (issueId: number) => {
    const suggestion = prompt('请输入修改建议（可选）:');
    try {
      await api.acceptIssue(issueId, suggestion || undefined);
      setMessage({ type: 'success', text: '问题已接受' });
      loadReviewData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '接受失败' });
    }
  };

  const handleRejectIssue = async (issueId: number) => {
    const rejectReason = prompt('请输入拒绝原因:');
    if (!rejectReason) return;
    try {
      await api.rejectIssue(issueId, rejectReason);
      setMessage({ type: 'success', text: '问题已拒绝' });
      loadReviewData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '拒绝失败' });
    }
  };

  const handleSelectIssue = (issueId: number) => {
    setSelectedIssues(prev => 
      prev.includes(issueId) 
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    );
  };

  const handleBulkUpdate = async () => {
    if (selectedIssues.length === 0 || !bulkStatus) {
      setMessage({ type: 'error', text: '请选择问题和目标状态' });
      return;
    }
    try {
      await api.batchUpdateIssues(resultId, {
        issue_ids: selectedIssues,
        status: bulkStatus as IssueStatus,
      });
      setMessage({ type: 'success', text: `成功更新 ${selectedIssues.length} 个问题状态` });
      setSelectedIssues([]);
      setBulkStatus('');
      loadReviewData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '批量更新失败' });
    }
  };

  const handleAcceptAll = async () => {
    if (!confirm('确定要接受所有问题吗？')) return;
    try {
      const result = await api.acceptAllIssues(resultId);
      setMessage({ type: 'success', text: result.message || '已接受所有问题' });
      loadReviewData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '操作失败' });
    }
  };

  const getStatusText = (status: IssueStatus) => {
    const map = {
      'pending': '待处理',
      'accepted': '已接受',
      'rejected': '已拒绝',
      'partial_accepted': '部分接受',
    };
    return map[status] || status;
  };

  const getStatusClass = (status: IssueStatus) => {
    const map = {
      'pending': 'status-pending',
      'accepted': 'status-accepted',
      'rejected': 'status-rejected',
      'partial_accepted': 'status-partial',
    };
    return map[status] || '';
  };

  if (loading) {
    return (
      <div className="audit-review-confirm-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-review-confirm-page">
      <div className="page-header">
        <button className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>审核确认</h1>
          <p>审查结果审核与确认</p>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="review-content">
        {/* 审核统计卡片 */}
        {statistics && (
          <div className="statistics-card">
            <div className="card-header">
              <h2>审核进度</h2>
            </div>
            <div className="card-body">
              <div className="progress-info">
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${statistics.review_progress}%` }}
                  ></div>
                </div>
                <span className="progress-text">{statistics.review_progress}%</span>
              </div>
              <div className="stats-grid">
                <div className="stat-item">
                  <span className="stat-value">{statistics.total_issues}</span>
                  <span className="stat-label">总问题数</span>
                </div>
                <div className="stat-item pending">
                  <span className="stat-value">{statistics.pending_issues}</span>
                  <span className="stat-label">待处理</span>
                </div>
                <div className="stat-item accepted">
                  <span className="stat-value">{statistics.accepted_issues}</span>
                  <span className="stat-label">已接受</span>
                </div>
                <div className="stat-item rejected">
                  <span className="stat-value">{statistics.rejected_issues}</span>
                  <span className="stat-label">已拒绝</span>
                </div>
                <div className="stat-item partial">
                  <span className="stat-value">{statistics.partial_accepted_issues}</span>
                  <span className="stat-label">部分接受</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="action-bar">
          {!reviewStarted ? (
            <button className="btn-primary" onClick={handleStartReview}>
              开始审核
            </button>
          ) : (
            <>
              <button className="btn-success" onClick={handleAcceptAll}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                接受所有问题
              </button>
              <button className="btn-primary" onClick={handleConfirmResult}>
                确认审查结果
              </button>
              <button className="btn-danger" onClick={handleRejectResult}>
                驳回审查结果
              </button>
            </>
          )}
        </div>

        {/* 批量操作 */}
        {reviewStarted && selectedIssues.length > 0 && (
          <div className="bulk-actions">
            <span className="selected-info">已选择 {selectedIssues.length} 个问题</span>
            <select 
              value={bulkStatus} 
              onChange={(e) => setBulkStatus(e.target.value as IssueStatus | '')}
            >
              <option value="">选择操作</option>
              <option value="accepted">接受</option>
              <option value="rejected">拒绝</option>
              <option value="partial_accepted">部分接受</option>
            </select>
            <button className="btn-secondary" onClick={handleBulkUpdate}>
              批量更新
            </button>
          </div>
        )}

        {/* 问题列表 */}
        <div className="issues-card">
          <div className="card-header">
            <h2>问题列表</h2>
            <span className="issue-count">共 {issues.length} 个问题</span>
          </div>
          <div className="card-body">
            {issues.length === 0 ? (
              <div className="empty-state">
                <p>暂无问题</p>
              </div>
            ) : (
              <div className="issues-list">
                {issues.map((issue) => (
                  <div key={issue.id} className={`issue-item ${getStatusClass(issue.status)}`}>
                    <div className="issue-header">
                      <input
                        type="checkbox"
                        checked={selectedIssues.includes(issue.id)}
                        onChange={() => handleSelectIssue(issue.id)}
                        disabled={!reviewStarted || issue.status !== 'pending'}
                      />
                      <span className="issue-type">{issue.issue_type}</span>
                      <span className={`issue-severity severity-${issue.severity}`}>
                        {issue.severity === 'high' ? '严重' : issue.severity === 'medium' ? '中等' : '轻微'}
                      </span>
                      <span className={`issue-status ${getStatusClass(issue.status)}`}>
                        {getStatusText(issue.status)}
                      </span>
                    </div>
                    <div className="issue-content">
                      <div className="issue-location">位置：{issue.location}</div>
                      <div className="issue-description">
                        <strong>问题描述:</strong>
                        <p>{issue.issue_description}</p>
                      </div>
                      {issue.legal_basis && (
                        <div className="issue-legal-basis">
                          <strong>法律依据:</strong>
                          <p>{issue.legal_basis}</p>
                        </div>
                      )}
                      {issue.suggestion && (
                        <div className="issue-suggestion">
                          <strong>修改建议:</strong>
                          <p>{issue.suggestion}</p>
                        </div>
                      )}
                    </div>
                    {reviewStarted && issue.status === 'pending' && (
                      <div className="issue-actions">
                        <button 
                          className="btn-accept" 
                          onClick={() => handleAcceptIssue(issue.id)}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          接受
                        </button>
                        <button 
                          className="btn-reject" 
                          onClick={() => handleRejectIssue(issue.id)}
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                          </svg>
                          拒绝
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 确认模态框 */}
      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>确认审查结果</h2>
              <button className="close-btn" onClick={() => setShowConfirmModal(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>审核意见（可选）</label>
                <textarea
                  value={confirmComment}
                  onChange={(e) => setConfirmComment(e.target.value)}
                  placeholder="请输入审核意见或备注..."
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowConfirmModal(false)}>取消</button>
              <button className="btn-primary" onClick={submitConfirm}>确认</button>
            </div>
          </div>
        </div>
      )}

      {/* 驳回模态框 */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>驳回审查结果</h2>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>驳回原因 <span className="required">*</span></label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="请输入驳回原因..."
                  rows={4}
                  required
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRejectModal(false)}>取消</button>
              <button className="btn-danger" onClick={submitReject}>驳回</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
