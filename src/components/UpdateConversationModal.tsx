import { useState, useEffect } from 'react';
import type { Conversation } from '../types/index';

interface UpdateConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation | null;
  onUpdate: (id: number, title: string, description: string) => Promise<void>;
}

export function UpdateConversationModal({
  isOpen,
  onClose,
  conversation,
  onUpdate,
}: UpdateConversationModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (conversation) {
      setTitle(conversation.title);
      setDescription(conversation.description || '');
    }
  }, [conversation]);

  if (!isOpen || !conversation) return null;

  const handleSubmit = async () => {
    if (!title.trim()) {
      alert('请输入对话标题');
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(conversation.id, title.trim(), description.trim());
      onClose();
    } catch (error) {
      console.error('Update failed:', error);
      alert('更新失败');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content update-conversation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>更新对话信息</h2>
          <button className="close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label>对话标题 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入对话标题"
            />
          </div>
          <div className="form-group">
            <label>描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入描述（可选）"
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button className="cancel-btn" onClick={onClose}>
              取消
            </button>
            <button
              className="submit-btn"
              onClick={handleSubmit}
              disabled={isUpdating || !title.trim()}
            >
              {isUpdating ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
