import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './SoftwareTemplatesPage.css';

interface AdminInfo {
  id: number;
  role: string;
}

interface SoftwareTemplate {
  id: number;
  name: string;
  description: string;
  archiveFileId: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
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

interface PreUploadResp {
  uploadUrl: string;
  fileId: number;
  versionId: number;
  versionNumber: number;
  contentType: string;
}

interface FileVersionItem {
  id: number;
  fileId: number;
  versionNumber: number;
  sizeBytes: number;
  hash: string;
  storageKey: string;
  createdAt: string;
  updatedAt: string;
  createdBy: number;
}

interface DownloadFileResp {
  downloadUrl: string;
  expiresAt: string;
}

const API_BASE_URL = import.meta.env.SPARKX_API_BASE_URL || '';

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

const getAuthToken = (): string | null => {
  return localStorage.getItem('sparkx_admin_token') || sessionStorage.getItem('sparkx_admin_token');
};

// 计算文件 hash (使用 SHA-256)
const calculateFileHash = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// 预上传文件
const preUploadFile = async (input: {
  projectId: number;
  name: string;
  fileCategory: string;
  fileFormat: string;
  sizeBytes: number;
  hash: string;
  contentType?: string;
}): Promise<
  | { ok: true; data: PreUploadResp }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/files/preupload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
      data: (await response.json()) as PreUploadResp,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
};

const listFileVersions = async (
  fileId: number,
  page: number,
  pageSize: number
): Promise<
  | { ok: true; data: { list: FileVersionItem[]; page: PageInfo } }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/api/v1/admin/files/${fileId}/versions?page=${page}&pageSize=${pageSize}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        message: await parseApiErrorMessage(response),
      };
    }

    return {
      ok: true,
      data: (await response.json()) as { list: FileVersionItem[]; page: PageInfo },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
};

const getDownloadUrl = async (input: {
  fileId: number;
  versionId?: number;
  versionNumber?: number;
}): Promise<
  | { ok: true; data: DownloadFileResp }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const params = new URLSearchParams();
    if (input.versionId) params.set('versionId', String(input.versionId));
    if (input.versionNumber) params.set('versionNumber', String(input.versionNumber));
    const query = params.toString();
    const response = await fetch(
      `${API_BASE_URL}/api/v1/admin/files/${input.fileId}/download${query ? `?${query}` : ''}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        message: await parseApiErrorMessage(response),
      };
    }

    return {
      ok: true,
      data: (await response.json()) as DownloadFileResp,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
};

// 上传文件到 OSS
const uploadFileToOSS = async (uploadUrl: string, file: File, contentType: string): Promise<
  | { ok: true }
  | { ok: false; message: string }
> => {
  try {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: file,
    });

    if (!response.ok) {
      return {
        ok: false,
        message: `上传失败: ${response.status} ${response.statusText}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Upload failed',
    };
  }
};

