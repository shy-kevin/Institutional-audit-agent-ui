import { useState, useEffect } from 'react';
import { api, getCurrentUser, setCurrentUser, removeToken, isAdmin } from '../services/api';
import type { User } from '../types/index';

interface UserProfilePageProps {
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function UserProfilePage({ onNavigate, onLogout }: UserProfilePageProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    department: '',
  });
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setFormData({
        username: currentUser.username || '',
        phone: currentUser.phone || '',
        department: currentUser.department || '',
      });
    }
    setLoading(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updatedUser = await api.updateCurrentUser(formData);
      setCurrentUser(updatedUser);
      setUser(updatedUser);
      setEditing(false);
      setMessage({ type: 'success', text: '个人信息更新成功' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '更新失败' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.new_password !== passwordData.confirm_password) {
      setMessage({ type: 'error', text: '两次输入的新密码不一致' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: '密码长度至少为 6 位' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    try {
      await api.changePassword({
        old_password: passwordData.old_password,
        new_password: passwordData.new_password,
      });
      setShowPasswordModal(false);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
      setMessage({ type: 'success', text: '密码修改成功' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '修改失败' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleLogout = () => {
    removeToken();
    onLogout();
  };

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="user-profile-page">
        <div className="empty-state">
          <p>未登录，请先登录</p>
          <button className="btn-primary" onClick={() => onNavigate('login')}>
            去登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('dashboard')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>个人中心</h1>
          <p>管理您的个人信息和账户设置</p>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="profile-content">
        <div className="profile-card">
          <div className="card-header">
            <h2>基本信息</h2>
            {!editing && (
              <button className="edit-btn" onClick={() => setEditing(true)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
                编辑
              </button>
            )}
          </div>
          <div className="card-body">
            {editing ? (
              <form className="profile-form" onSubmit={handleUpdateProfile}>
                <div className="form-row">
                  <div className="form-group">
                    <label>用户名</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      required
                      minLength={2}
                      maxLength={50}
                    />
                  </div>
                  <div className="form-group">
                    <label>账号</label>
                    <input type="text" value={user.account} disabled />
                    <span className="form-hint">账号不可修改</span>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>手机号</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>部门</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">保存</button>
                  <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>取消</button>
                </div>
              </form>
            ) : (
              <div className="profile-info">
                <div className="info-row">
                  <span className="label">用户名:</span>
                  <span className="value">{user.username}</span>
                </div>
                <div className="info-row">
                  <span className="label">账号:</span>
                  <span className="value">{user.account}</span>
                </div>
                <div className="info-row">
                  <span className="label">角色:</span>
                  <span className={`value role-badge ${user.role}`}>
                    {user.role === 'admin' ? '管理员' : '普通用户'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">手机号:</span>
                  <span className="value">{user.phone || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">部门:</span>
                  <span className="value">{user.department || '-'}</span>
                </div>
                <div className="info-row">
                  <span className="label">状态:</span>
                  <span className={`value status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? '已激活' : '已禁用'}
                  </span>
                </div>
                {user.last_login && (
                  <div className="info-row">
                    <span className="label">最后登录:</span>
                    <span className="value">{new Date(user.last_login).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="profile-card">
          <div className="card-header">
            <h2>账户安全</h2>
          </div>
          <div className="card-body">
            <div className="security-actions">
              <button className="action-btn" onClick={() => setShowPasswordModal(true)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                </svg>
                <div className="action-info">
                  <span className="action-title">修改密码</span>
                  <span className="action-desc">定期修改密码可以提高账户安全性</span>
                </div>
              </button>
              <button className="action-btn danger" onClick={handleLogout}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
                </svg>
                <div className="action-info">
                  <span className="action-title">退出登录</span>
                  <span className="action-desc">退出当前登录的账户</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {isAdmin() && (
          <div className="profile-card admin-card">
            <div className="card-header">
              <h2>管理员功能</h2>
            </div>
            <div className="card-body">
              <div className="admin-actions">
                <button className="action-btn" onClick={() => onNavigate('user-management')}>
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                    <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                  </svg>
                  <div className="action-info">
                    <span className="action-title">用户管理</span>
                    <span className="action-desc">管理系统中的所有用户</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>修改密码</h2>
              <button className="close-btn" onClick={() => setShowPasswordModal(false)}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <form className="modal-body" onSubmit={handleChangePassword}>
              <div className="form-group">
                <label>当前密码</label>
                <input
                  type="password"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>新密码</label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="form-group">
                <label>确认新密码</label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  required
                  minLength={6}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowPasswordModal(false)}>取消</button>
                <button type="submit" className="btn-primary">确认修改</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
