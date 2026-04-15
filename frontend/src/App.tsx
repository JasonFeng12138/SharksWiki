import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { api } from './services/api';
import type { User, FileNode, UserListItem, PermissionGroup, Permission } from './types';
import type { ModalState, NewUserForm, WikiSettingsTab } from './types';
import { EMPTY_NEW_USER_FORM } from './types';
import { type Language, createTranslator } from './i18n/translations';
import { findFirstFile, findNodeByPath } from './utils/fileTree';
import { Sidebar } from './components/Sidebar';
import { MainContent } from './components/MainContent';
import { OperationModal } from './components/modals/OperationModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { WikiSettingsModal } from './components/modals/WikiSettingsModal';
import { LoginModal } from './components/modals/LoginModal';

const USER_PAGE_SIZE = 10;

export default function App() {
  // -- 文档状态 ----------------------------------------------------------------
  const [documents, setDocuments] = useState<FileNode[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);
  const [content, setContent] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // -- Modal 状态 --------------------------------------------------------------
  const [modalState, setModalState] = useState<ModalState>({ type: 'none' });
  const [modalInput, setModalInput] = useState('');

  // -- 用户 & 认证 -------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // -- 主题 & 语言 -------------------------------------------------------------
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<Language>('zh');
  const t = createTranslator(language);

  // -- Wiki 配置 ---------------------------------------------------------------
  const [wikiConfig, setWikiConfig] = useState({ name: 'My Wiki', icon: '' });

  // -- Wiki 管理面板 -----------------------------------------------------------
  const [wikiSettingsTab, setWikiSettingsTab] = useState<WikiSettingsTab>('config');
  const [userList, setUserList] = useState<UserListItem[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<Permission[]>([]);
  const [newUserForm, setNewUserForm] = useState<NewUserForm>(EMPTY_NEW_USER_FORM);
  const [userFormError, setUserFormError] = useState('');

  // -- 派生状态 ----------------------------------------------------------------
  const isAdmin = Boolean(currentUser?.permissions?.can_admin);
  const selectedNode = selectedDoc ? findNodeByPath(documents, selectedDoc) : null;

  // -- 副作用 ------------------------------------------------------------------
  useEffect(() => {
    fetchConfig();
    fetchCurrentUser();
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (selectedDoc) fetchDocument(selectedDoc);
    else { setContent(''); setIsEditing(false); }
  }, [selectedDoc]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // -- 数据获取 ----------------------------------------------------------------
  const fetchCurrentUser = async () => {
    try { setCurrentUser(await api.getCurrentUser()); }
    catch { setCurrentUser(null); }
  };

  const fetchConfig = async () => {
    try { setWikiConfig(await api.getConfig()); }
    catch (e) { console.error('Failed to fetch wiki config', e); }
  };

  const fetchDocuments = async () => {
    try {
      const data = await api.getDocumentTree();
      setDocuments(data);
      setSelectedDoc((prev: string | null) => prev ?? findFirstFile(data)?.path ?? null);
    } catch (e) {
      console.error('Failed to fetch documents', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDocument = async (path: string) => {
    try {
      const data = await api.getDocumentDetail(path);
      setContent(data.content);
      setEditContent(data.content);
      const filename = path.split('/').pop() ?? '';
      setEditTitle(filename.replace(/\.md$/, ''));
      setIsEditing(false);
    } catch {
      setContent('# Document not found');
    }
  };

  const fetchUsers = async (page = 1) => {
    try {
      const resp = await api.getUsers(page, USER_PAGE_SIZE);
      setUserList(resp.items);
      setUserTotal(resp.total);
      setUserPage(resp.page);
    } catch (e) { console.error('Failed to fetch users', e); }
  };

  const fetchPermissionGroups = async () => {
    try { setPermissionGroups(await api.getPermissionGroups()); }
    catch (e) { console.error('Failed to fetch permission groups', e); }
  };

  const fetchPermissionCatalog = async () => {
    try { setPermissionCatalog(await api.getPermissionCatalog()); }
    catch (e) { console.error('Failed to fetch permission catalog', e); }
  };

  // -- 文档操作 ----------------------------------------------------------------
  const handleSave = async () => {
    if (!editTitle.trim() || !selectedDoc) return;
    const parts = selectedDoc.split('/');
    parts.pop();
    const dirPath = parts.join('/');
    const newFilename = editTitle.trim().endsWith('.md')
      ? editTitle.trim()
      : editTitle.trim() + '.md';
    const newPath = dirPath ? dirPath + '/' + newFilename : newFilename;
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
    } catch (e) { console.error('Failed to save document', e); }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (!selectedDoc) {
      setSelectedDoc(findFirstFile(documents)?.path ?? null);
    } else {
      setEditContent(content);
      setEditTitle(selectedDoc.split('/').pop()?.replace(/\.md$/, '') ?? '');
    }
  };

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.md')) { alert('Only Markdown (.md) files are supported.'); return; }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await api.createDocument('', file.name, 'file', event.target?.result as string);
        await fetchDocuments();
        setSelectedDoc(file.name);
      } catch (err) { console.error('Failed to import file', err); }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleModalSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      if (modalState.type === 'createFile') {
        const filename = modalInput.trim().endsWith('.md')
          ? modalInput.trim()
          : modalInput.trim() + '.md';
        await api.createDocument(
          modalState.parentPath, filename, 'file',
          '# ' + modalInput.trim() + '\n\nStart typing here...',
        );
        await fetchDocuments();
        const newPath = modalState.parentPath ? modalState.parentPath + '/' + filename : filename;
        setSelectedDoc(newPath);
        setIsEditing(true);
      } else if (modalState.type === 'createFolder') {
        await api.createDocument(modalState.parentPath, modalInput.trim(), 'directory');
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
    } catch (e) { console.error('Operation failed', e); }
    setModalState({ type: 'none' });
    setModalInput('');
  };

  // -- 认证 --------------------------------------------------------------------
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const { token, user } = await api.login(loginForm.username, loginForm.password);
      localStorage.setItem('wiki_token', token);
      setCurrentUser(user);
      setModalState({ type: 'none' });
      setLoginForm({ username: '', password: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLoginError(msg || t('invalidCredentials'));
    }
  };

  const handleLogout = async () => {
    try { await api.logout(); } catch { /* ignore */ }
    localStorage.removeItem('wiki_token');
    setCurrentUser(null);
    setModalState({ type: 'none' });
  };

  // -- Wiki 配置 ---------------------------------------------------------------
  const handleSaveWikiConfig = async () => {
    try {
      await api.updateConfig(wikiConfig);
      alert(language === 'zh' ? '保存成功！' : 'Saved successfully!');
    } catch (e) { console.error('Failed to save config', e); }
  };

  const handleIconUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert(t('iconSizeLimit')); return; }
    try {
      const { url } = await api.uploadIcon(file);
      setWikiConfig((prev: { name: string; icon: string }) => ({ ...prev, icon: url }));
    } catch (e) { console.error('Upload failed', e); }
    e.target.value = '';
  };

  // -- 用户管理 ----------------------------------------------------------------
  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setUserFormError('');
    if (!newUserForm.group_id) {
      setUserFormError(language === 'zh' ? '请选择权限组' : 'Please select a permission group');
      return;
    }
    try {
      await api.createUser({ ...newUserForm, group_id: newUserForm.group_id });
      setNewUserForm(EMPTY_NEW_USER_FORM);
      await fetchUsers(userPage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setUserFormError(msg || (language === 'zh' ? '创建失败' : 'Failed to create user'));
    }
  };

  const handleUpdateUserGroup = async (userId: number, groupId: number) => {
    await api.updateUserGroup(userId, groupId);
    await fetchUsers(userPage);
  };

  const handleUpdateUserStatus = async (userId: number, isEnabled: boolean) => {
    await api.updateUserStatus(userId, isEnabled);
    await fetchUsers(userPage);
  };

  const handleDeleteUser = async (userId: number) => {
    await api.deleteUser(userId);
    await fetchUsers(userPage);
  };

  // -- 权限组管理 --------------------------------------------------------------
  const handleCreateGroup = async (data: { group_name: string; permission_keys: string[] }) => {
    await api.createPermissionGroup(data);
    await fetchPermissionGroups();
  };

  const handleUpdateGroup = async (groupId: number, data: { group_name?: string; permission_keys: string[] }) => {
    await api.updatePermissionGroup(groupId, data);
    await fetchPermissionGroups();
  };

  const handleDeleteGroup = async (groupId: number) => {
    await api.deletePermissionGroup(groupId);
    await fetchPermissionGroups();
  };

  const handleUserPageChange = (page: number) => {
    fetchUsers(page);
  };

  // -- 打开 Wiki 管理面板 ------------------------------------------------------
  const openWikiSettings = () => {
    setWikiSettingsTab('config');
    setUserFormError('');
    setModalState({ type: 'wikiSettings' });
    fetchUsers(1);
    fetchPermissionGroups();
    fetchPermissionCatalog();
  };

  // -- 渲染 --------------------------------------------------------------------
  return (
    <div className="flex h-screen bg-[#f5f5f5] dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans overflow-hidden transition-colors duration-200">
      <Sidebar
        isSidebarOpen={isSidebarOpen}
        wikiConfig={wikiConfig}
        currentUser={currentUser}
        isAdmin={isAdmin}
        documents={documents}
        isLoading={isLoading}
        selectedDoc={selectedDoc}
        isEditing={isEditing}
        t={t}
        onSetModal={setModalState}
        onSetModalInput={setModalInput}
        onOpenWikiSettings={openWikiSettings}
        onOpenSettings={() => setModalState({ type: 'settings' })}
        onFileUpload={handleFileUpload}
        onSelectDoc={setSelectedDoc}
      />

      <MainContent
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isEditing={isEditing}
        editTitle={editTitle}
        onSetEditTitle={setEditTitle}
        selectedDoc={selectedDoc}
        selectedNode={selectedNode}
        currentUser={currentUser}
        t={t}
        onStartEdit={() => setIsEditing(true)}
        onCancelEdit={handleCancelEdit}
        onSave={handleSave}
        content={content}
        editContent={editContent}
        onSetEditContent={setEditContent}
      />

      <OperationModal
        modalState={modalState}
        modalInput={modalInput}
        onSetModalInput={setModalInput}
        onSetModal={setModalState}
        onSubmit={handleModalSubmit}
        t={t}
      />

      <SettingsModal
        isOpen={modalState.type === 'settings'}
        theme={theme}
        language={language}
        currentUser={currentUser}
        t={t}
        onSetTheme={setTheme}
        onSetLanguage={setLanguage}
        onClose={() => setModalState({ type: 'none' })}
        onLogout={handleLogout}
        onOpenLogin={() => { setModalState({ type: 'login' }); setLoginError(''); }}
        onNameSaved={(name) => setCurrentUser((u) => u ? { ...u, name } : u)}
      />

      <WikiSettingsModal
        isOpen={modalState.type === 'wikiSettings'}
        tab={wikiSettingsTab}
        wikiConfig={wikiConfig}
        userList={userList}
        userTotal={userTotal}
        userPage={userPage}
        userPageSize={USER_PAGE_SIZE}
        permissionGroups={permissionGroups}
        permissionCatalog={permissionCatalog}
        newUserForm={newUserForm}
        userFormError={userFormError}
        t={t}
        onSetTab={setWikiSettingsTab}
        onSetWikiConfig={setWikiConfig}
        onIconUpload={handleIconUpload}
        onSaveConfig={handleSaveWikiConfig}
        onSetNewUserForm={setNewUserForm}
        onCreateUser={handleCreateUser}
        onUpdateUserGroup={handleUpdateUserGroup}
        onUpdateUserStatus={handleUpdateUserStatus}
        onDeleteUser={handleDeleteUser}
        onCreateGroup={handleCreateGroup}
        onUpdateGroup={handleUpdateGroup}
        onDeleteGroup={handleDeleteGroup}
        onUserPageChange={handleUserPageChange}
        onClose={() => setModalState({ type: 'none' })}
      />

      <LoginModal
        isOpen={modalState.type === 'login'}
        loginForm={loginForm}
        loginError={loginError}
        t={t}
        onSetLoginForm={setLoginForm}
        onSubmit={handleLogin}
        onClose={() => setModalState({ type: 'none' })}
      />
    </div>
  );
}
