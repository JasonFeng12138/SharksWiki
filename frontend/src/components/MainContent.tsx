import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import GithubSlugger from 'github-slugger';
import { format } from 'date-fns';
import { Edit2, Save, X, Menu, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';
import type { FileNode, User } from '../types';
import type { TranslationKey } from '../i18n/translations';

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface MainContentProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isEditing: boolean;
  editTitle: string;
  onSetEditTitle: (v: string) => void;
  selectedDoc: string | null;
  selectedNode: FileNode | null;
  currentUser: User | null;
  t: (key: TranslationKey) => string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  content: string;
  editContent: string;
  onSetEditContent: (v: string) => void;
}

export function MainContent({
  isSidebarOpen, onToggleSidebar, isEditing, editTitle, onSetEditTitle,
  selectedDoc, selectedNode, currentUser, t, onStartEdit, onCancelEdit,
  onSave, content, editContent, onSetEditContent,
}: MainContentProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState('');

  // 从 content 提取标题
  useEffect(() => {
    if (isEditing || !content) { setHeadings([]); return; }
    const slugger = new GithubSlugger();
    const noCode = content.replace(/```[\s\S]*?```/g, '');
    const regex = /^(#{1,6})\s+(.+)$/gm;
    const result: Heading[] = [];
    let match;
    while ((match = regex.exec(noCode)) !== null) {
      const rawText = match[2];
      const cleanText = rawText.replace(/(\*\*|__|\*|_|`|~)/g, '').trim();
      result.push({ level: match[1].length, text: cleanText, id: slugger.slug(cleanText) });
    }
    setHeadings(result);
  }, [content, isEditing]);

  // 目录高亮滚动监听
  useEffect(() => {
    if (headings.length === 0) return;
    const handleScroll = () => {
      const elements = headings.map((h) => document.getElementById(h.id)).filter(Boolean);
      let current = '';
      for (const el of elements) {
        if (el && el.getBoundingClientRect().top <= 120) current = el.id;
        else break;
      }
      if (!current && elements[0]) {
        const rect = elements[0]!.getBoundingClientRect();
        if (rect.top > 0 && rect.top < window.innerHeight) current = elements[0]!.id;
      }
      if (current !== activeId) setActiveId(current);
    };
    const area = document.getElementById('main-scroll-area');
    area?.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => area?.removeEventListener('scroll', handleScroll);
  }, [headings, activeId]);

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-[#1e1e1e]">
      {/* 顶部工具栏 */}
      <header className="h-14 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 shrink-0 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-400 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onSetEditTitle(e.target.value)}
              className="text-lg font-medium bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-gray-900 dark:focus:border-gray-300 focus:outline-none px-1 py-0.5 dark:text-white"
              placeholder={t('docNamePlaceholder')}
              autoFocus
            />
          ) : (
            <h1 className="text-lg font-medium truncate dark:text-white">
              {selectedDoc
                ? selectedDoc.split('/').pop()?.replace(/\.md$/, '')
                : t('selectDoc')}
            </h1>
          )}
        </div>

        <div className="flex items-center gap-4">
          {selectedNode?.type === 'file' && !isEditing && (
            <div className="hidden sm:flex flex-col items-end leading-tight">
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {t('createdBy')}: <span className="text-gray-500 dark:text-gray-400">{selectedNode.author || 'Admin'}</span>
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {t('at')}{' '}
                {selectedNode.createdAt
                  ? format(new Date(selectedNode.createdAt), 'yyyy-MM-dd HH:mm')
                  : format(new Date(), 'yyyy-MM-dd HH:mm')}
              </span>
            </div>
          )}

          {selectedDoc && !isEditing && currentUser?.permissions.can_edit_file && (
            <button
              onClick={onStartEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span>{t('edit')}</span>
            </button>
          )}

          {isEditing && (
            <>
              <button
                onClick={onCancelEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
                <span>{t('cancel')}</span>
              </button>
              <button
                onClick={onSave}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-gray-900 dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 rounded-md transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>{t('save')}</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* 内容区 + 目录侧边栏 */}
      <div className="flex-1 flex overflow-hidden">
        <main id="main-scroll-area" className="flex-1 overflow-y-auto scroll-smooth">
          {selectedDoc || isEditing ? (
            <div className="max-w-4xl mx-auto p-8 md:p-12">
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={(e) => onSetEditContent(e.target.value)}
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

        {/* 目录（ToC） */}
        {!isEditing && headings.length > 0 && (
          <aside className="w-64 border-l border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 overflow-y-auto hidden lg:block shrink-0 p-6">
            <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wider mb-4">
              {t('onThisPage')}
            </h4>
            <nav className="space-y-1.5">
              {headings.map((h) => (
                <a
                  key={h.id}
                  href={`#${h.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={cn(
                    'block text-sm py-1 transition-colors truncate border-l-2 pl-3 -ml-[2px]',
                    activeId === h.id
                      ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600',
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
  );
}
