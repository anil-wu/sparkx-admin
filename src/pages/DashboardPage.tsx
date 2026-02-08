import { useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './DashboardPage.css';

interface AdminInfo {
  id: number;
  role: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();

  // Get admin info from storage
  const adminInfo = useMemo<AdminInfo | null>(() => {
    const adminId = localStorage.getItem('sparkx_admin_id') || sessionStorage.getItem('sparkx_admin_id');
    const role = localStorage.getItem('sparkx_admin_role') || sessionStorage.getItem('sparkx_admin_role');

    if (adminId && role) {
      return {
        id: parseInt(adminId, 10),
        role: role,
      };
    }
    return null;
  }, []);

  useEffect(() => {
    // Check if admin is authenticated
    const token = localStorage.getItem('sparkx_admin_token') || sessionStorage.getItem('sparkx_admin_token');

    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    // Clear all admin storage
    localStorage.removeItem('sparkx_admin_token');
    localStorage.removeItem('sparkx_admin_id');
    localStorage.removeItem('sparkx_admin_role');
    sessionStorage.removeItem('sparkx_admin_token');
    sessionStorage.removeItem('sparkx_admin_id');
    sessionStorage.removeItem('sparkx_admin_role');
    navigate('/login');
  };

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="header-title">SparkX Admin</h1>
            {adminInfo && (
              <span className="admin-role-badge">
                {adminInfo.role === 'super_admin' ? '超级管理员' : '管理员'}
              </span>
            )}
          </div>
          <button onClick={handleLogout} className="logout-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
            退出登录
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-container">
          <div className="welcome-card">
            <h2 className="welcome-title">
              欢迎使用 SparkX 管理后台
              {adminInfo && <span className="welcome-username">，管理员 #{adminInfo.id}</span>}
            </h2>
            <p className="welcome-text">
              您已成功登录系统。这里将展示管理功能模块。
            </p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon users-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-label">用户总数</span>
                <span className="stat-value">--</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon projects-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7" />
                  <path d="M17 21v-8" />
                  <path d="M7 21v-8" />
                  <path d="M7 3v5h10V3" />
                  <rect width="18" height="5" x="3" y="3" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-label">项目总数</span>
                <span className="stat-value">--</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon files-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                </svg>
              </div>
              <div className="stat-info">
                <span className="stat-label">文件总数</span>
                <span className="stat-value">--</span>
              </div>
            </div>
          </div>

          <div className="management-section">
            <h3 className="section-title">管理功能</h3>
            <div className="management-grid">
              <Link to="/software-templates" className="management-card">
                <div className="management-icon template-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
                    <path d="M9 22v-4h6v4" />
                    <path d="M8 6h.01" />
                    <path d="M16 6h.01" />
                    <path d="M12 6h.01" />
                    <path d="M12 10h.01" />
                    <path d="M12 14h.01" />
                    <path d="M16 10h.01" />
                    <path d="M16 14h.01" />
                    <path d="M8 10h.01" />
                    <path d="M8 14h.01" />
                  </svg>
                </div>
                <div className="management-info">
                  <span className="management-title">软件模板管理</span>
                  <span className="management-desc">创建和管理软件模板</span>
                </div>
              </Link>

              <Link to="/llm" className="management-card">
                <div className="management-icon template-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a4 4 0 0 0-4 4v3H7a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-4a3 3 0 0 0-3-3h-1V6a4 4 0 0 0-4-4Z" />
                    <path d="M9 19v-2" />
                    <path d="M15 19v-2" />
                    <path d="M10 13h4" />
                  </svg>
                </div>
                <div className="management-info">
                  <span className="management-title">大模型管理</span>
                  <span className="management-desc">配置 Provider/Model 与用量日志</span>
                </div>
              </Link>

              <Link to="/agents" className="management-card">
                <div className="management-icon template-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 8V4H8" />
                    <rect width="16" height="16" x="4" y="4" rx="2" />
                    <path d="M8 12h8" />
                    <path d="M8 16h6" />
                  </svg>
                </div>
                <div className="management-info">
                  <span className="management-title">Agent 管理</span>
                  <span className="management-desc">维护 Agent 与模型绑定</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
