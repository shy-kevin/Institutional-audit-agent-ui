import { useState } from 'react';
import { api } from '../services/api';
import type { UserRegister } from '../types/index';

interface RegisterPageProps {
  onRegisterSuccess: () => void;
  onNavigate: (page: string) => void;
}

export function RegisterPage({ onRegisterSuccess, onNavigate }: RegisterPageProps) {
  const [formData, setFormData] = useState<UserRegister>({
    username: '',
    account: '',
    password: '',
    phone: '',
    department: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password.length < 6) {
      setError('密码长度至少为 6 位');
      return;
    }

    if (formData.account.length < 3) {
      setError('账号长度至少为 3 位');
      return;
    }

    setLoading(true);

    try {
      await api.register(formData);
      setSuccess(true);
      setTimeout(() => {
        onRegisterSuccess();
      }, 2000);
    } catch (err: any) {
      setError(err.message || '注册失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-box">
          <div className="register-header">
            <div className="register-logo">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
            </div>
            <h1>用户注册</h1>
            <p>创建新账号开始使用</p>
          </div>

          <form className="register-form" onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="success-message">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                <span>注册成功，即将跳转到登录页...</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="username">用户名</label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="请输入用户名（2-50 字符）"
                required
                minLength={2}
                maxLength={50}
                disabled={loading || success}
              />
            </div>

            <div className="form-group">
              <label htmlFor="account">登录账号</label>
              <input
                id="account"
                type="text"
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                placeholder="请输入登录账号（3-50 字符）"
                required
                minLength={3}
                maxLength={50}
                disabled={loading || success}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="请输入密码（6-50 字符）"
                required
                minLength={6}
                maxLength={50}
                disabled={loading || success}
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">手机号（选填）</label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入手机号"
                disabled={loading || success}
              />
            </div>

            <div className="form-group">
              <label htmlFor="department">部门（选填）</label>
              <input
                id="department"
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="请输入部门"
                disabled={loading || success}
              />
            </div>

            <button type="submit" className="register-btn" disabled={loading || success}>
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  注册中...
                </>
              ) : success ? (
                '注册成功'
              ) : (
                '注册'
              )}
            </button>

            <div className="register-footer">
              <p>
                已有账号？
                <button type="button" onClick={() => onNavigate('login')}>
                  立即登录
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
