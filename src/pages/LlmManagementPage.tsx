import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SoftwareTemplatesPage.css';
import './LlmManagementPage.css';

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
  type: 'error' | 'success' | 'info';
  text: string;
}

interface LlmProvider {
  id: number;
  name: string;
  baseUrl: string;
  hasApiKey: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

interface LlmModel {
  id: number;
  providerId: number;
  modelName: string;
  modelType: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  supportStream: boolean;
  supportJson: boolean;
  priceInputPer1k: number;
  priceOutputPer1k: number;
  createdAt: string;
  updatedAt: string;
}

interface LlmUsageLog {
  id: number;
  llmModelId: number;
  projectId: number;
  inputTokens: number;
  outputTokens: number;
  cacheHit: boolean;
  costUsd: number;
  createdAt: string;
}

const API_BASE_URL = import.meta.env.SPARKX_API_BASE_URL || '';

const parseApiErrorMessage = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return 'Request failed';
  let extractedMessage: string | null = null;
  try {
    const parsed = JSON.parse(text) as { message?: unknown; msg?: unknown };
    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      extractedMessage = parsed.message;
    }
    if (typeof parsed.msg === 'string' && parsed.msg.trim()) {
      extractedMessage = parsed.msg;
    }
  } catch {
    extractedMessage = null;
  }
  if (extractedMessage) return extractedMessage;
  const normalized = text.trim();
  return normalized || 'Request failed';
};

const getAuthToken = (): string | null => {
  return localStorage.getItem('sparkx_admin_token') || sessionStorage.getItem('sparkx_admin_token');
};

const listLlmProviders = async (
  page: number,
  pageSize: number
): Promise<
  | { ok: true; data: { list: LlmProvider[]; page: PageInfo } }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/llm/providers?page=${page}&pageSize=${pageSize}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { ok: false, message: await parseApiErrorMessage(response) };
    }

    return { ok: true, data: (await response.json()) as { list: LlmProvider[]; page: PageInfo } };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const createLlmProvider = async (input: {
  name: string;
  baseUrl: string;
  apiKey?: string;
  description?: string;
}): Promise<
  | { ok: true; data: LlmProvider }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/llm/providers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { ok: false, message: await parseApiErrorMessage(response) };
    }

    return { ok: true, data: (await response.json()) as LlmProvider };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const updateLlmProvider = async (
  id: number,
  input: { name?: string; baseUrl?: string; apiKey?: string; clearApiKey?: boolean; description?: string }
): Promise<
  | { ok: true }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/llm/providers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { ok: false, message: await parseApiErrorMessage(response) };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const deleteLlmProvider = async (id: number): Promise<
  | { ok: true }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/llm/providers/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { ok: false, message: await parseApiErrorMessage(response) };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const listLlmModels = async (input: {
  providerId?: number;
  modelType?: string;
  page: number;
  pageSize: number;
}): Promise<
  | { ok: true; data: { list: LlmModel[]; page: PageInfo } }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const params = new URLSearchParams();
    params.set('page', String(input.page));
    params.set('pageSize', String(input.pageSize));
    if (input.providerId && input.providerId > 0) params.set('providerId', String(input.providerId));
    if (input.modelType && input.modelType.trim()) params.set('modelType', input.modelType.trim());
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/llm/models?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { ok: false, message: await parseApiErrorMessage(response) };
    }

    return { ok: true, data: (await response.json()) as { list: LlmModel[]; page: PageInfo } };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const createLlmModel = async (input: {
  providerId: number;
  modelName: string;
  modelType: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  supportStream: boolean;
  supportJson: boolean;
  priceInputPer1k: number;
  priceOutputPer1k: number;
}): Promise<
  | { ok: true; data: LlmModel }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/llm/models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { ok: false, message: await parseApiErrorMessage(response) };
    }

    return { ok: true, data: (await response.json()) as LlmModel };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const updateLlmModel = async (
  id: number,
  input: {
    providerId?: number;
    modelName?: string;
    modelType?: string;
    maxInputTokens?: number;
    maxOutputTokens?: number;
    supportStream?: boolean;
    supportJson?: boolean;
    priceInputPer1k?: number;
    priceOutputPer1k?: number;
  }
): Promise<
  | { ok: true }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/llm/models/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return { ok: false, message: await parseApiErrorMessage(response) };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const deleteLlmModel = async (id: number): Promise<
  | { ok: true }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/llm/models/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { ok: false, message: await parseApiErrorMessage(response) };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

