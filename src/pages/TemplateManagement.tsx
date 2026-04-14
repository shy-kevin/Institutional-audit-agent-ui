import { useState, useEffect } from 'react';
import { api, getCurrentUser } from '../services/api';

interface TemplateSection {
  id: string;
  level: number;
  title: string;
  description?: string;
  children?: TemplateSection[];
}

interface Template {
  id: string;
  name: string;
  category: string;
  description: string;
  format: {
    fontSize: string;
    fontFamily: string;
    lineHeight: string;
    margin: string;
  };
  sections: TemplateSection[];
  creator_id?: number;
  creator_name?: string;
  created_at: string;
  updated_at: string;
  is_public?: boolean;
  usage_count?: number;
  tags?: string[];
}

export function TemplateManagement() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Template>>({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (searchKeyword.trim()) {
      const timer = setTimeout(() => {
        loadTemplates(searchKeyword);
      }, 500);
      return () => clearTimeout(timer);
    }
    loadTemplates();
  }, [searchKeyword]);

  const loadTemplates = async (keyword?: string) => {
    try {
      setLoading(true);
      const result = await api.getTemplateList({
        keyword: keyword || searchKeyword,
        sort_by: 'updated_at',
        sort_order: 'desc',
        limit: 50
      });
      if (result.success && result.items) {
        setTemplates(result.items);
      }
    } catch (error) {
      console.error('加载模板列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    const currentUser = getCurrentUser();
    const newTemplate: Template = {
      id: '',
      name: '新模板',
      category: '自定义',
      description: '',
      format: {
        fontSize: '14px',
        fontFamily: '仿宋_GB2312',
        lineHeight: '1.75',
        margin: '2.54cm'
      },
      sections: [],
      creator_id: currentUser?.id,
      creator_name: currentUser?.username,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: false,
      usage_count: 0,
      tags: []
    };
    setSelectedTemplate(newTemplate);
    setEditForm(newTemplate);
    setIsEditing(true);
  };

  const handleSelectTemplate = async (template: Template) => {
    try {
      setLoading(true);
      const result = await api.getTemplate(template.id);
      if (result.success && result.template) {
        setSelectedTemplate(result.template);
        setEditForm(result.template);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('加载模板详情失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!editForm.name || !editForm.name.trim()) {
    alert('请输入模板名称');
    return;
    }

    try {
      setSaving(true);
      let result;

      if (selectedTemplate?.id && selectedTemplate.id !== '') {
        result = await api.updateTemplate(selectedTemplate.id, editForm);
      } else {
        result = await api.createTemplate(editForm);
      }

      if (result.success) {
        alert(selectedTemplate?.id ? '模板更新成功！' : '模板创建成功！');
        await loadTemplates();
        if (result.template) {
          setSelectedTemplate(result.template);
          setEditForm(result.template);
        }
        setIsEditing(false);
      } else {
        alert('保存失败，请重试');
      }
    } catch (error) {
      console.error('保存模板失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('确定要删除此模板吗？此操作不可恢复。')) return;

    try {
      setDeleting(true);
      const result = await api.deleteTemplate(templateId);
      if (result.success) {
        alert('模板删除成功！');
        await loadTemplates();
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
          setIsEditing(false);
        }
      } else {
        alert('删除失败，请重试');
      }
    } catch (error) {
      console.error('删除模板失败:', error);
      alert('删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const handleExportMarkdown = async () => {
    if (!selectedTemplate?.id) {
      alert('请先保存模板后再导出');
      return;
    }

    try {
      const result = await api.exportTemplateMarkdown(selectedTemplate.id, {
        include_metadata: true,
        include_format_section: true,
        include_creator_info: true
      });

      if (result.success && result.download_url) {
        window.open(`http://localhost:8000${result.download_url}`, '_blank');
      } else {
        alert('导出失败，请重试');
      }
    } catch (error) {
      console.error('导出Markdown失败:', error);
      alert('导出失败，请重试');
    }
  };

  const handleAddSection = (level: number) => {
    if (!editForm.sections) {
      setEditForm({ ...editForm, sections: [] });
    }

    const newSection: TemplateSection = {
      id: `section_${Date.now()}`,
      level,
      title: level === 1 ? `第${getChineseNumber((editForm.sections?.filter(s => s.level === 1).length || 0) + 1)}章` : `新条款`,
      description: '',
      children: level === 1 ? [] : undefined
    };

    if (level === 1) {
      setEditForm({
        ...editForm,
        sections: [...(editForm.sections || []), newSection]
      });
    } else {
      const lastChapter = editForm.sections?.filter(s => s.level === 1).slice(-1)[0];
      if (lastChapter) {
        const updatedSections = editForm.sections?.map(s => {
          if (s.id === lastChapter.id) {
            return {
              ...s,
              children: [...(s.children || []), { ...newSection, level: 2 }]
            };
          }
          return s;
        });
        setEditForm({ ...editForm, sections: updatedSections });
      }
    }
  };

  const handleUpdateSection = (sectionId: string, newTitle: string) => {
    const updateSections = (sections: TemplateSection[]): TemplateSection[] => {
      return sections.map(section => {
        if (section.id === sectionId) {
          return { ...section, title: newTitle };
        }
        if (section.children) {
          return { ...section, children: updateSections(section.children) };
        }
        return section;
      });
    };

    setEditForm({
      ...editForm,
      sections: updateSections(editForm.sections || [])
    });
  };

  const handleUpdateSectionDescription = (sectionId: string, newDescription: string) => {
    const updateSections = (sections: TemplateSection[]): TemplateSection[] => {
      return sections.map(section => {
        if (section.id === sectionId) {
          return { ...section, description: newDescription };
        }
        if (section.children) {
          return { ...section, children: updateSections(section.children) };
        }
        return section;
      });
    };

    setEditForm({
      ...editForm,
      sections: updateSections(editForm.sections || [])
    });
  };

  const handleDeleteSection = (sectionId: string) => {
    const deleteFromSections = (sections: TemplateSection[]): TemplateSection[] => {
      return sections.filter(section => {
        if (section.id === sectionId) return false;
        if (section.children) {
          section.children = deleteFromSections(section.children);
        }
        return true;
      });
    };

    setEditForm({
      ...editForm,
      sections: deleteFromSections(editForm.sections || [])
    });
  };

  const getChineseNumber = (num: number): string => {
    const chineseNumbers = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
    return chineseNumbers[num - 1] || num.toString();
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    t.category.toLowerCase().includes(searchKeyword.toLowerCase())
  );

  return (
    <div className="template-management-page">
      <div className="page-header">
        <h1>模板管理</h1>
        <p className="page-desc">创建和管理自定义制度模板，支持自定义标题、章节结构和格式设置</p>
      </div>

      <div className="template-management-content">
        {/* 左侧模板列表 */}
        <div className="template-list-panel">
          <div className="panel-header">
            <h3>模板列表</h3>
            <button className="btn-create-template" onClick={handleCreateNew}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              新建模板
            </button>
          </div>

          <div className="search-box">
            <input
              type="text"
              placeholder="搜索模板..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="template-list">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                加载中...
              </div>
            ) : filteredTemplates.length > 0 ? (
              filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className={`template-item ${selectedTemplate?.id === template.id ? 'active' : ''}`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="template-item-header">
                    <h4>{template.name}</h4>
                    <span className="template-category">{template.category}</span>
                  </div>
                  <p className="template-item-desc">{template.description || '暂无描述'}</p>
                  <div className="template-item-footer">
                    <span className="template-date">
                      {template.creator_name && `创建者: ${template.creator_name} | `}
                      {template.updated_at}
                    </span>
                    <div className="template-actions">
                      <button
                        className="btn-icon"
                        onClick={(e) => { e.stopPropagation(); handleSelectTemplate(template); handleEdit(); }}
                        title="编辑"
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={(e) => { e.stopPropagation(); handleDelete(template.id); }}
                        title="删除"
                        disabled={deleting}
                      >
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>暂无模板</p>
                <button className="btn-create-template" onClick={handleCreateNew}>创建第一个模板</button>
              </div>
            )}
          </div>
        </div>

        {/* 右侧编辑区域 */}
        <div className="template-editor-panel">
          {selectedTemplate ? (
            <>
              <div className="editor-header">
                <h3>{isEditing ? '编辑模板' : '模板详情'}</h3>
                <div className="editor-actions">
                  {isEditing ? (
                    <>
                      <button className="btn-cancel" onClick={() => { setIsEditing(false); setEditForm(selectedTemplate); }}>取消</button>
                      <button className="btn-save" onClick={handleSave} disabled={saving}>
                        {saving ? '保存中...' : '保存'}
                      </button>
                    </>
                  ) : (
                    <>
                      <button className="btn-edit" onClick={handleEdit}>编辑</button>
                      {selectedTemplate.id && (
                        <button className="btn-export" onClick={handleExportMarkdown}>导出Markdown</button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="editor-content">
                {/* 基本信息 */}
                <div className="form-section">
                  <h4 className="section-title">基本信息</h4>
                  <div className="form-group">
                    <label>模板标题</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        placeholder="请输入模板标题"
                        className="form-input"
                      />
                    ) : (
                      <p className="form-value">{selectedTemplate.name}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label>模板分类</label>
                    {isEditing ? (
                      <select
                        value={editForm.category || ''}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="form-select"
                      >
                        <option value="人事管理">人事管理</option>
                        <option value="财务管理">财务管理</option>
                        <option value="行政管理">行政管理</option>
                        <option value="业务流程">业务流程</option>
                        <option value="安全管理">安全管理</option>
                        <option value="自定义">自定义</option>
                      </select>
                    ) : (
                      <p className="form-value">{selectedTemplate.category}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label>模板描述</label>
                    {isEditing ? (
                      <textarea
                        value={editForm.description || ''}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        placeholder="请输入模板描述"
                        className="form-textarea"
                        rows={3}
                      />
                    ) : (
                      <p className="form-value">{selectedTemplate.description || '暂无描述'}</p>
                    )}
                  </div>

                  {!isEditing && selectedTemplate.creator_name && (
                    <div className="form-group">
                      <label>创建者</label>
                      <p className="form-value">{selectedTemplate.creator_name}</p>
                    </div>
                  )}
                </div>

                {/* 格式设置 */}
                <div className="form-section">
                  <h4 className="section-title">格式设置</h4>
                  <div className="format-settings">
                    <div className="form-group">
                      <label>字号</label>
                      {isEditing ? (
                        <select
                          value={editForm.format?.fontSize || '14px'}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            format: { ...editForm.format!, fontSize: e.target.value }
                          })}
                          className="form-select"
                        >
                          <option value="12px">12px (小五)</option>
                          <option value="14px">14px (小四)</option>
                          <option value="16px">16px (三号)</option>
                          <option value="18px">18px (二号)</option>
                        </select>
                      ) : (
                        <p className="form-value">{selectedTemplate.format.fontSize}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label>字体</label>
                      {isEditing ? (
                        <select
                          value={editForm.format?.fontFamily || '仿宋_GB2312'}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            format: { ...editForm.format!, fontFamily: e.target.value }
                          })}
                          className="form-select"
                        >
                          <option value="仿宋_GB2312">仿宋_GB2312</option>
                          <option value="宋体">宋体</option>
                          <option value="黑体">黑体</option>
                          <option value="楷体">楷体</option>
                        </select>
                      ) : (
                        <p className="form-value">{selectedTemplate.format.fontFamily}</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label>行距</label>
                      {isEditing ? (
                        <select
                          value={editForm.format?.lineHeight || '1.75'}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            format: { ...editForm.format!, lineHeight: e.target.value }
                          })}
                          className="form-select"
                        >
                          <option value="1.5">1.5倍</option>
                          <option value="1.75">1.75倍</option>
                          <option value="2">2倍</option>
                        </select>
                      ) : (
                        <p className="form-value">{selectedTemplate.format.lineHeight}倍</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label>页边距</label>
                      {isEditing ? (
                        <select
                          value={editForm.format?.margin || '2.54cm'}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            format: { ...editForm.format!, margin: e.target.value }
                          })}
                          className="form-select"
                        >
                          <option value="2.54cm">标准 (2.54cm)</option>
                          <option value="2cm">窄 (2cm)</option>
                          <option value="3cm">宽 (3cm)</option>
                        </select>
                      ) : (
                        <p className="form-value">{selectedTemplate.format.margin}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 章节结构 */}
                <div className="form-section">
                  <h4 className="section-title">
                    章节结构
                    {isEditing && (
                      <div className="section-actions">
                        <button className="btn-add-section" onClick={() => handleAddSection(1)}>
                          + 一级标题
                        </button>
                        <button className="btn-add-section" onClick={() => handleAddSection(2)}>
                          + 二级标题
                        </button>
                      </div>
                    )}
                  </h4>

                  <div className="sections-tree">
                    {(isEditing ? editForm.sections : selectedTemplate.sections)?.map(section => (
                      <div key={section.id} className="section-node">
                        <div className="section-header">
                          <span className="section-level">{section.level === 1 ? '章' : '条'}</span>
                          {isEditing ? (
                            <input
                              type="text"
                              value={section.title}
                              onChange={(e) => handleUpdateSection(section.id, e.target.value)}
                              className="section-input"
                            />
                          ) : (
                            <span className="section-title">{section.title}</span>
                          )}
                          {isEditing && (
                            <button
                              className="btn-delete-section"
                              onClick={() => handleDeleteSection(section.id)}
                              title="删除"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        {isEditing ? (
                          <input
                            type="text"
                            value={section.description || ''}
                            onChange={(e) => handleUpdateSectionDescription(section.id, e.target.value)}
                            placeholder="输入该章节的描述..."
                            className="section-description-input"
                          />
                        ) : (
                          section.description && (
                            <p className="section-description">{section.description}</p>
                          )
                        )}
                        {section.children && section.children.length > 0 && (
                          <div className="section-children">
                            {section.children.map(child => (
                              <div key={child.id} className="section-node child">
                                <div className="section-header">
                                  <span className="section-level">{child.level === 1 ? '章' : '条'}</span>
                                  {isEditing ? (
                                    <input
                                      type="text"
                                      value={child.title}
                                      onChange={(e) => handleUpdateSection(child.id, e.target.value)}
                                      className="section-input"
                                    />
                                  ) : (
                                    <span className="section-title">{child.title}</span>
                                  )}
                                  {isEditing && (
                                    <button
                                      className="btn-delete-section"
                                      onClick={() => handleDeleteSection(child.id)}
                                      title="删除"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                                {isEditing ? (
                                  <input
                                    type="text"
                                    value={child.description || ''}
                                    onChange={(e) => handleUpdateSectionDescription(child.id, e.target.value)}
                                    placeholder="输入该条款的描述..."
                                    className="section-description-input"
                                  />
                                ) : (
                                  child.description && (
                                    <p className="section-description">{child.description}</p>
                                  )
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    {(!isEditing && selectedTemplate.sections.length === 0) && (
                      <p className="empty-hint">暂无章节，点击编辑添加</p>
                    )}
                    {(isEditing && (!editForm.sections || editForm.sections.length === 0)) && (
                      <p className="empty-hint">点击上方按钮添加章节</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-editor">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="#d9d9d9">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
              <p>选择或创建一个模板开始编辑</p>
              <button className="btn-create-template" onClick={handleCreateNew}>创建新模板</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
