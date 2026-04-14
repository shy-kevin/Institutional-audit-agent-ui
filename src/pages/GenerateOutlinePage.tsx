import { useState } from 'react';
import { api } from '../services/api';

interface GenerateOutlinePageProps {
  templateData: any;
  relatedDocsData: any;
  materialsData: any;
  sessionId?: string;
  onNext: (data: { outline: string; documentTitle: string }) => void;
  onBack: () => void;
}

export function GenerateOutlinePage({ templateData, relatedDocsData, materialsData, sessionId, onNext, onBack }: GenerateOutlinePageProps) {
  const [documentTitle, setDocumentTitle] = useState<string>(templateData?.templateName || '');
  const [outline, setOutline] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentChapter, setCurrentChapter] = useState<string>('');
  const [generatingError, setGeneratingError] = useState<string>('');

  const handleGenerate = async () => {
    if (!sessionId) {
      alert('会话ID不存在，请返回重新开始');
      return;
    }

    setIsGenerating(true);
    setIsGenerated(false);
    setOutline('');
    setProgress(0);
    setCurrentChapter('');
    setGeneratingError('');

    try {
      let fullContent = '';

      for await (const event of api.generateOutlineStream(sessionId, {
        document_title: documentTitle,
        generation_options: {
          include_examples: true,
          detail_level: 'standard',
          style: 'formal'
        }
      })) {
        if (event.event === 'progress_update') {
          setProgress(event.progress || 0);
          setCurrentChapter(event.current_chapter || '');
        } else if (event.event === 'outline_chunk' && event.content) {
          fullContent += event.content;
          setOutline(fullContent);
        } else if (event.event === 'generation_completed') {
          setIsGenerated(true);
          break;
        } else if (event.event === 'generation_error') {
          setGeneratingError(event.error_message || '生成失败');
          break;
        }
      }

      if (!generatingError && fullContent) {
        setIsGenerated(true);
      }
    } catch (error) {
      console.error('大纲生成失败:', error);
      setGeneratingError('网络错误或服务异常，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm('确定要重新生成大纲吗？当前内容将被清除。')) return;

    setIsGenerated(false);
    setOutline('');
    await handleGenerate();
  };

  const handleExportWord = async () => {
    if (!sessionId) return;
    try {
      const result = await api.exportOutlineToWord(sessionId, {
        include_toc: true,
        include_header_footer: true,
        header_text: `${documentTitle} - 草案大纲`,
        footer_text: '第 {page} 页 / 共 {pages} 页'
      });
      if (result.download_url) {
        window.open(`http://localhost:8000${result.download_url}`, '_blank');
      }
    } catch (error) {
      console.error('导出Word失败:', error);
      alert('导出失败，请重试');
    }
  };

  const handleNext = () => {
    if (!outline.trim()) {
      alert('请先生成大纲');
      return;
    }

    onNext({
      outline,
      documentTitle
    });
  };

  return (
    <div className="generate-outline-page">
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
        <div className="step-line active"></div>
        <div className="step active">
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
        {/* AI提示信息 */}
        <div className="ai-prompt-banner">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#1890ff">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <span>AI将基于您选择{templateData?.templateName}的模板和提供的资料自动生成制度大纲</span>
          {isGenerated && (
            <button className="btn-regenerate" onClick={handleRegenerate}>重新生成大纲</button>
          )}
        </div>

        {/* 文档标题输入 */}
        <div className="title-section">
          <h3 className="subsection-title">文档标题</h3>
          <input
            type="text"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            placeholder="请输入制度标题"
            className="title-input"
            disabled={isGenerated}
          />
        </div>

        {/* 大纲展示区域 */}
        <div className="outline-section">
          <div className="outline-header-row">
            <h3 className="subsection-title">{isGenerating ? `正在生成... (${progress}%)` : isGenerated ? '第一章 总则' : '等待生成'}</h3>
            {isGenerating && currentChapter && (
              <span style={{ color: '#1890ff', fontSize: '13px', fontWeight: 500 }}>{currentChapter}</span>
            )}
            <div className="view-toggle">
              <button className="toggle-btn active">完整内容</button>
              {!isGenerated && !isGenerating && (
                <button className="toggle-btn" disabled>暂无内容</button>
              )}
            </div>
          </div>

          <div className="outline-content-area">
            {isGenerating ? (
              <div className="generating-state">
                <div className="loading-spinner-outline"></div>
                <p>正在生成大纲，请稍候...</p>
                {progress > 0 && (
                  <div style={{ width: '80%', height: '6px', background: '#f0f0f0', borderRadius: '3px', marginTop: '16px', overflow: 'hidden' }}>
                    <div style={{ width: `${progress}%`, height: '100%', background: '#1890ff', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                  </div>
                )}
              </div>
            ) : generatingError ? (
              <div className="empty-outline-state" style={{ color: '#ff4d4f' }}>
                <p>⚠️ 生成失败</p>
                <p className="empty-hint" style={{ color: '#ff4d4f' }}>{generatingError}</p>
                <button
                  className="btn-next"
                  style={{ marginTop: '16px' }}
                  onClick={handleGenerate}
                >
                  重试
                </button>
              </div>
            ) : isGenerated ? (
              <div className="generated-content">
                <pre className="outline-text">{outline}</pre>
              </div>
            ) : (
              <div className="empty-outline-state">
                <p>{documentTitle || '未命名文档'}（草案大纲）</p>
                <p className="empty-hint">点击下方按钮开始AI智能生成</p>
              </div>
            )}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="bottom-actions">
          <button className="btn-back" onClick={onBack}>上一步</button>
          {!isGenerated ? (
            <button
              className={`btn-generate ${!documentTitle ? 'disabled' : ''}`}
              onClick={handleGenerate}
              disabled={!documentTitle || isGenerating}
            >
              {isGenerating ? '生成中...' : '开始生成'}
            </button>
          ) : (
            <>
              <button className="btn-export-word" onClick={handleExportWord}>导出为 Word</button>
              <button className="btn-next" onClick={handleNext}>进入编辑 →</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