const listSoftwareTemplates = async (page: number, pageSize: number): Promise<
  | { ok: true; data: { list: SoftwareTemplate[]; page: PageInfo } }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(
      `${API_BASE_URL}/api/v1/admin/software-templates?page=${page}&pageSize=${pageSize}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        message: await parseApiErrorMessage(response),
      };
    }

    return {
      ok: true,
      data: (await response.json()) as { list: SoftwareTemplate[]; page: PageInfo },
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
};

const createSoftwareTemplate = async (input: {
  name: string;
  description?: string;
  archiveFileId?: number;
}): Promise<
  | { ok: true; data: SoftwareTemplate }
  | { ok: false; message: string }
> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/software-templates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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
      data: (await response.json()) as SoftwareTemplate,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
};

const updateSoftwareTemplate = async (
  id: number,
  input: {
    name?: string;
    description?: string;
    archiveFileId?: number;
  }
): Promise<{ ok: true } | { ok: false; message: string }> => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/api/v1/admin/software-templates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      return {
        ok: false,
        message: await parseApiErrorMessage(response),
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Request failed',
    };
  }
};

// 获取文件扩展名
const getFileExtension = (filename: string): string => {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

// 获取文件分类
const getFileCategory = (ext: string): string => {
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'svg'];
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'flac', 'aac'];
  const textExts = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'ts', 'go', 'py', 'java', 'c', 'cpp', 'h'];
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'];

  if (imageExts.includes(ext)) return 'image';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  if (textExts.includes(ext)) return 'text';
  if (archiveExts.includes(ext)) return 'archive';
  return 'binary';
};

export default function SoftwareTemplatesPage() {
  const navigate = useNavigate();

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

  const [templates, setTemplates] = useState<SoftwareTemplate[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo>({ page: 1, pageSize: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SoftwareTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    archiveFileId: '',
  });

  // 文件上传相关状态
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'new' | 'existing'>('new');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [versions, setVersions] = useState<FileVersionItem[]>([]);
  const [versionsPageInfo, setVersionsPageInfo] = useState<PageInfo>({ page: 1, pageSize: 20, total: 0 });
  const [versionsLoading, setVersionsLoading] = useState(false);

  const clearVersions = useCallback(() => {
    setVersions([]);
    setVersionsPageInfo({ page: 1, pageSize: 20, total: 0 });
    setVersionsLoading(false);
  }, []);

  const loadVersionsForFile = useCallback(async (fileId: number, page: number, pageSize: number) => {
    setVersionsLoading(true);
    const result = await listFileVersions(fileId, page, pageSize);
    setVersionsLoading(false);

    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }

    setVersions(result.data.list);
    setVersionsPageInfo(result.data.page);
  }, []);

  const selectTemplate = useCallback(
    (template: SoftwareTemplate | null) => {
      setSelectedTemplateId(template ? template.id : null);

      if (!template?.archiveFileId) {
        clearVersions();
        return;
      }

      setVersions([]);
      setVersionsPageInfo((prev) => ({ ...prev, page: 1, total: 0 }));
      void loadVersionsForFile(template.archiveFileId, 1, versionsPageInfo.pageSize);
    },
    [clearVersions, loadVersionsForFile, versionsPageInfo.pageSize]
  );

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    const result = await listSoftwareTemplates(pageInfo.page, pageInfo.pageSize);
    setLoading(false);

    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }

    setTemplates(result.data.list);
    setPageInfo(result.data.page);
    const nextTemplate =
      (selectedTemplateId ? result.data.list.find((t) => t.id === selectedTemplateId) : null) ?? result.data.list[0] ?? null;
    selectTemplate(nextTemplate);
  }, [pageInfo.page, pageInfo.pageSize, selectTemplate, selectedTemplateId]);

  useEffect(() => {
    const token = localStorage.getItem('sparkx_admin_token') || sessionStorage.getItem('sparkx_admin_token');
    if (!token) {
      navigate('/login');
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void loadTemplates();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [navigate, loadTemplates]);

  const handleLogout = () => {
    localStorage.removeItem('sparkx_admin_token');
    localStorage.removeItem('sparkx_admin_id');
    localStorage.removeItem('sparkx_admin_role');
    sessionStorage.removeItem('sparkx_admin_token');
    sessionStorage.removeItem('sparkx_admin_id');
    sessionStorage.removeItem('sparkx_admin_role');
    navigate('/login');
  };

  const resetForm = () => {
    setFormData({ name: '', description: '', archiveFileId: '' });
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadMode('new');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetForm();
  };

  const openEditModal = (template: SoftwareTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      archiveFileId: template.archiveFileId ? String(template.archiveFileId) : '',
    });
    setUploadMode('new');
    setSelectedFile(null);
    setUploadProgress(0);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditingTemplate(null);
    resetForm();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // 自动填充文件名（如果没有输入名称）
      if (!formData.name.trim()) {
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        setFormData(prev => ({ ...prev, name: fileName }));
      }
    }
  };

  const handleUploadAndCreate = async () => {
    setMessage(null);

    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: '模板名称不能为空' });
      return;
    }

    let archiveFileId: number | undefined;

    // 如果选择了新文件，先上传文件
    if (uploadMode === 'new' && selectedFile) {
      setIsUploading(true);
      setUploadProgress(10);

      try {
        // 1. 计算文件 hash
        setUploadProgress(20);
        const fileHash = await calculateFileHash(selectedFile);

        // 2. 预上传
        setUploadProgress(40);
        const ext = getFileExtension(selectedFile.name);
        const category = getFileCategory(ext);

        const preUploadResult = await preUploadFile({
          projectId: 0, // 模板文件不关联特定项目
          name: selectedFile.name,
          fileCategory: category,
          fileFormat: ext,
          sizeBytes: selectedFile.size,
          hash: fileHash,
          contentType: selectedFile.type || undefined,
        });

        if (!preUploadResult.ok) {
          setMessage({ type: 'error', text: `预上传失败: ${preUploadResult.message}` });
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }

        // 3. 上传到 OSS
        setUploadProgress(60);
        const uploadResult = await uploadFileToOSS(
          preUploadResult.data.uploadUrl,
          selectedFile,
          preUploadResult.data.contentType
        );

        if (!uploadResult.ok) {
          setMessage({ type: 'error', text: `上传失败: ${uploadResult.message}` });
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }

        archiveFileId = preUploadResult.data.fileId;
        setUploadProgress(80);
      } catch {
        setMessage({ type: 'error', text: '文件上传过程中发生错误' });
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }
    } else if (uploadMode === 'existing' && formData.archiveFileId.trim()) {
      const fileId = parseInt(formData.archiveFileId.trim(), 10);
      if (!isNaN(fileId) && fileId > 0) {
        archiveFileId = fileId;
      }
    }

    // 4. 创建模板
    setUploadProgress(90);
    const input: { name: string; description?: string; archiveFileId?: number } = {
      name: formData.name.trim(),
    };

    if (formData.description.trim()) {
      input.description = formData.description.trim();
    }

    if (archiveFileId) {
      input.archiveFileId = archiveFileId;
    }

    const result = await createSoftwareTemplate(input);
    setIsUploading(false);
    setUploadProgress(0);

    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }

    setMessage({ type: 'success', text: '模板创建成功！' });
    closeCreateModal();
    loadTemplates();
  };

  const handleUploadAndUpdate = async () => {
    setMessage(null);

    if (!editingTemplate) return;

    let archiveFileId: number | undefined;

    // 如果选择了新文件，先上传文件
    if (uploadMode === 'new' && selectedFile) {
      setIsUploading(true);
      setUploadProgress(10);

      try {
        // 1. 计算文件 hash
        setUploadProgress(20);
        const fileHash = await calculateFileHash(selectedFile);

        // 2. 预上传
        setUploadProgress(40);
        const ext = getFileExtension(selectedFile.name);
        const category = getFileCategory(ext);

        const preUploadResult = await preUploadFile({
          projectId: 0,
          name: selectedFile.name,
          fileCategory: category,
          fileFormat: ext,
          sizeBytes: selectedFile.size,
          hash: fileHash,
          contentType: selectedFile.type || undefined,
        });

        if (!preUploadResult.ok) {
          setMessage({ type: 'error', text: `预上传失败: ${preUploadResult.message}` });
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }

        // 3. 上传到 OSS
        setUploadProgress(60);
        const uploadResult = await uploadFileToOSS(
          preUploadResult.data.uploadUrl,
          selectedFile,
          preUploadResult.data.contentType
        );

        if (!uploadResult.ok) {
          setMessage({ type: 'error', text: `上传失败: ${uploadResult.message}` });
          setIsUploading(false);
          setUploadProgress(0);
          return;
        }

        archiveFileId = preUploadResult.data.fileId;
        setUploadProgress(80);
      } catch {
        setMessage({ type: 'error', text: '文件上传过程中发生错误' });
        setIsUploading(false);
        setUploadProgress(0);
        return;
      }
    } else if (uploadMode === 'existing' && formData.archiveFileId.trim()) {
      const fileId = parseInt(formData.archiveFileId.trim(), 10);
      if (!isNaN(fileId) && fileId > 0) {
        archiveFileId = fileId;
      }
    }

    // 4. 更新模板
    setUploadProgress(90);
    const input: { name?: string; description?: string; archiveFileId?: number } = {};

    if (formData.name.trim()) {
      input.name = formData.name.trim();
    }

    if (formData.description.trim()) {
      input.description = formData.description.trim();
    }

    if (archiveFileId) {
      input.archiveFileId = archiveFileId;
    }

    const result = await updateSoftwareTemplate(editingTemplate.id, input);
    setIsUploading(false);
    setUploadProgress(0);

    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }

    setMessage({ type: 'success', text: '模板更新成功！' });
    closeEditModal();
    loadTemplates();
  };

  const handleDownload = async (input: { fileId: number; versionId?: number; versionNumber?: number }) => {
    setMessage(null);
    const result = await getDownloadUrl(input);
    if (!result.ok) {
      setMessage({ type: 'error', text: result.message });
      return;
    }
    window.open(result.data.downloadUrl, '_blank', 'noopener,noreferrer');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const totalPages = Math.ceil(pageInfo.total / pageInfo.pageSize);
  const selectedTemplate =
    selectedTemplateId === null ? null : templates.find((t) => t.id === selectedTemplateId) ?? null;
  const versionsTotalPages = Math.ceil(versionsPageInfo.total / versionsPageInfo.pageSize);

  return (
    <div className="software-templates-page">
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
          <div className="header-actions">
            <button onClick={() => navigate('/dashboard')} className="nav-button">
              返回仪表盘
            </button>
            <button onClick={handleLogout} className="logout-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            <h2 className="page-title">软件模板管理</h2>
            <button onClick={openCreateModal} className="create-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              创建模板
            </button>
          </div>

          {message && (
            <div className={`message message-${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="templates-split-container">
            {loading ? (
              <div className="loading-state">加载中...</div>
            ) : templates.length === 0 ? (
              <div className="empty-state">
                <p>暂无软件模板</p>
                <button onClick={openCreateModal} className="create-button-small">
                  创建第一个模板
                </button>
              </div>
            ) : (
              <div className="templates-split-layout">
                <aside className="templates-sidebar">
                  <div className="sidebar-header">
                    <h3 className="sidebar-title">模板列表</h3>
                  </div>

                  <div className="template-list">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className={`template-list-item ${template.id === selectedTemplateId ? 'selected' : ''}`}
                        onClick={() => selectTemplate(template)}
                      >
                        <div className="template-list-item-title">{template.name}</div>
                        <div className="template-list-item-meta">
                          <span>ID {template.id}</span>
                          <span>{template.archiveFileId ? `文件 ${template.archiveFileId}` : '无文件'}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="pagination">
                      <button
                        onClick={() => setPageInfo((prev) => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pageInfo.page <= 1}
                        className="pagination-button"
                      >
                        上一页
                      </button>
                      <span className="pagination-info">
                        第 {pageInfo.page} 页 / 共 {totalPages} 页 (共 {pageInfo.total} 条)
                      </span>
                      <button
                        onClick={() => setPageInfo((prev) => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pageInfo.page >= totalPages}
                        className="pagination-button"
                      >
                        下一页
                      </button>
                    </div>
                  )}
                </aside>

                <section className="templates-detail">
                  {!selectedTemplate ? (
                    <div className="empty-state">
                      <p>请选择一个模板</p>
                    </div>
                  ) : (
                    <>
                      <div className="template-detail-top">
                        <div className="detail-card">
                          <div className="detail-card-header">
                            <div className="detail-title">
                              <h3 className="detail-name">{selectedTemplate.name}</h3>
                              <span className="detail-id">#{selectedTemplate.id}</span>
                            </div>
                            <div className="detail-actions">
                              <button
                                type="button"
                                onClick={() => openEditModal(selectedTemplate)}
                                className={`primary-file-button ${selectedTemplate.archiveFileId ? 'update' : 'add'}`}
                              >
                                {selectedTemplate.archiveFileId ? '更新模板文件' : '添加模板文件'}
                              </button>
                              {selectedTemplate.archiveFileId ? (
                                <button
                                  type="button"
                                  onClick={() => handleDownload({ fileId: selectedTemplate.archiveFileId })}
                                  className="secondary-action-button"
                                >
                                  下载最新
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div className="detail-grid">
                            <div className="detail-row">
                              <span className="detail-label">描述</span>
                              <span className="detail-value">{selectedTemplate.description || '-'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">文件ID</span>
                              <span className="detail-value">{selectedTemplate.archiveFileId || '-'}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">创建时间</span>
                              <span className="detail-value">{selectedTemplate.createdAt}</span>
                            </div>
                            <div className="detail-row">
                              <span className="detail-label">更新时间</span>
                              <span className="detail-value">{selectedTemplate.updatedAt}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="template-detail-bottom">
                        <div className="detail-card">
                          <div className="detail-card-header">
                            <h3 className="detail-section-title">模板文件版本</h3>
                            <div className="versions-header-meta">
                              {selectedTemplate.archiveFileId ? (
                                <>
                                  <span>文件ID: {selectedTemplate.archiveFileId}</span>
                                  <span>共 {versionsPageInfo.total} 个版本</span>
                                </>
                              ) : (
                                <span>未绑定模板文件</span>
                              )}
                            </div>
                          </div>

                          {!selectedTemplate.archiveFileId ? (
                            <div className="empty-state empty-state-small">
                              <p>该模板还没有模板文件</p>
                            </div>
                          ) : versionsLoading ? (
                            <div className="loading-state">加载中...</div>
                          ) : versions.length === 0 ? (
                            <div className="empty-state empty-state-small">
                              <p>暂无版本</p>
                            </div>
                          ) : (
                            <>
                              <div className="versions-table-container">
                                <table className="versions-table">
                                  <thead>
                                    <tr>
                                      <th>版本号</th>
                                      <th>大小</th>
                                      <th>Hash</th>
                                      <th>创建时间</th>
                                      <th>操作</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {versions.map((v) => (
                                      <tr key={v.id}>
                                        <td>v{v.versionNumber}</td>
                                        <td>{formatFileSize(v.sizeBytes)}</td>
                                        <td className="hash-cell">{v.hash}</td>
                                        <td>{v.createdAt}</td>
                                        <td className="actions-cell">
                                          <button
                                            onClick={() => handleDownload({ fileId: v.fileId, versionId: v.id })}
                                            className="action-button download-button"
                                            title="下载"
                                          >
                                            <svg
                                              xmlns="http://www.w3.org/2000/svg"
                                              width="16"
                                              height="16"
                                              viewBox="0 0 24 24"
                                              fill="none"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            >
                                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                              <polyline points="7 10 12 15 17 10" />
                                              <line x1="12" y1="15" x2="12" y2="3" />
                                            </svg>
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>

                              {versionsTotalPages > 1 && selectedTemplate.archiveFileId ? (
                                <div className="pagination">
                                  <button
                                    onClick={() => {
                                      const nextPage = versionsPageInfo.page - 1;
                                      setVersionsPageInfo((prev) => ({ ...prev, page: nextPage }));
                                      void loadVersionsForFile(
                                        selectedTemplate.archiveFileId,
                                        nextPage,
                                        versionsPageInfo.pageSize
                                      );
                                    }}
                                    disabled={versionsPageInfo.page <= 1}
                                    className="pagination-button"
                                  >
                                    上一页
                                  </button>
                                  <span className="pagination-info">
                                    第 {versionsPageInfo.page} 页 / 共 {versionsTotalPages} 页 (共 {versionsPageInfo.total}{' '}
                                    条)
                                  </span>
                                  <button
                                    onClick={() => {
                                      const nextPage = versionsPageInfo.page + 1;
                                      setVersionsPageInfo((prev) => ({ ...prev, page: nextPage }));
                                      void loadVersionsForFile(
                                        selectedTemplate.archiveFileId,
                                        nextPage,
                                        versionsPageInfo.pageSize
                                      );
                                    }}
                                    disabled={versionsPageInfo.page >= versionsTotalPages}
                                    className="pagination-button"
                                  >
                                    下一页
                                  </button>
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">创建软件模板</h3>
              <button onClick={closeCreateModal} className="modal-close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label htmlFor="create-name" className="form-label">
                  模板名称 <span className="required">*</span>
                </label>
                <input
                  id="create-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                  placeholder="请输入模板名称"
                />
              </div>
              <div className="form-group">
                <label htmlFor="create-description" className="form-label">
                  描述
                </label>
                <textarea
                  id="create-description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="form-textarea"
                  placeholder="请输入模板描述（可选）"
                  rows={3}
                />
              </div>

              {/* 文件上传区域 */}
              <div className="form-group">
                <label className="form-label">模板文件</label>
                <div className="upload-mode-toggle">
                  <button
                    type="button"
                    className={`mode-button ${uploadMode === 'new' ? 'active' : ''}`}
                    onClick={() => setUploadMode('new')}
                  >
                    上传新文件
                  </button>
                  <button
                    type="button"
                    className={`mode-button ${uploadMode === 'existing' ? 'active' : ''}`}
                    onClick={() => setUploadMode('existing')}
                  >
                    使用已有文件ID
                  </button>
                </div>

                {uploadMode === 'new' ? (
                  <div className="file-upload-area">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="file-input"
                      id="create-file"
                    />
                    <label htmlFor="create-file" className="file-upload-label">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>点击选择文件</span>
                    </label>
                    {selectedFile && (
                      <div className="selected-file">
                        <span className="file-name">{selectedFile.name}</span>
                        <span className="file-size">({formatFileSize(selectedFile.size)})</span>
                        <button
                          type="button"
                          className="clear-file"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="number"
                    value={formData.archiveFileId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, archiveFileId: e.target.value }))}
                    className="form-input"
                    placeholder="请输入文件ID"
                  />
                )}
              </div>

              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="progress-text">{uploadProgress}%</span>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={closeCreateModal} className="button-secondary" disabled={isUploading}>
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleUploadAndCreate}
                  className="button-primary"
                  disabled={isUploading || !formData.name.trim()}
                >
                  {isUploading ? '上传中...' : '创建'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingTemplate && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">编辑软件模板</h3>
              <button onClick={closeEditModal} className="modal-close">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label htmlFor="edit-name" className="form-label">
                  模板名称
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="form-input"
                  placeholder="请输入模板名称"
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-description" className="form-label">
                  描述
                </label>
                <textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="form-textarea"
                  placeholder="请输入模板描述"
                  rows={3}
                />
              </div>

              {/* 文件上传区域 */}
              <div className="form-group">
                <label className="form-label">模板文件</label>
                <div className="upload-mode-toggle">
                  <button
                    type="button"
                    className={`mode-button ${uploadMode === 'new' ? 'active' : ''}`}
                    onClick={() => setUploadMode('new')}
                  >
                    上传新文件
                  </button>
                  <button
                    type="button"
                    className={`mode-button ${uploadMode === 'existing' ? 'active' : ''}`}
                    onClick={() => setUploadMode('existing')}
                  >
                    使用已有文件ID
                  </button>
                </div>

                {uploadMode === 'new' ? (
                  <div className="file-upload-area">
                    <input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileSelect}
                      className="file-input"
                      id="edit-file"
                    />
                    <label htmlFor="edit-file" className="file-upload-label">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                      </svg>
                      <span>点击选择文件</span>
                    </label>
                    {selectedFile && (
                      <div className="selected-file">
                        <span className="file-name">{selectedFile.name}</span>
                        <span className="file-size">({formatFileSize(selectedFile.size)})</span>
                        <button
                          type="button"
                          className="clear-file"
                          onClick={() => {
                            setSelectedFile(null);
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="number"
                    value={formData.archiveFileId}
                    onChange={(e) => setFormData((prev) => ({ ...prev, archiveFileId: e.target.value }))}
                    className="form-input"
                    placeholder="请输入文件ID"
                  />
                )}
              </div>

              {isUploading && (
                <div className="upload-progress">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="progress-text">{uploadProgress}%</span>
                </div>
              )}

              <div className="modal-actions">
                <button type="button" onClick={closeEditModal} className="button-secondary" disabled={isUploading}>
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleUploadAndUpdate}
                  className="button-primary"
                  disabled={isUploading}
                >
                  {isUploading ? '上传中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
