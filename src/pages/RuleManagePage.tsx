import { useState, useEffect } from 'react';
import type { Rule } from '../types/index';
import { api } from '../services/api';

interface RuleManagePageProps {
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function RuleManagePage({ onNavigate }: RuleManagePageProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    rule_type: 'global' as 'global' | 'conversation',
    category: '',
    priority: 5,
  });
  const [filters, setFilters] = useState({
    rule_type: 'all',
    category: '',
    is_active: 'all',
    keyword: '',
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const params: Record<string, unknown> = {};
      if (filters.rule_type !== 'all') params.rule_type = filters.rule_type;
      if (filters.category) params.category = filters.category;
      if (filters.is_active !== 'all') params.is_active = filters.is_active === 'true';
      
      const data = await api.getRules(params);
      let items = data.items || [];
      
      if (filters.keyword) {
        items = items.filter((rule: Rule) =>
          rule.title.toLowerCase().includes(filters.keyword.toLowerCase()) ||
          rule.content.toLowerCase().includes(filters.keyword.toLowerCase())
        );
      }
      
      setRules(items);
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('请填写规则标题和内容');
      return;
    }

    try {
      if (editingRule) {
        await api.updateRule(editingRule.id, formData);
      } else {
        await api.createRule(formData);
      }
      setShowCreateModal(false);
      setEditingRule(null);
      setFormData({
        title: '',
        content: '',
        rule_type: 'global',
        category: '',
        priority: 5,
      });
      loadRules();
    } catch (error) {
      console.error('Failed to save rule:', error);
      alert('保存规则失败');
    }
  };

  const handleEdit = (rule: Rule) => {
    setEditingRule(rule);
    setFormData({
      title: rule.title,
      content: rule.content,
      rule_type: rule.rule_type,
      category: rule.category || '',
      priority: rule.priority,
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除此规则吗？')) return;

    try {
      await api.deleteRule(id);
      loadRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
      alert('删除失败');
    }
  };

  const handleToggle = async (id: number) => {
    try {
      await api.toggleRule(id);
      loadRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
      alert('操作失败');
    }
  };

  const getRuleTypeText = (type: string) => {
    const typeMap: Record<string, string> = {
      global: '全局规则',
      conversation: '对话规则',
    };
    return typeMap[type] || type;
  };

  const getRuleTypeClass = (type: string) => {
    const classMap: Record<string, string> = {
      global: 'rule-type-global',
      conversation: 'rule-type-conversation',
    };
    return classMap[type] || '';
  };

  const getPriorityText = (priority: number) => {
    if (priority >= 8) return '高';
    if (priority >= 5) return '中';
    return '低';
  };

  const getPriorityClass = (priority: number) => {
    if (priority >= 8) return 'rule-priority-high';
    if (priority >= 5) return 'rule-priority-medium';
    return 'rule-priority-low';
  };

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.is_active).length,
    global: rules.filter(r => r.rule_type === 'global').length,
    conversation: rules.filter(r => r.rule_type === 'conversation').length,
  };

  if (loading) {
    return (
      <div className="rule-manage-page loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="rule-manage-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('dashboard')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>规则管理</h1>
          <p>配置和管理制度审查的规则库，支持自定义审查维度和标准</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span>创建规则</span>
          </button>
        </div>
      </div>

      <div className="rule-stats-row">
        <div className="rule-stat-card rule-stat-total">
          <div className="rule-stat-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
            </svg>
          </div>
          <div className="rule-stat-info">
            <div className="rule-stat-value">{stats.total}</div>
            <div className="rule-stat-label">规则总数</div>
          </div>
        </div>
        <div className="rule-stat-card rule-stat-active">
          <div className="rule-stat-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
          </div>
          <div className="rule-stat-info">
            <div className="rule-stat-value">{stats.active}</div>
            <div className="rule-stat-label">已启用</div>
          </div>
        </div>
        <div className="rule-stat-card rule-stat-global">
          <div className="rule-stat-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
          </div>
          <div className="rule-stat-info">
            <div className="rule-stat-value">{stats.global}</div>
            <div className="rule-stat-label">全局规则</div>
          </div>
        </div>
        <div className="rule-stat-card rule-stat-conversation">
          <div className="rule-stat-icon">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            </svg>
          </div>
          <div className="rule-stat-info">
            <div className="rule-stat-value">{stats.conversation}</div>
            <div className="rule-stat-label">对话规则</div>
          </div>
        </div>
      </div>

      <div className="rule-filter-section">
        <div className="rule-filter-row">
          <div className="rule-filter-group rule-search-group">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="rule-search-icon">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => setFilters({ ...filters, keyword: e.target.value })}
              placeholder="搜索规则标题或内容..."
              className="rule-search-input"
            />
          </div>
          <div className="rule-filter-group">
            <select
              value={filters.rule_type}
              onChange={(e) => setFilters({ ...filters, rule_type: e.target.value })}
              className="rule-filter-select"
            >
              <option value="all">全部类型</option>
              <option value="global">全局规则</option>
              <option value="conversation">对话规则</option>
            </select>
          </div>
          <div className="rule-filter-group">
            <select
              value={filters.is_active}
              onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
              className="rule-filter-select"
            >
              <option value="all">全部状态</option>
              <option value="true">已启用</option>
              <option value="false">已禁用</option>
            </select>
          </div>
          <button className="rule-refresh-btn" onClick={loadRules}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
            刷新
          </button>
        </div>
      </div>

      <div className="rule-content">
        {rules.length === 0 ? (
          <div className="rule-empty-state">
            <div className="rule-empty-icon">
              <svg viewBox="0 0 24 24" width="80" height="80" fill="currentColor">
                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
              </svg>
            </div>
            <h3>暂无规则</h3>
            <p>点击上方"创建规则"按钮添加您的第一个审查规则</p>
          </div>
        ) : (
          <div className="rule-table-container">
            <table className="rule-table">
              <thead>
                <tr>
                  <th className="rule-col-title">规则标题</th>
                  <th className="rule-col-type">类型</th>
                  <th className="rule-col-category">分类</th>
                  <th className="rule-col-priority">优先级</th>
                  <th className="rule-col-status">状态</th>
                  <th className="rule-col-time">创建时间</th>
                  <th className="rule-col-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className={`rule-row ${!rule.is_active ? 'rule-row-disabled' : ''}`}>
                    <td className="rule-col-title">
                      <div className="rule-title-cell">
                        <div className="rule-title-text">{rule.title}</div>
                        <div className="rule-content-preview">{rule.content.substring(0, 80)}...</div>
                      </div>
                    </td>
                    <td className="rule-col-type">
                      <span className={`rule-type-badge ${getRuleTypeClass(rule.rule_type)}`}>
                        {getRuleTypeText(rule.rule_type)}
                      </span>
                    </td>
                    <td className="rule-col-category">
                      <span className="rule-category">{rule.category || '-'}</span>
                    </td>
                    <td className="rule-col-priority">
                      <span className={`rule-priority-badge ${getPriorityClass(rule.priority)}`}>
                        {getPriorityText(rule.priority)}
                      </span>
                    </td>
                    <td className="rule-col-status">
                      <span className={`rule-status-badge ${rule.is_active ? 'rule-status-active' : 'rule-status-inactive'}`}>
                        {rule.is_active ? '已启用' : '已禁用'}
                      </span>
                    </td>
                    <td className="rule-col-time">
                      <span className="rule-time">{new Date(rule.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="rule-col-actions">
                      <div className="rule-action-buttons">
                        <button
                          className="rule-action-btn rule-toggle-btn"
                          onClick={() => handleToggle(rule.id)}
                          title={rule.is_active ? '禁用' : '启用'}
                        >
                          {rule.is_active ? (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/>
                            </svg>
                          )}
                        </button>
                        <button
                          className="rule-action-btn rule-edit-btn"
                          onClick={() => handleEdit(rule)}
                          title="编辑"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                          </svg>
                        </button>
                        <button
                          className="rule-action-btn rule-delete-btn"
                          onClick={() => handleDelete(rule.id)}
                          title="删除"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false);
          setEditingRule(null);
          setFormData({
            title: '',
            content: '',
            rule_type: 'global',
            category: '',
            priority: 5,
          });
        }}>
          <div className="modal-content rule-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingRule ? '编辑规则' : '创建规则'}</h2>
              <button
                className="close-btn"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRule(null);
                  setFormData({
                    title: '',
                    content: '',
                    rule_type: 'global',
                    category: '',
                    priority: 5,
                  });
                }}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>规则标题 <span className="required">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="请输入规则标题"
                />
              </div>
              <div className="form-group">
                <label>规则内容 <span className="required">*</span></label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="请输入规则内容"
                  rows={6}
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
                    placeholder="输入分类（可选）"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>优先级</label>
                <div className="rule-priority-slider">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 5 })}
                    className="priority-range"
                  />
                  <div className="priority-labels">
                    <span>低 (1)</span>
                    <span className="priority-current">{formData.priority}</span>
                    <span>高 (10)</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingRule(null);
                  setFormData({
                    title: '',
                    content: '',
                    rule_type: 'global',
                    category: '',
                    priority: 5,
                  });
                }}
              >
                取消
              </button>
              <button className="btn-primary" onClick={handleCreate}>
                {editingRule ? '保存修改' : '创建规则'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
