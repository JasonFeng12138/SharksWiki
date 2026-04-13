export interface User {
  id: number;
  account: string;
  name: string;
  permissions: {
    can_create_dir: boolean;
    can_add_file: boolean;
    can_delete_file: boolean;
    can_edit_file: boolean;
    can_comment: boolean;
  };
}

export interface FileNode {
  id?: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  updatedAt?: string;
  createdAt?: string;
  author?: string;
}

export interface WikiConfig {
  name: string;
  icon: string;
}

// Helper to handle API responses
async function fetchApi(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('wiki_token');
  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Only set Content-Type if it's not already set (e.g., for FormData or raw binary)
  if (!headers['Content-Type'] && !(options.body instanceof FormData) && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || 'API request failed');
  }
  
  return response.json();
}

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<{ token: string; user: User }> => {
    return fetchApi('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  },
  
  logout: async (): Promise<void> => {
    return fetchApi('/api/auth/logout', { method: 'POST' });
  },
  
  getCurrentUser: async (): Promise<User> => {
    return fetchApi('/api/auth/me');
  },

  // Users
  updatePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    return fetchApi('/api/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({ oldPassword, newPassword })
    });
  },

  updateName: async (name: string): Promise<void> => {
    return fetchApi('/api/users/me/name', {
      method: 'PUT',
      body: JSON.stringify({ name })
    });
  },

  // Documents
  getDocumentTree: async (): Promise<FileNode[]> => {
    return fetchApi('/api/documents/tree');
  },

  getDocumentDetail: async (path: string): Promise<{ content: string; author?: string; createdAt?: string; updatedAt?: string }> => {
    return fetchApi(`/api/documents/detail?path=${encodeURIComponent(path)}`);
  },

  createDocument: async (parentPath: string, name: string, type: 'file' | 'directory', content?: string): Promise<void> => {
    return fetchApi('/api/documents', {
      method: 'POST',
      body: JSON.stringify({ parentPath, name, type, content })
    });
  },

  updateDocument: async (path: string, content: string): Promise<void> => {
    return fetchApi('/api/documents', {
      method: 'PUT',
      body: JSON.stringify({ path, content })
    });
  },

  deleteDocument: async (path: string): Promise<void> => {
    return fetchApi(`/api/documents?path=${encodeURIComponent(path)}`, {
      method: 'DELETE'
    });
  },

  // Config
  getConfig: async (): Promise<WikiConfig> => {
    return fetchApi('/api/config');
  },

  updateConfig: async (config: WikiConfig): Promise<void> => {
    return fetchApi('/api/config', {
      method: 'PUT',
      body: JSON.stringify(config)
    });
  },

  uploadIcon: async (file: File): Promise<{ url: string }> => {
    return fetchApi('/api/config/icon', {
      method: 'POST',
      headers: { 'Content-Type': file.type },
      body: file
    });
  }
};
