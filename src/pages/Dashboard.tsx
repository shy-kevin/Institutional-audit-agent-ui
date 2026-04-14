import { useState, useEffect } from 'react';
import type { AuditStatistics, AuditTask, AuditHistory } from '../types/index';
import { api } from '../services/api';

interface DashboardProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const [statistics, setStatistics] = useState<AuditStatistics>({
    today_count: 0,
    batch_count: 0,
    risk_count: 0,
    completed_count: 0,
    compliance_ratio: 0,
    consistency_ratio: 0,
    format_ratio: 0,
  });
  const [recentTasks, setRecentTasks] = useState<AuditTask[]>([]);
  const [recentHistory, setRecentHistory] = useState<AuditHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [stats, tasks, history] = await Promise.all([
        api.getAuditStatistics(),
        api.getAuditTasks({}),
        api.getAuditHistory({}),
      ]);
      setStatistics(stats);
      setRecentTasks(tasks.items || []);
      setRecentHistory(history.items || []);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '待处理',
      parsing: '解析中',
      analyzing: '分析中',
      completed: '已完成',
      failed: '失败',
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status: string) => {
    const classMap: Record<string, string> = {
      pending: 'status-pending',
      parsing: 'status-processing',
      analyzing: 'status-processing',
      completed: 'status-completed',
      failed: 'status-failed',
    };
    return classMap[status] || '';
  };

 const getRiskLevelClass = (level: string | null) => {
    if (!level) return 'risk-unknown';
    const classMap: Record<string, string> = {
      high: 'risk-high',
      medium: 'risk-medium',
      low: 'risk-low',
    };
    return classMap[level] || 'risk-unknown';
  };

  const getRiskLevelText = (level: string | null) => {
    if (!level) return '未评估';
    const levelMap: Record<string, string> = {
      high: '高风险',
      medium: '中风险',
      low: '低风险',
    };
    return levelMap[level] || '未评估';
  };

  const getAuditTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      draft: '拟制审查',
      revision: '修订审查',
      current: '现行巡检',
    };
    return typeMap[type] || type;
  };

  if (loading) {
    return (
      <div className="dashboard loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>制度审查智能体工作台</h1>
        <p>全流程自动化审查，让制度管理更高效</p>
      </div>

      <div className="statistics-cards">
        <div className="stat-card">
          <div className="stat-icon today">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.today_count}</div>
            <div className="stat-label">今日审查数</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon batch">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.batch_count}</div>
            <div className="stat-label">批量审查数</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon risk">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.risk_count}</div>
            <div className="stat-label">风险问题数</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon completed">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{statistics.completed_count}</div>
            <div className="stat-label">已完成审查</div>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>快捷操作</h2>
        <div className="action-cards">
          <div className="action-card" onClick={() => onNavigate('upload', { mode: 'single' })}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
            </div>
            <h3>单文档审查</h3>
            <p>上传单个制度文档进行精细审查</p>
          </div>

          <div className="action-card" onClick={() => onNavigate('upload', { mode: 'batch' })}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z"/>
              </svg>
            </div>
            <h3>批量制度审查</h3>
            <p>同时上传多份制度文档批量审查</p>
          </div>

          <div className="action-card" onClick={() => onNavigate('upload', { mode: 'compare' })}>
            <div className="action-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M10 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5V3zm4 0v18h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-5z"/>
              </svg>
            </div>
            <h3>制度版本比对</h3>
            <p>对比新旧版本制度差异</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="content-section">
          <div className="section-header">
            <h2>审查类型分布</h2>
          </div>
          <div className="distribution-chart">
            <div className="chart-item">
              <div className="chart-label">合规性审查</div>
              <div className="chart-bar">
                <div className="chart-fill compliance" style={{ width: `${statistics.compliance_ratio}%` }}></div>
              </div>
              <div className="chart-value">{statistics.compliance_ratio}%</div>
            </div>
            <div className="chart-item">
              <div className="chart-label">一致性审查</div>
              <div className="chart-bar">
                <div className="chart-fill consistency" style={{ width: `${statistics.consistency_ratio}%` }}></div>
              </div>
              <div className="chart-value">{statistics.consistency_ratio}%</div>
            </div>
            <div className="chart-item">
              <div className="chart-label">形式审查</div>
              <div className="chart-bar">
                <div className="chart-fill format" style={{ width: `${statistics.format_ratio}%` }}></div>
              </div>
              <div className="chart-value">{statistics.format_ratio}%</div>
            </div>
          </div>
        </div>

        <div className="content-section">
          <div className="section-header">
            <h2>待处理任务</h2>
            <button className="view-all-btn" onClick={() => onNavigate('history')}>
              查看全部
            </button>
          </div>
          <div className="task-list">
            {recentTasks.length === 0 ? (
              <div className="empty-state">暂无待处理任务</div>
            ) : (
              recentTasks.map((task) => (
                <div key={task.id} className="task-item" onClick={() => onNavigate('progress', { taskId: task.id })}>
                  <div className="task-info">
                    <div className="task-name">{task.document_name}</div>
                    <div className="task-meta">
                      <span className={`task-status ${getStatusClass(task.status)}`}>
                        {getStatusText(task.status)}
                      </span>
                      <span className="task-type">{getAuditTypeText(task.audit_type)}</span>
                      <span className="task-time">{new Date(task.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {task.status === 'parsing' || task.status === 'analyzing' ? (
                    <div className="task-progress">
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${task.progress}%` }}></div>
                      </div>
                      <span className="progress-text">{task.progress}%</span>
                    </div>
                  ) : (
                    <div className="task-action">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                      </svg>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="content-section">
          <div className="section-header">
            <h2>最近审查记录</h2>
            <button className="view-all-btn" onClick={() => onNavigate('history')}>
              查看全部
            </button>
          </div>
          <div className="history-list">
            {recentHistory.length === 0 ? (
              <div className="empty-state">暂无审查记录</div>
            ) : (
              recentHistory.map((record) => (
                <div key={record.id} className="history-item" onClick={() => onNavigate('result', { resultId: record.id })}>
                  <div className="history-info">
                    <div className="history-name">{record.document_name}</div>
                    <div className="history-meta">
                      <span className={`risk-badge ${getRiskLevelClass(record.risk_level)}`}>
                        {getRiskLevelText(record.risk_level)}
                      </span>
                      <span className="issue-count">{record.total_issues} 个问题</span>
                      <span className="history-time">{new Date(record.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="history-action">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                    </svg>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
