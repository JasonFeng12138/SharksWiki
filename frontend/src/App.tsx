import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import GithubSlugger from 'github-slugger';
import { format } from 'date-fns';
import { FileText, Plus, Edit2, Trash2, Save, X, Menu, BookOpen, Folder, FolderOpen, ChevronRight, ChevronDown, FolderPlus, FilePlus, MoreVertical, Upload, Settings, Sun, Moon, Globe, LogOut, User as UserIcon, Lock } from 'lucide-react';
import { cn } from './lib/utils';
import { api, User, FileNode } from './services/api';

// i18n Dictionary
const translations = {
  en: {
    myWiki: 'My Wiki',
    newDoc: 'New Document',
    newFolder: 'New Folder',
    importDoc: 'Import Document',
    noDocs: 'No documents yet',
    loading: 'Loading...',
    selectDoc: 'Select a document from the sidebar or create a new one.',
    onThisPage: 'On this page',
    edit: 'Edit',
    cancel: 'Cancel',
    save: 'Save',
    settings: 'Settings',
    changePassword: 'Change Password',
    changeName: 'Change Name',
    logout: 'Logout',
    language: 'Language',
    theme: 'Theme',
    light: 'Light',
    dark: 'Dark',
    createDoc: 'Create New Document',
    createFolder: 'Create New Folder',
    deleteDoc: 'Delete Document',
    deleteFolder: 'Delete Folder',
    name: 'Name',
    docNamePlaceholder: 'Document name...',
    folderNamePlaceholder: 'Folder name...',
    willBeCreatedIn: 'Will be created in:',
    areYouSureDelete: 'Are you sure you want to delete',
    deleteFolderWarning: 'This will delete all contents inside it.',
    cannotBeUndone: 'This action cannot be undone.',
    delete: 'Delete',
    create: 'Create',
    adminAccess: 'Admin (Full Access)',
    guestAccess: 'Guest (Read/Comment Only)',
    loggedOutAccess: 'Logged Out (Read Only)',
    login: 'Login',
    createdBy: 'Created by',
    at: 'at',
    username: 'Username',
    password: 'Password',
    wikiSettings: 'Wiki Settings',
    wikiName: 'Wiki Name',
    wikiIcon: 'Wiki Icon',
    invalidCredentials: 'Invalid username or password',
    saveConfig: 'Save Configuration',
    uploadIcon: 'Upload Icon',
    iconSizeLimit: 'Max 2MB. Supports JPG, PNG, SVG.',
    adminOnly: 'Admin Only'
  },
  zh: {
    myWiki: '我的 Wiki',
    newDoc: '新建文档',
    newFolder: '新建文件夹',
    importDoc: '导入文档',
    noDocs: '暂无文档',
    loading: '加载中...',
    selectDoc: '从侧边栏选择一个文档或新建一个。',
    onThisPage: '本页目录',
    edit: '编辑',
    cancel: '取消',
    save: '保存',
    settings: '设置',
    changePassword: '更改密码',
    changeName: '更改名称',
    logout: '退出登录',
    language: '语言',
    theme: '主题',
    light: '白天模式',
    dark: '夜晚模式',
    createDoc: '创建新文档',
    createFolder: '创建新文件夹',
    deleteDoc: '删除文档',
    deleteFolder: '删除文件夹',
    name: '名称',
    docNamePlaceholder: '文档名称...',
    folderNamePlaceholder: '文件夹名称...',
    willBeCreatedIn: '将创建在：',
    areYouSureDelete: '确定要删除',
    deleteFolderWarning: '这将删除其中的所有内容。',
    cannotBeUndone: '此操作无法撤销。',
    delete: '删除',
    create: '创建',
    adminAccess: '管理员 (完全访问)',
    guestAccess: '访客 (仅阅读/评论)',
    loggedOutAccess: '未登录 (仅阅读)',
    login: '登录',
    createdBy: '创建人',
    at: '于',
    username: '用户名',
    password: '密码',
    wikiSettings: 'Wiki 设置',
    wikiName: 'Wiki 名称',
    wikiIcon: 'Wiki 图标',
    invalidCredentials: '用户名或密码错误',
    saveConfig: '保存配置',
    uploadIcon: '上传图标',
    iconSizeLimit: '最大 2MB。支持 JPG, PNG, SVG。',
    adminOnly: '仅管理员可修改'
  }
};

