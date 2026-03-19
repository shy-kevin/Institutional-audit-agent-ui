import { useState, useEffect } from 'react';
import type { Rule } from '../types/index';
import { api } from '../services/api';

interface RuleManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rules: Rule[];
  onRefresh: () => void;
}

export function RuleManagerModal({
  isOpen,
  onClose,
  rules,
  onRefresh,
}: RuleManagerModalProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    rule_type: 'global' as 'global' | 'conversation',
    category: '',
    priority: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      onRefresh();
    } else {
      setShowForm(false);
      setEditingRule(null);
      resetForm();
    }
  }, [isOpen, onRefresh]);

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      rule_type: 'global',
      category: '',
      priority: 0,
    });
  };

  const handleCreateNew = () => {
    setEditingRule(null);
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule);
    setFormData({
      title: rule.title,
      content: rule.content,
      rule_type: rule.rule_type,
      category: rule.category,
      priority: rule.priority,
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('请填写规则标题和内容');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRule) {
        await api.updateRule(editingRule.id, {
          title: formData.title.trim(),
          content: formData.content.trim(),
          rule_type: formData.rule_type,
          category: formData.category.trim() || undefined,
          priority: formData.priority,
        });
      } else {
        await api.createRule({
          title: formData.title.trim(),
          content: formData.content.trim(),
          rule_type: formData.rule_type,
          category: formData.category.trim() || undefined,
          priority: formData.priority,
        });
      }
      setShowForm(false);
      setEditingRule(null);
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Failed to save rule:', error);
      alert('保存失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这条规则吗？')) return;
    try {
      await api.deleteRule(id);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      alert('删除失败');
    }
  };

  const handleToggle = async (rule: Rule) => {
    try {
      await api.toggleRule(rule.id);
      onRefresh();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      alert('操作失败');
    }
  };

  const filteredRules = rules.filter((rule) => {
    if (filterType !== 'all' && rule.rule_type !== filterType) return false;
    if (filterActive === 'active' && !rule.is_active) return false;
    if (filterActive === 'inactive' && rule.is_active) return false;
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content rule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>规则管理</h2>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {showForm ? (
            <div className="rule-form-section">
              <h3>{editingRule ? '编辑规则' : '创建新规则'}</h3>
              <div className="rule-form">
                <div className="form-group">
                  <label>规则标题 *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="输入规则标题"
                  />
                </div>
                <div className="form-group">
                  <label>规则内容 *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="输入规则内容"
                    rows={4}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>规则类型</label>
                    <select
                      value={formData.rule_type}
                      onChange={(e) => setFormData({ ...formData, rule_type: e.target.value as 'global' | 'conversation' })}
                    >
                      <option value="global">全局规则</option>
                      <option value="conversation">对话规则</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>分类</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="如：审计规则"
                    />
                  </div>
                  <div className="form-group">
                    <label>优先级</label>
                    <input
                      type="number"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                      min={0}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    className="cancel-btn"
                    onClick={() => {
                      setShowForm(false);
                      setEditingRule(null);
                      resetForm();
                    }}
                  >
                    取消
                  </button>
                  <button
                    className="submit-btn"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '保存中...' : (editingRule ? '更新' : '创建')}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rule-toolbar">
                <button className="create-btn" onClick={handleCreateNew}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                  <span>新建规则</span>
                </button>
                <div className="filter-group">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">全部类型</option>
                    <option value="global">全局规则</option>
                    <option value="conversation">对话规则</option>
                  </select>
                  <select
                    value={filterActive}
                    onChange={(e) => setFilterActive(e.target.value)}
                  >
                    <option value="all">全部状态</option>
                    <option value="active">已启用</option>
                    <option value="inactive">已禁用</option>
                  </select>
                </div>
              </div>

              <div className="rule-list-section">
                {filteredRules.length === 0 ? (
                  <div className="empty-list">暂无规则</div>
                ) : (
                  <div className="rule-list">
                    {filteredRules.map((rule) => (
                      <div key={rule.id} className={`rule-item ${!rule.is_active ? 'inactive' : ''}`}>
                        <div className="rule-header">
                          <div className="rule-title-row">
                            <span className={`rule-type-badge ${rule.rule_type}`}>
                              {rule.rule_type === 'global' ? '全局' : '对话'}
                            </span>
                            <span className="rule-title">{rule.title}</span>
                            <span className={`rule-status ${rule.is_active ? 'active' : 'inactive'}`}>
                              {rule.is_active ? '启用' : '禁用'}
                            </span>
                          </div>
                          <div className="rule-meta">
                            {rule.category && <span className="rule-category">{rule.category}</span>}
                            <span className="rule-priority">优先级: {rule.priority}</span>
                          </div>
                        </div>
                        <div className="rule-content">{rule.content}</div>
                        <div className="rule-actions">
                          <button
                            className="action-btn toggle"
                            onClick={() => handleToggle(rule)}
                            title={rule.is_active ? '禁用' : '启用'}
                          >
                            {rule.is_active ? (
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            ) : (
                              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
                              </svg>
                            )}
                          </button>
                          <button
                            className="action-btn edit"
                            onClick={() => handleEdit(rule)}
                            title="编辑"
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDelete(rule.id)}
                            title="删除"
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
