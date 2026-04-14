import { useState } from 'react';
import { api, setToken, setCurrentUser } from '../services/api';
import type { UserLogin } from '../types/index';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onNavigate: (page: string) => void;
}

export function LoginPage({ onLoginSuccess, onNavigate }: LoginPageProps) {
  const [formData, setFormData] = useState<UserLogin>({
    account: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await api.login(formData);
      setToken(result.access_token);
      setCurrentUser(result.user);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-box">
          <div className="login-header">
            <div className="login-logo">
              <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
            </div>
            <h1>制度审查智能体</h1>
            <p>登录系统继续您的工作</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="account">账号</label>
              <input
                id="account"
                type="text"
                value={formData.account}
                onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                placeholder="请输入登录账号"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="请输入密码"
                required
                disabled={loading}
              />
            </div>

            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  登录中...
                </>
              ) : (
                '登录'
              )}
            </button>

            <div className="login-footer">
              <p>
                还没有账号？
                <button type="button" onClick={() => onNavigate('register')}>
                  立即注册
                </button>
              </p>
            </div>
          </form>

          <div className="login-hint">
            <p>默认管理员账号：</p>
            <p>账号：admin | 密码：admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
