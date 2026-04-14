import { useState, useEffect } from 'react';
import { Dashboard } from './pages/Dashboard';
import { DocumentUploadPage } from './pages/DocumentUploadPage';
import { AuditConfigPage } from './pages/AuditConfigPage';
import { AuditProgressPage } from './pages/AuditProgressPage';
import { AuditResultPage } from './pages/AuditResultPage';
import { AuditReviewPage } from './pages/AuditReviewPage';
import { AuditHistoryPage } from './pages/AuditHistoryPage';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { RuleManagePage } from './pages/RuleManagePage';
import { KnowledgeBaseDetailPage } from './pages/KnowledgeBaseDetailPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { UserManagementPage } from './pages/UserManagementPage';
import { AuditReviewConfirmPage } from './pages/AuditReviewConfirmPage';
import { SmartDraftAssistant } from './pages/SmartDraftAssistant';
import { TemplateManagement } from './pages/TemplateManagement';
import { isAuthenticated, getCurrentUser } from './services/api';
import './App.css';

type PageType = 'dashboard' | 'upload' | 'config' | 'progress' | 'result' | 'review' | 'history' | 'knowledge-base' | 'rules' | 'knowledge-base-detail' | 'login' | 'register' | 'profile' | 'user-management' | 'audit-review-confirm' | 'smart-draft-assistant' | 'template-management';

interface PageParams {
  mode?: 'single' | 'batch' | 'compare';
  taskId?: number;
  taskIds?: number[];
  resultId?: number;
  files?: any[];
  auditType?: 'draft' | 'revision' | 'current';
  docId?: string;
}

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('login');
  const [pageParams, setPageParams] = useState<PageParams>({});
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const auth = isAuthenticated();
    setLoggedIn(auth);
    if (auth) {
      setCurrentPage('dashboard');
    } else {
      setCurrentPage('login');
    }
  }, []);

  const handleNavigate = (page: string, params?: Record<string, unknown>) => {
    setCurrentPage(page as PageType);
    setPageParams(params || {});
  };

  const handleLoginSuccess = () => {
    setLoggedIn(true);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setCurrentPage('login');
  };

  const renderPage = () => {
    if (!loggedIn && currentPage !== 'login' && currentPage !== 'register') {
      return <LoginPage onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigate} />;
    }

    switch (currentPage) {
      case 'login':
        return <LoginPage onLoginSuccess={handleLoginSuccess} onNavigate={handleNavigate} />;
      
      case 'register':
        return <RegisterPage onRegisterSuccess={handleLoginSuccess} onNavigate={handleNavigate} />;
      
      case 'profile':
        return <UserProfilePage onNavigate={handleNavigate} onLogout={handleLogout} />;
      
      case 'user-management':
        return <UserManagementPage onNavigate={handleNavigate} />;
      
      case 'audit-review-confirm':
        return <AuditReviewConfirmPage 
          key={pageParams.resultId}
          resultId={pageParams.resultId as number} 
          onNavigate={handleNavigate}
          onBack={() => handleNavigate('history')}
        />;
      
      case 'smart-draft-assistant':
        return <SmartDraftAssistant onNavigate={handleNavigate} />;
      
      case 'template-management':
        return <TemplateManagement />;
      
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      
      case 'upload':
        return (
          <DocumentUploadPage
            mode={pageParams.mode as 'single' | 'batch' | 'compare' || 'single'}
            onNavigate={handleNavigate}
          />
        );
      
      case 'config':
        return (
          <AuditConfigPage
            key={pageParams.taskId}
            taskId={pageParams.taskId}
            files={pageParams.files}
            documents={pageParams.documents}
            auditType={pageParams.auditType as 'draft' | 'revision' | 'current'}
            onNavigate={handleNavigate}
          />
        );
      
      case 'progress':
        return (
          <AuditProgressPage
            key={pageParams.taskId || JSON.stringify(pageParams.documents)}
            taskId={pageParams.taskId}
            taskIds={pageParams.taskIds}
            documents={pageParams.documents}
            auditType={pageParams.auditType as 'draft' | 'revision' | 'current'}
            mode={pageParams.mode as 'single' | 'batch' | 'compare'}
            onNavigate={handleNavigate}
          />
        );
      
      case 'result':
        return (
          <AuditResultPage
            key={pageParams.resultId}
            resultId={pageParams.resultId!}
            onNavigate={handleNavigate}
          />
        );
      
      case 'review':
        return (
          <AuditReviewPage
            resultId={pageParams.resultId!}
            onNavigate={handleNavigate}
          />
        );
      
      case 'history':
        return <AuditHistoryPage onNavigate={handleNavigate} />;
      
      case 'knowledge-base':
        return <KnowledgeBasePage onNavigate={handleNavigate} />;
      
      case 'rules':
        return <RuleManagePage onNavigate={handleNavigate} />;
      
      case 'knowledge-base-detail':
        return (
          <KnowledgeBaseDetailPage 
            docId={pageParams.docId as string} 
            onNavigate={handleNavigate} 
          />
        );
      
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  const currentUser = getCurrentUser();

  return (
    <div className="app">
      <div className="app-sidebar">
        <div className="sidebar-logo">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          <span>制度审查智能体</span>
        </div>
        
        {loggedIn && (
          <>
            <nav className="sidebar-nav">
              <button
                className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`}
                onClick={() => handleNavigate('dashboard')}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
                <span>工作台</span>
              </button>

              <button
                className={`nav-item ${currentPage === 'smart-draft-assistant' ? 'active' : ''}`}
                onClick={() => handleNavigate('smart-draft-assistant')}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                </svg>
                <span>智能编制助手</span>
              </button>

              <button
                className={`nav-item ${currentPage === 'template-management' ? 'active' : ''}`}
                onClick={() => handleNavigate('template-management')}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                </svg>
                <span>模板管理</span>
              </button>

              <button
                className={`nav-item ${currentPage === 'upload' ? 'active' : ''}`}
                onClick={() => handleNavigate('upload', { mode: 'single' })}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                </svg>
                <span>发起审查</span>
              </button>

              <button
                className={`nav-item ${currentPage === 'history' ? 'active' : ''}`}
                onClick={() => handleNavigate('history')}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
                </svg>
                <span>审查历史</span>
              </button>

              <button
                className={`nav-item ${currentPage === 'knowledge-base' ? 'active' : ''}`}
                onClick={() => handleNavigate('knowledge-base')}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12z"/>
                </svg>
                <span>知识库</span>
              </button>

              <button
                className={`nav-item ${currentPage === 'rules' ? 'active' : ''}`}
                onClick={() => handleNavigate('rules')}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                </svg>
                <span>规则管理</span>
              </button>
            </nav>

            <div className="sidebar-footer">
              <div className="user-info" onClick={() => handleNavigate('profile')} style={{ cursor: 'pointer' }}>
                <div className="user-avatar">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div className="user-details">
                  <div className="user-name">{currentUser?.username || '用户'}</div>
                  <div className="user-role">{currentUser?.role === 'admin' ? '管理员' : '用户'}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="app-main">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
