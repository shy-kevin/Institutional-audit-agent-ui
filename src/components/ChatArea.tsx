import type { Message, KnowledgeBase } from '../types/index';
import { useState, useRef, useEffect, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { FilePreview } from './FilePreview';

interface ChatAreaProps {
  messages: Message[];
  knowledgeBases: KnowledgeBase[];
  selectedKnowledgeBaseId: number | null;
  onSelectKnowledgeBase: (id: number | null) => void;
  onSendMessage: (message: string, filePaths?: string[]) => void;
  onRefreshKnowledgeBases: () => void;
  isLoading: boolean;
}

const API_BASE_URL = 'http://localhost:8000';

interface PreviewFile {
  url: string;
  name: string;
}

const MessageContent = memo(function MessageContent({ 
  content, 
  onFileClick 
}: { 
  content: string; 
  onFileClick: (url: string, name: string) => void;
}) {
  const processUrl = (href: string | undefined): string => {
    if (!href) return '';
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return href;
    }
    if (href.startsWith('/')) {
      return `${API_BASE_URL}${href}`;
    }
    return href;
  };

  const getFileName = (href: string | undefined): string => {
    if (!href) return '文件';
    const parts = href.split('/');
    return decodeURIComponent(parts[parts.length - 1] || '文件');
  };

  return (
    <ReactMarkdown
      components={{
        a: ({ href, children }) => {
          const fullUrl = processUrl(href);
          const fileName = getFileName(href);
          return (
            <button
              className="file-preview-link"
              onClick={() => onFileClick(fullUrl, fileName)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
              </svg>
              <span>{children}</span>
              <span className="preview-hint">点击预览</span>
            </button>
          );
        },
        p: ({ children }) => <p className="markdown-p">{children}</p>,
        strong: ({ children }) => <strong className="markdown-strong">{children}</strong>,
        ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
        ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
        li: ({ children }) => <li className="markdown-li">{children}</li>,
        h1: ({ children }) => <h1 className="markdown-h1">{children}</h1>,
        h2: ({ children }) => <h2 className="markdown-h2">{children}</h2>,
        h3: ({ children }) => <h3 className="markdown-h3">{children}</h3>,
        code: ({ className, children }) => {
          const isInline = !className;
          return isInline ? (
            <code className="markdown-code-inline">{children}</code>
          ) : (
            <code className={`markdown-code-block ${className || ''}`}>{children}</code>
          );
        },
        pre: ({ children }) => <pre className="markdown-pre">{children}</pre>,
        blockquote: ({ children }) => <blockquote className="markdown-blockquote">{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

export function ChatArea({
  messages,
  knowledgeBases,
  selectedKnowledgeBaseId,
  onSelectKnowledgeBase,
  onSendMessage,
  onRefreshKnowledgeBases,
  isLoading,
}: ChatAreaProps) {
  const [inputValue, setInputValue] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string; path: string }[]>([]);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    const filePaths = uploadedFiles.map((f) => f.path);
    onSendMessage(inputValue.trim(), filePaths.length > 0 ? filePaths : undefined);
    setInputValue('');
    setUploadedFiles([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { api } = await import('../services/api');
      const result = await api.uploadFile(file);
      setUploadedFiles((prev) => [...prev, { name: file.name, path: result.file_path }]);
    } catch (error) {
      console.error('File upload failed:', error);
      alert('文件上传失败');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileClick = (url: string, name: string) => {
    setPreviewFile({ url, name });
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  return (
    <div className="chat-area">
      <div className="chat-header">
        <div className="header-title">制度审查智能助手</div>
        <div className="knowledge-selector">
          <label>知识库：</label>
          <select
            value={selectedKnowledgeBaseId || ''}
            onChange={(e) => onSelectKnowledgeBase(e.target.value ? Number(e.target.value) : null)}
            onFocus={onRefreshKnowledgeBases}
          >
            <option value="">不使用知识库</option>
            {knowledgeBases
              .filter((kb) => kb.status === 'completed')
              .map((kb) => (
                <option key={kb.id} value={kb.id}>
                  {kb.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-screen">
            <div className="welcome-icon">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <h2>Hi~ 我是制度审查助手</h2>
            <p>我可以帮你审查制度文件、解答制度相关问题，快来体验吧！</p>
            <div className="quick-actions">
              <div className="quick-action" onClick={() => setInputValue('请帮我审查这份制度文件')}>
                <span className="action-icon">📋</span>
                <span>审查制度文件</span>
              </div>
              <div className="quick-action" onClick={() => setInputValue('请解释一下这个制度条款的含义')}>
                <span className="action-icon">💡</span>
                <span>解释制度条款</span>
              </div>
              <div className="quick-action" onClick={() => setInputValue('请帮我对比两份制度文件的差异')}>
                <span className="action-icon">🔍</span>
                <span>对比制度差异</span>
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'user' ? (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                )}
              </div>
              <div className="message-content">
                {msg.role === 'assistant' ? (
                  <div className="message-text markdown-body">
                    <MessageContent content={msg.content} onFileClick={handleFileClick} />
                  </div>
                ) : (
                  <div className="message-text">{msg.content}</div>
                )}
                {msg.file_paths && (
                  <div className="attached-files">
                    <span className="file-badge">📎 已上传文件</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="message assistant">
            <div className="message-avatar">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
            </div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        {uploadedFiles.length > 0 && (
          <div className="uploaded-files">
            {uploadedFiles.map((file, index) => (
              <div key={index} className="uploaded-file">
                <span>📎 {file.name}</span>
                <button onClick={() => removeFile(index)}>×</button>
              </div>
            ))}
          </div>
        )}
        <div className="input-container">
          <button className="attach-btn" onClick={() => fileInputRef.current?.click()}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/>
            </svg>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".pdf"
            onChange={handleFileUpload}
          />
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的问题..."
            rows={1}
          />
          <button
            className={`send-btn ${inputValue.trim() && !isLoading ? 'active' : ''}`}
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
        <div className="input-hint">按 Enter 发送，Shift + Enter 换行</div>
      </div>

      {previewFile && (
        <FilePreview
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          onClose={closePreview}
        />
      )}
    </div>
  );
}
