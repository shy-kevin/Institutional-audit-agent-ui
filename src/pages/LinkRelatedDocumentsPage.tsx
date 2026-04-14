import { useState } from 'react';
import { api } from '../services/api';

interface LinkRelatedDocumentsPageProps {
  templateData: { templateId: number; templateName: string; documentType: string };
  sessionId?: string;
  onNext: (data: { upperDocument?: string; lowerDocument?: string; notes: string }) => void;
  onBack: () => void;
}

export function LinkRelatedDocumentsPage({ templateData, sessionId, onNext, onBack }: LinkRelatedDocumentsPageProps) {
  const [upperDocument, setUpperDocument] = useState<string>('');
  const [lowerDocument, setLowerDocument] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [upperSearchResults, setUpperSearchResults] = useState<any[]>([]);
  const [lowerSearchResults, setLowerSearchResults] = useState<any[]>([]);
  const [searchingUpper, setSearchingUpper] = useState<boolean>(false);
  const [searchingLower, setSearchingLower] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const handleSearchUpper = async (keyword: string) => {
    if (!keyword.trim()) return;
    try {
      setSearchingUpper(true);
      const result = await api.searchUpperDocuments(keyword, templateData.documentType);
      setUpperSearchResults(result.items || []);
    } catch (error) {
      console.error('搜索上位制度失败:', error);
    } finally {
      setSearchingUpper(false);
    }
  };

  const handleSearchLower = async (keyword: string) => {
    if (!keyword.trim()) return;
    try {
      setSearchingLower(true);
      const result = await api.searchLowerDocuments(keyword, templateData.documentType);
      setLowerSearchResults(result.items || []);
    } catch (error) {
      console.error('搜索下位制度失败:', error);
    } finally {
      setSearchingLower(false);
    }
  };

  const handleSelectUpperResult = (doc: any) => {
    setUpperDocument(doc.name);
    setUpperSearchResults([]);
  };

  const handleSelectLowerResult = (doc: any) => {
    setLowerDocument(doc.name);
    setLowerSearchResults([]);
  };

  const handleNext = async () => {
    if (sessionId && (upperDocument || notes)) {
      try {
        setSaving(true);
        const upperDocs = upperDocument ? [{
          document_id: `custom_${Date.now()}`,
          document_name: upperDocument,
          relation_type: 'legal_basis',
          notes: ''
        }] : [];

        const lowerDocs = lowerDocument ? [{
          document_id: `custom_${Date.now()}_lower`,
          document_name: lowerDocument,
          relation_type: 'implementation',
          notes: ''
        }] : [];

        await api.saveDocumentRelations(sessionId, upperDocs, lowerDocs, notes);

        onNext({
          upperDocument,
          lowerDocument,
          notes
        });
      } catch (error) {
        console.error('保存关联关系失败:', error);
        alert('保存关联关系失败，请重试');
      } finally {
        setSaving(false);
      }
    } else {
      onNext({
        upperDocument,
        lowerDocument,
        notes
      });
    }
  };

  return (
    <div className="link-documents-page">
      {/* 步骤指示器 */}
      <div className="step-indicator">
        <div className="step completed">
          <div className="step-circle">✓</div>
          <span>选择模板</span>
        </div>
        <div className="step-line active"></div>
        <div className="step active">
          <div className="step-circle">2</div>
          <span>关联上下位</span>
        </div>
        <div className="step-line"></div>
        <div className="step">
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
        <h2 className="section-title">关联上下位制度</h2>
        <p className="section-desc">选择与当前制度相关联的上级和下级制度，建立完整的制度体系关系</p>

        {/* 上位制度 */}
        <div className="document-section">
          <h3 className="subsection-title">
            上位制度或法律依据
            <button className="btn-add-document">+ 添加</button>
          </h3>

          <div className="document-list-area">
            <div className="document-item selected">
              <div className="doc-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                </svg>
              </div>
              <div className="doc-info">
                <input
                  type="text"
                  value={upperDocument}
                  onChange={(e) => setUpperDocument(e.target.value)}
                  placeholder="请输入或选择上位制度的名称..."
                  className="doc-input"
                  onBlur={(e) => e.target.value && handleSearchUpper(e.target.value)}
                />
                {searchingUpper && <span style={{ color: '#1890ff', fontSize: '12px', marginLeft: '8px' }}>搜索中...</span>}
              </div>
            </div>

            {upperSearchResults.length > 0 && (
              <div style={{ marginTop: '12px', border: '1px solid #d9d9d9', borderRadius: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {upperSearchResults.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => handleSelectUpperResult(doc)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                  >
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '13px' }}>{doc.name}</div>
                      <div style={{ fontSize: '11px', color: '#999', marginTop: '4px' }}>{doc.type} | {doc.authority}</div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#52c41a' }}>相关度: {(doc.relevance_score * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            )}

            <div className="document-item">
              <div className="doc-icon">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
                </svg>
              </div>
              <div className="doc-info">
                <div className="doc-name-text">《中华人民共和国劳动法》（2024修订）</div>
                <div className="doc-meta">2024年11月 | 劳动法</div>
              </div>
            </div>
          </div>
        </div>

        {/* 下位制度/手册 */}
        <div className="document-section">
          <h3 className="subsection-title">
            下位制度/执行手册
            <button className="btn-add-document">+ 添加</button>
          </h3>

          <div className="document-list-area empty-state">
            <div className="empty-icon">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="#d9d9d9">
                <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
            </div>
            <p className="empty-text">暂无下位制度。</p>
            <p className="empty-hint">上述制度为可选填项，填写后可建立完整的制度层级结构。</p>
          </div>

          <div className="document-input-area">
            <input
              type="text"
              value={lowerDocument}
              onChange={(e) => setLowerDocument(e.target.value)}
              placeholder="请输入下位制度名称..."
              className="lower-doc-input"
              onBlur={(e) => e.target.value && handleSearchLower(e.target.value)}
            />
            {lowerSearchResults.length > 0 && (
              <div style={{ marginTop: '8px', border: '1px solid #d9d9d9', borderRadius: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                {lowerSearchResults.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: '8px 12px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      fontSize: '13px'
                    }}
                    onClick={() => handleSelectLowerResult(doc)}
                  >
                    {doc.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 备注说明 */}
        <div className="notes-section">
          <h3 className="subsection-title">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            </svg>
            备注说明工作流
          </h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="在此输入关于本制度与其他制度关系的说明..."
            className="notes-textarea"
            rows={4}
          ></textarea>
          <div className="notes-hint">
            💡 提示：此信息将帮助AI更好地理解制度间的逻辑关系，例如：本制度是《XX管理办法》的细化规定。
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="bottom-actions">
          <button className="btn-back" onClick={onBack}>上一步</button>
          <button className="btn-next" onClick={handleNext} disabled={saving}>
            {saving ? '保存中...' : '下一步 →'}
          </button>
        </div>
      </div>
    </div>
  );
}
