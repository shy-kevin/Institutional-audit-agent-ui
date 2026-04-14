import { useState, useEffect } from 'react';
import type { AuditTask } from '../types/index';
import { api } from '../services/api';

interface AuditProgressPageProps {
  taskId?: number;
  taskIds?: number[];
  documents?: Array<{ document_path: string; document_name: string }>;
  auditType?: 'draft' | 'revision' | 'current';
  mode?: 'single' | 'batch' | 'compare';
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function AuditProgressPage({ taskId, taskIds, documents, auditType = 'draft', onNavigate }: AuditProgressPageProps) {
  const [tasks, setTasks] = useState<AuditTask[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (taskId) {
      loadSingleTask(taskId);
    } else if (taskIds && taskIds.length > 0) {
      loadMultipleTasks(taskIds);
    }
  }, [taskId, taskIds]);

  useEffect(() => {
    if (tasks.length === 0) return;

    // 启动定时器更新进度
    const progressInterval = setInterval(() => {
      updateTaskProgress();
    }, 2000);

    // 启动计时器
    const timeInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(timeInterval);
    };
  }, [tasks.length]); // 只依赖数组长度，避免频繁重建

  const loadSingleTask = async (id: number) => {
    try {
      setLoading(true);
      const task = await api.getAuditTask(id);
      setTasks([task]);
      
      // 如果任务状态是pending，需要先启动
      if (task.status === 'pending') {
        await api.startAudit(id);
        // 更新任务状态
        const updatedTask = await api.getAuditTask(id);
        setTasks([updatedTask]);
        
        // 开始流式获取审查结果
        startStreamingResult(id);
      } else if (task.status === 'analyzing') {
        // 已经在分析中，直接流式获取
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
      
      // 如果有文档信息，使用批量创建接口
      if (documents && documents.length > 0) {
        const result = await api.batchCreateAuditTasks({
          documents,
          audit_type: auditType,
          auto_start: true,
        });
        
        if (result.success && result.tasks) {
          setTasks(result.tasks);
          
          // 对每个已启动的任务开始流式获取
          for (const task of result.tasks) {
            if (task.status === 'analyzing') {
              startStreamingResult(task.id);
            }
          }
        }
      } else {
        // 使用原有方式：分别加载每个任务并启动
        const taskPromises = ids.map(async (id) => {
          const task = await api.getAuditTask(id);
          
          // 如果是pending状态，启动它
          if (task.status === 'pending') {
            await api.startAudit(id);
            return api.getAuditTask(id); // 获取更新后的状态
          }
          return task;
        });
        
        const loadedTasks = await Promise.all(taskPromises);
        setTasks(loadedTasks);
        setEstimatedTime(loadedTasks.length * 30);
        
        // 对每个分析中的任务启动流式获取
        loadedTasks.forEach((task) => {
          if (task.status === 'analyzing') {
            startStreamingResult(task.id);
          }
        });
      }
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
        
        // 更新任务进度
        if (chunk.progress !== undefined) {
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === id ? { ...t, progress: chunk.progress } : t)
          );
        }
        
        // 如果有状态更新
        if (chunk.status) {
          setTasks(prevTasks => 
            prevTasks.map(t => t.id === id ? { ...t, status: chunk.status } : t)
          );
        }
        
        if (chunk.is_end) break;
      }
      
      // 流式结束，标记任务完成
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === id ? { ...t, status: 'completed', progress: 100 } : t)
      );
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
        <div className="loading-container">
          <div className="loading-spinner large"></div>
          <p className="loading-text">正在加载任务信息...</p>
        </div>
      </div>
    );
  }

  const currentTask = tasks[currentTaskIndex];
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const overallProgress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

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
        <div className="batch-overview-card">
          <div className="overview-header">
            <div className="overview-title">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              <span>批量审查概览</span>
            </div>
            <div className="overview-stats">
              <span className="stat-item success">{completedCount} 已完成</span>
              <span className="stat-divider">/</span>
              <span className="stat-item total">{tasks.length} 总计</span>
            </div>
          </div>
          
          <div className="overall-progress-bar">
            <div className="progress-track">
              <div 
                className="progress-fill-animated" 
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
            <span className="progress-percentage">{overallProgress}%</span>
          </div>

          <div className="task-list-scroll">
            {tasks.map((task, index) => (
              <div
                key={task.id}
                className={`task-list-item ${index === currentTaskIndex ? 'active' : ''} ${task.status === 'completed' ? 'done' : ''}`}
                onClick={() => setCurrentTaskIndex(index)}
              >
                <div className="task-status-icon">
                  {task.status === 'completed' ? (
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                  ) : task.status === 'analyzing' ? (
                    <div className="pulse-dot"></div>
                  ) : (
                    <div className="waiting-dot"></div>
                  )}
                </div>
                <div className="task-info">
                  <span className="task-name-text">{task.document_name}</span>
                  <span className={`task-status-badge ${getStatusClass(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                </div>
                <div className="task-mini-progress">
                  <div className="mini-bar">
                    <div 
                      className="mini-fill" 
                      style={{ width: `${task.progress || 0}%` }}
                    ></div>
                  </div>
                  <span>{task.progress || 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {currentTask && (
        <div className="main-content-area">
          {/* 当前任务卡片 */}
          <div className="current-task-card">
            <div className="card-top">
              <div className="document-info">
                <div className="doc-icon">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <div className="doc-details">
                  <h2 className="doc-name">{currentTask.document_name}</h2>
                  <div className="doc-meta">
                    <span>ID: {currentTask.id}</span>
                    <span className="meta-separator">•</span>
                    <span>{new Date(currentTask.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className={`status-badge-large ${getStatusClass(currentTask.status)}`}>
                {getStatusText(currentTask.status)}
              </div>
            </div>

            {/* 进度步骤 */}
            <div className="steps-container">
              {getProgressSteps().map((step, index) => {
                const currentStep = getCurrentStep(currentTask);
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;

                return (
                  <div key={step.key} className={`step-wrapper ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''}`}>
                    <div className="step-node">
                      {isCompleted ? (
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      ) : (
                        <div className="step-number">{index + 1}</div>
                      )}
                      {isActive && <div className="step-glow"></div>}
                    </div>
                    <div className="step-content">
                      <span className="step-name">{step.label}</span>
                    </div>
                    {index < getProgressSteps().length - 1 && (
                      <div className={`step-connector ${index < currentStep ? 'connected' : ''}`}></div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 主进度条 */}
            <div className="main-progress-section">
              <div className="progress-label-row">
                <span className="label-text">总体进度</span>
                <div className="progress-value-display">
                  <span className="value-number">{currentTask.progress || 0}</span>
                  <span className="value-unit">%</span>
                </div>
              </div>
              
              <div className="main-progress-track">
                <div 
                  className="main-progress-fill"
                  style={{ width: `${currentTask.progress || 0}%` }}
                >
                  <div className="shine-effect"></div>
                </div>
              </div>

              <div className="time-info-row">
                <div className="time-item">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                  </svg>
                  <span>已用时: {formatTime(elapsedTime)}</span>
                </div>
                {estimatedTime > 0 && currentTask.status !== 'completed' && currentTask.status !== 'failed' && (
                  <div className="time-item estimated">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                    <span>预计剩余: ~{Math.ceil(estimatedTime * (1 - (currentTask.progress || 0) / 100))}秒</span>
                  </div>
                )}
              </div>
            </div>

            {/* 实时结果流 */}
            {currentTask.status === 'analyzing' && streamingContent && (
              <div className="streaming-section">
                <div className="streaming-header">
                  <div className="streaming-live-indicator">
                    <span className="live-dot"></span>
                    实时输出
                  </div>
                </div>
                <div className="streaming-body">
                  <pre className="streaming-text">{streamingContent}</pre>
                </div>
              </div>
            )}

            {/* 性能指标 */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-icon speed">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M13 2.03v2.02c4.39.54 7.5 4.53 6.96 8.97-.05.33.23.62.56.67.04 0 .09 0 .13.01.34.05.66-.19.71-.53C21.98 8.37 18.07 3.55 13 2.93V2.03zm0 18c-4.97 0-9-4.03-9-9 0-4.08 2.74-7.61 6.68-8.72.33-.09.53-.43.44-.76-.09-.33-.44-.53-.77-.44C5.82 2.35 2.73 6.57 2.73 11.5c0 5.65 4.59 10.24 10.24 10.24.36 0 .64-.29.64-.64 0-.36-.28-.64-.61-.64v-.43z"/>
                  </svg>
                </div>
                <div className="metric-data">
                  <div className="metric-value">&lt; 20s</div>
                  <div className="metric-label">首字响应</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon dimensions">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                  </svg>
                </div>
                <div className="metric-data">
                  <div className="metric-value">3 维度</div>
                  <div className="metric-label">合规·一致·形式</div>
                </div>
              </div>
              <div className="metric-card">
                <div className="metric-icon precision">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="metric-data">
                  <div className="metric-value">高精度</div>
                  <div className="metric-label">智能分析模式</div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="action-row">
              <button className="action-btn pause-btn" onClick={handlePause}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                暂停审查
              </button>
              <button className="action-btn cancel-btn" onClick={handleCancel}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
                取消任务
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}