type ModalState = 
  | { type: 'none' }
  | { type: 'createFile', parentPath: string }
  | { type: 'createFolder', parentPath: string }
  | { type: 'deleteFile', path: string }
  | { type: 'deleteFolder', path: string }
  | { type: 'settings' }
  | { type: 'login' };

export default function App() {
  const [documents, setDocuments] = useState<FileNode[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [modalInput, setModalInput] = useState('');

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mdFileInputRef = useRef<HTMLInputElement>(null);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'en' | 'zh'>('zh');
  const [wikiConfig, setWikiConfig] = useState({ name: 'My Wiki', icon: '' });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  const t = (key: keyof typeof translations['en']) => translations[language][key] || key;

  useEffect(() => {
    fetchConfig();
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
    } catch (e) {
      setCurrentUser(null);
    }
  };

  const fetchConfig = async () => {
    try {
      const data = await api.getConfig();
      setWikiConfig(data);
    } catch (e) {
      console.error('Failed to fetch wiki config', e);
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const [headings, setHeadings] = useState<{ id: string; text: string; level: number }[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Extract headings when content changes
  useEffect(() => {
    if (isEditing || !content) {
      setHeadings([]);
      return;
    }

    const slugger = new GithubSlugger();
    const contentWithoutCodeBlocks = content.replace(/```[\s\S]*?```/g, '');
    const regex = /^(#{1,6})\s+(.+)$/gm;
    const newHeadings = [];
    let match;
    
    while ((match = regex.exec(contentWithoutCodeBlocks)) !== null) {
      const rawText = match[2];
      const cleanText = rawText.replace(/(\*\*|__|\*|_|`|~)/g, '').trim();
      newHeadings.push({
        level: match[1].length,
        text: cleanText,
        id: slugger.slug(cleanText)
      });
    }
    
    setHeadings(newHeadings);
  }, [content, isEditing]);

  // Scroll spy for ToC
  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const headingElements = headings.map(h => document.getElementById(h.id)).filter(Boolean);
      let currentActiveId = '';
      
      for (const el of headingElements) {
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 120) {
            currentActiveId = el.id;
          } else {
            break;
          }
        }
      }
      
      if (!currentActiveId && headingElements.length > 0) {
        const firstRect = headingElements[0]?.getBoundingClientRect();
        if (firstRect && firstRect.top > 0 && firstRect.top < window.innerHeight) {
          currentActiveId = headingElements[0].id;
        }
      }

      if (currentActiveId !== activeId) {
        setActiveId(currentActiveId);
      }
    };

    const scrollArea = document.getElementById('main-scroll-area');
    scrollArea?.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => scrollArea?.removeEventListener('scroll', handleScroll);
  }, [headings, activeId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.md')) {
      alert('Only Markdown (.md) files are supported.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      try {
        await api.createDocument(
          '', // root dir
          file.name,
          'file',
          content
        );
        await fetchDocuments();
        setSelectedDoc(file.name);
        setIsMenuOpen(false);
      } catch (error) {
        console.error('Failed to import file', error);
      }
    };
    reader.readAsText(file);
    
    if (mdFileInputRef.current) {
      mdFileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (selectedDoc) {
      fetchDocument(selectedDoc);
    } else {
      setContent('');
      setIsEditing(false);
    }
  }, [selectedDoc]);

  const fetchDocuments = async () => {
    try {
      const data = await api.getDocumentTree();
      setDocuments(data);
      if (!selectedDoc) {
        const firstFile = findFirstFile(data);
        if (firstFile) setSelectedDoc(firstFile.path);
      }
    } catch (error) {
      console.error('Failed to fetch documents', error);
    } finally {
      setIsLoading(false);
    }
  };

  const findFirstFile = (nodes: FileNode[]): FileNode | null => {
    for (const node of nodes) {
      if (node.type === 'file') return node;
      if (node.children) {
        const found = findFirstFile(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const fetchDocument = async (path: string) => {
    try {
      const data = await api.getDocumentDetail(path);
      setContent(data.content);
      setEditContent(data.content);
      const parts = path.split('/');
      const filename = parts[parts.length - 1];
      setEditTitle(filename.replace(/\.md$/, ''));
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to fetch document', error);
      setContent('# Document not found');
    }
  };

  const handleSave = async () => {
    if (!editTitle.trim() || !selectedDoc) return;
    
    const parts = selectedDoc.split('/');
    parts.pop();
    const dirPath = parts.join('/');
    
    const newFilename = `${editTitle.trim()}.md`;
    const newPath = dirPath ? `${dirPath}/${newFilename}` : newFilename;
    
    try {
      if (selectedDoc !== newPath) {
        await api.deleteDocument(selectedDoc);
        await api.createDocument(dirPath, newFilename, 'file', editContent);
      } else {
        await api.updateDocument(newPath, editContent);
      }
      
      await fetchDocuments();
      setSelectedDoc(newPath);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save document', error);
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (modalState.type === 'createFile') {
        const filename = modalInput.trim().endsWith('.md') ? modalInput.trim() : `${modalInput.trim()}.md`;
        await api.createDocument(
          modalState.parentPath,
          filename,
          'file',
          '# ' + modalInput.trim() + '\n\nStart typing here...'
        );
        
        await fetchDocuments();
        const newPath = modalState.parentPath ? `${modalState.parentPath}/${filename}` : filename;
        setSelectedDoc(newPath);
        setIsEditing(true);
      } else if (modalState.type === 'createFolder') {
        await api.createDocument(
          modalState.parentPath,
          modalInput.trim(),
          'directory'
        );
        await fetchDocuments();
      } else if (modalState.type === 'deleteFile') {
        await api.deleteDocument(modalState.path);
        await fetchDocuments();
        if (selectedDoc === modalState.path) setSelectedDoc(null);
      } else if (modalState.type === 'deleteFolder') {
        await api.deleteDocument(modalState.path);
        await fetchDocuments();
        if (selectedDoc?.startsWith(modalState.path)) setSelectedDoc(null);
      }
    } catch (error) {
      console.error('Operation failed', error);
    }
    
    setModalState({ type: 'none' });
    setModalInput('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const { token, user } = await api.login(loginForm.username, loginForm.password);
      localStorage.setItem('wiki_token', token);
      setCurrentUser(user);
      setModalState({ type: 'none' });
      setLoginForm({ username: '', password: '' });
    } catch (error: any) {
      setLoginError(error.message || t('invalidCredentials'));
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {}
    localStorage.removeItem('wiki_token');
    setCurrentUser(null);
    setModalState({ type: 'none' });
  };

  const handleSaveWikiConfig = async () => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wikiConfig),
      });
      if (res.ok) {
        alert(t('saveConfig') + ' Success!');
      }
    } catch (e) {
      console.error('Failed to save config', e);
    }
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert(t('iconSizeLimit'));
      return;
    }

    try {
      const res = await fetch('/api/upload-icon', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (res.ok) {
        const { url } = await res.json();
        setWikiConfig({ ...wikiConfig, icon: url });
      }
    } catch (e) {
      console.error('Upload failed', e);
    }
  };

  const FileTreeNode = ({ node, level }: { node: FileNode, level: number }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const isDir = node.type === 'directory';
    const isSelected = selectedDoc === node.path;
    
    return (
      <div className="select-none">
        <div 
          className={cn(
            "group flex items-center justify-between py-1.5 pr-2 rounded-md cursor-pointer transition-colors",
            isSelected ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100",
            isEditing && isSelected === false && "opacity-50 cursor-not-allowed"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => {
            if (isDir) {
              setIsExpanded(!isExpanded);
            } else if (!isEditing) {
              setSelectedDoc(node.path);
            }
          }}
        >
          <div className="flex items-center gap-1.5 overflow-hidden">
            {isDir ? (
              <span className="text-gray-400">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            ) : (
              <span className="w-4" />
            )}
            
            {isDir ? (
              isExpanded ? <FolderOpen className="w-4 h-4 text-blue-500 shrink-0" /> : <Folder className="w-4 h-4 text-blue-500 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
            )}
            
            <span className="text-sm truncate">{isDir ? node.name : node.name.replace(/\.md$/, '')}</span>
          </div>
          
          {!isEditing && (
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              {isDir && (
                <>
                  {currentUser?.permissions.can_add_file && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setModalState({ type: 'createFile', parentPath: node.path }); setModalInput(''); }}
                      className="p-1 text-gray-400 hover:text-gray-700 rounded" title="New File"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {currentUser?.permissions.can_create_dir && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setModalState({ type: 'createFolder', parentPath: node.path }); setModalInput(''); }}
                      className="p-1 text-gray-400 hover:text-gray-700 rounded" title="New Folder"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
              {currentUser?.permissions.can_delete_file && (
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setModalState(isDir ? { type: 'deleteFolder', path: node.path } : { type: 'deleteFile', path: node.path }); 
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 rounded" title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
        
        {isDir && isExpanded && node.children && (
          <div className="mt-0.5">
            {node.children.map(child => (
              <FileTreeNode key={child.path} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const findNodeByPath = (nodes: FileNode[], path: string): FileNode | null => {
    for (const node of nodes) {
      if (node.path === path) return node;
      if (node.children) {
        const found = findNodeByPath(node.children, path);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = selectedDoc ? findNodeByPath(documents, selectedDoc) : null;

  return (
    <div className="flex h-screen bg-[#f5f5f5] dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-200">
      <div 
        className={cn(
          "bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out z-10 shrink-0",
          isSidebarOpen ? "w-64 md:w-72" : "w-0 overflow-hidden border-none"
        )}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-semibold text-lg overflow-hidden">
            {wikiConfig.icon ? (
              <img src={wikiConfig.icon} alt="Wiki Icon" className="w-6 h-6 object-contain rounded" referrerPolicy="no-referrer" />
            ) : (
              <BookOpen className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            )}
            <span className="truncate">{wikiConfig.name}</span>
          </div>
          {(currentUser?.permissions.can_add_file || currentUser?.permissions.can_create_dir) && (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-400 transition-colors"
                title="More options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  {currentUser?.permissions.can_add_file && (
                    <button 
                      onClick={() => { setModalState({ type: 'createFile', parentPath: '' }); setModalInput(''); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FilePlus className="w-4 h-4" />
                      {t('newDoc')}
                    </button>
                  )}
                  {currentUser?.permissions.can_create_dir && (
                    <button 
                      onClick={() => { setModalState({ type: 'createFolder', parentPath: '' }); setModalInput(''); setIsMenuOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FolderPlus className="w-4 h-4" />
                      {t('newFolder')}
                    </button>
                  )}
                  {currentUser?.permissions.can_add_file && currentUser?.permissions.can_create_dir && (
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                  )}
                  {currentUser?.permissions.can_add_file && (
                    <>
                      <button 
                        onClick={() => { mdFileInputRef.current?.click(); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {t('importDoc')}
                      </button>
                      <input 
                        type="file" 
                        ref={mdFileInputRef} 
                        accept=".md" 
                        style={{ display: 'none' }} 
                        onChange={handleFileUpload} 
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {isLoading ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('loading')}</div>
          ) : documents.length === 0 ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('noDocs')}</div>
          ) : (
            documents.map((doc) => (
              <FileTreeNode key={doc.path} node={doc} level={0} />
            ))
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
          <button
            onClick={() => setModalState({ type: 'settings' })}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors w-full"
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium">{t('settings')}</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1e1e1e]">
        <header className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0 bg-white dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-400 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-lg font-medium bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-gray-900 dark:focus:border-gray-300 focus:outline-none px-1 py-0.5 dark:text-white"
                placeholder={t('docNamePlaceholder')}
                autoFocus
              />
            ) : (
              <h1 className="text-lg font-medium truncate dark:text-white">
                {selectedDoc ? selectedDoc.split('/').pop()?.replace(/\.md$/, '') : t('selectDoc')}
              </h1>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {selectedNode && selectedNode.type === 'file' && !isEditing && (
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {t('createdBy')}: <span className="text-gray-500 dark:text-gray-400">{selectedNode.author || 'Admin'}</span>
                </span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {t('at')} {selectedNode.createdAt ? format(new Date(selectedNode.createdAt), 'yyyy-MM-dd HH:mm') : format(new Date(), 'yyyy-MM-dd HH:mm')}
                </span>
              </div>
            )}

            {selectedDoc && !isEditing && currentUser?.permissions.can_edit_file && (
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span>{t('edit')}</span>
              </button>
            )}
            
            {isEditing && (
              <>
                <button 
                  onClick={() => {
                    setIsEditing(false);
                    if (!selectedDoc) {
                      const firstFile = findFirstFile(documents);
                      setSelectedDoc(firstFile?.path || null);
                    } else {
                      setEditContent(content);
                      setEditTitle(selectedDoc.split('/').pop()?.replace(/\.md$/, '') || '');
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>{t('cancel')}</span>
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 rounded-md transition-colors shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{t('save')}</span>
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          <main id="main-scroll-area" className="flex-1 overflow-y-auto scroll-smooth">
            {selectedDoc || isEditing ? (
              <div className="max-w-4xl mx-auto p-8 md:p-12">
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-[calc(100vh-200px)] resize-none bg-transparent focus:outline-none text-gray-800 dark:text-gray-200 font-mono text-sm leading-relaxed"
                    placeholder="Write your markdown here..."
                  />
                ) : (
                  <div className="prose prose-gray dark:prose-invert max-w-none prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400 hover:prose-a:text-blue-500 prose-pre:bg-gray-50 dark:prose-pre:bg-gray-800 prose-pre:text-gray-900 dark:prose-pre:text-gray-100 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]}>
                      {content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                <BookOpen className="w-16 h-16 mb-4 opacity-20" />
                <p>{t('selectDoc')}</p>
              </div>
            )}
          </main>

          {/* Table of Contents Sidebar */}
          {!isEditing && headings.length > 0 && (
            <aside className="w-64 border-l border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 overflow-y-auto hidden lg:block shrink-0 p-6">
              <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4">{t('onThisPage')}</h4>
              <nav className="space-y-1.5">
                {headings.map(h => (
                  <a 
                    key={h.id} 
                    href={`#${h.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={cn(
                      "block text-sm py-1 transition-colors truncate border-l-2 pl-3 -ml-[2px]",
                      activeId === h.id 
                        ? "text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-medium" 
                        : "text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                    )}
                    style={{ marginLeft: `${(h.level - 1) * 12}px` }}
                    title={h.text}
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            </aside>
          )}
        </div>
      </div>

      {modalState.type !== 'none' && modalState.type !== 'settings' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <form onSubmit={handleModalSubmit}>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">
                  {modalState.type === 'createFile' && t('createDoc')}
                  {modalState.type === 'createFolder' && t('createFolder')}
                  {modalState.type === 'deleteFile' && t('deleteDoc')}
                  {modalState.type === 'deleteFolder' && t('deleteFolder')}
                </h3>
                
                {(modalState.type === 'createFile' || modalState.type === 'createFolder') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name')}</label>
                    <input
                      type="text"
                      value={modalInput}
                      onChange={(e) => setModalInput(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={modalState.type === 'createFile' ? t('docNamePlaceholder') : t('folderNamePlaceholder')}
                      autoFocus
                      required
                    />
                    {modalState.parentPath && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {t('willBeCreatedIn')} <span className="font-mono">{modalState.parentPath}/</span>
                      </p>
                    )}
                  </div>
                )}
                
                {(modalState.type === 'deleteFile' || modalState.type === 'deleteFolder') && (
                  <p className="text-gray-600 dark:text-gray-300">
                    {t('areYouSureDelete')} <span className="font-semibold">{modalState.path}</span>?
                    {modalState.type === 'deleteFolder' && ` ${t('deleteFolderWarning')}`}
                    <br/><br/>{t('cannotBeUndone')}
                  </p>
                )}
              </div>
              
              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => { setModalState({ type: 'none' }); setModalInput(''); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className={cn(
                    "px-4 py-2 text-sm font-medium text-white rounded-md transition-colors",
                    (modalState.type === 'deleteFile' || modalState.type === 'deleteFolder')
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  )}
                >
                  {(modalState.type === 'deleteFile' || modalState.type === 'deleteFolder') ? t('delete') : t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {modalState.type === 'settings' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                {t('settings')}
              </h3>
              <button 
                onClick={() => setModalState({ type: 'none' })} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Theme Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span className="text-sm font-medium">{t('theme')}</span>
                </div>
                <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
                  <button 
                    onClick={() => setTheme('light')} 
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-all", 
                      theme === 'light' ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    {t('light')}
                  </button>
                  <button 
                    onClick={() => setTheme('dark')} 
                    className={cn(
                      "px-3 py-1.5 rounded-md text-sm font-medium transition-all", 
                      theme === 'dark' ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                    )}
                  >
                    {t('dark')}
                  </button>
                </div>
              </div>

              {/* Language Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('language')}</span>
                </div>
                <select 
                  value={language} 
                  onChange={(e) => setLanguage(e.target.value as 'en' | 'zh')} 
                  className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* User Actions */}
              {currentUser ? (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <button 
                    onClick={() => alert('Change Name feature coming soon!')}
                    className="w-full flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2.5 rounded-md transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-gray-400" /> 
                    {t('changeName')}
                  </button>
                  <button 
                    onClick={() => alert('Change Password feature coming soon!')}
                    className="w-full flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2.5 rounded-md transition-colors"
                  >
                    <Lock className="w-4 h-4 text-gray-400" /> 
                    {t('changePassword')}
                  </button>
                  <button 
                    onClick={() => { 
                      setCurrentUser(null); 
                      setModalState({ type: 'none' }); 
                    }} 
                    className="w-full flex items-center gap-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2.5 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" /> 
                    {t('logout')}
                  </button>
                </div>
              ) : (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <button 
                    onClick={() => { 
                      setModalState({ type: 'login' }); 
                      setLoginError('');
                    }} 
                    className="w-full flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2.5 rounded-md transition-colors"
                  >
                    <UserIcon className="w-4 h-4" /> 
                    {t('login')}
                  </button>
                </div>
              )}

              {/* Wiki Configuration - Admin Only */}
              {currentUser?.account === 'admin' && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('wikiSettings')}</h4>
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold">
                      {t('adminOnly')}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('wikiName')}</label>
                      <input 
                        type="text" 
                        value={wikiConfig.name}
                        onChange={(e) => setWikiConfig({ ...wikiConfig, name: e.target.value })}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('wikiIcon')}</label>
                      <div className="flex items-center gap-2">
                        {wikiConfig.icon && (
                          <div className="w-10 h-10 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-hidden">
                            <img src={wikiConfig.icon} alt="Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                        )}
                        <button 
                          onClick={() => iconFileInputRef.current?.click()}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-xs border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 rounded-md transition-colors text-gray-600 dark:text-gray-400"
                        >
                          <Upload className="w-3 h-3" />
                          {t('uploadIcon')}
                        </button>
                        <input 
                          type="file" 
                          ref={iconFileInputRef}
                          onChange={handleIconUpload}
                          accept="image/*"
                          className="hidden"
                        />
                      </div>
                      <p className="mt-1 text-[10px] text-gray-400">{t('iconSizeLimit')}</p>
                    </div>
                    <button 
                      onClick={handleSaveWikiConfig}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      {t('saveConfig')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {modalState.type === 'login' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold dark:text-white">{t('login')}</h3>
              <button onClick={() => setModalState({ type: 'none' })} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleLogin} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('username')}</label>
                <input 
                  type="text" 
                  required
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin / guest"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('password')}</label>
                <input 
                  type="password" 
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="admin / guest"
                />
              </div>
              {loginError && <p className="text-xs text-red-500">{loginError}</p>}
              <button 
                type="submit"
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
              >
                {t('login')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
