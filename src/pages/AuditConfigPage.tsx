import { useState, useEffect } from 'react';
import type { AuditConfig, Checklist, DocumentUpload, KnowledgeBase } from '../types/index';
import { api } from '../services/api';

const DEFAULT_CONFIG_KEY = 'audit_default_config';

type AuditDimension = 'compliance' | 'consistency' | 'format' | 'version_compare';

interface SavedConfig {
  document_info: {
    department: string;
    version: string;
  };
  audit_dimensions: AuditDimension[];
  focus_keywords: string[];
  checklist_ids: number[];
  knowledge_base_ids: number[];
  granularity: 'full' | 'chapter';
  return_mode: 'stream' | 'complete';
  saved_at: string;
}

interface AuditConfigPageProps {
  taskId?: number;
  files?: DocumentUpload[];
  auditType?: 'draft' | 'revision' | 'current';
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function AuditConfigPage({ taskId, files, auditType = 'draft', onNavigate }: AuditConfigPageProps) {
  const [config, setConfig] = useState<Partial<AuditConfig>>({
    name: '',
    audit_dimensions: ['compliance', 'consistency', 'format'],
    focus_keywords: [],
    checklist_ids: [],
    is_default: false,
  });
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKnowledgeBaseIds, setSelectedKnowledgeBaseIds] = useState<number[]>([]);
  const [focusKeyword, setFocusKeyword] = useState('');
  const [documentInfo, setDocumentInfo] = useState({
    name: '',
    department: '',
    version: '',
  });
  const [granularity, setGranularity] = useState<'full' | 'chapter'>('full');
  const [returnMode, setReturnMode] = useState<'stream' | 'complete'>('stream');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadChecklists();
    loadKnowledgeBases();
    loadDefaultConfig();
    if (taskId) {
      loadTaskInfo();
    }
  }, [taskId]);

  const loadChecklists = async () => {
    try {
      const data = await api.getChecklists();
      setChecklists(data.items || []);
    } catch (error) {
      console.error('Failed to load checklists:', error);
    }
  };

  const loadKnowledgeBases = async () => {
    try {
      const data = await api.getKnowledgeBases();
      const completedBases = (data.items || []).filter(kb => kb.status === 'completed');
      setKnowledgeBases(completedBases);
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
    }
  };

  const loadDefaultConfig = () => {
    try {
      const savedConfigStr = localStorage.getItem(DEFAULT_CONFIG_KEY);
      if (savedConfigStr) {
        const savedConfig: SavedConfig = JSON.parse(savedConfigStr);
        
        const dimensions = (savedConfig.audit_dimensions || ['compliance', 'consistency', 'format']) as AuditDimension[];
        
        setConfig(prev => ({
          ...prev,
          audit_dimensions: dimensions,
          focus_keywords: savedConfig.focus_keywords || [],
          checklist_ids: savedConfig.checklist_ids || [],
        }));
        
        setDocumentInfo(prev => ({
          ...prev,
          department: savedConfig.document_info?.department || '',
          version: savedConfig.document_info?.version || '',
        }));
        
        setSelectedKnowledgeBaseIds(savedConfig.knowledge_base_ids || []);
        setGranularity(savedConfig.granularity || 'full');
        setReturnMode(savedConfig.return_mode || 'stream');
      }
    } catch (error) {
      console.error('Failed to load default config:', error);
    }
  };

  const saveDefaultConfig = () => {
    try {
      const configData: SavedConfig = {
        document_info: {
          department: documentInfo.department,
          version: documentInfo.version,
        },
        audit_dimensions: config.audit_dimensions || ['compliance', 'consistency', 'format'],
        focus_keywords: config.focus_keywords || [],
        checklist_ids: config.checklist_ids || [],
        knowledge_base_ids: selectedKnowledgeBaseIds,
        granularity: granularity,
        return_mode: returnMode,
        saved_at: new Date().toISOString(),
      };
      localStorage.setItem(DEFAULT_CONFIG_KEY, JSON.stringify(configData));
    } catch (error) {
      console.error('Failed to save default config:', error);
    }
  };

  const clearDefaultConfig = () => {
    try {
      localStorage.removeItem(DEFAULT_CONFIG_KEY);
    } catch (error) {
      console.error('Failed to clear default config:', error);
    }
  };

  const loadTaskInfo = async () => {
    try {
      setLoading(true);
      const task = await api.getAuditTask(taskId!);
      setDocumentInfo(prev => ({
        ...prev,
        name: task.document_name,
      }));
    } catch (error) {
      console.error('Failed to load task info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDimensionChange = (dimension: string) => {
    const dimensions = config.audit_dimensions || [];
    if (dimensions.includes(dimension as any)) {
      setConfig({
        ...config,
        audit_dimensions: dimensions.filter((d) => d !== dimension),
      });
    } else {
      setConfig({
        ...config,
        audit_dimensions: [...dimensions, dimension as any],
      });
    }
  };

  const handleAddKeyword = () => {
    if (focusKeyword.trim()) {
      const keywords = config.focus_keywords || [];
      if (!keywords.includes(focusKeyword.trim())) {
        setConfig({
          ...config,
          focus_keywords: [...keywords, focusKeyword.trim()],
        });
      }
      setFocusKeyword('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    const keywords = config.focus_keywords || [];
    setConfig({
      ...config,
      focus_keywords: keywords.filter((k) => k !== keyword),
    });
  };

  const handleChecklistChange = (checklistId: number) => {
    const checklistIds = config.checklist_ids || [];
    if (checklistIds.includes(checklistId)) {
      setConfig({
        ...config,
        checklist_ids: checklistIds.filter((id) => id !== checklistId),
      });
    } else {
      setConfig({
        ...config,
        checklist_ids: [...checklistIds, checklistId],
      });
    }
  };

  const handleKnowledgeBaseChange = (kbId: number) => {
    if (selectedKnowledgeBaseIds.includes(kbId)) {
      setSelectedKnowledgeBaseIds(selectedKnowledgeBaseIds.filter((id) => id !== kbId));
    } else {
      setSelectedKnowledgeBaseIds([...selectedKnowledgeBaseIds, kbId]);
    }
  };

  const handleSubmit = async () => {
    if (config.audit_dimensions?.length === 0) {
      alert('请至少选择一个审查维度');
      return;
    }

    if (config.is_default) {
      saveDefaultConfig();
    }

    setSubmitting(true);
    try {
      let configId: number;
      
      const savedConfig = await api.createAuditConfig({
        name: config.name || `配置_${new Date().toISOString()}`,
        audit_dimensions: config.audit_dimensions!,
        focus_keywords: config.focus_keywords,
        checklist_ids: config.checklist_ids || [],
        is_default: config.is_default || false,
        knowledge_base_ids: selectedKnowledgeBaseIds,
      });
      configId = savedConfig.id;

      if (taskId) {
        await api.startAudit(taskId, { 
          config_id: configId,
          knowledge_base_ids: selectedKnowledgeBaseIds,
        });
        onNavigate('progress', { taskId });
      } else if (files && files.length > 0) {
        const uploadPromises = files.map((doc) => api.uploadFile(doc.file));
        const uploadResults = await Promise.all(uploadPromises);
        
        const taskPromises = uploadResults.map((result) =>
          api.createAuditTask({
            document_path: result.file_path,
            document_name: result.file_name,
            audit_type: auditType,
            config_id: configId,
          })
        );
        const tasks = await Promise.all(taskPromises);
        
        await Promise.all(tasks.map((task) => api.startAudit(task.id, { 
          config_id: configId,
          knowledge_base_ids: selectedKnowledgeBaseIds,
        })));
        
        if (tasks.length === 1) {
          onNavigate('progress', { taskId: tasks[0].id });
        } else {
          onNavigate('progress', { taskIds: tasks.map((t) => t.id) });
        }
      }
    } catch (error) {
      console.error('Failed to start audit:', error);
      alert('启动审查失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetConfig = () => {
    if (confirm('确定要重置为默认配置吗？这将清除您保存的自定义配置。')) {
      clearDefaultConfig();
      setConfig({
        name: '',
        audit_dimensions: ['compliance', 'consistency', 'format'],
        focus_keywords: [],
        checklist_ids: [],
        is_default: false,
      });
      setDocumentInfo({
        name: '',
        department: '',
        version: '',
      });
      setSelectedKnowledgeBaseIds([]);
      setGranularity('full');
      setReturnMode('stream');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <div className="audit-config-page loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="audit-config-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('upload')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>审查配置</h1>
          <p>自定义审查范围、维度和重点</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleResetConfig}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
            重置配置
          </button>
        </div>
      </div>

      <div className="config-content">
        <div className="config-section">
          <h3>基础配置</h3>
          <div className="form-group">
            <label>制度名称</label>
            <input
              type="text"
              value={documentInfo.name}
              onChange={(e) => setDocumentInfo({ ...documentInfo, name: e.target.value })}
              placeholder="输入制度名称"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>所属部门</label>
              <input
                type="text"
                value={documentInfo.department}
                onChange={(e) => setDocumentInfo({ ...documentInfo, department: e.target.value })}
                placeholder="输入所属部门"
              />
            </div>
            <div className="form-group">
              <label>制度版本号</label>
              <input
                type="text"
                value={documentInfo.version}
                onChange={(e) => setDocumentInfo({ ...documentInfo, version: e.target.value })}
                placeholder="如：V1.0"
              />
            </div>
          </div>
        </div>

        <div className="config-section">
          <h3>知识库选择</h3>
          <p className="section-desc">选择用于审查参考的知识库（可多选）</p>
          {knowledgeBases.length === 0 ? (
            <div className="empty-knowledge-base">
              <p>暂无可用的知识库，请先在知识库管理中上传并完成处理</p>
              <button className="btn-secondary" onClick={() => onNavigate('knowledge-base')}>
                前往知识库管理
              </button>
            </div>
          ) : (
            <div className="knowledge-base-options">
              {knowledgeBases.map((kb) => (
                <label 
                  key={kb.id} 
                  className={`knowledge-base-option ${selectedKnowledgeBaseIds.includes(kb.id) ? 'active' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedKnowledgeBaseIds.includes(kb.id)}
                    onChange={() => handleKnowledgeBaseChange(kb.id)}
                  />
                  <div className="kb-option-content">
                    <div className="kb-option-icon">
                      <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                    </div>
                    <div className="kb-option-info">
                      <div className="kb-option-name">{kb.name}</div>
                      <div className="kb-option-meta">
                        <span>{kb.file_name}</span>
                        <span>{formatFileSize(kb.file_size)}</span>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
          {selectedKnowledgeBaseIds.length > 0 && (
            <p className="selected-count">已选择 {selectedKnowledgeBaseIds.length} 个知识库</p>
          )}
        </div>

        <div className="config-section">
          <h3>审查维度</h3>
          <p className="section-desc">选择需要进行审查的维度（至少选择一个）</p>
          <div className="dimension-options">
            <label className={`dimension-option ${config.audit_dimensions?.includes('compliance') ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={config.audit_dimensions?.includes('compliance')}
                onChange={() => handleDimensionChange('compliance')}
              />
              <div className="option-content">
                <div className="option-icon compliance">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                  </svg>
                </div>
                <div className="option-text">
                  <div className="option-title">合规性审查</div>
                  <div className="option-desc">检查与法律法规、规章制度的符合性</div>
                </div>
              </div>
            </label>

            <label className={`dimension-option ${config.audit_dimensions?.includes('consistency') ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={config.audit_dimensions?.includes('consistency')}
                onChange={() => handleDimensionChange('consistency')}
              />
              <div className="option-content">
                <div className="option-icon consistency">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
                  </svg>
                </div>
                <div className="option-text">
                  <div className="option-title">一致性审查</div>
                  <div className="option-desc">检查与上位制度、内部制度的一致性</div>
                </div>
              </div>
            </label>

            <label className={`dimension-option ${config.audit_dimensions?.includes('format') ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={config.audit_dimensions?.includes('format')}
                onChange={() => handleDimensionChange('format')}
              />
              <div className="option-content">
                <div className="option-icon format">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <div className="option-text">
                  <div className="option-title">形式审查</div>
                  <div className="option-desc">检查错别字、格式规范、逻辑清晰度</div>
                </div>
              </div>
            </label>

            <label className={`dimension-option ${config.audit_dimensions?.includes('version_compare') ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={config.audit_dimensions?.includes('version_compare')}
                onChange={() => handleDimensionChange('version_compare')}
              />
              <div className="option-content">
                <div className="option-icon version">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M10 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h5V3zm4 0v18h5c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-5z"/>
                  </svg>
                </div>
                <div className="option-text">
                  <div className="option-title">版本比对审查</div>
                  <div className="option-desc">对比新旧版本差异（需上传对比版本）</div>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="config-section">
          <h3>重点审查配置</h3>
          <div className="form-group">
            <label>自定义重点条款</label>
            <div className="keyword-input-group">
              <input
                type="text"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddKeyword()}
                placeholder="输入章节、关键词或条款号，按回车添加"
              />
              <button className="add-btn" onClick={handleAddKeyword}>
                添加
              </button>
            </div>
            {config.focus_keywords && config.focus_keywords.length > 0 && (
              <div className="keyword-tags">
                {config.focus_keywords.map((keyword, index) => (
                  <span key={index} className="keyword-tag">
                    {keyword}
                    <button onClick={() => handleRemoveKeyword(keyword)}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>审查清单选择</label>
            <div className="checklist-options">
              {checklists.map((checklist) => (
                <label key={checklist.id} className="checklist-option">
                  <input
                    type="checkbox"
                    checked={config.checklist_ids?.includes(checklist.id)}
                    onChange={() => handleChecklistChange(checklist.id)}
                  />
                  <div className="checklist-content">
                    <div className="checklist-name">{checklist.name}</div>
                    <div className="checklist-category">
                      {checklist.category === 'general' ? '通用类' : 
                       checklist.category === 'special' ? '专项类' : '特定场景类'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="config-section">
          <h3>高级配置</h3>
          <div className="form-row">
            <div className="form-group">
              <label>审查粒度</label>
              <select 
                value={granularity} 
                onChange={(e) => setGranularity(e.target.value as 'full' | 'chapter')}
              >
                <option value="full">全文审查</option>
                <option value="chapter">章节指定审查</option>
              </select>
            </div>
            <div className="form-group">
              <label>结果返回方式</label>
              <select 
                value={returnMode} 
                onChange={(e) => setReturnMode(e.target.value as 'stream' | 'complete')}
              >
                <option value="stream">流式返回</option>
                <option value="complete">完整返回</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={config.is_default}
                onChange={(e) => setConfig({ ...config, is_default: e.target.checked })}
              />
              <span>保存为默认配置</span>
            </label>
            <p className="form-hint">勾选后，当前配置将保存到浏览器本地，下次进入时自动加载</p>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button className="btn-secondary" onClick={() => onNavigate('upload')}>
          取消
        </button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '启动中...' : '开始审查'}
        </button>
      </div>
    </div>
  );
}
