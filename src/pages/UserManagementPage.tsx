import { useState, useEffect } from 'react';
import { api, isAdmin } from '../services/api';
import type { User } from '../types/index';

interface UserManagementPageProps {
  onNavigate: (page: string) => void;
}

export function UserManagementPage({ onNavigate }: UserManagementPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'user'>('all');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!isAdmin()) {
      onNavigate('dashboard');
      return;
    }
    loadUsers();
  }, [filterRole]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params = filterRole === 'all' ? undefined : { role: filterRole };
      const data = await api.getUserList(params);
      setUsers(data.items);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '加载用户列表失败' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (user: User) => {
    const newPassword = prompt('请输入新密码:');
    if (!newPassword) return;
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '密码长度至少为 6 位' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    try {
      await api.resetUserPassword(user.id, newPassword);
      setMessage({ type: 'success', text: `已重置用户 "${user.username}" 的密码` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '重置密码失败' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = !user.is_active;
    const action = newStatus ? '启用' : '禁用';
    if (!confirm(`确定要${action}用户 "${user.username}" 吗？`)) return;

    try {
      await api.updateUserStatus(user.id, newStatus);
      setUsers(users.map(u => u.id === user.id ? { ...u, is_active: newStatus } : u));
      setMessage({ type: 'success', text: `已${action}用户 "${user.username}"` });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '更新用户状态失败' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const getRoleText = (role: string) => {
    return role === 'admin' ? '管理员' : '普通用户';
  };

  return (
    <div className="user-management-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => onNavigate('dashboard')}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>返回</span>
        </button>
        <div className="header-content">
          <h1>用户管理</h1>
          <p>管理系统中的所有用户账户</p>
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          <span>{message.text}</span>
        </div>
      )}

      <div className="user-filter">
        <div className="filter-group">
          <label>角色筛选</label>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as 'all' | 'admin' | 'user')}
          >
            <option value="all">全部角色</option>
            <option value="admin">管理员</option>
            <option value="user">普通用户</option>
          </select>
        </div>
        <div className="filter-info">
          共 {users.length} 个用户
        </div>
      </div>

      <div className="user-list-card">
        {loading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>加载中...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <p>暂无用户数据</p>
          </div>
        ) : (
          <div className="user-table-container">
            <table className="user-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>用户名</th>
                  <th>账号</th>
                  <th>手机号</th>
                  <th>部门</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>最后登录</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td className="user-name">{user.username}</td>
                    <td>{user.account}</td>
                    <td>{user.phone || '-'}</td>
                    <td>{user.department || '-'}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {getRoleText(user.role)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                        {user.is_active ? '已激活' : '已禁用'}
                      </span>
                    </td>
                    <td>
                      {user.last_login ? new Date(user.last_login).toLocaleString() : '-'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn"
                          onClick={() => handleResetPassword(user)}
                          title="重置密码"
                        >
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                          </svg>
                        </button>
                        <button
                          className={`action-btn ${user.is_active ? 'warning' : 'success'}`}
                          onClick={() => handleToggleStatus(user)}
                          title={user.is_active ? '禁用用户' : '启用用户'}
                        >
                          {user.is_active ? (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
