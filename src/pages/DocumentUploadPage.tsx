import { useState, useRef } from 'react';
import type { DocumentUpload } from '../types/index';
import { api } from '../services/api';

interface DocumentUploadPageProps {
  mode: 'single' | 'batch' | 'compare';
  onNavigate: (page: string, params?: Record<string, unknown>) => void;
}

export function DocumentUploadPage({ mode, onNavigate }: DocumentUploadPageProps) {
  const [uploadedFiles, setUploadedFiles] = useState<DocumentUpload[]>([]);
  const [oldVersionFile, setOldVersionFile] = useState<DocumentUpload | null>(null);
  const [newVersionFile, setNewVersionFile] = useState<DocumentUpload | null>(null);
  const [auditType, setAuditType] = useState<'draft' | 'revision' | 'current'>('draft');
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const oldFileInputRef = useRef<HTMLInputElement>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const getModeTitle = () => {
    switch (mode) {
      case 'single':
        return '单文档审查';
      case 'batch':
        return '批量制度审查';
      case 'compare':
        return '制度版本比对';
    }
  };

  const getModeDescription = () => {
    switch (mode) {
      case 'single':
        return '上传单个制度文档进行精细审查，支持自定义审查范围和重点';
      case 'batch':
        return '同时上传多份制度文档进行批量审查，提高审查效率';
      case 'compare':
        return '上传新旧两个版本的制度文档，对比差异并生成一致性报告';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter((file) => {
      const ext = file.name.toLowerCase().split('.').pop();
      return ['doc', 'docx', 'pdf'].includes(ext || '');
    });

    if (mode === 'compare') {
      if (validFiles.length > 0) {
        if (!oldVersionFile) {
          setOldVersionFile({
            file: validFiles[0],
            name: validFiles[0].name,
            size: validFiles[0].size,
            type: validFiles[0].type,
          });
        } else if (!newVersionFile) {
          setNewVersionFile({
            file: validFiles[0],
            name: validFiles[0].name,
            size: validFiles[0].size,
            type: validFiles[0].type,
          });
        }
      }
    } else {
      const newFiles = validFiles.map((file) => ({
        file,
        name: file.name,
        size: file.size,
        type: file.type,
      }));

      if (mode === 'single') {
        setUploadedFiles(newFiles.slice(0, 1));
      } else {
        setUploadedFiles((prev) => [...prev, ...newFiles]);
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearOldVersion = () => {
    setOldVersionFile(null);
  };

  const clearNewVersion = () => {
    setNewVersionFile(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleQuickAudit = async () => {
    if (mode === 'compare') {
      if (!oldVersionFile || !newVersionFile) {
        alert('请上传新旧两个版本的文档');
        return;
      }
    } else {
      if (uploadedFiles.length === 0) {
        alert('请上传至少一个文档');
        return;
      }
    }

    setIsUploading(true);
    try {
      if (mode === 'compare') {
        const oldResult = await api.uploadFile(oldVersionFile!.file);
        const newResult = await api.uploadFile(newVersionFile!.file);
        
        const task = await api.createVersionCompareTask({
          old_document_path: oldResult.file_path,
          new_document_path: newResult.file_path,
        });
        
        onNavigate('progress', { taskId: task.id, mode: 'compare' });
      } else {
        const uploadPromises = uploadedFiles.map((doc) => api.uploadFile(doc.file));
        const uploadResults = await Promise.all(uploadPromises);
        
        const taskPromises = uploadResults.map((result) =>
          api.createAuditTask({
            document_path: result.file_path,
            document_name: result.file_name,
            audit_type: auditType,
          })
        );
        const tasks = await Promise.all(taskPromises);
        
        if (tasks.length === 1) {
          onNavigate('config', { taskId: tasks[0].id });
        } else {
          onNavigate('progress', { taskIds: tasks.map((t) => t.id) });
        }
      }
    } catch (error) {
      console.error('Failed to create audit task:', error);
      alert('创建审查任务失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCustomConfig = () => {
    if (mode === 'compare') {
      if (!oldVersionFile || !newVersionFile) {
        alert('请上传新旧两个版本的文档');
        return;
      }
    } else {
      if (uploadedFiles.length === 0) {
        alert('请上传至少一个文档');
        return;
      }
    }

    if (mode === 'compare') {
      handleQuickAudit();
    } else {
      onNavigate('config', { files: uploadedFiles, auditType });
    }
  };

  return (
    <div className="document-upload-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('dashboard')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>{getModeTitle()}</h1>
          <p>{getModeDescription()}</p>
        </div>
      </div>

      {mode !== 'compare' && (
        <div className="audit-type-selector">
          <h3>审查场景选择</h3>
          <div className="type-options">
            <label className={`type-option ${auditType === 'draft' ? 'active' : ''}`}>
              <input
                type="radio"
                name="auditType"
                value="draft"
                checked={auditType === 'draft'}
                onChange={(e) => setAuditType(e.target.value as 'draft')}
              />
              <div className="option-content">
                <div className="option-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <div className="option-text">
                  <div className="option-title">拟制制度审查</div>
                  <div className="option-desc">审查新拟制的制度文件</div>
                </div>
              </div>
            </label>

            <label className={`type-option ${auditType === 'revision' ? 'active' : ''}`}>
              <input
                type="radio"
                name="auditType"
                value="revision"
                checked={auditType === 'revision'}
                onChange={(e) => setAuditType(e.target.value as 'revision')}
              />
              <div className="option-content">
                <div className="option-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </div>
                <div className="option-text">
                  <div className="option-title">修订制度审查</div>
                  <div className="option-desc">审查修订后的制度文件</div>
                </div>
              </div>
            </label>

            <label className={`type-option ${auditType === 'current' ? 'active' : ''}`}>
              <input
                type="radio"
                name="auditType"
                value="current"
                checked={auditType === 'current'}
                onChange={(e) => setAuditType(e.target.value as 'current')}
              />
              <div className="option-content">
                <div className="option-icon">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <div className="option-text">
                  <div className="option-title">现行制度巡检</div>
                  <div className="option-desc">定期巡检现行制度</div>
                </div>
              </div>
            </label>
          </div>
        </div>
      )}

      {mode === 'compare' ? (
        <div className="version-upload-section">
          <div className="upload-box">
            <h3>旧版本文档</h3>
            {oldVersionFile ? (
              <div className="file-item">
                <div className="file-icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <div className="file-info">
                  <div className="file-name">{oldVersionFile.name}</div>
                  <div className="file-size">{formatFileSize(oldVersionFile.size)}</div>
                </div>
                <button className="remove-btn" onClick={clearOldVersion}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className={`upload-area ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => oldFileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={oldFileInputRef}
                  style={{ display: 'none' }}
                  accept=".doc,.docx,.pdf"
                  onChange={handleFileSelect}
                />
                <div className="upload-icon">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                  </svg>
                </div>
                <p>拖拽文件到此处或点击上传</p>
                <span className="upload-hint">支持 .doc, .docx, .pdf 格式</span>
              </div>
            )}
          </div>

          <div className="upload-box">
            <h3>新版本文档</h3>
            {newVersionFile ? (
              <div className="file-item">
                <div className="file-icon">
                  <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <div className="file-info">
                  <div className="file-name">{newVersionFile.name}</div>
                  <div className="file-size">{formatFileSize(newVersionFile.size)}</div>
                </div>
                <button className="remove-btn" onClick={clearNewVersion}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                  </svg>
                </button>
              </div>
            ) : (
              <div
                className={`upload-area ${dragOver ? 'drag-over' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => newFileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={newFileInputRef}
                  style={{ display: 'none' }}
                  accept=".doc,.docx,.pdf"
                  onChange={handleFileSelect}
                />
                <div className="upload-icon">
                  <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                    <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                  </svg>
                </div>
                <p>拖拽文件到此处或点击上传</p>
                <span className="upload-hint">支持 .doc, .docx, .pdf 格式</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="upload-section">
          <div
            className={`upload-area ${dragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".doc,.docx,.pdf"
              multiple={mode === 'batch'}
              onChange={handleFileSelect}
            />
            <div className="upload-icon">
              <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
              </svg>
            </div>
            <p>拖拽文件到此处或点击上传</p>
            <span className="upload-hint">支持 .doc, .docx, .pdf 格式{mode === 'batch' && '，可批量上传'}</span>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="file-list">
              <h3>已上传文件 ({uploadedFiles.length})</h3>
              <div className="files">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="file-item">
                    <div className="file-icon">
                      <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                      </svg>
                    </div>
                    <div className="file-info">
                      <div className="file-name">{file.name}</div>
                      <div className="file-size">{formatFileSize(file.size)}</div>
                    </div>
                    <button className="remove-btn" onClick={() => removeFile(index)}>
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="action-buttons">
        <button className="btn-secondary" onClick={handleCustomConfig}>
          自定义审查配置
        </button>
        <button
          className="btn-primary"
          onClick={handleQuickAudit}
          disabled={isUploading}
        >
          {isUploading ? '处理中...' : '快速审查'}
        </button>
      </div>
    </div>
  );
}
