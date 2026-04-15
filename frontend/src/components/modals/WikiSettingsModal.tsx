import { useRef, useState, type ChangeEvent, type FormEvent, type ElementType, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Shield, Upload, Users as UsersIcon, UserPlus, Layers,
  Edit2, Trash2, Check, ChevronLeft, ChevronRight, Ban, CheckCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import type { UserListItem, PermissionGroup, Permission } from '../../types';
import type { NewUserForm, WikiSettingsTab } from '../../types';
import type { TranslationKey } from '../../i18n/translations';

// ── Tooltip：鼠标悬停显示权限组权限详情 ────────────────────────────────────────
function GroupTooltip({
  group,
  catalog,
  children,
}: {
  group: PermissionGroup | undefined;
  catalog: Permission[];
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  if (!group) return <span>{children}</span>;

  const keys = new Set(group.permission_keys);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={(e) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setPos({ top: rect.top - 4, left: rect.left + rect.width / 2 });
      }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && createPortal(
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            transform: 'translate(-50%, -100%)',
            zIndex: 99999,
          }}
          className="pointer-events-none w-48 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-xl dark:bg-gray-700"
        >
          <span className="block mb-1.5 font-semibold text-gray-300">{group.group_name}</span>
          {catalog.map((p) => (
            <span
              key={p.permission_key}
              className={cn(
                'flex items-center gap-1.5 py-0.5',
                keys.has(p.permission_key) ? 'text-green-400' : 'text-gray-500',
              )}
            >
              {keys.has(p.permission_key) ? '✓' : '✗'} {p.display_name}
            </span>
          ))}
        </div>,
        document.body,
      )}
    </span>
  );
}

// ── 分页控件 ──────────────────────────────────────────────────────────────────
function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
  t,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  t: (key: TranslationKey) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-2 pt-2 text-xs text-gray-500 dark:text-gray-400">
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-3 h-3" />
        {t('prevPage')}
      </button>
      <span>
        {page} {t('pageOfTotal')} {totalPages}
      </span>
      <button
        onClick={onNext}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {t('nextPage')}
        <ChevronRight className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface WikiSettingsModalProps {
  isOpen: boolean;
  tab: WikiSettingsTab;
  wikiConfig: { name: string; icon: string };
  userList: UserListItem[];
  userTotal: number;
  userPage: number;
  userPageSize: number;
  permissionGroups: PermissionGroup[];
  permissionCatalog: Permission[];
  newUserForm: NewUserForm;
  userFormError: string;
  t: (key: TranslationKey) => string;
  onSetTab: (tab: WikiSettingsTab) => void;
  onSetWikiConfig: (config: { name: string; icon: string }) => void;
  onIconUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onSaveConfig: () => void;
  onSetNewUserForm: (updater: (prev: NewUserForm) => NewUserForm) => void;
  onCreateUser: (e: FormEvent) => void;
  onUpdateUserGroup: (userId: number, groupId: number) => Promise<void>;
  onUpdateUserStatus: (userId: number, isEnabled: boolean) => Promise<void>;
  onDeleteUser: (userId: number) => Promise<void>;
  onCreateGroup: (data: { group_name: string; permission_keys: string[] }) => Promise<void>;
  onUpdateGroup: (groupId: number, data: { group_name?: string; permission_keys: string[] }) => Promise<void>;
  onDeleteGroup: (groupId: number) => Promise<void>;
  onUserPageChange: (page: number) => void;
  onClose: () => void;
}

// ── Tab 配置 ──────────────────────────────────────────────────────────────────
const TABS: Array<{ key: WikiSettingsTab; labelKey: TranslationKey; icon: ElementType }> = [
  { key: 'config', labelKey: 'basicConfig', icon: Shield },
  { key: 'users', labelKey: 'usersTab', icon: UsersIcon },
  { key: 'addUser', labelKey: 'addUserTab', icon: UserPlus },
  { key: 'groups', labelKey: 'groupsTab', icon: Layers },
];

const LOCAL_PAGE_SIZE = 8;

