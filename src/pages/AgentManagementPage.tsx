import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './SoftwareTemplatesPage.css';
import './AgentManagementPage.css';

interface AdminInfo {
  id: number;
  role: string;
}

interface PageInfo {
  page: number;
  pageSize: number;
  total: number;
}

interface Message {
  type: 'error' | 'success';
  text: string;
}

interface Agent {
  id: number;
  name: string;
  description: string;
  instruction: string;
  agentType: string;
  createdAt: string;
}

interface AgentBinding {
  id: number;
  agentId: number;
  llmModelId: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
  providerId: number;
  providerName: string;
  modelName: string;
  modelType: string;
}

interface LlmProvider {
  id: number;
  name: string;
}

interface LlmModel {
  id: number;
  providerId: number;
  modelName: string;
  modelType: string;
}

const API_BASE_URL = import.meta.env.SPARKX_API_BASE_URL || '';

const parseApiErrorMessage = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return 'Request failed';
  try {
    const parsed = JSON.parse(text) as { message?: unknown; msg?: unknown };
    if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message;
    if (typeof parsed.msg === 'string' && parsed.msg.trim()) return parsed.msg;
  } catch {
    // ignore
  }
  return text.trim() || 'Request failed';
};

const getAuthToken = (): string | null => {
  return localStorage.getItem('sparkx_admin_token') || sessionStorage.getItem('sparkx_admin_token');
};

