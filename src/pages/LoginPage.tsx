import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

interface LoginFormState {
  username: string;
  password: string;
  rememberMe: boolean;
}

interface Message {
  type: 'error' | 'success' | 'info';
  text: string;
}

const INITIAL_LOGIN_FORM: LoginFormState = {
  username: '',
  password: '',
  rememberMe: false,
};

const parseApiErrorMessage = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return 'Request failed';
  try {
    const parsed = JSON.parse(text) as { message?: unknown; msg?: unknown };
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }
    if (typeof parsed.msg === 'string' && parsed.msg.trim()) {
      return parsed.msg;
    }
  } catch {
    // ignore parse failure and return plain text
  }
  const normalized = text.trim();
  return normalized || 'Request failed';
};

const API_BASE_URL = import.meta.env.SPARKX_API_BASE_URL || '';
const adminLogin = async (input: {
  username: string;
  password: string;
}): Promise<{ ok: true; data: { adminId: number; role: string; token: string } } | { ok: false; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: await parseApiErrorMessage(response),
      };
    }

    return {
      ok: true,
      data: (await response.json()) as { adminId: number; role: string; token: string },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
};

export default function LoginPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState<Message | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginFormState>(() => ({
    ...INITIAL_LOGIN_FORM,
  }));
  const [showPassword, setShowPassword] = useState(false);

  const setUsername = (value: string) => {
    setLoginForm((prev) => ({ ...prev, username: value }));
    setMessage(null);
  };

  const setPassword = (value: string) => {
    setLoginForm((prev) => ({ ...prev, password: value }));
    setMessage(null);
  };

  const setRememberMe = (value: boolean) => {
    setLoginForm((prev) => ({ ...prev, rememberMe: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!loginForm.username || !loginForm.password) {
      setMessage({
        type: 'error',
        text: '请输入用户名和密码',
      });
      return;
    }

    setIsSubmitting(true);

    const result = await adminLogin({
      username: loginForm.username,
      password: loginForm.password,
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setMessage({
        type: 'error',
        text: result.message,
      });
      return;
    }

    // Store token and admin info
    if (loginForm.rememberMe) {
      localStorage.setItem('sparkx_admin_token', result.data.token);
      localStorage.setItem('sparkx_admin_id', result.data.adminId.toString());
      localStorage.setItem('sparkx_admin_role', result.data.role);
    } else {
      sessionStorage.setItem('sparkx_admin_token', result.data.token);
      sessionStorage.setItem('sparkx_admin_id', result.data.adminId.toString());
      sessionStorage.setItem('sparkx_admin_role', result.data.role);
    }

    setMessage({
      type: 'success',
      text: '登录成功！',
    });

    // Redirect to dashboard
    setTimeout(() => {
      navigate('/dashboard');
    }, 500);
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1 className="login-title">SparkX Admin</h1>
          <p className="login-subtitle">后台管理系统</p>
        </div>

        {message && (
          <div
            className={`message-banner message-${message.type}`}
            role="alert"
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username" className="form-label">
              用户名
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={loginForm.username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isSubmitting}
              required
              autoComplete="username"
              className="form-input"
              placeholder="请输入用户名"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              密码
            </label>
            <div className="password-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={loginForm.password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
                autoComplete="current-password"
                className="form-input"
                placeholder="请输入密码"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" x2="22" y1="2" y2="22" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="form-group form-checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={loginForm.rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isSubmitting}
                className="checkbox-input"
              />
              <span className="checkbox-text">记住我</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="login-button"
          >
            {isSubmitting ? (
              <span className="loading-spinner">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="spinner">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                登录中...
              </span>
            ) : (
              '登录'
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 SparkX. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