// ── Main component ────────────────────────────────────────────────────────────
export function WikiSettingsModal({
  isOpen, tab, wikiConfig, userList, userTotal, userPage, userPageSize,
  permissionGroups, permissionCatalog, newUserForm, userFormError, t,
  onSetTab, onSetWikiConfig, onIconUpload, onSaveConfig,
  onSetNewUserForm, onCreateUser,
  onUpdateUserGroup, onUpdateUserStatus, onDeleteUser,
  onCreateGroup, onUpdateGroup, onDeleteGroup,
  onUserPageChange, onClose,
}: WikiSettingsModalProps) {
  const iconFileInputRef = useRef<HTMLInputElement>(null);

  // 修改权限组内联选择
  const [changingGroupFor, setChangingGroupFor] = useState<number | null>(null);

  // 权限组管理状态
  const [editingGroup, setEditingGroup] = useState<PermissionGroup | null>(null);
  const [groupPage, setGroupPage] = useState(1);
  const [newGroupForm, setNewGroupForm] = useState<{ group_name: string; permission_keys: string[] }>({
    group_name: '',
    permission_keys: ['can_read'],
  });
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [groupError, setGroupError] = useState('');

  if (!isOpen) return null;

  const userTotalPages = Math.max(1, Math.ceil(userTotal / userPageSize));
  const groupTotalPages = Math.max(1, Math.ceil(permissionGroups.length / LOCAL_PAGE_SIZE));
  const groupPageItems = permissionGroups.slice((groupPage - 1) * LOCAL_PAGE_SIZE, groupPage * LOCAL_PAGE_SIZE);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleUserGroupChange = async (userId: number, groupId: number) => {
    await onUpdateUserGroup(userId, groupId);
    setChangingGroupFor(null);
  };

  const handleToggleStatus = async (user: UserListItem) => {
    await onUpdateUserStatus(user.id, !user.is_enabled);
  };

  const handleSaveGroup = async (e: FormEvent) => {
    e.preventDefault();
    setGroupError('');
    try {
      if (editingGroup) {
        await onUpdateGroup(editingGroup.group_id, {
          group_name: editingGroup.group_name,
          permission_keys: editingGroup.permission_keys,
        });
        setEditingGroup(null);
      }
    } catch (err: unknown) {
      setGroupError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleCreateGroup = async (e: FormEvent) => {
    e.preventDefault();
    setGroupError('');
    try {
      await onCreateGroup(newGroupForm);
      setNewGroupForm({ group_name: '', permission_keys: ['can_read'] });
      setShowNewGroupForm(false);
    } catch (err: unknown) {
      setGroupError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleDeleteGroup = async (group: PermissionGroup) => {
    if (!window.confirm(`${t('confirmDeleteGroup')}\n"${group.group_name}"`)) return;
    setGroupError('');
    try {
      await onDeleteGroup(group.group_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGroupError(msg);
      setTimeout(() => setGroupError(''), 5000);
    }
  };

  const handleDeleteUser = async (user: UserListItem) => {
    if (!window.confirm(t('confirmDeleteUser'))) return;
    await onDeleteUser(user.id);
  };

  // ── Tab: 基本配置 ─────────────────────────────────────────────────────────
  const ConfigPanel = (
    <div className="p-6 space-y-4">
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('wikiName')}</label>
        <input
          type="text"
          value={wikiConfig.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSetWikiConfig({ ...wikiConfig, name: e.target.value })}
          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('wikiIcon')}</label>
        <div className="flex items-center gap-3">
          {wikiConfig.icon && (
            <div className="w-12 h-12 border border-gray-200 dark:border-gray-700 rounded flex items-center justify-center bg-gray-50 dark:bg-gray-900 overflow-hidden shrink-0">
              <img src={wikiConfig.icon} alt="Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </div>
          )}
          <button
            type="button"
            onClick={() => iconFileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 rounded-md transition-colors text-gray-600 dark:text-gray-400"
          >
            <Upload className="w-4 h-4" />
            {t('uploadIcon')}
          </button>
          <input type="file" ref={iconFileInputRef} onChange={onIconUpload} accept="image/*" className="hidden" />
        </div>
        <p className="mt-1 text-[10px] text-gray-400">{t('iconSizeLimit')}</p>
      </div>
      <button
        onClick={onSaveConfig}
        className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
      >
        {t('saveConfig')}
      </button>
    </div>
  );

  // ── Tab: 用户管理 ─────────────────────────────────────────────────────────
  const UsersPanel = (
    <div className="p-5 flex flex-col gap-3">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
            <tr>
              <th className="text-left px-3 py-2.5">{t('accountLabel')}</th>
              <th className="text-left px-3 py-2.5">{t('displayNameLabel')}</th>
              <th className="text-left px-3 py-2.5">权限组</th>
              <th className="text-left px-3 py-2.5">{t('status')}</th>
              <th className="text-right px-3 py-2.5">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {userList.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-gray-400">{t('noUsers')}</td>
              </tr>
            ) : userList.map((u, i) => (
              <tr key={u.id} className={cn('border-t border-gray-100 dark:border-gray-700/50', i % 2 !== 0 && 'bg-gray-50/40 dark:bg-gray-800/20')}>
                <td className="px-3 py-2.5 font-mono text-xs">{u.account}</td>
                <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-400">{u.name}</td>
                <td className="px-3 py-2.5">
                  {changingGroupFor === u.id ? (
                    <select
                      autoFocus
                      defaultValue={u.group_id ?? ''}
                      onChange={(e) => handleUserGroupChange(u.id, parseInt(e.target.value, 10))}
                      onBlur={() => setChangingGroupFor(null)}
                      className="text-xs border border-blue-400 rounded px-1 py-0.5 dark:bg-gray-700 dark:text-white focus:outline-none"
                    >
                      <option value="" disabled>{t('selectGroup')}</option>
                      {permissionGroups.map((g) => (
                        <option key={g.group_id} value={g.group_id}>{g.group_name}</option>
                      ))}
                    </select>
                  ) : (
                    <GroupTooltip group={permissionGroups.find((g) => g.group_id === u.group_id)} catalog={permissionCatalog}>
                      <button
                        onClick={() => setChangingGroupFor(u.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        {u.group_name ?? '—'}
                      </button>
                    </GroupTooltip>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <span className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                    u.is_enabled
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 line-through',
                  )}>
                    {u.is_enabled ? t('enabled') : t('disabled')}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right">
                  <div className="inline-flex gap-1 items-center">
                    <button
                      onClick={() => handleToggleStatus(u)}
                      className={cn(
                        'inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md transition-colors',
                        u.is_enabled
                          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                          : 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
                      )}
                    >
                      {u.is_enabled
                        ? <><Ban className="w-3 h-3" />{t('disableUser')}</>
                        : <><CheckCircle className="w-3 h-3" />{t('enableUser')}</>}
                    </button>
                    {!u.is_enabled && (
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title={t('deleteUser')}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={userPage} totalPages={userTotalPages} onPrev={() => onUserPageChange(userPage - 1)} onNext={() => onUserPageChange(userPage + 1)} t={t} />
    </div>
  );

  // ── Tab: 添加用户 ─────────────────────────────────────────────────────────
  const AddUserPanel = (
    <div className="p-6">
      <form onSubmit={onCreateUser} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('accountLabel')}</label>
            <input
              type="text"
              required
              value={newUserForm.account}
              onChange={(e) => onSetNewUserForm((f) => ({ ...f, account: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="a-z, 0-9, _"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('displayNameLabel')}</label>
            <input
              type="text"
              required
              value={newUserForm.name}
              onChange={(e) => onSetNewUserForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('defaultPassword')}</label>
          <input
            type="password"
            required
            minLength={6}
            value={newUserForm.password}
            onChange={(e) => onSetNewUserForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="≥ 6 位"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">{t('selectGroup')}</label>
          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
            {permissionGroups.length === 0 ? (
              <p className="text-xs text-gray-400">{t('noGroups')}</p>
            ) : permissionGroups.map((g) => (
              <GroupTooltip key={g.group_id} group={g} catalog={permissionCatalog}>
                <label className={cn(
                  'flex items-center gap-2.5 px-3 py-2 border rounded-lg cursor-pointer transition-colors text-sm w-full',
                  newUserForm.group_id === g.group_id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500',
                )}>
                  <input
                    type="radio"
                    name="group_id"
                    value={g.group_id}
                    checked={newUserForm.group_id === g.group_id}
                    onChange={() => onSetNewUserForm((f) => ({ ...f, group_id: g.group_id }))}
                    className="w-4 h-4 text-blue-500"
                  />
                  <span className="font-medium">{g.group_name}</span>
                  <span className="text-xs text-gray-400 ml-auto shrink-0">悬停查看权限</span>
                </label>
              </GroupTooltip>
            ))}
          </div>
        </div>
        {userFormError && <p className="text-xs text-red-500">{userFormError}</p>}
        <button
          type="submit"
          disabled={!newUserForm.group_id}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          {t('createUserBtn')}
        </button>
      </form>
    </div>
  );

  // ── Tab: 权限组管理 ────────────────────────────────────────────────────────
  const GroupsPanel = (
    <div className="p-5 flex flex-col gap-3">
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-x-auto">
        <table className="w-full text-sm min-w-max">
          <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400">
            <tr>
              <th className="text-left px-3 py-2.5 w-32">{t('groupName')}</th>
              {permissionCatalog.map((p) => (
                <th key={p.permission_key} className="text-center px-2 py-2.5 text-[10px] whitespace-nowrap">{p.display_name}</th>
              ))}
              <th className="text-right px-3 py-2.5">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {groupPageItems.length === 0 ? (
              <tr>
                <td colSpan={permissionCatalog.length + 2} className="px-3 py-8 text-center text-gray-400">{t('noGroups')}</td>
              </tr>
            ) : groupPageItems.map((g, i) => {
              const editingKeys = new Set(editingGroup?.group_id === g.group_id ? editingGroup.permission_keys : []);
              const viewKeys = new Set(g.permission_keys);
              return (
                <tr key={g.group_id} className={cn('border-t border-gray-100 dark:border-gray-700/50', i % 2 !== 0 && 'bg-gray-50/40 dark:bg-gray-800/20')}>
                  {editingGroup?.group_id === g.group_id ? (
                    <>
                      <td className="px-3 py-2">
                        <input
                          autoFocus
                          value={editingGroup.group_name}
                          onChange={(e) => setEditingGroup({ ...editingGroup, group_name: e.target.value })}
                          className="w-full text-xs px-2 py-1 border border-blue-400 rounded dark:bg-gray-700 dark:text-white focus:outline-none"
                        />
                      </td>
                      {permissionCatalog.map((p) => (
                        <td key={p.permission_key} className="text-center px-2 py-2">
                          <input
                            type="checkbox"
                            checked={editingKeys.has(p.permission_key)}
                            onChange={(e) => {
                              const keys = new Set(editingGroup.permission_keys);
                              if (e.target.checked) keys.add(p.permission_key);
                              else keys.delete(p.permission_key);
                              setEditingGroup({ ...editingGroup, permission_keys: Array.from(keys) });
                            }}
                            className="w-4 h-4 rounded text-blue-500"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <form onSubmit={handleSaveGroup} className="inline-flex gap-1">
                          <button type="submit" className="p-1 text-green-600 hover:text-green-700 dark:text-green-400" title={t('saveGroup')}>
                            <Check className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => setEditingGroup(null)} className="p-1 text-gray-400 hover:text-gray-600">
                            <X className="w-4 h-4" />
                          </button>
                        </form>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-700 dark:text-gray-300">{g.group_name}</td>
                      {permissionCatalog.map((p) => (
                        <td key={p.permission_key} className="text-center px-2 py-2.5 text-sm">
                          <span className={viewKeys.has(p.permission_key) ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}>
                            {viewKeys.has(p.permission_key) ? '✓' : '✗'}
                          </span>
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex gap-1">
                          <button onClick={() => setEditingGroup({ ...g })} className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title={t('editGroup')}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteGroup(g)} className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors" title={t('deleteGroup')}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination page={groupPage} totalPages={groupTotalPages} onPrev={() => setGroupPage((p) => p - 1)} onNext={() => setGroupPage((p) => p + 1)} t={t} />

      {groupError && <p className="text-xs text-red-500">{groupError}</p>}

      {showNewGroupForm ? (
        <form onSubmit={handleCreateGroup} className="border border-dashed border-blue-400 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('groupName')}</label>
            <input
              autoFocus
              required
              value={newGroupForm.group_name}
              onChange={(e) => setNewGroupForm((f) => ({ ...f, group_name: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="权限组名称"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">{t('permissionsLabel')}</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {permissionCatalog.map((p) => (
                <label key={p.permission_key} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={newGroupForm.permission_keys.includes(p.permission_key)}
                    onChange={(e) => {
                      const keys = new Set(newGroupForm.permission_keys);
                      if (e.target.checked) keys.add(p.permission_key);
                      else keys.delete(p.permission_key);
                      setNewGroupForm((f) => ({ ...f, permission_keys: Array.from(keys) }));
                    }}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-blue-500"
                  />
                  {p.display_name}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors">
              {t('saveGroup')}
            </button>
            <button type="button" onClick={() => setShowNewGroupForm(false)} className="px-4 py-1.5 border border-gray-200 dark:border-gray-600 text-sm rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              {t('cancel')}
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowNewGroupForm(true)}
          className="flex items-center justify-center gap-2 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <Layers className="w-4 h-4" />
          {t('addGroup')}
        </button>
      )}
    </div>
  );

  const PANELS: Record<WikiSettingsTab, React.ReactNode> = {
    config: ConfigPanel,
    users: UsersPanel,
    addUser: AddUserPanel,
    groups: GroupsPanel,
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* 标题栏 */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
          <h3 className="text-base font-semibold dark:text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
            {t('wikiSettingsBtn')}
            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold">
              {t('adminOnly')}
            </span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 shrink-0 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {TABS.map(({ key, labelKey, icon: Icon }) => (
              <button
                key={key}
                onClick={() => onSetTab(key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                  tab === key
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                )}
              >
                <Icon className="w-4 h-4" />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {PANELS[tab]}
        </div>
      </div>
    </div>
  );
}