const listLlmUsageLogs = async (input: {
  projectId?: number;
  llmModelId?: number;
  page: number;
  pageSize: number;
}): Promise<
  | { ok: true; data: { list: LlmUsageLog[]; page: PageInfo } }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const params = new URLSearchParams();
    params.set('page', String(input.page));
    params.set('pageSize', String(input.pageSize));
    if (input.projectId && input.projectId > 0) params.set('projectId', String(input.projectId));
    if (input.llmModelId && input.llmModelId > 0) params.set('llmModelId', String(input.llmModelId));
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/llm/usage-logs?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return { ok: false, message: await parseApiErrorMessage(response) };
    }

    return { ok: true, data: (await response.json()) as { list: LlmUsageLog[]; page: PageInfo } };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : 'Request failed' };
  }
};

type TabKey = 'providers' | 'models' | 'usage';

export default function LlmManagementPage() {
  const navigate = useNavigate();

  const adminInfo = useMemo<AdminInfo | null>(() => {
    const adminId = localStorage.getItem('sparkx_admin_id') || sessionStorage.getItem('sparkx_admin_id');
    const role = localStorage.getItem('sparkx_admin_role') || sessionStorage.getItem('sparkx_admin_role');

    if (adminId && role) {
      return { id: parseInt(adminId, 10), role };
    }
    return null;
  }, []);

  const [activeTab, setActiveTab] = useState<TabKey>('providers');
  const [message, setMessage] = useState<Message | null>(null);

  const [providers, setProviders] = useState<LlmProvider[]>([]);
  const [providersPage, setProvidersPage] = useState<PageInfo>({ page: 1, pageSize: 20, total: 0 });
  const [providersLoading, setProvidersLoading] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState<number | null>(null);

  const selectedProvider =
    selectedProviderId === null ? null : providers.find((p) => p.id === selectedProviderId) ?? null;

  const [models, setModels] = useState<LlmModel[]>([]);
  const [modelsPage, setModelsPage] = useState<PageInfo>({ page: 1, pageSize: 20, total: 0 });
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [modelFilterProviderId, setModelFilterProviderId] = useState('');
  const [modelFilterType, setModelFilterType] = useState('');

  const selectedModel = selectedModelId === null ? null : models.find((m) => m.id === selectedModelId) ?? null;

  const [usageLogs, setUsageLogs] = useState<LlmUsageLog[]>([]);
  const [usagePage, setUsagePage] = useState<PageInfo>({ page: 1, pageSize: 20, total: 0 });
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageFilterProjectId, setUsageFilterProjectId] = useState('');
  const [usageFilterModelId, setUsageFilterModelId] = useState('');

  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [providerModalMode, setProviderModalMode] = useState<'create' | 'edit'>('create');
  const [editingProvider, setEditingProvider] = useState<LlmProvider | null>(null);
  const [providerForm, setProviderForm] = useState({
    name: '',
    baseUrl: '',
    description: '',
    apiKey: '',
    clearApiKey: false,
  });

  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [modelModalMode, setModelModalMode] = useState<'create' | 'edit'>('create');
  const [editingModel, setEditingModel] = useState<LlmModel | null>(null);
  const [modelForm, setModelForm] = useState({
    providerId: '',
    modelName: '',
    modelType: 'llm',
    maxInputTokens: '0',
    maxOutputTokens: '0',
    supportStream: false,
    supportJson: false,
    priceInputPer1k: '0',
    priceOutputPer1k: '0',
  });

  const handleLogout = () => {
    localStorage.removeItem('sparkx_admin_token');
    localStorage.removeItem('sparkx_admin_id');
    localStorage.removeItem('sparkx_admin_role');
    sessionStorage.removeItem('sparkx_admin_token');
    sessionStorage.removeItem('sparkx_admin_id');
    sessionStorage.removeItem('sparkx_admin_role');
    navigate('/login');
  };

  const loadProviders = useCallback(async () => {
    setProvidersLoading(true);
    const result = await listLlmProviders(providersPage.page, providersPage.pageSize);
    setProvidersLoading(false);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setProviders(result.data.list);
    setProvidersPage(result.data.page);
    const nextSelected = (selectedProviderId ? result.data.list.find((p) => p.id === selectedProviderId) : null) ?? result.data.list[0] ?? null;
    setSelectedProviderId(nextSelected ? nextSelected.id : null);
  }, [providersPage.page, providersPage.pageSize, selectedProviderId]);

  const loadModels = useCallback(async () => {
    setModelsLoading(true);
    const providerId = parseInt(modelFilterProviderId, 10);
    const result = await listLlmModels({
      providerId: !isNaN(providerId) && providerId > 0 ? providerId : undefined,
      modelType: modelFilterType.trim() || undefined,
      page: modelsPage.page,
      pageSize: modelsPage.pageSize,
    });
    setModelsLoading(false);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setModels(result.data.list);
    setModelsPage(result.data.page);
    const nextSelected = (selectedModelId ? result.data.list.find((m) => m.id === selectedModelId) : null) ?? result.data.list[0] ?? null;
    setSelectedModelId(nextSelected ? nextSelected.id : null);
  }, [modelFilterProviderId, modelFilterType, modelsPage.page, modelsPage.pageSize, selectedModelId]);

  const loadUsageLogs = useCallback(async () => {
    setUsageLoading(true);
    const projectId = parseInt(usageFilterProjectId, 10);
    const llmModelId = parseInt(usageFilterModelId, 10);
    const result = await listLlmUsageLogs({
      projectId: !isNaN(projectId) && projectId > 0 ? projectId : undefined,
      llmModelId: !isNaN(llmModelId) && llmModelId > 0 ? llmModelId : undefined,
      page: usagePage.page,
      pageSize: usagePage.pageSize,
    });
    setUsageLoading(false);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setUsageLogs(result.data.list);
    setUsagePage(result.data.page);
  }, [usageFilterModelId, usageFilterProjectId, usagePage.page, usagePage.pageSize]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/login');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const timeoutId = window.setTimeout(() => {
      if (activeTab === 'providers') {
        void loadProviders();
        return;
      }
      if (activeTab === 'models') {
        void loadModels();
        return;
      }
      void loadUsageLogs();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [activeTab, loadModels, loadProviders, loadUsageLogs]);

  const openCreateProvider = () => {
    setMessage(null);
    setProviderModalMode('create');
    setEditingProvider(null);
    setProviderForm({ name: '', baseUrl: '', description: '', apiKey: '', clearApiKey: false });
    setIsProviderModalOpen(true);
  };

  const openEditProvider = (provider: LlmProvider) => {
    setMessage(null);
    setProviderModalMode('edit');
    setEditingProvider(provider);
    setProviderForm({ name: provider.name, baseUrl: provider.baseUrl, description: provider.description, apiKey: '', clearApiKey: false });
    setIsProviderModalOpen(true);
  };

  const closeProviderModal = () => {
    setIsProviderModalOpen(false);
    setEditingProvider(null);
    setProviderForm({ name: '', baseUrl: '', description: '', apiKey: '', clearApiKey: false });
  };

  const submitProvider = async () => {
    setMessage(null);
    if (!providerForm.name.trim()) {
      setMessage({ type: 'error', text: 'Provider 名称不能为空' });
      return;
    }

    if (providerModalMode === 'create') {
      const payload: { name: string; baseUrl: string; apiKey?: string; description?: string } = {
        name: providerForm.name.trim(),
        baseUrl: providerForm.baseUrl.trim(),
      };
      if (providerForm.description.trim()) payload.description = providerForm.description.trim();
      if (providerForm.apiKey.trim()) payload.apiKey = providerForm.apiKey.trim();
      const result = await createLlmProvider(payload);
      if (!result.ok) {
        setMessage({ type: 'error', text: result.message });
        return;
      }
      setMessage({ type: 'success', text: 'Provider 创建成功！' });
      closeProviderModal();
      await loadProviders();
      setSelectedProviderId(result.data.id);
      return;
    }

    if (!editingProvider) return;
    const payload: { name?: string; baseUrl?: string; apiKey?: string; clearApiKey?: boolean; description?: string } = {};
    if (providerForm.name.trim() && providerForm.name.trim() !== editingProvider.name) payload.name = providerForm.name.trim();
    if (providerForm.baseUrl.trim() !== editingProvider.baseUrl) payload.baseUrl = providerForm.baseUrl.trim();
    if (providerForm.description.trim() !== (editingProvider.description || '')) payload.description = providerForm.description.trim();
    if (providerForm.clearApiKey) payload.clearApiKey = true;
    else if (providerForm.apiKey.trim()) payload.apiKey = providerForm.apiKey.trim();

    const result = await updateLlmProvider(editingProvider.id, payload);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setMessage({ type: 'success', text: 'Provider 更新成功！' });
    closeProviderModal();
    await loadProviders();
  };

  const submitDeleteProvider = async (provider: LlmProvider) => {
    setMessage(null);
    const confirmed = window.confirm(`确定要删除 Provider "${provider.name}"（ID ${provider.id}）吗？`);
    if (!confirmed) return;
    const result = await deleteLlmProvider(provider.id);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setMessage({ type: 'success', text: 'Provider 已删除' });
    setSelectedProviderId(null);
    await loadProviders();
  };

  const openCreateModel = () => {
    setMessage(null);
    setModelModalMode('create');
    setEditingModel(null);
    setModelForm({
      providerId: selectedProvider ? String(selectedProvider.id) : '',
      modelName: '',
      modelType: 'llm',
      maxInputTokens: '0',
      maxOutputTokens: '0',
      supportStream: false,
      supportJson: false,
      priceInputPer1k: '0',
      priceOutputPer1k: '0',
    });
    setIsModelModalOpen(true);
  };

  const openEditModel = (m: LlmModel) => {
    setMessage(null);
    setModelModalMode('edit');
    setEditingModel(m);
    setModelForm({
      providerId: String(m.providerId),
      modelName: m.modelName,
      modelType: m.modelType,
      maxInputTokens: String(m.maxInputTokens),
      maxOutputTokens: String(m.maxOutputTokens),
      supportStream: m.supportStream,
      supportJson: m.supportJson,
      priceInputPer1k: String(m.priceInputPer1k),
      priceOutputPer1k: String(m.priceOutputPer1k),
    });
    setIsModelModalOpen(true);
  };

  const closeModelModal = () => {
    setIsModelModalOpen(false);
    setEditingModel(null);
  };

  const submitModel = async () => {
    setMessage(null);
    const providerId = parseInt(modelForm.providerId, 10);
    if (isNaN(providerId) || providerId <= 0) {
      setMessage({ type: 'error', text: '请选择 Provider' });
      return;
    }
    if (!modelForm.modelName.trim()) {
      setMessage({ type: 'error', text: 'Model 名称不能为空' });
      return;
    }
    const maxInputTokens = parseInt(modelForm.maxInputTokens, 10);
    const maxOutputTokens = parseInt(modelForm.maxOutputTokens, 10);
    const priceInputPer1k = parseFloat(modelForm.priceInputPer1k);
    const priceOutputPer1k = parseFloat(modelForm.priceOutputPer1k);

    if (modelModalMode === 'create') {
      const result = await createLlmModel({
        providerId,
        modelName: modelForm.modelName.trim(),
        modelType: modelForm.modelType,
        maxInputTokens: isNaN(maxInputTokens) ? 0 : Math.max(0, maxInputTokens),
        maxOutputTokens: isNaN(maxOutputTokens) ? 0 : Math.max(0, maxOutputTokens),
        supportStream: modelForm.supportStream,
        supportJson: modelForm.supportJson,
        priceInputPer1k: isNaN(priceInputPer1k) ? 0 : Math.max(0, priceInputPer1k),
        priceOutputPer1k: isNaN(priceOutputPer1k) ? 0 : Math.max(0, priceOutputPer1k),
      });
      if (!result.ok) {
        setMessage({ type: 'error', text: result.message });
        return;
      }
      setMessage({ type: 'success', text: 'Model 创建成功！' });
      closeModelModal();
      await loadModels();
      setSelectedModelId(result.data.id);
      return;
    }

    if (!editingModel) return;
    const payload: {
      providerId?: number;
      modelName?: string;
      modelType?: string;
      maxInputTokens?: number;
      maxOutputTokens?: number;
      supportStream?: boolean;
      supportJson?: boolean;
      priceInputPer1k?: number;
      priceOutputPer1k?: number;
    } = {};
    if (providerId !== editingModel.providerId) payload.providerId = providerId;
    if (modelForm.modelName.trim() !== editingModel.modelName) payload.modelName = modelForm.modelName.trim();
    if (modelForm.modelType !== editingModel.modelType) payload.modelType = modelForm.modelType;
    const nextMaxIn = isNaN(maxInputTokens) ? 0 : Math.max(0, maxInputTokens);
    const nextMaxOut = isNaN(maxOutputTokens) ? 0 : Math.max(0, maxOutputTokens);
    const nextPriceIn = isNaN(priceInputPer1k) ? 0 : Math.max(0, priceInputPer1k);
    const nextPriceOut = isNaN(priceOutputPer1k) ? 0 : Math.max(0, priceOutputPer1k);
    if (nextMaxIn !== editingModel.maxInputTokens) payload.maxInputTokens = nextMaxIn;
    if (nextMaxOut !== editingModel.maxOutputTokens) payload.maxOutputTokens = nextMaxOut;
    if (modelForm.supportStream !== editingModel.supportStream) payload.supportStream = modelForm.supportStream;
    if (modelForm.supportJson !== editingModel.supportJson) payload.supportJson = modelForm.supportJson;
    if (nextPriceIn !== editingModel.priceInputPer1k) payload.priceInputPer1k = nextPriceIn;
    if (nextPriceOut !== editingModel.priceOutputPer1k) payload.priceOutputPer1k = nextPriceOut;

    const result = await updateLlmModel(editingModel.id, payload);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setMessage({ type: 'success', text: 'Model 更新成功！' });
    closeModelModal();
    await loadModels();
  };

  const submitDeleteModel = async (m: LlmModel) => {
    setMessage(null);
    const confirmed = window.confirm(`确定要删除 Model "${m.modelName}"（ID ${m.id}）吗？`);
    if (!confirmed) return;
    const result = await deleteLlmModel(m.id);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    setMessage({ type: 'success', text: 'Model 已删除' });
    setSelectedModelId(null);
    await loadModels();
  };

  const totalProvidersPages = Math.ceil(providersPage.total / providersPage.pageSize);
  const totalModelsPages = Math.ceil(modelsPage.total / modelsPage.pageSize);
  const totalUsagePages = Math.ceil(usagePage.total / usagePage.pageSize);

  return (
    <div className="llm-page">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="header-title">SparkX Admin</h1>
            {adminInfo && (
              <span className="admin-role-badge">{adminInfo.role === 'super_admin' ? '超级管理员' : '管理员'}</span>
            )}
          </div>
          <div className="header-actions">
            <button onClick={() => navigate('/dashboard')} className="nav-button">
              返回仪表盘
            </button>
            <button onClick={handleLogout} className="logout-button">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
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
            <h2 className="page-title">大模型管理</h2>
            {activeTab === 'providers' ? (
              <button onClick={openCreateProvider} className="create-button">
                创建 Provider
              </button>
            ) : activeTab === 'models' ? (
              <button onClick={openCreateModel} className="create-button">
                创建 Model
              </button>
            ) : null}
          </div>

          <div className="llm-tabs">
            <button
              type="button"
              className={`llm-tab ${activeTab === 'providers' ? 'active' : ''}`}
              onClick={() => setActiveTab('providers')}
            >
              Providers
            </button>
            <button
              type="button"
              className={`llm-tab ${activeTab === 'models' ? 'active' : ''}`}
              onClick={() => setActiveTab('models')}
            >
              Models
            </button>
            <button
              type="button"
              className={`llm-tab ${activeTab === 'usage' ? 'active' : ''}`}
              onClick={() => setActiveTab('usage')}
            >
              Usage Logs
            </button>
          </div>

          {message && <div className={`message message-${message.type}`}>{message.text}</div>}

          {activeTab === 'providers' ? (
            <div className="templates-split-container">
              {providersLoading ? (
                <div className="loading-state">加载中...</div>
              ) : providers.length === 0 ? (
                <div className="empty-state">
                  <p>暂无 Provider</p>
                  <button onClick={openCreateProvider} className="create-button-small">
                    创建第一个 Provider
                  </button>
                </div>
              ) : (
                <div className="templates-split-layout">
                  <aside className="templates-sidebar">
                    <div className="sidebar-header">
                      <h3 className="sidebar-title">Provider 列表</h3>
                    </div>
                    <div className="template-list">
                      {providers.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`template-list-item ${p.id === selectedProviderId ? 'selected' : ''}`}
                          onClick={() => setSelectedProviderId(p.id)}
                        >
                          <div className="template-list-item-title">{p.name}</div>
                          <div className="template-list-item-meta">
                            <span>ID {p.id}</span>
                            <span>{p.hasApiKey ? '已配置 Key' : '未配置 Key'}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {totalProvidersPages > 1 && (
                      <div className="pagination">
                        <button
                          onClick={() => setProvidersPage((prev) => ({ ...prev, page: prev.page - 1 }))}
                          disabled={providersPage.page <= 1}
                          className="pagination-button"
                        >
                          上一页
                        </button>
                        <span className="pagination-info">
                          第 {providersPage.page} 页 / 共 {totalProvidersPages} 页 (共 {providersPage.total} 条)
                        </span>
                        <button
                          onClick={() => setProvidersPage((prev) => ({ ...prev, page: prev.page + 1 }))}
                          disabled={providersPage.page >= totalProvidersPages}
                          className="pagination-button"
                        >
                          下一页
                        </button>
                      </div>
                    )}
                  </aside>

                  <section className="templates-detail">
                    {!selectedProvider ? (
                      <div className="empty-state">
                        <p>请选择一个 Provider</p>
                      </div>
                    ) : (
                      <div className="template-detail-top">
                        <div className="detail-card">
                          <div className="detail-card-header">
                            <div className="detail-title">
                              <h3 className="detail-name">{selectedProvider.name}</h3>
                              <span className="detail-id">#{selectedProvider.id}</span>
                            </div>
                            <div className="detail-actions">
                              <button
                                type="button"
                                onClick={() => openEditProvider(selectedProvider)}
                                className="primary-file-button update"
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                onClick={() => void submitDeleteProvider(selectedProvider)}
                                className="secondary-action-button"
                              >
                                删除
                              </button>
                            </div>
                          </div>

                          <div className="detail-grid">
                            <div className="detail-row">
                              <span className="detail-label">Base URL</span>
                              <span className="detail-value">{selectedProvider.baseUrl || '-'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">API Key</span>
                              <span className="detail-value">{selectedProvider.hasApiKey ? '已配置' : '未配置'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">描述</span>
                              <span className="detail-value">{selectedProvider.description || '-'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">创建时间</span>
                              <span className="detail-value">{selectedProvider.createdAt}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">更新时间</span>
                              <span className="detail-value">{selectedProvider.updatedAt}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          ) : activeTab === 'models' ? (
            <div className="templates-split-container">
              <div className="llm-filters">
                <div className="form-group">
                  <label className="form-label">Provider</label>
                  <input
                    type="number"
                    className="form-input"
                    value={modelFilterProviderId}
                    onChange={(e) => {
                      setModelsPage((prev) => ({ ...prev, page: 1 }));
                      setModelFilterProviderId(e.target.value);
                    }}
                    placeholder="输入 Provider ID（可选）"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Model 类型</label>
                  <select
                    className="form-select"
                    value={modelFilterType}
                    onChange={(e) => {
                      setModelsPage((prev) => ({ ...prev, page: 1 }));
                      setModelFilterType(e.target.value);
                    }}
                  >
                    <option value="">全部</option>
                    <option value="llm">llm</option>
                    <option value="vlm">vlm</option>
                    <option value="embedding">embedding</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="create-button-small"
                  onClick={() => {
                    setMessage(null);
                    void loadModels();
                  }}
                >
                  查询
                </button>
              </div>

              {modelsLoading ? (
                <div className="loading-state">加载中...</div>
              ) : models.length === 0 ? (
                <div className="empty-state">
                  <p>暂无 Model</p>
                  <button onClick={openCreateModel} className="create-button-small">
                    创建第一个 Model
                  </button>
                </div>
              ) : (
                <div className="templates-split-layout">
                  <aside className="templates-sidebar">
                    <div className="sidebar-header">
                      <h3 className="sidebar-title">Model 列表</h3>
                    </div>
                    <div className="template-list">
                      {models.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className={`template-list-item ${m.id === selectedModelId ? 'selected' : ''}`}
                          onClick={() => setSelectedModelId(m.id)}
                        >
                          <div className="template-list-item-title">{m.modelName}</div>
                          <div className="template-list-item-meta">
                            <span>ID {m.id}</span>
                            <span>
                              P{m.providerId} · {m.modelType}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    {totalModelsPages > 1 && (
                      <div className="pagination">
                        <button
                          onClick={() => setModelsPage((prev) => ({ ...prev, page: prev.page - 1 }))}
                          disabled={modelsPage.page <= 1}
                          className="pagination-button"
                        >
                          上一页
                        </button>
                        <span className="pagination-info">
                          第 {modelsPage.page} 页 / 共 {totalModelsPages} 页 (共 {modelsPage.total} 条)
                        </span>
                        <button
                          onClick={() => setModelsPage((prev) => ({ ...prev, page: prev.page + 1 }))}
                          disabled={modelsPage.page >= totalModelsPages}
                          className="pagination-button"
                        >
                          下一页
                        </button>
                      </div>
                    )}
                  </aside>

                  <section className="templates-detail">
                    {!selectedModel ? (
                      <div className="empty-state">
                        <p>请选择一个 Model</p>
                      </div>
                    ) : (
                      <div className="template-detail-top">
                        <div className="detail-card">
                          <div className="detail-card-header">
                            <div className="detail-title">
                              <h3 className="detail-name">{selectedModel.modelName}</h3>
                              <span className="detail-id">#{selectedModel.id}</span>
                            </div>
                            <div className="detail-actions">
                              <button
                                type="button"
                                onClick={() => openEditModel(selectedModel)}
                                className="primary-file-button update"
                              >
                                编辑
                              </button>
                              <button
                                type="button"
                                onClick={() => void submitDeleteModel(selectedModel)}
                                className="secondary-action-button"
                              >
                                删除
                              </button>
                            </div>
                          </div>

                          <div className="detail-grid">
                            <div className="detail-row">
                              <span className="detail-label">Provider</span>
                              <span className="detail-value">{selectedModel.providerId}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">类型</span>
                              <span className="detail-value">{selectedModel.modelType}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">最大输入 Tokens</span>
                              <span className="detail-value">{selectedModel.maxInputTokens}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">最大输出 Tokens</span>
                              <span className="detail-value">{selectedModel.maxOutputTokens}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">Stream</span>
                              <span className="detail-value">{selectedModel.supportStream ? '支持' : '不支持'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">JSON</span>
                              <span className="detail-value">{selectedModel.supportJson ? '支持' : '不支持'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">输入价格 / 1k</span>
                              <span className="detail-value">{selectedModel.priceInputPer1k}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">输出价格 / 1k</span>
                              <span className="detail-value">{selectedModel.priceOutputPer1k}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">创建时间</span>
                              <span className="detail-value">{selectedModel.createdAt}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">更新时间</span>
                              <span className="detail-value">{selectedModel.updatedAt}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          ) : (
            <div className="templates-split-container">
              <div className="llm-filters">
                <div className="form-group">
                  <label className="form-label">Project ID</label>
                  <input
                    type="number"
                    className="form-input"
                    value={usageFilterProjectId}
                    onChange={(e) => {
                      setUsagePage((prev) => ({ ...prev, page: 1 }));
                      setUsageFilterProjectId(e.target.value);
                    }}
                    placeholder="输入 Project ID（可选）"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">LLM Model ID</label>
                  <input
                    type="number"
                    className="form-input"
                    value={usageFilterModelId}
                    onChange={(e) => {
                      setUsagePage((prev) => ({ ...prev, page: 1 }));
                      setUsageFilterModelId(e.target.value);
                    }}
                    placeholder="输入 Model ID（可选）"
                  />
                </div>
                <button
                  type="button"
                  className="create-button-small"
                  onClick={() => {
                    setMessage(null);
                    void loadUsageLogs();
                  }}
                >
                  查询
                </button>
              </div>

              {usageLoading ? (
                <div className="loading-state">加载中...</div>
              ) : usageLogs.length === 0 ? (
                <div className="empty-state">
                  <p>暂无用量日志</p>
                </div>
              ) : (
                <>
                  <div className="versions-table-container">
                    <table className="versions-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Model</th>
                          <th>Project</th>
                          <th>Input</th>
                          <th>Output</th>
                          <th>Cache</th>
                          <th>Cost USD</th>
                          <th>时间</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageLogs.map((u) => (
                          <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.llmModelId}</td>
                            <td>{u.projectId}</td>
                            <td>{u.inputTokens}</td>
                            <td>{u.outputTokens}</td>
                            <td>{u.cacheHit ? 'Y' : 'N'}</td>
                            <td>{u.costUsd}</td>
                            <td>{u.createdAt}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalUsagePages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => setUsagePage((prev) => ({ ...prev, page: prev.page - 1 }))}
                        disabled={usagePage.page <= 1}
                        className="pagination-button"
                      >
                        上一页
                      </button>
                      <span className="pagination-info">
                        第 {usagePage.page} 页 / 共 {totalUsagePages} 页 (共 {usagePage.total} 条)
                      </span>
                      <button
                        onClick={() => setUsagePage((prev) => ({ ...prev, page: prev.page + 1 }))}
                        disabled={usagePage.page >= totalUsagePages}
                        className="pagination-button"
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {isProviderModalOpen && (
        <div className="modal-overlay" onClick={closeProviderModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{providerModalMode === 'create' ? '创建 Provider' : '编辑 Provider'}</h3>
              <button onClick={closeProviderModal} className="modal-close">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label className="form-label">
                  名称 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={providerForm.name}
                  onChange={(e) => setProviderForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                  placeholder="如 OpenAI / Anthropic / Aliyun"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Base URL</label>
                <input
                  type="text"
                  value={providerForm.baseUrl}
                  onChange={(e) => setProviderForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  className="form-input"
                  placeholder="如 https://api.openai.com/v1"
                />
              </div>
              <div className="form-group">
                <label className="form-label">描述</label>
                <textarea
                  value={providerForm.description}
                  onChange={(e) => setProviderForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="form-textarea"
                  placeholder="可选"
                  rows={3}
                />
              </div>

              {providerModalMode === 'edit' ? (
                <div className="llm-form-row">
                  <label className="llm-checkbox">
                    <input
                      type="checkbox"
                      checked={providerForm.clearApiKey}
                      onChange={(e) => setProviderForm((prev) => ({ ...prev, clearApiKey: e.target.checked }))}
                    />
                    清空 API Key
                  </label>
                </div>
              ) : null}

              <div className="form-group">
                <label className="form-label">{providerModalMode === 'create' ? 'API Key（可选）' : 'API Key（设置新 Key，可选）'}</label>
                <input
                  type="password"
                  value={providerForm.apiKey}
                  onChange={(e) => setProviderForm((prev) => ({ ...prev, apiKey: e.target.value }))}
                  className="form-input"
                  placeholder="不会回显已保存的 Key"
                  disabled={providerForm.clearApiKey}
                />
              </div>

              <div className="modal-actions">
                <button onClick={closeProviderModal} className="button-secondary" type="button">
                  取消
                </button>
                <button onClick={() => void submitProvider()} className="button-primary" type="button">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isModelModalOpen && (
        <div className="modal-overlay" onClick={closeModelModal}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{modelModalMode === 'create' ? '创建 Model' : '编辑 Model'}</h3>
              <button onClick={closeModelModal} className="modal-close">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-form">
              <div className="llm-grid">
                <div className="form-group">
                  <label className="form-label">
                    Provider ID <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={modelForm.providerId}
                    onChange={(e) => setModelForm((prev) => ({ ...prev, providerId: e.target.value }))}
                    placeholder="例如 1"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Model 名称 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={modelForm.modelName}
                    onChange={(e) => setModelForm((prev) => ({ ...prev, modelName: e.target.value }))}
                    placeholder="例如 gpt-4o-mini"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    类型 <span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={modelForm.modelType}
                    onChange={(e) => setModelForm((prev) => ({ ...prev, modelType: e.target.value }))}
                  >
                    <option value="llm">llm</option>
                    <option value="vlm">vlm</option>
                    <option value="embedding">embedding</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">最大输入 Tokens</label>
                  <input
                    type="number"
                    className="form-input"
                    value={modelForm.maxInputTokens}
                    onChange={(e) => setModelForm((prev) => ({ ...prev, maxInputTokens: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">最大输出 Tokens</label>
                  <input
                    type="number"
                    className="form-input"
                    value={modelForm.maxOutputTokens}
                    onChange={(e) => setModelForm((prev) => ({ ...prev, maxOutputTokens: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">输入价格 / 1k</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="form-input"
                    value={modelForm.priceInputPer1k}
                    onChange={(e) => setModelForm((prev) => ({ ...prev, priceInputPer1k: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">输出价格 / 1k</label>
                  <input
                    type="number"
                    step="0.000001"
                    className="form-input"
                    value={modelForm.priceOutputPer1k}
                    onChange={(e) => setModelForm((prev) => ({ ...prev, priceOutputPer1k: e.target.value }))}
                  />
                </div>

                <div className="llm-form-row">
                  <label className="llm-checkbox">
                    <input
                      type="checkbox"
                      checked={modelForm.supportStream}
                      onChange={(e) => setModelForm((prev) => ({ ...prev, supportStream: e.target.checked }))}
                    />
                    支持 Stream
                  </label>
                  <label className="llm-checkbox">
                    <input
                      type="checkbox"
                      checked={modelForm.supportJson}
                      onChange={(e) => setModelForm((prev) => ({ ...prev, supportJson: e.target.checked }))}
                    />
                    支持 JSON
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button onClick={closeModelModal} className="button-secondary" type="button">
                  取消
                </button>
                <button onClick={() => void submitModel()} className="button-primary" type="button">
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