const listAgents = async (input: { agentType?: string; page: number; pageSize: number }): Promise<
  | { ok: true; data: { list: Agent[]; page: PageInfo } }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const params = new URLSearchParams();
    params.set('page', String(input.page));
    params.set('pageSize', String(input.pageSize));
    if (input.agentType && input.agentType.trim()) params.set('agentType', input.agentType.trim());
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/agents?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return { ok: false, message: await parseApiErrorMessage(response) };
    return { ok: true, data: (await response.json()) as { list: Agent[]; page: PageInfo } };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const createAgent = async (input: { name: string; description?: string; instruction?: string; agentType: string }): Promise<
  | { ok: true; data: Agent }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) return { ok: false, message: await parseApiErrorMessage(response) };
    return { ok: true, data: (await response.json()) as Agent };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const updateAgent = async (
  id: number,
  input: { name?: string; description?: string; instruction?: string; agentType?: string }
): Promise<
  | { ok: true }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/agents/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) return { ok: false, message: await parseApiErrorMessage(response) };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const deleteAgent = async (id: number): Promise<
  | { ok: true }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/agents/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return { ok: false, message: await parseApiErrorMessage(response) };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const listAgentBindings = async (agentId: number): Promise<
  | { ok: true; data: { list: AgentBinding[] } }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/agents/${agentId}/bindings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return { ok: false, message: await parseApiErrorMessage(response) };
    return { ok: true, data: (await response.json()) as { list: AgentBinding[] } };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const createAgentBinding = async (
  agentId: number,
  input: { llmModelId: number; priority?: number; isActive?: boolean }
): Promise<
  | { ok: true; data: AgentBinding }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/agents/${agentId}/bindings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });
    if (!response.ok) return { ok: false, message: await parseApiErrorMessage(response) };
    return { ok: true, data: (await response.json()) as AgentBinding };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const deleteAgentBinding = async (bindingId: number): Promise<
  | { ok: true }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/agent-bindings/${bindingId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return { ok: false, message: await parseApiErrorMessage(response) };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const listLlmProvidersCompact = async (): Promise<
  | { ok: true; data: { list: LlmProvider[] } }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/llm/providers?page=1&pageSize=200`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return { ok: false, message: await parseApiErrorMessage(response) };
    const json = (await response.json()) as { list: LlmProvider[] };
    return { ok: true, data: json };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const listLlmModelsCompact = async (): Promise<
  | { ok: true; data: { list: LlmModel[] } }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/llm/models?page=1&pageSize=500`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return { ok: false, message: await parseApiErrorMessage(response) };
    const json = (await response.json()) as { list: LlmModel[] };
    return { ok: true, data: json };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const agentTypeLabel = (t: string): string => {
  const value = t.trim();
  if (value === 'code') return '代码';
  if (value === 'asset') return '资源';
  if (value === 'design') return '设计';
  if (value === 'test') return '测试';
  if (value === 'build') return '构建';
  if (value === 'ops') return '运维';
  return value || '--';
};

const agentTypeColor = (t: string): string => {
  const value = t.trim();
  if (value === 'code') return '#3b82f6';
  if (value === 'asset') return '#8b5cf6';
  if (value === 'design') return '#ec4899';
  if (value === 'test') return '#f59e0b';
  if (value === 'build') return '#10b981';
  if (value === 'ops') return '#6366f1';
  return '#6b7280';
};

export default function AgentManagementPage() {
  const navigate = useNavigate();

  const adminInfo = useMemo<AdminInfo | null>(() => {
    const adminId = localStorage.getItem('sparkx_admin_id') || sessionStorage.getItem('sparkx_admin_id');
    const role = localStorage.getItem('sparkx_admin_role') || sessionStorage.getItem('sparkx_admin_role');
    if (adminId && role) return { id: parseInt(adminId, 10), role };
    return null;
  }, []);

  const [message, setMessage] = useState<Message | null>(null);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsPage, setAgentsPage] = useState<PageInfo>({ page: 1, pageSize: 20, total: 0 });
  const [filterType, setFilterType] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);

  const selectedAgent = selectedAgentId ? agents.find((a) => a.id === selectedAgentId) ?? null : null;

  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [models, setModels] = useState<LlmModel[]>([]);

  const providerNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of providers) map.set(p.id, p.name);
    return map;
  }, [providers]);

  const modelsSorted = useMemo(() => {
    const list = [...models];
    list.sort((a, b) => {
      if (a.providerId !== b.providerId) return a.providerId - b.providerId;
      if (a.modelType !== b.modelType) return a.modelType.localeCompare(b.modelType);
      return a.modelName.localeCompare(b.modelName);
    });
    return list;
  }, [models]);

  const [bindingsLoading, setBindingsLoading] = useState(false);
  const [bindings, setBindings] = useState<AgentBinding[]>([]);

  const [bindingCreateForm, setBindingCreateForm] = useState({
    llmModelId: '',
    priority: '0',
    isActive: true,
  });

  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const [agentModalMode, setAgentModalMode] = useState<'create' | 'edit'>('create');
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [agentForm, setAgentForm] = useState({ name: '', description: '', instruction: '', agentType: 'code' });

  const handleLogout = () => {
    localStorage.removeItem('sparkx_admin_token');
    localStorage.removeItem('sparkx_admin_id');
    localStorage.removeItem('sparkx_admin_role');
    sessionStorage.removeItem('sparkx_admin_token');
    sessionStorage.removeItem('sparkx_admin_id');
    sessionStorage.removeItem('sparkx_admin_role');
    navigate('/login');
  };

  const loadLlmRefs = useCallback(async () => {
    const [providersRes, modelsRes] = await Promise.all([listLlmProvidersCompact(), listLlmModelsCompact()]);
    if (!providersRes.ok) {
      setMessage({ type: 'error', text: providersRes.message });
      return;
    }
    if (!modelsRes.ok) {
      setMessage({ type: 'error', text: modelsRes.message });
      return;
    }
    setProviders(providersRes.data.list);
    setModels(modelsRes.data.list);
  }, []);

  const loadAgents = useCallback(async () => {
    setAgentsLoading(true);
    const result = await listAgents({
      agentType: filterType.trim() || undefined,
      page: agentsPage.page,
      pageSize: agentsPage.pageSize,
    });
    setAgentsLoading(false);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setAgents(result.data.list);
    setAgentsPage(result.data.page);
    const nextSelected =
      (selectedAgentId ? result.data.list.find((a) => a.id === selectedAgentId) : null) ?? result.data.list[0] ?? null;
    setSelectedAgentId(nextSelected ? nextSelected.id : null);
  }, [agentsPage.page, agentsPage.pageSize, filterType, selectedAgentId]);

  const loadBindings = useCallback(async (agentId: number) => {
    setBindingsLoading(true);
    const result = await listAgentBindings(agentId);
    setBindingsLoading(false);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    const next = result.data.list || [];
    setBindings(next);
    const first = next[0];
    if (first) {
      setBindingCreateForm({
        llmModelId: String(first.llmModelId),
        priority: String(first.priority),
        isActive: first.isActive,
      });
    } else {
      setBindingCreateForm({ llmModelId: '', priority: '0', isActive: true });
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void loadLlmRefs();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadLlmRefs, navigate]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const timeoutId = window.setTimeout(() => {
      void loadAgents();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadAgents]);

  useEffect(() => {
    if (!selectedAgentId) {
      const timeoutId = window.setTimeout(() => {
        setBindings([]);
        setBindingCreateForm({ llmModelId: '', priority: '0', isActive: true });
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
    const timeoutId = window.setTimeout(() => {
      void loadBindings(selectedAgentId);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBindings, selectedAgentId]);

  const openCreateAgent = () => {
    setMessage(null);
    setAgentModalMode('create');
    setEditingAgent(null);
    setAgentForm({ name: '', description: '', instruction: '', agentType: 'code' });
    setIsAgentModalOpen(true);
  };

  const openEditAgent = (agent: Agent) => {
    setMessage(null);
    setAgentModalMode('edit');
    setEditingAgent(agent);
    setAgentForm({
      name: agent.name,
      description: agent.description || '',
      instruction: agent.instruction || '',
      agentType: agent.agentType || 'code',
    });
    setIsAgentModalOpen(true);
  };

  const closeAgentModal = () => {
    setIsAgentModalOpen(false);
    setEditingAgent(null);
    setAgentForm({ name: '', description: '', instruction: '', agentType: 'code' });
  };

  const submitAgent = async () => {
    setMessage(null);
    if (!agentForm.name.trim()) {
      setMessage({ type: 'error', text: 'Agent 名称不能为空' });
      return;
    }
    if (!agentForm.agentType.trim()) {
      setMessage({ type: 'error', text: 'Agent 类型不能为空' });
      return;
    }

    if (agentModalMode === 'create') {
      const payload: { name: string; description?: string; instruction?: string; agentType: string } = {
        name: agentForm.name.trim(),
        agentType: agentForm.agentType.trim(),
      };
      if (agentForm.description.trim()) payload.description = agentForm.description.trim();
      if (agentForm.instruction.trim()) payload.instruction = agentForm.instruction.trim();
      const result = await createAgent(payload);
      if (!result.ok) {
        setMessage({ type: 'error', text: result.message });
        return;
      }
      setMessage({ type: 'success', text: 'Agent 创建成功' });
      closeAgentModal();
      await loadAgents();
      setSelectedAgentId(result.data.id);
      return;
    }

    if (!editingAgent) return;
    const payload: { name?: string; description?: string; instruction?: string; agentType?: string } = {};
    if (agentForm.name.trim() && agentForm.name.trim() !== editingAgent.name) payload.name = agentForm.name.trim();
    if ((agentForm.description || '') !== (editingAgent.description || '')) payload.description = agentForm.description.trim();
    if ((agentForm.instruction || '') !== (editingAgent.instruction || '')) payload.instruction = agentForm.instruction.trim();
    if (agentForm.agentType.trim() && agentForm.agentType.trim() !== editingAgent.agentType) payload.agentType = agentForm.agentType.trim();
    const result = await updateAgent(editingAgent.id, payload);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setMessage({ type: 'success', text: 'Agent 已更新' });
    closeAgentModal();
    await loadAgents();
  };

  const submitDeleteAgent = async (agent: Agent) => {
    setMessage(null);
    const confirmed = window.confirm(`确定要删除 Agent "${agent.name}"（ID ${agent.id}）吗？\n如存在绑定，请先删除绑定。`);
    if (!confirmed) return;
    const result = await deleteAgent(agent.id);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setMessage({ type: 'success', text: 'Agent 已删除' });
    setSelectedAgentId(null);
    setBindings([]);
    await loadAgents();
  };

  const submitSaveBinding = async () => {
    setMessage(null);
    if (!selectedAgent) return;
    const llmModelId = parseInt(bindingCreateForm.llmModelId, 10);
    if (isNaN(llmModelId) || llmModelId <= 0) {
      setMessage({ type: 'error', text: '请选择 LLM Model' });
      return;
    }
    const priority = parseInt(bindingCreateForm.priority, 10);
    const payload: { llmModelId: number; priority?: number; isActive?: boolean } = { llmModelId };
    if (!isNaN(priority)) payload.priority = priority;
    payload.isActive = bindingCreateForm.isActive;
    const result = await createAgentBinding(selectedAgent.id, payload);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setMessage({ type: 'success', text: '绑定已保存' });
    await loadBindings(selectedAgent.id);
  };

  const submitDeleteCurrentBinding = async (binding: AgentBinding) => {
    setMessage(null);
    const confirmed = window.confirm(
      `确定要删除绑定？\nAgent #${binding.agentId} -> ${binding.providerName}/${binding.modelName} (${binding.modelType})`
    );
    if (!confirmed) return;
    const result = await deleteAgentBinding(binding.id);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setMessage({ type: 'success', text: '绑定已删除' });
    if (selectedAgent) await loadBindings(selectedAgent.id);
  };

  return (
    <div className="agent-page">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="header-title">SparkX Admin</h1>
            {adminInfo && <span className="admin-role-badge">{adminInfo.role === 'super_admin' ? '超级管理员' : '管理员'}</span>}
          </div>
          <div className="header-actions">
            <Link to="/dashboard" className="nav-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              返回仪表盘
            </Link>
            <button onClick={handleLogout} className="logout-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-container">
          <div className="page-header">
            <h2 className="page-title">Agent 管理</h2>
          </div>

          {message && <div className={`agent-message ${message.type}`}>{message.text}</div>}

          <div className="agent-layout">
            <section className="agent-panel">
              <h3 className="agent-panel-title">Agent 列表</h3>
              <div className="agent-toolbar">
                <select value={filterType} onChange={(e) => { setAgentsPage((p) => ({ ...p, page: 1 })); setFilterType(e.target.value); }}>
                  <option value="">全部类型</option>
                  <option value="code">code（代码）</option>
                  <option value="asset">asset（资源）</option>
                  <option value="design">design（设计）</option>
                  <option value="test">test（测试）</option>
                  <option value="build">build（构建）</option>
                  <option value="ops">ops（运维）</option>
                </select>
                <button className="agent-primary-btn" onClick={openCreateAgent}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                  新建 Agent
                </button>
              </div>

              <div className="agent-toolbar">
                <button
                  className="agent-icon-btn"
                  onClick={() => setAgentsPage((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                  disabled={agentsPage.page <= 1 || agentsLoading}
                  title="上一页"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <div className="agent-page-info">
                  {agentsLoading ? (
                    <span className="agent-loading-dots">加载中</span>
                  ) : (
                    <>
                      <span className="agent-page-num">{agentsPage.page}</span>
                      <span className="agent-page-sep">/</span>
                      <span className="agent-page-total">{Math.max(1, Math.ceil(agentsPage.total / agentsPage.pageSize))}</span>
                    </>
                  )}
                </div>
                <button
                  className="agent-icon-btn"
                  onClick={() => {
                    const maxPage = Math.max(1, Math.ceil(agentsPage.total / agentsPage.pageSize));
                    setAgentsPage((p) => ({ ...p, page: Math.min(maxPage, p.page + 1) }));
                  }}
                  disabled={agentsLoading || agentsPage.page >= Math.ceil(agentsPage.total / agentsPage.pageSize)}
                  title="下一页"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
                <div className="agent-total-count">共 {agentsPage.total} 条</div>
              </div>

              <div className="agent-list">
                {agents.length === 0 && <div className="agent-empty">暂无 Agent</div>}
                {agents.map((a) => (
                  <div
                    key={a.id}
                    className={`agent-item ${selectedAgentId === a.id ? 'active' : ''}`}
                    onClick={() => setSelectedAgentId(a.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') setSelectedAgentId(a.id);
                    }}
                  >
                    <div className="agent-item-header">
                      <div className="agent-item-name">{a.name}</div>
                      <span
                        className="agent-item-type-badge"
                        style={{ backgroundColor: `${agentTypeColor(a.agentType)}20`, color: agentTypeColor(a.agentType) }}
                      >
                        {agentTypeLabel(a.agentType)}
                      </span>
                    </div>
                    <div className="agent-item-meta">
                      <span>ID: #{a.id}</span>
                      <span>{a.createdAt?.split(' ')[0] || '--'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="agent-panel">
              <div className="agent-detail-header">
                <h3 className="agent-detail-title">{selectedAgent ? selectedAgent.name : '请选择一个 Agent'}</h3>
                {selectedAgent && (
                  <div className="agent-detail-actions">
                    <button className="agent-secondary-btn" onClick={() => openEditAgent(selectedAgent)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                      编辑
                    </button>
                    <button className="agent-danger-btn" onClick={() => submitDeleteAgent(selectedAgent)}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                      </svg>
                      删除
                    </button>
                  </div>
                )}
              </div>

              {selectedAgent && (
                <>
                  <div className="agent-kv">
                    <div className="k">ID</div>
                    <div className="v">{selectedAgent.id}</div>
                    <div className="k">类型</div>
                    <div className="v">
                      <span
                        className="agent-type-badge"
                        style={{ backgroundColor: `${agentTypeColor(selectedAgent.agentType)}20`, color: agentTypeColor(selectedAgent.agentType) }}
                      >
                        {selectedAgent.agentType}（{agentTypeLabel(selectedAgent.agentType)}）
                      </span>
                    </div>
                    <div className="k">创建时间</div>
                    <div className="v">{selectedAgent.createdAt}</div>
                    <div className="k">描述</div>
                    <div className="v">{selectedAgent.description || '--'}</div>
                    <div className="k">指令</div>
                    <div className="v">{selectedAgent.instruction || '--'}</div>
                  </div>

                  <div className="agent-divider" />

                  <h3 className="agent-panel-title">模型绑定（每个 Agent 仅能绑定一个模型）</h3>
                  <div className="agent-bindings-toolbar">
                    <div className="agent-binding-field">
                      <label>模型</label>
                      <select
                        value={bindingCreateForm.llmModelId}
                        onChange={(e) => setBindingCreateForm((s) => ({ ...s, llmModelId: e.target.value }))}
                      >
                        <option value="">选择 LLM Model</option>
                        {modelsSorted.map((m) => (
                          <option key={m.id} value={String(m.id)}>
                            {providerNameById.get(m.providerId) ? `${providerNameById.get(m.providerId)} / ` : ''}
                            {m.modelName} ({m.modelType}) #{m.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="agent-binding-field">
                      <label>优先级</label>
                      <input
                        type="number"
                        value={bindingCreateForm.priority}
                        onChange={(e) => setBindingCreateForm((s) => ({ ...s, priority: e.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div className="agent-binding-field">
                      <label>状态</label>
                      <select
                        value={bindingCreateForm.isActive ? 'true' : 'false'}
                        onChange={(e) => setBindingCreateForm((s) => ({ ...s, isActive: e.target.value === 'true' }))}
                      >
                        <option value="true">启用</option>
                        <option value="false">禁用</option>
                      </select>
                    </div>
                    <button className="agent-primary-btn" onClick={submitSaveBinding} disabled={bindingsLoading}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                        <path d="M5 12h14" />
                        <path d="M12 5v14" />
                      </svg>
                      保存绑定
                    </button>
                    <button
                      className="agent-danger-btn"
                      onClick={() => {
                        const current = bindings[0];
                        if (current) void submitDeleteCurrentBinding(current);
                      }}
                      disabled={bindingsLoading || bindings.length === 0}
                    >
                      删除绑定
                    </button>
                  </div>

                  <div className="agent-binding-current">
                    {bindingsLoading ? (
                      <div style={{ color: '#6b7280' }}>加载中…</div>
                    ) : bindings.length === 0 ? (
                      <div style={{ color: '#6b7280' }}>当前未绑定模型</div>
                    ) : (
                      <div style={{ color: '#111827' }}>
                        当前绑定：{bindings[0].providerName}/{bindings[0].modelName} ({bindings[0].modelType}) #{bindings[0].llmModelId}（
                        {bindings[0].isActive ? '启用' : '禁用'}，priority {bindings[0].priority}，binding #{bindings[0].id}）
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </main>

      {isAgentModalOpen && (
        <div className="agent-modal-backdrop" role="presentation" onClick={closeAgentModal}>
          <div className="agent-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <div className="agent-modal-title">{agentModalMode === 'create' ? '新建 Agent' : '编辑 Agent'}</div>
            <div className="agent-form">
              <input
                value={agentForm.name}
                onChange={(e) => setAgentForm((s) => ({ ...s, name: e.target.value }))}
                placeholder="Agent 名称"
              />
              <select value={agentForm.agentType} onChange={(e) => setAgentForm((s) => ({ ...s, agentType: e.target.value }))}>
                <option value="code">code（代码）</option>
                <option value="asset">asset（资源）</option>
                <option value="design">design（设计）</option>
                <option value="test">test（测试）</option>
                <option value="build">build（构建）</option>
                <option value="ops">ops（运维）</option>
              </select>
              <input
                value={agentForm.instruction}
                onChange={(e) => setAgentForm((s) => ({ ...s, instruction: e.target.value }))}
                placeholder="指令（可选）"
              />
              <textarea
                value={agentForm.description}
                onChange={(e) => setAgentForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="描述（可选）"
              />
            </div>
            <div className="agent-modal-actions">
              <button className="agent-secondary-btn" onClick={closeAgentModal}>
                取消
              </button>
              <button className="agent-primary-btn" onClick={submitAgent}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
