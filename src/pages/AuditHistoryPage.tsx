import { useState, useEffect } from 'react';
import type { AuditHistory, AuditTrail } from '../types/index';
import { api, getApiBaseUrl } from '../services/api';

interface AuditHistoryPageProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function AuditHistoryPage({ onNavigate }: AuditHistoryPageProps) {
  const [history, setHistory] = useState<AuditHistory[]>([]);
  const [filteredHistory, setFilteredHistory] = useState<AuditHistory[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<AuditHistory | null>(null);
  const [trails, setTrails] = useState<AuditTrail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    dateRange: 'all',
    auditType: 'all',
    riskLevel: 'all',
    keyword: '',
  });

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [history, filters]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditHistory({});
      setHistory(data.items || []);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...history];

    if (filters.dateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      switch (filters.dateRange) {
        case 'today':
          filterDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
      }
      filtered = filtered.filter((item) => new Date(item.audit_time) >= filterDate);
    }

    if (filters.auditType !== 'all') {
      filtered = filtered.filter((item) => item.audit_type === filters.auditType);
    }

    if (filters.riskLevel !== 'all') {
      filtered = filtered.filter((item) => item.risk_level === filters.riskLevel);
    }

    if (filters.keyword.trim()) {
      const keyword = filters.keyword.toLowerCase();
      filtered = filtered.filter((item) =>
        item.document_name.toLowerCase().includes(keyword)
      );
    }

    setFilteredHistory(filtered);
  };

  const loadTrails = async (taskId: number) => {
    try {
      const data = await api.getAuditTrails(taskId);
      setTrails(data.items || []);
    } catch (error) {
      console.error('Failed to load trails:', error);
    }
  };

  const handleRecordClick = (record: AuditHistory) => {
    setSelectedRecord(record);
    loadTrails(record.id);
  };

  const handleViewDetail = (record: AuditHistory) => {
    onNavigate('result', { resultId: record.id });
  };

  const handleReAudit = async (record: AuditHistory) => {
    if (!confirm('确定要重新审查此文档吗？')) return;
    
    try {
      const task = await api.createAuditTask({
        document_path: '',
        document_name: record.document_name,
        audit_type: record.audit_type,
      });
      onNavigate('progress', { taskId: task.id });
    } catch (error) {
      console.error('Failed to re-audit:', error);
      alert('重新审查失败');
    }
  };

  const handleDownload = async (record: AuditHistory, type: 'result' | 'trail') => {
    try {
      let downloadUrl: string;
      let fileName: string;
      
      if (type === 'result') {
        const exportData = await api.exportAuditReport(record.id, 'report');
        downloadUrl = exportData.download_url;
        fileName = exportData.file_name;
      } else {
        const trailData = await api.exportAuditTrail(record.id);
        downloadUrl = trailData.download_url;
        fileName = trailData.file_name;
      }
      
      const link = document.createElement('a');
      link.href = `${getApiBaseUrl()}${downloadUrl}`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download:', error);
      alert('下载失败');
    }
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

  const getAuditTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      draft: '拟制审查',
      revision: '修订审查',
      current: '现行巡检',
    };
    return typeMap[type] || type;
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      completed: '已完成',
      archived: '已归档',
    };
    return statusMap[status] || status;
  };

  const getActionText = (action: string) => {
    const actionMap: Record<string, string> = {
      upload: '上传文档',
      config: '配置审查',
      start: '开始审查',
      complete: '审查完成',
      modify: '修订文档',
      export: '导出报告',
    };
    return actionMap[action] || action;
  };

  if (loading) {
    return (
      <div className="audit-history-page loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="audit-history-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('dashboard')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>审查历史与审计中心</h1>
          <p>查看历史审查记录和审查轨迹</p>
        </div>
      </div>

      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>审查时间</label>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
            >
              <option value="all">全部时间</option>
              <option value="today">今天</option>
              <option value="week">最近一周</option>
              <option value="month">最近一月</option>
            </select>
          </div>
          <div className="filter-group">
            <label>审查类型</label>
            <select
              value={filters.auditType}
              onChange={(e) => setFilters({ ...filters, auditType: e.target.value })}
            >
              <option value="all">全部类型</option>
              <option value="draft">拟制审查</option>
              <option value="revision">修订审查</option>
              <option value="current">现行巡检</option>
            </select>
          </div>
          <div className="filter-group">
            <label>风险等级</label>
            <select
              value={filters.riskLevel}
              onChange={(e) => setFilters({ ...filters, riskLevel: e.target.value })}
            >
              <option value="all">全部等级</option>
              <option value="high">高风险</option>
              <option value="medium">中风险</option>
              <option value="low">低风险</option>
            </select>
          </div>
          <div className="filter-group search">
            <label>关键词搜索</label>
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              placeholder="输入文档名称"
            />
          </div>
        </div>
      </div>

      <div className="history-content">
        <div className="history-list-section">
          <div className="list-header">
            <h3>审查记录 ({filteredHistory.length})</h3>
          </div>
          <div className="history-list">
            {filteredHistory.length === 0 ? (
              <div className="empty-state">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                  <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z"/>
                </svg>
                <p>暂无审查记录</p>
              </div>
            ) : (
              <table className="history-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>文档名称</th>
                    <th>审查类型</th>
                    <th>审查时间</th>
                    <th>风险等级</th>
                    <th>问题数</th>
                    <th>状态</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.map((record, index) => (
                    <tr
                      key={record.id}
                      className={selectedRecord?.id === record.id ? 'selected' : ''}
                      onClick={() => handleRecordClick(record)}
                    >
                      <td>{index + 1}</td>
                      <td className="doc-name">{record.document_name}</td>
                      <td>{getAuditTypeText(record.audit_type)}</td>
                      <td>{new Date(record.audit_time).toLocaleString()}</td>
                      <td>
                        <span className={`risk-badge ${getRiskLevelClass(record.risk_level)}`}>
                          {getRiskLevelText(record.risk_level)}
                        </span>
                      </td>
                      <td>{record.issue_count}</td>
                      <td>{getStatusText(record.status)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetail(record);
                            }}
                            title="查看详情"
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                          </button>
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReAudit(record);
                            }}
                            title="重新审查"
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                            </svg>
                          </button>
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(record, 'result');
                            }}
                            title="下载结果"
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                            </svg>
                          </button>
                          <button
                            className="action-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(record, 'trail');
                            }}
                            title="下载轨迹"
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {selectedRecord && (
          <div className="trail-section">
            <div className="section-header">
              <h3>审查轨迹</h3>
              <button className="close-btn" onClick={() => setSelectedRecord(null)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="trail-timeline">
              {trails.length === 0 ? (
                <div className="empty-state">暂无审查轨迹</div>
              ) : (
                trails.map((trail) => (
                  <div key={trail.id} className="trail-item">
                    <div className="trail-dot"></div>
                    <div className="trail-content">
                      <div className="trail-header">
                        <span className="trail-action">{getActionText(trail.action)}</span>
                        <span className="trail-time">{new Date(trail.timestamp).toLocaleString()}</span>
                      </div>
                      {trail.actor && (
                        <div className="trail-actor">操作人：{trail.actor}</div>
                      )}
                      {trail.details && (
                        <div className="trail-details">{trail.details}</div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
