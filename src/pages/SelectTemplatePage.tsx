import { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { SystemDocumentType } from '../types/index';

interface SelectTemplatePageProps {
  onNext: (data: { templateId: number; templateName: string; documentType: string }) => void;
  onBack: () => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  '人事管理': '👥',
  '财务管理': '💰',
  '行政管理': '📋',
  '业务流程': '📦',
  '安全管理': '🔒',
  '安全': '⚕️',
};

const DEFAULT_TEMPLATES = [
  {
    id: 1,
    name: '员工考勤管理制度',
    type: '人事管理',
    category: '行政制度',
    icon: '👥',
    description: '规范员工考勤管理，明确考勤时间、请假流程、迟到早退处理等规定，适用于各类企业。',
  },
  {
    id: 2,
    name: '招聘管理制度',
    type: '人事管理',
    category: '人事制度',
    icon: '📋',
    description: '规范招聘流程，明确岗位需求、面试流程、录用标准，适用于人力资源部门使用。',
  },
  {
    id: 3,
    name: '工伤伤害管理制度',
    type: '安全管理',
    category: '行政制度',
    icon: '⚕️',
    description: '明确工伤认定流程、伤害等级评定、医疗费用报销等规定，保障员工权益。',
  },
  {
    id: 4,
    name: '薪酬福利管理制度',
    type: '财务管理',
    category: '财务制度',
    icon: '💰',
    description: '规范薪酬结构、奖金发放、社保公积金缴纳、福利待遇等管理规定。',
  },
  {
    id: 5,
    name: '采购管理制度',
    type: '业务流程',
    category: '行政制度',
    icon: '📦',
    description: '规范采购申请、审批流程、供应商管理、验收标准等业务操作流程。',
  },
  {
    id: 6,
    name: '数据安全管理制度',
    type: '安全管理',
    category: '人事制度',
    icon: '🔒',
    description: '明确数据分类分级、访问权限控制、安全审计、应急响应等安全管理要求。',
  },
];

function mapApiTemplateToDisplay(apiTemplate: any) {
  return {
    id: apiTemplate.id || apiTemplate.template_id,
    name: apiTemplate.name,
    type: apiTemplate.category || apiTemplate.type || '其他',
    category: apiTemplate.category || '',
    icon: CATEGORY_ICONS[apiTemplate.category] || CATEGORY_ICONS[apiTemplate.type] || '📄',
    description: apiTemplate.description || '',
    creator_name: apiTemplate.creator_name,
    created_at: apiTemplate.created_at,
    usage_count: apiTemplate.usage_count || 0,
    is_public: apiTemplate.is_public,
  };
}

export function SelectTemplatePage({ onNext, onBack }: SelectTemplatePageProps) {
  const [templates, setTemplates] = useState<any[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [documentType, setDocumentType] = useState<string>('全部');
  const [customName, setCustomName] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);

  useEffect(() => {
    loadTemplates();
  }, [documentType]);

  useEffect(() => {
    if (searchKeyword.trim()) {
      searchTemplates();
    } else {
      loadTemplates();
    }
  }, [searchKeyword]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (documentType && documentType !== '全部') {
        params.category = documentType;
      }
      const result = await api.getTemplateList(params);
      if (result.success && result.items?.length > 0) {
        const mappedTemplates = result.items.map(mapApiTemplateToDisplay);
        setTemplates(mappedTemplates);
      } else {
        setTemplates(DEFAULT_TEMPLATES);
      }
    } catch (error) {
      console.error('加载模板列表失败:', error);
      setTemplates(DEFAULT_TEMPLATES);
    } finally {
      setLoading(false);
    }
  };

  const searchTemplates = async () => {
    try {
      setLoading(true);
      if (searchKeyword.trim()) {
        const params: any = { 
          keyword: searchKeyword.trim(),
          limit: 50 
        };
        if (documentType && documentType !== '全部') {
          params.category = documentType;
        }
        const result = await api.getTemplateList(params);
        if (result.success && result.items?.length > 0) {
          const mappedTemplates = result.items.map(mapApiTemplateToDisplay);
          setTemplates(mappedTemplates);
        } else {
          setTemplates([]);
        }
      } else {
        await loadTemplates();
      }
    } catch (error) {
      console.error('搜索模板失败:', error);
      const filtered = DEFAULT_TEMPLATES.filter(t =>
        t.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        t.description.toLowerCase().includes(searchKeyword.toLowerCase())
      );
      setTemplates(filtered.length > 0 ? filtered : DEFAULT_TEMPLATES);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (templateId: number) => {
    setSelectedTemplate(templateId);
  };

  const handlePreview = async (e: React.MouseEvent, templateId: any) => {
    e.stopPropagation();
    try {
      setPreviewLoading(true);
      setShowPreviewModal(true);
      setPreviewTemplate(null);

      const result = await api.getTemplate(String(templateId));
      if (result.success && result.template) {
        setPreviewTemplate(result.template);
      } else {
        const localTemplate = templates.find(t => t.id === templateId) || DEFAULT_TEMPLATES.find(t => t.id === templateId);
        setPreviewTemplate(localTemplate || null);
      }
    } catch (error) {
      console.error('获取模板详情失败:', error);
      const localTemplate = templates.find(t => t.id === templateId) || DEFAULT_TEMPLATES.find(t => t.id === templateId);
      setPreviewTemplate(localTemplate || null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreviewModal = () => {
    setShowPreviewModal(false);
    setPreviewTemplate(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const result = await api.uploadCustomTemplate(file, customName || file.name.replace(/\.[^/.]+$/, ''), documentType);
        if (result.template_id) {
          alert(`自定义模板上传成功！模板ID: ${result.template_id}`);
          setSelectedTemplate(result.template_id);
          loadTemplates();
        }
      } catch (error) {
        console.error('上传模板失败:', error);
        alert('上传模板失败，请重试');
      }
    }
  };

  const handleNext = () => {
    if (selectedTemplate === null && !customName.trim()) {
      alert('请选择模板或输入自定义名称');
      return;
    }

    const selected = templates.find(t => t.id === selectedTemplate) || DEFAULT_TEMPLATES.find(t => t.id === selectedTemplate);
    onNext({
      templateId: selectedTemplate || 0,
      templateName: customName || selected?.name || '',
      documentType
    });
  };

  return (
    <div className="template-selection-page">
      {/* 步骤指示器 */}
      <div className="step-indicator">
        <div className="step active">
          <div className="step-circle">1</div>
          <span>选择模板</span>
        </div>
        <div className="step-line"></div>
        <div className="step">
          <div className="step-circle">2</div>
          <span>关联上下位</span>
        </div>
        <div className="step-line"></div>
        <div className="step">
          <div className="step-circle">3</div>
          <span>上传资料</span>
        </div>
        <div className="step-line"></div>
        <div className="step">
          <div className="step-circle">4</div>
          <span>撰写生成</span>
        </div>
        <div className="step-line"></div>
        <div className="step">
          <div className="step-circle">5</div>
          <span>编辑完善</span>
        </div>
      </div>

      <div className="page-content-area">
        <h2 className="section-title">选择制制类型</h2>
        <p className="section-desc">请根据您需要创建的制度类型来选择合适的模板或创建新模板</p>

        {/* 筛选区域 */}
        <div className="filter-row">
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="type-select"
          >
            <option value="全部">全部</option>
            <option value="行政制度">行政制度</option>
            <option value="人事制度">人事制度</option>
            <option value="财务制度">财务制度</option>
          </select>

          <input
            type="text"
            placeholder="+ 添加分类"
            className="add-category-input"
          />

          <button className="btn-filter-primary" onClick={() => { setDocumentType('全部'); setSearchKeyword(''); }}>显示全部类型</button>
        </div>

        {/* 推荐模板 */}
        <div className="templates-section">
          <div className="section-header-row">
            <h3>推荐模板</h3>
            <input
              type="text"
              placeholder="输入关键字搜索模板..."
              className="search-input"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
            />
          </div>

          <div className="templates-grid">
            {loading ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
                <div className="loading-spinner-outline" style={{ margin: '0 auto' }}></div>
                <p style={{ marginTop: '16px', color: '#999' }}>加载模板中...</p>
              </div>
            ) : templates.length > 0 ? (
              templates.map((template) => (
                <div
                  key={template.id}
                  className={`template-card ${selectedTemplate === template.id ? 'selected' : ''}`}
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  <div className="template-icon">{template.icon || '📄'}</div>
                  <div className="template-info">
                    <h4 className="template-name">{template.name}</h4>
                    <p className="template-type-badge">{template.type}</p>
                    <p className="template-desc">{template.description}</p>
                  </div>
                  <div className="template-actions">
                    <button className="btn-template-preview" onClick={(e) => handlePreview(e, template.id)}>预览</button>
                    <button className={`btn-template-select ${selectedTemplate === template.id ? 'active' : ''}`}>
                      选择
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#999' }}>
                暂无匹配的模板
              </div>
            )}
          </div>
        </div>

        {/* 自定义模板上传 */}
        <div className="upload-section">
          <h3>自定义模板</h3>
          <div className="upload-box">
            <div className="upload-icon-wrapper">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor" color="#1890ff">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
              </svg>
            </div>
            <p className="upload-title">上传自定义文档文件</p>
            <p className="upload-hint">支持 Word、Excel、PDF 等格式文档上传</p>
            <p className="upload-warning">
              ⚠️ 请注意：仅支持上传格式，请勿上传敏感信息。若需一键创建请点击下方按钮。
            </p>
            <input
              id="custom-template-upload"
              type="file"
              accept=".doc,.docx,.pdf"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <button
              className="btn-next"
              style={{ marginTop: '16px' }}
              onClick={() => document.getElementById('custom-template-upload')?.click()}
            >
              上传自定义模板
            </button>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="bottom-actions">
          <button className="btn-back" onClick={onBack}>取消</button>
          <button className="btn-next" onClick={handleNext} disabled={loading}>下一步 →</button>
        </div>
      </div>

      {showPreviewModal && (
        <div className="template-preview-modal-overlay" onClick={closePreviewModal}>
          <div className="template-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-modal-header">
              <h3>模板详情预览</h3>
              <button className="preview-modal-close" onClick={closePreviewModal}>×</button>
            </div>
            <div className="preview-modal-body">
              {previewLoading ? (
                <div className="preview-loading">
                  <div className="loading-spinner-outline"></div>
                  <p>加载模板详情中...</p>
                </div>
              ) : previewTemplate ? (
                <div className="preview-content">
                  <div className="preview-basic-info">
                    <div className="preview-title-row">
                      <span className="preview-icon">{CATEGORY_ICONS[previewTemplate.category] || previewTemplate.icon || '📄'}</span>
                      <h2>{previewTemplate.name}</h2>
                    </div>
                    <div className="preview-meta-tags">
                      <span className="meta-tag category">{previewTemplate.category || previewTemplate.type}</span>
                      {previewTemplate.is_public && <span className="meta-tag public">公开</span>}
                      {previewTemplate.usage_count > 0 && <span className="meta-tag usage">使用 {previewTemplate.usage_count} 次</span>}
                    </div>
                    <p className="preview-description">{previewTemplate.description || '暂无描述'}</p>
                  </div>

                  {previewTemplate.creator_name && (
                    <div className="preview-section">
                      <h4>创建信息</h4>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">创建人</span>
                          <span className="info-value">{previewTemplate.creator_name}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">创建时间</span>
                          <span className="info-value">{previewTemplate.created_at ? new Date(previewTemplate.created_at).toLocaleString('zh-CN') : '-'}</span>
                        </div>
                        {previewTemplate.updated_at && (
                          <div className="info-item">
                            <span className="info-label">更新时间</span>
                            <span className="info-value">{new Date(previewTemplate.updated_at).toLocaleString('zh-CN')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {previewTemplate.format && (
                    <div className="preview-section">
                      <h4>格式设置</h4>
                      <div className="format-grid">
                        {previewTemplate.format.fontSize && (
                          <div className="format-item">
                            <span className="format-label">字号</span>
                            <span className="format-value">{previewTemplate.format.fontSize}</span>
                          </div>
                        )}
                        {previewTemplate.format.fontFamily && (
                          <div className="format-item">
                            <span className="format-label">字体</span>
                            <span className="format-value">{previewTemplate.format.fontFamily}</span>
                          </div>
                        )}
                        {previewTemplate.format.lineHeight && (
                          <div className="format-item">
                            <span className="format-label">行距</span>
                            <span className="format-value">{previewTemplate.format.lineHeight}</span>
                          </div>
                        )}
                        {previewTemplate.format.margin && (
                          <div className="format-item">
                            <span className="format-label">页边距</span>
                            <span className="format-value">{previewTemplate.format.margin}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {previewTemplate.sections && previewTemplate.sections.length > 0 && (
                    <div className="preview-section">
                      <h4>章节结构</h4>
                      <div className="sections-tree">
                        {previewTemplate.sections.map((section: any, index: number) => (
                          <div key={section.id || index} className={`section-item level-${section.level}`}>
                            <span className="section-title">
                              {section.level === 1 ? '📗' : '📄'} {section.title}
                            </span>
                            {section.description && (
                              <span className="section-desc">{section.description}</span>
                            )}
                            {section.children && section.children.length > 0 && (
                              <div className="section-children">
                                {section.children.map((child: any, childIndex: number) => (
                                  <div key={child.id || childIndex} className="section-child">
                                    <span className="section-title">📄 {child.title}</span>
                                    {child.description && (
                                      <span className="section-desc">{child.description}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewTemplate.tags && previewTemplate.tags.length > 0 && (
                    <div className="preview-section">
                      <h4>标签</h4>
                      <div className="tags-list">
                        {previewTemplate.tags.map((tag: string, index: number) => (
                          <span key={index} className="tag-item">{tag}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="preview-empty">
                  <p>无法加载模板详情</p>
                </div>
              )}
            </div>
            <div className="preview-modal-footer">
              <button className="btn-back" onClick={closePreviewModal}>关闭</button>
              <button 
                className="btn-next" 
                onClick={() => {
                  if (previewTemplate) {
                    setSelectedTemplate(previewTemplate.id);
                    closePreviewModal();
                  }
                }}
              >
                选择此模板
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
