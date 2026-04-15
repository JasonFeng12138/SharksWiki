import { useState, useEffect, useRef } from 'react';
import {
  BookOpen, MoreVertical, FilePlus, FolderPlus,
  Upload, Settings, Shield,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { FileNode, User, ModalState } from '../types';
import type { TranslationKey } from '../i18n/translations';
import { FileTreeNode } from './FileTreeNode';

interface SidebarProps {
  isSidebarOpen: boolean;
  wikiConfig: { name: string; icon: string };
  currentUser: User | null;
  isAdmin: boolean;
  documents: FileNode[];
  isLoading: boolean;
  selectedDoc: string | null;
  isEditing: boolean;
  t: (key: TranslationKey) => string;
  onSetModal: (state: ModalState) => void;
  onSetModalInput: (val: string) => void;
  onOpenWikiSettings: () => void;
  onOpenSettings: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectDoc: (path: string) => void;
}

export function Sidebar({
  isSidebarOpen, wikiConfig, currentUser, isAdmin,
  documents, isLoading, selectedDoc, isEditing, t,
  onSetModal, onSetModalInput, onOpenWikiSettings,
  onOpenSettings, onFileUpload, onSelectDoc,
}: SidebarProps) {
  // 菜单状态和引用管理在 Sidebar 内部
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mdFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div
      className={cn(
        'bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 ease-in-out z-10 shrink-0',
        isSidebarOpen ? 'w-64 md:w-72' : 'w-0 overflow-hidden border-none',
      )}
    >
      {/* Wiki 标题 + 操作菜单 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 font-semibold text-lg overflow-hidden">
          {wikiConfig.icon ? (
            <img
              src={wikiConfig.icon}
              alt="Wiki Icon"
              className="w-6 h-6 object-contain rounded"
              referrerPolicy="no-referrer"
            />
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
                    onClick={() => {
                      onSetModal({ type: 'createFile', parentPath: '' });
                      onSetModalInput('');
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FilePlus className="w-4 h-4" />
                    {t('newDoc')}
                  </button>
                )}
                {currentUser?.permissions.can_create_dir && (
                  <button
                    onClick={() => {
                      onSetModal({ type: 'createFolder', parentPath: '' });
                      onSetModalInput('');
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <FolderPlus className="w-4 h-4" />
                    {t('newFolder')}
                  </button>
                )}
                {currentUser?.permissions.can_add_file && currentUser?.permissions.can_create_dir && (
                  <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                )}
                {currentUser?.permissions.can_add_file && (
                  <>
                    <button
                      onClick={() => mdFileInputRef.current?.click()}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      {t('importDoc')}
                    </button>
                    <input
                      type="file"
                      ref={mdFileInputRef}
                      accept=".md"
                      className="hidden"
                      onChange={(e) => {
                        onFileUpload(e);
                        setIsMenuOpen(false);
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 文档树 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('loading')}</div>
        ) : documents.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">{t('noDocs')}</div>
        ) : (
          documents.map((doc) => (
            <FileTreeNode
              key={doc.path}
              node={doc}
              level={0}
              selectedDoc={selectedDoc}
              isEditing={isEditing}
              currentUser={currentUser}
              onSelectDoc={onSelectDoc}
              onSetModal={onSetModal}
              onSetModalInput={onSetModalInput}
            />
          ))
        )}
      </div>

      {/* 底部按钮 */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 shrink-0 space-y-0.5">
        {isAdmin && (
          <>
            <button
              onClick={onOpenWikiSettings}
              className="flex items-center gap-2 px-2 py-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors w-full"
            >
              <Shield className="w-4 h-4 shrink-0 text-blue-500" />
              <span className="text-sm font-medium truncate">{t('wikiSettingsBtn')}</span>
            </button>
            <div className="mx-2 h-px bg-gray-100 dark:bg-gray-700" />
          </>
        )}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-2 px-2 py-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors w-full"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span className="text-sm font-medium">{t('settings')}</span>
        </button>
      </div>
    </div>
  );
}
