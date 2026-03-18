import { useState, useRef, useEffect } from 'react';
import type { Conversation } from '../types/index';

interface SidebarProps {
  conversations: Conversation[];
  currentConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
  onUpdateConversation: (id: number) => void;
  onOpenKnowledgeBase: () => void;
}

export function Sidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onUpdateConversation,
  onOpenKnowledgeBase,
}: SidebarProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMenuToggle = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setOpenMenuId(null);
    onDeleteConversation(id);
  };

  const handleUpdate = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setOpenMenuId(null);
    onUpdateConversation(id);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          <span>制度审查助手</span>
        </div>
      </div>

      <div className="sidebar-actions">
        <button className="new-chat-btn" onClick={onNewConversation}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
          </svg>
          <span>新建对话</span>
        </button>
        <button className="knowledge-btn" onClick={onOpenKnowledgeBase}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
          <span>知识库管理</span>
        </button>
      </div>

      <div className="conversation-list">
        <div className="list-header">历史对话</div>
        {conversations.length === 0 ? (
          <div className="empty-list">暂无对话记录</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${currentConversationId === conv.id ? 'active' : ''}`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
              </svg>
              <span className="conversation-title">{conv.title}</span>
              <div className="conversation-actions" ref={openMenuId === conv.id ? menuRef : null}>
                <button
                  className="more-btn"
                  onClick={(e) => handleMenuToggle(e, conv.id)}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                  </svg>
                </button>
                {openMenuId === conv.id && (
                  <div className="dropdown-menu">
                    <div
                      className="menu-item"
                      onClick={(e) => handleUpdate(e, conv.id)}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                      <span>更新对话信息</span>
                    </div>
                    <div
                      className="menu-item delete"
                      onClick={(e) => handleDelete(e, conv.id)}
                    >
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                      <span>删除对话</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
