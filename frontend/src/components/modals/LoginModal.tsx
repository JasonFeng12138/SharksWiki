import { X } from 'lucide-react';
import type { TranslationKey } from '../../i18n/translations';

interface LoginModalProps {
  isOpen: boolean;
  loginForm: { username: string; password: string };
  loginError: string;
  t: (key: TranslationKey) => string;
  onSetLoginForm: (form: { username: string; password: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function LoginModal({
  isOpen, loginForm, loginError, t,
  onSetLoginForm, onSubmit, onClose,
}: LoginModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold dark:text-white">{t('login')}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('username')}
            </label>
            <input
              type="text"
              required
              value={loginForm.username}
              onChange={(e) => onSetLoginForm({ ...loginForm, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('password')}
            </label>
            <input
              type="password"
              required
              value={loginForm.password}
              onChange={(e) => onSetLoginForm({ ...loginForm, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  );
}
