import type { KnowledgeBase } from '../types/index';
import { useState, useRef } from 'react';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  knowledgeBases: KnowledgeBase[];
  onUpload: (file: File, name: string, description?: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onRefresh: () => void;
}

export function KnowledgeBaseModal({
  isOpen,
  onClose,
  knowledgeBases,
  onUpload,
  onDelete,
  onRefresh,
}: KnowledgeBaseModalProps) {
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadName) {
        setUploadName(file.name.replace('.pdf', ''));
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !uploadName.trim()) {
      alert('请选择文件并输入知识库名称');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(selectedFile, uploadName.trim(), uploadDescription.trim() || undefined);
      setUploadName('');
      setUploadDescription('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onRefresh();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个知识库吗？')) return;
    try {
      await onDelete(id);
      onRefresh();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('删除失败');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processing':
        return '处理中...';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return status;
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'processing':
        return 'status-processing';
      case 'completed':
        return 'status-completed';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>知识库管理</h2>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="upload-section">
            <h3>上传新知识库</h3>
            <div className="upload-form">
              <div className="form-group">
                <label>知识库名称 *</label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="输入知识库名称"
                />
              </div>
              <div className="form-group">
                <label>描述</label>
                <input
                  type="text"
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="输入描述（可选）"
                />
              </div>
              <div className="form-group">
                <label>PDF文件 *</label>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".pdf"
                    onChange={handleFileSelect}
                  />
                  <div className="file-input-display">
                    {selectedFile ? selectedFile.name : '选择PDF文件'}
                  </div>
                </div>
              </div>
              <button
                className="upload-btn"
                onClick={handleUpload}
                disabled={isUploading || !selectedFile || !uploadName.trim()}
              >
                {isUploading ? '上传中...' : '上传'}
              </button>
            </div>
          </div>

          <div className="list-section">
            <h3>已有知识库</h3>
            {knowledgeBases.length === 0 ? (
              <div className="empty-list">暂无知识库</div>
            ) : (
              <div className="knowledge-list">
                {knowledgeBases.map((kb) => (
                  <div key={kb.id} className="knowledge-item">
                    <div className="knowledge-info">
                      <div className="knowledge-name">{kb.name}</div>
                      <div className="knowledge-meta">
                        <span>{kb.file_name}</span>
                        <span>•</span>
                        <span>{formatFileSize(kb.file_size)}</span>
                        <span>•</span>
                        <span className={`status ${getStatusClass(kb.status)}`}>
                          {getStatusText(kb.status)}
                        </span>
                      </div>
                      {kb.description && (
                        <div className="knowledge-desc">{kb.description}</div>
                      )}
                    </div>
                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(kb.id)}
                    >
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
