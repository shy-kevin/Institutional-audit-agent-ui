import { useState, useEffect } from 'react';
import type { AuditTask } from '../types/index';
import { api } from '../services/api';

interface AuditProgressPageProps {
  taskId?: number;
  taskIds?: number[];
  mode?: 'single' | 'batch' | 'compare';
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function AuditProgressPage({ taskId, taskIds, onNavigate }: AuditProgressPageProps) {
  const [tasks, setTasks] = useState<AuditTask[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (taskId) {
      loadSingleTask(taskId);
    } else if (taskIds && taskIds.length > 0) {
      loadMultipleTasks(taskIds);
    }
  }, [taskId, taskIds]);

  useEffect(() => {
    if (tasks.length > 0) {
      const interval = setInterval(() => {
        updateTaskProgress();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [tasks]);

  const loadSingleTask = async (id: number) => {
    try {
      setLoading(true);
      const task = await api.getAuditTask(id);
      setTasks([task]);
      if (task.status === 'analyzing') {
        startStreamingResult(id);
      }
    } catch (error) {
      console.error('Failed to load task:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMultipleTasks = async (ids: number[]) => {
    try {
      setLoading(true);
      const taskPromises = ids.map((id) => api.getAuditTask(id));
      const loadedTasks = await Promise.all(taskPromises);
      setTasks(loadedTasks);
      setEstimatedTime(loadedTasks.length * 30);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskProgress = async () => {
    try {
      const updatedTasks = await Promise.all(
        tasks.map((task) => api.getAuditTask(task.id))
      );
      setTasks(updatedTasks);

      const completedCount = updatedTasks.filter(
        (t) => t.status === 'completed' || t.status === 'failed'
      ).length;
      
      if (completedCount === updatedTasks.length) {
        if (updatedTasks.length === 1) {
          onNavigate('result', { resultId: updatedTasks[0].id });
        } else {
          onNavigate('history');
        }
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const startStreamingResult = async (id: number) => {
    try {
      let content = '';
      for await (const chunk of api.streamAuditResult(id)) {
        content += chunk.content;
        setStreamingContent(content);
        if (chunk.is_end) break;
      }
    } catch (error) {
      console.error('Failed to stream result:', error);
    }
  };

  const handlePause = async () => {
    try {
      if (tasks[currentTaskIndex]) {
        await api.pauseAuditTask(tasks[currentTaskIndex].id);
        updateTaskProgress();
      }
    } catch (error) {
      console.error('Failed to pause task:', error);
    }
  };

  const handleCancel = async () => {
    if (!confirm('确定要取消审查任务吗？')) return;
    
    try {
      if (tasks[currentTaskIndex]) {
        await api.cancelAuditTask(tasks[currentTaskIndex].id);
        onNavigate('dashboard');
      }
    } catch (error) {
      console.error('Failed to cancel task:', error);
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: '等待中',
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

  const getProgressSteps = () => {
    return [
      { key: 'parsing', label: '文档解析', icon: '📄' },
      { key: 'rules', label: '规则匹配', icon: '⚙️' },
      { key: 'consistency', label: '一致性比对', icon: '🔄' },
      { key: 'compliance', label: '合规校验', icon: '✓' },
      { key: 'format', label: '形式检查', icon: '📝' },
      { key: 'report', label: '生成报告', icon: '📊' },
    ];
  };

  const getCurrentStep = (task: AuditTask) => {
    if (task.progress < 15) return 0;
    if (task.progress < 30) return 1;
    if (task.progress < 50) return 2;
    if (task.progress < 70) return 3;
    if (task.progress < 85) return 4;
    return 5;
  };

  if (loading) {
    return (
      <div className="audit-progress-page loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  const currentTask = tasks[currentTaskIndex];

  return (
    <div className="audit-progress-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('dashboard')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>审查进度监控</h1>
          <p>实时查看审查任务执行状态</p>
        </div>
      </div>

      {tasks.length > 1 && (
        <div className="batch-progress">
          <div className="batch-header">
            <h3>批量审查进度</h3>
            <span className="batch-count">
              {tasks.filter((t) => t.status === 'completed').length} / {tasks.length} 已完成
            </span>
          </div>
          <div className="batch-tasks">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={`batch-task ${index === currentTaskIndex ? 'active' : ''}`}
                onClick={() => setCurrentTaskIndex(index)}
              >
                <div className="task-name">{task.document_name}</div>
                <div className="task-progress-mini">
                  <div className="progress-bar-mini">
                    <div className="progress-fill" style={{ width: `${task.progress}%` }}></div>
                  </div>
                  <span>{task.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentTask && (
        <div className="progress-content">
          <div className="task-info-card">
            <div className="task-header">
              <h3>{currentTask.document_name}</h3>
              <span className={`task-status ${getStatusClass(currentTask.status)}`}>
                {getStatusText(currentTask.status)}
              </span>
            </div>
            <div className="task-meta">
              <span>任务ID: {currentTask.id}</span>
              <span>创建时间: {new Date(currentTask.created_at).toLocaleString()}</span>
            </div>
          </div>

          <div className="progress-steps">
            {getProgressSteps().map((step, index) => {
              const currentStep = getCurrentStep(currentTask);
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={step.key}
                  className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="step-icon">
                    {isCompleted ? (
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                      </svg>
                    ) : (
                      <span>{step.icon}</span>
                    )}
                  </div>
                  <div className="step-label">{step.label}</div>
                  {isActive && <div className="step-pulse"></div>}
                </div>
              );
            })}
          </div>

          <div className="progress-bar-container">
            <div className="progress-info">
              <span>总体进度</span>
              <span className="progress-percent">{currentTask.progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${currentTask.progress}%` }}></div>
            </div>
            {estimatedTime > 0 && currentTask.status !== 'completed' && (
              <div className="estimated-time">
                预计剩余时间：约 {Math.ceil(estimatedTime * (1 - currentTask.progress / 100))} 秒
              </div>
            )}
          </div>

          {currentTask.status === 'analyzing' && streamingContent && (
            <div className="streaming-result">
              <h3>实时审查结果</h3>
              <div className="result-content">
                <pre>{streamingContent}</pre>
              </div>
            </div>
          )}

          <div className="performance-info">
            <div className="info-item">
              <div className="info-icon">⚡</div>
              <div className="info-text">
                <div className="info-label">首字返回</div>
                <div className="info-value">&lt; 20秒</div>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon">📊</div>
              <div className="info-text">
                <div className="info-label">审查维度</div>
                <div className="info-value">合规 + 一致 + 形式</div>
              </div>
            </div>
            <div className="info-item">
              <div className="info-icon">🎯</div>
              <div className="info-text">
                <div className="info-label">审查精度</div>
                <div className="info-value">高精度模式</div>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn-secondary" onClick={handlePause}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
              <span>暂停审查</span>
            </button>
            <button className="btn-danger" onClick={handleCancel}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
              <span>取消任务</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
