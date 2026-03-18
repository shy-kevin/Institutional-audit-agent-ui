import { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { KnowledgeBaseModal } from './components/KnowledgeBaseModal';
import { UpdateConversationModal } from './components/UpdateConversationModal';
import { api } from './services/api';
import type { Conversation, Message, KnowledgeBase } from './types/index';
import './App.css';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([]);
  const [selectedKnowledgeBaseId, setSelectedKnowledgeBaseId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showKnowledgeBaseModal, setShowKnowledgeBaseModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updatingConversation, setUpdatingConversation] = useState<Conversation | null>(null);
  
  const streamingMessageIdRef = useRef<number | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const data = await api.getConversations();
      setConversations(data.items || []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  const loadKnowledgeBases = useCallback(async () => {
    try {
      const data = await api.getKnowledgeBases();
      setKnowledgeBases(data.items || []);
    } catch (error) {
      console.error('Failed to load knowledge bases:', error);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: number) => {
    try {
      const data = await api.getMessages(conversationId);
      setMessages(data.items || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    loadKnowledgeBases();
  }, [loadConversations, loadKnowledgeBases]);

  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    } else {
      setMessages([]);
    }
  }, [currentConversationId, loadMessages]);

  const handleNewConversation = async () => {
    try {
      const newConv = await api.createConversation('新对话');
      setConversations((prev) => [newConv, ...prev]);
      setCurrentConversationId(newConv.id);
      setMessages([]);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id: number) => {
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = async (id: number) => {
    if (!confirm('确定要删除这个对话吗？')) return;
    try {
      await api.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleUpdateConversation = (id: number) => {
    const conversation = conversations.find((c) => c.id === id);
    if (conversation) {
      setUpdatingConversation(conversation);
      setShowUpdateModal(true);
    }
  };

  const handleSaveConversation = async (id: number, title: string, description: string) => {
    const updated = await api.updateConversation(id, { title, description });
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, title: updated.title, description: updated.description, updated_at: updated.updated_at }
          : c
      )
    );
  };

  const handleSendMessage = async (message: string, filePaths?: string[]) => {
    let conversationId = currentConversationId;

    if (!conversationId) {
      try {
        const newConv = await api.createConversation(message.slice(0, 20));
        setConversations((prev) => [newConv, ...prev]);
        conversationId = newConv.id;
        setCurrentConversationId(conversationId);
      } catch (error) {
        console.error('Failed to create conversation:', error);
        return;
      }
    }

    const userMessage: Message = {
      id: Date.now(),
      conversation_id: conversationId,
      role: 'user',
      content: message,
      file_paths: filePaths ? JSON.stringify(filePaths) : null,
      knowledge_base_id: selectedKnowledgeBaseId,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const assistantMessageId = Date.now() + 1;
    streamingMessageIdRef.current = assistantMessageId;
    
    const assistantMessage: Message = {
      id: assistantMessageId,
      conversation_id: conversationId,
      role: 'assistant',
      content: '',
      file_paths: null,
      knowledge_base_id: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      let assistantContent = '';
      
      for await (const chunk of api.chatStream({
        conversation_id: conversationId,
        message,
        knowledge_base_id: selectedKnowledgeBaseId || undefined,
        file_paths: filePaths,
      })) {
        assistantContent += chunk.content;
        
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId 
              ? { ...m, content: assistantContent } 
              : m
          )
        );
        
        if (chunk.is_end) break;
      }
    } catch (error) {
      console.error('Chat failed:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId 
            ? { ...m, content: '抱歉，发生了错误，请稍后重试。。' } 
            : m
        )
      );
    } finally {
      setIsLoading(false);
      streamingMessageIdRef.current = null;
      loadConversations();
    }
  };

  const handleUploadKnowledgeBase = async (file: File, name: string, description?: string) => {
    await api.uploadKnowledgeBase(file, name, description);
  };

  const handleDeleteKnowledgeBase = async (id: number) => {
    await api.deleteKnowledgeBase(id);
  };

  return (
    <div className="app">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onUpdateConversation={handleUpdateConversation}
        onOpenKnowledgeBase={() => setShowKnowledgeBaseModal(true)}
      />
      <ChatArea
        messages={messages}
        knowledgeBases={knowledgeBases}
        selectedKnowledgeBaseId={selectedKnowledgeBaseId}
        onSelectKnowledgeBase={setSelectedKnowledgeBaseId}
        onSendMessage={handleSendMessage}
        onRefreshKnowledgeBases={loadKnowledgeBases}
        isLoading={isLoading}
      />
      <KnowledgeBaseModal
        isOpen={showKnowledgeBaseModal}
        onClose={() => setShowKnowledgeBaseModal(false)}
        knowledgeBases={knowledgeBases}
        onUpload={handleUploadKnowledgeBase}
        onDelete={handleDeleteKnowledgeBase}
        onRefresh={loadKnowledgeBases}
      />
      <UpdateConversationModal
        isOpen={showUpdateModal}
        onClose={() => {
          setShowUpdateModal(false);
          setUpdatingConversation(null);
        }}
        conversation={updatingConversation}
        onUpdate={handleSaveConversation}
      />
    </div>
  );
}

export default App;
