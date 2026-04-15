import { useState, type FormEvent } from 'react';
import { X, Settings, Sun, Moon, Globe, LogOut, User as UserIcon, Lock, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../services/api';
import type { User } from '../../types';
import type { Language, TranslationKey } from '../../i18n/translations';

interface SettingsModalProps {
  isOpen: boolean;
  theme: 'light' | 'dark';
  language: Language;
  currentUser: User | null;
  t: (key: TranslationKey) => string;
  onSetTheme: (t: 'light' | 'dark') => void;
  onSetLanguage: (l: Language) => void;
  onClose: () => void;
  onLogout: () => void;
  onOpenLogin: () => void;
  onNameSaved?: (newName: string) => void;
}

type SubPanel = 'none' | 'name' | 'password';

export function SettingsModal({
  isOpen, theme, language, currentUser, t,
  onSetTheme, onSetLanguage, onClose, onLogout, onOpenLogin, onNameSaved,
}: SettingsModalProps) {
  const [subPanel, setSubPanel] = useState<SubPanel>('none');
  const [nameForm, setNameForm] = useState({ newName: '' });
  const [pwForm, setPwForm] = useState({ oldPassword: '', newPassword: '' });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  if (!isOpen) return null;

  const closeSubPanel = () => {
    setSubPanel('none');
    setFormError('');
    setFormSuccess('');
    setNameForm({ newName: '' });
    setPwForm({ oldPassword: '', newPassword: '' });
  };

  const handleSaveName = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.updateUserName(nameForm.newName.trim());
      setFormSuccess(t('nameSaved'));
      onNameSaved?.(nameForm.newName.trim());
      setTimeout(() => { setFormSuccess(''); closeSubPanel(); }, 1500);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSavePassword = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.updatePassword(pwForm.oldPassword, pwForm.newPassword);
      setFormSuccess(t('passwordSaved'));
      setTimeout(() => { setFormSuccess(''); closeSubPanel(); }, 1500);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold dark:text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            {t('settings')}
          </h3>
          <button
            onClick={() => { closeSubPanel(); onClose(); }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* 主题切换 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              <span className="text-sm font-medium">{t('theme')}</span>
            </div>
            <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
              {(['light', 'dark'] as const).map((val) => (
                <button
                  key={val}
                  onClick={() => onSetTheme(val)}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    theme === val
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300',
                  )}
                >
                  {val === 'light' ? t('light') : t('dark')}
                </button>
              ))}
            </div>
          </div>

          {/* 语言切换 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{t('language')}</span>
            </div>
            <select
              value={language}
              onChange={(e) => onSetLanguage(e.target.value as Language)}
              className="text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* 用户操作 */}
          {currentUser ? (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">

              {/* 修改名称 */}
              <button
                onClick={() => setSubPanel(subPanel === 'name' ? 'none' : 'name')}
                className="w-full flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2.5 rounded-md transition-colors"
              >
                <span className="flex items-center gap-3">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  {t('changeName')}
                </span>
                <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', subPanel === 'name' && 'rotate-90')} />
              </button>

              {subPanel === 'name' && (
                <form onSubmit={handleSaveName} className="mx-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('currentName')}</label>
                    <p className="text-sm text-gray-700 dark:text-gray-300 px-1">{currentUser.name}</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('newName')}</label>
                    <input
                      type="text"
                      required
                      value={nameForm.newName}
                      onChange={(e) => setNameForm({ newName: e.target.value })}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  {formError && subPanel === 'name' && <p className="text-xs text-red-500">{formError}</p>}
                  {formSuccess && subPanel === 'name' && <p className="text-xs text-green-500">{formSuccess}</p>}
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors">{t('saveChanges')}</button>
                    <button type="button" onClick={closeSubPanel} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">{t('cancel')}</button>
                  </div>
                </form>
              )}

              {/* 修改密码 */}
              <button
                onClick={() => setSubPanel(subPanel === 'password' ? 'none' : 'password')}
                className="w-full flex items-center justify-between text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2.5 rounded-md transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-gray-400" />
                  {t('changePassword')}
                </span>
                <ChevronRight className={cn('w-4 h-4 text-gray-400 transition-transform', subPanel === 'password' && 'rotate-90')} />
              </button>

              {subPanel === 'password' && (
                <form onSubmit={handleSavePassword} className="mx-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('currentPassword')}</label>
                    <input
                      type="password"
                      required
                      value={pwForm.oldPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, oldPassword: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('newPassword')}</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={pwForm.newPassword}
                      onChange={(e) => setPwForm((f) => ({ ...f, newPassword: e.target.value }))}
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="≥ 6 位"
                    />
                  </div>
                  {formError && subPanel === 'password' && <p className="text-xs text-red-500">{formError}</p>}
                  {formSuccess && subPanel === 'password' && <p className="text-xs text-green-500">{formSuccess}</p>}
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors">{t('saveChanges')}</button>
                    <button type="button" onClick={closeSubPanel} className="px-3 py-1.5 border border-gray-200 dark:border-gray-600 text-sm rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">{t('cancel')}</button>
                  </div>
                </form>
              )}

              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-2.5 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('logout')}
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onOpenLogin}
                className="w-full flex items-center gap-3 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-2.5 rounded-md transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                {t('login')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
