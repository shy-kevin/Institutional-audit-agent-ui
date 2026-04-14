import { useState, useEffect } from 'react';
import { getCurrentUser, api } from '../services/api';
import type { SystemDocument, DocumentStatistics, UserPermission, SystemDocumentStatus, SystemDocumentType } from '../types/index';
import { SelectTemplatePage } from './SelectTemplatePage';
import { LinkRelatedDocumentsPage } from './LinkRelatedDocumentsPage';
import { UploadMaterialsPage } from './UploadMaterialsPage';
import { GenerateOutlinePage } from './GenerateOutlinePage';
import { EditAndCompletePage } from './EditAndCompletePage';

interface SmartDraftAssistantProps {
  onNavigate: (page: string) => void;
}

type CreationStep = 'main' | 'select-template' | 'link-documents' | 'upload-materials' | 'generate-outline' | 'edit-complete';

export function SmartDraftAssistant({ onNavigate }: SmartDraftAssistantProps) {
  const [currentStep, setCurrentStep] = useState<CreationStep>('main');
  const [creationData, setCreationData] = useState<any>({});
  const currentUser = getCurrentUser();
  const [statistics, setStatistics] = useState<DocumentStatistics>({
    total: 65,
    drafting_count: 12,
    drafting_week_new: 3,
    completed_count: 48,
    completed_month_count: 6,
    archived_count: 0,
    pending_review_count: 5
  });
  
  const [documents, setDocuments] = useState<SystemDocument[]>([
    {
      id: 1,
      name: '员工考勤管理制度',
      type: '人事管理',
      status: 'drafting',
      author: '张明',
      updated_at: '2026-04-02 16:30'
    },
    {
      id: 2,
      name: '招聘管理制度',
      type: '人事管理',
      status: 'drafting',
      author: '李华',
      updated_at: '2026-04-01 10:20'
    },
    {
      id: 3,
      name: '采购管理制度',
      type: '业务流程',
      status: 'published',
      author: '王强',
      updated_at: '2026-03-30 14:15'
    },
    {
      id: 4,
      name: '薪酬管理制度',
      type: '财务管理',
      status: 'pending_review',
      author: '陈丽',
      updated_at: '2026-03-29 11:00'
    },
    {
      id: 5,
      name: '数据安全管理制度',
      type: '安全管理',
      status: 'drafting',
      author: '赵芳',
      updated_at: '2026-03-28 09:45'
    }
  ]);
  
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  const [authSearchKeyword, setAuthSearchKeyword] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);

  useEffect(() => {
    loadStatistics();
    loadDocuments();
  }, []);

  const loadStatistics = async () => {
    try {
      const stats = await api.getDocumentStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const loadDocuments = async () => {
    try {
      const result = await api.getDocumentList({ keyword: searchKeyword });
      setDocuments(result.items || []);
    } catch (error) {
      console.error('加载文档列表失败:', error);
    }
  };

  const handleSearch = () => {
    loadDocuments();
  };

  const handleCreateNew = async () => {
    try {
      const result = await api.createDraftSession({
        template_id: 0,
        template_name: '',
        document_type: '',
        creator_id: currentUser?.id || 1,
      });
      if (result.success && result.draft_session) {
        setCreationData(prev => ({ ...prev, sessionId: result.draft_session.session_id }));
        setCurrentStep('select-template');
      }
    } catch (error) {
      console.error('创建草稿会话失败:', error);
      alert('创建草稿会话失败，请重试');
    }
  };

  const handleEdit = (docId: number) => {
    console.log('编辑制度:', docId);
  };

  const handleAuthorize = async (docId: number) => {
    setSelectedDocId(docId);
    setShowAuthModal(true);
    setSelectedUsers([]);
    try {
      const result = await api.getAvailableUsers(docId);
      setUserPermissions(result.items || []);
    } catch (error) {
      console.error('加载用户列表失败:', error);
    }
  };

  const handleUserSelect = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleTogglePermission = (userId: number, permission: 'can_view' | 'can_edit') => {
    setUserPermissions(prev =>
      prev.map(user =>
        user.id === userId
          ? { ...user, [permission]: !user[permission] }
          : user
      )
    );
  };

  const handleSubmitAuth = async () => {
    if (!selectedDocId) return;
    try {
      const permissions = userPermissions
        .filter(user => selectedUsers.includes(user.id))
        .map(user => ({
          user_id: user.id,
          can_view: user.can_view,
          can_edit: user.can_edit,
        }));

      const result = await api.setDocumentPermissions(selectedDocId, permissions);
      if (result.success) {
        alert(`权限设置成功，已影响 ${result.affected_users} 位用户`);
        setShowAuthModal(false);
      }
    } catch (error) {
      console.error('提交授权失败:', error);
      alert('提交授权失败，请重试');
    }
  };

  const getStatusText = (status: SystemDocumentStatus): string => {
    const map = {
      'drafting': '起草中',
      'pending_review': '待审核',
      'published': '已发布',
      'needs_revision': '待修改'
    };
    return map[status] || status;
  };

  const getStatusClass = (status: SystemDocumentStatus): string => {
    return `status-${status}`;
  };

  const formatDate = (): string => {
    const now = new Date();
    return `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日`;
  };

  return (
    <div className="smart-draft-assistant">
      {currentStep === 'main' && (
        <>
          {/* 页面头部 */}
          <div className="page-header-bar">
            <h1 className="page-title">智能编制助手</h1>
            <div className="header-right">
              <span className="date-display">{formatDate()}</span>
              <div className="user-info-mini">
                <span>{currentUser?.username || '用户'}</span>
                <div className="avatar-circle">{currentUser?.username?.[0]?.toUpperCase() || 'U'}</div>
              </div>
              <button className="btn-create" onClick={() => setCurrentStep('select-template')}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                </svg>
                新增制度
              </button>
            </div>
          </div>

          {/* 统计卡片区域 */}
          <div className="stats-cards-row">
            {/* ... 原有的统计卡片代码 ... */}
            <div className="stat-card total">
              <div className="stat-icon-wrapper blue">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">总数</div>
                <div className="stat-value">{statistics.total}</div>
              </div>
            </div>

            <div className="stat-card drafting">
              <div className="stat-icon-wrapper purple">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">起草中制度</div>
                <div className="stat-value">{statistics.drafting_count}</div>
                <div className="stat-sub-info">
                  <span className="highlight">本周新增 {statistics.drafting_week_new} 个</span>
                  <span>待审核集中</span>
                </div>
              </div>
            </div>

            <div className="stat-card completed">
              <div className="stat-icon-wrapper green">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">已完成制度</div>
                <div className="stat-value">{statistics.completed_count}</div>
                <div className="stat-sub-info">
                  <span className="success-text">本月完成 {statistics.completed_month_count} 个</span>
                  <span>已入档数</span>
                </div>
              </div>
            </div>

            <div className="stat-card pending">
              <div className="stat-icon-wrapper red">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-label">待审查制度</div>
                <div className="stat-value">{statistics.pending_review_count}</div>
                <div className="stat-sub-info warning-text">
                  需尽快处理
                </div>
              </div>
            </div>
          </div>

          {/* 我的制度列表 */}
          <div className="my-documents-section">
            {/* ... 原有列表代码 ... */}
            <div className="section-header">
              <div className="section-title">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0-4h14V7H7v2zm0 8h14v-2H7v2z"/>
                </svg>
                <span>我的制度</span>
              </div>
              <div className="search-box">
                <input
                  type="text"
                  placeholder="搜索制度名称..."
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button className="btn-search" onClick={handleSearch}>搜索</button>
              </div>
            </div>

            <div className="table-container">
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>制度名称</th>
                    <th>制度类型</th>
                    <th>状态</th>
                    <th>起草人</th>
                    <th>更新时间</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="doc-name-cell">{doc.name}</td>
                      <td>{doc.type}</td>
                      <td>
                        <span className={`status-badge ${getStatusClass(doc.status)}`}>
                          {getStatusText(doc.status)}
                        </span>
                      </td>
                      <td>{doc.author}</td>
                      <td>{doc.updated_at}</td>
                      <td>
                        <div className="action-links">
                          <button 
                            className="link-btn edit"
                            onClick={() => handleEdit(doc.id)}
                          >
                            编辑
                          </button>
                          <button 
                            className="link-btn auth"
                            onClick={() => handleAuthorize(doc.id)}
                          >
                            授权
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="table-footer">
                <span className="total-count">共 {documents.length} 条数据</span>
                <div className="pagination">
                  <button className="page-btn" disabled>上一页</button>
                  <button className="page-btn active">1</button>
                  <button className="page-btn">下一页</button>
                </div>
              </div>
            </div>
          </div>

          {/* 授权模态框 */}
          {showAuthModal && (
            <div className="modal-overlay" onClick={() => setShowAuthModal(false)}>
              <div className="modal-container auth-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header-custom">
                  <h3>选择授权用户</h3>
                  <button className="close-modal-btn" onClick={() => setShowAuthModal(false)}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                    </svg>
                  </button>
                </div>
                
                <div className="modal-search-area">
                  <input
                    type="text"
                    placeholder="请输入..."
                    value={authSearchKeyword}
                    onChange={(e) => setAuthSearchKeyword(e.target.value)}
                  />
                  <button className="btn-modal-search">搜索</button>
                  <button className="btn-reset" onClick={() => setAuthSearchKeyword('')}>重置</button>
                </div>

                <div className="users-table-wrapper">
                  <table className="users-auth-table">
                    <thead>
                      <tr>
                        <th className="checkbox-col"></th>
                        <th>用户名称</th>
                        <th>部门</th>
                        <th colSpan={2} className="permission-col">权限选择</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userPermissions.map((user) => (
                        <tr key={user.id}>
                          <td className="checkbox-col">
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user.id)}
                              onChange={() => handleUserSelect(user.id)}
                            />
                          </td>
                          <td>{user.username}</td>
                          <td>{user.department}</td>
                          <td className="perm-check-col">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={user.can_view}
                                onChange={() => handleTogglePermission(user.id, 'can_view')}
                                disabled={!selectedUsers.includes(user.id)}
                              />
                              <span>查看</span>
                            </label>
                          </td>
                          <td className="perm-check-col">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={user.can_edit}
                                onChange={() => handleTogglePermission(user.id, 'can_edit')}
                                disabled={!selectedUsers.includes(user.id)}
                              />
                              <span>编辑</span>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="modal-footer-actions">
                  <button className="btn-cancel" onClick={() => setShowAuthModal(false)}>取消</button>
                  <button className="btn-confirm" onClick={handleSubmitAuth}>确认</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {currentStep === 'select-template' && (
        <SelectTemplatePage
          onNext={(data) => {
            setCreationData(prev => ({ ...prev, templateData: data }));
            setCurrentStep('link-documents');
          }}
          onBack={() => setCurrentStep('main')}
        />
      )}

      {currentStep === 'link-documents' && (
        <LinkRelatedDocumentsPage
          templateData={creationData.templateData}
          sessionId={creationData.sessionId}
          onNext={(data) => {
            setCreationData(prev => ({ ...prev, relatedDocsData: data }));
            setCurrentStep('upload-materials');
          }}
          onBack={() => setCurrentStep('select-template')}
        />
      )}

      {currentStep === 'upload-materials' && (
        <UploadMaterialsPage
          templateData={creationData.templateData}
          relatedDocsData={creationData.relatedDocsData}
          sessionId={creationData.sessionId}
          onNext={(data) => {
            setCreationData(prev => ({ ...prev, materialsData: data }));
            setCurrentStep('generate-outline');
          }}
          onBack={() => setCurrentStep('link-documents')}
        />
      )}

      {currentStep === 'generate-outline' && (
        <GenerateOutlinePage
          templateData={creationData.templateData}
          relatedDocsData={creationData.relatedDocsData}
          materialsData={creationData.materialsData}
          sessionId={creationData.sessionId}
          onNext={(data) => {
            setCreationData(prev => ({ ...prev, outlineData: data }));
            setCurrentStep('edit-complete');
          }}
          onBack={() => setCurrentStep('upload-materials')}
        />
      )}

      {currentStep === 'edit-complete' && (
        <EditAndCompletePage
          templateData={creationData.templateData}
          outlineData={creationData.outlineData}
          sessionId={creationData.sessionId}
          onSave={() => {
            alert('制度创建完成！');
            setCurrentStep('main');
          }}
          onBack={() => setCurrentStep('generate-outline')}
        />
      )}
    </div>
  );
}
