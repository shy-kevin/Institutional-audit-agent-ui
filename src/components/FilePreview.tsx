import { useState, useEffect } from 'react';

interface FilePreviewProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

const API_BASE_URL = 'http://localhost:8000';

function getFileType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  if (ext === 'pdf') {
    return 'pdf';
  }
  
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
    return 'image';
  }
  
  if (['txt', 'md', 'json', 'xml', 'csv', 'html', 'css', 'js', 'ts', 'py', 'java', 'c', 'cpp', 'h', 'sql', 'yaml', 'yml', 'ini', 'conf', 'log', 'sh', 'bat'].includes(ext)) {
    return 'text';
  }
  
  if (['doc', 'docx', 'xls', 'xlsx'].includes(ext)) {
    return 'office';
  }
  
  return 'unknown';
}

export function FilePreview({ fileUrl, fileName, onClose }: FilePreviewProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string>('unknown');
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const fullUrl = fileUrl.startsWith('http') ? fileUrl : `${API_BASE_URL}${fileUrl}`;

  useEffect(() => {
    const type = getFileType(fileName);
    setFileType(type);
    
    if (type === 'office') {
      convertToPdf();
    } else {
      setLoading(false);
    }
  }, [fileName, fileUrl]);

  const convertToPdf = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/api/file/convert-to-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: fileUrl }),
      });
      
      if (!response.ok) {
        throw new Error('转换失败');
      }
      
      const data = await response.json();
      
      if (data.success && data.download_url) {
        let pdfPath = data.download_url;
        
        if (pdfPath.startsWith('http')) {
          setPdfUrl(pdfPath);
        } else if (pdfPath.startsWith('/api/')) {
          setPdfUrl(`${API_BASE_URL}${pdfPath}`);
        } else if (pdfPath.startsWith('uploads/')) {
          setPdfUrl(`${API_BASE_URL}/api/file/download/${pdfPath.split('/').pop()}`);
        } else {
          setPdfUrl(`${API_BASE_URL}/api/file/download/${pdfPath}`);
        }
        
        setFileType('pdf');
      } else {
        throw new Error(data.message || '转换失败');
      }
    } catch (err) {
      console.error('Failed to convert to PDF:', err);
      setError('Office 文件转换失败，请下载后查看');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderPreview = () => {
    if (loading) {
      return (
        <div className="preview-loading">
          <div className="loading-spinner"></div>
          <p>{fileType === 'office' ? '正在转换为 PDF...' : '加载中...'}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="preview-error">
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          <p>{error}</p>
          <button onClick={handleDownload} className="download-fallback-btn">
            直接下载文件
          </button>
        </div>
      );
    }

    switch (fileType) {
      case 'pdf':
        const pdfPreviewUrl = (pdfUrl || fullUrl) + '?preview=true';
        return (
          <div className="pdf-preview">
            <iframe
              src={pdfPreviewUrl}
              title={fileName}
              className="pdf-iframe"
            />
          </div>
        );
      case 'image':
        return (
          <div className="image-preview">
            <img
              src={fullUrl}
              alt={fileName}
              onError={() => setError('图片加载失败')}
            />
          </div>
        );
      case 'text':
        return <TextPreview url={fullUrl} onError={setError} />;
      default:
        return (
          <div className="unknown-preview">
            <svg viewBox="0 0 24 24" width="64" height="64" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            <p>此文件类型不支持在线预览</p>
            <button onClick={handleDownload} className="download-fallback-btn">
              下载文件查看
            </button>
          </div>
        );
    }
  };

  return (
    <div className="file-preview-overlay" onClick={handleOverlayClick}>
      <div className="file-preview-container">
        <div className="file-preview-header">
          <div className="file-info">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
            <span className="file-name">{fileName}</span>
          </div>
          <div className="file-actions">
            <button className="preview-action-btn download" onClick={handleDownload} title="下载文件">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
              </svg>
              <span>下载</span>
            </button>
            <button className="preview-action-btn close" onClick={onClose} title="关闭预览">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>
        <div className="file-preview-content">
          {renderPreview()}
        </div>
      </div>
    </div>
  );
}

function TextPreview({ url, onError }: { url: string; onError: (error: string) => void }) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const decoder = new TextDecoder('UTF-8');
        const text = decoder.decode(arrayBuffer);
        setContent(text);
      } catch (err) {
        console.error('Failed to fetch text content:', err);
        onError('文本内容加载失败');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [url, onError]);

  if (loading) {
    return (
      <div className="preview-loading">
        <div className="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="text-preview">
      <div className="text-preview-header">
        <span className="encoding-info">编码: UTF-8</span>
      </div>
      <pre>{content}</pre>
    </div>
  );
}
