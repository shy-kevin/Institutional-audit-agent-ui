import { useState } from 'react';
import { api } from '../services/api';

interface EditAndCompletePageProps {
  templateData: any;
  outlineData: any;
  sessionId?: string;
  onSave: () => void;
  onBack: () => void;
}

export function EditAndCompletePage({ templateData, outlineData, sessionId, onSave, onBack }: EditAndCompletePageProps) {
  const [activeSection, setActiveSection] = useState<string>('第一章 总则');
  const [content, setContent] = useState<string>(outlineData?.outline || '');
  const [aiMessage, setAiMessage] = useState<string>('');
  const [showWarning, setShowWarning] = useState<boolean>(true);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { role: 'assistant', content: '您好！我是您的AI助手，已为您生成了完整的考勤管理制度草案。该草案包含总则、工作时间、请假管理和违纪处理等核心章节。\n\n您可以对任何章节进行提问或要求修改完善。' }
  ]);
  const [isChatting, setIsChatting] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'ai-chat' | 'compliance' | 'references'>('ai-chat');
  const [complianceResult, setComplianceResult] = useState<any>(null);

  const sections = [
    '第一章 总则',
    '第二章 工作时间',
    '第三章 请假管理',
    '第四章 违纪处理',
    '第五章 附则'
  ];

  const handleSave = async () => {
    if (!sessionId) return;
    try {
      setSaving(true);
      await api.saveDraftContent(sessionId, content, activeSection, false);
      alert('制度已保存');
      onSave();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleSendMessage = async () => {
    if (!aiMessage.trim() || !sessionId || isChatting) return;

    const userMessage = aiMessage.trim();
    setAiMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatting(true);

    let assistantResponse = '';

    try {
      for await (const event of api.aiChatStream(sessionId, {
        message: userMessage,
        context: {
          current_chapter: activeSection,
          conversation_history: chatMessages.slice(-4)
        },
        mode: 'qna'
      })) {
        if (event.event === 'content_chunk' && event.content) {
          assistantResponse += event.content;
          setChatMessages(prev => {
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg?.role === 'assistant') {
              newMessages[newMessages.length - 1] = { ...lastMsg, content: assistantResponse };
            }
            return newMessages;
          });
        } else if (event.event === 'completed') {
          break;
        }
      }

      if (!assistantResponse) {
        assistantResponse = '抱歉，我暂时无法回答您的问题。请稍后再试。';
        setChatMessages(prev => [...prev, { role: 'assistant', content: assistantResponse }]);
      }
    } catch (error) {
      console.error('AI对话失败:', error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: '对话出现错误，请重试。' }]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleComplianceCheck = async () => {
    if (!sessionId) return;
    try {
      setActiveTab('compliance');
      const result = await api.complianceCheck(sessionId, ['legal_compliance', 'format_standard', 'internal_consistency']);
      setComplianceResult(result);
    } catch (error) {
      console.error('合规检查失败:', error);
      alert('合规检查失败，请重试');
    }
  };

  const handleExportFinal = async () => {
    if (!sessionId) return;
    try {
      const result = await api.exportFinalDocument(sessionId, 'docx', {
        include_cover_page: true,
        cover_info: {
          title: templateData?.templateName || '未命名制度',
          document_number: '',
          version: 'V1.0（草案）',
          department: '',
          date: ''
        },
        include_toc: true
      });
      if (result.download_url) {
        window.open(`http://localhost:8000${result.download_url}`, '_blank');
      }
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    }
  };

  const handleSubmitReview = async () => {
    if (!sessionId) return;
    if (!confirm('确定要提交审核吗？提交后将进入审核流程。')) return;

    try {
      const result = await api.submitForReview(sessionId, {
        document_name: templateData?.templateName || '未命名制度',
        document_type: templateData?.documentType || '其他',
        reviewers: [],
        priority: 'normal',
        submission_note: ''
      });
      if (result.success) {
        alert(`提交审核成功！文档ID: ${result.document_id}`);
        onSave();
      }
    } catch (error) {
      console.error('提交审核失败:', error);
      alert('提交审核失败，请重试');
    }
  };

  return (
    <div className="edit-complete-page">
      {/* 步骤指示器 */}
      <div className="step-indicator">
        <div className="step completed">
          <div className="step-circle">✓</div>
          <span>选择模板</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step completed">
          <div className="step-circle">✓</div>
          <span>关联上下位</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step completed">
          <div className="step-circle">✓</div>
          <span>上传资料</span>
        </div>
        <div className="step-line completed"></div>
        <div className="step completed">
          <div className="step-circle">✓</div>
          <span>撰写生成</span>
        </div>
        <div className="step-line active"></div>
        <div className="step active">
          <div className="step-circle">5</div>
          <span>编辑完善</span>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="editor-toolbar">
        <div className="toolbar-left">
          <button className="tool-btn active">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            大纲修改
          </button>
          <button className="tool-btn" onClick={() => setAiMessage('请帮我智能扩充当前章节的内容')}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-2v-4H9v4H7v-6h10v6z"/>
            </svg>
            智能扩充
          </button>
          <button className="tool-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            上传附件
          </button>
        </div>

        <div className="toolbar-right">
          <button className="btn-save" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </button>
          <button className="btn-export-final" onClick={handleExportFinal}>导出最终版</button>

          {showWarning && (
            <div className="warning-banner">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#fa8c16">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
              </svg>
              <span>如需进行格式校验，请进入编辑模式；如果只是内容校验，建议进入阅读模式。</span>
              <button className="btn-close-warning" onClick={() => setShowWarning(false)}>×</button>
            </div>
          )}
        </div>
      </div>

      {/* 主编辑区域 */}
      <div className="editor-main-area">
        {/* 左侧目录 */}
        <div className="toc-sidebar">
          <div className="toc-header">
            <h3>📑 章节目录</h3>
            <button className="btn-add-chapter">+</button>
          </div>
          <ul className="toc-list">
            {sections.map((section, index) => (
              <li
                key={section}
                className={`toc-item ${activeSection === section ? 'active' : ''}`}
                onClick={() => setActiveSection(section)}
              >
                <span className="chapter-icon">{index + 1}</span>
                <span className="chapter-name">{section.replace('第', '').replace('章 ', '')}</span>
                {index === 0 && <span className="current-badge">当前</span>}
              </li>
            ))}
          </ul>
        </div>

        {/* 中间编辑区 */}
        <div className="content-editor">
          <h1 className="document-title-main">{templateData?.templateName || '未命名制度'}</h1>
          <div className="document-meta-info">
            <span className="meta-tag">草稿</span>
            <span className="meta-text">创建时间</span>
          </div>
          <div className="editor-content">
            <pre className="editable-text">{content || `# ${templateData?.templateName}\n\n## 第一章 总则\n\n### 第一条 目的\n为规范公司员工考勤管理，确保正常工作秩序，提高工作效率，依据《中华人民共和国劳动法》及相关法律法规，特制定本制度。\n\n### 第二条 适用范围\n本制度适用于公司全体员工（含试用期员工）、临时工、以及因工作需要及临时聘用人员。\n\n## 第二章 工作时间\n\n### 第三条 标准工作时间\n公司实行标准工时制，工作时间：周一至周五，上午9:00-12:00，下午13:30-18:00。\n\n### 第四条 弹性工作制\n部分岗位经申请批准后可实行弹性工作制，具体要求详见《弹性工作管理办法》。\n\n## 第三章 请假管理\n\n### 第五条 请假事由与类别\n员工请假需提前提交书面《请假申请单》，经部门负责人及人事部审批后方可休假。\n\n### 第六条 各类假期规定\n- 年假：入职满一年员工享受带薪年假；\n- 病假：需提供医院证明；\n\n## 第四章 违纪处理\n\n### 第七条 迟到/早退/旷工\n- 迟到：上班时间后15分钟内到岗视为迟到；\n\n### 第八条 处罚措施\n- 月累计迟到3次以上者，将按公司规定扣除相应绩效奖金。\n\n## 第五章 附则\n\n### 第九条 生效时间\n本制度自发布之日起生效执行。\n\n### 第十条 解释权\n本制度的最终解释权归人力资源部所有。`}</pre>
          </div>
        </div>

        {/* 右侧AI助手 */}
        <div className="ai-assistant-panel">
          <div className="panel-tabs">
            <button
              className={`tab-btn ${activeTab === 'ai-chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai-chat')}
            >
              AI问答
            </button>
            <button
              className={`tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
              onClick={handleComplianceCheck}
            >
              合规检查
            </button>
            <button
              className={`tab-btn ${activeTab === 'references' ? 'active' : ''}`}
              onClick={() => setActiveTab('references')}
            >
              引用查看
            </button>
          </div>

          <div className="assistant-chat" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 380px)' }}>
            {activeTab === 'ai-chat' && chatMessages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}-message`}>
                <div className={`message-avatar ${msg.role}`}>
                  {msg.role === 'user' ? 'U' : 'AI'}
                </div>
                <div className="message-content">
                  <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>
                </div>
              </div>
            ))}

            {activeTab === 'compliance' && complianceResult && (
              <div style={{ padding: '14px' }}>
                <h4 style={{ marginBottom: '12px', color: complianceResult.overall_status === 'warning' ? '#fa8c16' : '#52c41a' }}>
                  检查结果：{complianceResult.summary?.total_issues || 0} 个问题
                  （{complianceResult.summary?.critical || 0} 严重 / {complianceResult.summary?.warning || 0} 警告）
                </h4>
                {complianceResult.issues?.map((issue: any, i: number) => (
                  <div key={i} style={{
                    padding: '10px',
                    marginBottom: '8px',
                    background: issue.severity === 'critical' ? '#fff1f0' : '#fffbe6',
                    borderLeft: `3px solid ${issue.severity === 'critical' ? '#ff4d4f' : '#fa8c16'}`,
                    borderRadius: '4px',
                    fontSize: '13px'
                  }}>
                    <strong>{issue.category}</strong>: {issue.description}
                    <div style={{ marginTop: '6px', color: '#666', fontSize: '12px' }}>
                      💡 建议：{issue.suggestion}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'references' && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                暂无引用信息
              </div>
            )}
          </div>

          {activeTab === 'ai-chat' && (
            <div className="input-area">
              <textarea
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                placeholder="向AI助手提问或提出修改意见..."
                rows={3}
                className="ai-input"
                disabled={isChatting}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())}
              ></textarea>
              <button
                className="btn-send-message"
                disabled={!aiMessage.trim() || isChatting}
                onClick={handleSendMessage}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 9z"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作 */}
      <div className="bottom-actions final-step">
        <button className="btn-back" onClick={onBack}>上一步</button>
        <div className="final-buttons">
          <button className="btn-save-draft" onClick={handleSave} disabled={saving}>暂存草稿</button>
          <button className="btn-submit-final" onClick={handleSubmitReview}>提交审核 ✓</button>
        </div>
      </div>
    </div>
  );
}
