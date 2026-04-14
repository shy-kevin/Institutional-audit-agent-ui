import { useState } from 'react';
import { api } from '../services/api';

interface UploadMaterialsPageProps {
  templateData: any;
  relatedDocsData: any;
  sessionId?: string;
  onNext: (data: { referenceFiles?: File[]; requirements: string; additionalNotes: string }) => void;
  onBack: () => void;
}

export function UploadMaterialsPage({ templateData, relatedDocsData, sessionId, onNext, onBack }: UploadMaterialsPageProps) {
  const [referenceFiles, setReferenceFiles] = useState<File[]>([]);
  const [requirements, setRequirements] = useState<string>('');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [uploading, setUploading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      if (sessionId && filesArray.length > 0) {
        try {
          setUploading(true);
          await api.uploadDraftMaterials(sessionId, filesArray, 'reference');
          setReferenceFiles(prev => [...prev, ...filesArray]);
        } catch (error) {
          console.error('上传文件失败:', error);
          alert('文件上传失败，请重试');
        } finally {
          setUploading(false);
        }
      } else {
        setReferenceFiles(prev => [...prev, ...filesArray]);
      }
    }
  };

  const removeFile = async (index: number) => {
    const file = referenceFiles[index];
    if (sessionId && file.name) {
      try {
        await api.deleteDraftMaterial(sessionId, `temp_${index}`);
      } catch (error) {
        console.error('删除文件失败:', error);
      }
    }
    setReferenceFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleNext = async () => {
    if (sessionId && requirements.trim()) {
      try {
        setSaving(true);
        await api.saveDraftRequirements(sessionId, requirements, additionalNotes);
        onNext({
          referenceFiles,
          requirements,
          additionalNotes
        });
      } catch (error) {
        console.error('保存需求信息失败:', error);
        alert('保存需求信息失败，请重试');
      } finally {
        setSaving(false);
      }
    } else {
      onNext({
        referenceFiles,
        requirements,
        additionalNotes
      });
    }
  };

  return (
    <div className="upload-materials-page">
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
        <div className="step-line active"></div>
        <div className="step active">
          <div className="step-circle">3</div>
          <span>上传资料</span>
        </div>
        <div className="step-line"></div>
        <div className="step">
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
        <h2 className="section-title">上传制制材料</h2>
        <p className="section-desc">上传相关参考资料、法规、旧版本等，AI将基于这些材料生成更准确的制度内容</p>

        {/* 上传区域 */}
        <div className="upload-section-main">
          <h3 className="subsection-title">
            参考文档上传
            <button className="btn-upload-trigger" onClick={() => document.getElementById('file-input')?.click()}>
              + 添加文件
            </button>
            <input
              id="file-input"
              type="file"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </h3>

          <div className="uploaded-files-list">
            {referenceFiles.length > 0 ? (
              referenceFiles.map((file, index) => (
                <div key={index} className="file-item">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="#1890ff">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                  </svg>
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
                  <button
                    className="btn-remove-file"
                    onClick={() => removeFile(index)}
                    title="移除文件"
                    disabled={uploading}
                  >
                    ✕
                  </button>
                </div>
              ))
            ) : (
              <div className="no-files-hint">{uploading ? '上传中...' : '暂未上传参考文件（拖拽上传或点击上方按钮）'}</div>
            )}
          </div>
        </div>

        {/* 需求说明 */}
        <div className="requirements-section">
          <h3 className="subsection-title">需求/参考说明</h3>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="请描述您希望制度包含的具体要求和特殊规定，例如：适用部门/人员范围、特定业务场景、合规性要求等。"
            className="requirements-textarea"
            rows={4}
          ></textarea>
        </div>

        {/* 补充信息 */}
        <div className="additional-notes-section">
          <h3 className="subsection-title">补充工作备注</h3>
          <div className="upload-box-large">
            <div className="upload-placeholder">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="#d9d9d9">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              <p className="placeholder-text">点击或拖拽文件到此处上传</p>
              <p className="placeholder-hint">支持 docx, doc, xls, xlsx, pdf 等格式，最大 10MB</p>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="bottom-actions">
          <button className="btn-back" onClick={onBack}>上一步</button>
          <button className="btn-next" onClick={handleNext} disabled={saving || uploading}>
            {saving ? '保存中...' : uploading ? '上传中...' : '下一步 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
